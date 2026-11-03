import { useCallback, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useQueries } from '@tanstack/react-query';
import { Artwork, DesignLink, DesignScreen } from '../../design-system/DesignScreen';
import { Button, Label, Notice } from '../../design-system/ui';
import { useApp } from '../../providers';
import { useForegroundLocation } from '../../services/foreground-location';
import { useResource, useCommand } from '../../services/queries';
import type { Schemas } from '../../services/api';
import { CommandError, QueryState, RequireAuth } from './common';
import { handoverMaterials } from './journey-materials';

const art = {
  brand: require('../../../assets/figma/534-48505/imgNhDiDin.png'),
  point: require('../../../assets/figma/534-48505/imgNhMinhHa.png'),
  check: require('../../../assets/figma/534-48505/imgCheck.svg'),
  info: require('../../../assets/figma/534-48505/imgInfo.svg'),
};
const capacity = {
  unknown: 'Chưa rõ sức chứa',
  available: 'Còn chỗ',
  limited: 'Sắp đầy',
  full: 'Đã đầy',
  closed: 'Tạm đóng cửa',
};
function canChoose(point: Schemas['CollectionPoint']) {
  return (
    point.capacityState !== 'full' && point.capacityState !== 'closed' && point.openNow !== false
  );
}

export function CollectionCompareScreen() {
  const { ids, materials } = useLocalSearchParams<{ ids?: string; materials?: string }>();
  const { user } = useApp();
  return (
    <DesignScreen
      family="inter"
      title="So sánh điểm thu gom"
      action={<Artwork source={art.brand} width={32} />}
      contentStyle={{ gap: 16 }}
    >
      {ids ? (
        <Comparison
          key={`${user?.id ?? 'guest'}:${ids}:${materials ?? ''}`}
          ids={ids}
          materials={materials}
        />
      ) : (
        <Notice>Chọn ít nhất hai điểm để so sánh.</Notice>
      )}
      <DesignLink
        style={{ alignItems: 'center' }}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/collection'))}
      >
        Thay đổi điểm so sánh
      </DesignLink>
    </DesignScreen>
  );
}

function Comparison({ ids, materials }: { ids: string; materials?: string }) {
  const { api, colors, status, user } = useApp();
  const geo = useForegroundLocation();
  const [selection, setSelection] = useState<string>();
  const carried = [...new Set(materials?.split(',').filter(Boolean) ?? [])];
  const creatingRoute = useRef(false);
  const focused = useRef(false);
  const [routeBusy, setRouteBusy] = useState(false);
  const [walkingOrigin, setWalkingOrigin] = useState<{
    account: string;
    latitude: number;
    longitude: number;
    timestamp: number;
  }>();
  const command = useCommand<Schemas['RouteDetail']>();
  const planCommand = useCommand<Schemas['RouteDetail']>();
  const openingDirections = routeBusy || command.isPending || planCommand.isPending;
  const params = ids
    .split(',')
    .map((id) => 'ids=' + encodeURIComponent(id))
    .join('&');
  const query = useResource<Schemas['PointComparison']>(
    `/v1/collection-points/compare?${params}${geo.location ? `&lat=${geo.location.latitude}&lng=${geo.location.longitude}` : ''}`,
  );
  const items = query.data?.items ?? [];
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      void refetch();
      return () => {
        focused.current = false;
      };
    }, [refetch]),
  );
  const origin =
    status === 'authenticated' && walkingOrigin?.account === user?.id ? walkingOrigin : undefined;
  const walking = useQueries({
    queries: origin
      ? items.map((point) => ({
          queryKey: [
            'collection-walking',
            origin.account,
            origin.latitude,
            origin.longitude,
            point.id,
          ],
          queryFn: async ({ signal }: { signal: AbortSignal }) => {
            const plan = await api.request<Schemas['RoutePlan']>('/v1/routes/preview', {
              method: 'POST',
              signal,
              body: JSON.stringify({
                origin: { latitude: origin.latitude, longitude: origin.longitude },
                mode: 'walking',
                stopIds: [point.id],
              }),
            });
            return { distance: plan.totalDistanceM, duration: plan.totalDurationS };
          },
          retry: false,
          staleTime: 60_000,
          gcTime: 0,
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
        }))
      : [],
  });
  const available = items.filter(
    (point) =>
      canChoose(point) &&
      (!carried.length || handoverMaterials(point.materials, carried).length > 0),
  );
  const suggested = carried.length
    ? [...available].sort(
        (left, right) =>
          handoverMaterials(right.materials, carried).length -
            handoverMaterials(left.materials, carried).length ||
          (left.distanceM ?? Number.MAX_SAFE_INTEGER) -
            (right.distanceM ?? Number.MAX_SAFE_INTEGER),
      )[0]
    : (available.find((point) => point.id === query.data?.recommendedId) ?? available[0]);
  const chosen = selection ? available.find((point) => point.id === selection) : suggested;
  const accepted = chosen ? handoverMaterials(chosen.materials, carried) : [];
  const recommendation = carried.length
    ? suggested
      ? `${suggested.name} nhận ${handoverMaterials(suggested.materials, carried).length}/${carried.length} loại rác bạn đã chọn.`
      : 'Chưa có điểm phù hợp với loại rác đã chọn đang nhận rác. Hãy thay đổi điểm so sánh.'
    : query.data?.recommendationReason;
  const shared = items[0]?.materials.filter((material) =>
    items.every((point) => point.materials.some((item) => item.id === material.id)),
  );
  return (
    <>
      <QueryState query={query} empty={items.length < 2} emptyText="Chưa đủ hai điểm để so sánh">
        <Label size={13} color={colors.muted}>
          {items.length} điểm thu gom
          {shared?.length ? ` · Cùng nhận ${shared.map((item) => item.name).join(', ')}` : ''}
        </Label>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          {items.map((point, index) => (
            <ComparedPoint
              key={point.id}
              point={point}
              selected={chosen?.id === point.id}
              busy={openingDirections}
              carried={carried}
              walking={walking[index]?.data}
              walkingPending={walking[index]?.isPending}
              onSelect={() => setSelection(point.id)}
            />
          ))}
        </View>
        {recommendation ? (
          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              padding: 14,
              borderRadius: 16,
              backgroundColor: colors.soft,
            }}
          >
            <Artwork source={art.info} width={20} />
            <View style={{ flex: 1, gap: 4 }}>
              <Label bold color={colors.brand}>
                Gợi ý cho túi rác của bạn
              </Label>
              <Label size={12} color={colors.muted}>
                {recommendation}
              </Label>
            </View>
          </View>
        ) : null}
        {chosen && carried.length > accepted.length ? (
          <Notice tone="warning">
            Điểm đã chọn nhận {accepted.length}/{carried.length} loại rác bạn mang theo. Các loại
            còn lại cần một điểm tiếp nhận khác.
          </Notice>
        ) : null}
        {selection && !chosen ? (
          <Notice tone="warning">
            Điểm đã chọn hiện không thể tiếp nhận. Hãy chọn điểm khác để tiếp tục.
          </Notice>
        ) : null}
        <RequireAuth>
          <CommandError error={command.error} />
          <Button
            title="Chỉ đường đến điểm đã chọn"
            pending={openingDirections}
            disabled={!chosen || query.isRefetching}
            onPress={() => {
              if (!chosen || query.isRefetching || creatingRoute.current) return;
              creatingRoute.current = true;
              setRouteBusy(true);
              void command
                .mutateAsync({
                  path: '/v1/routes',
                  body: { stopIds: [chosen.id], mode: 'walking', materialIds: carried },
                })
                .then(async (route) => {
                  let planFailed = false;
                  if (origin && Date.now() - origin.timestamp <= 120_000) {
                    try {
                      await planCommand.mutateAsync({
                        path: `/v1/routes/${route.id}/plan`,
                        body: {
                          origin: { latitude: origin.latitude, longitude: origin.longitude },
                          expectedVersion: route.version,
                        },
                      });
                    } catch {
                      planFailed = true;
                    }
                  }
                  if (!focused.current) return;
                  router.push({
                    pathname: '/collection-directions',
                    params: { routeId: route.id, ...(planFailed ? { planFailed: '1' } : {}) },
                  });
                })
                .catch(() => refetch())
                .finally(() => {
                  creatingRoute.current = false;
                  setRouteBusy(false);
                });
            }}
          />
        </RequireAuth>
      </QueryState>
      {status === 'authenticated' && items.length >= 2 ? (
        <>
          <Label size={12} color={colors.muted}>
            Để tính đường đi bộ, vị trí của bạn và các điểm đang so sánh được gửi tới Valhalla.
          </Label>
          <Button
            title={origin ? 'Cập nhật tuyến đi bộ' : 'Tính đường đi bộ từ vị trí của tôi'}
            variant="quiet"
            pending={geo.busy || walking.some((item) => item.isFetching)}
            disabled={openingDirections}
            onPress={() => {
              if (!user) return;
              const account = user.id;
              void geo.locate().then((location) => {
                if (!location) return;
                setWalkingOrigin({
                  account,
                  latitude: location.latitude,
                  longitude: location.longitude,
                  timestamp: location.timestamp,
                });
                if (
                  origin?.latitude === location.latitude &&
                  origin.longitude === location.longitude
                ) {
                  walking.forEach((item) => void item.refetch());
                }
              });
            }}
          />
          {walking.some((item) => item.isError) ? (
            <Notice>
              Một số tuyến đi bộ chưa tính được. Bạn có thể cập nhật tuyến để thử lại.
            </Notice>
          ) : null}
        </>
      ) : !geo.location || geo.error ? (
        <Button
          title="Dùng vị trí hiện tại"
          pending={geo.busy}
          variant="quiet"
          onPress={() => void geo.locate()}
        />
      ) : null}
      {geo.error ? <Notice tone="error">{geo.error}</Notice> : null}
    </>
  );
}

function ComparedPoint({
  point,
  selected,
  busy,
  walking,
  walkingPending,
  onSelect,
  carried,
}: {
  point: Schemas['CollectionPoint'];
  selected: boolean;
  busy: boolean;
  walking?: { distance: number; duration: number };
  walkingPending?: boolean;
  onSelect: () => void;
  carried: string[];
}) {
  const { colors } = useApp();
  const accepted = handoverMaterials(point.materials, carried);
  const supportsCarried = !carried.length || accepted.length > 0;
  const disabled = busy || !canChoose(point) || !supportsCarried;
  let distance = 'Cần vị trí của bạn';
  if (walking) {
    const length =
      walking.distance >= 1000
        ? `${(walking.distance / 1000).toFixed(1)} km`
        : `${Math.round(walking.distance)} m`;
    distance = `${length} · ${Math.max(1, Math.ceil(walking.duration / 60))} phút đi bộ`;
  } else if (walkingPending) {
    distance = 'Đang tính tuyến đi bộ…';
  } else if (point.distanceM != null) {
    distance = `${Math.round(point.distanceM)} m theo đường thẳng`;
  }
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={point.name}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onSelect}
      style={{
        width: '48%',
        padding: 11,
        gap: 14,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: selected ? colors.brand : colors.border,
        backgroundColor: selected ? colors.soft : colors.surface,
      }}
    >
      <View
        style={{
          height: 94,
          borderRadius: 14,
          overflow: 'hidden',
          alignItems: 'center',
          backgroundColor: colors.surface,
        }}
      >
        <Artwork source={art.point} width={140} height={94} style={{ maxWidth: '100%' }} />
      </View>
      <View style={{ minHeight: 90, gap: 5 }}>
        <Label size={16} bold>
          {point.name}
        </Label>
        <Label size={12} color={colors.muted}>
          {point.address}
        </Label>
      </View>
      <ComparisonField title="Khoảng cách" value={distance} />
      <ComparisonField title="Giờ mở cửa" value={point.hours || 'Chưa có thông tin'} />
      <ComparisonField
        title="Tiếp nhận"
        value={point.materials.map((item) => item.name).join(', ') || 'Chưa có thông tin'}
      />
      <ComparisonField
        title="Tiếp nhận hiện tại"
        value={point.openNow === false ? 'Ngoài giờ tiếp nhận' : capacity[point.capacityState]}
      />
      {carried.length ? (
        <ComparisonField
          title="Rác bạn đã chọn"
          value={
            accepted.length
              ? `${accepted.length}/${carried.length} loại · ${accepted.map((item) => item.name).join(', ')}`
              : 'Không nhận loại rác bạn đã chọn'
          }
        />
      ) : null}
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: selected ? colors.brand : colors.border,
            backgroundColor: selected ? colors.brand : colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {selected ? <Artwork source={art.check} width={15} /> : null}
        </View>
        <Label size={12} style={{ flex: 1 }}>
          {selected
            ? 'Đã chọn'
            : canChoose(point) && supportsCarried
              ? 'Chọn điểm này'
              : 'Chưa thể chọn'}
        </Label>
      </View>
    </Pressable>
  );
}

function ComparisonField({ title, value }: { title: string; value: string }) {
  const { colors } = useApp();
  return (
    <View style={{ minHeight: 58, gap: 4 }}>
      <Label size={12} color={colors.muted}>
        {title}
      </Label>
      <Label size={13}>{value}</Label>
    </View>
  );
}
