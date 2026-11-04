import { router, useLocalSearchParams, usePathname } from 'expo-router';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useApp as useAppColors } from '../../providers';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Empty, Icon, Label, Typography } from '../../design-system/ui';
import { Artwork, StatusSpace } from '../../design-system/DesignScreen';
import { handbookArtwork as a, materialArtwork } from '../../design-system/catalog-artwork';
import { usePages, useResource } from '../../services/queries';
import type { Page, Schemas } from '../../services/api';
import { More, QueryState } from '../shared/common';
import { RelatedMaterials } from './HandbookParts';
import { CurvedNavigation } from '../shared/DesignParts';

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('đ', 'd')
    .toLowerCase();
const categories = [
  {
    code: 'recycle',
    title: 'Rác tái chế',
    match: 'tai che',
    source: a.recycle,
    color: '#30ABFF',
    ink: '#FFFFFF',
    width: 64,
    height: 64,
  },
  {
    code: 'organic',
    title: 'Rác hữu cơ',
    match: 'huu co',
    source: a.organic,
    color: '#F0B2B3',
    ink: '#515152',
    width: 60,
    height: 60,
  },
  {
    code: 'inorganic',
    title: 'Rác vô cơ',
    match: 'vo co',
    source: a.inorganic,
    color: '#B2B099',
    ink: '#515152',
    width: 60.91,
    height: 51,
  },
] as const;
const kinds: Record<string, { title: string; match: string; source?: number }> = {
  plastic: { title: 'Nhựa', match: 'nhua', source: materialArtwork.plastic },
  paper: { title: 'Giấy', match: 'giay', source: materialArtwork.paper },
  battery: { title: 'Pin', match: 'pin', source: materialArtwork.battery },
  bag: { title: 'Túi ni lông', match: 'ni long' },
  medical: { title: 'Dụng cụ y tế', match: 'y te' },
  glass: { title: 'Thủy tinh', match: 'thuy tinh' },
  metal: { title: 'Kim loại', match: 'kim loai' },
  textile: { title: 'Vải', match: 'vai' },
  rubber: { title: 'Cao su', match: 'cao su' },
  ceramic: { title: 'Gốm sứ', match: 'gom su' },
};
type Category = { id: string; code: string; name: string };
export function HandbookScreen() {
  const params = useLocalSearchParams<{
    category?: string;
    kind?: string;
    query?: string;
    variant?: string;
  }>();
  const path = usePathname();
  const landing = path === '/handbook';
  const search = params.query ?? '';
  const setSearch = (query: string) => router.setParams({ query });
  const categoryList = useResource<Page<Category>>(
    '/v1/waste-categories',
    false,
    !!params.category,
  );
  const selectedCategory = params.category
    ? categoryList.data?.items.find(
        (c) =>
          c.id === params.category ||
          c.code === params.category ||
          normalize(c.name).includes(
            categories.find((x) => x.code === params.category)?.match ??
              normalize(params.category!),
          ),
      )
    : undefined;
  const kind = params.kind ? kinds[params.kind] : undefined;
  const query = usePages<Schemas['WasteItem']>(
    '/v1/waste-items?q=' +
      encodeURIComponent(search) +
      (selectedCategory ? '&category=' + encodeURIComponent(selectedCategory.id) : '') +
      (params.kind ? '&kind=' + encodeURIComponent(params.kind) : ''),
    false,
    (!params.category || !!selectedCategory) && (!params.kind || !!kind),
  );
  const all = query.data?.pages.flatMap((page) => page.items) ?? [];
  const items = all;
  const { colors, dark } = useAppColors();
  const insets = useSafeAreaInsets();
  const width = Math.min(428, useWindowDimensions().width);
  const headerHeight = (Platform.OS === 'web' ? 54 : insets.top) + 144;
  const categoryMissing = !!params.category && categoryList.isSuccess && !selectedCategory;
  const submit = () => {
    if (!landing) return;
    router.push({
      pathname: '/handbook/list',
      params: {
        query: search,
        ...(params.kind ? { kind: params.kind } : {}),
        ...(params.category ? { category: params.category } : {}),
      },
    });
  };
  const title = kind
    ? kind.title
    : params.category
      ? (selectedCategory?.name ??
        categories.find((c) => c.code === params.category)?.title ??
        'Nhóm rác')
      : 'Tất cả vật phẩm';
  return (
    <Typography.Provider value="inter">
      <View style={{ flex: 1, backgroundColor: dark ? colors.background : '#FFFFFF' }}>
        <View style={{ height: headerHeight, backgroundColor: '#147CC1' }}>
          <StatusSpace />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={{
              position: 'absolute',
              left: 14,
              top: headerHeight - 143,
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Artwork source={a.back} width={12.3333} height={20} />
          </Pressable>
          <View
            style={{
              position: 'absolute',
              left: (width - 172) / 2,
              top: headerHeight - 149,
              width: 172,
              height: 40,
            }}
          >
            {[-1, 0, 1].flatMap((x) =>
              [-1, 0, 1]
                .filter((y) => x || y)
                .map((y) => (
                  <Text
                    key={x + ':' + y}
                    accessible={false}
                    aria-hidden
                    importantForAccessibility="no"
                    style={[
                      styles.heading,
                      { position: 'absolute', left: x, top: y, color: '#000' },
                    ]}
                  >
                    Sổ tay rác
                  </Text>
                )),
            )}
            <Text accessibilityRole="header" style={styles.heading}>
              Sổ tay rác
            </Text>
          </View>
          <View
            style={{
              position: 'absolute',
              left: width / 2 + 73,
              top: headerHeight - 156,
              width: 88.617,
              height: 81.142,
              overflow: 'hidden',
            }}
          >
            <Artwork
              source={a.mascot}
              width={88.617}
              height={104.928}
              fit="fill"
              style={{ position: 'absolute', left: -2.845, top: -10.175 }}
            />
          </View>
          <View style={[styles.search, { left: 27, right: 26, top: headerHeight - 78 }]}>
            <Artwork source={a.search} width={24} />
            <TextInput
              accessibilityLabel="Tìm vật phẩm"
              value={search}
              onChangeText={setSearch}
              maxLength={200}
              onSubmitEditing={submit}
              returnKeyType="search"
              placeholder="Tìm kiếm..."
              placeholderTextColor="#9D9B9B"
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 12,
                color: '#172B3D',
                flex: 1,
                height: 54,
                padding: 0,
                minWidth: 0,
              }}
            />
            {search ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Xóa tìm kiếm"
                onPress={() => setSearch('')}
                style={{ width: 32, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="close" size={18} />
              </Pressable>
            ) : null}
          </View>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 140 }}
        >
          {landing && !search ? (
            <View style={{ minHeight: 640, paddingTop: 36 }}>
              <View style={{ paddingHorizontal: 34, flexDirection: 'row', gap: 26 }}>
                {categories.slice(0, 2).map((item) => (
                  <CategoryTile key={item.code} item={item} style={{ flex: 1 }} />
                ))}
              </View>
              <CategoryTile
                item={categories[2]}
                style={{ width: 189.555, alignSelf: 'center', marginTop: 25 }}
              />
              <View
                style={{
                  width: 139.2,
                  height: 114.178,
                  marginTop: 21.5,
                  alignSelf: 'flex-end',
                  marginRight: 13,
                  transform: [{ rotate: '-6.85deg' }],
                }}
              >
                <Artwork
                  source={a.bubble}
                  width={113.1}
                  height={85.895}
                  style={{ position: 'absolute', left: 13.05, top: 10.704 }}
                />
                <Text
                  style={{
                    position: 'absolute',
                    top: 16.155,
                    left: 24.45,
                    width: 92.84,
                    textAlign: 'center',
                    fontFamily: 'Mulish_300Light',
                    fontSize: 12,
                    lineHeight: 20,
                    color: '#000',
                    transform: [{ rotate: '2.78deg' }],
                  }}
                >
                  {'Nếu chưa\nbiết rác loại nào\n-hãy vào đây'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Xem tất cả"
                onPress={submit}
                style={[styles.all, { marginHorizontal: 56, marginTop: -20.678 }]}
              >
                <Artwork source={a.all} width={28} height={26} />
                <Label family="mulish" size={16} bold color="#515152" style={{ lineHeight: 20 }}>
                  Xem tất cả
                </Label>
              </Pressable>
              <View style={{ height: 102, marginTop: 6, marginLeft: 3 }}>
                <Artwork
                  source={a.sprout}
                  width={70}
                  height={70}
                  style={{ position: 'absolute', left: 3, top: 0 }}
                />
                <Artwork
                  source={a.stand}
                  width={75}
                  height={46}
                  style={{ position: 'absolute', left: 0, top: 48 }}
                />
              </View>
            </View>
          ) : null}
          <View
            style={{ paddingHorizontal: 24, paddingTop: landing && !search ? 12 : 24, gap: 16 }}
          >
            <Label family="inter" size={20} bold heading color={dark ? colors.text : '#172B3D'}>
              {landing ? 'Tra cứu vật phẩm' : title}
            </Label>
            {landing ? <RelatedMaterials kinds={['plastic', 'medical', 'bag', 'battery']} /> : null}
            {params.category && !categoryList.isSuccess ? (
              <QueryState query={categoryList} />
            ) : params.kind && !kind ? (
              <Empty
                title="Chưa tìm thấy loại vật liệu"
                detail="Quay lại sổ tay để chọn loại vật liệu phù hợp."
              />
            ) : categoryMissing ? (
              <Empty
                title="Chưa có vật phẩm trong nhóm này"
                detail="Nhóm sẽ hiển thị khi có hướng dẫn được công bố."
              />
            ) : (
              <QueryState
                query={query}
                empty={!items.length}
                emptyText={
                  search ? 'Chưa tìm thấy vật phẩm phù hợp' : 'Chưa có vật phẩm trong sổ tay'
                }
              >
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                  {items.map((item) => (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityLabel={item.name}
                      onPress={() =>
                        router.push({ pathname: '/handbook/[id]', params: { id: item.id } })
                      }
                      style={{
                        width: (width - 62) / 2,
                        minHeight: 170,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: '#D7E7F3',
                        backgroundColor: colors.surface,
                        padding: 14,
                        gap: 10,
                        alignItems: 'center',
                      }}
                    >
                      {materialPicture(item.material) ? (
                        <Artwork source={materialPicture(item.material)!} width={65} height={70} />
                      ) : (
                        <Icon name={item.icon} size={48} />
                      )}
                      <Label
                        family="mulish"
                        size={16}
                        bold
                        style={{ textAlign: 'center', lineHeight: 20 }}
                      >
                        {item.name}
                      </Label>
                      <Label size={11} color={colors.muted} style={{ textAlign: 'center' }}>
                        {item.material}
                        {item.hazardous ? ' · Cần xử lý riêng' : ''}
                      </Label>
                    </Pressable>
                  ))}
                </View>
              </QueryState>
            )}
            <More query={query} />
          </View>
        </ScrollView>
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
        >
          <CurvedNavigation variant="handbook" />
        </View>
      </View>
    </Typography.Provider>
  );
}
function CategoryTile({
  item,
  style,
}: {
  item: (typeof categories)[number];
  style?: import('react-native').ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.title}
      onPress={() =>
        router.push({ pathname: '/handbook/category/[category]', params: { category: item.code } })
      }
      style={[styles.category, { backgroundColor: item.color }, style]}
    >
      <View
        style={{
          position: 'absolute',
          top: item.code === 'recycle' ? 33 : item.code === 'organic' ? 37 : 35.5,
        }}
      >
        <Artwork source={item.source} width={item.width} height={item.height} />
      </View>
      <Label
        family="mulish"
        size={16}
        bold
        color={item.ink}
        style={{
          position: 'absolute',
          top: item.code === 'recycle' ? 97 : 100,
          lineHeight: 20,
          width: '100%',
          textAlign: 'center',
        }}
      >
        {item.title}
      </Label>
    </Pressable>
  );
}
function materialPicture(material: string) {
  const key = normalize(material);
  return key.includes('nhua')
    ? materialArtwork.plastic
    : key.includes('giay')
      ? materialArtwork.paper
      : key.includes('pin')
        ? materialArtwork.battery
        : null;
}

export { WasteDetailScreen } from './WasteGuideScreen';
const styles = StyleSheet.create({
  heading: {
    fontFamily: 'Roboto_800ExtraBold',
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: 0.96,
    color: '#FFF',
    includeFontPadding: false,
  },
  search: {
    position: 'absolute',
    height: 56,
    paddingHorizontal: 14,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E4E4E4',
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    boxShadow: '0px 4px 4px rgba(0,0,0,0.25)',
  },
  category: {
    height: 151,
    borderWidth: 1,
    borderColor: '#D8D8D8',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    boxShadow: '0px 4px 4px rgba(0,0,0,0.25)',
  },
  all: {
    minHeight: 62,
    borderWidth: 1,
    borderColor: '#3191C4',
    borderRadius: 10,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    boxShadow: '0px 4px 4px rgba(0,0,0,0.25)',
  },
});
