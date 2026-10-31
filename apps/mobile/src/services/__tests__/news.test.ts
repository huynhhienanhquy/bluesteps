import { articles } from '../fixtures';
import {
  appendArticleComment,
  articleMetadata,
  createNewsSession,
  filterNews,
  newsTopics,
  removeArticleComment,
} from '../news';

test('article metadata and discussion seeds reference actual articles and topics', () => {
  const seed = createNewsSession();
  for (const article of articles) {
    expect(articleMetadata[article.id]).toBeDefined();
    expect(Number.isFinite(Date.parse(articleMetadata[article.id]!.date))).toBe(true);
    expect(newsTopics.some((topic) => topic.id === article.tag)).toBe(true);
  }
  expect(
    seed.comments.every((comment) => articles.some((article) => article.id === comment.articleId)),
  ).toBe(true);
  seed.saved.push('recycle');
  seed.comments[0]!.text = 'changed';
  expect(createNewsSession().saved).toEqual([]);
  expect(createNewsSession().comments[0]!.text).not.toBe('changed');
});

test('only an owned comment in the current article can be deleted, preserving replies and other articles', () => {
  const parent = appendArticleComment(createNewsSession(), 'small-steps', 'My parent');
  const parentId = parent.comments.at(-1)!.id;
  const reply = appendArticleComment(parent, 'small-steps', 'Keep reply', parentId);
  const replyId = reply.comments.at(-1)!.id;
  const session = appendArticleComment(reply, 'recycle', 'Other article');
  session.likedComments = [1, parentId, replyId];
  expect(removeArticleComment(session, 'small-steps', 1)).toBe(session);
  expect(removeArticleComment(session, 'small-steps', session.comments.at(-1)!.id)).toBe(session);
  const removed = removeArticleComment(session, 'small-steps', parentId);
  expect(removed.comments.some((comment) => comment.id === parentId)).toBe(false);
  expect(removed.comments.find((comment) => comment.id === replyId)).toEqual(
    expect.objectContaining({ text: 'Keep reply', replyTo: undefined }),
  );
  expect(removed.comments.at(-1)).toEqual(session.comments.at(-1));
  expect(removed.likedComments).toEqual([1, replyId]);
  expect(session.comments.find((comment) => comment.id === replyId)!.replyTo).toBe(parentId);
});

test('news search removes Vietnamese accents and combines topic, saved and sort filters', () => {
  const search = (term: string, topic = 'Tất cả') =>
    filterNews(articles, { search: term, topic, sort: 'newest' });
  expect(search('PIN CU').map((article) => article.id)).toEqual(['battery-care']);
  expect(search('yeu cau cua diem tiep nhan').map((article) => article.id)).toContain('recycle');
  expect(search('', 'Cộng đồng').map((article) => article.id)).toEqual([
    'community-day',
    'green-sunday',
    'saigon-cleanup',
    'tourism-cleanup',
    'youth-ideas',
  ]);
  expect(search('', 'Sự kiện')).toEqual(search('', 'Cộng đồng'));
  expect(search('', 'Tái chế')).toEqual(search('', 'Phân loại'));
  expect(search('', 'missing')).toEqual([]);
  expect(
    filterNews(articles, { search: '', topic: 'Tất cả', sort: 'newest', savedIds: [] }),
  ).toEqual([]);
  expect(
    filterNews(articles, {
      search: '',
      topic: 'Tất cả',
      sort: 'popular',
      savedIds: ['recycle', 'community-day'],
    }).map((article) => article.id),
  ).toEqual(['community-day', 'recycle']);
  expect(search('')[0]!.id).toBe('daily-waste');
});

test('saved order is explicit and content fixtures have stable IDs with separate design stories', () => {
  expect(articles).toHaveLength(13);
  expect(new Set(articles.map((article) => article.id)).size).toBe(articles.length);
  expect(
    filterNews(articles, {
      search: '',
      topic: 'Tất cả',
      sort: 'saved',
      savedIds: ['ha-long', 'daily-waste', 'green-sunday'],
    }).map((article) => article.id),
  ).toEqual(['ha-long', 'daily-waste', 'green-sunday']);
});

test('comments validate content and reply ownership, isolate articles and preserve rapid-send IDs', () => {
  const seed = createNewsSession();
  expect(appendArticleComment(seed, 'missing', 'Hello')).toBe(seed);
  expect(appendArticleComment(seed, 'recycle', '   ')).toBe(seed);
  expect(appendArticleComment(seed, 'recycle', 'a'.repeat(501))).toBe(seed);
  expect(appendArticleComment(seed, 'recycle', 'Reply to another article', 1)).toBe(seed);
  const once = appendArticleComment(seed, 'small-steps', '  Một ý tưởng mới  ', 1);
  const twice = appendArticleComment(once, 'recycle', 'Thêm ý tưởng');
  expect(twice.comments.at(-2)?.text).toBe('Một ý tưởng mới');
  expect(twice.comments.at(-2)?.replyTo).toBe(1);
  expect(twice.comments.at(-1)?.articleId).toBe('recycle');
  expect(new Set(twice.comments.map((comment) => comment.id)).size).toBe(twice.comments.length);
  expect(seed.comments).toHaveLength(2);
});
