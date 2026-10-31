import { createContext, useContext, useState, type PropsWithChildren } from 'react';
export type NoticePreference = 'activity' | 'offers' | 'community' | 'news';
const initial = () => ({
  read: [] as string[],
  removed: [] as string[],
  preferences: { activity: true, offers: true, community: false, news: false },
  following: [] as string[],
});
export const noticeIds = [
  'scan-today',
  'camera-today',
  'voucher-yesterday',
  'scan-before',
  'scan-failed',
  'voucher-before',
  'scan-earlier',
];
const Context = createContext<{
  state: ReturnType<typeof initial>;
  markRead: (id?: string) => void;
  remove: (id: string) => void;
  togglePreference: (key: NoticePreference) => void;
  updatePreferences: (value: Record<NoticePreference, boolean>) => void;
  toggleFollow: (id: string) => void;
  reset: () => void;
} | null>(null);
export function NotificationUiProvider({ children }: PropsWithChildren) {
  const [state, set] = useState(initial);
  return (
    <Context.Provider
      value={{
        state,
        markRead: (id) =>
          set((s) => ({ ...s, read: id ? [...new Set([...s.read, id])] : [...noticeIds] })),
        remove: (id) => set((s) => ({ ...s, removed: [...new Set([...s.removed, id])] })),
        togglePreference: (key) =>
          set((s) => ({ ...s, preferences: { ...s.preferences, [key]: !s.preferences[key] } })),
        updatePreferences: (value) => set((s) => ({ ...s, preferences: { ...value } })),
        toggleFollow: (id) =>
          set((s) => ({
            ...s,
            following: s.following.includes(id)
              ? s.following.filter((v) => v !== id)
              : [...s.following, id],
          })),
        reset: () => set(initial()),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useNotificationUi() {
  const c = useContext(Context);
  if (!c) throw Error('NotificationUiProvider is required');
  return c;
}
