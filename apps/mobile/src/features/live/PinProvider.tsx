import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState, Platform } from 'react-native';
import {
  disablePin,
  forgetPinAfterLogout,
  pinStorageKey,
  readPin,
  savePin,
  verifyPin,
  type PinRecord,
} from '../../services/pin';
import { errorMessage } from '../../services/api';
type PinState = {
  owner: string | null;
  session?: object;
  record: PinRecord | null;
  locked: boolean;
  error: string;
  unlockedAt?: number;
};
type PinContextValue = {
  ready: boolean;
  locked: boolean;
  enabled: boolean;
  error: string;
  blockedUntil: number;
  unlockedAt: number;
  busy: boolean;
  lock: () => void;
  unlock: (pin: string) => Promise<void>;
  check: (pin: string) => Promise<void>;
  save: (pin: string, current?: string) => Promise<void>;
  disable: (pin: string) => Promise<void>;
  recover: () => Promise<void>;
  reload: () => void;
};
const Context = createContext<PinContextValue | null>(null);
export function PinProvider({
  userId,
  logout,
  children,
}: PropsWithChildren<{ userId: string | null; logout: () => Promise<void> }>) {
  const [state, setState] = useState<PinState>({
      owner: null,
      record: null,
      locked: true,
      error: '',
    }),
    [busy, setBusy] = useState(false),
    [reload, setReload] = useState(0);
  const generation = useRef(0),
    operation = useRef(false);
  const identity = useMemo(() => ({ userId }), [userId]);
  const ready = !userId || state.session === identity;
  useEffect(() => {
    let active = true;
    generation.current++;
    if (userId)
      void readPin(userId)
        .then((record) => {
          if (active)
            setState({ owner: userId, session: identity, record, locked: !!record, error: '' });
        })
        .catch((cause) => {
          if (active)
            setState({
              owner: userId,
              session: identity,
              record: null,
              locked: true,
              error: errorMessage(cause),
            });
        });
    return () => {
      active = false;
      generation.current++;
    };
  }, [userId, reload, identity]);
  useEffect(() => {
    function lock() {
      generation.current++;
      setState((s) => (s.record ? { ...s, locked: true } : s));
    }
    if (Platform.OS === 'web') {
      const hidden = () => {
        if (document.visibilityState !== 'visible') lock();
      };
      const storage = (e: StorageEvent) => {
        if (userId && e.key === pinStorageKey(userId)) {
          lock();
          setReload((v) => v + 1);
        }
      };
      document.addEventListener('visibilitychange', hidden);
      window.addEventListener('storage', storage);
      return () => {
        document.removeEventListener('visibilitychange', hidden);
        window.removeEventListener('storage', storage);
      };
    }
    const subscription = AppState.addEventListener('change', (s) => {
      if (s !== 'active') lock();
    });
    return () => subscription.remove();
  }, [userId]);
  async function act(effect: (id: string) => Promise<PinRecord | null | void>, unlock = false) {
    if (!userId || operation.current) throw new Error('Vui lòng đợi thao tác PIN hiện tại.');
    operation.current = true;
    setBusy(true);
    const snapshot = generation.current,
      owner = userId;
    try {
      const record = await effect(owner);
      if (snapshot !== generation.current)
        throw new Error('Ứng dụng đã bị khóa lại. Vui lòng nhập lại PIN.');
      setState((s) =>
        s.session === identity
          ? {
              ...s,
              record: record === undefined ? s.record : record,
              locked: unlock ? false : s.locked,
              error: '',
              unlockedAt: unlock ? Date.now() : s.unlockedAt,
            }
          : s,
      );
    } catch (cause) {
      try {
        const record = await readPin(owner);
        setState((s) =>
          s.session === identity
            ? { ...s, record, locked: snapshot !== generation.current ? !!record : s.locked }
            : s,
        );
      } catch (storageError) {
        setState((s) =>
          s.session === identity ? { ...s, locked: true, error: errorMessage(storageError) } : s,
        );
      }
      throw cause;
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  return (
    <Context.Provider
      value={{
        ready,
        locked: !!userId && (!ready || state.locked || !!state.error),
        enabled: !!userId && ready && !!state.record,
        error: ready ? state.error : '',
        blockedUntil: ready ? (state.record?.blockedUntil ?? 0) : 0,
        unlockedAt: ready ? (state.unlockedAt ?? 0) : 0,
        busy,
        lock: () => {
          generation.current++;
          setState((s) => (s.record ? { ...s, locked: true } : s));
        },
        unlock: (pin) => act((id) => verifyPin(id, pin), true),
        check: (pin) => act((id) => verifyPin(id, pin)),
        save: (pin, current) => act((id) => savePin(id, pin, current), true),
        disable: (pin) =>
          act(async (id) => {
            await disablePin(id, pin);
            return null;
          }, true),
        reload: () => setReload((v) => v + 1),
        recover: async () => {
          if (!userId) return;
          const owner = userId;
          try {
            await logout();
          } finally {
            await forgetPinAfterLogout(owner);
          }
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePin() {
  const value = useContext(Context);
  if (!value) throw new Error('PinProvider is required');
  return value;
}
export const useOptionalPin = () => useContext(Context);
