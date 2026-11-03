import { useRef, useState } from 'react';
import { Pressable, Switch, View, type GestureResponderEvent } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Artwork, DesignLink, DesignScreen } from '../../design-system/DesignScreen';
import { Button, Chip, Label, Notice } from '../../design-system/ui';
import { useApp } from '../../providers';
import { usePages } from '../../services/queries';
import { useForegroundLocation } from '../../services/foreground-location';
import type { Schemas } from '../../services/api';
import { More, QueryState } from './common';

export type CollectionFilterParams = {
  q?: string;
  materials?: string;
  matchMode?: string;
  radius?: string;
  onlyOpen?: string;
  open24h?: string;
  available?: string;
  staffed?: string;
};
const radiusSteps = [
  { value: '0.5', label: '500 m' },
  { value: '1', label: '1 km' },
  { value: '3', label: '3 km' },
  { value: '5', label: '5 km' },
  { value: '10', label: '10 km' },
];

function RadiusPicker({ radius, onChange }: { radius: string; onChange: (value: string) => void }) {
  const { colors } = useApp();
  const width = useRef(0);
  const [dragging, setDragging] = useState<number>();
  const selected = radiusSteps.findIndex((step) => step.value === radius);
  const last = radiusSteps.length - 1;
  const active = dragging ?? selected;
  const progress = Math.max(0, active) / last;
  function indexAt(event: GestureResponderEvent) {
    const offset = event.nativeEvent.locationX - 12;
    const trackWidth = Math.max(1, width.current - 24);
    return Math.min(last, Math.max(0, Math.round((offset / trackWidth) * last)));
  }
  function choose(index: number) {
    onChange(radiusSteps[Math.min(last, Math.max(0, index))].value);
  }
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Label size={14}>Trong bán kính</Label>
        <Label size={14} bold color={colors.brand}>
          {radiusSteps[active]?.label ?? 'Mọi khoảng cách'}
        </Label>
      </View>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Bán kính tìm điểm thu gom"
        accessibilityValue={{ text: radiusSteps[active]?.label ?? 'Mọi khoảng cách' }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') choose(selected + 1);
          if (event.nativeEvent.actionName === 'decrement' && selected >= 0) {
            if (selected === 0) onChange('');
            else choose(selected - 1);
          }
        }}
        onLayout={(event) => { width.current = event.nativeEvent.layout.width; }}
        onStartShouldSetResponder={() => true}
        onResponderGrant={(event) => setDragging(indexAt(event))}
        onResponderMove={(event) => setDragging(indexAt(event))}
        onResponderRelease={(event) => {
          choose(indexAt(event));
          setDragging(undefined);
        }}
        onResponderTerminate={() => setDragging(undefined)}
        style={{ height: 44, justifyContent: 'center', paddingHorizontal: 12 }}
      >
        <View pointerEvents="none" style={{ height: 5, borderRadius: 3, backgroundColor: colors.border }}>
          <View style={{ width: `${progress * 100}%`, height: 5, borderRadius: 3, backgroundColor: colors.brand }} />
          <View
            style={{
              position: 'absolute', left: `${progress * 100}%`, top: -9, marginLeft: -11,
              width: 22, height: 22, borderRadius: 11, borderWidth: 3,
              borderColor: active >= 0 ? colors.brand : colors.border,
              backgroundColor: colors.surface,
            }}
          />
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {radiusSteps.map((step, index) => (
          <Pressable
            key={step.value}
            accessibilityRole="button"
            accessibilityState={{ selected: index === selected }}
            onPress={() => choose(index)}
            style={{ minHeight: 40, justifyContent: 'center' }}
          >
            <Label size={12} color={index === active ? colors.brand : colors.muted}>
              {step.label}
            </Label>
          </Pressable>
        ))}
      </View>
      <DesignLink onPress={() => onChange('')}>Mọi khoảng cách</DesignLink>
    </View>
  );
}
export function collectionFilterQuery(
  params: CollectionFilterParams,
  location?: { latitude: number; longitude: number },
) {
  const query = new URLSearchParams();
  for (const id of params.materials?.split(',').filter(Boolean) ?? [])
    query.append('material_ids', id);
  query.set('match_mode', params.matchMode === 'any' ? 'any' : 'all');
  if (params.onlyOpen === '1') query.set('only_open', 'true');
  if (params.open24h === '1') query.set('open_24h', 'true');
  if (params.available === '1') query.set('available_only', 'true');
  if (params.staffed === '1') query.set('staffed_only', 'true');
  if (params.radius && location) {
    query.set('lat', String(location.latitude));
    query.set('lng', String(location.longitude));
    query.set('radius_m', String(Number(params.radius) * 1000));
  }
  return query.toString();
}
export function CollectionFiltersScreen() {
  const { colors } = useApp();
  const params = useLocalSearchParams<CollectionFilterParams & { fromExplore?: string }>();
  const [materials, setMaterials] = useState(params.materials?.split(',').filter(Boolean) ?? []);
  const [matchMode, setMode] = useState(params.matchMode ?? 'all');
  const [radius, setRadius] = useState(params.radius ?? '');
  const [onlyOpen, setOpen] = useState(params.onlyOpen === '1'),
    [open24h, set24h] = useState(params.open24h === '1');
  const [available, setAvailable] = useState(params.available === '1'),
    [staffed, setStaffed] = useState(params.staffed === '1');
  const geo = useForegroundLocation();
  const choices = usePages<{ id: string; name: string }>('/v1/waste-materials');
  const values = {
    q: params.q ?? '',
    materials: materials.join(','),
    matchMode,
    radius,
    onlyOpen: onlyOpen ? '1' : '',
    open24h: open24h ? '1' : '',
    available: available ? '1' : '',
    staffed: staffed ? '1' : '',
  };
  const preview = usePages<Schemas['CollectionPoint']>(
    `/v1/collection-points?q=${encodeURIComponent(values.q)}&${collectionFilterQuery(values, geo.location)}`,
    false,
    !radius || !!geo.location,
  );
  const count = preview.data?.pages.reduce((total, page) => total + page.items.length, 0);
  return (
    <DesignScreen
      family="inter"
      title="Bộ lọc điểm thu gom"
      action={<Artwork source={require('../../../assets/figma/534-48401/imgNhDiDin.png')} width={32} />}
      contentStyle={{ gap: 14 }}
    >
      <Label size={14} color={colors.muted}>Tìm điểm phù hợp với loại rác bạn mang theo.</Label>
      <Label bold size={16}>Loại rác được tiếp nhận</Label>
      <Label size={12} color={colors.muted}>Có thể chọn nhiều loại</Label>
      <QueryState query={choices}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {choices.data?.pages.flatMap((page) => page.items).map((item) => (
            <Chip
              key={item.id}
              label={item.name}
              selected={materials.includes(item.id)}
              onPress={() =>
                setMaterials((current) =>
                  current.includes(item.id)
                    ? current.filter((id) => id !== item.id)
                    : [...current, item.id],
                )
              }
            />
          ))}
        </View>
        <More query={choices} />
      </QueryState>
      {materials.length > 1 ? (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip
          label="Nhận tất cả vật liệu"
          selected={matchMode === 'all'}
          onPress={() => setMode('all')}
        />
        <Chip
          label="Nhận một trong các vật liệu"
          selected={matchMode === 'any'}
          onPress={() => setMode('any')}
        />
      </View>
      ) : null}
      <Label bold size={16}>Khoảng cách từ bạn</Label>
      <RadiusPicker radius={radius} onChange={setRadius} />
      <Button
        title="Dùng vị trí hiện tại"
        variant="secondary"
        pending={geo.busy}
        onPress={() => void geo.locate()}
      />
      {geo.location ? (
        <Label>
          Đã lấy vị trí ·{' '}
          {geo.location.accuracy != null
            ? `Sai số khoảng ${Math.round(geo.location.accuracy)} m`
            : 'Chưa có thông tin sai số GPS'}
        </Label>
      ) : null}
      {geo.error ? <Notice tone="error">{geo.error}</Notice> : null}
      {radius && !geo.location ? (
        <Notice>Cho phép vị trí để áp dụng bán kính đã chọn.</Notice>
      ) : null}
      <Label bold size={16}>Giờ hoạt động</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip label="Tất cả" selected={!onlyOpen && !open24h} onPress={() => { setOpen(false); set24h(false); }} />
        <Chip label="Đang mở cửa" selected={onlyOpen} onPress={() => { setOpen(true); set24h(false); }} />
        <Chip label="Mở 24 giờ" selected={open24h} onPress={() => { setOpen(false); set24h(true); }} />
      </View>
      <Label bold size={16}>Tình trạng tiếp nhận</Label>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Label>Chỉ hiện điểm còn chỗ</Label>
          <Label size={12} color={colors.muted}>Ẩn các điểm đầy hoặc tạm ngừng nhận</Label>
        </View>
        <Switch accessibilityLabel="Chỉ hiện điểm còn chỗ" value={available} onValueChange={setAvailable} trackColor={{ true: colors.brand }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Label>Có nhân viên hỗ trợ</Label>
          <Label size={12} color={colors.muted}>Phù hợp khi cần hướng dẫn phân loại</Label>
        </View>
        <Switch accessibilityLabel="Có nhân viên hỗ trợ" value={staffed} onValueChange={setStaffed} trackColor={{ true: colors.brand }} />
      </View>
      <Notice>
        Điểm chưa có dữ liệu xác nhận sẽ không được tính là đang mở cửa, còn chỗ hoặc có nhân viên.
      </Notice>
      {preview.isError ? (
        <Notice tone="error">Chưa tải được số điểm phù hợp.</Notice>
      ) : null}
      <Button
        title={count == null ? 'Áp dụng bộ lọc' : `Áp dụng · ${count}${preview.hasNextPage ? '+' : ''} điểm phù hợp`}
        disabled={!!radius && !geo.location}
        onPress={() =>
          router.replace({
            pathname: params.fromExplore === '1' ? '/collection-explore' : '/collection',
            params: values,
          })
        }
      />
      <DesignLink
        style={{ alignItems: 'center' }}
        onPress={() => {
          setMaterials([]);
          setMode('all');
          setRadius('');
          setOpen(false);
          set24h(false);
          setAvailable(false);
          setStaffed(false);
        }}
      >
        Đặt lại bộ lọc
      </DesignLink>
    </DesignScreen>
  );
}
