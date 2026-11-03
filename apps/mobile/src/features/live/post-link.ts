import * as Linking from 'expo-linking';

export const postLink = (id: string) => Linking.createURL('/discussion', { queryParams: { id } });
export const validPostId = (id?: string | null) =>
  id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;

/** Recognize our links without turning a similar path on another website into an app action. */
export function sharedPostId(text: string): string | null {
  try {
    const url = new URL(text.trim());
    const expected = new URL(postLink(''));
    if (url.username || url.password) return null;
    const sameOrigin =
      url.protocol === expected.protocol &&
      url.host === expected.host &&
      url.pathname === expected.pathname;
    const native =
      url.protocol === 'bluesteps:' &&
      !url.port &&
      ((url.host === 'discussion' && (url.pathname === '' || url.pathname === '/')) ||
        (url.host === '' && url.pathname === '/discussion'));
    if (!sameOrigin && !native) return null;
    const id = url.searchParams.get('id');
    return validPostId(id);
  } catch {
    return null;
  }
}

export function sharedPostContent(text: string): { id: string; caption: string } | null {
  const direct = sharedPostId(text);
  if (direct) return { id: direct, caption: '' };
  for (const match of text.matchAll(/(?:https?:\/\/|bluesteps:\/\/|exps?:\/\/)[^\s<>]+/gi)) {
    const id = sharedPostId(match[0]);
    if (!id) continue;
    return {
      id,
      caption: (text.slice(0, match.index) + text.slice(match.index + match[0].length)).trim(),
    };
  }
  return null;
}
