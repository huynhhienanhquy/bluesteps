import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { DesignFrameCanvas, DesignFrameAction as Hit } from '../../design-system/DesignFrameCanvas';
import { DesignFrameLayers, type FrameData } from '../../design-system/DesignFrameLayers';
import { finalAssets } from '../../design-system/final-assets';
import source from './final-design-data.json';

export type FinalFrame = keyof typeof finalAssets;
export const finalData = source as unknown as Record<
  FinalFrame,
  FrameData & { navigationTop: number | null }
>;
const links = [
  ['Tin tức', '/articles', 69],
  ['Bài Đăng', '/community', 104],
  ['Thống kê', '/statistics', 139],
  ['Sổ Tay', '/handbook', 174],
] as const;

export function BackupedNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const [width, setWidth] = useState(179);
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ width: 179, height: 218, overflow: 'hidden', borderRadius: 15 }}
    >
      <View
        style={{
          width: 179,
          height: 218,
          transformOrigin: 'top left',
          transform: [{ scale: width / 179 }],
        }}
      >
        <DesignFrameLayers
          frame="386:8558"
          layers={finalData['386:8558'].layers}
          assets={finalAssets['386:8558']}
        />
        <Hit
          label="Hồ sơ Healing"
          box={[10, 9, 150, 48]}
          onPress={() => {
            onNavigate?.();
            router.push('/profile');
          }}
        />
        {links.map(([label, route, y]) => (
          <Hit
            key={route}
            label={label}
            box={[13, y, 157, 25]}
            onPress={() => {
              onNavigate?.();
              router.push(route as Href);
            }}
          />
        ))}
      </View>
    </View>
  );
}

export function BackupedPreviewScreen() {
  const params = useLocalSearchParams<{ frame?: string }>();
  const frame: FinalFrame =
    params.frame && params.frame in finalAssets ? (params.frame as FinalFrame) : '386:18473';
  return (
    <DesignFrameCanvas
      frame={frame}
      data={finalData[frame]}
      assets={finalAssets[frame]}
      fixed
      nativeStatusHeight={frame === '386:8558' || frame === '386:17297' ? 0 : 54}
      backdrop={frame === '386:17297' ? '#F5F5F5' : undefined}
    >
      {frame === '386:8558'
        ? links.map(([label, route, y]) => (
            <Hit
              key={route}
              label={label}
              box={[13, y, 157, 25]}
              onPress={() => router.push(route as Href)}
            />
          ))
        : null}
    </DesignFrameCanvas>
  );
}

export function BackupedStatisticsScreen() {
  const params = useLocalSearchParams<{ preview?: string }>();
  const frame = '391:25009';
  return (
    <DesignFrameCanvas
      frame={frame}
      data={finalData[frame]}
      assets={finalAssets[frame]}
      selectedTab="Cá nhân"
      fixed={params.preview === '1'}
    >
      <Hit
        label="Quay lại"
        box={[14, 74, 44, 44]}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}
      />
      <Hit
        label="Xem thành tích"
        box={[32, 930, 364, 65]}
        onPress={() => router.push('/achievements')}
      />
      <Hit label="Xem thử thách" box={[32, 1006, 364, 65]} onPress={() => router.push('/events')} />
      <Hit
        label="Tìm điểm thu gom"
        box={[32, 1082, 364, 65]}
        onPress={() => router.push('/collection')}
      />
      <Hit
        label="Tìm hiểu Hữu cơ"
        box={[32, 1365, 364, 58]}
        onPress={() => router.push('/handbook/category/organic')}
      />
      <Hit
        label="Tìm hiểu Nhựa"
        box={[32, 1433, 364, 58]}
        onPress={() => router.push('/handbook/category/recycle')}
      />
      <Hit
        label="Tìm hiểu Tái chế"
        box={[32, 1501, 364, 58]}
        onPress={() => router.push('/handbook/category/recycle')}
      />
    </DesignFrameCanvas>
  );
}
