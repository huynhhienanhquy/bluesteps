import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { useRefreshOnFocus } from '../query-focus';

jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }));

function focus() {
  jest.mocked(useFocusEffect).mock.calls.at(-1)![0]();
}

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 15_000, gcTime: Infinity } },
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

beforeEach(() => jest.clearAllMocks());

test('returning to a screen reuses fresh data and never restarts its in-flight refresh', async () => {
  const { client, wrapper } = setup();
  client.setQueryData(['catalog'], 'cached');
  let finish!: (value: string) => void;
  const request = jest.fn(
    () =>
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
  );
  const { result, unmount } = await renderHook(
    () => {
      const query = useQuery({ queryKey: ['catalog'], queryFn: request });
      useRefreshOnFocus([query]);
      return query;
    },
    { wrapper },
  );
  await act(() => focus());
  expect(request).not.toHaveBeenCalled();
  expect(result.current.data).toBe('cached');

  await act(() => client.invalidateQueries({ queryKey: ['catalog'], refetchType: 'none' }));
  await waitFor(() => expect(result.current.isStale).toBe(true));
  await act(() => focus());
  await waitFor(() => expect(result.current.fetchStatus).toBe('fetching'));
  await act(() => focus());
  expect(request).toHaveBeenCalledTimes(1);
  await act(() => finish('updated'));
  await waitFor(() => expect(result.current.data).toBe('updated'));
  await act(() => focus());
  expect(request).toHaveBeenCalledTimes(1);
  await unmount();
  client.clear();
});

test('navigation cannot bypass a disabled query or duplicate its initial load when enabled', async () => {
  const { client, wrapper } = setup();
  let finish!: (value: string) => void;
  const request = jest.fn(
    () =>
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
  );
  const { result, rerender, unmount } = await renderHook(
    ({ enabled }: { enabled: boolean }) => {
      const query = useQuery({ queryKey: ['wallet'], queryFn: request, enabled });
      useRefreshOnFocus([enabled && query]);
      return query;
    },
    { wrapper, initialProps: { enabled: false } },
  );
  await act(() => focus());
  expect(request).not.toHaveBeenCalled();
  await rerender({ enabled: true });
  await act(() => focus());
  expect(request).toHaveBeenCalledTimes(1);
  await act(() => finish('balance'));
  await waitFor(() => expect(result.current.data).toBe('balance'));
  await unmount();
  client.clear();
});
