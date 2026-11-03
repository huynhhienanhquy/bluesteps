const authPages = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/verify-email',
  '/reset-password',
  '/onboarding',
]);
export const isAuthPage = (pathname: string) => authPages.has(pathname.replace(/\/$/, '') || '/');

/** Auth can return to an app page, but never to another site or an auth loop. */
export function safeAuthReturn(value: unknown): string | undefined {
  if (
    typeof value !== 'string' ||
    value.length > 2048 ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\u0000-\u001f]/.test(value)
  )
    return;
  try {
    const url = new URL(value, 'https://bluesteps.invalid');
    const decoded = decodeURIComponent(url.pathname);
    if (
      url.origin !== 'https://bluesteps.invalid' ||
      decoded.startsWith('//') ||
      /[\\\u0000-\u001f]/.test(decoded)
    )
      return;
    if (authPages.has('/' + decoded.split('/')[1])) return;
    return url.pathname + url.search;
  } catch {
    return;
  }
}

export function screenAddress(pathname: string, params: Record<string, unknown>): string {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (name === 'returnTo' || name.startsWith('__EXPO_ROUTER')) continue;
    if (typeof value === 'string') query.append(name, value);
    else if (Array.isArray(value))
      for (const item of value) if (typeof item === 'string') query.append(name, item);
  }
  const encoded = query.toString();
  return pathname + (encoded ? '?' + encoded : '');
}
