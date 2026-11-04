import type { Schemas } from '../../services/api';

export function eventTimeRange(
  event: Pick<Schemas['GreenEvent'], 'startsAt' | 'endsAt' | 'timezone'>,
  timezone = event.timezone,
) {
  const date = new Intl.DateTimeFormat('vi-VN', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const time = new Intl.DateTimeFormat('vi-VN', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const start = new Date(event.startsAt),
    end = new Date(event.endsAt);
  const sameDay = date.format(start) === date.format(end);
  return `${date.format(start)} • ${time.format(start)}–${sameDay ? '' : date.format(end) + ' • '}${time.format(end)}`;
}
