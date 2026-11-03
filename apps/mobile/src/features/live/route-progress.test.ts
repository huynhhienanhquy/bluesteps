import { distance, remainingRoute, routeProgress } from './route-progress';
import type { Schemas } from '../../services/api';
import { validPick, mapDocument, mapPayload } from './map-document';
test('route progress follows actual road segments and detects a location away from the road', () => {
  const shape = [
    { latitude: 16, longitude: 108 },
    { latitude: 16.001, longitude: 108 },
    { latitude: 16.001, longitude: 108.001 },
  ];
  const halfway = routeProgress(shape, { latitude: 16.0005, longitude: 108 });
  expect(halfway.index).toBe(0);
  expect(halfway.distanceFromRouteM).toBeLessThan(1);
  expect(halfway.alongM).toBeCloseTo(distance(shape[0]!, shape[1]!) / 2, 1);
  const off = routeProgress(shape, { latitude: 16.005, longitude: 108.005 });
  expect(off.distanceFromRouteM).toBeGreaterThan(500);
});
test('map document accepts bounded coordinates and cannot inject a script through the channel', () => {
  expect(validPick({ latitude: 16.07, longitude: 108.22 })).toBe(true);
  for (const point of [
    { latitude: NaN, longitude: 108 },
    { latitude: 16, longitude: 181 },
    { latitude: '16', longitude: 108 },
    null,
  ])
    expect(validPick(point)).toBe(false);
  const html = mapDocument(
    '</script><script>injected()</script>',
    mapPayload({ coordinate: { latitude: 16.07, longitude: 108.22 } }),
  );
  expect(html).not.toContain('const channel="</script>');
  expect(html).toContain('tiles.openfreemap.org/styles/liberty');
});

test('remaining time uses unequal provider maneuver costs, preserves later legs and advances at a turn', () => {
  const geometry = [
    { latitude: 16, longitude: 108 },
    { latitude: 16.001, longitude: 108 },
    { latitude: 16.002, longitude: 108 },
  ];
  const leg: Schemas['RouteLeg'] = {
    pointId: 'a',
    distanceM: 200,
    durationS: 120,
    geometry,
    maneuvers: [
      {
        instruction: 'A',
        originalInstruction: 'A',
        type: 1,
        beginIndex: 0,
        endIndex: 1,
        distanceM: 100,
        durationS: 100,
      },
      {
        instruction: 'B',
        originalInstruction: 'B',
        type: 10,
        beginIndex: 1,
        endIndex: 2,
        distanceM: 100,
        durationS: 20,
      },
      {
        instruction: 'Đến',
        originalInstruction: 'Arrive',
        type: 4,
        beginIndex: 2,
        endIndex: 2,
        distanceM: 0,
        durationS: 0,
      },
    ],
  };
  const plan: Schemas['RoutePlan'] = {
    provider: 'Valhalla',
    attribution: 'test',
    computedAt: '2026-11-03T00:00:00Z',
    origin: geometry[0]!,
    mode: 'walking',
    preferNoTolls: false,
    stopIds: ['a', 'b'],
    totalDistanceM: 500,
    totalDurationS: 420,
    legs: [leg, { ...leg, pointId: 'b', distanceM: 300, durationS: 300 }],
  };
  const half = remainingRoute(
    plan,
    routeProgress(geometry, { latitude: 16.0005, longitude: 108 }),
  )!;
  expect(half.distanceM).toBeCloseTo(450, 1);
  expect(half.durationS).toBeCloseTo(370, 1);
  expect(half.step).toBe(0);
  const turn = remainingRoute(plan, routeProgress(geometry, geometry[1]!))!;
  expect(turn.step).toBe(1);
  expect(turn.durationS).toBeCloseTo(320, 1);
  const arrived = remainingRoute(plan, routeProgress(geometry, geometry[2]!))!;
  expect(arrived.step).toBe(2);
  expect(arrived.distanceM).toBe(300);
  expect(arrived.durationS).toBe(300);
});
