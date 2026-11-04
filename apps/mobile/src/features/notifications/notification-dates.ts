import { calendarDateKey, shiftCalendarDate } from '../events/calendar-model';

export function notificationDay(value: string, timezone: string) {
  return calendarDateKey(value, timezone);
}

export function notificationDayTitle(day: string, timezone: string) {
  const today = calendarDateKey(new Date(), timezone);
  const prefix =
    day === today ? 'Hôm nay, ' : day === shiftCalendarDate(today, -1) ? 'Hôm qua, ' : '';
  return (
    prefix +
    new Intl.DateTimeFormat('vi-VN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(day + 'T12:00:00Z'))
  );
}

export function notificationTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).format(new Date(value));
}
