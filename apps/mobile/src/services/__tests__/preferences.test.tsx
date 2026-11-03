import type { PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { palettes } from '@bluesteps/design-tokens';
import { useApp } from '../../providers';
import { useDraft, useResource } from '../queries';
import { ApiError, type Schemas } from '../api';
import { preferencesKey, preferencesPath, useSavePreferences } from '../preferences';

jest.mock('../../providers', () => ({ useApp: jest.fn() }));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

const initial: Schemas['Preferences'] = {
  theme: 'system',
  sound: true,
  haptics: true,
  timezone: 'Asia/Ho_Chi_Minh',
  locale: 'vi',
  interests: [],
  goal: null,
  version: 1,
};

function setup() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  client.setQueryData(preferencesKey('alice'), initial);
  const request = jest.fn();
  jest.mocked(useApp).mockReturnValue({
    api: { request },
    user: { id: 'alice' },
    status: 'authenticated',
    colors: palettes.light,
  } as unknown as ReturnType<typeof useApp>);
  function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return { client, request, wrapper };
}

test('simultaneous saves from two screens use successive versions and preserve all edits', async () => {
  const { client, request, wrapper } = setup();
  let stored = initial;
  request.mockImplementation(async (_path: string, options: RequestInit) => {
    const { expectedVersion, version: _version, ...changes } = JSON.parse(options.body as string);
    expect(expectedVersion).toBe(stored.version);
    stored = { ...changes, version: stored.version + 1 };
    return stored;
  });
  const { result } = await renderHook(
    () => ({ settings: useSavePreferences(), onboarding: useSavePreferences() }),
    { wrapper },
  );
  await act(async () => {
    await Promise.all([
      result.current.settings.mutateAsync({ theme: 'dark' }),
      result.current.onboarding.mutateAsync({ interests: ['news'], goal: 'reduce' }),
      result.current.settings.mutateAsync({ sound: false }),
    ]);
  });
  expect(request).toHaveBeenCalledTimes(3);
  expect(client.getQueryData(preferencesKey('alice'))).toEqual({
    ...initial,
    theme: 'dark',
    interests: ['news'],
    goal: 'reduce',
    sound: false,
    version: 4,
  });
  client.clear();
});

test('a stale version is refreshed once, preserving changes made on another device', async () => {
  const { client, request, wrapper } = setup();
  const remote = { ...initial, version: 7, timezone: 'Europe/Paris', interests: ['news'] };
  const saved = { ...remote, theme: 'light', version: 8 };
  request
    .mockRejectedValueOnce(new ApiError(409, 'VERSION_CONFLICT', 'Cài đặt đã thay đổi.'))
    .mockResolvedValueOnce(remote)
    .mockResolvedValueOnce(saved);
  const { result } = await renderHook(useSavePreferences, { wrapper });
  await act(async () => {
    await result.current.mutateAsync({ theme: 'light' });
  });
  expect(request.mock.calls[1]).toEqual([preferencesPath]);
  expect(JSON.parse(request.mock.calls[2]![1].body)).toEqual({
    ...remote,
    theme: 'light',
    expectedVersion: 7,
  });
  expect(client.getQueryData(preferencesKey('alice'))).toEqual(saved);
  client.clear();
});

test('repeated conflicts stop after one retry and surface the error', async () => {
  const { client, request, wrapper } = setup();
  const conflict = new ApiError(409, 'VERSION_CONFLICT', 'Cài đặt đã thay đổi.');
  request
    .mockRejectedValueOnce(conflict)
    .mockResolvedValueOnce({ ...initial, version: 2 })
    .mockRejectedValueOnce(conflict);
  const { result } = await renderHook(useSavePreferences, { wrapper });
  await act(async () => {
    await expect(result.current.mutateAsync({ sound: false })).rejects.toBe(conflict);
  });
  expect(request).toHaveBeenCalledTimes(3);
  client.clear();
});

test('network failures do not retry writes or publish unsaved preferences', async () => {
  const { client, request, wrapper } = setup();
  const error = new Error('Offline');
  request.mockRejectedValue(error);
  const { result } = await renderHook(useSavePreferences, { wrapper });
  await act(async () => {
    await expect(result.current.mutateAsync({ haptics: false })).rejects.toBe(error);
  });
  expect(request).toHaveBeenCalledTimes(1);
  expect(client.getQueryData(preferencesKey('alice'))).toEqual(initial);
  client.clear();
});

test('queued edits are discarded when leaving the screen, before another account can sign in', async () => {
  const { client, request, wrapper } = setup();
  let complete!: (value: Schemas['Preferences']) => void;
  request.mockImplementation(
    () => new Promise<Schemas['Preferences']>((resolve) => (complete = resolve)),
  );
  const { result, unmount } = await renderHook(useSavePreferences, { wrapper });
  let first!: Promise<Schemas['Preferences']>;
  let queued!: Promise<unknown>;
  await act(async () => {
    first = result.current.mutateAsync({ theme: 'dark' });
    queued = result.current.mutateAsync({ sound: false }).catch((error) => error);
  });
  await unmount();
  await act(async () => {
    complete({ ...initial, theme: 'dark', version: 2 });
    await first;
    expect(await queued).toMatchObject({ code: 'SESSION_CHANGED' });
  });
  expect(request).toHaveBeenCalledTimes(1);
  client.clear();
});

test('editing a timezone draft survives unrelated preference saves and submits against the latest version', async () => {
  const { client, request, wrapper } = setup();
  let stored = initial;
  request.mockImplementation(async (_path: string, options?: RequestInit) => {
    if (options?.method !== 'PATCH') return stored;
    const { expectedVersion, version: _version, ...changes } = JSON.parse(options.body as string);
    expect(expectedVersion).toBe(stored.version);
    stored = { ...changes, version: stored.version + 1 };
    return stored;
  });
  const { result } = await renderHook(
    () => {
      const query = useResource<Schemas['Preferences']>(preferencesPath, true);
      return {
        draft: useDraft(query.data, 'timezone'),
        settings: useSavePreferences(),
        otherScreen: useSavePreferences(),
      };
    },
    { wrapper },
  );
  await waitFor(() => expect(result.current.draft.value).toBeDefined());
  await act(() => result.current.draft.change('timezone', 'Europe/Paris'));
  await act(async () => {
    await result.current.otherScreen.mutateAsync({ theme: 'dark' });
  });
  await act(async () => {
    await result.current.otherScreen.mutateAsync({ sound: false });
  });
  expect(stored.timezone).toBe(initial.timezone);
  expect(result.current.draft.value?.timezone).toBe('Europe/Paris');
  await act(async () => {
    await result.current.settings.mutateAsync({ timezone: result.current.draft.value!.timezone });
  });
  expect(stored).toEqual({
    ...initial,
    theme: 'dark',
    sound: false,
    timezone: 'Europe/Paris',
    version: 4,
  });
  client.clear();
});
