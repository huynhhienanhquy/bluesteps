export type EventRegistration = {
  name: string;
  email: string;
  phone: string;
  people: number;
  role: string;
  checkedIn: boolean;
  feedback?: { rating: number; tags: string[]; comment: string };
};
export type EventPlanning = {
  interested: string[];
  collections: { id: string; name: string; eventIds: string[] }[];
  reminders: {
    enabled: boolean;
    eventIds: string[];
    leadHours: number[];
    push: boolean;
    email: boolean;
    soundAndVibration: boolean;
    quietStart: string;
    quietEnd: string;
  };
  registrations: Record<string, EventRegistration>;
};
export const createEventPlanning = (): EventPlanning => ({
  interested: [],
  collections: [
    { id: 'weekend', name: 'Cuối tuần', eventIds: ['workshop'] },
    { id: 'nearby', name: 'Gần nhà', eventIds: [] },
    { id: 'friends', name: 'Đi cùng bạn bè', eventIds: [] },
  ],
  reminders: {
    enabled: false,
    eventIds: [],
    leadHours: [1, 24],
    push: true,
    email: false,
    soundAndVibration: true,
    quietStart: '22:00',
    quietEnd: '07:00',
  },
  registrations: {},
});

export const normalizeEventSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim();

export function reminderValidation(reminders: EventPlanning['reminders']) {
  if (reminders.enabled && (!reminders.eventIds.length || !reminders.leadHours.length))
    return 'Chọn ít nhất một hoạt động và một thời điểm nhắc.';
  if (reminders.enabled && !reminders.push && !reminders.email)
    return 'Chọn ít nhất một kênh nhận lời nhắc.';
  if (
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(reminders.quietStart) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(reminders.quietEnd) ||
    reminders.quietStart === reminders.quietEnd
  )
    return 'Nhập giờ yên lặng theo HH:mm; giờ bắt đầu và kết thúc phải khác nhau.';
  return null;
}

/** A wall-clock preview in Vietnam time, independent of the device timezone or today's date.
 * This only calculates illustrative dates; it never schedules or sends a notification.
 */
export function reminderPreview(
  items: { id: string; title: string; date: string; time: string }[],
  reminders: EventPlanning['reminders'],
) {
  if (!reminders.enabled || reminderValidation(reminders)) return [];
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const quietStart = minutes(reminders.quietStart);
  const quietEnd = minutes(reminders.quietEnd);
  return items
    .filter((event) => reminders.eventIds.includes(event.id))
    .flatMap((event) => {
      const range = eventTimeRange(event);
      const midnight = Date.parse(`${event.date}T00:00:00Z`);
      if (!range || !Number.isFinite(midnight)) return [];
      const begins = midnight + range.start * 60_000;
      return [...new Set(reminders.leadHours)].flatMap((hours) => {
        if (!Number.isInteger(hours) || hours < 1 || hours > 168) return [];
        const original = begins - hours * 3_600_000;
        const date = new Date(original);
        const minute = date.getUTCHours() * 60 + date.getUTCMinutes();
        const inQuiet =
          quietStart < quietEnd
            ? minute >= quietStart && minute < quietEnd
            : minute >= quietStart || minute < quietEnd;
        const delay = inQuiet ? (quietEnd - minute + 1440) % 1440 : 0;
        const at = original + delay * 60_000;
        // A quiet-hours delay must never suggest a reminder after the event starts.
        if (at >= begins) return [];
        return [{ event, hours, original, at, delayed: delay > 0 }];
      });
    })
    .sort((a, b) => a.at - b.at)
    .filter(
      (item, index, all) =>
        all.findIndex((other) => other.event.id === item.event.id && other.at === item.at) ===
        index,
    );
}

/** Time ranges in this fixture are local Vietnam wall-clock times within one day. */
export function eventTimeRange(event: { time: string }) {
  const match = event.time.match(/^(\d{2}):(\d{2})\s*[–-]\s*(\d{2}):(\d{2})/);
  if (!match) return null;
  const [startHour, startMinute, endHour, endMinute] = match.slice(1).map(Number) as [
    number,
    number,
    number,
    number,
  ];
  if (startHour > 23 || endHour > 23 || startMinute > 59 || endMinute > 59) return null;
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  return end > start ? { start, end } : null;
}

export const formatEventMinute = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export function eventConflicts<T extends { id: string; date: string; time: string }>(items: T[]) {
  const conflicts: { first: T; second: T; start: number; end: number; minutes: number }[] = [];
  for (let first = 0; first < items.length; first++) {
    const a = items[first]!;
    const aTime = eventTimeRange(a);
    if (!aTime) continue;
    for (let second = first + 1; second < items.length; second++) {
      const b = items[second]!;
      const bTime = eventTimeRange(b);
      if (a.id === b.id || a.date !== b.date || !bTime) continue;
      const start = Math.max(aTime.start, bTime.start);
      const end = Math.min(aTime.end, bTime.end);
      if (end > start) conflicts.push({ first: a, second: b, start, end, minutes: end - start });
    }
  }
  return conflicts;
}

/** UTC date arithmetic keeps the calendar stable across device timezones. Event times use Vietnam time. */
export function calendarDays(month: string) {
  const [year, monthNumber] = month.split('-').map(Number) as [number, number];
  const offset = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) =>
    new Date(Date.UTC(year, monthNumber - 1, index - offset + 1)).toISOString().slice(0, 10),
  );
}
export function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(year, monthNumber - 1 + delta, 1)).toISOString().slice(0, 7);
}
export function removeSavedEvent(planning: EventPlanning, eventId: string): EventPlanning {
  return {
    ...planning,
    collections: planning.collections.map((collection) => ({
      ...collection,
      eventIds: collection.eventIds.filter((id) => id !== eventId),
    })),
    reminders: {
      ...planning.reminders,
      eventIds: planning.reminders.eventIds.filter((id) => id !== eventId),
    },
  };
}
