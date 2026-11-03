import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Artwork } from '../../design-system/DesignScreen';
import { eventCollectionNavigationArtwork as a } from '../../design-system/event-flow-artwork';

// Effective bounds of the original 534:49942 navigation layers, including SVG strokes.
const layers = [
  ['bridge', 170.6, 47.31, 91.48, 64.69],
  ['profileHead', 367.65, 61.41, 10.79, 10.81],
  ['profile', 359.56, 56, 27.01, 27.04],
  ['rewardBottom', 279.05, 67.44, 26.06, 16.32],
  ['rewardTop', 277.87, 55.28, 28.46, 27.8],
  ['locationBottom', 124.59, 61.9, 28.46, 24.31],
  ['locationTop', 125.45, 55.28, 26.74, 26.51],
  ['home', 45.52, 57.25, 28.51, 28.51],
  ['scanBackground', 174.5, 0, 80, 80.15],
  ['scan', 199.56, 21.24, 30.82, 30.89],
  ['gesture', 155.19, 103.65, 135.93, 2.56],
] as const;

export function EventCollectionNavigation() {
  const [width, setWidth] = useState(428);
  const insets = useSafeAreaInsets();
  const scale = width / 428;
  const bottom = Platform.OS === 'web' ? 0 : insets.bottom;
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ width: '100%', height: 112 * scale + bottom }}
    >
      <View
        style={{ width: 428, height: 112, transform: [{ scale }], transformOrigin: 'top left' }}
      >
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 37.65,
            width: 178.35,
            height: 74.35,
            borderTopRightRadius: 35,
            backgroundColor: '#147CC1',
          }}
        />
        <View
          style={{
            position: 'absolute',
            right: 0,
            top: 39.58,
            width: 178.35,
            height: 72.42,
            borderTopLeftRadius: 35,
            backgroundColor: '#147CC1',
          }}
        />
        {layers
          .filter(([key]) => Platform.OS === 'web' || key !== 'gesture')
          .map(([key, left, top, w, h]) => (
            <Artwork
              key={key}
              source={
                key === 'scanBackground' && Platform.OS !== 'web' ? a.scanBackgroundNative : a[key]
              }
              width={w}
              height={h}
              style={{ position: 'absolute', left, top }}
            />
          ))}
        {(
          [
            ['Trang chủ', '/', 29],
            ['Thu gom', '/collection', 111],
            ['Đổi quà', '/rewards', 264],
            ['Cá nhân', '/profile', 346],
          ] as const
        ).map(([label, target, left]) => (
          <Pressable
            key={label}
            accessibilityRole="tab"
            accessibilityLabel={label}
            onPress={() => router.replace(target)}
            style={{ position: 'absolute', left, top: 49, width: 58, height: 45 }}
          />
        ))}
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="Quét rác"
          onPress={() => router.push('/scan')}
          style={{ position: 'absolute', left: 174, top: 0, width: 80, height: 80 }}
        />
      </View>
      {bottom ? (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            height: bottom,
            width: '100%',
            backgroundColor: '#147CC1',
          }}
        />
      ) : null}
    </View>
  );
}
