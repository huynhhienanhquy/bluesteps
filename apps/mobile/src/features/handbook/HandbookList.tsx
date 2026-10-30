import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Artwork } from '../../design-system/DesignScreen';
import { LegacyCanvas } from '../../design-system/LegacyCanvas';
import { LegacyNavigation } from '../../design-system/LegacyNavigation';
import { handbookListAssets as a } from '../../design-system/handbook-list-assets';
import { handbookNavigationAssets } from '../../design-system/handbook-navigation-assets';
import { HandbookHeader } from './HandbookHeader';
import { handbookCards } from './handbook-cards';

const fold = (value: string) =>
  value
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
const materialIds = [
  'bottle',
  'organic',
  'paper',
  'plastic-bag',
  'battery',
  'medical',
  'carton',
  'glass',
  'textiles',
  'plastic',
  'can',
  'bottle',
  'leaves',
  'tissue',
  'coffee',
  'rubber',
  'ceramic',
  'bulb',
  'fluorescent',
];
export function HandbookList() {
  const params = useLocalSearchParams<{ category?: string; query?: string }>();
  const [search, setSearch] = useState(params.query ?? '');
  const [category] = useState(params.category ?? 'Tất cả');
  const cards = handbookCards
    .map((card, index) => ({ ...card, material: materialIds[index] }))
    .filter(
      (card) =>
        (category === 'Tất cả' || category === card.category) &&
        fold(card.title).includes(fold(search)),
    );
  return (
    <LegacyCanvas background="#EAF5FC" statusHeight={49}>
      <HandbookHeader search={search} setSearch={setSearch} submit={() => {}} listLayout />
      {[
        {
          title: 'Rác tái\nchế',
          category: 'Tái chế',
          source: a.imgImage62,
          x: 75.19,
          w: 47.007,
          h: 69.378,
          tx: 66,
          tw: 65.177,
        },
        {
          title: 'Rác hữu\ncơ',
          category: 'Hữu cơ',
          source: a.imgImage66,
          x: 190.2,
          w: 49.091,
          h: 69.522,
          tx: 176.18,
          tw: 77.028,
        },
        {
          title: 'Rác vô\ncơ',
          category: 'Vô cơ',
          source: a.imgImage64,
          x: 305.16,
          w: 49.92,
          h: 69.888,
          tx: 298.2,
          tw: 63.992,
        },
      ].map((item) => (
        <Pressable
          key={item.category}
          accessibilityRole="button"
          accessibilityLabel={item.category}
          aria-pressed={category === item.category}
          onPress={() =>
            router.push(
              `/handbook/category/${item.category === 'Hữu cơ' ? 'organic' : item.category === 'Vô cơ' ? 'inorganic' : 'recycle'}`,
            )
          }
          style={{
            position: 'absolute',
            left: item.tx - 8,
            top: 224,
            width: item.tw + 16,
            height: 128,
            borderRadius: 12,
            borderWidth: category === item.category ? 1 : 0,
            borderColor: '#147CC1',
          }}
        >
          <Artwork
            source={item.source}
            width={item.w}
            height={item.h}
            style={{ position: 'absolute', left: item.x - item.tx + 8, top: 10 }}
          />
          <Text
            style={{
              position: 'absolute',
              left: 8,
              top: 82,
              width: item.tw,
              textAlign: 'center',
              fontFamily: 'Inter_400Regular',
              fontSize: 16,
              lineHeight: 19,
              letterSpacing: 0.48,
              color: '#000000',
            }}
          >
            {item.title}
          </Text>
        </Pressable>
      ))}
      <Artwork
        source={a.imgGroup}
        width={39.34}
        height={37.29}
        style={{ position: 'absolute', left: 53.28, top: 369.88 }}
      />
      <Text
        style={{
          position: 'absolute',
          left: 98,
          top: 369,
          width: 276,
          textAlign: 'center',
          fontFamily: 'Inter_400Regular',
          fontSize: 16,
          lineHeight: 19,
          letterSpacing: 0.48,
          color: '#000000',
        }}
      >
        Hãy để rác vào đúng thùng – Giữ môi trường luôn xanh sạch nhé!
      </Text>
      <ScrollView
        accessibilityLabel="Danh sách vật liệu"
        style={{ position: 'absolute', left: 33, top: 426, width: 361, height: 367 }}
        contentContainerStyle={{ alignItems: 'center', gap: 22, paddingBottom: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {cards.length ? (
          cards.map((card) => (
            <Pressable
              key={card.id}
              accessibilityRole="button"
              accessibilityLabel={card.title.replace(/\s+/g, ' ').trim()}
              onPress={() => router.push(`/handbook/${card.material}`)}
              style={{ width: 350, height: 80 }}
            >
              <View
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 0.5,
                  borderColor: '#DEDEDE',
                  borderRadius: 6,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  left: card.accent.x,
                  top: card.accent.y,
                  width: 4,
                  height: 55,
                  backgroundColor: card.accent.color,
                  borderTopRightRadius: 3,
                  borderBottomRightRadius: 3,
                }}
              />
              {card.images.map((img, i) => (
                <Artwork
                  key={i}
                  source={a[img.source as keyof typeof a]}
                  width={img.w}
                  height={img.h}
                  fit="cover"
                  style={{
                    position: 'absolute',
                    left: img.x,
                    top: img.y,
                    transform: img.flip ? [{ scaleX: -1 }] : undefined,
                  }}
                />
              ))}
              <Text
                style={{
                  position: 'absolute',
                  left: card.text.x,
                  top: card.text.y,
                  width: card.text.w,
                  textAlign: card.text.align as 'left' | 'center' | 'right',
                  fontFamily: 'Inter_400Regular',
                  fontSize: card.text.size,
                  lineHeight: 19,
                  letterSpacing: 0.48,
                  color: '#000000',
                }}
              >
                {card.title}
              </Text>
            </Pressable>
          ))
        ) : (
          <Text
            accessibilityRole="alert"
            style={{ fontFamily: 'Inter_400Regular', fontSize: 14, padding: 24, color: '#164561' }}
          >
            Không tìm thấy vật liệu phù hợp.
          </Text>
        )}
      </ScrollView>
      <LegacyNavigation
        selected={null}
        handbook
        handbookAssets={handbookNavigationAssets['386:13364']}
      />
    </LegacyCanvas>
  );
}
