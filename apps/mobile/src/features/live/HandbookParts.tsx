import type { PropsWithChildren, ReactNode } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Artwork, StatusSpace } from '../../design-system/DesignScreen';
import { Button, Icon, Label, Notice, Search, Typography } from '../../design-system/ui';
import { handbookArtwork, materialArtwork } from '../../design-system/catalog-artwork';
import type { Schemas } from '../../services/api';
import { useApp } from '../../providers';
import { CurvedNavigation } from './DesignParts';

export const materialNames: Record<string, string> = {
  plastic: 'Nhựa',
  paper: 'Giấy',
  glass: 'Thủy tinh',
  metal: 'Kim loại',
  textile: 'Vải',
  rubber: 'Cao su',
  ceramic: 'Gốm sứ',
  medical: 'Dụng cụ y tế',
  bag: 'Túi ni lông',
  battery: 'Pin',
};
export const categoryNames: Record<string, string> = {
  recycle: 'Rác tái chế',
  organic: 'Rác hữu cơ',
  inorganic: 'Rác vô cơ',
};
export function HandbookPage({
  title,
  search,
  setSearch,
  action,
  hero,
  children,
}: PropsWithChildren<{
  title: string;
  search?: string;
  setSearch?: (value: string) => void;
  action?: ReactNode;
  hero?: ReactNode;
}>) {
  const { colors } = useApp();
  return (
    <Typography.Provider value="inter">
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ backgroundColor: '#147CC1' }}>
          <StatusSpace />
          <View style={{ paddingHorizontal: 16, paddingBottom: 20, gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Quay lại"
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/handbook'))}
                style={{ width: 36, height: 44, justifyContent: 'center' }}
              >
                <Icon name="chevron-back" size={26} color="#FFFFFF" />
              </Pressable>
              <Label
                size={title === 'Sổ tay rác' ? 30 : 21}
                bold
                heading
                color="#FFFFFF"
                style={{ flex: 1 }}
              >
                {title}
              </Label>
              {action ??
                (title === 'Sổ tay rác' ? (
                  <Artwork source={handbookArtwork.mascot} width={64} height={75} />
                ) : null)}
            </View>
            {hero}
            {setSearch ? (
              <Search
                value={search ?? ''}
                onChangeText={setSearch}
                placeholder="Tìm vật phẩm"
                maxLength={200}
              />
            ) : null}
          </View>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 18, paddingBottom: 140, gap: 20 }}
        >
          {children}
        </ScrollView>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
          <CurvedNavigation variant="handbook" />
        </View>
      </View>
    </Typography.Provider>
  );
}
export function MaterialPicture({
  kind,
  code,
  size = 80,
}: {
  kind?: string | null;
  code?: string;
  size?: number;
}) {
  const plastic = {
    pet: require('../../../assets/figma/386-16931/imgRectangle1097.png'),
    hdpe: require('../../../assets/figma/386-16931/imgDownload91.png'),
    pvc: require('../../../assets/figma/386-16931/imgDownload101.png'),
    ldpe: require('../../../assets/figma/386-16931/imgDownload111.png'),
    pp: require('../../../assets/figma/386-16931/imgDownload131.png'),
    'zinc-carbon': require('../../../assets/figma/386-17145/imgDownload141.png'),
    alkaline: require('../../../assets/figma/386-17145/imgDownload141.png'),
    nicd: require('../../../assets/figma/386-17145/imgDownload161.png'),
    'lead-acid': require('../../../assets/figma/386-17145/imgDownload171.png'),
    'lithium-ion': require('../../../assets/figma/386-17145/imgPngtreeLithiumPolymerBatteryWhitePngImage107393061.png'),
  };
  const source =
    code && code in plastic
      ? plastic[code as keyof typeof plastic]
      : kind === 'plastic' || kind === 'bag'
        ? materialArtwork.plastic
        : kind === 'paper'
          ? materialArtwork.paper
          : kind === 'battery'
            ? materialArtwork.battery
            : null;
  return source ? (
    <Artwork source={source} width={size} height={size} />
  ) : (
    <Icon
      name={
        (
          {
            medical: 'medkit-outline',
            glass: 'flask-outline',
            metal: 'layers-outline',
            textile: 'shirt-outline',
            rubber: 'ellipse-outline',
            ceramic: 'cafe-outline',
          } as Record<string, string>
        )[kind ?? ''] ?? 'leaf-outline'
      }
      size={size * 0.65}
    />
  );
}
export function ReferenceSources({
  sources,
  reviewed,
}: {
  sources: Schemas['Source'][];
  reviewed?: string;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Label size={14} bold>
        Nguồn hướng dẫn
      </Label>
      {sources.length ? (
        sources.map((source) => (
          <Button
            key={source.title + source.url}
            title={source.title}
            variant="quiet"
            disabled={!source.url || !/^https:\/\//.test(source.url)}
            onPress={() => {
              if (source.url?.startsWith('https://'))
                void Linking.openURL(source.url).catch(() => {});
            }}
          />
        ))
      ) : (
        <Notice>Chưa có nguồn tham khảo được công bố cho vật phẩm này.</Notice>
      )}
      {reviewed ? <Label size={11}>Rà soát nội dung: {reviewed}</Label> : null}
    </View>
  );
}
export function RelatedMaterials({ kinds }: { kinds: string[] }) {
  return (
    <View style={{ gap: 8 }}>
      {kinds.map((kind) => (
        <Button
          key={kind}
          title={`Tìm hiểu về ${materialNames[kind] ?? kind}`}
          variant="secondary"
          onPress={() =>
            ['plastic', 'medical', 'bag', 'battery'].includes(kind)
              ? router.push({ pathname: '/handbook/types/[kind]', params: { kind } })
              : router.push({ pathname: '/handbook/list', params: { kind } })
          }
        />
      ))}
    </View>
  );
}
export function WasteTiles({ items }: { items: Schemas['WasteItem'][] }) {
  const { colors } = useApp();
  return (
    <View style={{ gap: 12 }}>
      {items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={item.name}
          onPress={() => router.push({ pathname: '/handbook/[id]', params: { id: item.id } })}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            padding: 14,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 16,
          }}
        >
          <View
            style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: '#B4CDFF' }}
          />
          <MaterialPicture kind={item.handbookKind} size={54} />
          <View style={{ flex: 1, gap: 6 }}>
            <Label size={16} bold>
              {item.name}
            </Label>
            <Label size={12}>
              {item.material}
              {item.hazardous ? ' · Cần xử lý riêng' : ''}
            </Label>
          </View>
          <Icon name="chevron-forward" size={18} />
        </Pressable>
      ))}
    </View>
  );
}
