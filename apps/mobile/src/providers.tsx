import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { AppState, Platform, useColorScheme } from 'react-native';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { palettes, type Colors } from '@bluesteps/design-tokens';
import { initialPosts } from './services/fixtures';
import type { DemoState } from './services/demo';
import { appendDemoMessage, createDemoSession, type DemoSession } from './services/demo-session';
import { initialExperience, type ExperiencePreferences } from './services/experience';
import { defaultCollectionFilters, type CollectionFilters } from './services/collection';
import type { CollectionProposalDraft } from './services/collection-forms';

focusManager.setEventListener((handleFocus) => {
  if (Platform.OS === 'web') {
    const listener = () => handleFocus(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', listener);
    return () => document.removeEventListener('visibilitychange', listener);
  }
  const subscription = AppState.addEventListener('change', (state) =>
    handleFocus(state === 'active'),
  );
  return () => subscription.remove();
});

type ThemeMode = 'system' | 'light' | 'dark';
type Post = (typeof initialPosts)[number];
type DemoContextValue = {
  pointProposalDraft: CollectionProposalDraft | null;
  setPointProposalDraft: (draft: CollectionProposalDraft | null) => void;
  collectionFilters: CollectionFilters;
  setCollectionFilters: Dispatch<SetStateAction<CollectionFilters>>;
  selectedPoint: string;
  setSelectedPoint: (id: string) => void;
  experience: ExperiencePreferences;
  setExperience: Dispatch<SetStateAction<ExperiencePreferences>>;
  colors: Colors;
  dark: boolean;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  saved: string[];
  toggleSaved: (id: string) => void;
  liked: string[];
  toggleLiked: (id: string) => void;
  stops: string[];
  setStops: (ids: string[]) => void;
  posts: Post[];
  addPost: (text: string) => void;
  notifications: DemoSession['notifications'];
  markNotificationRead: (id?: string) => void;
  conversations: DemoSession['conversations'];
  sendMessage: (id: string, text: string) => void;
  readConversation: (id: string) => void;
  resetDemo: () => void;
  state: DemoState;
  setState: (state: DemoState) => void;
};
const DemoContext = createContext<DemoContextValue | null>(null);
export function AppProviders({
  children,
  queryClient,
}: PropsWithChildren<{ queryClient?: QueryClient }>) {
  const [client] = useState(
    () =>
      queryClient ??
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, staleTime: 30_000 },
          mutations: { retry: false },
        },
      }),
  );
  const system = useColorScheme();
  const [theme, setTheme] = useState<ThemeMode>('system');
  const [session, setSession] = useState(createDemoSession);
  const [state, setState] = useState<DemoState>('content');
  const [experience, setExperience] = useState(initialExperience);
  const [collectionFilters, setCollectionFilters] = useState(defaultCollectionFilters);
  const [selectedPoint, setSelectedPoint] = useState('green-hub');
  const [pointProposalDraft, setPointProposalDraft] = useState<CollectionProposalDraft | null>(
    null,
  );
  const dark = theme === 'dark' || (theme === 'system' && system === 'dark');
  const toggle = (values: string[], id: string) =>
    values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
  return (
    <QueryClientProvider client={client}>
      <DemoContext.Provider
        value={{
          pointProposalDraft,
          setPointProposalDraft,
          collectionFilters,
          setCollectionFilters,
          selectedPoint,
          setSelectedPoint,
          experience,
          setExperience,
          colors: palettes[dark ? 'dark' : 'light'],
          dark,
          theme,
          setTheme,
          ...session,
          setStops: (stops) => setSession((current) => ({ ...current, stops: [...stops] })),
          state,
          setState,
          toggleSaved: (id) =>
            setSession((current) => ({ ...current, saved: toggle(current.saved, id) })),
          toggleLiked: (id) =>
            setSession((current) => ({ ...current, liked: toggle(current.liked, id) })),
          markNotificationRead: (id) =>
            setSession((current) => ({
              ...current,
              notifications: current.notifications.map((notification) =>
                !id || notification.id === id ? { ...notification, read: true } : notification,
              ),
            })),
          readConversation: (id) =>
            setSession((current) => ({
              ...current,
              conversations: current.conversations.map((conversation) =>
                conversation.id === id ? { ...conversation, unreadCount: 0 } : conversation,
              ),
            })),
          sendMessage: (id, text) =>
            setSession((current) => ({
              ...current,
              conversations: appendDemoMessage(current.conversations, id, text),
            })),
          resetDemo: () => {
            setPointProposalDraft(null);
            setCollectionFilters(defaultCollectionFilters());
            setSelectedPoint('green-hub');
            setExperience(initialExperience());
            setSession(createDemoSession());
            setState('content');
          },
          addPost: (text) =>
            setSession((current) => ({
              ...current,
              posts: [
                {
                  id: `draft-${current.posts.length + 1}`,
                  author: 'Bạn · Demo',
                  avatar: 'B',
                  time: 'Vừa xong · chỉ trong phiên này',
                  text,
                  likes: 0,
                },
                ...current.posts,
              ],
            })),
        }}
      >
        {children}
      </DemoContext.Provider>
    </QueryClientProvider>
  );
}
export function useApp() {
  const context = useContext(DemoContext);
  if (!context) throw new Error('AppProviders is required');
  return context;
}
