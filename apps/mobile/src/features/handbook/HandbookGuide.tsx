import { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Artwork } from '../../design-system/DesignScreen';
import { LegacyCanvas } from '../../design-system/LegacyCanvas';
import { LegacyNavigation } from '../../design-system/LegacyNavigation';
import { handbookDetailAssets } from '../../design-system/handbook-detail-assets';
import { handbookGuides } from './handbook-guides';
import { AccountButton } from '../auth/AccountLayout';
import { Label } from '../../design-system/ui';
import { PoppinsGlyphs } from './PoppinsGlyphs';

const guideIds: Record<string, string> = {
  bottle: '386:14521',
  plastic: '386:14521',
  'plastic-bag': '386:14521',
  carton: '386:14595',
  textiles: '386:14670',
  battery: '386:14745',
  organic: '386:14820',
  leaves: '386:14820',
  coffee: '386:14820',
  glass: '386:14895',
  paper: '386:14970',
};
export const hasHandbookGuide = (id: string) => Boolean(guideIds[id]);
export function HandbookGuide({ material }: { material: string }) {
  const [tipsOnly, setTipsOnly] = useState(false);
  const [menu, setMenu] = useState(false);
  const id = guideIds[material];
  const guide = handbookGuides.find((g) => g.id === id)!;
  const assets: Record<string, number> =
    handbookDetailAssets[id as keyof typeof handbookDetailAssets];
  const title = guide.texts.find((t) => t.font === 'Poppins_500Medium' && t.size === 24)!;
  const tips = guide.texts.find((t) => t.size === 12.5)!;
  return (
    <LegacyCanvas statusHeight={49}>
      {guide.rects.map((r, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: r.x,
            top: r.y,
            width: r.w,
            height: r.h,
            backgroundColor: r.color,
            borderTopLeftRadius: r.topLeft,
            borderTopRightRadius: r.topRight,
            borderBottomLeftRadius: r.bottomLeft,
            borderBottomRightRadius: r.bottomRight,
            borderWidth: r.stroke,
            borderColor: r.border,
          }}
        />
      ))}
      {guide.images
        .filter(
          (img) =>
            (Platform.OS === 'web' || img.y >= 49) && (!tipsOnly || img.y < 350 || img.y > 650),
        )
        .map((img) => (
          <Artwork
            key={img.id}
            source={assets[img.source]}
            width={img.w}
            height={img.h}
            fit={img.source.startsWith('imgImage') ? 'cover' : 'contain'}
            style={{
              position: 'absolute',
              left: img.x,
              top: img.y,
              borderRadius: ['386:14598', '386:14673', '386:14898', '386:14973'].includes(img.id)
                ? 30
                : 0,
              transform: [{ rotate: `${img.rotation}deg` }],
              filter:
                img.shadow && Platform.OS === 'web'
                  ? 'drop-shadow(0px 4px 2px rgba(0,0,0,.25))'
                  : undefined,
            }}
          />
        ))}
      {guide.texts.map((t) => (
        <Text
          key={t.id}
          accessibilityRole={t.id === title.id ? 'header' : undefined}
          accessibilityLabel={
            tipsOnly && t.size === 14 ? tips.text : t.text === 'Dos' && tipsOnly ? 'Tips' : t.text
          }
          style={{
            position: 'absolute',
            left: t.x,
            top: t.y,
            width: t.w,
            fontFamily: t.font.startsWith('Inter_')
              ? t.font.replace('Inter_', 'BackupInter_')
              : Platform.OS === 'web' && t.font.startsWith('Poppins_')
                ? `${t.font}, ${t.font === 'Poppins_500Medium' ? 'BackupNotoSans_500Medium' : 'BackupNotoSans_300Light'}`
                : t.font,
            fontSize: t.size,
            lineHeight: t.lineHeight,
            letterSpacing: t.spacing,
            color: t.color,
            includeFontPadding: false,
            display: tipsOnly && t.size === 12.5 ? 'none' : undefined,
          }}
        >
          {t.font.startsWith('Poppins_') && Platform.OS !== 'web' ? (
            <PoppinsGlyphs
              text={
                tipsOnly && t.size === 14
                  ? tips.text
                  : t.text === 'Dos' && tipsOnly
                    ? 'Tips'
                    : t.text
              }
              medium={t.font === 'Poppins_500Medium'}
              size={t.size}
              lineHeight={t.lineHeight}
            />
          ) : tipsOnly && t.size === 14 ? (
            tips.text
          ) : t.text === 'Dos' && tipsOnly ? (
            'Tips'
          ) : (
            t.text
          )}
        </Text>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/handbook/list'))}
        style={{
          position: 'absolute',
          left: 14,
          top: 55,
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Artwork
          source={require('../../../assets/figma/common/handbook-back.svg')}
          width={10}
          height={16}
          style={{ position: 'absolute', left: 10, top: 8 }}
        />
      </Pressable>
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel="Xem mẹo tái sử dụng"
        aria-checked={tipsOnly}
        accessibilityState={{ checked: tipsOnly }}
        onPress={() => setTipsOnly((value) => !value)}
        style={{
          position: 'absolute',
          left: guide.toggle.x - 6,
          top: guide.toggle.y - 8,
          width: 82,
          height: 44,
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tùy chọn hướng dẫn"
        onPress={() => setMenu(true)}
        style={{ position: 'absolute', left: 380, top: 49, width: 44, height: 44 }}
      />
      <LegacyNavigation selected={null} handbook brand={guide.brand} handbookAssets={assets} />
      <Modal transparent visible={menu} animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đóng tùy chọn"
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
              gap: 18,
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
            }}
          >
            <Label size={22} bold heading>
              {title.text}
            </Label>
            <AccountButton
              title="Bảng phân loại rác"
              onPress={() => {
                setMenu(false);
                router.push({
                  pathname: '/handbook/types/[kind]',
                  params: {
                    kind:
                      material === 'battery'
                        ? 'battery'
                        : material === 'plastic-bag'
                          ? 'bag'
                          : 'plastic',
                  },
                });
              }}
            />
            <AccountButton
              title="Tìm điểm thu gom"
              onPress={() => {
                setMenu(false);
                router.push('/collection');
              }}
            />
            <AccountButton
              title="Sổ tay rác"
              onPress={() => {
                setMenu(false);
                router.push('/handbook');
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </LegacyCanvas>
  );
}
