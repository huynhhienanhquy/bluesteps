import { useCallback, useState } from 'react';
import {
  BackHandler,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type TextStyle,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { LegacyCanvas } from '../../design-system/LegacyCanvas';
import { LegacyNavigation } from '../../design-system/LegacyNavigation';
import { MeasuredArtwork, type MeasuredImage } from '../../design-system/MeasuredArtwork';
import { handbookCategoryAssets } from '../../design-system/handbook-category-assets';
import { handbookNavigationAssets } from '../../design-system/handbook-navigation-assets';
import { HandbookHeader } from './HandbookHeader';
import { handbookCategoryData } from './handbook-category-data';
import { HandbookExpandedNavigation } from './HandbookExpandedNavigation';

type Category = keyof typeof handbookCategoryData;
type MeasuredText = {
  id: string;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  size: number;
  font?: { style: string };
  lineHeight?: { unit: string; value?: number };
  spacing?: { unit: string; value: number };
  align?: string;
  color: string;
};
type Card = {
  id: string;
  w: number;
  h: number;
  images: readonly MeasuredImage[];
  texts: readonly MeasuredText[];
  accents: readonly { x: number; y: number; w: number; h: number; color?: string }[];
};
type CategoryFrame = {
  id: string;
  gestureColor: string;
  list: { x: number; y: number; w: number; h: number; gap: number };
  rows: readonly Card[];
  shell: { images: readonly MeasuredImage[]; texts: readonly MeasuredText[] };
  popup: {
    id: string;
    gestureColor: string;
    panel: { x: number; y: number; w: number; h: number; radius: number; color: string };
    mask: { color: string; opacity: number };
    images: readonly MeasuredImage[];
    texts: readonly MeasuredText[];
    roles: { body: string; heading: string; title: string };
  };
};
const materials: Record<Category, readonly (string | null)[]> = {
  inorganic: ['rubber', 'ceramic', 'bulb', 'textiles', 'battery', 'medical', 'fluorescent', null],
  organic: ['organic', 'leaves', 'tissue', 'coffee'],
  recycle: [
    'bottle',
    'paper',
    'plastic-bag',
    'carton',
    'glass',
    'textiles',
    'plastic',
    'can',
    'bottle',
  ],
};
const fold = (value: string) =>
  value
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
const textStyle = (text: MeasuredText): TextStyle => {
  const style = text.font?.style ?? 'Regular';
  const fontFamily = /light/i.test(style)
    ? 'BackupInter_300Light'
    : /semi/i.test(style)
      ? 'BackupInter_600SemiBold'
      : /bold/i.test(style)
        ? 'BackupInter_700Bold'
        : /medium/i.test(style)
          ? 'BackupInter_500Medium'
          : 'BackupInter_400Regular';
  return {
    fontFamily,
    fontSize: text.size,
    color: text.color,
    lineHeight:
      text.lineHeight?.unit === 'PIXELS' ? text.lineHeight.value : Math.round(text.size * 1.2),
    letterSpacing:
      text.spacing?.unit === 'PERCENT'
        ? (text.size * text.spacing.value) / 100
        : text.spacing?.value,
    textAlign: (text.align === 'justified' ? 'justify' : text.align) as TextStyle['textAlign'],
    includeFontPadding: false,
  };
};
function PositionedText({ text, header = false }: { text: MeasuredText; header?: boolean }) {
  const singleLine = !text.text.includes('\n') && text.h < text.size * 1.6;
  return (
    <Text
      accessibilityRole={header ? 'header' : undefined}
      style={[
        textStyle(text),
        { position: 'absolute', left: text.x, top: text.y, width: text.w + (singleLine ? 3 : 0) },
      ]}
    >
      {text.text}
    </Text>
  );
}

export function HandbookCategoryScreen() {
  const { category, expanded } = useLocalSearchParams<{ category?: string; expanded?: string }>();
  const kind: Category = category === 'organic' || category === 'recycle' ? category : 'inorganic';
  return (
    <CategoryContent
      key={`${kind}:${expanded ?? ''}`}
      kind={kind}
      initiallyExpanded={expanded === '1'}
    />
  );
}
function CategoryContent({
  kind,
  initiallyExpanded,
}: {
  kind: Category;
  initiallyExpanded: boolean;
}) {
  const frame = handbookCategoryData[kind] as CategoryFrame;
  const assets = handbookCategoryAssets[frame.id as keyof typeof handbookCategoryAssets] as Record<
    string,
    number
  >;
  const popupAssets = handbookCategoryAssets[
    frame.popup.id as keyof typeof handbookCategoryAssets
  ] as Record<string, number>;
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(initiallyExpanded);
  useFocusEffect(
    useCallback(() => {
      if (!expanded) return;
      if (Platform.OS === 'web') {
        const listener = (event: KeyboardEvent) => {
          if (event.key === 'Escape') setExpanded(false);
        };
        document.addEventListener('keydown', listener);
        return () => document.removeEventListener('keydown', listener);
      }
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        setExpanded(false);
        return true;
      });
      return () => subscription.remove();
    }, [expanded]),
  );
  const cards = frame.rows
    .map((card, index) => ({ card, material: materials[kind][index] }))
    .filter(({ card }) =>
      fold(card.texts.map((text) => text.text).join(' ')).includes(fold(search)),
    );
  const title = frame.shell.texts.find((text) => text.size === 20)?.text ?? 'Phân loại rác';
  const body = frame.popup.texts.find((text) => text.id === frame.popup.roles.body)!;
  const paragraphs = body.text.replace(/\u200b/g, '').split('\n');
  const split = paragraphs.findIndex((paragraph) => !paragraph.trim());
  const bullets = split < 0 ? paragraphs : paragraphs.slice(0, split);
  const example =
    split < 0
      ? ''
      : paragraphs
          .slice(split + 1)
          .filter((paragraph) => paragraph.trim())
          .join('\n');
  const popupTitle = frame.popup.texts.find((text) => text.id === frame.popup.roles.title)!;
  const open = () => {
    Keyboard.dismiss();
    setExpanded(true);
  };
  return (
    <LegacyCanvas background="#EAF5FC" statusHeight={49}>
      <View
        aria-hidden={expanded}
        importantForAccessibility={expanded ? 'no-hide-descendants' : 'auto'}
        pointerEvents={expanded ? 'none' : 'auto'}
        style={{ position: 'absolute', inset: 0 }}
      >
        <HandbookHeader
          search={search}
          setSearch={setSearch}
          submit={() => Keyboard.dismiss()}
          listLayout
          categoryLayout
          categoryExpanded={expanded}
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/handbook/list'))}
        />
        {frame.shell.images.map((image) => (
          <MeasuredArtwork
            key={image.id}
            image={image}
            source={assets[image.source]!}
            useRenderBounds
          />
        ))}
        {frame.shell.texts.map((text) => (
          <PositionedText key={text.id} text={text} header={text.size === 20} />
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Cách xử lý ${title}`}
          onPress={open}
          style={{ position: 'absolute', left: 124, top: 212, width: 210, height: 50 }}
        />
        <ScrollView
          accessibilityLabel={`Danh sách ${title.toLocaleLowerCase('vi')}`}
          style={{
            position: 'absolute',
            left: frame.list.x,
            top: frame.list.y,
            width: frame.list.w,
            height: frame.list.h,
          }}
          contentContainerStyle={{ alignItems: 'center', gap: frame.list.gap, paddingBottom: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {cards.length ? (
            (expanded && kind === 'inorganic' ? cards.slice(0, 4) : cards).map(
              ({ card, material }) => (
                <Pressable
                  key={card.id}
                  accessibilityRole="button"
                  accessibilityLabel={card.texts
                    .map((text) => text.text)
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim()}
                  onPress={() => (material ? router.push(`/handbook/${material}`) : open())}
                  style={{ width: card.w, height: card.h }}
                >
                  <View
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderWidth: 0.5,
                      borderColor: '#DEDEDE',
                      borderRadius: 6,
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                  {card.accents.map((accent, index) => (
                    <View
                      key={index}
                      style={{
                        position: 'absolute',
                        left: accent.x,
                        top: accent.y,
                        width: accent.w,
                        height: accent.h,
                        backgroundColor: accent.color,
                        borderTopRightRadius: 3,
                        borderBottomRightRadius: 3,
                      }}
                    />
                  ))}
                  {card.images.map((image) => (
                    <MeasuredArtwork key={image.id} image={image} source={assets[image.source]!} />
                  ))}
                  {card.texts.map((text) => (
                    <PositionedText key={text.id} text={text} />
                  ))}
                </Pressable>
              ),
            )
          ) : (
            <Text
              accessibilityRole="alert"
              style={{
                padding: 24,
                fontFamily: 'BackupInter_400Regular',
                fontSize: 14,
                color: '#164561',
              }}
            >
              Không tìm thấy vật liệu phù hợp.
            </Text>
          )}
        </ScrollView>
        {expanded ? (
          <HandbookExpandedNavigation assets={popupAssets} inorganic={kind === 'inorganic'} />
        ) : (
          <LegacyNavigation
            selected={null}
            handbook
            handbookAssets={
              handbookNavigationAssets[frame.id as keyof typeof handbookNavigationAssets]
            }
          />
        )}
      </View>
      {expanded ? (
        <View
          role="dialog"
          accessibilityLabel={`Hướng dẫn ${title.toLocaleLowerCase('vi')}`}
          accessibilityViewIsModal
          aria-modal
          style={{ position: 'absolute', inset: 0 }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng hướng dẫn"
            onPress={() => setExpanded(false)}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: frame.popup.mask.color,
              opacity: frame.popup.mask.opacity,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: frame.popup.panel.x,
              top: frame.popup.panel.y,
              width: frame.popup.panel.w,
              height: frame.popup.panel.h,
              borderRadius: frame.popup.panel.radius,
              backgroundColor: frame.popup.panel.color,
            }}
          />
          {frame.popup.images.map((image) => (
            <MeasuredArtwork
              key={image.id}
              image={image}
              source={popupAssets[image.source]!}
              useRenderBounds
            />
          ))}
          {frame.popup.texts
            .filter((text) => text.id !== frame.popup.roles.body)
            .map((text) => (
              <PositionedText key={text.id} text={text} header />
            ))}
          <ScrollView
            style={{
              position: 'absolute',
              left: body.x,
              top: body.y,
              width: body.w,
              height: frame.popup.panel.y + frame.popup.panel.h - body.y - 16,
            }}
            showsVerticalScrollIndicator={false}
          >
            {bullets.map((paragraph, index) => (
              <View key={index} style={{ flexDirection: 'row', paddingLeft: 21 }}>
                <Text
                  style={[
                    textStyle(body),
                    { position: 'absolute', left: 5, top: 0, lineHeight: 20 },
                  ]}
                >
                  •
                </Text>
                <Text style={[textStyle(body), { flex: 1, lineHeight: 20 }]}>{paragraph}</Text>
              </View>
            ))}
            {example ? (
              <Text style={[textStyle(body), { marginTop: 20, lineHeight: 20 }]}>{example}</Text>
            ) : null}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng hướng dẫn phân loại"
            onPress={() => setExpanded(false)}
            style={{
              position: 'absolute',
              left: frame.popup.panel.x + 60,
              top: popupTitle.y - 20,
              width: frame.popup.panel.w - 120,
              height: 84,
            }}
          />
        </View>
      ) : null}
    </LegacyCanvas>
  );
}
