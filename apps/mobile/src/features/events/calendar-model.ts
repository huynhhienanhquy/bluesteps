import type { Schemas } from '../../services/api';
const dayMilliseconds = 86400000;

export function isCalendarDate(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number(value.slice(0, 4)) < 1
  )
    return false;
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Calendar keys represent local civil dates; their UTC carrier is only used for date arithmetic. */
export function calendarDateKey(value: string | Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function shiftCalendarDate(value: string, days: number) {
  return new Date(new Date(value + 'T12:00:00Z').getTime() + days * dayMilliseconds)
    .toISOString()
    .slice(0, 10);
}
export function shiftCalendarMonth(value: string, months: number) {
  const date = new Date(value + 'T12:00:00Z');
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}
export function calendarDays(value: string, mode: 'month' | 'week') {
  const first = mode === 'month' ? value.slice(0, 7) + '-01' : value;
  const date = new Date(first + 'T12:00:00Z');
  const offset = (date.getUTCDay() + 6) % 7;
  const start = shiftCalendarDate(first, -offset);
  const monthLength = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const count = mode === 'week' ? 7 : Math.ceil((monthLength + offset) / 7) * 7;
  return Array.from({ length: count }, (_, index) => shiftCalendarDate(start, index));
}
export function eventOnCalendarDate(
  event: Pick<Schemas['GreenEvent'], 'startsAt' | 'endsAt'>,
  date: string,
  timezone: string,
) {
  return (
    calendarDateKey(event.startsAt, timezone) <= date &&
    calendarDateKey(new Date(new Date(event.endsAt).getTime() - 1), timezone) >= date
  );
}
