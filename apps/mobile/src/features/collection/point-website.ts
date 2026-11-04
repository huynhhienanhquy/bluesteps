export function pointWebsite(value?: string | null): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (
      (url.protocol !== 'http:' && url.protocol !== 'https:') ||
      !url.hostname ||
      url.username ||
      url.password ||
      url.href.length > 2048
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
