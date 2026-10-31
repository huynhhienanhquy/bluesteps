import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { DesignLayer } from '../../design-system/DesignFrameLayers';
export type ComposerMedia = { id: string; source: number; crop?: DesignLayer['crop'] };
export type ComposerDraft = {
  text: string;
  audience: 'Công khai' | 'Bạn bè' | 'Chỉ mình tôi';
  location: string;
  feeling: string;
  media: ComposerMedia[];
};
export const emptyComposer = (): ComposerDraft => ({
  text: '',
  audience: 'Công khai',
  location: '',
  feeling: '',
  media: [],
});
export type CommunityPostId = 'healing' | 'save' | 'linh';
export type CommunityComment = { id: number; text: string };
const initial = () => ({
  liked: [] as CommunityPostId[],
  saved: ['healing', 'save', 'linh'] as CommunityPostId[],
  following: [] as string[],
  hidden: [] as CommunityPostId[],
  draft: '',
  composer: emptyComposer(),
  published: {} as Record<string, ComposerDraft>,
  comments: { healing: [], save: [], linh: [] } as Record<CommunityPostId, CommunityComment[]>,
});
const toggle = <T,>(values: T[], value: T) =>
  values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
const Context = createContext<{
  state: ReturnType<typeof initial>;
  toggleLike: (id: CommunityPostId) => void;
  toggleSave: (id: CommunityPostId) => void;
  toggleFollow: (id: string) => void;
  hidePost: (id: CommunityPostId) => void;
  setDraft: (text: string) => void;
  setComposer: Dispatch<SetStateAction<ComposerDraft>>;
  publishComposer: (id: string, draft: ComposerDraft) => void;
  addComment: (id: CommunityPostId, text: string) => boolean;
  reset: () => void;
} | null>(null);
export function CommunityUiProvider({ children }: PropsWithChildren) {
  const [state, set] = useState(initial);
  return (
    <Context.Provider
      value={{
        state,
        toggleLike: (id) => set((s) => ({ ...s, liked: toggle(s.liked, id) })),
        toggleSave: (id) => set((s) => ({ ...s, saved: toggle(s.saved, id) })),
        toggleFollow: (id) => set((s) => ({ ...s, following: toggle(s.following, id) })),
        hidePost: (id) => set((s) => ({ ...s, hidden: [...new Set([...s.hidden, id])] })),
        setDraft: (draft) => set((s) => ({ ...s, draft: draft.slice(0, 500) })),
        setComposer: (next) =>
          set((s) => ({ ...s, composer: typeof next === 'function' ? next(s.composer) : next })),
        publishComposer: (id, draft) =>
          set((s) => ({
            ...s,
            composer: emptyComposer(),
            published: { ...s.published, [id]: { ...draft, media: [...draft.media] } },
          })),
        addComment: (id, text) => {
          const clean = text.trim().slice(0, 500);
          if (!clean) return false;
          set((s) => ({
            ...s,
            draft: '',
            comments: {
              ...s.comments,
              [id]: [...s.comments[id], { id: s.comments[id].length + 1, text: clean }],
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
export function useCommunityUi() {
  const c = useContext(Context);
  if (!c) throw Error('CommunityUiProvider is required');
  return c;
}
