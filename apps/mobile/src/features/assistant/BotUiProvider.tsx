import { createContext, useContext, useState, type PropsWithChildren } from 'react';
export type BotMessage = {
  id: number;
  kind: 'question' | 'answer' | 'voice';
  text: string;
  seconds?: number;
};
const initial = () => ({ draft: '', messages: [] as BotMessage[] });
const Context = createContext<{
  state: ReturnType<typeof initial>;
  setDraft: (text: string) => void;
  send: (text: string) => boolean;
  sendVoice: (seconds: number) => void;
  reset: () => void;
} | null>(null);
const answerFor = (text: string) =>
  /pin|nguy hại/i.test(text)
    ? 'Bạn có thể mở Sổ tay để xem hướng dẫn và điểm thu gom cho loại rác này.'
    : 'Mình đã nhận câu hỏi của bạn. Hãy mở Sổ tay và chọn loại vật liệu cần tìm hiểu nhé!';
export function BotUiProvider({ children }: PropsWithChildren) {
  const [state, set] = useState(initial);
  return (
    <Context.Provider
      value={{
        state,
        setDraft: (draft) => set((s) => ({ ...s, draft: draft.slice(0, 1000) })),
        send: (text) => {
          const clean = text.trim().slice(0, 1000);
          if (!clean) return false;
          set((s) => ({
            ...s,
            draft: '',
            messages: [
              ...s.messages,
              { id: s.messages.length + 1, kind: 'question', text: clean },
              { id: s.messages.length + 2, kind: 'answer', text: answerFor(clean) },
            ],
          }));
          return true;
        },
        sendVoice: (seconds) =>
          set((s) => ({
            ...s,
            messages: [
              ...s.messages,
              {
                id: s.messages.length + 1,
                kind: 'voice',
                text: 'Tin nhắn giọng nói',
                seconds: Math.max(1, seconds),
              },
            ],
          })),
        reset: () => set(initial()),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useBotUi() {
  const c = useContext(Context);
  if (!c) throw Error('BotUiProvider is required');
  return c;
}
