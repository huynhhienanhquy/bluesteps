import { rememberNewsSearch } from '../news-events';
import { createNewsSession } from '../news';
test('search history deduplicates Vietnamese accents and caps recent submitted terms without mutating the source', () => {
  const previous = ['tái chế', 'dọn rác', 'sống xanh'];
  expect(rememberNewsSearch(previous, '  TAI   CHE ')).toEqual(['TAI CHE', 'dọn rác', 'sống xanh']);
  expect(rememberNewsSearch(previous, 'pin cũ')).toEqual(['pin cũ', 'tái chế', 'dọn rác']);
  expect(rememberNewsSearch(previous, '  ')).toBe(previous);
  expect(previous).toEqual(['tái chế', 'dọn rác', 'sống xanh']);
});
test('editorial event interests and search drafts start empty in independent sessions', () => {
  const session = createNewsSession();
  session.interestedEvents.push('nhieu-loc');
  session.savedEvents.push('nhieu-loc');
  session.recentSearches.push('rác');
  expect(createNewsSession().interestedEvents).toEqual([]);
  expect(createNewsSession().savedEvents).toEqual([]);
  expect(createNewsSession().recentSearches).toEqual([]);
});
