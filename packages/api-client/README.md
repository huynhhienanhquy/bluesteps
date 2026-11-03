# BlueSteps API client

Types sinh từ FastAPI runtime OpenAPI; không sửa `src/schema.ts` bằng tay.

```powershell
pnpm api:types
pnpm --filter @bluesteps/api-client typecheck
pnpm --filter @bluesteps/api-client test
```

```ts
import { createApiClient, type TokenStore } from '@bluesteps/api-client';

// Supply a native secure-storage implementation, plus account-switch cache cleanup.
const api = createApiClient({ baseUrl: 'https://your-api.example', tokens: secureTokenStore });
const page = await api.wasteItems();
```

`secureTokenStore` implements `TokenStore.get/set/clear`; the package supplies no persistence adapter. On a physical phone use an API address reachable from that phone; the development server binds loopback by default. HTTP is for local development; use HTTPS outside it. Keep the same idempotency key and request body when retrying the same sorting/post/route operation.

`request<T>` exposes the other endpoints; generated `operations`, `paths` and `components` provide their schemas. The package has typed helpers for login/logout/profile/wallet/catalog/sorting, single-flight token refresh, and explicit `ApiError` codes. No automatic network retry, no generated business policy, no Supabase credentials.

The mobile app supplies `createSessionTransport`: native uses Expo SecureStore; web uses `/v1/auth/web/*` and an HttpOnly refresh cookie, with access credentials only in memory. Web authentication operations are serialized with Web Locks when supported. Never persist either credential in browser storage.

`authAdapter` supports cookie-based login/refresh/logout without exposing a refresh token. `subscribeSessionLost` lets the app purge user state and query caches. The request generation guard rejects late responses after account changes, and refresh rejects a different session ID. Invalid command credentials (for example an incorrect current password) do not silently sign out a valid session.
