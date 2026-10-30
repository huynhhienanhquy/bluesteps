import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../providers';
import { Artwork } from '../../design-system/DesignScreen';
import { LegacyCanvas } from '../../design-system/LegacyCanvas';
import { LegacyNavigation } from '../../design-system/LegacyNavigation';
import { collectionNavigationAssets } from '../../design-system/collection-navigation-assets';
import { CollectionText as T } from './CollectionPage';
import { CollectionMapStatus } from './CollectionMapParts';
const a = collectionNavigationAssets['386:10136'];

export function CollectionNavigationScreen() {
  const { point } = useLocalSearchParams<{ point?: string }>();
  const { selectedPoint } = useApp();
  const destination = point ?? selectedPoint;
  const [muted, setMuted] = useState(false);
  return (
    <LegacyCanvas statusHeight={50}>
      <Artwork
        source={a.imgMap}
        width={428}
        height={926}
        fit="cover"
        style={{ position: 'absolute', left: 0, top: 0 }}
      />
      <Artwork
        source={a.imgRectangle208}
        width={428}
        height={885}
        fit="cover"
        style={{
          position: 'absolute',
          left: 4,
          top: 0,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}
      />
      <CollectionMapStatus />
      <View
        style={{
          position: 'absolute',
          left: 11,
          top: 50,
          width: 405,
          height: 92,
          backgroundColor: '#147CC1',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderBottomRightRadius: 20,
        }}
      />
      <T
        accessibilityRole="header"
        size={16}
        weight="semibold"
        color="#000000"
        lineHeight={19}
        style={{ position: 'absolute', left: 66, top: 63 }}
      >
        Rẻ phải vào đường Lê Duẩn
      </T>
      <T color="#000000" lineHeight={17} style={{ position: 'absolute', left: 66, top: 101 }}>
        100m - 1 phút
      </T>
      <Artwork
        source={a.imgVector}
        width={16}
        height={16}
        style={{ position: 'absolute', left: 28, top: 66, transform: [{ rotate: '180deg' }] }}
      />
      <View
        style={{
          position: 'absolute',
          left: 11,
          top: 142,
          width: 133,
          height: 52,
          backgroundColor: '#075A9C',
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
          borderTopRightRadius: 20,
        }}
      />
      <T
        size={16}
        weight="semibold"
        color="#000000"
        lineHeight={19}
        style={{ position: 'absolute', left: 29, top: 159 }}
      >
        Sau đó
      </T>
      <Artwork
        source={a.imgVector1}
        width={16.1}
        height={16.1}
        style={{ position: 'absolute', left: 104, top: 158, transform: [{ rotate: '90.46deg' }] }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={muted ? 'Bật âm thanh chỉ đường' : 'Tắt âm thanh chỉ đường'}
        accessibilityState={{ selected: !muted }}
        onPress={() => setMuted(!muted)}
        style={{ position: 'absolute', left: 361, top: 194, width: 53, height: 53 }}
      >
        <Artwork source={a.imgFrame36724} width={53} height={53} />
        {muted ? (
          <View
            style={{
              position: 'absolute',
              width: 28,
              height: 2,
              backgroundColor: '#FFFFFF',
              left: 10,
              top: 22,
              transform: [{ rotate: '-45deg' }],
            }}
          />
        ) : null}
      </Pressable>
      <View style={{ position: 'absolute', left: 24, top: 590, width: 380, gap: 12 }}>
        {[
          {
            title: 'Tìm điểm thay thế',
            source: a.imgMapPin,
            arrow: a.imgChevronRight,
            path: '/collection-replacement' as const,
            primary: false,
          },
          {
            title: 'Đã đến nơi',
            source: a.imgCheckCircle,
            arrow: a.imgChevronRight1,
            path: '/collection-arrival' as const,
            primary: true,
          },
        ].map((action) => (
          <Pressable
            key={action.title}
            accessibilityRole="button"
            accessibilityLabel={action.title}
            onPress={() => router.push(`${action.path}?point=${destination}`)}
            style={{
              height: 56,
              paddingHorizontal: 15,
              backgroundColor: action.primary ? '#147CC1' : '#FFFFFF',
              borderWidth: action.primary ? 0 : 1,
              borderColor: '#DEEBF3',
              borderRadius: 18,
              flexDirection: 'row',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                backgroundColor: action.primary ? '#FFFFFF' : '#E5F3FC',
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Artwork source={action.source} width={18} />
            </View>
            <T weight="medium" color={action.primary ? '#FFFFFF' : '#172B3D'} style={{ flex: 1 }}>
              {action.title}
            </T>
            <Artwork source={action.arrow} width={20} />
          </Pressable>
        ))}
      </View>
      <View
        style={{
          position: 'absolute',
          left: 30,
          top: 740,
          width: 374,
          height: 92,
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: '#DADADA',
          borderRadius: 30,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 190,
          top: 751,
          width: 50,
          height: 3,
          backgroundColor: '#000000',
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dừng chỉ đường mẫu"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/collection'))}
        style={{ position: 'absolute', left: 50, top: 759, width: 56, height: 56 }}
      >
        <Artwork source={a.imgEllipse86} width={56} />
        <View
          style={{
            position: 'absolute',
            width: 23,
            height: 2.5,
            backgroundColor: '#1D1B20',
            left: 16.5,
            top: 26.75,
            transform: [{ rotate: '45deg' }],
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: 23,
            height: 2.5,
            backgroundColor: '#1D1B20',
            left: 16.5,
            top: 26.75,
            transform: [{ rotate: '-45deg' }],
          }}
        />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tìm tuyến thay thế"
        onPress={() => router.push('/collection-replacement')}
        style={{ position: 'absolute', left: 328, top: 759, width: 56, height: 56 }}
      >
        <Artwork source={a.imgEllipse87} width={56} />
        <Artwork
          source={a.imgShuffle}
          width={24.076}
          height={24.076}
          style={{
            position: 'absolute',
            left: 15.92,
            top: 15.92,
            transform: [{ rotate: '-90.1826deg' }],
          }}
        />
      </Pressable>
      <T
        size={24}
        weight="semibold"
        lineHeight={29}
        color="#000000"
        style={{ position: 'absolute', left: 179, top: 757 }}
      >
        5 phút
      </T>
      <T
        size={16}
        lineHeight={19}
        color="#DADADA"
        style={{ position: 'absolute', left: 169, top: 787 }}
      >
        2 km
      </T>
      <T
        size={16}
        lineHeight={19}
        color="#DADADA"
        style={{ position: 'absolute', left: 225, top: 787 }}
      >
        11:00
      </T>
      <LegacyNavigation selected="collection" handbook />
    </LegacyCanvas>
  );
}
