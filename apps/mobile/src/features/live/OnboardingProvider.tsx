import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { readOnboardingChoices, writeOnboardingChoices } from '../../services/onboarding-storage';
import { useApp } from '../../providers';
import { ApiError, errorMessage, type Schemas } from '../../services/api';
import { useSavePreferences } from '../../services/preferences';
import { useQueryClient } from '@tanstack/react-query';
import {
  readPendingChoices,
  type OnboardingChoices,
  type PendingOnboarding,
} from '../../services/onboarding-choices';

const OnboardingContext = createContext<{
  completed: boolean | null;
  complete: (choices?: OnboardingChoices) => Promise<void>;
  pendingChoices: OnboardingChoices | null;
  syncError: string;
  retrySync: () => void;
} | null>(null);

export function OnboardingProvider({ children }: PropsWithChildren) {
  const { api, user, status } = useApp();
  const cache = useQueryClient();
  const { mutateAsync: savePreferences } = useSavePreferences();
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [sessionAccount, setSessionAccount] = useState(user?.id);
  const [pending, setPending] = useState<PendingOnboarding | null>(null);
  const [syncError, setSyncError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const pendingRef = useRef(pending);
  useEffect(() => {
    let active = true;
    void readOnboardingChoices()
      .catch(() => null)
      .then((raw) => {
        if (active) {
          const choices = readPendingChoices(raw);
          pendingRef.current = choices;
          setPending(choices);
          setCompleted(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // Completion only unlocks auth for this guest session. A restored account
  // bypasses the introduction, but signing out must start it again.
  if (sessionAccount !== user?.id) {
    setSessionAccount(user?.id);
    setCompleted(false);
  }

  const complete = useCallback(
    async (choices?: OnboardingChoices) => {
      if (choices) {
        const next = { choices, ...(user ? { account: user.id } : {}) };
        pendingRef.current = next;
        await writeOnboardingChoices(JSON.stringify(next)).catch(() => {});
        setPending(next);
      }
      setCompleted(status !== 'authenticated');
    },
    [user?.id, status],
  );

  useEffect(() => {
    const queued = pendingRef.current;
    if (
      status !== 'authenticated' ||
      !user ||
      !queued ||
      (queued.account && queued.account !== user.id)
    )
      return;
    const account = user.id;
    const controller = new AbortController();
    let active = true;
    setSyncError('');
    async function sync() {
      // Bind choices before any account changes so a retry stays with the same account.
      let record = { ...queued!, account };
      const current = () => active && pendingRef.current === record;
      pendingRef.current = record;
      await writeOnboardingChoices(JSON.stringify(record));
      if (!current()) return;
      if (!record.preferencesSaved) {
        await savePreferences({
          interests: record.choices.interests,
          goal: record.choices.goal,
        });
        if (!current()) return;
        record = { ...record, preferencesSaved: true };
        pendingRef.current = record;
        await writeOnboardingChoices(JSON.stringify(record));
      }
      if (!current()) return;
      const path = '/v1/me/notification-preferences';
      const updateReminder = async () => {
        const latest = await api.request<Schemas['NotificationPreferences']>(path, {
          signal: controller.signal,
        });
        const { version, ...fields } = latest;
        if (!current()) throw new Error('Phiên đăng nhập đã thay đổi.');
        return api.request<Schemas['NotificationPreferences']>(path, {
          method: 'PUT',
          signal: controller.signal,
          body: JSON.stringify({
            ...fields,
            dailyReminder: record.choices.remindersEnabled,
            dailyTime: record.choices.reminderTime,
            expectedVersion: version,
          }),
        });
      };
      if (!record.remindersSaved) {
        let saved;
        try {
          saved = await updateReminder();
        } catch (error) {
          if (!current() || !(error instanceof ApiError) || error.code !== 'VERSION_CONFLICT')
            throw error;
          saved = await updateReminder();
        }
        if (!current()) return;
        await cache.cancelQueries({ queryKey: ['api', account, path], exact: true });
        if (!current()) return;
        cache.setQueryData(['api', account, path], saved);
        record = { ...record, remindersSaved: true };
        pendingRef.current = record;
        await writeOnboardingChoices(JSON.stringify(record));
      }
      if (!current()) return;
      await cache.invalidateQueries({ queryKey: ['api', account, '/v1/me/device-reminders'] });
      if (!current()) return;
      await writeOnboardingChoices(null);
      if (current()) {
        pendingRef.current = null;
        setPending(null);
      }
    }
    void sync().catch((error) => {
      if (active) {
        setSyncError(errorMessage(error));
      }
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [api, user?.id, status, attempt, savePreferences, cache, pending]);

  return (
    <OnboardingContext.Provider
      value={{
        completed,
        complete,
        pendingChoices:
          pendingRef.current &&
          (!pendingRef.current.account || pendingRef.current.account === user?.id)
            ? pendingRef.current.choices
            : null,
        syncError: pendingRef.current?.account === user?.id ? syncError : '',
        retrySync: () => setAttempt((value) => value + 1),
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const value = useContext(OnboardingContext);
  if (!value) throw new Error('OnboardingProvider is required');
  return value;
}
