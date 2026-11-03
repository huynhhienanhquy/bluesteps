import * as SecureStore from 'expo-secure-store';
import type { AuthSession, TokenStore, createApiClient } from '@bluesteps/api-client';

export type SessionTransport = {
  tokens: TokenStore;
  authAdapter?: Parameters<typeof createApiClient>[0]['authAdapter'];
};
const key = 'bluesteps.session.v1';
export const sessionSignedOutKey = (baseUrl: string) => `bluesteps.signed-out.${baseUrl}`;

export function createSessionTransport(baseUrl: string): SessionTransport {
  return {
    tokens: {
      async get() {
        const raw = await SecureStore.getItemAsync(key);
        if (!raw) return null;
        try {
          const stored = JSON.parse(raw) as { baseUrl: string; session: AuthSession };
          if (
            stored.baseUrl !== baseUrl ||
            !stored.session.refreshToken ||
            !stored.session.accessToken
          )
            return null;
          return stored.session;
        } catch {
          await SecureStore.deleteItemAsync(key);
          return null;
        }
      },
      async set(session) {
        await SecureStore.setItemAsync(key, JSON.stringify({ baseUrl, session }), {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
      },
      async clear() {
        await SecureStore.deleteItemAsync(key);
      },
    },
  };
}
