import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import { useNavigationLocation } from '../navigation-location';
import { useEffect as mockEffect } from 'react';
jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => {
    mockEffect(effect, [effect]);
  },
}));
jest.mock('expo-location', () => ({
  Accuracy: { High: 4 },
  requestForegroundPermissionsAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));
let change: (state: AppStateStatus) => void;
const remove = jest.fn(),
  removeListener = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(AppState, 'currentState', {
    value: 'active',
    configurable: true,
    writable: true,
  });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, handler) => {
    change = handler;
    return { remove: removeListener };
  });
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({ granted: true } as Awaited<
      ReturnType<typeof Location.requestForegroundPermissionsAsync>
    >);
  jest.mocked(Location.watchPositionAsync).mockResolvedValue({ remove });
});
afterEach(() => jest.restoreAllMocks());
test('only an enabled navigation screen watches GPS and background or leaving removes the subscription', async () => {
  const { rerender, unmount } = await renderHook<
    ReturnType<typeof useNavigationLocation>,
    { enabled: boolean }
  >(({ enabled }) => useNavigationLocation(enabled), {
    initialProps: { enabled: false },
  });
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  await rerender({ enabled: true });
  await waitFor(() => expect(Location.watchPositionAsync).toHaveBeenCalledTimes(1));
  await act(() => change('background'));
  expect(remove).toHaveBeenCalledTimes(1);
  await act(() => change('active'));
  await waitFor(() => expect(Location.watchPositionAsync).toHaveBeenCalledTimes(2));
  await unmount();
  expect(remove).toHaveBeenCalledTimes(2);
  expect(removeListener).toHaveBeenCalled();
});
test('subscription resolving after leaving is immediately removed and cannot keep tracking', async () => {
  let finish!: (value: Location.LocationSubscription) => void;
  jest.mocked(Location.watchPositionAsync).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { unmount } = await renderHook(() => useNavigationLocation(true));
  await waitFor(() => expect(Location.watchPositionAsync).toHaveBeenCalledTimes(1));
  await unmount();
  await act(async () => finish({ remove }));
  expect(remove).toHaveBeenCalledTimes(1);
});
