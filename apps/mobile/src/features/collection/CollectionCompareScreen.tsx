import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../../providers';
import { Artwork } from '../../design-system/DesignScreen';
import { collectionFlowAssets } from '../../design-system/collection-flow-assets';
import { designPoints } from '../../services/collection';
import {
  CollectionAction,
  CollectionPage,
  CollectionText as T,
  collectionColors as c,
} from './CollectionPage';
const a = collectionFlowAssets['534:48505'];
export function CollectionCompareScreen() {
  const { selectedPoint, setSelectedPoint } = useApp();
  const [ids, setIds] = useState(['green-hub', 'paper-house']);
  const [picking, setPicking] = useState(false);
  const [columnsWidth, setColumnsWidth] = useState(380);
  const selected = ids.includes(selectedPoint) ? selectedPoint : ids[0]!;
  return (
    <CollectionPage
      title="So sánh điểm thu gom"
      source={a}
      footer={
        <>
          <CollectionAction
            title="Chỉ đường đến điểm đã chọn"
            onPress={() => {
              setSelectedPoint(selected);
              router.push(`/journey?point=${selected}`);
            }}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => setPicking(true)}
            style={{ alignItems: 'center' }}
          >
            <T weight="semibold" color={c.brand}>
              Thay đổi điểm so sánh
            </T>
          </Pressable>
        </>
      }
    >
      <T color={c.muted}>2 điểm gần bạn • cùng nhận nhựa và giấy</T>
      <View
        onLayout={(event) => setColumnsWidth(event.nativeEvent.layout.width)}
        style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}
      >
        {ids.map((id) => {
          const point = designPoints.find((point) => point.id === id)!;
          const checked = selected === id;
          return (
            <View
              key={id}
              style={{
                width: (columnsWidth - 12) / 2 + (checked ? 1 : -1),
                borderRadius: 18,
                borderWidth: checked ? 2 : 1,
                borderColor: checked ? c.brand : c.border,
                backgroundColor: checked ? c.mint : '#FFFFFF',
                padding: checked ? 10 : 11,
                gap: 16,
              }}
            >
              <Artwork
                source={a.imgNhMinhHa}
                width={160}
                height={92}
                fit="cover"
                style={{ width: '100%', borderRadius: 16 }}
              />
              <View style={{ gap: 6, height: 98 }}>
                <T size={16} weight="semibold">
                  {point.name}
                </T>
                <T size={12} color={c.muted}>
                  {id === 'green-hub'
                    ? '460 Trần Đại Nghĩa, Đà Nẵng'
                    : id === 'paper-house'
                      ? '120 Lê Văn Hiến, Đà Nẵng'
                      : point.address}
                </T>
              </View>
              <View style={{ gap: 5 }}>
                <T size={12} color={c.muted}>
                  Khoảng cách
                </T>
                <T size={16} weight="semibold">
                  {Math.round(point.distance * 1000)} m · {point.minutes} phút
                </T>
                <T size={12} color={c.muted}>
                  Đi bộ từ vị trí của bạn
                </T>
              </View>
              <View style={{ gap: 5, height: 62 }}>
                <T size={12} color={c.muted}>
                  Giờ mở cửa
                </T>
                <T>{point.hours}</T>
              </View>
              <View style={{ gap: 5, height: 82 }}>
                <T size={12} color={c.muted}>
                  Tiếp nhận
                </T>
                <T>
                  {id === 'green-hub'
                    ? 'Nhựa, giấy, kim loại, hữu cơ'
                    : id === 'paper-house'
                      ? 'Nhựa, giấy, thủy tinh, pin'
                      : point.materials.join(', ')}
                </T>
              </View>
              <View style={{ gap: 5, height: 62 }}>
                <T size={12} color={c.muted}>
                  Tiếp nhận hiện tại
                </T>
                <T weight="medium" color={c.brand}>
                  {point.available ? 'Còn chỗ' : 'Tạm ngừng'}
                </T>
              </View>
              <Pressable
                accessibilityRole="radio"
                accessibilityLabel={point.name}
                accessibilityState={{ checked }}
                aria-checked={checked}
                onPress={() => setSelectedPoint(id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 1.5,
                    borderColor: checked ? c.brand : c.border,
                    backgroundColor: checked ? c.brand : '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {checked ? <Artwork source={a.imgCheck} width={15} /> : null}
                </View>
                <T style={{ flex: 1 }}>{checked ? 'Đã chọn' : 'Chọn điểm này'}</T>
              </Pressable>
            </View>
          );
        })}
      </View>
      <View
        style={{
          padding: 14,
          backgroundColor: c.mint,
          borderRadius: 14,
          flexDirection: 'row',
          gap: 10,
        }}
      >
        <Artwork source={a.imgInfo} width={20} />
        <View style={{ flex: 1, gap: 4 }}>
          <T weight="medium" color={c.brand}>
            Gợi ý cho túi rác của bạn
          </T>
          <T size={12} color={c.muted}>
            Công viên cộng đồng A gần hơn. Nếu mang pin, hãy chọn Trạm xanh Hòa Hải.
          </T>
        </View>
      </View>
      <Modal
        transparent
        visible={picking}
        animationType="fade"
        onRequestClose={() => setPicking(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng lựa chọn điểm"
            onPress={() => setPicking(false)}
            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(22,69,97,.24)' }}
          />
          <View
            style={{
              width: '100%',
              maxWidth: 428,
              maxHeight: '80%',
              backgroundColor: '#FFFFFF',
              padding: 24,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              gap: 16,
            }}
          >
            <T accessibilityRole="header" size={22} weight="bold" lineHeight={28}>
              Chọn 2 điểm so sánh
            </T>
            <ScrollView contentContainerStyle={{ gap: 12 }}>
              {designPoints.map((point) => (
                <Pressable
                  key={point.id}
                  accessibilityRole="checkbox"
                  accessibilityLabel={point.name}
                  accessibilityState={{ checked: ids.includes(point.id) }}
                  aria-checked={ids.includes(point.id)}
                  onPress={() =>
                    setIds((current) =>
                      current.includes(point.id)
                        ? current.length > 1
                          ? current.filter((id) => id !== point.id)
                          : current
                        : current.length < 2
                          ? [...current, point.id]
                          : [current[0]!, point.id],
                    )
                  }
                  style={{
                    padding: 16,
                    backgroundColor: ids.includes(point.id) ? c.soft : '#F4FBFF',
                    borderRadius: 14,
                  }}
                >
                  <T weight="semibold">{point.name}</T>
                  <T size={12} color={c.muted}>
                    {point.materials.join(' · ')}
                  </T>
                </Pressable>
              ))}
            </ScrollView>
            <CollectionAction
              title="Xem so sánh"
              disabled={ids.length !== 2}
              onPress={() => {
                if (!ids.includes(selectedPoint)) setSelectedPoint(ids[0]!);
                setPicking(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </CollectionPage>
  );
}
