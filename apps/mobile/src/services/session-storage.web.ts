import {
  ApiError,
  type AuthSession,
  type TokenStore,
  type createApiClient,
} from '@bluesteps/api-client';

export type SessionTransport = {
  tokens: TokenStore;
  authAdapter?: Parameters<typeof createApiClient>[0]['authAdapter'];
};
export const sessionSignedOutKey = (baseUrl: string) => `bluesteps.signed-out.${baseUrl}`;

export function createSessionTransport(baseUrl: string): SessionTransport {
  // Refresh tokens stay in HttpOnly cookies. Access tokens exist only in memory.
  let session: AuthSession | null = null;
  const signedOutKey = sessionSignedOutKey(baseUrl);
  const locked = <T>(effect: () => Promise<T>) =>
    typeof navigator !== 'undefined' && navigator.locks
      ? navigator.locks.request('bluesteps.session.refresh', effect)
      : effect();
  async function call(path: string, body?: unknown): Promise<AuthSession> {
    const response = await fetch(`${baseUrl}/v1/auth/web/${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (response.status === 204) return undefined as unknown as AuthSession;
    const result = await response.json();
    if (!response.ok)
      throw new ApiError(
        response.status,
        result.error?.code ?? 'HTTP_ERROR',
        result.error?.message ?? 'Không thể xác thực.',
        result.error?.requestId,
      );
    return result as AuthSession;
  }
  return {
    tokens: {
      get: async () => session,
      set: async (value) => {
        session = value;
      },
      clear: async () => {
        session = null;
      },
    },
    authAdapter: {
      login: (body) =>
        locked(async () => {
          if (localStorage.getItem(signedOutKey)) await call('logout');
          const next = await call('login', body);
          localStorage.removeItem(signedOutKey);
          return next;
        }),
      refresh: () =>
        locked(async () => {
          if (localStorage.getItem(signedOutKey)) {
            await call('logout').catch(() => {});
            throw new ApiError(401, 'AUTH_REQUIRED', 'Vui lòng đăng nhập.');
          }
          return call('refresh');
        }),
      logout: async () => {
        // Non-secret user intent prevents an offline logout from restoring a still-held cookie.
        localStorage.setItem(signedOutKey, '1');
        await locked(() => call('logout'));
      },
    },
  };
}
