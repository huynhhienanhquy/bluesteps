import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../providers';
import { Artwork } from '../../design-system/DesignScreen';
import { collectionFlowAssets } from '../../design-system/collection-flow-assets';
import { designPoints, findCollectionPoint, type DesignPoint } from '../../services/collection';
import {
  CollectionAction,
  CollectionPage,
  CollectionSheet,
  CollectionText as T,
  collectionColors as c,
} from './CollectionPage';

const a = collectionFlowAssets['534:48774'];
const pointById = findCollectionPoint;
const materialNames = ['Nhựa', 'Giấy, bìa', 'Pin đã dùng'];

function StopCard({
  point,
  index,
  caption,
  handoff,
  onRemove,
  onMove,
  onArrange,
}: {
  point: DesignPoint;
  index: number;
  caption: string;
  handoff: string;
  onRemove: () => void;
  onMove: (index: number, delta: number) => void;
  onArrange: () => void;
}) {
  const [drag, setDrag] = useState(0);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8,
        onPanResponderMove: (_, gesture) => setDrag(gesture.dy),
        onPanResponderRelease: (_, gesture) => {
          setDrag(0);
          if (Math.abs(gesture.dy) < 8) onArrange();
          else onMove(index, Math.round(gesture.dy / 116));
        },
        onPanResponderTerminate: () => setDrag(0),
      }),
    [index, onMove, onArrange],
  );
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 20,
        padding: 15,
        gap: 10,
        backgroundColor: '#FFFFFF',
        transform: [{ translateY: drag }],
        zIndex: drag ? 1 : 0,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 30,
            height: 30,
            backgroundColor: c.brand,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <T weight="semibold" color="#FFFFFF">
            {index + 1}
          </T>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <T size={16} weight="semibold">
            {point.name}
          </T>
          <T size={12} color={c.muted}>
            {caption}
          </T>
        </View>
        <View {...pan.panHandlers}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Sắp xếp ${point.name}`}
            accessibilityActions={[
              { name: 'increment', label: 'Chuyển xuống' },
              { name: 'decrement', label: 'Chuyển lên' },
            ]}
            onAccessibilityAction={(event) =>
              onMove(index, event.nativeEvent.actionName === 'increment' ? 1 : -1)
            }
            onPress={onArrange}
            hitSlop={8}
          >
            <View pointerEvents="none">
              <Artwork source={a.imgGripVertical} width={18} />
            </View>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Xóa ${point.name}`}
          onPress={onRemove}
          hitSlop={8}
        >
          <Artwork source={require('../../../assets/figma/common/journey-close.svg')} width={18} />
        </Pressable>
      </View>
      <T weight="medium" color={c.brand}>
        {handoff}
      </T>
    </View>
  );
}

export function JourneyScreen() {
  const { stops, setStops } = useApp();
  const { point: pointParam } = useLocalSearchParams<{ point?: string }>();
  const [materials, setMaterials] = useState(materialNames);
  const [sheet, setSheet] = useState<'add' | 'origin' | 'start' | null>(null);
  const [arrange, setArrange] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');
  const [draftOrigin, setDraftOrigin] = useState('');
  const [guidance, setGuidance] = useState(false);
  const appliedPoint = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (pointParam && pointById(pointParam) && appliedPoint.current !== pointParam) {
      appliedPoint.current = pointParam;
      setStops([pointParam, ...stops.filter((id) => id !== pointParam)]);
    }
  }, [pointParam, stops, setStops]);
  const points = stops.flatMap((id) => {
    const point = pointById(id);
    return point ? [point] : [];
  });
  const move = useCallback(
    (index: number, delta: number) => {
      const target = Math.max(0, Math.min(stops.length - 1, index + delta));
      if (target === index) return;
      const next = [...stops];
      const item = next.splice(index, 1)[0];
      if (!item) return;
      next.splice(target, 0, item);
      setStops(next);
    },
    [stops, setStops],
  );
  const sourceRoute =
    points.length === 2 &&
    ['green-hub', 'tan-tra', 'khue-my'].includes(points[0]?.id ?? '') &&
    points[1]?.id === 'paper-house' &&
    !origin;
  const extra = points[0]?.id === 'tan-tra' ? 0.45 : points[0]?.id === 'khue-my' ? 0.9 : 0;
  const distance = sourceRoute
    ? 1.8 + extra
    : points.reduce((total, point) => total + point.distance, 0);
  const minutes = sourceRoute
    ? 8 + (extra === 0.45 ? 3 : extra === 0.9 ? 5 : 0)
    : Math.max(1, Math.round(distance * 4.5));
  return (
    <CollectionPage
      title="Hành trình thu gom"
      source={a}
      footer={
        <CollectionAction
          title={`Bắt đầu hành trình • ${points.length} điểm`}
          disabled={!points.length}
          onPress={() => {
            setGuidance(false);
            setSheet('start');
          }}
        />
      }
    >
      <View style={{ gap: 12 }}>
        <T size={16} weight="semibold">
          Hôm nay bạn mang theo gì?
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {materialNames.map((material) => {
            const checked = materials.includes(material);
            return (
              <Pressable
                key={material}
                accessibilityRole="checkbox"
                accessibilityLabel={material}
                accessibilityState={{ checked }}
                aria-checked={checked}
                onPress={() =>
                  setMaterials((current) =>
                    current.includes(material)
                      ? current.filter((value) => value !== material)
                      : [...current, material],
                  )
                }
                style={{
                  height: 40,
                  paddingHorizontal: 13,
                  borderWidth: 1,
                  borderColor: checked ? c.brand : c.border,
                  backgroundColor: checked ? c.soft : '#FFFFFF',
                  borderRadius: 24,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {checked ? <Artwork source={a.imgCheck} width={14} /> : null}
                <T weight="medium" color={checked ? c.brand : c.muted}>
                  {material}
                </T>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View
        style={{
          height: 170,
          borderRadius: 16,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Artwork
          source={a.imgXemTrcBnD}
          width={380}
          height={170}
          fit="cover"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
        <Artwork source={a.imgMapPin} width={32} />
        <View style={{ padding: 8, backgroundColor: '#FFFFFF', borderRadius: 10 }}>
          <T size={12} color="#075A9C">
            {origin || 'Vị trí của bạn'}
            {points.map((_, index) => ` → ${index + 1}`).join('')}
          </T>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <Artwork source={a.imgLocateFixed} width={22} />
        <T style={{ flex: 1 }}>
          {origin ? `Khởi hành từ ${origin}` : 'Khởi hành từ vị trí hiện tại'}
        </T>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đổi vị trí khởi hành"
          onPress={() => {
            setDraftOrigin(origin);
            setSheet('origin');
          }}
          hitSlop={8}
        >
          <T weight="semibold" color={c.brand}>
            Đổi
          </T>
        </Pressable>
      </View>
      <View style={{ gap: 12 }}>
        <T size={16} weight="semibold">
          Điểm dừng theo thứ tự
        </T>
        {!points.length ? (
          <T color={c.muted}>Chưa có điểm dừng. Thêm điểm thu gom để lập hành trình.</T>
        ) : null}
        {points.map((point, index) => {
          const compatible = materials.filter(
            (material) =>
              point.materials.includes(material) &&
              !points.slice(0, index).some((previous) => previous.materials.includes(material)),
          );
          const caption =
            sourceRoute && index === 1
              ? 'Thêm 1,6 km • Mở đến 18:00'
              : `${index ? 'Thêm ' : ''}${point.distance < 1 ? `${Math.round(point.distance * 1000)} m` : `${point.distance.toLocaleString('vi')} km`}${index ? '' : ' từ bạn'} • ${point.hours}`;
          const handoff = compatible.length
            ? `Bàn giao ${compatible.map((material) => (material === 'Giấy, bìa' ? 'giấy' : material.toLocaleLowerCase('vi'))).join(' và ')}`
            : 'Chọn vật liệu phù hợp để bàn giao';
          return (
            <StopCard
              key={point.id}
              point={point}
              index={index}
              caption={caption}
              handoff={handoff}
              onRemove={() => setStops(stops.filter((id) => id !== point.id))}
              onMove={move}
              onArrange={() => setArrange(point.id)}
            />
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thêm điểm dừng"
          onPress={() => setSheet('add')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          <Artwork source={require('../../../assets/figma/common/journey-plus.svg')} width={24} />
          <T weight="semibold" color={c.brand}>
            Thêm điểm dừng
          </T>
          <T size={12} color={c.muted} style={{ flex: 1 }}>
            Kéo ⋮⋮ để đổi thứ tự
          </T>
        </Pressable>
      </View>
      <View
        style={{
          padding: 15,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 20,
          backgroundColor: c.mint,
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <View style={{ gap: 3 }}>
          <T size={16} weight="semibold">
            {distance.toLocaleString('vi', { maximumFractionDigits: 2 })} km
          </T>
          <T size={12} color={c.muted}>
            Tổng quãng đường
          </T>
        </View>
        <View style={{ gap: 3, flexShrink: 1 }}>
          <T size={16} weight="semibold">
            {points.length ? minutes : 0} phút
          </T>
          <T size={12} color={c.muted}>
            Đi xe máy, chưa tính bàn giao
          </T>
        </View>
      </View>
      {sheet === 'add' ? (
        <CollectionSheet title="Thêm điểm dừng" onClose={() => setSheet(null)}>
          {designPoints
            .filter((point) => !stops.includes(point.id))
            .map((point) => (
              <Pressable
                key={point.id}
                accessibilityRole="button"
                accessibilityLabel={`Thêm ${point.name}`}
                onPress={() => {
                  setStops([...stops, point.id]);
                  setSheet(null);
                }}
                style={{ padding: 16, borderRadius: 16, backgroundColor: c.mint, gap: 4 }}
              >
                <T weight="semibold">{point.name}</T>
                <T size={12} color={c.muted}>
                  {point.materials.join(' · ')}
                </T>
              </Pressable>
            ))}
          {stops.length === designPoints.length ? (
            <T>Đã thêm tất cả điểm thu gom trong bản mẫu.</T>
          ) : null}
        </CollectionSheet>
      ) : null}
      {arrange ? (
        <CollectionSheet
          title={`Sắp xếp ${pointById(arrange)?.name ?? 'điểm dừng'}`}
          onClose={() => setArrange(null)}
        >
          <CollectionAction
            title="Chuyển lên"
            disabled={stops.indexOf(arrange) <= 0}
            onPress={() => move(stops.indexOf(arrange), -1)}
          />
          <CollectionAction
            title="Chuyển xuống"
            disabled={stops.indexOf(arrange) >= stops.length - 1}
            onPress={() => move(stops.indexOf(arrange), 1)}
          />
          <CollectionAction title="Xong" onPress={() => setArrange(null)} />
        </CollectionSheet>
      ) : null}
      {sheet === 'origin' ? (
        <CollectionSheet title="Đổi vị trí khởi hành" onClose={() => setSheet(null)}>
          <T size={12} color={c.muted}>
            Địa chỉ được lưu trong phiên mẫu; chưa tra cứu tọa độ hoặc lấy GPS thiết bị.
          </T>
          <TextInput
            accessibilityLabel="Địa điểm khởi hành"
            value={draftOrigin}
            onChangeText={setDraftOrigin}
            placeholder="Nhập địa điểm khởi hành"
            style={{
              minHeight: 48,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 14,
              padding: 12,
              fontFamily: 'BackupInter_400Regular',
              fontSize: 14,
              color: c.ink,
            }}
          />
          <CollectionAction
            title="Lưu vị trí khởi hành"
            disabled={!draftOrigin.trim()}
            onPress={() => {
              setOrigin(draftOrigin.trim());
              setSheet(null);
            }}
          />
          <CollectionAction
            title="Dùng vị trí hiện tại trong bản mẫu"
            onPress={() => {
              setOrigin('');
              setSheet(null);
            }}
          />
        </CollectionSheet>
      ) : null}
      {sheet === 'start' ? (
        <CollectionSheet title="Hành trình mẫu đã sẵn sàng" onClose={() => setSheet(null)}>
          <T>Bản đồ, quãng đường và thời gian là dữ liệu minh họa; chưa có dẫn đường trực tiếp.</T>
          <CollectionAction
            title="Xem chỉ đường mẫu"
            onPress={() => {
              setSheet(null);
              router.push(`/collection-navigation?point=${points[0]!.id}`);
            }}
          />
          {points.map((point, index) => (
            <T key={point.id} weight="semibold">
              {index + 1}. {point.name}
            </T>
          ))}
          <CollectionAction title="Xem hướng dẫn bàn giao" onPress={() => setGuidance(true)} />
          {guidance ? (
            <View style={{ gap: 8 }}>
              <T weight="semibold">Trước khi bàn giao</T>
              <T>1. Kiểm tra loại vật liệu và giờ tiếp nhận.</T>
              <T>2. Tách riêng vật liệu nguy hại.</T>
              <T>3. Trao đổi với người phụ trách điểm.</T>
            </View>
          ) : null}
        </CollectionSheet>
      ) : null}
    </CollectionPage>
  );
}
