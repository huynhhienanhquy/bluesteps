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
  collections: { id: string; name: string; eventIds: string[] }[];
  reminders: {
    enabled: boolean;
    eventIds: string[];
    leadHours: number[];
    channel: 'push' | 'email';
    quietStart: string;
    quietEnd: string;
  };
  registrations: Record<string, EventRegistration>;
};
export const createEventPlanning = (): EventPlanning => ({
  collections: [
    { id: 'weekend', name: 'Cuối tuần', eventIds: ['workshop'] },
    { id: 'nearby', name: 'Gần nhà', eventIds: [] },
    { id: 'friends', name: 'Đi cùng bạn bè', eventIds: [] },
  ],
  reminders: {
    enabled: false,
    eventIds: [],
    leadHours: [1, 24],
    channel: 'push',
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
