import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useApp } from '../../providers';
import { useForegroundLocation } from '../foreground-location';
jest.mock('../../providers', () => ({ useApp: jest.fn() }));
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useApp).mockReturnValue({ user: { id: 'alice' } } as ReturnType<typeof useApp>);
});
test('location is not requested on mount and permission denial never fabricates coordinates', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({ granted: false } as Awaited<
      ReturnType<typeof Location.requestForegroundPermissionsAsync>
    >);
  const { result, unmount } = await renderHook(() => useForegroundLocation(), { wrapper });
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  await act(async () => {
    await result.current.locate();
  });
  expect(result.current.location).toBeUndefined();
  expect(result.current.error).toContain('Chưa có quyền vị trí');
  expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  await unmount();
  client.clear();
});
test('a GPS response after account switching cannot resurrect old personal cache', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  let finish!: (value: Location.LocationObject) => void;
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({ granted: true } as Awaited<
      ReturnType<typeof Location.requestForegroundPermissionsAsync>
    >);
  jest.mocked(Location.getCurrentPositionAsync).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { result, rerender, unmount } = await renderHook(() => useForegroundLocation(), {
    wrapper,
  });
  let pending!: ReturnType<typeof result.current.locate>;
  await act(async () => {
    pending = result.current.locate();
    await Promise.resolve();
  });
  jest.mocked(useApp).mockReturnValue({ user: { id: 'bob' } } as ReturnType<typeof useApp>);
  await rerender({});
  await act(async () => {
    finish({
      coords: {
        latitude: 16,
        longitude: 108,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: 1,
    });
    await pending;
  });
  expect(client.getQueryData(['foreground-location', 'alice'])).toBeUndefined();
  expect(result.current.location).toBeUndefined();
  expect(result.current.busy).toBe(false);
  await unmount();
  client.clear();
});
