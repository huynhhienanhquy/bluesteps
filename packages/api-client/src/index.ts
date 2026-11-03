import type { components } from './schema.js';

export type { components, operations, paths } from './schema.js';
type Schemas = components['schemas'];
export type TokenPair = Schemas['TokenPair'];
export type AuthSession = Omit<TokenPair, 'refreshToken'> & { refreshToken?: string };

/** Implement this with native secure storage. This package never persists secrets itself. */
export interface TokenStore {
  get(): Promise<AuthSession | null>;
  set(pair: AuthSession): Promise<void>;
  clear(): Promise<void>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
    public readonly retryable = false,
  ) {
    super(message);
  }
}

export function createApiClient(options: {
  baseUrl: string;
  tokens: TokenStore;
  fetch?: typeof fetch;
  authAdapter?: {
    login(body: Schemas['LoginRequest']): Promise<AuthSession>;
    refresh(current: AuthSession | null): Promise<AuthSession>;
    logout(): Promise<void>;
  };
  onSessionLost?: () => void;
}) {
  const base = options.baseUrl.replace(/\/$/, '');
  if (!/^https?:\/\//.test(base)) throw new Error('An HTTP(S) API URL is required');
  const transport = options.fetch ?? globalThis.fetch;
  let refreshing: Promise<AuthSession> | null = null;
  let generation = 0;
  const sessionLostListeners = new Set<() => void>();
  function reportSessionLost() { options.onSessionLost?.(); for (const listener of sessionLostListeners) listener(); }

  async function parse<T>(response: Response): Promise<T> {
    if (response.status === 204) return undefined as T;
    const body: unknown = await response.json();
    if (!response.ok) {
      const error = (body as { error?: Schemas['ErrorDetail'] }).error;
      throw new ApiError(
        response.status,
        error?.code ?? 'HTTP_ERROR',
        error?.message ?? 'Request failed',
        error?.requestId,
        error?.retryable,
      );
    }
    return body as T;
  }

  async function refresh(): Promise<AuthSession> {
    if (refreshing) return refreshing;
    const snapshot = generation;
    const pending = (async () => {
      const current = await options.tokens.get();
      if (!current && !options.authAdapter) throw new ApiError(401, 'AUTH_REQUIRED', 'Please sign in');
      try {
        const next = options.authAdapter ? await options.authAdapter.refresh(current) : await (async () => {
        const response = await transport(`${base}/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: current?.refreshToken }),
        });
        return parse<TokenPair>(response);
        })();
        if (snapshot !== generation) throw new ApiError(401, 'SESSION_CHANGED', 'Session changed');
        if (current && next.sessionId !== current.sessionId) throw new ApiError(401, 'SESSION_CHANGED', 'Session changed in another window');
        await options.tokens.set(next);
        return next;
      } catch (error) {
        // Do not erase credentials on a transient network failure or provider outage.
        if (snapshot === generation && error instanceof ApiError && error.status === 401) {
          await options.tokens.clear();
          reportSessionLost();
        }
        throw error;
      }
    })();
    refreshing = pending;
    try {
      return await pending;
    } finally {
      if (refreshing === pending) refreshing = null;
    }
  }

  async function fetchResponse(
    path: string,
    init: RequestInit = {},
    authenticated = true,
  ): Promise<Response> {
    if (!path.startsWith('/v1/')) throw new Error('Only /v1 API paths are accepted');
    const requestGeneration = generation;
    async function invalidSession(response: Response): Promise<boolean> {
      if (response.status !== 401) return false;
      try {
        const payload = await response.clone().json() as { error?: { code?: string } };
        return ['AUTH_REQUIRED', 'INVALID_TOKEN', 'SESSION_REVOKED', 'EXPIRED', 'ACCESS_TOKEN_EXPIRED'].includes(payload.error?.code ?? '');
      } catch { return false; }
    }
    const pair = authenticated ? await options.tokens.get() : null;
    const headers = new Headers(init.headers);
    if (init.body) headers.set('Content-Type', 'application/json');
    if (pair) headers.set('Authorization', `Bearer ${pair.accessToken}`);
    let response = await transport(`${base}${path}`, { ...init, headers });
    if (authenticated && requestGeneration !== generation) throw new ApiError(401, 'SESSION_CHANGED', 'Session changed');
    if (await invalidSession(response) && pair && !path.startsWith('/v1/auth/')) {
      // A late 401 may arrive after another request already rotated the pair.
      const current = await options.tokens.get();
      const next = current && current.accessToken !== pair.accessToken ? current : await refresh();
      headers.set('Authorization', `Bearer ${next.accessToken}`);
      response = await transport(`${base}${path}`, { ...init, headers });
    }
    if (authenticated && requestGeneration !== generation) throw new ApiError(401, 'SESSION_CHANGED', 'Session changed');
    if (authenticated && await invalidSession(response)) { await options.tokens.clear(); reportSessionLost(); }
    return response;
  }

  async function request<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
    return parse<T>(await fetchResponse(path, init, authenticated));
  }

  return {
    request,
    async download(path: string, init: RequestInit = {}, authenticated = true): Promise<Blob> {
      const snapshot = generation;
      const response = await fetchResponse(path, init, authenticated);
      if (!response.ok) await parse<never>(response);
      const blob = await response.blob();
      if (authenticated && snapshot !== generation) throw new ApiError(401, 'SESSION_CHANGED', 'Session changed');
      return blob;
    },
    refresh,
    invalidatePendingRequests() { generation++; },
    subscribeSessionLost(listener: () => void) {
      sessionLostListeners.add(listener);
      return () => { sessionLostListeners.delete(listener); };
    },
    async login(body: Schemas['LoginRequest']) {
      const snapshot = ++generation;
      const next = options.authAdapter ? await options.authAdapter.login(body) : await request<TokenPair>(
        '/v1/auth/login',
        { method: 'POST', body: JSON.stringify(body) },
        false,
      );
      if (snapshot !== generation) throw new ApiError(401, 'SESSION_CHANGED', 'Session changed');
      await options.tokens.set(next);
      return next;
    },
    async logout() {
      const snapshot = ++generation;
      try {
        if (options.authAdapter) await options.authAdapter.logout();
        else await request<void>('/v1/auth/logout', { method: 'POST' });
      } finally {
        if (snapshot === generation) await options.tokens.clear();
      }
    },
    me: () => request<Schemas['Profile']>('/v1/me'),
    wallet: () => request<Schemas['Wallet']>('/v1/me/wallet'),
    wasteItems: (signal?: AbortSignal) =>
      request<Schemas['Page_WasteItem_']>('/v1/waste-items', { signal }, false),
    events: (signal?: AbortSignal) =>
      request<Schemas['Page_GreenEvent_']>('/v1/events', { signal }, false),
    articles: (signal?: AbortSignal) =>
      request<Schemas['Page_Article_']>('/v1/articles', { signal }, false),
    sorting: (body: Schemas['ManualSortingRequest'] | Schemas['ScanSortingRequest'], key: string) =>
      request<Schemas['SortingResponse']>('/v1/sorting-actions', {
        method: 'POST',
        headers: { 'Idempotency-Key': key },
        body: JSON.stringify(body),
      }),
  };
}
