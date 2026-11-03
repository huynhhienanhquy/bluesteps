import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Artwork, StatusSpace } from '../../design-system/DesignScreen';
import { Button, Field, Label, Notice, Typography, Chip } from '../../design-system/ui';
import { useApp } from '../../providers';
import { ApiError, dateLabel, errorMessage, type Page, type Schemas } from '../../services/api';
import { useCommand, usePages, useResource } from '../../services/queries';
import { useForegroundLocation } from '../../services/foreground-location';
import { CommandError, More, QueryState, RequireAuth } from './common';
import { PointMap } from './PointMap';
import { routeModes } from './RouteDirections';
import { StopOrder } from './StopOrder';
import { handoverMaterials } from './journey-materials';
type Route = Schemas['RouteDetail'];
type Point = Pick<
  Schemas['CollectionPoint'],
  'id' | 'name' | 'address' | 'latitude' | 'longitude' | 'hours' | 'materials'
>;
const art = {
  brand: require('../../../assets/figma/534-48774/imgNhDiDin.png'),
  check: require('../../../assets/figma/534-48774/imgCheck.svg'),
  locate: require('../../../assets/figma/534-48774/imgLocateFixed.svg'),
  plus: require('../../../assets/figma/common/journey-plus.svg'),
};
export function JourneyScreen() {
  const { user } = useApp();
  return (
    <RequireAuth>
      <JourneyPlanner key={user?.id} />
    </RequireAuth>
  );
}
export function DraftJourneyEditor() {
  const { id, fromDirections } = useLocalSearchParams<{ id?: string; fromDirections?: string }>(),
    { user } = useApp();
  const query = useResource<Route>(`/v1/routes/${id}`, true, !!id);
  const [reloadKey, setReloadKey] = useState(0);
  const chooseJourney = (
    <PlannerPage dragging={false}>
      <Notice>Chọn hành trình chưa bắt đầu để chỉnh sửa.</Notice>
      <Button title="Chọn hành trình" onPress={() => router.replace('/journey')} />
    </PlannerPage>
  );
  return (
    <RequireAuth>
      {id ? (
        <QueryState query={query}>
          {query.data?.status === 'draft' ? (
            <JourneyPlanner
              key={`${user?.id}:${id}:${reloadKey}`}
              initial={query.data}
              fromDirections={fromDirections === '1'}
              reloading={query.isRefetching}
              onReload={() => {
                void query.refetch().then((result) => {
                  if (result.isSuccess) setReloadKey((value) => value + 1);
                });
              }}
            />
          ) : (
            chooseJourney
          )}
        </QueryState>
      ) : (
        chooseJourney
      )}
    </RequireAuth>
  );
}
function PlannerPage({ children, dragging }: PropsWithChildren<{ dragging: boolean }>) {
  return (
    <Typography.Provider value="inter">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      >
        <StatusSpace />
        <View
          style={{
            paddingHorizontal: 24,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/collection'))}
            style={{ width: 24, height: 36, justifyContent: 'center' }}
          >
            <Artwork
              source={require('../../../assets/figma/common/collection-back.svg')}
              width={24}
            />
          </Pressable>
          <Label heading size={18} bold color="#172B3D" style={{ flex: 1 }}>
            Hành trình thu gom
          </Label>
          <Artwork source={art.brand} width={32} />
        </View>
        <ScrollView
          scrollEnabled={!dragging}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 24, paddingTop: 18, paddingBottom: 40, gap: 20 }}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Typography.Provider>
  );
}
function JourneyPlanner({
  initial,
  fromDirections = false,
  reloading = false,
  onReload,
}: {
  initial?: Route;
  fromDirections?: boolean;
  reloading?: boolean;
  onReload?: () => void;
}) {
  const [baseVersion] = useState(initial?.version);
  const [selected, setSelected] = useState<Point[]>(
      () =>
        initial?.stops.map((s) => ({ ...s, id: s.pointId, materials: s.materials ?? [] })) ?? [],
    ),
    [materials, setMaterials] = useState<string[]>(initial?.materialIds ?? []),
    [mode, setMode] = useState<Route['mode']>(initial?.mode ?? 'motorcycling'),
    [manual, setManual] = useState(false),
    [lat, setLat] = useState(''),
    [lng, setLng] = useState(''),
    [adding, setAdding] = useState(!initial || fromDirections),
    [search, setSearch] = useState(''),
    [dragging, setDragging] = useState(false),
    [showSaved, setShowSaved] = useState(false),
    [error, setError] = useState(''),
    [saving, setSaving] = useState(false),
    [snapshot, setSnapshot] = useState<{ key: string; plan: Schemas['RoutePlan'] } | null>(null);
  const geo = useForegroundLocation(),
    command = useCommand<Route>(),
    preview = useCommand<Schemas['RoutePlan']>();
  const choices = usePages<Schemas['MaterialRef']>('/v1/waste-materials'),
    routes = useResource<Page<Schemas['RouteSummary']>>('/v1/me/routes', true, !initial),
    points = usePages<Schemas['CollectionPoint']>(
      `/v1/collection-points?q=${encodeURIComponent(search)}&match_mode=any${materials.map((id) => `&material_ids=${encodeURIComponent(id)}`).join('')}`,
      false,
      adding,
    );
  const alive = useRef(true);
  const saveInFlight = useRef(false);
  const calculating = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const validManual =
    lat.trim() !== '' &&
    lng.trim() !== '' &&
    Number.isFinite(Number(lat)) &&
    Math.abs(Number(lat)) <= 90 &&
    Number.isFinite(Number(lng)) &&
    Math.abs(Number(lng)) <= 180;
  const origin = manual
    ? validManual
      ? { latitude: Number(lat), longitude: Number(lng) }
      : null
    : geo.location
      ? { latitude: geo.location.latitude, longitude: geo.location.longitude }
      : null;
  const preferNoTolls = initial?.plan?.preferNoTolls ?? initial?.preferNoTolls ?? false;
  const signature = (from: typeof origin) =>
    JSON.stringify({
      stopIds: selected.map((s) => s.id),
      mode,
      origin: from,
      materials,
      preferNoTolls,
    });
  const plan = snapshot?.key === signature(origin) ? snapshot.plan : null;
  const stale =
    !!initial && command.error instanceof ApiError && command.error.code === 'VERSION_CONFLICT';
  const busy = saving || command.isPending || preview.isPending || geo.busy || reloading || stale;
  const materialChoices = choices.data?.pages.flatMap((p) => p.items) ?? [];
  const addablePoints =
    points.data?.pages
      .flatMap((page) => page.items)
      .filter(
        (point) =>
          !selected.some((stop) => stop.id === point.id) &&
          point.capacityState !== 'full' &&
          point.capacityState !== 'closed' &&
          point.openNow !== false,
      ) ?? [];
  const uncovered = materials.filter(
    (id) => !selected.some((s) => s.materials.some((m) => m.id === id)),
  );
  async function locate() {
    if (manual) return origin;
    const p = await geo.locate();
    return p ? { latitude: p.latitude, longitude: p.longitude } : null;
  }
  async function calculate() {
    if (
      saveInFlight.current ||
      calculating.current ||
      busy ||
      !selected.length ||
      (manual && !validManual)
    )
      return;
    calculating.current = true;
    setError('');
    try {
      const from = await locate();
      if (!from || !alive.current) return;
      const data = await preview.mutateAsync({
        path: '/v1/routes/preview',
        body: {
          stopIds: selected.map((s) => s.id),
          mode,
          origin: from,
          materialIds: materials,
          preferNoTolls,
        },
      });
      if (alive.current) setSnapshot({ key: signature(from), plan: data });
    } catch {
      // Keep the previous preview available until a new route is calculated.
    } finally {
      calculating.current = false;
    }
  }
  async function save(start = false) {
    if (
      saveInFlight.current ||
      calculating.current ||
      busy ||
      !selected.length ||
      (start && manual && !validManual)
    )
      return;
    saveInFlight.current = true;
    setSaving(true);
    setError('');
    let saved: Route | undefined;
    try {
      let from: typeof origin = null;
      if (start) {
        const recentLocation = geo.location && Date.now() - geo.location.timestamp <= 120_000;
        from = plan && recentLocation && !manual ? plan.origin : await locate();
      }
      if ((start && !from) || !alive.current) return;
      saved = await command.mutateAsync({
        path: initial ? `/v1/routes/${initial.id}` : '/v1/routes',
        method: initial ? 'PATCH' : 'POST',
        body: {
          stopIds: selected.map((s) => s.id),
          mode,
          materialIds: materials,
          ...(initial ? { expectedVersion: baseVersion } : {}),
        },
      });
      if (!alive.current) return;
      if (start && from) {
        saved = await command.mutateAsync({
          path: `/v1/routes/${saved.id}/plan`,
          body: {
            origin: from,
            expectedVersion: saved.version,
            preferNoTolls,
          },
        });
        if (!alive.current) return;
        await command.mutateAsync({ path: `/v1/routes/${saved.id}/start` });
      }
      if (!alive.current) return;
      if (!start && fromDirections) {
        if (router.canGoBack()) router.back();
        else router.replace({ pathname: '/collection-directions', params: { routeId: saved.id } });
      } else {
        router.replace({
          pathname: start ? '/collection-navigation' : '/collection-route',
          params: { id: saved.id },
        });
      }
    } catch (cause) {
      if (alive.current) {
        setError(errorMessage(cause));
        if (saved) {
          router.replace({
            pathname: '/collection-directions',
            params: {
              routeId: saved.id,
              ...(saved.plan ? { startFailed: '1' } : { planFailed: '1' }),
            },
          });
        }
      }
    } finally {
      saveInFlight.current = false;
      if (alive.current) setSaving(false);
    }
  }
  function add(point: Point) {
    if (selected.some((s) => s.id === point.id)) return;
    if (selected.length >= 10) {
      setError('Mỗi hành trình có tối đa 10 điểm dừng.');
      return;
    }
    setSelected((v) => [...v, point]);
    setAdding(false);
    setError('');
  }
  return (
    <PlannerPage dragging={dragging}>
      <View style={{ gap: 12 }}>
        <Label size={16} weight="semibold" color="#172B3D">
          Hôm nay bạn mang theo gì?
        </Label>
        <QueryState query={choices}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {materialChoices.map((m) => (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                accessibilityLabel={m.name}
                aria-pressed={materials.includes(m.id)}
                accessibilityState={{ selected: materials.includes(m.id), disabled: busy }}
                disabled={busy}
                onPress={() =>
                  setMaterials((v) =>
                    v.includes(m.id) ? v.filter((id) => id !== m.id) : [...v, m.id],
                  )
                }
                style={{
                  flexDirection: 'row',
                  gap: 6,
                  alignItems: 'center',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: materials.includes(m.id) ? '#147CC1' : '#DEEBF3',
                  backgroundColor: materials.includes(m.id) ? '#DCEEF9' : '#FFFFFF',
                }}
              >
                {materials.includes(m.id) ? <Artwork source={art.check} width={14} /> : null}
                <Label size={14} weight="medium" color="#147CC1">
                  {m.name}
                </Label>
              </Pressable>
            ))}
          </View>
          <More query={choices} />
        </QueryState>
      </View>
      <View style={{ height: 170, borderRadius: 16, overflow: 'hidden' }}>
        <PointMap
          coordinate={origin ?? selected[0]}
          line={plan?.legs.flatMap((l) => l.geometry)}
          controls
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: 26,
            alignSelf: 'center',
            backgroundColor: '#FFFFFF',
            padding: 8,
            borderRadius: 10,
          }}
        >
          <Label size={12} color="#075A9C">
            {origin
              ? `Vị trí của bạn${selected.length ? ' → ' + selected.map((_, i) => i + 1).join(' → ') : ''}`
              : 'Chọn vị trí xuất phát để xem tuyến'}
          </Label>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Artwork source={art.locate} width={22} />
        <Label size={14} color="#172B3D" style={{ flex: 1 }}>
          {manual ? 'Khởi hành từ tọa độ đã chọn' : 'Khởi hành từ vị trí hiện tại'}
        </Label>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đổi vị trí xuất phát"
          disabled={busy}
          onPress={() => setManual((v) => !v)}
        >
          <Label size={14} weight="semibold" color="#147CC1">
            Đổi
          </Label>
        </Pressable>
      </View>
      {manual ? (
        <View style={{ gap: 10 }}>
          <Field
            label="Vĩ độ xuất phát"
            value={lat}
            onChangeText={setLat}
            editable={!busy}
            keyboardType="numbers-and-punctuation"
          />
          <Field
            label="Kinh độ xuất phát"
            value={lng}
            onChangeText={setLng}
            editable={!busy}
            keyboardType="numbers-and-punctuation"
          />
        </View>
      ) : null}
      <View style={{ gap: 12 }}>
        <Label size={16} weight="semibold" color="#172B3D">
          Điểm dừng theo thứ tự
        </Label>
        <StopOrder
          items={selected.map((s) => ({
            id: s.id,
            name: s.name,
            detail: plan
              ? `${Math.round(plan.legs.find((l) => l.pointId === s.id)?.distanceM ?? 0)} m theo tuyến · ${s.hours || 'Chưa có giờ tiếp nhận'}`
              : s.hours || 'Chưa có giờ tiếp nhận',
            handover: `Dự kiến bàn giao: ${
              handoverMaterials(s.materials, materials)
                .map((m) => m.name)
                .join(', ') || 'Chưa có vật liệu phù hợp'
            }`,
          }))}
          disabled={busy}
          onDragging={setDragging}
          onRemove={(id) => setSelected((v) => v.filter((s) => s.id !== id))}
          onChange={(ids) => setSelected((v) => ids.map((id) => v.find((s) => s.id === id)!))}
        />
        {!selected.length ? (
          <Label size={13} color="#677C8C">
            Thêm điểm thu gom để lập hành trình.
          </Label>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thêm điểm dừng"
          disabled={busy}
          onPress={() => setAdding((v) => !v)}
          style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}
        >
          <Artwork source={art.plus} width={24} />
          <Label size={14} weight="semibold" color="#147CC1">
            Thêm điểm dừng
          </Label>
          <Label size={12} color="#677C8C" style={{ flex: 1 }}>
            Kéo ⋮⋮ để đổi thứ tự
          </Label>
        </Pressable>
        {adding ? (
          <View style={{ gap: 10 }}>
            <Field label="Tìm điểm dừng" value={search} onChangeText={setSearch} />
            <Label size={12} color="#677C8C">
              {materials.length
                ? 'Điểm nhận ít nhất một vật liệu bạn mang theo.'
                : 'Chọn tối đa 10 điểm.'}
            </Label>
            <QueryState query={points}>
              {!addablePoints.length ? (
                <Notice>Chưa thấy điểm có thể thêm trong kết quả hiện tại.</Notice>
              ) : null}
              {addablePoints.map((p) => (
                <Button
                  key={p.id}
                  title={p.name}
                  variant="quiet"
                  disabled={busy}
                  onPress={() => add(p)}
                />
              ))}
              <More query={points} />
            </QueryState>
          </View>
        ) : null}
        {uncovered.length ? (
          <Notice>
            Chưa có điểm nhận:{' '}
            {uncovered.map((id) => materialChoices.find((m) => m.id === id)?.name ?? id).join(', ')}
            . Thêm điểm phù hợp trước khi mang các vật liệu này đi.
          </Notice>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {Object.entries(routeModes).map(([key, label]) => (
          <Chip
            key={key}
            label={label}
            selected={mode === key}
            disabled={busy}
            onPress={() => setMode(key as Route['mode'])}
          />
        ))}
      </View>
      {plan ? (
        <View
          style={{
            backgroundColor: '#EDF7FC',
            borderRadius: 20,
            padding: 16,
            borderWidth: 1,
            borderColor: '#DEEBF3',
            flexDirection: 'row',
            gap: 16,
          }}
        >
          <View style={{ flex: 1 }}>
            <Label size={16} weight="semibold" color="#172B3D">
              {(plan.totalDistanceM / 1000).toFixed(1)} km
            </Label>
            <Label size={12} color="#677C8C">
              Tổng quãng đường
            </Label>
          </View>
          <View style={{ flex: 1 }}>
            <Label size={16} weight="semibold" color="#172B3D">
              {Math.max(1, Math.ceil(plan.totalDurationS / 60))} phút
            </Label>
            <Label size={12} color="#677C8C">
              {routeModes[mode]}, chưa tính bàn giao
            </Label>
          </View>
        </View>
      ) : null}
      <Label size={12} color="#677C8C">
        Tọa độ xuất phát và điểm dừng được gửi tới Valhalla khi xem tuyến hoặc bắt đầu. Thời gian là
        ước tính, không có giao thông trực tiếp.
      </Label>
      {geo.error ? <Notice tone="error">{geo.error}</Notice> : null}
      <CommandError error={preview.error} />
      <CommandError error={command.error} />
      {error ? <Notice tone="error">{error}</Notice> : null}
      {stale && onReload ? (
        <>
          <Notice tone="warning">
            Hành trình đã thay đổi ở nơi khác. Tải bản mới nhất sẽ bỏ các thay đổi chưa lưu tại đây.
          </Notice>
          <Button
            title="Tải bản hành trình mới nhất"
            variant="secondary"
            pending={reloading}
            onPress={onReload}
          />
        </>
      ) : null}
      <Button
        title="Xem trước tuyến đường"
        disabled={!selected.length || busy || (manual && !validManual)}
        pending={preview.isPending || geo.busy}
        variant="secondary"
        onPress={() => void calculate()}
      />
      <Button
        title={`Bắt đầu hành trình • ${selected.length} điểm`}
        disabled={!selected.length || busy || (manual && !validManual)}
        pending={command.isPending}
        onPress={() => void save(true)}
      />
      <Button
        title={initial ? 'Lưu điểm dừng và phương tiện' : 'Lưu hành trình'}
        variant="quiet"
        disabled={!selected.length || busy}
        onPress={() => void save()}
      />
      {!initial ? (
        <>
          <Button
            title="Hành trình đã lưu"
            variant="quiet"
            onPress={() => setShowSaved((v) => !v)}
          />
          {showSaved ? (
            <QueryState
              query={routes}
              empty={!routes.data?.items.length}
              emptyText="Chưa có hành trình"
            >
              {routes.data?.items.map((r) => (
                <Button
                  key={r.id}
                  title={`Hành trình ${dateLabel(r.createdAt)} · ${r.status}`}
                  variant="quiet"
                  onPress={() =>
                    router.push({ pathname: '/collection-route', params: { id: r.id } })
                  }
                />
              ))}
            </QueryState>
          ) : null}
        </>
      ) : null}
    </PlannerPage>
  );
}
