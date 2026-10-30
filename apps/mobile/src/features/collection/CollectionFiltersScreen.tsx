import { useRef, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../providers';
import { Artwork } from '../../design-system/DesignScreen';
import { collectionFlowAssets } from '../../design-system/collection-flow-assets';
import { defaultCollectionFilters, matchingCollectionPoints } from '../../services/collection';
import {
  CollectionAction,
  CollectionPage,
  CollectionText as T,
  collectionColors as c,
} from './CollectionPage';
const a = collectionFlowAssets['534:48401'];
export function CollectionFiltersScreen() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { collectionFilters, setCollectionFilters } = useApp();
  const [draft, setDraft] = useState(() => ({
    ...collectionFilters,
    materials: [...collectionFilters.materials],
  }));
  const trackWidth = useRef(380);
  const setRadius = (value: number) =>
    setDraft((current) => ({
      ...current,
      radius: Math.max(0.5, Math.min(10, Math.round(value * 2) / 2)),
    }));
  const position =
    draft.radius <= 3 ? ((draft.radius - 0.5) / 2.5) * 0.4 : 0.4 + ((draft.radius - 3) / 7) * 0.6;
  const toRadius = (x: number) => {
    const p = Math.max(0, Math.min(1, x / trackWidth.current));
    return p <= 0.4 ? 0.5 + (p / 0.4) * 2.5 : 3 + ((p - 0.4) / 0.6) * 7;
  };
  const chip = (label: string, selected: boolean, onPress: () => void) => (
    <Pressable
      key={label}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      style={{
        height: 40,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: selected ? c.brand : c.border,
        backgroundColor: selected ? c.soft : '#FFFFFF',
        paddingHorizontal: 13,
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
      }}
    >
      {selected ? <Artwork source={a.imgCheck} width={14} /> : null}
      <T weight="medium" color={selected ? c.brand : c.muted}>
        {label}
      </T>
    </Pressable>
  );
  const toggle = (title: string, detail: string, checked: boolean, onPress: () => void) => (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityState={{ checked }}
      aria-checked={checked}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <T>{title}</T>
        <T size={12} color={c.muted}>
          {detail}
        </T>
      </View>
      <View
        style={{
          width: 46,
          height: 28,
          borderRadius: 14,
          backgroundColor: checked ? c.brand : '#DDEBF3',
        }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            top: 3,
            left: checked ? 21 : 3,
            backgroundColor: '#FFFFFF',
          }}
        />
      </View>
    </Pressable>
  );
  const count = matchingCollectionPoints(draft).length;
  return (
    <CollectionPage
      title="Bộ lọc điểm thu gom"
      footer={
        <>
          <CollectionAction
            title={`Áp dụng • ${count} điểm phù hợp`}
            onPress={() => {
              setCollectionFilters({ ...draft, applied: true });
              if (next === 'nearby') router.replace('/collection');
              else if (router.canGoBack()) router.back();
              else router.replace('/collection');
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đặt lại bộ lọc"
            onPress={() =>
              setDraft({
                ...defaultCollectionFilters(),
                materials: [],
                hours: 'all',
                radius: 10,
                available: false,
              })
            }
            style={{ alignItems: 'center' }}
          >
            <T weight="semibold" color={c.brand}>
              Đặt lại bộ lọc
            </T>
          </Pressable>
        </>
      }
    >
      <T color={c.muted}>Tìm điểm phù hợp với loại rác bạn mang theo.</T>
      <View style={{ gap: 12 }}>
        <T size={16} weight="semibold">
          Loại rác được tiếp nhận
        </T>
        <T size={12} color={c.muted}>
          Có thể chọn nhiều loại
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[
            'Nhựa',
            'Giấy, bìa',
            'Kim loại',
            'Thủy tinh',
            'Pin đã dùng',
            'Rác hữu cơ',
            'Quần áo',
            'Điện tử',
          ].map((material) =>
            chip(material, draft.materials.includes(material), () =>
              setDraft((current) => ({
                ...current,
                materials: current.materials.includes(material)
                  ? current.materials.filter((item) => item !== material)
                  : [...current.materials, material],
              })),
            ),
          )}
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <T size={16} weight="semibold">
          Khoảng cách từ bạn
        </T>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T>Trong bán kính</T>
          <T size={16} weight="semibold" color={c.brand}>
            {draft.radius} km
          </T>
        </View>
        <View
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(event) => setRadius(toRadius(event.nativeEvent.locationX))}
          onResponderMove={(event) => setRadius(toRadius(event.nativeEvent.locationX))}
          tabIndex={0}
          onKeyDown={(event) => {
            const key = 'key' in event ? event.key : undefined;
            if (key === 'ArrowRight' || key === 'ArrowUp') {
              event.preventDefault();
              setRadius(draft.radius + 0.5);
            }
            if (key === 'ArrowLeft' || key === 'ArrowDown') {
              event.preventDefault();
              setRadius(draft.radius - 0.5);
            }
            if (key === 'Home') {
              event.preventDefault();
              setRadius(0.5);
            }
            if (key === 'End') {
              event.preventDefault();
              setRadius(10);
            }
          }}
          accessibilityRole="adjustable"
          accessibilityLabel="Bán kính tìm kiếm"
          accessibilityValue={{ min: 0.5, max: 10, now: draft.radius, text: `${draft.radius} km` }}
          aria-valuemin={0.5}
          aria-valuemax={10}
          aria-valuenow={draft.radius}
          aria-valuetext={`${draft.radius} km`}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) =>
            setRadius(draft.radius + (event.nativeEvent.actionName === 'increment' ? 0.5 : -0.5))
          }
          onLayout={(event: LayoutChangeEvent) => {
            trackWidth.current = event.nativeEvent.layout.width;
          }}
          style={{ height: 30, justifyContent: 'center', cursor: 'pointer' }}
        >
          <View
            pointerEvents="none"
            style={{ height: 5, backgroundColor: c.soft, borderRadius: 8 }}
          />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              top: 12,
              height: 5,
              width: `${position * 100}%`,
              backgroundColor: c.brand,
              borderRadius: 8,
            }}
          />
          <View
            pointerEvents="none"
            style={{ position: 'absolute', left: `${position * 100}%`, top: 3, marginLeft: -12 }}
          >
            <Artwork source={a.imgNutKeo} width={24} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {[0.5, 3, 5, 10].map((radius) => (
            <Pressable
              key={radius}
              accessibilityRole="button"
              accessibilityLabel={`Trong ${radius === 0.5 ? '500 m' : `${radius} km`}`}
              onPress={() => setRadius(radius)}
              hitSlop={8}
            >
              <T size={12} color={c.muted}>
                {radius === 0.5 ? '500 m' : `${radius} km`}
              </T>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <T size={16} weight="semibold">
          Giờ hoạt động
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(
            [
              ['all', 'Tất cả'],
              ['open', 'Đang mở cửa'],
              ['always', 'Mở 24 giờ'],
            ] as const
          ).map(([value, label]) =>
            chip(label, draft.hours === value, () =>
              setDraft((current) => ({ ...current, hours: value })),
            ),
          )}
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <T size={16} weight="semibold">
          Tình trạng tiếp nhận
        </T>
        {toggle(
          'Chỉ hiện điểm còn chỗ',
          'Ẩn các điểm đầy hoặc tạm ngừng nhận',
          draft.available,
          () => setDraft((current) => ({ ...current, available: !current.available })),
        )}
        {toggle('Có nhân viên hỗ trợ', 'Phù hợp khi cần hướng dẫn phân loại', draft.staffed, () =>
          setDraft((current) => ({ ...current, staffed: !current.staffed })),
        )}
      </View>
      <View
        style={{
          padding: 14,
          borderRadius: 14,
          backgroundColor: c.mint,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <Artwork source={a.imgInfo} width={20} />
        <View style={{ flex: 1, gap: 4 }}>
          <T weight="medium" color={c.brand}>
            Kết quả quanh Ngũ Hành Sơn
          </T>
          <T size={12} color={c.muted}>
            Tình trạng do cộng đồng cập nhật, có thể thay đổi khi bạn đến.
          </T>
        </View>
      </View>
    </CollectionPage>
  );
}
