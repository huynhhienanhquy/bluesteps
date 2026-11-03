import * as FileSystem from 'expo-file-system/legacy';
import { randomUUID } from 'expo-crypto';
export type AvatarSource = { uri: string; file?: Blob; mime?: string };
function directory() {
  if (!FileSystem.documentDirectory) throw new Error('Không mở được bộ nhớ hồ sơ trên thiết bị.');
  return FileSystem.documentDirectory + 'bluesteps-profiles/';
}
async function prepare() {
  const dir = directory();
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  return dir;
}
export async function readLocalProfile(key: string) {
  const path = directory() + key + '.json';
  const info = await FileSystem.getInfoAsync(path);
  return info.exists ? FileSystem.readAsStringAsync(path) : null;
}
export async function writeLocalProfile(key: string, value: string) {
  const dir = await prepare();
  await FileSystem.writeAsStringAsync(dir + key + '.json', value);
}
export async function removeLocalProfile(key: string) {
  await FileSystem.deleteAsync(directory() + key + '.json', { idempotent: true });
}
export async function persistLocalAvatar(key: string, source: AvatarSource) {
  const info = await FileSystem.getInfoAsync(source.uri);
  if (!info.exists || info.isDirectory || info.size > 20 * 1024 * 1024)
    throw new Error('Chọn ảnh đọc được và nhỏ hơn 20 MB.');
  const dir = await prepare(),
    uri = dir + key + '-' + randomUUID() + (source.mime === 'image/png' ? '.png' : '.jpg');
  await FileSystem.copyAsync({ from: source.uri, to: uri });
  return uri;
}
export function isLocalAvatar(key: string, uri: string) {
  return uri.startsWith(directory() + key + '-') && !uri.slice(directory().length).includes('/');
}
export async function releaseLocalAvatar(key: string, uri: string | null | undefined) {
  if (uri && isLocalAvatar(key, uri)) await FileSystem.deleteAsync(uri, { idempotent: true });
}
