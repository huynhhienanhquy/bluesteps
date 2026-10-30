import { useState } from 'react';
import { Modal, Platform, Pressable, Text, View, type TextStyle } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { LegacyCanvas } from '../../design-system/LegacyCanvas';
import { MeasuredArtwork, type MeasuredImage } from '../../design-system/MeasuredArtwork';
import { handbookTypesAssets } from '../../design-system/handbook-types-assets';
import { handbookTypesData } from './handbook-types-data';
import { AccountButton } from '../auth/AccountLayout';

type Kind = keyof typeof handbookTypesData;
type Run = {
  start: number;
  end: number;
  text: string;
  size: number;
  font: { style: string };
  lineHeight: { unit: string; value?: number };
  spacing: { unit: string; value: number };
};
type TableText = {
  kind: 'text';
  id: string;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  align: string;
  runs: Run[];
  bullets: boolean;
  heading: boolean;
  autoWidth: boolean;
};
type Shape = {
  kind: 'shape';
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  border: string;
  stroke: number;
  corners: number[];
  effects: {
    color: { r: number; g: number; b: number; a: number };
    offset: { x: number; y: number };
    radius: number;
    spread: number;
  }[];
};
type Layer = TableText | Shape | (MeasuredImage & { kind: 'image' });
type Table = {
  id: string;
  height: number;
  heading: string;
  cta: string;
  button: { x: number; y: number; w: number; h: number };
  layers: Layer[];
};
const names: Record<Kind, string> = {
  plastic: 'Nhựa',
  medical: 'Dụng cụ y tế',
  bag: 'Túi nilon',
  battery: 'Pin',
};
const next: Record<Kind, Kind> = {
  plastic: 'battery',
  battery: 'bag',
  bag: 'medical',
  medical: 'plastic',
};
function runStyle(run: Run): TextStyle {
  const family = /semi/i.test(run.font.style)
    ? 'BackupInter_600SemiBold'
    : /bold/i.test(run.font.style)
      ? 'BackupInter_700Bold'
      : 'BackupInter_400Regular';
  return {
    fontFamily: family,
    fontSize: run.size,
    includeFontPadding: false,
    lineHeight:
      run.lineHeight.unit === 'PIXELS'
        ? run.lineHeight.value
        : run.lineHeight.unit === 'PERCENT'
          ? (run.size * (run.lineHeight.value ?? 120)) / 100
          : Math.round(run.size * 1.2),
    letterSpacing:
      run.spacing.unit === 'PERCENT' ? (run.size * run.spacing.value) / 100 : run.spacing.value,
  };
}
function OriginalText({ layer }: { layer: TableText }) {
  const first = layer.runs[0]!;
  const style = { ...runStyle(first), color: layer.color };
  if (layer.bullets || layer.runs.length > 1) {
    const paragraphs = layer.text.split('\n');
    return (
      <View
        accessibilityLabel={layer.text}
        style={{ position: 'absolute', left: layer.x, top: layer.y, width: layer.w }}
      >
        {paragraphs.map((paragraph, index) => {
          const start = paragraphs
            .slice(0, index)
            .reduce((offset, text) => offset + text.length + 1, 0);
          const run =
            layer.runs.find((candidate) => start >= candidate.start && start < candidate.end) ??
            first;
          return layer.bullets ? (
            <View key={index} style={{ flexDirection: 'row' }}>
              <Text style={[style, { width: 24, paddingLeft: 8 }]}>•</Text>
              <Text style={[style, { flex: 1 }]}>{paragraph}</Text>
            </View>
          ) : (
            <Text key={index} style={[runStyle(run), { color: layer.color }]}>
              {paragraph || '\u200b'}
            </Text>
          );
        })}
      </View>
    );
  }
  return (
    <Text
      accessibilityRole={layer.heading ? 'header' : undefined}
      style={[
        style,
        {
          position: 'absolute',
          left: layer.x,
          top: layer.y,
          width: layer.autoWidth ? undefined : layer.w + (layer.h < first.size * 1.6 ? 3 : 0),
          textAlign: layer.align.toLowerCase() as TextStyle['textAlign'],
        },
      ]}
    >
      {layer.text}
    </Text>
  );
}
export function HandbookTypesScreen() {
  const { kind: parameter } = useLocalSearchParams<{ kind?: string }>();
  const kind: Kind =
    parameter === 'medical' || parameter === 'bag' || parameter === 'battery'
      ? parameter
      : 'plastic';
  const table = handbookTypesData[kind] as unknown as Table;
  const assets = handbookTypesAssets[table.id as keyof typeof handbookTypesAssets] as Record<
    string,
    number
  >;
  const [menu, setMenu] = useState(false);
  const open = (destination: Href) => {
    setMenu(false);
    router.push(destination);
  };
  return (
    <LegacyCanvas height={table.height} background="#FDFDFD" statusHeight={49}>
      {table.layers
        .filter((layer) => Platform.OS === 'web' || layer.kind !== 'image' || layer.y >= 49)
        .map((layer) => {
          if (layer.kind === 'image')
            return (
              <MeasuredArtwork
                key={layer.id}
                image={layer}
                source={assets[layer.source]!}
                useRenderBounds
              />
            );
          if (layer.kind === 'text') return <OriginalText key={layer.id} layer={layer} />;
          return (
            <View
              key={layer.id}
              style={{
                position: 'absolute',
                left: layer.x,
                top: layer.y,
                width: layer.w,
                height: layer.h,
                backgroundColor: layer.color,
                borderColor: layer.border,
                borderWidth: layer.stroke,
                borderTopLeftRadius: layer.corners[0],
                borderTopRightRadius: layer.corners[1],
                borderBottomRightRadius: layer.corners[2],
                borderBottomLeftRadius: layer.corners[3],
                boxShadow:
                  layer.effects
                    .map(
                      (effect) =>
                        `${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px ${effect.spread}px rgba(${Math.round(effect.color.r * 255)},${Math.round(effect.color.g * 255)},${Math.round(effect.color.b * 255)},${effect.color.a})`,
                    )
                    .join(', ') || undefined,
              }}
            />
          );
        })}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/handbook/list'))}
        style={{ position: 'absolute', left: 8, top: 49, width: 44, height: 44 }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tùy chọn bảng phân loại"
        onPress={() => setMenu(true)}
        style={{ position: 'absolute', left: 378, top: 49, width: 44, height: 44 }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={table.cta}
        onPress={() => open({ pathname: '/handbook/types/[kind]', params: { kind: next[kind] } })}
        style={{
          position: 'absolute',
          left: table.button.x,
          top: table.button.y,
          width: table.button.w,
          height: table.button.h,
          borderRadius: 30,
        }}
      />
      {(
        [
          ['Trang chủ', '/', 23, 83, 1045],
          ['Thu gom', '/collection', 99, 83, 1045],
          ['Đổi quà', '/rewards', 253, 83, 1045],
          ['Cá nhân', '/profile', 333, 83, 1045],
          ['Quét rác', '/scan', 175, 83, 994],
        ] as const
      ).map(([label, destination, left, width, top]) => (
        <Pressable
          key={label}
          accessibilityRole="tab"
          accessibilityLabel={label}
          accessibilityState={{ selected: false }}
          aria-selected={false}
          onPress={() => open(destination)}
          style={{ position: 'absolute', left, top, width, height: label === 'Quét rác' ? 83 : 47 }}
        />
      ))}
      <Modal transparent visible={menu} animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đóng tùy chọn bảng phân loại"
          onPress={() => setMenu(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(22,69,97,.24)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 380,
              padding: 24,
              gap: 14,
              borderRadius: 24,
              backgroundColor: '#FFFFFF',
            }}
          >
            <Text
              accessibilityRole="header"
              style={{ fontFamily: 'BackupInter_700Bold', fontSize: 20, color: '#164561' }}
            >
              Bảng phân loại rác
            </Text>
            {(Object.keys(names) as Kind[]).map((value) => (
              <AccountButton
                key={value}
                title={names[value]}
                onPress={() =>
                  open({ pathname: '/handbook/types/[kind]', params: { kind: value } })
                }
              />
            ))}
            <AccountButton title="Sổ tay rác" onPress={() => open('/handbook')} />
          </View>
        </Pressable>
      </Modal>
    </LegacyCanvas>
  );
}
