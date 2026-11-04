import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { useApp } from '../../providers';
import { usePages, useResource } from '../queries';
import { resetSessionCache } from '../query-cache';

jest.mock('../../providers', () => ({ useApp: jest.fn() }));

const request = jest.fn();
const app = { api: { request }, status: 'loading', user: null } as unknown as ReturnType<
  typeof useApp
>;

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 15_000, gcTime: Infinity } },
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useApp).mockReturnValue(app);
  request.mockResolvedValue({ items: [{ id: 'bottle' }], nextCursor: null });
});

test('reference details and paginated items load during session restore and reuse the result after login', async () => {
  const { client, wrapper } = setup();
  const { result, rerender, unmount } = await renderHook(
    () => {
      const guide = useResource('/v1/handbook/categories/recycle');
      const items = usePages('/v1/waste-items?category_key=recycle');
      return { guide, items };
    },
    { wrapper },
  );
  await waitFor(() => {
    expect(result.current.guide.isSuccess).toBe(true);
    expect(result.current.items.isSuccess).toBe(true);
  });
  expect(request).toHaveBeenCalledTimes(2);
  expect(request.mock.calls.every((call) => call[2] === false)).toBe(true);

  jest.mocked(useApp).mockReturnValue({
    ...app,
    status: 'authenticated',
    user: { id: 'alice' },
  } as ReturnType<typeof useApp>);
  await rerender(undefined);
  expect(result.current.guide.isSuccess).toBe(true);
  expect(result.current.items.isSuccess).toBe(true);
  expect(request).toHaveBeenCalledTimes(2);
  await unmount();
  client.clear();
});

test('personal and potentially personalized resources still wait for authentication', async () => {
  const { client, wrapper } = setup();
  const { result, rerender, unmount } = await renderHook(
    () => {
      const wallet = useResource('/v1/me/wallet', true);
      const articles = usePages('/v1/articles');
      return { wallet, articles };
    },
    { wrapper },
  );
  expect(request).not.toHaveBeenCalled();
  jest.mocked(useApp).mockReturnValue({
    ...app,
    status: 'authenticated',
    user: { id: 'alice' },
  } as ReturnType<typeof useApp>);
  await rerender(undefined);
  await waitFor(() => {
    expect(result.current.wallet.isSuccess).toBe(true);
    expect(result.current.articles.isSuccess).toBe(true);
  });
  expect(request).toHaveBeenCalledTimes(2);
  expect(request.mock.calls.every((call) => call[2] === true)).toBe(true);
  await unmount();
  client.clear();
});

test('session loss clears account data while an independent reference request completes', async () => {
  const { client, wrapper } = setup();
  client.setQueryData(['api', 'alice', '/v1/me/wallet'], { balance: 200 });
  client.setQueryData(['api', 'guest', '/v1/articles'], { privateState: true });
  let finish!: (value: unknown) => void;
  request.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { result, rerender, unmount } = await renderHook(
    () => useResource('/v1/waste-items/bottle/guide'),
    { wrapper },
  );
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  const signal = request.mock.calls[0]![1].signal as AbortSignal;
  await resetSessionCache(client);
  expect(signal.aborted).toBe(false);
  expect(client.getQueryData(['api', 'alice', '/v1/me/wallet'])).toBeUndefined();
  expect(client.getQueryData(['api', 'guest', '/v1/articles'])).toBeUndefined();
  jest.mocked(useApp).mockReturnValue({ ...app, status: 'guest' });
  await rerender(undefined);
  finish({ item: { name: 'Chai' } });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual({ item: { name: 'Chai' } });
  expect(request).toHaveBeenCalledTimes(1);
  await unmount();
  client.clear();
});
