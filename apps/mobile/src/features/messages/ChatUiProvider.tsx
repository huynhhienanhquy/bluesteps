import { createContext, useContext, useState, type PropsWithChildren } from 'react';
export const chatContacts = [
  { id: 'linh-chi', name: 'Nguyễn Thị Linh Chi', active: 'Hoạt động 1 giờ trước' },
  { id: 'thu-phuong', name: 'Thu Phương', active: 'Hoạt động 20 phút trước' },
  { id: 'quang-huy', name: 'Nguyễn Quang Huy', active: 'Hoạt động 50 phút trước' },
  { id: 'my-duyen', name: 'Lê Thị Mỹ Duyên', active: 'Hoạt động 3 giờ trước' },
  { id: 'phuoc-bao', name: 'Hoàng Phước Bảo', active: 'Hoạt động 5 giờ trước' },
] as const;
export type ChatContactId = (typeof chatContacts)[number]['id'];
export type ChatMessage = {
  id: number;
  kind: 'text' | 'emoji' | 'photo' | 'file' | 'voice' | 'post';
  text?: string;
  source?: number;
  seconds?: number;
  fileIndex?: number;
  postId?: string;
};
export type ChatPayload = Omit<ChatMessage, 'id'>;
const initial = () => ({
  drafts: {} as Record<string, string>,
  rooms: {} as Record<string, ChatMessage[]>,
});
const Context = createContext<{
  state: ReturnType<typeof initial>;
  setDraft: (id: string, value: string) => void;
  send: (id: string, payload: ChatPayload) => boolean;
  reset: () => void;
} | null>(null);
export function ChatUiProvider({ children }: PropsWithChildren) {
  const [state, set] = useState(initial);
  return (
    <Context.Provider
      value={{
        state,
        setDraft: (id, value) =>
          set((s) => ({ ...s, drafts: { ...s.drafts, [id]: value.slice(0, 1000) } })),
        send: (id, payload) => {
          if ((payload.kind === 'text' || payload.kind === 'emoji') && !payload.text?.trim())
            return false;
          set((s) => ({
            ...s,
            drafts: { ...s.drafts, [id]: '' },
            rooms: {
              ...s.rooms,
              [id]: [
                ...(s.rooms[id] ?? []),
                { ...payload, text: payload.text?.trim(), id: (s.rooms[id]?.at(-1)?.id ?? 0) + 1 },
              ],
            },
          }));
          return true;
        },
        reset: () => set(initial()),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useChatUi() {
  const c = useContext(Context);
  if (!c) throw Error('ChatUiProvider is required');
  return c;
}
