import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { Platform } from 'react-native';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { apiBaseUrl, errorMessage, type Schemas } from '../../services/api';
import {
  isLocalAvatar,
  persistLocalAvatar,
  readLocalProfile,
  releaseLocalAvatar,
  removeLocalProfile,
  writeLocalProfile,
  type AvatarSource,
} from '../../services/local-profile-storage';
export type LocalProfile = Omit<Schemas['Profile'], 'version'> & {
  revision: number;
  avatarUri: string | null;
  chatNote: string;
};
export type ProfileFields = Pick<
  LocalProfile,
  'displayName' | 'email' | 'bio' | 'birthDate' | 'countryCode'
>;
type Fields = Partial<ProfileFields> & { avatarUri?: string | null; chatNote?: string };
type RecordValue = { v: 1; revision: number; fields: Fields };
type Value = {
  profile: LocalProfile | null;
  ready: boolean;
  error: string;
  save: (fields: Partial<ProfileFields>, revision: number) => Promise<LocalProfile>;
  saveChatNote: (note: string, revision: number) => Promise<LocalProfile>;
  setAvatar: (source: AvatarSource | null, revision: number) => Promise<LocalProfile>;
  reset: () => Promise<void>;
  reload: () => void;
};
const Context = createContext<Value | null>(null),
  queues = new Map<string, Promise<unknown>>();
function storageKey(id: string) {
  return 'bluesteps.profile.v1.' + bytesToHex(sha256(utf8ToBytes(apiBaseUrl() + ':' + id)));
}
function validate(fields: Fields): Fields {
  const output: Fields = {};
  if (fields.displayName !== undefined) {
    const value = fields.displayName.trim();
    if (!value || value.length > 100) throw new Error('Tên cần từ 1 đến 100 ký tự.');
    output.displayName = value;
  }
  if (fields.email !== undefined) {
    const value = fields.email.trim();
    if (value.length > 254 || !/^\S+@\S+\.\S+$/.test(value))
      throw new Error('Email hiển thị chưa hợp lệ.');
    output.email = value;
  }
  if (fields.bio !== undefined) {
    if (fields.bio.length > 500) throw new Error('Giới thiệu tối đa 500 ký tự.');
    output.bio = fields.bio;
  }
  if (fields.countryCode !== undefined) {
    if (fields.countryCode !== null && !/^[A-Z]{2}$/.test(fields.countryCode))
      throw new Error('Quốc gia dùng mã 2 chữ cái, ví dụ VN.');
    output.countryCode = fields.countryCode;
  }
  if (fields.birthDate !== undefined) {
    if (fields.birthDate !== null) {
      const value = fields.birthDate,
        date = new Date(value + 'T00:00:00Z');
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value
      )
        throw new Error('Ngày sinh cần đúng định dạng YYYY-MM-DD.');
    }
    output.birthDate = fields.birthDate;
  }
  if (fields.avatarUri !== undefined) output.avatarUri = fields.avatarUri;
  if (fields.chatNote !== undefined) {
    if (typeof fields.chatNote !== 'string' || fields.chatNote.length > 60)
      throw new Error('Ghi chú tối đa 60 ký tự.');
    output.chatNote = fields.chatNote.trim();
  }
  return output;
}
async function read(key: string): Promise<RecordValue> {
  const raw = await readLocalProfile(key);
  if (!raw) return { v: 1, revision: 0, fields: {} };
  try {
    const record = JSON.parse(raw) as RecordValue;
    if (
      record.v !== 1 ||
      !Number.isInteger(record.revision) ||
      record.revision < 0 ||
      !record.fields
    )
      throw new Error();
    const fields = validate(record.fields);
    if (fields.avatarUri && !isLocalAvatar(key, fields.avatarUri)) delete fields.avatarUri;
    return { v: 1, revision: record.revision, fields };
  } catch {
    throw new Error(
      'Không đọc được hồ sơ đã lưu trên thiết bị. Bạn có thể khôi phục hồ sơ ban đầu.',
    );
  }
}
function serial<T>(key: string, effect: () => Promise<T>): Promise<T> {
  const job = (queues.get(key) ?? Promise.resolve())
    .catch(() => {})
    .then(() =>
      Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.locks
        ? navigator.locks.request(key, effect)
        : effect(),
    );
  queues.set(key, job);
  void job
    .finally(() => {
      if (queues.get(key) === job) queues.delete(key);
    })
    .catch(() => {});
  return job;
}
export function LocalProfileProvider({
  account,
  children,
}: PropsWithChildren<{ account: Schemas['Profile'] | null }>) {
  const identity = useMemo(() => ({ id: account?.id }), [account?.id]);
  const key = account ? storageKey(account.id) : '',
    accountRef = useRef(identity);
  const [loaded, setLoaded] = useState<{
      identity: object;
      record: RecordValue;
      error: string;
    } | null>(null),
    [reload, setReload] = useState(0);
  useEffect(() => {
    accountRef.current = identity;
    let alive = true;
    if (account)
      void read(key)
        .then((record) => {
          if (alive) setLoaded({ identity, record, error: '' });
        })
        .catch((cause) => {
          if (alive)
            setLoaded({
              identity,
              record: { v: 1, revision: 0, fields: {} },
              error: errorMessage(cause),
            });
        });
    return () => {
      alive = false;
    };
  }, [identity, key, account, reload]);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const listener = (e: StorageEvent) => {
      if (e.key === key) setReload((v) => v + 1);
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }, [key]);
  const ready = !account || loaded?.identity === identity;
  function merge(record: RecordValue): LocalProfile {
    if (!account) throw new Error('Đăng nhập để chỉnh sửa hồ sơ.');
    return {
      id: account.id,
      timezone: account.timezone,
      displayName: account.displayName,
      email: account.email,
      bio: account.bio,
      countryCode: account.countryCode,
      birthDate: account.birthDate,
      ...record.fields,
      avatarUri: record.fields.avatarUri ?? null,
      chatNote: record.fields.chatNote ?? '',
      revision: record.revision,
    };
  }
  async function commit(fields: Fields, revision: number) {
    const captured = identity;
    if (!account) throw new Error('Đăng nhập để chỉnh sửa hồ sơ.');
    const record = await serial(key, async () => {
      if (accountRef.current !== captured) throw new Error('Phiên đăng nhập đã thay đổi.');
      const current = await read(key);
      if (current.revision !== revision)
        throw new Error('Hồ sơ trên thiết bị đã thay đổi. Mở lại hồ sơ trước khi lưu.');
      const next: RecordValue = {
        v: 1,
        revision: current.revision + 1,
        fields: { ...current.fields, ...validate(fields) },
      };
      await writeLocalProfile(key, JSON.stringify(next));
      return next;
    });
    if (accountRef.current === captured) setLoaded({ identity: captured, record, error: '' });
    return merge(record);
  }
  return (
    <Context.Provider
      value={{
        ready,
        error: ready ? (loaded?.error ?? '') : '',
        profile: account
          ? merge(loaded?.identity === identity ? loaded.record : { v: 1, revision: 0, fields: {} })
          : null,
        save: commit,
        saveChatNote: (note, revision) => commit({ chatNote: note }, revision),
        setAvatar: async (source, revision) => {
          const previous = await read(key),
            uri = source ? await persistLocalAvatar(key, source) : null;
          try {
            const result = await commit({ avatarUri: uri }, revision);
            if (previous.fields.avatarUri !== uri)
              await releaseLocalAvatar(key, previous.fields.avatarUri).catch(() => {});
            return result;
          } catch (cause) {
            if (uri) await releaseLocalAvatar(key, uri).catch(() => {});
            throw cause;
          }
        },
        reset: async () => {
          if (!account) return;
          const current = await serial(key, async () => {
            const record = await read(key).catch(() => null);
            await removeLocalProfile(key);
            return record;
          });
          await releaseLocalAvatar(key, current?.fields.avatarUri).catch(() => {});
          setReload((v) => v + 1);
        },
        reload: () => setReload((v) => v + 1),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useLocalProfile() {
  const value = useContext(Context);
  if (!value) throw new Error('LocalProfileProvider is required');
  return value;
}
export const useOptionalLocalProfile = () => useContext(Context);
