import { Platform, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { Artwork } from './DesignScreen';
import type { ReactElement } from 'react';
type Run = {
  text: string;
  font: string;
  size: number;
  weight: string;
  color: string;
  lineHeight: { unit: string; value?: number };
};
export type DesignLayer = {
  kind: string;
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  key?: string;
  text?: string;
  runs?: Run[];
  align?: string;
  color?: string;
  radius?: number;
  opacity: number;
  rotation?: number;
  flipY?: boolean;
  nowrap?: boolean;
  decoration?: 'underline' | 'line-through';
  stroke?: string;
  strokeWeight?: number;
  corners?: number[];
  fit?: string;
  navigation?: boolean;
  status?: boolean;
  keyboard?: boolean;
  wallpaper?: boolean;
  heading?: boolean;
  crop?: { x: number; y: number; w: number; h: number };
  clip?: { x: number; y: number; w: number; h: number; corners?: number[] };
  effects?: {
    type: string;
    visible?: boolean;
    radius: number;
    color: { r: number; g: number; b: number; a: number };
    offset: { x: number; y: number };
  }[];
};
export type FrameData = { width: number; height: number; layers: DesignLayer[] };
export type ImageReplacement = number | { source: number; crop?: DesignLayer['crop'] };
const font = (r: Run) =>
  r.font === 'Poppins'
    ? r.weight === 'Bold'
      ? 'Poppins_700Bold'
      : r.weight === 'Light'
        ? 'Poppins_300Light'
        : r.weight === 'Medium'
          ? 'Poppins_500Medium'
          : 'Poppins_400Regular'
    : r.font === 'Roboto'
      ? r.weight === 'Medium'
        ? 'Roboto_500Medium'
        : 'Roboto_400Regular'
      : r.font === 'Kavivanar'
        ? 'Kavivanar_400Regular'
        : ((
            {
              Bold: 'BackupInter_700Bold',
              'Semi Bold': 'BackupInter_600SemiBold',
              Medium: 'BackupInter_500Medium',
              Light: 'BackupInter_300Light',
            } as Record<string, string>
          )[r.weight] ?? 'BackupInter_400Regular');
const textStyle = (r: Run): TextStyle => ({
  fontFamily: font(r),
  fontSize: r.size,
  color: r.color,
  lineHeight: r.lineHeight.unit === 'PIXELS' ? r.lineHeight.value : Math.round(r.size * 1.21),
  includeFontPadding: false,
});

export function DesignFrameLayers({
  frame,
  layers,
  offsetY = 0,
  replaceText,
  replaceImage,
  assets,
}: {
  frame: string;
  assets: Record<string, number>;
  layers: DesignLayer[];
  offsetY?: number;
  replaceText?: (layer: DesignLayer) => string | undefined;
  replaceImage?: (layer: DesignLayer) => ImageReplacement | undefined;
}) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
      {layers
        .filter(
          (l) =>
            Platform.OS === 'web' ||
            (!l.keyboard && !l.status && !(l.navigation && l.key === 'imgLine1')),
        )
        .map((l, index) => {
          const clipped = (element: ReactElement) =>
            l.clip ? (
              <View
                key={`${l.id}-${index}-clip`}
                style={{
                  position: 'absolute',
                  left: l.clip.x,
                  top: l.clip.y - offsetY,
                  width: l.clip.w,
                  height: l.clip.h,
                  overflow: 'hidden',
                  borderTopLeftRadius: l.clip.corners?.[0],
                  borderTopRightRadius: l.clip.corners?.[1],
                  borderBottomRightRadius: l.clip.corners?.[2],
                  borderBottomLeftRadius: l.clip.corners?.[3],
                }}
              >
                {element}
              </View>
            ) : (
              element
            );
          const style: ViewStyle = {
            position: 'absolute',
            left: l.x - (l.clip?.x ?? 0),
            top: l.y - (l.clip?.y ?? offsetY),
            width: l.w,
            height: l.h,
            opacity: l.opacity,
            borderRadius: l.radius ?? 0,
            ...(l.rotation || l.flipY
              ? {
                  transformOrigin: 'top left',
                  transform: [{ rotate: `${-(l.rotation ?? 0)}deg` }, { scaleY: l.flipY ? -1 : 1 }],
                }
              : {}),
            ...(l.corners
              ? {
                  borderTopLeftRadius: l.corners[0],
                  borderTopRightRadius: l.corners[1],
                  borderBottomRightRadius: l.corners[2],
                  borderBottomLeftRadius: l.corners[3],
                }
              : {}),
          };
          if (l.kind === 'text' && l.runs?.length) {
            const replacement = replaceText?.(l);
            const outline: TextStyle = l.stroke
              ? Platform.OS === 'web'
                ? ({
                    WebkitTextStroke: `${l.strokeWeight ?? 1}px ${l.stroke}`,
                    paintOrder: 'stroke fill',
                  } as unknown as TextStyle)
                : {
                    textShadowColor: l.stroke,
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 1.2,
                  }
              : {};
            return clipped(
              <Text
                key={`${l.id}-${index}`}
                testID={`reward-text-${l.id}`}
                accessibilityRole={l.heading || l.runs[0]!.size >= 24 ? 'header' : undefined}
                numberOfLines={l.id === '386:12513' ? 1 : undefined}
                adjustsFontSizeToFit={l.id === '386:12513'}
                style={[
                  style,
                  textStyle(l.runs[0]!),
                  {
                    height: undefined,
                    minHeight: l.h,
                    width: l.nowrap ? l.w + 32 : l.w + 2,
                    left: l.x - (l.clip?.x ?? 0) - (l.nowrap && l.align === 'CENTER' ? 16 : 0),
                    minWidth: l.w,
                    textAlign: l.align?.toLowerCase() as TextStyle['textAlign'],
                    ...outline,
                    textDecorationLine: l.decoration,
                  },
                ]}
              >
                {replacement ??
                  l.runs.map((r, i) => (
                    <Text
                      key={i}
                      style={[textStyle(r), outline, { textDecorationLine: l.decoration }]}
                    >
                      {r.text.replaceAll('\u2028', '\n')}
                    </Text>
                  ))}
              </Text>,
            );
          }
          const replaced = replaceImage?.(l);
          const image =
            typeof replaced === 'object'
              ? replaced.source
              : (replaced ?? (l.key ? assets[l.key] : undefined));
          if (l.kind === 'image' || image) {
            const crop = typeof replaced === 'object' ? replaced.crop : l.crop;
            return clipped(
              <View
                key={`${l.id}-${index}`}
                testID={`reward-slot-${frame}-${l.id}`}
                style={[style, { overflow: 'hidden' }]}
              >
                <Artwork
                  source={image}
                  testID={`reward-image-${frame}-${l.id}`}
                  width={l.w * (crop?.w ?? 1)}
                  height={l.h * (crop?.h ?? 1)}
                  fit={l.fit === 'cover' ? 'cover' : 'fill'}
                  style={
                    crop
                      ? { position: 'absolute', left: crop.x * l.w, top: crop.y * l.h }
                      : undefined
                  }
                />
                {l.stroke ? (
                  <View
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderColor: l.stroke,
                      borderWidth: l.strokeWeight ?? 1,
                      borderRadius: l.radius ?? 0,
                    }}
                  />
                ) : null}
              </View>,
            );
          }
          const effect = l.effects?.find((e) => e.type === 'DROP_SHADOW' && e.visible !== false);
          const shadow = effect
            ? `${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px rgba(${Math.round(effect.color.r * 255)},${Math.round(effect.color.g * 255)},${Math.round(effect.color.b * 255)},${effect.color.a})`
            : undefined;
          return clipped(
            <View
              key={`${l.id}-${index}`}
              style={[
                style,
                {
                  backgroundColor: l.color,
                  borderColor: l.stroke,
                  borderWidth: l.stroke ? l.strokeWeight : 0,
                  boxShadow: shadow,
                  ...(l.corners
                    ? {
                        borderTopLeftRadius: l.corners[0],
                        borderTopRightRadius: l.corners[1],
                        borderBottomRightRadius: l.corners[2],
                        borderBottomLeftRadius: l.corners[3],
                      }
                    : {}),
                },
              ]}
            />,
          );
        })}
    </View>
  );
}
