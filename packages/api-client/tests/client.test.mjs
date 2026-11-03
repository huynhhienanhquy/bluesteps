import assert from 'node:assert/strict';
import test from 'node:test';
import { createApiClient, ApiError } from '../dist/index.js';

function store(initial) {
  let pair = initial;
  return {
    get: async () => pair,
    set: async (value) => {
      pair = value;
    },
    clear: async () => {
      pair = null;
    },
  };
}
const old = {
  accessToken: 'old',
  refreshToken: 'refresh-old',
  tokenType: 'Bearer',
  expiresIn: 900,
  sessionId: 'test',
};

test('parallel unauthorized requests rotate the refresh token once', async () => {
  let rotations = 0;
  const tokens = store(old);
  const next = { ...old, accessToken: 'new', refreshToken: 'refresh-new' };
  const client = createApiClient({
    baseUrl: 'http://localhost:8000',
    tokens,
    fetch: async (url, init) => {
      if (url.endsWith('/auth/refresh')) {
        rotations++;
        await new Promise((resolve) => setTimeout(resolve, 20));
        return Response.json(next);
      }
      const authorization = new Headers(init.headers).get('Authorization');
      return authorization === 'Bearer old'
        ? Response.json({ error: { code: 'EXPIRED' } }, { status: 401 })
        : Response.json({ id: 'me' });
    },
  });
  const results = await Promise.all([client.me(), client.me(), client.me()]);
  assert.equal(rotations, 1);
  assert.equal(results.length, 3);
  assert.deepEqual(await tokens.get(), next);
});

test('refresh network failures preserve the stored pair', async () => {
  const tokens = store(old);
  const client = createApiClient({
    baseUrl: 'http://localhost:8000',
    tokens,
    fetch: async () => {
      throw new TypeError('Network unavailable');
    },
  });
  await assert.rejects(client.refresh(), TypeError);
  assert.deepEqual(await tokens.get(), old);
});

test('refresh reuse rejection clears credentials', async () => {
  const tokens = store(old);
  const client = createApiClient({
    baseUrl: 'http://localhost:8000',
    tokens,
    fetch: async () =>
      Response.json(
        {
          error: {
            code: 'REFRESH_TOKEN_REUSED',
            message: 'Revoked',
            retryable: false,
            requestId: 'r1',
          },
        },
        { status: 401 },
      ),
  });
  await assert.rejects(
    client.refresh(),
    (error) => error instanceof ApiError && error.code === 'REFRESH_TOKEN_REUSED',
  );
  assert.equal(await tokens.get(), null);
});

test('sorting retries preserve the idempotency key and body', async () => {
  const tokens = store(old);
  const attempts = [];
  const client = createApiClient({
    baseUrl: 'http://localhost:8000',
    tokens,
    fetch: async (url, init) => {
      if (url.endsWith('/auth/refresh')) return Response.json({ ...old, accessToken: 'new' });
      attempts.push({ key: new Headers(init.headers).get('Idempotency-Key'), body: init.body });
      return attempts.length === 1
        ? Response.json({ error: { code: 'EXPIRED' } }, { status: 401 })
        : Response.json({ actionId: 'action' });
    },
  });
  await client.sorting({ source: 'manual', itemId: 'item' }, 'operation-1');
  assert.deepEqual(attempts[0], attempts[1]);
});

test('an in-flight refresh cannot restore credentials after logout', async () => {
  const tokens = store(old);
  let completeRefresh;
  let started;
  const ready = new Promise((resolve) => {
    started = resolve;
  });
  const client = createApiClient({
    baseUrl: 'http://localhost:8000',
    tokens,
    fetch: async (url) => {
      if (url.endsWith('/auth/refresh')) {
        started();
        return new Promise((resolve) => {
          completeRefresh = resolve;
        });
      }
      return new Response(null, { status: 204 });
    },
  });
  const pending = client.refresh();
  await ready;
  await client.logout();
  completeRefresh(Response.json({ ...old, accessToken: 'new' }));
  await assert.rejects(
    pending,
    (error) => error instanceof ApiError && error.code === 'SESSION_CHANGED',
  );
  assert.equal(await tokens.get(), null);
});

test('wrong current password is a command error, not a revoked session', async () => {
  const tokens = store(old);
  let calls = 0;
  let lost = false;
  const client = createApiClient({ baseUrl: 'http://localhost:8000', tokens,
    onSessionLost: () => { lost = true; },
    fetch: async () => { calls++; return Response.json({ error: { code: 'INVALID_CREDENTIALS', message: 'Wrong password' } }, { status: 401 }); },
  });
  await assert.rejects(client.request('/v1/me/password', { method: 'POST', body: '{}' }), error => error.code === 'INVALID_CREDENTIALS');
  assert.equal(calls, 1);
  assert.equal(lost, false);
  assert.deepEqual(await tokens.get(), old);
});

test('late reads from the old account cannot populate the new account cache', async () => {
  const tokens=store(old);
  let release;
  let started;
  const ready=new Promise(resolve=>{started=resolve;});
  const next={...old,accessToken:'new-account',refreshToken:'new-refresh'};
  let lost=false;
  const client=createApiClient({baseUrl:'http://localhost:8000',tokens,onSessionLost:()=>{lost=true;},
    fetch:async url=>{
      if(url.endsWith('/auth/login'))return Response.json(next);
      started();
      return new Promise(resolve=>{release=resolve;});
    },
  });
  const pending=client.me();
  await ready;
  await client.login({email:'new@example.com',password:'unit-password'});
  release(Response.json({id:'old-account'}));
  await assert.rejects(pending,error=>error.code==='SESSION_CHANGED');
  assert.equal(lost,false);
  assert.deepEqual(await tokens.get(),next);
});

test('a cookie changed by another tab cannot refresh the previous account in place', async () => {
  const tokens=store(old);
  let lost=false;
  const client=createApiClient({baseUrl:'http://localhost:8000',tokens,onSessionLost:()=>{lost=true;},
    authAdapter:{login:async()=>old,logout:async()=>{},refresh:async()=>({...old,sessionId:'other-session'})},
  });
  await assert.rejects(client.refresh(),error=>error.code==='SESSION_CHANGED');
  assert.equal(await tokens.get(),null);
  assert.equal(lost,true);
});

test('private binary downloads refresh credentials and preserve actual bytes', async () => {
  const tokens = store(old);
  let rotations = 0;
  const client = createApiClient({baseUrl:'http://localhost:8000',tokens,fetch:async(url,init)=>{
    if (url.endsWith('/auth/refresh')) { rotations++; return Response.json({...old,accessToken:'new'}); }
    if (init.headers.get('Authorization') === 'Bearer old') return Response.json({error:{code:'ACCESS_TOKEN_EXPIRED'}},{status:401});
    assert.equal(init.headers.get('Authorization'),'Bearer new');
    return new Response(new Uint8Array([0,1,255]),{headers:{'Content-Type':'image/png'}});
  }});
  const blob = await client.download('/v1/media-assets/asset/content');
  assert.equal(rotations,1);
  assert.deepEqual([...new Uint8Array(await blob.arrayBuffer())],[0,1,255]);
});

test('private download failures return API errors instead of an error blob', async () => {
  const client = createApiClient({baseUrl:'http://localhost:8000',tokens:store(old),fetch:async()=>Response.json({error:{code:'NOT_FOUND',message:'No access'}},{status:404})});
  await assert.rejects(client.download('/v1/media-assets/asset/content'),error=>error.code==='NOT_FOUND');
});

test('an account switch while binary data is arriving discards the old download', async () => {
  let bodyReady, finishBody;
  const ready = new Promise(resolve => { bodyReady = resolve; });
  const body = new Promise(resolve => { finishBody = resolve; });
  const response = new Response();
  response.blob = async () => {
    bodyReady();
    await body;
    return new Blob([new Uint8Array([1,2,3])]);
  };
  const client = createApiClient({baseUrl:'http://localhost:8000',tokens:store(old),fetch:async()=>response});
  const pending = client.download('/v1/media-assets/asset/content');
  await ready;
  client.invalidatePendingRequests();
  finishBody();
  await assert.rejects(pending,error=>error.code==='SESSION_CHANGED');
});
