import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, Text, View, type TextStyle } from 'react-native';
import { router } from 'expo-router';
import { Artwork } from '../../design-system/DesignScreen';
import { LegacyCanvas } from '../../design-system/LegacyCanvas';
import { MeasuredArtwork, type MeasuredImage } from '../../design-system/MeasuredArtwork';
import { scanDetailsAssets } from '../../design-system/scan-details-assets';
import { scanExtraAssets } from '../../design-system/scan-extra-assets';
import { PoppinsGlyphs } from '../handbook/PoppinsGlyphs';
import { scanDetailsData } from './scan-details-data';

export type ScanDetailVariant = keyof typeof scanDetailsData;
type Run = {
  text: string;
  size: number;
  font: { family: string; style: string };
  lineHeight: { unit: string; value?: number };
  spacing: { unit: string; value: number };
};
type Base = {
  id: string;
  parent: string;
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
  scrolled: boolean;
};
type TextLayer = Base & {
  kind: 'text';
  text: string;
  runs: Run[];
  autoWidth: boolean;
  heading: boolean;
  color: string;
  align: string;
  stroke: number;
  border: string;
};
type Shape = Base & {
  kind: 'shape';
  color: string;
  stroke: number;
  border: string;
  corners: number[];
  rotation: number;
  effects: {
    color: { r: number; g: number; b: number; a: number };
    offset: { x: number; y: number };
    radius: number;
    spread: number;
  }[];
};
type Layer = TextLayer | Shape | (Base & MeasuredImage & { kind: 'image' });
type Frame = {
  id: string;
  background: string;
  height: number;
  layers: Layer[];
  scroll: { x: number; y: number; w: number; h: number } | null;
};
export type ManualScanResult = {
  title: string;
  category: string;
  instructions: string[];
  picture: number;
};
export type ScanDetailActions = {
  back: () => void;
  menu: () => void;
  detail: () => void;
  collect: () => void;
  award: () => void;
  dismissAward: () => void;
  rewards: () => void;
  continueLoading: () => void;
  material: (id: string) => void;
};
function fontStyle(run: Run): TextStyle {
  const weight = /extra/i.test(run.font.style)
    ? '800ExtraBold'
    : /semi/i.test(run.font.style)
      ? '600SemiBold'
      : /bold/i.test(run.font.style)
        ? '700Bold'
        : /medium/i.test(run.font.style)
          ? '500Medium'
          : '400Regular';
  const fontFamily =
    run.font.family === 'Inter' ? `BackupInter_${weight}` : `${run.font.family}_${weight}`;
  const height =
    run.lineHeight.unit === 'PIXELS'
      ? run.lineHeight.value
      : run.lineHeight.unit === 'PERCENT'
        ? (run.size * (run.lineHeight.value ?? 120)) / 100
        : run.size * (run.font.family === 'Poppins' ? 1.5 : 1.2);
  return {
    fontFamily:
      Platform.OS === 'web' && run.font.family === 'Poppins'
        ? `${fontFamily}, BackupNotoSans_${weight === '500Medium' ? '500Medium' : '400Regular'}`
        : fontFamily,
    fontSize: run.size,
    lineHeight: height,
    letterSpacing:
      run.spacing.unit === 'PERCENT' ? (run.size * run.spacing.value) / 100 : run.spacing.value,
    includeFontPadding: false,
  };
}
function SceneText({ layer, replacement }: { layer: TextLayer; replacement?: string }) {
  const run = layer.runs[0]!;
  const text = replacement ?? layer.text;
  const style = fontStyle(run);
  const position = {
    position: 'absolute' as const,
    left: layer.x,
    top: layer.y,
    width: layer.autoWidth ? undefined : layer.w + (layer.h < run.size * 1.6 ? 3 : 0),
    opacity: layer.opacity,
  };
  const contents =
    run.font.family === 'Poppins' && Platform.OS !== 'web' ? (
      <PoppinsGlyphs
        text={text}
        medium={run.font.style === 'Medium'}
        regular={run.font.style !== 'Medium'}
        size={run.size}
        lineHeight={style.lineHeight!}
      />
    ) : (
      text
    );
  return (
    <View pointerEvents="none" style={position}>
      {layer.stroke
        ? [-1, 0, 1].flatMap((x) =>
            [-1, 0, 1]
              .filter((y) => x || y)
              .map((y) => (
                <Text
                  key={`${x}:${y}`}
                  aria-hidden
                  accessible={false}
                  style={[
                    style,
                    {
                      position: 'absolute',
                      left: x * layer.stroke,
                      top: y * layer.stroke,
                      color: layer.border,
                      width: layer.w + 10,
                      textAlign: layer.align.toLowerCase() as TextStyle['textAlign'],
                    },
                  ]}
                >
                  {text}
                </Text>
              )),
          )
        : null}
      <Text
        accessibilityRole={layer.heading ? 'header' : undefined}
        accessibilityLabel={text}
        style={[
          style,
          { color: layer.color, textAlign: layer.align.toLowerCase() as TextStyle['textAlign'] },
        ]}
      >
        {contents}
      </Text>
    </View>
  );
}

export function ScanDetailsScene({
  variant,
  actions,
  result,
  photo,
  children,
}: {
  variant: ScanDetailVariant;
  actions: ScanDetailActions;
  result?: ManualScanResult;
  photo?: string;
  children?: ReactNode;
}) {
  const frame = scanDetailsData[variant] as unknown as Frame;
  const assets = {
    ...scanDetailsAssets[frame.id as keyof typeof scanDetailsAssets],
    ...scanExtraAssets[frame.id as keyof typeof scanExtraAssets],
  } as Record<string, number>;
  const maskIndex = frame.layers.findIndex((layer) => layer.id === '386:14435');
  const underAward = (layer: Layer) =>
    variant === 'award' && frame.layers.indexOf(layer) < maskIndex;
  const replacements: Record<string, string | undefined> =
    result && variant === 'detail'
      ? {
          '386:14368': result.title,
          '386:14367': result.category,
          '386:14358': result.instructions[0],
          '386:14361': result.instructions[1],
          '386:14364': result.instructions[2],
        }
      : {};
  const render = (layer: Layer) => {
    if (
      Platform.OS !== 'web' &&
      layer.kind === 'image' &&
      (layer.y < 49 || /imgLine/.test(layer.source))
    )
      return null;
    if (layer.kind === 'text')
      return (
        <SceneText
          key={layer.id}
          layer={
            result && layer.id === '386:14368' ? { ...layer, w: 210, autoWidth: false } : layer
          }
          replacement={replacements[layer.id]}
        />
      );
    if (layer.kind === 'image') {
      if (result && variant === 'detail' && layer.id === '386:14369')
        return (
          <Artwork
            key={layer.id}
            source={photo ? { uri: photo } : result.picture}
            width={layer.w}
            height={layer.h}
            fit="contain"
            style={{ position: 'absolute', left: layer.x, top: layer.y }}
          />
        );
      return (
        <MeasuredArtwork
          key={layer.id}
          image={layer}
          source={assets[layer.source]!}
          useRenderBounds
        />
      );
    }
    return (
      <View
        key={layer.id}
        style={{
          position: 'absolute',
          left: layer.x,
          top: layer.y,
          width: layer.w,
          height: layer.h,
          opacity: layer.opacity,
          backgroundColor: layer.color,
          borderColor: layer.border,
          borderWidth: layer.stroke,
          borderTopLeftRadius: layer.corners[0],
          borderTopRightRadius: layer.corners[1],
          borderBottomRightRadius: layer.corners[2],
          borderBottomLeftRadius: layer.corners[3],
          transform: [{ rotate: `${layer.rotation}deg` }],
          boxShadow:
            layer.effects
              .map(
                (e) =>
                  `${e.offset.x}px ${e.offset.y}px ${e.radius}px ${e.spread}px rgba(${Math.round(e.color.r * 255)},${Math.round(e.color.g * 255)},${Math.round(e.color.b * 255)},${e.color.a})`,
              )
              .join(', ') || undefined,
        }}
      />
    );
  };
  const hit = (label: string, onPress: () => void, x: number, y: number, w = 44, h = 44) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ position: 'absolute', left: x, top: y, width: w, height: h }}
    />
  );
  const scene = frame.layers.filter((layer) => !layer.scrolled).map(render);
  return (
    <LegacyCanvas
      background={frame.background}
      height={926}
      statusHeight={variant === 'loading' ? 57 : 49}
    >
      {variant === 'handbook' ? (
        <>
          {frame.layers.filter((layer) => !layer.scrolled && layer.y < 810).map(render)}
          {frame.scroll ? (
            <ScrollView
              accessibilityLabel="Hướng dẫn phân loại theo vật liệu"
              showsVerticalScrollIndicator={false}
              style={{
                position: 'absolute',
                left: frame.scroll.x,
                top: frame.scroll.y,
                width: frame.scroll.w,
                height: frame.scroll.h,
              }}
              contentContainerStyle={{ height: 783 }}
            >
              {frame.layers.filter((layer) => layer.scrolled).map(render)}
              {(
                ['plastic', 'paper', 'glass', 'organic', 'battery', 'textiles', 'carton'] as const
              ).map((id, index) =>
                hit(
                  ['Nhựa', 'Giấy', 'Thủy tinh', 'Rác hữu cơ', 'Pin', 'Áo quần', 'Carton'][index]!,
                  () => actions.material(id),
                  0,
                  index * 114,
                  352,
                  99,
                ),
              )}
            </ScrollView>
          ) : null}
          <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
            {frame.layers.filter((layer) => !layer.scrolled && layer.y >= 810).map(render)}
          </View>
        </>
      ) : variant === 'award' ? (
        <>
          <View
            aria-hidden
            importantForAccessibility="no-hide-descendants"
            pointerEvents="none"
            style={{ position: 'absolute', inset: 0 }}
          >
            {frame.layers.filter(underAward).map(render)}
          </View>
          <View
            role="dialog"
            aria-modal
            accessibilityLabel="Thông báo điểm mẫu"
            accessibilityViewIsModal
            style={{ position: 'absolute', inset: 0 }}
          >
            {frame.layers.filter((layer) => !underAward(layer)).map(render)}
          </View>
        </>
      ) : (
        scene
      )}
      {variant !== 'award'
        ? hit('Quay lại', actions.back, 12, variant === 'loading' ? 67 : 49)
        : null}
      {variant !== 'award'
        ? hit('Tùy chọn quét', actions.menu, 378, variant === 'loading' ? 67 : 49)
        : null}
      {variant === 'loading'
        ? hit('Xem kết quả mẫu', actions.continueLoading, 43, 233, 341, 406)
        : null}
      {variant === 'detail' ? (
        <>
          {hit('Xem thùng rác gần đây', actions.collect, 93, 648, 242, 50)}
          {hit('Tích điểm xanh', actions.award, 93, 728, 242, 50)}
        </>
      ) : null}
      {variant === 'award' ? (
        <>
          {hit('Đóng thông báo điểm mẫu', actions.dismissAward, 300, 272)}
          {hit('Đi đến trang tích điểm để đổi quà', actions.rewards, 89, 557, 249, 37)}
          {hit('Trở về trang chủ', () => router.replace('/'), 121, 606, 184, 36)}
        </>
      ) : null}
      {variant === 'detail' || variant === 'handbook'
        ? (
            [
              ['Trang chủ', '/', 20],
              ['Thu gom', '/collection', 102],
              ['Đổi quà', '/rewards', 264],
              ['Cá nhân', '/profile', 348],
              ['Quét rác', '/scan', 181],
            ] as const
          ).map(([label, href, x]) => (
            <Pressable
              key={label}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: false }}
              aria-selected={false}
              onPress={() => router.replace(href)}
              style={{
                position: 'absolute',
                left: x - 8,
                top: label === 'Quét rác' ? 810 : 861,
                width: 83,
                height: label === 'Quét rác' ? 83 : 47,
              }}
            />
          ))
        : null}
      {children}
    </LegacyCanvas>
  );
}
