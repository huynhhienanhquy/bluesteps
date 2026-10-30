import {
  calendarDays,
  createEventPlanning,
  normalizeEventSearch,
  removeSavedEvent,
  shiftMonth,
} from '../event-planning';
import { events } from '../fixtures';

test('calendar starts on Monday and handles year boundaries and leap years', () => {
  const october = calendarDays('2026-10');
  expect(october).toHaveLength(42);
  expect(october[0]).toBe('2026-09-28');
  expect(october[27]).toBe('2026-10-25');
  expect(calendarDays('2026-11')[6]).toBe('2026-11-01');
  expect(calendarDays('2028-02')).toContain('2028-02-29');
  expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  expect(events.every((event) => event.date.endsWith(`-${event.day}`))).toBe(true);
});

test('removing a saved event cleans collections and reminders without cancelling attendance or feedback', () => {
  const original = createEventPlanning();
  original.reminders.eventIds = ['workshop'];
  original.registrations.workshop = {
    name: 'Linh Chi',
    email: 'chi@example.com',
    phone: '0901234567',
    people: 2,
    role: 'Hỗ trợ hậu cần',
    checkedIn: true,
    feedback: { rating: 5, tags: ['Tổ chức tốt'], comment: 'Rất vui' },
  };
  const result = removeSavedEvent(original, 'workshop');
  expect(result.collections.every((item) => !item.eventIds.includes('workshop'))).toBe(true);
  expect(result.reminders.eventIds).toEqual([]);
  expect(result.registrations.workshop).toEqual(original.registrations.workshop);
  expect(original.collections[0]!.eventIds).toEqual(['workshop']);
  expect(createEventPlanning().registrations).toEqual({});
});

test('Vietnamese search matches accents, uppercase and locations', () => {
  expect(normalizeEventSearch('  GIỜ HỌC XANH Đà Nẵng  ')).toBe('gio hoc xanh da nang');
});
