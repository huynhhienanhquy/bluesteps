import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

export function useEventPhase(
  event?: { startsAt: string; endsAt: string },
  startsBeforeMinutes = 0,
) {
  const [clock, setClock] = useState(Date.now);
  const now = Date.now();
  const start = event
    ? Date.parse(event.startsAt) - startsBeforeMinutes * 60_000
    : Number.POSITIVE_INFINITY;
  const end = event ? Date.parse(event.endsAt) : Number.POSITIVE_INFINITY;
  useEffect(() => {
    const refresh = () => setClock(Date.now());
    const next = [start, end].filter((value) => value > Date.now());
    const timer = setTimeout(
      refresh,
      Math.min(60_000, ...next.map((value) => Math.max(1, value - Date.now() + 1))),
    );
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearTimeout(timer);
      listener.remove();
    };
  }, [start, end, clock]);
  return { started: start <= now, ended: end <= now };
}
