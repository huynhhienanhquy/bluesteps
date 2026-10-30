import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../providers';
import { Artwork } from '../../design-system/DesignScreen';
import { collectionNavigationAssets } from '../../design-system/collection-navigation-assets';
import { findCollectionPoint, designPoints } from '../../services/collection';
import {
  CollectionAction,
  CollectionPage,
  CollectionSheet,
  CollectionText as T,
  collectionColors as c,
} from './CollectionPage';
const a = collectionNavigationAssets['534:48955'];
const tasks = [
  'Tách riêng nhựa, giấy và các loại khác',
  'Đổ hết chất lỏng, làm sạch bao bì',
  'Bỏ đúng ngăn theo nhãn tại điểm',
];

export function CollectionArrivalScreen() {
  const { point: param } = useLocalSearchParams<{ point?: string }>();
  const { selectedPoint, stops, setStops, setSelectedPoint } = useApp();
  const point = findCollectionPoint(param ?? selectedPoint) ?? designPoints[0]!;
  const [checked, setChecked] = useState([true, true, false]);
  const [attempted, setAttempted] = useState(false);
  const [done, setDone] = useState(false);
  const [sheet, setSheet] = useState<'done' | 'contact' | null>(null);
  const original = point.id === 'green-hub';
  const next = stops.find((id) => id !== point.id);
  return (
    <CollectionPage
      title="Hướng dẫn bàn giao"
      source={a}
      footer={
        <>
          <CollectionAction
            title={done ? 'Đã xác nhận trong phiên mẫu' : 'Tôi đã bàn giao xong'}
            onPress={() => {
              setAttempted(true);
              if (checked.every(Boolean)) {
                setDone(true);
                setSheet('done');
              }
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tiếp tục đến điểm tiếp theo"
            onPress={() => {
              if (next) {
                setStops(stops.filter((id) => id !== point.id));
                setSelectedPoint(next);
                router.replace(`/collection-directions?point=${next}`);
              } else router.replace('/collection');
            }}
            style={{
              height: 50,
              borderWidth: 1,
              borderColor: c.brand,
              borderRadius: 18,
              backgroundColor: '#FFFFFF',
              boxShadow: '0px 4px 4px rgba(0,0,0,.25), 0px 5px 2px rgba(89,183,96,.25)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <T size={15} weight="semibold" color={c.brand} lineHeight={18}>
              Tiếp tục đến điểm tiếp theo
            </T>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/point-report?point=${point.id}`)}
            style={{ alignItems: 'center' }}
          >
            <T weight="semibold" color={c.brand}>
              Báo cáo vấn đề tại điểm này
            </T>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/collection')}
            style={{ alignItems: 'center' }}
          >
            <T weight="semibold" color={c.brand}>
              Về bản đồ
            </T>
          </Pressable>
        </>
      }
    >
      <View style={{ alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 64,
            height: 64,
            backgroundColor: c.soft,
            borderRadius: 32,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Artwork source={a.imgMapPinCheck} width={32} />
        </View>
        <T size={24} weight="bold" lineHeight={29} color={c.brand}>
          Bạn đã đến nơi!
        </T>
        <T size={16} weight="semibold" style={{ alignSelf: 'stretch' }}>
          {point.name}
        </T>
        <T color={c.muted} style={{ alignSelf: 'stretch' }}>
          {original ? '460 Trần Đại Nghĩa, Ngũ Hành Sơn, Đà Nẵng' : point.address}
        </T>
      </View>
      <View
        style={{
          height: 160,
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
          height={160}
          fit="cover"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
        <Artwork source={a.imgMapPin} width={32} />
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 8 }}>
          <T size={12} color="#075A9C">
            {original
              ? 'Cổng chính → khu phân loại bên phải'
              : 'Kiểm tra hướng dẫn tại điểm thu gom'}
          </T>
        </View>
      </View>
      <View
        style={{
          padding: 15,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.mint,
          borderRadius: 20,
          flexDirection: 'row',
          gap: 10,
        }}
      >
        <Artwork source={a.imgDoorOpen} width={22} />
        <View style={{ flex: 1, gap: 5 }}>
          <T size={16} weight="semibold">
            {original ? 'Vào từ cổng đường Trần Đại Nghĩa' : 'Tìm khu tiếp nhận tại điểm thu gom'}
          </T>
          <T>
            {original
              ? 'Đi khoảng 20 m, khu tiếp nhận nằm bên phải, cạnh bảng hướng dẫn phân loại.'
              : 'Kiểm tra bảng hướng dẫn và trao đổi với người phụ trách trước khi bàn giao.'}
          </T>
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <T size={16} weight="semibold">
          Trước khi bàn giao
        </T>
        <View
          style={{ padding: 15, borderWidth: 1, borderColor: c.border, borderRadius: 20, gap: 10 }}
        >
          {tasks.map((task, index) => (
            <Pressable
              key={task}
              accessibilityRole="checkbox"
              accessibilityLabel={task}
              accessibilityState={{ checked: checked[index] }}
              aria-checked={checked[index]}
              onPress={() =>
                setChecked((current) => current.map((value, i) => (i === index ? !value : value)))
              }
              style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderWidth: 1.5,
                  borderColor: checked[index] ? c.brand : c.border,
                  backgroundColor: checked[index] ? c.brand : '#FFFFFF',
                  borderRadius: 6,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {checked[index] ? <Artwork source={a.imgCheck} width={15} /> : null}
              </View>
              <T style={{ flex: 1 }}>{task}</T>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
          <Artwork source={a.imgVector31} width={20.31} height={20.31} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <T size={16} weight="semibold">
            Cần người hướng dẫn?
          </T>
          <T size={12} color={c.muted}>
            Liên hệ quản lý điểm thu gom
          </T>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Gọi quản lý điểm thu gom"
          onPress={() => setSheet('contact')}
          hitSlop={8}
        >
          <T weight="semibold" color={c.brand}>
            Gọi
          </T>
        </Pressable>
      </View>
      <T size={12} color={c.muted}>
        Chỉ xác nhận hoàn tất sau khi bạn đã bàn giao rác đúng nơi quy định.
      </T>
      {attempted && !checked.every(Boolean) ? (
        <T accessibilityRole="alert" color="#B42318">
          Hoàn thành các mục kiểm tra trước khi xác nhận bàn giao.
        </T>
      ) : null}
      {sheet === 'done' ? (
        <CollectionSheet title="Đã xác nhận trong phiên mẫu" onClose={() => setSheet(null)}>
          <T>
            Xác nhận do bạn tự thực hiện, chưa xác minh vị trí hoặc bàn giao với điểm thu gom. Không
            cộng điểm thưởng.
          </T>
          <CollectionAction title="Xong" onPress={() => setSheet(null)} />
        </CollectionSheet>
      ) : null}
      {sheet === 'contact' ? (
        <CollectionSheet title="Liên hệ quản lý điểm thu gom" onClose={() => setSheet(null)}>
          <T>
            Ứng dụng chưa kết nối số điện thoại đã xác minh của đơn vị quản lý. Hãy xem bảng thông
            tin tại điểm thu gom.
          </T>
        </CollectionSheet>
      ) : null}
    </CollectionPage>
  );
}
