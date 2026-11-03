import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useApp } from '../providers';
import { ApiError, type Schemas } from './api';

export const preferencesPath = '/v1/me/preferences';
export const preferencesKey = (userId: string) => ['api', userId, preferencesPath];
type Preferences = Schemas['Preferences'];
type Changes = Partial<Omit<Preferences, 'version'>>;

/** Serialize edits and merge only the fields the user changed into the latest version. */
export function useSavePreferences() {
  const { api, user } = useApp();
  const client = useQueryClient();
  const queryKey = preferencesKey(user?.id ?? 'guest');
  const session = useRef(user?.id);
  useEffect(() => {
    session.current = user?.id;
    return () => {
      session.current = undefined;
    };
  }, [user?.id]);
  return useMutation({
    scope: { id: `preferences:${user?.id ?? 'guest'}` },
    mutationFn: async (changes: Changes) => {
      const checkSession = () => {
        if (!user || session.current !== user.id)
          throw new ApiError(401, 'SESSION_CHANGED', 'Phiên đăng nhập đã thay đổi.');
      };
      const fetchLatest = () => {
        checkSession();
        return api.request<Preferences>(preferencesPath);
      };
      checkSession();
      let latest = client.getQueryData<Preferences>(queryKey) ?? (await fetchLatest());
      const update = () => {
        checkSession();
        return api.request<Preferences>(preferencesPath, {
          method: 'PATCH',
          body: JSON.stringify({ ...latest, ...changes, expectedVersion: latest.version }),
        });
      };
      try {
        return await update();
      } catch (error) {
        if (!(error instanceof ApiError) || error.code !== 'VERSION_CONFLICT') throw error;
        // Another device may have saved since the last GET. Preserve its unrelated edits.
        latest = await fetchLatest();
        return update();
      }
    },
    onSuccess: async (saved) => {
      // Cancel an older GET before publishing the new version to all preference observers.
      await client.cancelQueries({ queryKey, exact: true });
      client.setQueryData(queryKey, saved);
      void import('./feedback').then(({ playFeedback }) => playFeedback(saved)).catch(() => {});
    },
  });
}
