import type { ApiClient } from '../../providers';
import { ApiError, type Page, type Schemas } from '../../services/api';

type Item = Schemas['WasteItem'];
export type AssistantGuides = {
  items: Item[];
  guides: Schemas['HandbookGuide'][];
  incomplete: boolean;
};
const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const includesPhrase = (text: string, phrase: string) =>
  !!phrase && ` ${text} `.includes(` ${phrase} `);

export function asksForCollectionPoint(question: string) {
  const text = normalize(question);
  return ['bo o dau', 'bo dau', 'mang di dau', 'diem thu gom', 'noi thu gom', 'thu gom o dau'].some(
    (phrase) => includesPhrase(text, phrase),
  );
}

export function refersToPreviousItem(question: string) {
  const text = normalize(question);
  return ['cai do', 'mon do', 'vat nay', 'vat do', 'cai nay', 'mon nay', 'no'].some((phrase) =>
    includesPhrase(text, phrase),
  );
}
const aliases = [
  { kind: 'plastic', words: ['nhua', 'plastic'] },
  { kind: 'battery', words: ['pin', 'ac quy'] },
  { kind: 'paper', words: ['giay', 'carton'] },
  { kind: 'glass', words: ['thuy tinh'] },
  { kind: 'metal', words: ['kim loai', 'lon nhom'] },
  { kind: 'textile', words: ['vai', 'quan ao'] },
  { kind: 'medical', words: ['rac y te', 'dung cu y te'] },
  { kind: 'bag', words: ['ni long', 'nilon', 'nylon', 'tui nhua'] },
  { kind: 'rubber', words: ['cao su'] },
  { kind: 'ceramic', words: ['gom su', 'do gom', 'do su', 'chen su', 'bat su'] },
] as const;
const categories = [
  { code: 'organic', words: ['huu co'] },
  { code: 'inorganic', words: ['vo co'] },
  { code: 'recycle', words: ['tai che'] },
] as const;

export async function findAssistantGuides(
  api: ApiClient,
  question: string,
  signal: AbortSignal,
): Promise<AssistantGuides> {
  const text = normalize(question);
  const hazardous = includesPhrase(text, 'nguy hai');
  const kinds = aliases
    .filter((entry) => entry.words.some((word) => includesPhrase(text, word)))
    .map((entry) => entry.kind);
  const groups = categories
    .filter((entry) => entry.words.some((word) => includesPhrase(text, word)))
    .map((entry) => entry.code);
  if (
    !groups.length &&
    !kinds.length &&
    !hazardous &&
    ['phan loai rac', 'cach phan loai', 'nhom rac'].some((phrase) => includesPhrase(text, phrase))
  )
    groups.push('organic', 'recycle', 'inorganic');
  async function findItems() {
    const exact: Item[] = [],
      matches: Item[] = [];
    let cursor: string | null = null;
    do {
      const page: Page<Item> = await api.request<Page<Item>>(
        '/v1/waste-items?limit=100' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''),
        { signal },
      );
      for (const item of page.items) {
        if (item.synthetic) continue;
        if (includesPhrase(text, normalize(item.name))) exact.push(item);
        else if (
          (hazardous && item.hazardous) ||
          (item.handbookKind && kinds.some((kind) => kind === item.handbookKind))
        )
          matches.push(item);
      }
      cursor = page.nextCursor;
    } while (cursor && !signal.aborted);
    return (exact.length ? exact.sort((a, b) => b.name.length - a.name.length) : matches).slice(
      0,
      3,
    );
  }
  const paths = [
    ...groups.map((code) => '/v1/handbook/categories/' + code),
    ...kinds.map((kind) => '/v1/handbook/materials/' + kind),
  ];
  const [itemsResult, ...guideResults] = await Promise.allSettled([
    findItems(),
    ...paths.map((path) => api.request<Schemas['HandbookGuide']>(path, { signal })),
  ] as const);
  const items = itemsResult.status === 'fulfilled' ? itemsResult.value : [];
  const guides: Schemas['HandbookGuide'][] = [];
  const errors: unknown[] = itemsResult.status === 'rejected' ? [itemsResult.reason] : [];
  for (const result of guideResults) {
    if (result.status === 'fulfilled') guides.push(result.value);
    else if (!(result.reason instanceof ApiError && result.reason.status === 404))
      errors.push(result.reason);
  }
  if (!items.length && !guides.length && errors.length) throw errors[0];
  return { items, guides, incomplete: errors.length > 0 };
}
