export async function readPinStorage(key: string) {
  return localStorage.getItem(key);
}
export async function writePinStorage(key: string, value: string) {
  localStorage.setItem(key, value);
}
export async function removePinStorage(key: string) {
  localStorage.removeItem(key);
}
