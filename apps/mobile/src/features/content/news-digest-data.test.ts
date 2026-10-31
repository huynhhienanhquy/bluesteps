import {
  calendarExamples,
  briefExamples,
  digestDateLabel,
  selectNewsEvents,
} from './news-digest-data';
import { events, articles } from '../../services/fixtures';

test('calendar examples stay separate from real demo event IDs and filtering is chronological', () => {
  expect(calendarExamples.every((item) => !events.some((event) => event.id === item.id))).toBe(
    true,
  );
  expect(
    briefExamples.every((item) => articles.some((article) => article.id === item.relatedArticle)),
  ).toBe(true);
  expect(
    selectNewsEvents([...calendarExamples].reverse(), '2026-11', '', 'Tất cả').map(
      (item) => item.id,
    ),
  ).toEqual(calendarExamples.map((item) => item.id));
  expect(selectNewsEvents(calendarExamples, '2026-12', '', 'Tất cả')).toEqual([]);
  expect(selectNewsEvents(calendarExamples, '2026-11', '2026-11-08', 'Workshop')).toEqual([
    calendarExamples[1],
  ]);
  expect(selectNewsEvents(calendarExamples, '2026-11', '2026-11-08', 'Thu gom')).toEqual([]);
});

test('digest date labels reject invalid dates and use UTC weekday/year across boundaries', () => {
  expect(digestDateLabel('2026-10-29')).toEqual({
    day: 'THỨ NĂM',
    label: '29 tháng 10',
    year: 2026,
  });
  expect(digestDateLabel('2028-02-29')?.label).toBe('29 tháng 2');
  expect(digestDateLabel('2026-02-29')).toBeNull();
  expect(digestDateLabel('2026-13-01')).toBeNull();
  expect(digestDateLabel('not-a-date')).toBeNull();
  expect(digestDateLabel('2027-01-01')).toEqual({ day: 'THỨ SÁU', label: '1 tháng 1', year: 2027 });
});
