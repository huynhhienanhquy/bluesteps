import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useApp } from '../providers';
import { ApiError, operationKey, type Page } from './api';

export function useResource<T>(path: string, personal = false, enabled = true) {
  const { api, user, status } = useApp();
  return useQuery({
    queryKey: ['api', user?.id ?? 'guest', path],
    enabled: enabled && status !== 'loading' && (!personal || status === 'authenticated'),
    queryFn: ({ signal }) => api.request<T>(path, { signal }, status === 'authenticated'),
  });
}

export function usePages<T>(path: string, personal = false, enabled = true) {
  const { api, user, status } = useApp();
  return useInfiniteQuery({
    queryKey: ['api', user?.id ?? 'guest', 'pages', path],
    initialPageParam: '',
    enabled: enabled && status !== 'loading' && (!personal || status === 'authenticated'),
    queryFn: ({ signal, pageParam }) =>
      api.request<Page<T>>(
        `${path}${path.includes('?') ? '&' : '?'}limit=20${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`,
        { signal },
        status === 'authenticated',
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useCommand<T = unknown>({
  feedback: completedFeedback = false,
  authenticated = true,
}: { feedback?: boolean; authenticated?: boolean } = {}) {
  const { api, reloadProfile, feedback } = useApp();
  const client = useQueryClient();
  const keys = useRef(new Map<string, string>());
  return useMutation({
    networkMode: 'always',
    mutationFn: ({
      path,
      method = 'POST',
      body,
      key,
    }: {
      path: string;
      method?: string;
      body?: unknown;
      key?: string;
    }) => {
      const signature = JSON.stringify([path, method, body]);
      const id = key ?? keys.current.get(signature) ?? operationKey();
      keys.current.set(signature, id);
      return api.request<T>(
        path,
        {
          method,
          headers: { 'Idempotency-Key': id },
          body: body === undefined ? undefined : JSON.stringify(body),
        },
        authenticated,
      );
    },
    onError: (error, variables) => {
      if (error instanceof ApiError && error.status < 500)
        keys.current.delete(
          JSON.stringify([variables.path, variables.method ?? 'POST', variables.body]),
        );
    },
    onSuccess: async (_, variables) => {
      if (completedFeedback) feedback?.();
      keys.current.delete(
        JSON.stringify([variables.path, variables.method ?? 'POST', variables.body]),
      );
      if (!authenticated) return;
      await client.invalidateQueries({ queryKey: ['api'] });
      if (variables.path === '/v1/me' || variables.path === '/v1/me/preferences')
        await reloadProfile();
    },
  });
}

/** Preserve edited values and their original version across background refetches. */
export function useDraft<T extends object>(source: T | undefined, resource = '') {
  const [edited, setEdited] = useState<{ resource: string; value: T } | null>(null);
  const value = edited?.resource === resource ? edited.value : source;
  function change<K extends keyof T>(field: K, next: T[K]) {
    setEdited((current) => {
      const base = current?.resource === resource ? current.value : source;
      return base ? { resource, value: { ...base, [field]: next } } : null;
    });
  }
  return { value, change, reset: () => setEdited(null) };
}
