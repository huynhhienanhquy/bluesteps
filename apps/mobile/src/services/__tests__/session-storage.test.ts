import * as SecureStore from 'expo-secure-store';
import { createSessionTransport } from '../session-storage';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'when-unlocked-this-device',
}));

const pair = {
  accessToken: 'unit-access',
  refreshToken: 'unit-refresh',
  sessionId: 'unit-session',
  expiresIn: 900,
  tokenType: 'Bearer' as const,
};

beforeEach(() => jest.clearAllMocks());

test('native session credentials go only to the device-bound secure store', async () => {
  const transport = createSessionTransport('https://api.example');
  await transport.tokens.set(pair);
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
    'bluesteps.session.v1',
    JSON.stringify({ baseUrl: 'https://api.example', session: pair }),
    { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY },
  );
});

test('rehydration rejects credentials belonging to a different API', async () => {
  jest
    .mocked(SecureStore.getItemAsync)
    .mockResolvedValue(JSON.stringify({ baseUrl: 'https://other.example', session: pair }));
  expect(await createSessionTransport('https://api.example').tokens.get()).toBeNull();
});

test('corrupt storage is removed instead of creating a signed-in state', async () => {
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue('{broken');
  expect(await createSessionTransport('https://api.example').tokens.get()).toBeNull();
  expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('bluesteps.session.v1');
});

test('logout storage clear deletes the secure credential', async () => {
  await createSessionTransport('https://api.example').tokens.clear();
  expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('bluesteps.session.v1');
});
