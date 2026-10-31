import { useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { rewardsAssets } from '../../design-system/rewards-assets';
import source from './rewards-design-data.json';

import {
  DesignFrameLayers,
  type FrameData,
  type DesignLayer as RewardLayer,
  type ImageReplacement,
} from '../../design-system/DesignFrameLayers';
export type RewardFrame = keyof typeof rewardsAssets;
export type { DesignLayer as RewardLayer } from '../../design-system/DesignFrameLayers';
export const rewardDesign = source as unknown as Record<RewardFrame, FrameData>;
export const rewardSource = (frame: string, key: string) =>
  (rewardsAssets[frame as RewardFrame] as Record<string, number>)[key]!;
export function RewardLayers(props: {
  frame: RewardFrame;
  layers?: RewardLayer[];
  offsetY?: number;
  replaceText?: (layer: RewardLayer) => string | undefined;
  replaceImage?: (layer: RewardLayer) => ImageReplacement | undefined;
}) {
  return (
    <DesignFrameLayers
      {...props}
      layers={props.layers ?? rewardDesign[props.frame].layers}
      assets={rewardsAssets[props.frame]}
    />
  );
}
export function RewardHit({
  label,
  box,
  onPress,
  role = 'button',
  selected,
  disabled,
}: {
  label: string;
  box: readonly number[];
  onPress: () => void;
  role?: 'button' | 'tab' | 'radio';
  selected?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        position: 'absolute',
        left: box[0],
        top: box[1],
        width: box[2],
        height: box[3],
        borderRadius: 10,
        backgroundColor: pressed ? 'rgba(20,124,193,.12)' : 'transparent',
      })}
    />
  );
}

export function RewardsCanvas({
  frame,
  children,
  footer = true,
  fixed = false,
  contentHeight,
  replaceText,
  replaceImage,
}: {
  frame: RewardFrame;
  children?: ReactNode;
  footer?: boolean;
  fixed?: boolean;
  contentHeight?: number;
  replaceText?: (layer: RewardLayer) => string | undefined;
  replaceImage?: (layer: RewardLayer) => ImageReplacement | undefined;
}) {
  const [width, setWidth] = useState(428),
    s = width / 428,
    insets = useSafeAreaInsets();
  const data = rewardDesign[frame];
  const nav = footer && data.layers.some((l) => l.navigation);
  const status = Platform.OS === 'web' ? 0 : 51;
  const body = data.layers.filter((l) => fixed || !nav || !l.navigation);
  const height = Math.max(data.height, contentHeight ?? data.height);
  const content = (
    <View style={{ width, height: (height - status) * s, overflow: 'hidden' }}>
      <View
        style={{
          position: 'absolute',
          top: -status * s,
          left: 0,
          width: 428,
          height,
          transformOrigin: 'top left',
          transform: [{ scale: s }],
        }}
      >
        <RewardLayers
          frame={frame}
          layers={body}
          replaceText={replaceText}
          replaceImage={replaceImage}
        />
        {children}
      </View>
    </View>
  );
  return (
    <View
      testID={`rewards-frame-${frame}`}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        flex: 1,
        backgroundColor: frame === '386:12064' ? '#F4F4F4' : '#F7F7F7',
        paddingTop: Platform.OS === 'web' ? 0 : insets.top,
      }}
    >
      <ScrollView
        key={frame}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!fixed}
        contentContainerStyle={{ minHeight: '100%' }}
      >
        {content}
      </ScrollView>
      {nav && !fixed ? (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 116 * s + insets.bottom,
          }}
        >
          <View
            pointerEvents="box-none"
            style={{
              width: 428,
              height: 116,
              transformOrigin: 'top left',
              transform: [{ scale: s }],
            }}
          >
            <RewardLayers
              frame={frame}
              layers={data.layers.filter((l) => l.navigation)}
              offsetY={810}
            />
            <RewardNavigation />
          </View>
        </View>
      ) : null}
    </View>
  );
}
export function RewardNavigation({ offset = 0 }: { offset?: number }) {
  return (
    <>
      {(
        [
          ['Trang chủ', '/', 24, 56, 60, 50],
          ['Thu gom', '/collection', 105, 56, 60, 50],
          ['Đổi quà', '/rewards', 264, 50, 64, 56],
          ['Cá nhân', '/profile', 350, 56, 60, 50],
          ['Quét rác', '/scan', 176, 0, 77, 78],
        ] as const
      ).map(([label, path, x, y, w, h]) => (
        <RewardHit
          key={label}
          label={label}
          role="tab"
          selected={label === 'Đổi quà'}
          box={[x, y + offset, w, h]}
          onPress={() => router.replace(path as Href)}
        />
      ))}
    </>
  );
}
