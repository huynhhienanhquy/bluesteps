import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useApp } from '../../providers';
import { ApiError, type Schemas } from '../../services/api';
import { useCommand, useResource } from '../../services/queries';

/** Keep event cards and details consistent when a save response is interrupted. */
export function useSavedEvent(id: string) {
  const { status } = useApp();
  const query = useResource<Schemas['SavedEventState']>(`/v1/events/${id}/engagement`, true);
  const command = useCommand();
  const working = useRef(false);
  const active = useRef(false);
  const mounted = useRef(true);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      active.current = true;
      if (status === 'authenticated') void refetch();
      return () => {
        active.current = false;
      };
    }, [refetch, status]),
  );
  const pending = command.isPending || confirming;
  const disabled =
    pending ||
    status === 'loading' ||
    status === 'error' ||
    (status === 'authenticated' && (!query.data || query.isError || query.isFetching));
  async function toggle(): Promise<'saved' | 'removed' | null> {
    if (working.current || disabled) return null;
    if (status !== 'authenticated') {
      router.push({
        pathname: '/login',
        params: { returnTo: `/events/${encodeURIComponent(id)}` },
      });
      return null;
    }
    const next = !query.data?.saved;
    working.current = true;
    try {
      await command.mutateAsync({
        path: `/v1/me/saved-events/${id}`,
        method: next ? 'PUT' : 'DELETE',
        body: next ? {} : undefined,
      });
      return active.current ? (next ? 'saved' : 'removed') : null;
    } catch (cause) {
      if (
        active.current &&
        (!(cause instanceof ApiError) || cause.status === 0 || cause.status >= 500)
      ) {
        setConfirming(true);
        const result = await refetch();
        if (active.current && result.isSuccess && result.data.saved === next) {
          command.reset();
          return next ? 'saved' : 'removed';
        }
      }
      return null;
    } finally {
      working.current = false;
      if (mounted.current) setConfirming(false);
    }
  }
  return {
    query,
    saved: query.data?.saved ?? false,
    pending,
    disabled,
    error: command.error ?? query.error,
    toggle,
  };
}
