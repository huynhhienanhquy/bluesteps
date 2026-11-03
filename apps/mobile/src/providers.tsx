import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState, Platform, useColorScheme } from 'react-native';
import { QueryClient, QueryClientProvider, focusManager, useQuery } from '@tanstack/react-query';
import { palettes, type Colors } from '@bluesteps/design-tokens';
import { ApiError, createApiClient } from '@bluesteps/api-client';
import { apiBaseUrl, errorMessage, type Schemas } from './services/api';
import { createSessionTransport, sessionSignedOutKey } from './services/session-storage';
import { PinProvider } from './features/live/PinProvider';
import { LocalProfileProvider } from './features/live/LocalProfileProvider';

export type ApiClient = ReturnType<typeof createApiClient>;
type Theme = 'system' | 'light' | 'dark';
type SessionStatus = 'loading' | 'authenticated' | 'guest' | 'error';
type AppContextValue = {
  api: ApiClient;
  user: Schemas['Profile'] | null;
  status: SessionStatus;
  sessionError: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
  reloadProfile: () => Promise<void>;
  theme: Theme;
  colors: Colors;
  dark: boolean;
  feedback: () => void;
};
const AppContext = createContext<AppContextValue | null>(null);
focusManager.setEventListener((handle) => {
  if (Platform.OS === 'web') {
    if (typeof document === 'undefined') return () => {};
    const listener = () => handle(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', listener);
    return () => document.removeEventListener('visibilitychange', listener);
  }
  const subscription = AppState.addEventListener('change', (state) => handle(state === 'active'));
  return () => subscription.remove();
});

export function AppProviders({
  children,
  queryClient,
  apiClient,
}: PropsWithChildren<{ queryClient?: QueryClient; apiClient?: ApiClient }>) {
  const [client] = useState(
    () =>
      queryClient ??
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, staleTime: 15_000 },
          mutations: { retry: false },
        },
      }),
  );
  const [user, setUser] = useState<Schemas['Profile'] | null>(null);
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const epoch = useRef(0);
  const systemTheme = useColorScheme();
  const [api] = useState(() => {
    if (apiClient) return apiClient;
    const baseUrl = apiBaseUrl();
    return createApiClient({
      baseUrl,
      ...createSessionTransport(baseUrl),
    });
  });
  useEffect(
    () =>
      api.subscribeSessionLost(() => {
        epoch.current++;
        setUser(null);
        setStatus('guest');
        void client.cancelQueries().then(() => client.clear());
      }),
    [api, client],
  );
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const signedOut = (event: StorageEvent) => {
      if (event.key !== sessionSignedOutKey(apiBaseUrl()) || !event.newValue) return;
      epoch.current++;
      api.invalidatePendingRequests();
      setUser(null);
      setStatus('guest');
      void api
        .logout()
        .catch(() => {})
        .finally(() => client.cancelQueries().then(() => client.clear()));
    };
    window.addEventListener('storage', signedOut);
    return () => window.removeEventListener('storage', signedOut);
  }, [api, client]);
  const loadProfile = useCallback(async () => {
    const snapshot = epoch.current;
    const profile = await api.me();
    if (snapshot !== epoch.current) return;
    setUser(profile);
    setStatus('authenticated');
    setSessionError(null);
  }, [api]);
  const restore = useCallback(async () => {
    const snapshot = ++epoch.current;
    setStatus('loading');
    setSessionError(null);
    try {
      await api.refresh();
      if (snapshot !== epoch.current) return;
      await loadProfile();
    } catch (error) {
      if (snapshot !== epoch.current) return;
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        setStatus('guest');
      } else {
        setStatus('error');
        setSessionError(errorMessage(error));
      }
    }
  }, [api, loadProfile]);
  useEffect(() => {
    let active = true;
    const snapshot = epoch.current;
    void api
      .refresh()
      .then(() => {
        if (active && snapshot === epoch.current) return loadProfile();
      })
      .catch((error) => {
        if (!active || snapshot !== epoch.current) return;
        if (error instanceof ApiError && error.status === 401) {
          setUser(null);
          setStatus('guest');
        } else {
          setStatus('error');
          setSessionError(errorMessage(error));
        }
      });
    return () => {
      active = false;
    };
  }, [api, loadProfile]);
  const preferences = useQuery(
    {
      queryKey: ['api', user?.id ?? 'guest', '/v1/me/preferences'],
      enabled: status === 'authenticated',
      queryFn: ({ signal }) =>
        api.request<Schemas['Preferences']>('/v1/me/preferences', { signal }),
    },
    client,
  );
  const effectiveTheme = preferences.data?.theme ?? 'system';
  const value = useMemo<AppContextValue>(
    () => ({
      api,
      user,
      status,
      sessionError,
      feedback: () => {
        if (preferences.data)
          void import('./services/feedback')
            .then(({ playFeedback }) => playFeedback(preferences.data!))
            .catch(() => {});
      },
      restore,
      reloadProfile: loadProfile,
      theme: effectiveTheme,
      dark: effectiveTheme === 'dark' || (effectiveTheme === 'system' && systemTheme === 'dark'),
      colors:
        palettes[
          effectiveTheme === 'dark' || (effectiveTheme === 'system' && systemTheme === 'dark')
            ? 'dark'
            : 'light'
        ],
      async login(email, password) {
        api.invalidatePendingRequests();
        const snapshot = ++epoch.current;
        if (user) await api.logout();
        await client.cancelQueries();
        client.clear();
        setUser(null);
        setStatus('guest');
        try {
          await api.login({ email, password, deviceLabel: Platform.OS });
          if (snapshot === epoch.current) await loadProfile();
        } catch (error) {
          if (snapshot === epoch.current) setStatus('guest');
          throw error;
        }
      },
      async logout() {
        api.invalidatePendingRequests();
        const snapshot = ++epoch.current;
        try {
          await api.logout();
        } finally {
          if (snapshot === epoch.current) {
            await client.cancelQueries();
            client.clear();
            setUser(null);
            setStatus('guest');
          }
        }
      },
    }),
    [
      api,
      user,
      status,
      sessionError,
      restore,
      loadProfile,
      effectiveTheme,
      systemTheme,
      client,
      preferences.data,
    ],
  );
  return (
    <QueryClientProvider client={client}>
      <AppContext.Provider value={value}>
        <PinProvider userId={user?.id ?? null} logout={value.logout}>
          <LocalProfileProvider account={user}>{children}</LocalProfileProvider>
        </PinProvider>
      </AppContext.Provider>
    </QueryClientProvider>
  );
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('AppProviders is required');
  return value;
}
