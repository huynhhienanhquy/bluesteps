import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import {
  Button,
  Card,
  Chip,
  Field,
  IconButton,
  Label,
  Notice,
  Screen,
} from '../../design-system/ui';
import { useApp } from '../../providers';
import { errorMessage, type Schemas } from '../../services/api';
import { useCommand, useResource } from '../../services/queries';
import { useForegroundLocation } from '../../services/foreground-location';
import { useNavigationLocation } from '../../services/navigation-location';
import { CommandError, QueryState, RequireAuth } from './common';
import { PointMap } from './PointMap';
import { remainingRoute, routeProgress } from './route-progress';
import { useOptionalPin } from './PinProvider';
import { handoverMaterials } from './journey-materials';
type Route = Schemas['RouteDetail'];
export const routeModes = {
  walking: 'Đi bộ',
  cycling: 'Xe đạp',
  motorcycling: 'Xe máy',
  driving: 'Ô tô',
};
const km = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);
const minutes = (s: number) => `${Math.max(1, Math.ceil(s / 60))} phút`;

export function DirectionsScreen() {
  const { id, routeId, planFailed, startFailed, materials } = useLocalSearchParams<{
    id?: string;
    routeId?: string;
    planFailed?: string;
    startFailed?: string;
    materials?: string;
  }>();
  const { user } = useApp();
  return (
    <Screen title="Chỉ đường đến điểm thu gom" back>
      <RequireAuth>
        {routeId ? (
          <DirectionsRoute
            key={`${user?.id}:${routeId}`}
            id={routeId}
            planFailed={planFailed === '1'}
            startFailed={startFailed === '1'}
          />
        ) : id ? (
          <PointDirection
            key={`${user?.id}:${id}:${materials ?? ''}`}
            id={id}
            materials={materials}
          />
        ) : (
          <Notice>Chọn điểm thu gom để xem tuyến đường.</Notice>
        )}
      </RequireAuth>
    </Screen>
  );
}
function PointDirection({ id, materials }: { id: string; materials?: string }) {
  const point = useResource<Schemas['CollectionPoint']>(`/v1/collection-points/${id}`),
    command = useCommand<Route>();
  const alive = useRef(false);
  const creating = useRef(false);
  const carried = [...new Set(materials?.split(',').filter(Boolean) ?? [])];
  const accepted = handoverMaterials(point.data?.materials ?? [], carried);
  const { refetch } = point;
  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      void refetch();
      return () => {
        alive.current = false;
      };
    }, [refetch]),
  );
  return (
    <QueryState query={point}>
      {point.data ? (
        <>
          <Label bold>{point.data.name}</Label>
          <Label>{point.data.address}</Label>
          {carried.length ? (
            <>
              <Label>
                Điểm này nhận {accepted.length}/{carried.length} loại rác bạn đã chọn
                {accepted.length ? ` · ${accepted.map((item) => item.name).join(', ')}` : ''}.
              </Label>
              {accepted.length < carried.length ? (
                <Notice tone="warning">
                  Các loại rác còn lại cần điểm tiếp nhận khác. Bạn có thể thêm điểm trong hành
                  trình.
                </Notice>
              ) : null}
            </>
          ) : null}
          {point.data.openNow === false ||
          point.data.capacityState === 'closed' ||
          point.data.capacityState === 'full' ? (
            <Notice tone="warning">
              Điểm này hiện đang đầy hoặc ngoài thời gian tiếp nhận. Kiểm tra lại tình trạng trước
              khi đến.
            </Notice>
          ) : null}
          <CommandError error={command.error} />
          <Button
            title="Lập tuyến đến điểm này"
            pending={command.isPending}
            onPress={() => {
              if (creating.current) return;
              creating.current = true;
              void command
                .mutateAsync({
                  path: '/v1/routes',
                  body: { stopIds: [id], mode: 'walking', materialIds: carried },
                })
                .then((route) => {
                  if (alive.current)
                    router.replace({
                      pathname: '/collection-directions',
                      params: { routeId: route.id },
                    });
                })
                .catch(() => {})
                .finally(() => {
                  creating.current = false;
                });
            }}
          />
        </>
      ) : null}
    </QueryState>
  );
}
function DirectionsRoute({
  id,
  planFailed,
  startFailed,
}: {
  id: string;
  planFailed: boolean;
  startFailed: boolean;
}) {
  const query = useResource<Route>(`/v1/routes/${id}`, true);
  return (
    <QueryState query={query}>
      {query.data ? (
        <>
          {planFailed && !query.data.plan ? (
            <Notice tone="error">
              Đã lưu điểm đến nhưng chưa tính được tuyến. Bạn có thể tính lại bên dưới.
            </Notice>
          ) : null}
          {startFailed && query.data.status === 'draft' ? (
            <Notice tone="error">
              Đã lưu tuyến nhưng chưa bắt đầu chỉ đường. Bạn có thể thử lại bên dưới.
            </Notice>
          ) : null}
          <RoutePlanPanel route={query.data} showEditor />
        </>
      ) : null}
    </QueryState>
  );
}

export function RoutePlanPanel({
  route,
  showEditor = false,
}: {
  route: Route;
  showEditor?: boolean;
}) {
  const { colors } = useApp();
  const { height } = useWindowDimensions();
  const geo = useForegroundLocation(),
    command = useCommand<Route>();
  const [manual, setManual] = useState(false),
    [lat, setLat] = useState(''),
    [lng, setLng] = useState(''),
    [prefer, setPrefer] = useState(route.plan?.preferNoTolls ?? route.preferNoTolls ?? false),
    [optionsOpen, setOptionsOpen] = useState(false),
    [legsOpen, setLegsOpen] = useState(false),
    [error, setError] = useState('');
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const valid =
    lat.trim() !== '' &&
    lng.trim() !== '' &&
    Number.isFinite(Number(lat)) &&
    Math.abs(Number(lat)) <= 90 &&
    Number.isFinite(Number(lng)) &&
    Math.abs(Number(lng)) <= 180;
  async function calculate() {
    setError('');
    const origin = manual
      ? valid
        ? { latitude: Number(lat), longitude: Number(lng) }
        : null
      : await geo.locate();
    if (!origin || !alive.current) return;
    try {
      await command.mutateAsync({
        path: `/v1/routes/${route.id}/plan`,
        body: {
          origin: { latitude: origin.latitude, longitude: origin.longitude },
          preferNoTolls: prefer,
          expectedVersion: route.version,
        },
      });
    } catch {}
  }
  const plan = route.plan;
  const firstStop = route.stops.find((stop) => stop.status !== 'self_reported') ?? route.stops[0];
  const lastStop = route.stops[route.stops.length - 1];
  const canPlan = route.status === 'draft' || route.status === 'active';
  return (
    <View style={{ gap: 14 }}>
      {firstStop ? (
        <View
          style={{ height: Math.max(280, height * 0.46), borderRadius: 20, overflow: 'hidden' }}
        >
          <View style={StyleSheet.absoluteFill}>
            <PointMap
              coordinate={plan?.origin ?? firstStop}
              line={plan?.legs.flatMap((leg) => leg.geometry)}
              controls
            />
          </View>
          <View pointerEvents="box-none" style={{ padding: 14 }}>
            <Card>
              <Label size={12} color={colors.muted}>
                Xuất phát
              </Label>
              <Label bold>{plan ? 'Vị trí xuất phát đã chọn' : 'Chưa chọn vị trí xuất phát'}</Label>
              <Label size={12} color={colors.muted}>
                Điểm đến
              </Label>
              <Label bold>{lastStop?.name ?? firstStop.name}</Label>
              {route.stops.length > 1 ? (
                <Label size={12} color={colors.muted}>
                  {route.stops.length} điểm dừng
                </Label>
              ) : null}
            </Card>
          </View>
        </View>
      ) : null}
      {plan ? (
        <Card>
          <Label bold size={20}>
            {routeModes[route.mode]} · {km(plan.totalDistanceM)} · {minutes(plan.totalDurationS)}
          </Label>
          <Label size={12} color={colors.muted}>
            Ước tính lúc {new Date(plan.computedAt).toLocaleTimeString('vi-VN')} · chưa tính thời
            gian bàn giao
          </Label>
        </Card>
      ) : null}
      {showEditor && route.status === 'draft' ? (
        <Button
          title={route.stops.length > 1 ? 'Sửa hành trình nhiều điểm' : 'Thêm điểm dừng'}
          variant="secondary"
          icon="add"
          disabled={command.isPending || geo.busy}
          onPress={() =>
            router.push({
              pathname: '/collection-replacement',
              params: { id: route.id, fromDirections: '1' },
            })
          }
        />
      ) : null}
      {route.status === 'draft' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(routeModes).map(([mode, label]) => (
            <Chip
              key={mode}
              label={label}
              selected={route.mode === mode}
              disabled={command.isPending}
              onPress={() =>
                command.mutate({
                  path: `/v1/routes/${route.id}`,
                  method: 'PATCH',
                  body: {
                    stopIds: route.stops.map((s) => s.pointId),
                    mode,
                    expectedVersion: route.version,
                  },
                })
              }
            />
          ))}
        </View>
      ) : (
        <Label>{routeModes[route.mode]}</Label>
      )}
      {canPlan && plan ? (
        <Chip
          label={optionsOpen ? 'Thu gọn tùy chọn tuyến' : 'Tùy chọn tuyến'}
          selected={optionsOpen}
          onPress={() => setOptionsOpen((value) => !value)}
        />
      ) : null}
      {canPlan && (!plan || optionsOpen) ? (
        <>
          <Chip
            label="Đổi vị trí xuất phát"
            selected={manual}
            onPress={() => setManual((v) => !v)}
          />
          {manual ? (
            <>
              <Field
                label="Vĩ độ xuất phát"
                value={lat}
                onChangeText={setLat}
                keyboardType="numbers-and-punctuation"
              />
              <Field
                label="Kinh độ xuất phát"
                value={lng}
                onChangeText={setLng}
                keyboardType="numbers-and-punctuation"
              />
            </>
          ) : null}
          <Chip
            label="Ưu tiên tránh đường có phí"
            selected={prefer}
            onPress={() => setPrefer((v) => !v)}
          />
          <Label size={12}>
            Tọa độ xuất phát và điểm dừng được gửi tới dịch vụ Valhalla để tính tuyến. Thời gian là
            ước tính, chưa gồm bàn giao.
          </Label>
          {prefer ? (
            <Label size={12}>Tuyến vẫn có thể qua đường phí nếu không có đường phù hợp khác.</Label>
          ) : null}
          {geo.error ? <Notice tone="error">{geo.error}</Notice> : null}
          <Button
            title={plan ? 'Cập nhật tuyến đường' : 'Tính tuyến đường'}
            pending={command.isPending || geo.busy}
            disabled={(manual && !valid) || !route.stops.some((s) => s.status !== 'self_reported')}
            onPress={() => void calculate()}
          />
        </>
      ) : null}
      <CommandError error={command.error} />
      {plan ? (
        <>
          <Chip
            label={legsOpen ? 'Thu gọn các chặng' : `Xem ${plan.legs.length} chặng`}
            selected={legsOpen}
            onPress={() => setLegsOpen((value) => !value)}
          />
          {legsOpen
            ? plan.legs.map((leg, index) => (
                <Card key={leg.pointId}>
                  <Label bold>
                    {index + 1}. {route.stops.find((s) => s.pointId === leg.pointId)?.name}
                  </Label>
                  <Label>
                    {km(leg.distanceM)} · {minutes(leg.durationS)}
                  </Label>
                  <Label size={12}>
                    Vật liệu:{' '}
                    {route.stops
                      .find((s) => s.pointId === leg.pointId)
                      ?.materials?.map((m) => m.name)
                      .join(', ') || 'Chưa có dữ liệu'}
                  </Label>
                </Card>
              ))
            : null}
          <Button
            title={route.status === 'draft' ? 'Bắt đầu chỉ đường' : 'Tiếp tục chỉ đường'}
            pending={command.isPending}
            disabled={!['draft', 'active'].includes(route.status)}
            onPress={() => {
              void (
                route.status === 'draft'
                  ? command.mutateAsync({ path: `/v1/routes/${route.id}/start` })
                  : Promise.resolve(route)
              )
                .then(() => {
                  if (alive.current)
                    router.push({ pathname: '/collection-navigation', params: { id: route.id } });
                })
                .catch(() => {});
            }}
          />
          <Button
            title="Chia sẻ tuyến đường"
            variant="secondary"
            onPress={() => {
              void Share.share({
                message: `Hành trình thu gom · ${routeModes[route.mode]} · ${km(plan.totalDistanceM)} · ${minutes(plan.totalDurationS)} (ước tính)\n${route.stops.map((s, i) => `${i + 1}. ${s.name} — ${s.address}`).join('\n')}\n${plan.attribution}`,
              }).catch((cause) => setError(errorMessage(cause)));
            }}
          />
          <Label size={10}>{plan.attribution}</Label>
          <Button
            title="Báo lỗi bản đồ OpenStreetMap"
            variant="quiet"
            onPress={() =>
              void Linking.openURL('https://www.openstreetmap.org/fixthemap').catch((cause) =>
                setError(errorMessage(cause)),
              )
            }
          />
        </>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
    </View>
  );
}

export function NavigationScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>(),
    { user } = useApp();
  return (
    <Screen title="Đang chỉ đường" back>
      <RequireAuth>
        {id ? (
          <NavigationBody key={`${user?.id}:${id}`} id={id} />
        ) : (
          <Notice>Chọn hành trình để bắt đầu chỉ đường.</Notice>
        )}
      </RequireAuth>
    </Screen>
  );
}
function NavigationBody({ id }: { id: string }) {
  const { colors } = useApp();
  const { height } = useWindowDimensions();
  const pin = useOptionalPin();
  const appLocked = pin?.locked ?? false;
  const query = useResource<Route>(`/v1/routes/${id}`, true),
    command = useCommand<Route>();
  const arrival = useCommand<Route>();
  const [tracking, setTracking] = useState(false),
    [voice, setVoice] = useState(false),
    [detailsOpen, setDetailsOpen] = useState(false),
    [speechError, setSpeechError] = useState(''),
    [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!tracking || !focused || !foreground || appLocked) return;
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, [tracking, focused, foreground, appLocked]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      setForeground(state === 'active');
      setNow(Date.now());
    });
    return () => listener.remove();
  }, []);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      setNow(Date.now());
      return () => {
        setFocused(false);
        void Speech.stop();
      };
    }, []),
  );
  const location = useNavigationLocation(tracking && !appLocked),
    route = query.data,
    plan = route?.plan,
    leg = plan?.legs[0],
    position = location.position;
  const stopId = leg?.stopId;
  const stop = route?.stops.find((item) => item.id === stopId);
  const currentTime = Math.max(now, pin?.unlockedAt ?? 0);
  const accurate =
    position &&
    Math.abs(currentTime - position.timestamp) < 20000 &&
    (position.coords.accuracy ?? Infinity) <= 50;
  const progress =
    leg && accurate && tracking && focused && foreground && !appLocked
      ? routeProgress(leg.geometry, position.coords)
      : null;
  const offRoute =
    progress && progress.distanceFromRouteM > Math.max(40, (position?.coords.accuracy ?? 20) * 2);
  const remaining = plan && progress && !offRoute ? remainingRoute(plan, progress) : null;
  const step = remaining?.step ?? 0;
  const current = leg?.maneuvers[Math.max(0, step)],
    next = leg?.maneuvers[Math.max(0, step) + 1];
  useEffect(() => {
    if (voice && focused && foreground && current && !offRoute && !appLocked) {
      Speech.speak(current.instruction, {
        language: 'vi-VN',
        onError: () => setSpeechError('Không đọc được chỉ dẫn trên thiết bị này.'),
      });
    }
    return () => {
      void Speech.stop();
    };
  }, [voice, focused, foreground, current, offRoute, appLocked]);
  return (
    <QueryState query={query}>
      {route?.status !== 'active' ? (
        <Notice>Hành trình chưa bắt đầu hoặc đã kết thúc.</Notice>
      ) : plan && leg ? (
        <>
          <View
            style={{ height: Math.max(360, height * 0.57), borderRadius: 20, overflow: 'hidden' }}
          >
            <View style={StyleSheet.absoluteFill}>
              <PointMap coordinate={accurate ? position.coords : plan.origin} line={leg.geometry} />
            </View>
            <View pointerEvents="box-none" style={{ padding: 12, gap: 8 }}>
              <View
                style={{ padding: 16, borderRadius: 18, gap: 6, backgroundColor: colors.brand }}
              >
                <Label bold size={18} color={colors.heroText}>
                  {current?.instruction ?? 'Đi theo tuyến trên bản đồ'}
                </Label>
                {current ? (
                  <Label color={colors.heroText}>
                    {km(remaining?.stepDistanceM ?? current.distanceM)} ·{' '}
                    {minutes(remaining?.stepDurationS ?? current.durationS)}
                  </Label>
                ) : null}
              </View>
              <View
                pointerEvents="box-none"
                style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}
              >
                {next ? (
                  <View
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 14,
                      backgroundColor: colors.surface,
                    }}
                  >
                    <Label size={12}>Sau đó · {next.instruction}</Label>
                  </View>
                ) : (
                  <View style={{ flex: 1 }} />
                )}
                <IconButton
                  name={voice ? 'volume-high' : 'volume-mute'}
                  label={voice ? 'Tắt đọc chỉ dẫn' : 'Bật đọc chỉ dẫn'}
                  selected={voice}
                  onPress={() => {
                    setSpeechError('');
                    setVoice((value) => !value);
                  }}
                />
              </View>
            </View>
          </View>
          {stopId ? (
            <>
              <Button
                title="Tìm điểm thay thế"
                variant="secondary"
                disabled={arrival.isPending}
                onPress={() =>
                  router.push({
                    pathname: '/collection-replacement',
                    params: { id, stopId },
                  })
                }
              />
              <Button
                title="Đã đến nơi"
                pending={arrival.isPending}
                disabled={command.isPending}
                onPress={() => {
                  const openHandover = () =>
                    router.replace({
                      pathname: '/collection-arrival',
                      params: { id, stopId },
                    });
                  if (stop?.status === 'pending') {
                    arrival.mutate(
                      { path: `/v1/routes/${id}/stops/${stopId}/arrive` },
                      { onSuccess: openHandover },
                    );
                  } else {
                    openHandover();
                  }
                }}
              />
              <CommandError error={arrival.error} />
            </>
          ) : null}
          <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
            <IconButton
              name="close"
              label="Thoát chỉ đường"
              onPress={() =>
                router.canGoBack()
                  ? router.back()
                  : router.replace({ pathname: '/collection-directions', params: { routeId: id } })
              }
            />
            <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <Label bold size={22}>
                {minutes(remaining?.durationS ?? plan.totalDurationS)}
              </Label>
              <Label size={12} color={colors.muted}>
                {km(remaining?.distanceM ?? plan.totalDistanceM)}
                {remaining
                  ? ` · ${new Date(currentTime + remaining.durationS * 1000).toLocaleTimeString(
                      'vi-VN',
                      {
                        hour: '2-digit',
                        minute: '2-digit',
                      },
                    )}`
                  : ' · Toàn tuyến'}
              </Label>
            </View>
            <IconButton
              name="list"
              label={detailsOpen ? 'Thu gọn chỉ dẫn' : 'Xem các bước chỉ đường'}
              selected={detailsOpen}
              onPress={() => setDetailsOpen((value) => !value)}
            />
          </Card>
          <Chip
            label="Theo dõi vị trí khi chỉ đường"
            selected={tracking}
            onPress={() => setTracking((value) => !value)}
          />
          {tracking && !accurate ? (
            <Notice>Đang chờ GPS đủ chính xác để theo dõi chặng.</Notice>
          ) : null}
          {location.error ? <Notice tone="error">{location.error}</Notice> : null}
          {speechError ? <Notice tone="error">{speechError}</Notice> : null}
          {offRoute ? (
            <Notice>Bạn có thể đã lệch tuyến. Cập nhật tuyến từ vị trí hiện tại.</Notice>
          ) : null}
          <CommandError error={command.error} />
          {detailsOpen || offRoute ? (
            <Button
              title="Tính lại từ vị trí hiện tại"
              variant="secondary"
              disabled={!accurate || arrival.isPending}
              pending={command.isPending}
              onPress={() => {
                if (position)
                  command.mutate({
                    path: `/v1/routes/${id}/plan`,
                    body: {
                      origin: {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                      },
                      expectedVersion: route.version,
                      preferNoTolls: plan.preferNoTolls,
                    },
                  });
              }}
            />
          ) : null}
          {detailsOpen ? (
            <Card>
              <Label bold>Các bước chỉ đường</Label>
              {leg.maneuvers.map((m, i) => (
                <Label key={`${i}:${m.beginIndex}`} size={13}>
                  {i + 1}. {m.instruction} · {km(m.distanceM)}
                </Label>
              ))}
              <Label size={11} color={colors.muted}>
                Ước tính lúc {new Date(plan.computedAt).toLocaleTimeString('vi-VN')}, chưa tính thời
                gian bàn giao và giao thông trực tiếp.
              </Label>
            </Card>
          ) : null}
          <Label size={10}>{plan.attribution}</Label>
        </>
      ) : (
        <>
          <Notice>
            Tuyến chưa được tính hoặc các điểm dừng đã thay đổi. Hãy cập nhật tuyến trước khi tiếp
            tục.
          </Notice>
          {route ? <RoutePlanPanel route={route} /> : null}
        </>
      )}
    </QueryState>
  );
}
