import type { ReactNode } from 'react';
import { Platform, Pressable, Text, View, type TextStyle } from 'react-native';
import { Artwork } from '../../design-system/DesignScreen';
import { LegacyCanvas } from '../../design-system/LegacyCanvas';
import { LegacyNavigation } from '../../design-system/LegacyNavigation';
import { scanAssets } from '../../design-system/scan-assets';
import { scanFrames } from './scan-frames';

export type ScanVariant = 'start' | 'camera' | 'unrecognized' | 'result' | 'focused' | 'success';
const frameIds: Record<ScanVariant, keyof typeof scanAssets> = {
  start: '386:14194',
  camera: '386:14221',
  unrecognized: '386:14264',
  result: '386:14309',
  focused: '386:16189',
  success: '386:16218',
};
type Layer = {
  kind: string;
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
  source?: string;
  rotation?: number;
  crop?: number[][] | null;
  radius?: number | number[];
  shadow?: string;
  color?: string;
  stroke?: number;
  border?: string;
  text?: string;
  font?: string;
  size?: number;
  lineHeight?: number;
  spacing?: number;
  align?: TextStyle['textAlign'];
};
type Frame = { id: string; background: string; layers: Layer[] };
export type ScanActions = {
  back: () => void;
  menu: () => void;
  start: () => void;
  shutter: () => void;
  gallery: () => void;
  flip: () => void;
  flash: () => void;
  retry: () => void;
  handbook: () => void;
  detail: () => void;
  dismiss: () => void;
};

/** The six original compositions share their native controls and measured layers. */
export function ScanScene({
  variant,
  actions,
  photo,
  cameraContent,
  children,
  resultTitle,
  resultImage,
  captureDisabled = false,
  torch = false,
}: {
  variant: ScanVariant;
  actions: ScanActions;
  photo?: string;
  cameraContent?: ReactNode;
  children?: ReactNode;
  resultTitle?: string;
  resultImage?: number;
  captureDisabled?: boolean;
  torch?: boolean;
}) {
  const id = frameIds[variant];
  const frame = (scanFrames as Frame[]).find((f) => f.id === id)!;
  const assets: Record<string, number> = scanAssets[id];
  const hit = (
    label: string,
    action: () => void,
    x: number,
    y: number,
    w = 44,
    h = 44,
    disabled = false,
  ) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={action}
      disabled={disabled}
      style={{ position: 'absolute', left: x, top: y, width: w, height: h }}
    />
  );
  return (
    <LegacyCanvas background={frame.background} statusHeight={variant === 'start' ? 54 : 57}>
      <View
        accessibilityLabel={
          variant === 'camera' || variant === 'focused' ? 'Khung quét rác' : undefined
        }
        style={{ position: 'absolute', inset: 0 }}
        pointerEvents="none"
      >
        {frame.layers.map((layer) => {
          if (Platform.OS !== 'web' && (layer.y < 54 || layer.source === 'imgLine')) return null;
          if (['I386:14298;54616:25406', 'I386:14219;54616:25486'].includes(layer.id)) return null; // These vectors use their original assets below.
          const common = {
            position: 'absolute' as const,
            left: layer.x,
            top: layer.y,
            width: layer.w,
            height: layer.h,
          };
          if (layer.kind === 'text')
            return (
              <Text
                key={layer.id}
                accessibilityRole={
                  layer.text === 'Scan your item' ||
                  layer.text === 'Không nhận diện được rác' ||
                  layer.text === 'Kết quả' ||
                  layer.text === 'Quét thành công!'
                    ? 'header'
                    : undefined
                }
                style={{
                  ...common,
                  width: resultTitle && layer.id === '386:14341' ? 180 : layer.w + 2,
                  height: undefined,
                  fontFamily: layer.font,
                  fontSize: layer.size,
                  lineHeight:
                    layer.lineHeight ??
                    (layer.h > (layer.size ?? 16) * 1.6
                      ? layer.h / Math.round(layer.h / ((layer.size ?? 16) * 1.2))
                      : layer.h),
                  letterSpacing: layer.spacing,
                  textAlign: layer.align,
                  color: layer.color,
                  includeFontPadding: false,
                }}
              >
                {layer.id === '386:14341' && resultTitle ? resultTitle : layer.text}
              </Text>
            );
          if (layer.kind === 'rect') {
            const r = Array.isArray(layer.radius) ? layer.radius : [0, 0, 0, 0];
            return (
              <View
                key={layer.id}
                style={{
                  ...common,
                  opacity: layer.opacity,
                  backgroundColor: layer.color,
                  borderWidth: layer.stroke,
                  borderColor: layer.border,
                  borderTopLeftRadius: r[0],
                  borderTopRightRadius: r[1],
                  borderBottomRightRadius: r[2],
                  borderBottomLeftRadius: r[3],
                  boxShadow: layer.shadow,
                }}
              />
            );
          }
          const camera = layer.source === 'imgRectangle207';
          if (camera && cameraContent !== undefined)
            return (
              <View
                key={layer.id}
                style={{
                  ...common,
                  borderRadius: typeof layer.radius === 'number' ? layer.radius : 0,
                  overflow: 'hidden',
                  backgroundColor: '#164561',
                }}
              >
                {cameraContent}
              </View>
            );
          const source =
            camera && photo
              ? { uri: photo }
              : layer.id === '386:14342' && resultImage
                ? resultImage
                : assets[layer.source!];
          const radius = typeof layer.radius === 'number' ? layer.radius : 0;
          const flip =
            layer.source === 'imgMessageSquare' || layer.source === 'imgVuesaxLinearArrowLeft1';
          if (layer.crop) {
            const sx = layer.crop[0]![0]!,
              sy = layer.crop[1]![1]!;
            return (
              <View key={layer.id} style={{ ...common, overflow: 'hidden', borderRadius: radius }}>
                <Artwork
                  source={source}
                  width={layer.w / sx}
                  height={layer.h / sy}
                  fit="cover"
                  style={{
                    position: 'absolute',
                    left: (-layer.crop[0]![2]! * layer.w) / sx,
                    top: (-layer.crop[1]![2]! * layer.h) / sy,
                  }}
                />
              </View>
            );
          }
          return (
            <Artwork
              key={layer.id}
              source={source}
              width={layer.w}
              height={layer.h}
              fit={
                layer.id === '386:14342' && resultImage
                  ? 'contain'
                  : layer.source?.endsWith('207') || layer.source?.startsWith('imgImage')
                    ? 'cover'
                    : 'contain'
              }
              style={{
                position: 'absolute',
                left: layer.x,
                top: layer.y,
                borderRadius: radius,
                transform: flip ? [{ scaleX: -1 }] : [{ rotate: `${layer.rotation ?? 0}deg` }],
              }}
            />
          );
        })}
      </View>
      {variant === 'start' ? (
        <>
          <Artwork
            source={require('../../../assets/figma/common/forward-chevron.svg')}
            width={10.7917}
            height={17.5}
            style={{ position: 'absolute', left: 27.67, top: 78.75 }}
          />
          {hit('Quay lại', actions.back, 10, 65)}
          {hit('Tùy chọn quét', actions.menu, 368, 65)}
          {hit('Scan your waste', actions.start, 72, 523, 284.758, 68.226)}
          <LegacyNavigation selected="scan" handbook />
        </>
      ) : (
        <>
          {hit('Quay lại', actions.back, 16, variant === 'camera' ? 87 : 76)}
          {hit('Tùy chọn quét', actions.menu, 380, variant === 'camera' ? 88 : 78)}
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Đèn flash"
            accessibilityState={{ checked: torch }}
            aria-checked={torch}
            onPress={actions.flash}
            style={{
              position: 'absolute',
              left: 64,
              top: variant === 'camera' ? 86 : 75,
              width: 44,
              height: 44,
            }}
          />
          {hit('Chọn ảnh từ thư viện', actions.gallery, 46, 774, 64, 60)}
          {hit('Đổi camera', actions.flip, 325, 776, 56, 56)}
          {hit(
            variant === 'camera' ? 'Chụp ảnh vật liệu' : 'Chọn vật liệu trong ảnh',
            actions.shutter,
            169,
            760,
            87,
            89,
            captureDisabled,
          )}
        </>
      )}
      {variant === 'unrecognized' ? (
        <>
          <Artwork
            source={require('../../../assets/figma/common/scan-close.svg')}
            width={9.3333}
            height={9.3333}
            style={{ position: 'absolute', left: 344.333, top: 380.333 }}
          />
          {hit('Đóng kết quả', actions.dismiss, 327, 363)}
          {hit('Quét lại', actions.retry, 64, 479, 149, 47)}
          {hit('Sổ tay rác', actions.handbook, 223, 479, 145, 47)}
        </>
      ) : null}
      {variant === 'result' ? hit('Chi tiết', actions.detail, 90, 705, 247, 56) : null}
      {variant === 'success' ? hit('Xem kết quả', actions.detail, 92, 356, 245, 147) : null}
      {children}
    </LegacyCanvas>
  );
}
