import { Platform } from 'react-native';
import { getRandomBytesAsync } from 'expo-crypto';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { apiBaseUrl } from './api';
import { readPinStorage, removePinStorage, writePinStorage } from './pin-storage';
export type PinRecord = {
  v: 1;
  salt: string;
  digest: string;
  iterations: number;
  failed: number;
  blockedUntil: number;
};
const iterations = 210_000;
const queues = new Map<string, Promise<unknown>>();
export function pinStorageKey(userId: string) {
  return 'bluesteps.pin.v1.' + bytesToHex(sha256(utf8ToBytes(`${apiBaseUrl()}:${userId}`)));
}
async function serial<T>(userId: string, effect: () => Promise<T>): Promise<T> {
  const key = pinStorageKey(userId),
    prior = queues.get(key) ?? Promise.resolve();
  const next = prior
    .catch(() => {})
    .then(async () => {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.locks)
        return navigator.locks.request(key, effect);
      return effect();
    });
  queues.set(key, next);
  try {
    return await next;
  } finally {
    if (queues.get(key) === next) queues.delete(key);
  }
}
export async function readPin(userId: string): Promise<PinRecord | null> {
  const raw = await readPinStorage(pinStorageKey(userId));
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as PinRecord;
    if (
      value.v !== 1 ||
      !/^[a-f0-9]{32}$/.test(value.salt) ||
      !/^[a-f0-9]{64}$/.test(value.digest) ||
      !Number.isInteger(value.iterations) ||
      value.iterations < 100_000 ||
      value.iterations > 1_000_000 ||
      !Number.isInteger(value.failed) ||
      value.failed < 0 ||
      !Number.isFinite(value.blockedUntil) ||
      value.blockedUntil < 0
    )
      throw new Error();
    return value;
  } catch {
    throw new Error('Không đọc được cấu hình PIN. Đăng nhập lại để đặt PIN mới.');
  }
}
async function derive(pin: string, salt: string, count: number) {
  if (!/^\d{6}$/.test(pin)) throw new Error('Mã PIN cần đúng 6 chữ số.');
  return pbkdf2Async(sha256, utf8ToBytes(pin), hexToBytes(salt), {
    c: count,
    dkLen: 32,
    asyncTick: 8,
  });
}
async function check(userId: string, pin: string) {
  const record = await readPin(userId);
  if (!record) throw new Error('Chưa thiết lập mã PIN trên thiết bị này.');
  const wait = record.blockedUntil - Date.now();
  if (wait > 0) throw new Error(`Nhập sai nhiều lần. Thử lại sau ${Math.ceil(wait / 1000)} giây.`);
  const actual = await derive(pin, record.salt, record.iterations),
    expected = hexToBytes(record.digest);
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= actual[i]! ^ expected[i]!;
  actual.fill(0);
  expected.fill(0);
  if (difference !== 0) {
    const failed = record.failed + 1,
      delay =
        failed >= 5
          ? Math.min(900_000, 30_000 * 2 ** Math.min(5, Math.floor((failed - 5) / 5)))
          : 0;
    await writePinStorage(
      pinStorageKey(userId),
      JSON.stringify({ ...record, failed, blockedUntil: Date.now() + delay }),
    );
    throw new Error(
      delay
        ? `Mã PIN chưa đúng. Thử lại sau ${Math.ceil(delay / 1000)} giây.`
        : 'Mã PIN chưa đúng.',
    );
  }
  const updated = { ...record, failed: 0, blockedUntil: 0 };
  await writePinStorage(pinStorageKey(userId), JSON.stringify(updated));
  return updated;
}
export const verifyPin = (userId: string, pin: string) => serial(userId, () => check(userId, pin));
export function savePin(userId: string, pin: string, current?: string) {
  return serial(userId, async () => {
    if (await readPin(userId)) {
      if (!current) throw new Error('Nhập PIN hiện tại trước khi thay đổi.');
      await check(userId, current);
    }
    const salt = bytesToHex(await getRandomBytesAsync(16)),
      key = await derive(pin, salt, iterations);
    const record: PinRecord = {
      v: 1,
      salt,
      digest: bytesToHex(key),
      iterations,
      failed: 0,
      blockedUntil: 0,
    };
    key.fill(0);
    await writePinStorage(pinStorageKey(userId), JSON.stringify(record));
    return record;
  });
}
export const disablePin = (userId: string, current: string) =>
  serial(userId, async () => {
    await check(userId, current);
    await removePinStorage(pinStorageKey(userId));
  });
// Recovery is called only after locally ending the authenticated session.
export const forgetPinAfterLogout = (userId: string) =>
  serial(userId, () => removePinStorage(pinStorageKey(userId)));
