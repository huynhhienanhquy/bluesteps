import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../../providers';
import { Artwork } from '../../design-system/DesignScreen';
import { collectionNavigationAssets } from '../../design-system/collection-navigation-assets';
import { replacementPoints, findCollectionPoint } from '../../services/collection';
import {
  CollectionAction,
  CollectionPage,
  CollectionText as T,
  collectionColors as c,
} from './CollectionPage';
const a = collectionNavigationAssets['534:48869'];

export function CollectionReplacementScreen() {
  const { stops, setStops, setSelectedPoint } = useApp();
  const [selected, setSelected] = useState(replacementPoints[0]!.id);
  const current = findCollectionPoint(stops[0]);
  return (
    <CollectionPage
      title="Chọn điểm thay thế"
      source={a}
      footer={
        <>
          <CollectionAction
            title="Thay điểm dừng đầu tiên"
            onPress={() => {
              setStops([selected, ...stops.slice(1).filter((id) => id !== selected)]);
              setSelectedPoint(selected);
              router.replace('/journey');
            }}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/journey'))}
            style={{ alignItems: 'center' }}
          >
            <T weight="semibold" color={c.brand}>
              Giữ hành trình hiện tại
            </T>
          </Pressable>
        </>
      }
    >
      <View
        style={{
          padding: 14,
          backgroundColor: '#FFF6E5',
          borderRadius: 14,
          flexDirection: 'row',
          gap: 10,
        }}
      >
        <Artwork source={a.imgTriangleAlert} width={20} />
        <View style={{ flex: 1, gap: 4 }}>
          <T weight="medium" color="#92611C">
            Điểm dừng đầu tiên đã đầy
          </T>
          <T size={12} color={c.muted}>
            {current?.name ?? 'Công viên cộng đồng A'} tạm không nhận nhựa và giấy. Bạn có thể đổi
            sang một điểm trên đường đi.
          </T>
        </View>
      </View>
      <View
        style={{
          height: 140,
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
          height={140}
          fit="cover"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
        <Artwork source={a.imgMapPin} width={32} />
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 8 }}>
          <T size={12} color="#075A9C">
            Các điểm thay thế gần hành trình
          </T>
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <T size={16} weight="semibold">
          Vẫn nhận đủ nhựa và giấy
        </T>
        <T size={12} color={c.muted}>
          Quãng đường và thời gian tăng so với hành trình cũ
        </T>
        {replacementPoints.map((point) => (
          <View
            key={point.id}
            style={{
              padding: 15,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 20,
              backgroundColor: selected === point.id ? c.mint : '#FFFFFF',
              gap: 10,
            }}
          >
            <Pressable
              accessibilityRole="radio"
              accessibilityLabel={point.name}
              accessibilityState={{ checked: selected === point.id }}
              aria-checked={selected === point.id}
              onPress={() => setSelected(point.id)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderWidth: 1.5,
                  borderColor: selected === point.id ? c.brand : c.border,
                  backgroundColor: selected === point.id ? c.brand : '#FFFFFF',
                  borderRadius: 6,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {selected === point.id ? <Artwork source={a.imgCheck} width={15} /> : null}
              </View>
              <T style={{ flex: 1 }}>{point.name}</T>
            </Pressable>
            <T size={12} color={c.muted}>
              {point.address}
            </T>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <T size={16} weight="semibold" color={c.brand}>
                {point.extraDistance}
              </T>
              <T weight="medium" color={c.brand}>
                +{point.extraMinutes} phút
              </T>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {point.materials.map((material) => (
                <View
                  key={material}
                  style={{
                    height: 40,
                    paddingHorizontal: 13,
                    borderWidth: 1,
                    borderColor: c.border,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 24,
                    justifyContent: 'center',
                  }}
                >
                  <T weight="medium" color={c.muted}>
                    {material}
                  </T>
                </View>
              ))}
            </View>
            <T size={12} color={c.muted}>
              Còn chỗ • Mở đến 18:00
            </T>
          </View>
        ))}
      </View>
      <T size={12} color={c.muted}>
        Điểm dừng tiếp theo để bàn giao pin được giữ nguyên. Hãy kiểm tra tình trạng tiếp nhận trước
        khi đi.
      </T>
    </CollectionPage>
  );
}
