import {
  calendarDateKey,
  calendarDays,
  eventOnCalendarDate,
  shiftCalendarDate,
  shiftCalendarMonth,
} from '../../features/live/calendar-model';
import { eventTimeRange } from '../../features/live/event-time';

test('month navigation clamps the selected day and the grid spans complete Monday-first weeks', () => {
  expect(shiftCalendarMonth('2028-01-31', 1)).toBe('2028-02-29');
  expect(shiftCalendarMonth('2026-03-31', -1)).toBe('2026-02-28');
  const days = calendarDays('2026-11-01', 'month');
  expect(days).toHaveLength(42);
  expect(days[0]).toBe('2026-10-26');
  expect(days.at(-1)).toBe('2026-12-06');
  expect(calendarDays('2026-11-01', 'week')).toEqual(
    Array.from({ length: 7 }, (_, index) => shiftCalendarDate('2026-10-26', index)),
  );
});

test('event markers use the account timezone and do not include an exclusive midnight end', () => {
  expect(calendarDateKey('2026-10-31T18:00:00Z', 'Asia/Ho_Chi_Minh')).toBe('2026-11-01');
  const event = { startsAt: '2026-10-31T16:00:00Z', endsAt: '2026-10-31T17:00:00Z' };
  expect(eventOnCalendarDate(event, '2026-10-31', 'Asia/Ho_Chi_Minh')).toBe(true);
  expect(eventOnCalendarDate(event, '2026-11-01', 'Asia/Ho_Chi_Minh')).toBe(false);
  expect(
    eventOnCalendarDate(
      { ...event, endsAt: '2026-10-31T18:00:00Z' },
      '2026-11-01',
      'Asia/Ho_Chi_Minh',
    ),
  ).toBe(true);
});

test('week arithmetic remains a sequence of civil dates across daylight-saving changes', () => {
  expect(calendarDateKey('2026-11-01T05:30:00Z', 'America/New_York')).toBe('2026-11-01');
  expect(calendarDateKey('2026-11-01T06:30:00Z', 'America/New_York')).toBe('2026-11-01');
  expect(shiftCalendarDate('2026-11-01', 1)).toBe('2026-11-02');
});

test('event time ranges preserve the event timezone and show an overnight end date', () => {
  const event = {
    startsAt: '2026-11-03T16:00:00Z',
    endsAt: '2026-11-03T17:30:00Z',
    timezone: 'Asia/Ho_Chi_Minh',
  };
  expect(eventTimeRange(event)).toBe('03/11/2026 • 23:00–04/11/2026 • 00:30');
  expect(eventTimeRange(event, 'UTC')).toBe('03/11/2026 • 16:00–17:30');
});
