// Purpose-bound reset credentials are never put in URLs, logs or browser storage.
let credential: { token: string; email: string; expires: number } | null = null;
export function setResetCredential(token: string, email: string) {
  credential = { token, email, expires: Date.now() + 300_000 };
}
export function getResetCredential(email: string) {
  return credential?.email === email && credential.expires > Date.now() ? credential.token : null;
}
export function clearResetCredential() {
  credential = null;
}
