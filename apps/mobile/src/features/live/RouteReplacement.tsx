import { useCallback, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Artwork, DesignLink, DesignScreen } from '../../design-system/DesignScreen';
import { Button, Chip, Label, Notice } from '../../design-system/ui';
import { useApp } from '../../providers';
import { useCommand, usePages, useResource } from '../../services/queries';
import { ApiError, type Schemas } from '../../services/api';
import { useForegroundLocation } from '../../services/foreground-location';
import { CommandError, More, QueryState, RequireAuth } from './common';
import { PointMap } from './PointMap';
import { handoverMaterials } from './journey-materials';

const art = {
  brand: require('../../../assets/figma/534-48869/imgNhDiDin.png'),
  alert: require('../../../assets/figma/534-48869/imgTriangleAlert.svg'),
  check: require('../../../assets/figma/534-48869/imgCheck.svg'),
};
const capacity = {
  unknown: 'Chưa rõ sức chứa',
  available: 'Còn chỗ',
  limited: 'Sắp đầy',
  full: 'Đã đầy',
  closed: 'Đã đóng cửa',
};
function delta(value: number, unit: string) {
  return `${value > 0 ? '+' : ''}${value} ${unit}`;
}

export function RouteReplacement({ id, stopId }: { id: string; stopId: string }) {
  const { colors } = useApp();
  const routeQuery = useResource<Schemas['RouteDetail']>(`/v1/routes/${id}`, true);
  const command = useCommand<Schemas['RouteDetail']>();
  const preview = useCommand<Schemas['RoutePlan']>();
  const replan = useCommand<Schemas['RouteDetail']>();
  const geo = useForegroundLocation();
  const [useCurrentOrigin, setUseCurrentOrigin] = useState(false);
  const comparing = useRef(false);
  const [comparisonPending, setComparisonPending] = useState(false);
  const focused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      return () => {
        focused.current = false;
      };
    }, []),
  );
  const [selected, setSelected] = useState('');
  const [requireAllMaterials, setRequireAllMaterials] = useState(true);
  const [nearbyOnly, setNearbyOnly] = useState(true);
  const replacing = useRef(false);
  const [comparison, setComparison] = useState<{
    pointId: string;
    version: number;
    plan: Schemas['RoutePlan'];
    baseline: Schemas['RoutePlan'];
  }>();
  const route = routeQuery.data;
  const stop = route?.stops.find((item) => item.id === stopId);
  const filters = new URLSearchParams();
  if (stop && nearbyOnly) {
    filters.set('lat', String(stop.latitude));
    filters.set('lng', String(stop.longitude));
    filters.set('radius_m', '10000');
  }
  const plannedMaterials = handoverMaterials(stop?.materials ?? [], route?.materialIds);
  const materialIds = plannedMaterials.map((material) => material.id);
  if (requireAllMaterials && materialIds.length <= 20) {
    for (const materialId of materialIds) filters.append('material_ids', materialId);
  }
  const points = usePages<Schemas['CollectionPoint']>(
    `/v1/collection-points?${filters.toString()}`,
    false,
    route?.status === 'active' && stop?.status === 'pending',
  );
  const candidates =
    points.data?.pages
      .flatMap((page) => page.items)
      .filter(
        (point) =>
          !route?.stops.some((item) => item.pointId === point.id) &&
          point.capacityState !== 'full' &&
          point.capacityState !== 'closed' &&
          point.openNow !== false &&
          (!requireAllMaterials ||
            plannedMaterials.every((material) =>
              point.materials.some((candidate) => candidate.id === material.id),
            )),
      ) ?? [];
  const point = candidates.find((item) => item.id === selected);
  const uncovered =
    point && route?.materialIds?.length
      ? plannedMaterials.filter(
          (material) =>
            !point.materials.some((accepted) => accepted.id === material.id) &&
            !route.stops.some(
              (other) =>
                other.id !== stopId &&
                other.status !== 'self_reported' &&
                other.materials.some((accepted) => accepted.id === material.id),
            ),
        )
      : [];
  const original = route?.plan;
  const currentComparison =
    comparison && comparison.pointId === point?.id && comparison.version === route?.version
      ? comparison
      : undefined;
  const alternative = currentComparison?.plan;
  const baseline = currentComparison?.baseline;
  const keepRoute = () => (router.canGoBack() ? router.back() : router.replace('/collection'));

  async function compare() {
    if (!route || !point || comparing.current || replacing.current) return;
    comparing.current = true;
    setComparisonPending(true);
    try {
      const fix = useCurrentOrigin ? await geo.locate() : null;
      if (!focused.current || (useCurrentOrigin && !fix)) return;
      const origin = fix ? { latitude: fix.latitude, longitude: fix.longitude } : original?.origin;
      if (!origin) return;
      const remaining = route.stops.filter((item) => item.status !== 'self_reported');
      const options = {
        origin,
        mode: route.mode,
        preferNoTolls: route.preferNoTolls ?? original?.preferNoTolls ?? false,
      };
      const calculate = (stopIds: string[]) =>
        preview.mutateAsync({ path: '/v1/routes/preview', body: { ...options, stopIds } });
      const baseline =
        fix || !original ? await calculate(remaining.map((item) => item.pointId)) : original;
      if (!focused.current) return;
      const plan = await calculate(
        remaining.map((item) => (item.id === stopId ? point.id : item.pointId)),
      );
      if (focused.current)
        setComparison({ pointId: point.id, version: route.version, plan, baseline });
    } catch {
      // The preview mutation displays the routing error.
    } finally {
      comparing.current = false;
      setComparisonPending(false);
    }
  }

  return (
    <DesignScreen
      family="inter"
      title="Chọn điểm thay thế"
      action={<Artwork source={art.brand} width={32} />}
      contentStyle={{ gap: 16 }}
    >
      <RequireAuth>
        {replan.isPending ? <Notice>Đã thay điểm dừng. Đang tính tuyến mới…</Notice> : null}
        <QueryState query={routeQuery}>
          {route?.status === 'active' && stop?.status === 'pending' ? (
            <>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: '#FFF4E0',
                }}
              >
                <Artwork source={art.alert} width={20} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Label bold color="#825019">
                    Điểm cần thay: {stop.name}
                  </Label>
                  <Label size={12} color="#825019">
                    {stop.address}
                  </Label>
                </View>
              </View>
              <View style={{ height: 145, borderRadius: 16, overflow: 'hidden' }}>
                <PointMap
                  coordinate={point ?? stop}
                  line={alternative?.legs.flatMap((leg) => leg.geometry)}
                />
              </View>
              <Label bold size={16}>
                Các điểm thay thế
              </Label>
              <Chip
                label="Trong 10 km từ điểm cũ"
                selected={nearbyOnly}
                disabled={command.isPending || comparisonPending}
                onPress={() => {
                  setNearbyOnly((value) => !value);
                  setSelected('');
                  setComparison(undefined);
                  preview.reset();
                  command.reset();
                }}
              />
              <Chip
                label="Nhận đủ vật liệu dự kiến bàn giao"
                selected={requireAllMaterials}
                disabled={command.isPending || comparisonPending}
                onPress={() => {
                  setRequireAllMaterials((value) => !value);
                  setSelected('');
                  setComparison(undefined);
                  preview.reset();
                  command.reset();
                }}
              />
              <QueryState query={points}>
                {!candidates.length ? (
                  <Notice>
                    {points.hasNextPage
                      ? 'Chưa có điểm phù hợp trong phần đã tải. Chọn Xem thêm để tìm tiếp.'
                      : 'Chưa có điểm thay thế phù hợp. Bạn có thể đổi bộ lọc hoặc giữ hành trình hiện tại.'}
                  </Notice>
                ) : null}
                {candidates.map((candidate) => {
                  const checked = candidate.id === selected;
                  const missing = plannedMaterials.filter(
                    (material) => !candidate.materials.some((item) => item.id === material.id),
                  );
                  return (
                    <Pressable
                      key={candidate.id}
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked,
                        disabled: command.isPending || comparisonPending,
                      }}
                      disabled={command.isPending || comparisonPending}
                      onPress={() => {
                        setSelected(candidate.id);
                        preview.reset();
                        command.reset();
                      }}
                      style={{
                        padding: 15,
                        gap: 8,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: checked ? colors.soft : colors.surface,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: checked ? colors.brand : colors.border,
                            backgroundColor: checked ? colors.brand : colors.surface,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {checked ? <Artwork source={art.check} width={15} /> : null}
                        </View>
                        <Label bold style={{ flex: 1 }}>
                          {candidate.name}
                        </Label>
                      </View>
                      <Label size={12} color={colors.muted}>
                        {candidate.address}
                      </Label>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {candidate.materials.map((material) => (
                          <View
                            key={material.id}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 20,
                              borderWidth: 1,
                              borderColor: colors.border,
                              backgroundColor: colors.surface,
                            }}
                          >
                            <Label size={12}>{material.name}</Label>
                          </View>
                        ))}
                      </View>
                      <Label size={12} color={colors.muted}>
                        {capacity[candidate.capacityState]} · {candidate.hours}
                      </Label>
                      {missing.length ? (
                        <Label size={12} color={colors.muted}>
                          Chưa ghi nhận tiếp nhận:{' '}
                          {missing.map((material) => material.name).join(', ')}
                        </Label>
                      ) : null}
                    </Pressable>
                  );
                })}
                <More query={points} />
              </QueryState>
              {point ? (
                <Chip
                  label="So sánh từ vị trí hiện tại"
                  selected={useCurrentOrigin}
                  disabled={comparisonPending || command.isPending}
                  onPress={() => {
                    setUseCurrentOrigin((value) => !value);
                    setComparison(undefined);
                    preview.reset();
                  }}
                />
              ) : null}
              {point && (original || useCurrentOrigin) ? (
                alternative && baseline ? (
                  <Label bold color={colors.brand}>
                    {delta(Math.round(alternative.totalDistanceM - baseline.totalDistanceM), 'm')}
                    {' · '}
                    {delta(
                      Math.round((alternative.totalDurationS - baseline.totalDurationS) / 60),
                      'phút',
                    )}
                    {' so với tuyến hiện tại'}
                  </Label>
                ) : (
                  <Button
                    title="So sánh quãng đường và thời gian"
                    variant="secondary"
                    pending={comparisonPending}
                    disabled={command.isPending}
                    onPress={() => void compare()}
                  />
                )
              ) : null}
              {useCurrentOrigin && geo.error ? <Notice tone="error">{geo.error}</Notice> : null}
              <CommandError error={preview.error} />
              <Label size={12} color={colors.muted}>
                Các điểm dừng khác giữ nguyên thứ tự. Hãy kiểm tra tình trạng tiếp nhận trước khi
                đi.
              </Label>
              {point && (original || useCurrentOrigin) && !alternative ? (
                <Label size={12} color={colors.muted}>
                  Khi so sánh, tọa độ xuất phát và các điểm dừng được gửi tới Valhalla để tính
                  tuyến.
                </Label>
              ) : null}
              <CommandError error={command.error} />
              {uncovered.length ? (
                <Notice tone="warning">
                  Nếu đổi sang điểm này, các điểm còn lại sẽ không nhận{' '}
                  {uncovered.map((material) => material.name).join(', ')}.
                </Notice>
              ) : null}
              <Button
                title="Thay điểm dừng"
                disabled={!point || comparisonPending}
                pending={command.isPending || replan.isPending}
                onPress={() => {
                  if (!point || replacing.current || comparing.current) return;
                  replacing.current = true;
                  void command
                    .mutateAsync({
                      path: `/v1/routes/${id}/stops/${stopId}/replacement`,
                      method: 'PUT',
                      body: { pointId: point.id, expectedVersion: route.version },
                    })
                    .then(async (updated) => {
                      if (!focused.current) return;
                      if (alternative) {
                        try {
                          await replan.mutateAsync({
                            path: `/v1/routes/${id}/plan`,
                            body: {
                              origin: alternative.origin,
                              expectedVersion: updated.version,
                              preferNoTolls: updated.preferNoTolls ?? alternative.preferNoTolls,
                            },
                          });
                          if (focused.current)
                            router.replace({ pathname: '/collection-navigation', params: { id } });
                          return;
                        } catch {
                          if (focused.current)
                            router.replace({
                              pathname: '/collection-directions',
                              params: { routeId: id, planFailed: '1' },
                            });
                          return;
                        }
                      }
                      router.replace({
                        pathname: '/collection-directions',
                        params: { routeId: id },
                      });
                    })
                    .catch((cause) => {
                      if (cause instanceof ApiError && cause.status === 409) {
                        setComparison(undefined);
                        void routeQuery.refetch();
                        void points.refetch();
                      }
                    })
                    .finally(() => {
                      replacing.current = false;
                    });
                }}
              />
              <DesignLink onPress={keepRoute} style={{ alignItems: 'center' }}>
                Giữ hành trình hiện tại
              </DesignLink>
            </>
          ) : replan.isPending ? null : (
            <Notice>Chỉ thay điểm chưa đến trong hành trình đang hoạt động.</Notice>
          )}
        </QueryState>
      </RequireAuth>
    </DesignScreen>
  );
}
