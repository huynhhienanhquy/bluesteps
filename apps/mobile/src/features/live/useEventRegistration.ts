import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useApp } from '../../providers';
import { ApiError, type Schemas } from '../../services/api';

export function useEventRegistration(id: string) {
  const { api, user, status } = useApp();
  const query = useQuery({
    queryKey: ['api', user?.id ?? 'guest', `/v1/events/${id}/registration`],
    enabled: status === 'authenticated' && !!id,
    queryFn: async ({ signal }) => {
      try {
        return await api.request<Schemas['EventRegistration']>(`/v1/events/${id}/registration`, {
          signal,
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  });
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      if (status === 'authenticated' && id) void refetch();
    }, [id, status, refetch]),
  );
  return query;
}
