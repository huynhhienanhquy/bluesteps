import type { MapCoordinate } from './map-coordinate';
import type { Schemas } from '../../services/api';
const R = 6371000;
export function distance(a: MapCoordinate, b: MapCoordinate) {
  const lat = ((b.latitude - a.latitude) * Math.PI) / 180,
    lng = ((b.longitude - a.longitude) * Math.PI) / 180;
  return (
    2 *
    R *
    Math.asin(
      Math.min(
        1,
        Math.sqrt(
          Math.sin(lat / 2) ** 2 +
            Math.cos((a.latitude * Math.PI) / 180) *
              Math.cos((b.latitude * Math.PI) / 180) *
              Math.sin(lng / 2) ** 2,
        ),
      ),
    )
  );
}
export function routeProgress(shape: MapCoordinate[], position: MapCoordinate) {
  const offsetsM = [0];
  let best = Infinity,
    along = 0,
    total = 0,
    bestIndex = 0;
  for (let i = 0; i < shape.length - 1; i++) {
    const a = shape[i]!,
      b = shape[i + 1]!,
      scale = Math.cos((position.latitude * Math.PI) / 180),
      ax = (((a.longitude - position.longitude) * Math.PI) / 180) * R * scale,
      ay = (((a.latitude - position.latitude) * Math.PI) / 180) * R,
      bx = (((b.longitude - position.longitude) * Math.PI) / 180) * R * scale,
      by = (((b.latitude - position.latitude) * Math.PI) / 180) * R,
      dx = bx - ax,
      dy = by - ay,
      len = distance(a, b),
      t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1))),
      d = Math.hypot(ax + t * dx, ay + t * dy);
    if (d < best) {
      best = d;
      along = total + t * len;
      bestIndex = i;
    }
    total += len;
    offsetsM.push(total);
  }
  return { distanceFromRouteM: best, alongM: along, totalM: total, index: bestIndex, offsetsM };
}

/** Interpolate provider maneuver costs along its geometry, never infer a travel speed. */
export function remainingRoute(
  plan: Schemas['RoutePlan'],
  progress: ReturnType<typeof routeProgress>,
) {
  const leg = plan.legs[0];
  if (!leg || !progress.totalM || !Number.isFinite(progress.distanceFromRouteM)) return null;
  const costs = leg.maneuvers.map((m) => {
    const begin = progress.offsetsM[m.beginIndex] ?? 0,
      end = progress.offsetsM[m.endIndex] ?? begin;
    const fraction =
      end > begin
        ? Math.max(0, Math.min(1, (end - progress.alongM) / (end - begin)))
        : progress.alongM < end
          ? 1
          : 0;
    return { distance: m.distanceM * fraction, duration: m.durationS * fraction, end };
  });
  const distanceSum = leg.maneuvers.reduce((n, m) => n + m.distanceM, 0),
    durationSum = leg.maneuvers.reduce((n, m) => n + m.durationS, 0),
    geometryFraction = Math.max(0, Math.min(1, 1 - progress.alongM / progress.totalM));
  const distanceFraction = distanceSum
      ? costs.reduce((n, m) => n + m.distance, 0) / distanceSum
      : geometryFraction,
    durationFraction = durationSum
      ? costs.reduce((n, m) => n + m.duration, 0) / durationSum
      : geometryFraction;
  const step = costs.findIndex((m) => m.end > progress.alongM + 0.5),
    index = step < 0 ? leg.maneuvers.length - 1 : step;
  return {
    step: index,
    stepDistanceM: costs[index]?.distance ?? 0,
    stepDurationS: costs[index]?.duration ?? 0,
    distanceM:
      leg.distanceM * distanceFraction + plan.legs.slice(1).reduce((n, l) => n + l.distanceM, 0),
    durationS:
      leg.durationS * durationFraction + plan.legs.slice(1).reduce((n, l) => n + l.durationS, 0),
  };
}
