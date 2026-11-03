import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useApp } from '../../providers';
import { ApiError, type Schemas } from '../../services/api';
import { useResource } from '../../services/queries';

type Message = Schemas['Message'];
export function mergeMessages(previous: Message[], next: Message[]) {
  return [...new Map([...previous, ...next].map((message) => [message.id, message])).values()].sort(
    (first, second) => first.sequence - second.sequence,
  );
}

export function useChatMessages(id: string, markRead = true) {
  const { api, user } = useApp();
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [items, setItems] = useState<Message[]>([]);
  const [older, setOlder] = useState<{ before: number; more: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [initial, setInitial] = useState<Schemas['MessageList'] | null>(null);
  const [liveCursor, setLiveCursor] = useState<number | null>(null);
  const olderRequest = useRef<AbortController | null>(null);
  const acknowledged = useRef(0);
  const [readError, setReadError] = useState<unknown>(null);
  const [readAttempt, setReadAttempt] = useState(0);
  const history = useResource<Schemas['MessageList']>(
    `/v1/conversations/${id}/messages?before_sequence=9223372036854775807&limit=50`,
    true,
  );
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => {
      listener.remove();
      olderRequest.current?.abort();
    };
  }, []);
  // Keep the initial latest page as the incremental cursor's baseline. A focus refetch
  // must not skip a gap if more than 50 messages arrived while the screen was inactive.
  if (!initial && history.data) setInitial(history.data);
  const baseline = initial ?? history.data;
  const combined = mergeMessages(items, baseline?.items ?? []);
  // A locally appended send can be ahead of messages not downloaded yet.
  // Only the server's incremental pages may advance this cursor.
  const latest = liveCursor ?? baseline?.items.at(-1)?.sequence ?? 0;
  const live = useQuery({
    queryKey: ['api', user?.id, 'chat-live', id, latest],
    enabled: focused && active && !!history.data && !history.isError,
    refetchInterval: 2000,
    retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
    queryFn: async ({ signal }) => {
      const result = await api.request<Schemas['MessageList']>(
        `/v1/conversations/${id}/messages?after_sequence=${latest}&limit=100`,
        { signal },
      );
      if (!signal.aborted && result.items.length) {
        setItems((previous) => mergeMessages(previous, result.items));
        setLiveCursor((previous) => Math.max(previous ?? latest, result.nextSequence));
      }
      return result;
    },
  });
  useEffect(() => {
    if (!latest || !focused || !active || !markRead || acknowledged.current >= latest) return;
    const controller = new AbortController();
    void api
      .request(`/v1/conversations/${id}/read`, {
        method: 'PUT',
        signal: controller.signal,
        body: JSON.stringify({ lastReadSequence: latest }),
      })
      .then(() => {
        if (!controller.signal.aborted) {
          acknowledged.current = Math.max(acknowledged.current, latest);
          setReadError(null);
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setReadError(cause);
      });
    return () => controller.abort();
  }, [api, id, latest, focused, active, markRead, readAttempt]);
  const denied = [live.error, history.error].some(
    (error) => error instanceof ApiError && [403, 404].includes(error.status),
  );
  async function loadOlder() {
    const cursor =
      older ?? (baseline ? { before: baseline.nextSequence, more: baseline.hasMore } : null);
    if (!cursor?.more || olderRequest.current) return;
    const controller = new AbortController();
    olderRequest.current = controller;
    setLoading(true);
    setError(null);
    try {
      const result = await api.request<Schemas['MessageList']>(
        `/v1/conversations/${id}/messages?before_sequence=${cursor.before}&limit=50`,
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      setItems((previous) => mergeMessages(previous, result.items));
      setOlder({ before: result.nextSequence, more: result.hasMore });
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause);
    } finally {
      if (olderRequest.current === controller) olderRequest.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  return {
    items: combined,
    history,
    denied,
    error: error ?? live.error,
    loading,
    hasMore: older?.more ?? baseline?.hasMore,
    loadOlder,
    readError,
    retryRead: () => setReadAttempt((value) => value + 1),
    append: (message: Message) => setItems((previous) => mergeMessages(previous, [message])),
  };
}
