const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const { setTimeout: delay } = require('node:timers/promises');
const { startExpoProcess } = require('./expo-process.cjs');

function setup(overrides = {}) {
  const launches = [];
  const spawned = [];
  const retries = [];
  const exits = [];
  let output = '';
  const env = { EXPO_TEST_MARKER: 'kept', EXPO_TOKEN: 'test-only-existing-token' };
  const supervisor = startExpoProcess({
    args: ['expo-cli.js', 'start', '--go', '--tunnel', 'expo'],
    cwd: 'D:/BlueSteps/apps/mobile',
    env,
    retryDelayMs: 1,
    onSpawn: (child) => spawned.push(child),
    onRetry: (retry) => retries.push(retry),
    onExit: (code, signal) => exits.push({ code, signal }),
    stderr: {
      write: (chunk) => {
        output += chunk.toString();
      },
    },
    spawn(command, args, options) {
      const child = new EventEmitter();
      child.stderr = new PassThrough();
      child.exitCode = null;
      child.signalCode = null;
      child.killed = false;
      child.finish = (code, signal = null) => {
        child.exitCode = code;
        child.signalCode = signal;
        child.emit('exit', code, signal);
        child.stderr.end();
        child.emit('close', code, signal);
      };
      launches.push({ child, command, args, options });
      return child;
    },
    ...overrides,
  });
  return { supervisor, launches, spawned, retries, exits, env, output: () => output };
}

test('restarts an initial AggregateError timeout once while preserving tunnel args, environment and terminal input/output', async () => {
  const state = setup();
  state.launches[0].child.stderr.write(
    'AggregateError [ETIMEDOUT]: internalConnectMultiple\nfetch failed\n',
  );
  state.launches[0].child.finish(1);
  await delay(10);
  assert.equal(state.launches.length, 2);
  assert.equal(state.spawned.length, 2);
  assert.equal(state.retries.length, 1);
  assert.deepEqual(state.retries[0], {
    attempt: 1,
    maxRestarts: 1,
    code: 1,
    signal: null,
    codes: ['ETIMEDOUT'],
  });
  for (const launch of state.launches) {
    assert.equal(launch.command, process.execPath);
    assert.deepEqual(launch.args, ['expo-cli.js', 'start', '--go', '--tunnel', 'expo']);
    assert.equal(launch.options.env, state.env);
    assert.equal(launch.options.env.EXPO_OFFLINE, undefined);
    assert.deepEqual(launch.options.stdio, ['inherit', 'inherit', 'pipe']);
    assert.equal(launch.options.windowsHide, true);
  }
  assert.match(state.output(), /AggregateError \[ETIMEDOUT\]/);
  state.supervisor.markReady();
  state.launches[1].child.finish(0);
  assert.deepEqual(state.exits, [{ code: 0, signal: null }]);
});

for (const stderr of [
  'SyntaxError: Unexpected token\nETIMEDOUT was a previous optional check\n',
  'Unable to resolve module missing-package\n',
  'AggregateError: invalid project configuration\n',
  'Unauthorized: please log in\n',
  'ETIMEDOUT from a previous attempt\nCERT_HAS_EXPIRED\n',
  'ECONNRESET from a previous attempt\nUNABLE_TO_VERIFY_LEAF_SIGNATURE\n',
  'ENETUNREACH from a previous attempt\nERR_TLS_CERT_ALTNAME_INVALID\n',
]) {
  test(`does not restart fatal or unclassified errors: ${stderr.split('\n')[0]}`, async () => {
    const state = setup();
    state.launches[0].child.stderr.write(stderr);
    state.launches[0].child.finish(1);
    await assert.rejects(state.supervisor.startupFailure, /Expo dừng trước khi sẵn sàng/);
    await delay(5);
    assert.equal(state.launches.length, 1);
    assert.equal(state.retries.length, 0);
  });
}

test('rejects after the single retry is exhausted and reports the network cause', async () => {
  const state = setup();
  state.launches[0].child.stderr.write('ECONNRESET\n');
  state.launches[0].child.finish(1);
  await delay(10);
  state.launches[1].child.stderr.write('UND_ERR_CONNECT_TIMEOUT\n');
  state.launches[1].child.finish(1);
  await assert.rejects(state.supervisor.startupFailure, /UND_ERR_CONNECT_TIMEOUT/);
  await delay(5);
  assert.equal(state.launches.length, 2);
});

test('never retries a network failure after the app is marked ready', async () => {
  const state = setup();
  state.supervisor.markReady();
  state.launches[0].child.stderr.write('ENETUNREACH\n');
  state.launches[0].child.finish(1);
  await delay(5);
  assert.equal(state.launches.length, 1);
  assert.deepEqual(state.exits, [{ code: 1, signal: null }]);
});

test('honors shutdown during the restart delay and cannot mark a dead child ready', async () => {
  let stopping = false;
  const state = setup({ retryDelayMs: 10, isStopping: () => stopping });
  state.launches[0].child.stderr.write('EAI_AGAIN\n');
  state.launches[0].child.finish(1);
  stopping = true;
  await delay(20);
  assert.equal(state.launches.length, 1);
  assert.throws(() => state.supervisor.markReady(), /Expo đã dừng/);
  await assert.rejects(state.supervisor.startupFailure, /Expo đã dừng/);
});

test('only retains a bounded stderr tail when classifying a failure', async () => {
  const state = setup();
  state.launches[0].child.stderr.write('ETIMEDOUT\n');
  state.launches[0].child.stderr.write('x'.repeat(20_000));
  state.launches[0].child.finish(1);
  await assert.rejects(
    state.supervisor.startupFailure,
    (error) => !error.message.includes('ETIMEDOUT'),
  );
  await delay(5);
  assert.equal(state.launches.length, 1);
  assert.equal(state.output().length, 20_010);
});

test('a spawn error rejects immediately and does not also report a child exit', async () => {
  const state = setup();
  const error = Object.assign(new Error('cannot spawn'), { code: 'EACCES' });
  state.launches[0].child.emit('error', error);
  state.launches[0].child.finish(-1);
  await assert.rejects(state.supervisor.startupFailure, error);
  assert.deepEqual(state.exits, []);
  assert.equal(state.retries.length, 0);
});

test('waits for final stderr before classifying an exit and rejects a readiness/exit race', async () => {
  const state = setup();
  const child = state.launches[0].child;
  child.exitCode = 1;
  child.emit('exit', 1, null);
  child.stderr.write('ETIMEDOUT\n');
  child.stderr.end();
  child.emit('close', 1, null);
  assert.equal(state.retries.length, 1);
  assert.throws(() => state.supervisor.markReady(), /Expo đã dừng/);
  await assert.rejects(state.supervisor.startupFailure, /Expo đã dừng/);
  await delay(5);
  assert.equal(state.launches.length, 1);
});

test('cannot mark a child terminated by an external signal ready before stderr closes', async () => {
  const state = setup();
  const child = state.launches[0].child;
  child.signalCode = 'SIGTERM';
  child.emit('exit', null, 'SIGTERM');
  assert.equal(child.exitCode, null);
  assert.equal(child.killed, false);
  assert.throws(() => state.supervisor.markReady(), /Expo đã dừng/);
  await assert.rejects(state.supervisor.startupFailure, /Expo đã dừng/);
  child.stderr.end();
  child.emit('close', null, 'SIGTERM');
  await delay(5);
  assert.equal(state.launches.length, 1);
  assert.equal(state.retries.length, 0);
});

test('supervises real Node subprocess stderr through an exhausted initial connection retry', async () => {
  const children = [];
  const supervisor = startExpoProcess({
    args: ['-e', 'console.error("AggregateError [ETIMEDOUT]"); process.exit(1)'],
    cwd: process.cwd(),
    retryDelayMs: 1,
    onSpawn: (child) => children.push(child),
    onRetry() {},
    stderr: { write() {} },
  });
  await assert.rejects(supervisor.startupFailure, /ETIMEDOUT/);
  assert.equal(children.length, 2);
  assert.ok(children.every((child) => child.pid > 0 && child.exitCode === 1));
});
