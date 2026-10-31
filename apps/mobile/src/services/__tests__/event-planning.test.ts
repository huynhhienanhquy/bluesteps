import {
  calendarDays,
  createEventPlanning,
  normalizeEventSearch,
  removeSavedEvent,
  shiftMonth,
  eventConflicts,
  eventTimeRange,
  reminderPreview,
  reminderValidation,
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

test('reminder channels are independent and enabled reminders require a target, timing and channel', () => {
  const draft = { ...createEventPlanning().reminders, enabled: true };
  expect(reminderValidation(draft)).toMatch(/hoạt động/);
  draft.eventIds = ['a'];
  expect(reminderValidation(draft)).toBeNull();
  draft.push = false;
  expect(reminderValidation(draft)).toMatch(/kênh/);
  draft.email = true;
  expect(reminderValidation(draft)).toBeNull();
  expect(reminderValidation({ ...draft, enabled: false, push: false, email: false })).toBeNull();
  expect(reminderValidation({ ...draft, quietStart: '24:00' })).toMatch(/HH:mm/);
  expect(reminderValidation({ ...draft, quietEnd: draft.quietStart })).toMatch(/khác nhau/);
});

test('reminder preview uses Vietnam wall-clock arithmetic, quiet-hour boundaries and deduplicates delayed reminders', () => {
  const event = { id: 'a', title: 'Mẫu', date: '2026-11-01', time: '08:00 – 10:00' };
  const draft = {
    ...createEventPlanning().reminders,
    enabled: true,
    eventIds: ['a'],
    leadHours: [24, 8, 9, 1],
  };
  const result = reminderPreview([event], draft);
  expect(result.map((item) => new Date(item.at).toISOString())).toEqual([
    '2026-10-31T08:00:00.000Z',
    '2026-11-01T07:00:00.000Z',
  ]);
  expect(result[1]!.delayed).toBe(true);
  expect(reminderPreview([event], { ...draft, enabled: false })).toEqual([]);
  expect(reminderPreview([event], { ...draft, eventIds: [] })).toEqual([]);
  expect(reminderPreview([event], { ...draft, leadHours: [0, 169, 1.5] })).toEqual([]);
  // Quiet hours during the day must not defer a reminder beyond event start.
  expect(
    reminderPreview([event], { ...draft, leadHours: [1], quietStart: '06:00', quietEnd: '09:00' }),
  ).toEqual([]);
  expect(reminderPreview([event], { ...draft, leadHours: [10] })[0]!.delayed).toBe(true);
  expect(
    reminderPreview([{ ...event, time: '07:00 – 08:00' }], { ...draft, leadHours: [1] }),
  ).toEqual([]);
});

test('calendar conflicts use actual overlapping times on the same date and allow back-to-back events', () => {
  const base = { id: 'a', date: '2026-10-25', time: '08:00 – 10:00 · 25/10/2026' };
  const overlap = { ...base, id: 'b', time: '09:00 – 11:00' };
  expect(eventConflicts([base, overlap])).toEqual([
    { first: base, second: overlap, start: 540, end: 600, minutes: 60 },
  ]);
  expect(
    eventConflicts([
      base,
      { ...overlap, time: '10:00 – 11:00' },
      { ...overlap, date: '2026-10-26' },
    ]),
  ).toEqual([]);
  expect(eventTimeRange({ time: '25:00 – 26:00' })).toBeNull();
  expect(eventTimeRange({ time: '09:75 – 11:00' })).toBeNull();
  expect(eventTimeRange({ time: '11:00 – 09:00' })).toBeNull();
  expect(eventTimeRange({ time: 'Chưa có giờ' })).toBeNull();
});
