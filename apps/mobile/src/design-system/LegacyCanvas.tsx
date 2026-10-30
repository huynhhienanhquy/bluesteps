import { useState, type PropsWithChildren } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Artwork } from './DesignScreen';

/** Preserve the original fixed canvas for older frames; scroll on shorter devices. */
export function LegacyCanvas({
  children,
  height = 926,
  background = '#FFFFFF',
  nativeStatus = true,
  statusHeight = 54,
}: PropsWithChildren<{
  height?: number;
  background?: string;
  nativeStatus?: boolean;
  statusHeight?: number;
}>) {
  const [width, setWidth] = useState(428);
  const insets = useSafeAreaInsets();
  const scale = width / 428;
  const status = Platform.OS === 'web' || !nativeStatus ? 0 : statusHeight;
  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{
        flex: 1,
        backgroundColor: background,
        paddingTop: Platform.OS === 'web' || !nativeStatus ? 0 : insets.top,
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          minHeight: '100%',
          paddingBottom: Platform.OS === 'web' || !nativeStatus ? 0 : insets.bottom,
        }}
      >
        <View style={{ width, height: (height - status) * scale, overflow: 'hidden' }}>
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: -status * scale,
              width: 428,
              height,
              transformOrigin: 'top left',
              transform: [{ scale }],
            }}
          >
            {children}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

type StatusAssets = {
  imgTime: number;
  imgMobileSignal: number;
  imgWifi: number;
  imgRectangle: number;
  imgCombinedShape: number;
  imgRectangle1: number;
};
export function LegacyStatusBar({ assets: a }: { assets: StatusAssets }) {
  if (Platform.OS !== 'web') return null;
  return (
    <View pointerEvents="none">
      <Artwork
        source={a.imgTime}
        width={52}
        height={21}
        style={{ position: 'absolute', left: 10, top: 23 }}
      />
      <Artwork
        source={a.imgMobileSignal}
        width={17}
        height={10.667}
        style={{ position: 'absolute', left: 334.666, top: 28.726 }}
      />
      <Artwork
        source={a.imgWifi}
        width={15.272}
        height={10.965}
        style={{ position: 'absolute', left: 356.693, top: 28.39 }}
      />
      <Artwork
        source={a.imgRectangle}
        width={22}
        height={11.333}
        style={{ position: 'absolute', left: 377, top: 28.393 }}
      />
      <Artwork
        source={a.imgCombinedShape}
        width={1.328}
        height={4}
        style={{ position: 'absolute', left: 400.002, top: 32.06 }}
      />
      <Artwork
        source={a.imgRectangle1}
        width={18}
        height={7.333}
        style={{ position: 'absolute', left: 379, top: 30.393 }}
      />
    </View>
  );
}
