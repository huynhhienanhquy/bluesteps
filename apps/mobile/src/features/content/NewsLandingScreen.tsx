import { useState, type ComponentProps, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Artwork } from '../../design-system/DesignScreen';
import { LegacyCanvas } from '../../design-system/LegacyCanvas';
import { QueryContent } from '../../design-system/QueryContent';
import { newsDesignAssets } from '../../design-system/news-design-assets';
import { newsLandingAssets } from '../../design-system/news-landing-assets';
import { useApp } from '../../providers';
import { articles } from '../../services/fixtures';
import {
  articleMetadata,
  createNewsSession,
  filterNews,
  type NewsSession,
} from '../../services/news';
import { useDemoQuery } from '../../services/useDemoQuery';
import { NewsDesignNavigation, NewsSheet, NewsText } from './NewsDesignParts';
import { NewsNavigation } from './NewsParts';
import { BackupedNavigation } from '../backuped/BackupedParts';
import { designTitles, newsCover } from './news-design-data';

type LandingView = 'all' | 'latest' | 'events';
type Assets = Record<string, number>;
const main = newsDesignAssets['391:24796'];
const mainIds = [
  'storm-cleanup',
  'green-sunday',
  'local-cleanup',
  'saigon-cleanup',
  'ha-long',
  'tourism-cleanup',
  'saigon-cleanup',
];
const latestIds = ['saigon-cleanup', 'green-sunday', 'storm-cleanup', 'ha-long'];
const eventIds = ['youth-ideas', 'local-cleanup', 'ha-long', 'tourism-cleanup', 'daily-waste'];
const openArticle = (id: string) => router.push(`/articles/${id}`);
function T(props: ComponentProps<typeof NewsText>) {
  return <NewsText lineHeight={Math.round((props.size ?? 14) * 1.21)} {...props} />;
}

export function NewsLandingScreen({ view, sample }: { view: LandingView; sample: boolean }) {
  const openSearch = () =>
    router.push({ pathname: '/articles/search', params: sample ? { preview: '1' } : {} });
  const { news, setNews } = useApp();
  const [example, setExample] = useState<NewsSession>(() => ({
    ...createNewsSession(),
    saved: [...new Set([...mainIds, ...eventIds])],
  }));
  const session = sample ? example : news;
  const update = sample ? setExample : setNews;
  const [menu, setMenu] = useState(false);
  const [page, setPage] = useState(0);
  const query = useDemoQuery('articles');
  const source = sample ? articles : (query.data ?? []);
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(428);
  const cardWidth = Math.min(170, (width - 44) / 2);
  const byId = (ids: string[]) =>
    ids.flatMap((id) => source.filter((article) => article.id === id));
  const latest = sample
    ? byId(latestIds)
    : filterNews(source, { search: '', topic: 'Tất cả', sort: 'newest' });
  const pageCount = Math.ceil(latest.length / 4);
  const activePage = Math.min(page, Math.max(0, pageCount - 1));
  const toggle = (field: 'saved' | 'liked', id: string) =>
    update((current) => ({
      ...current,
      [field]: current[field].includes(id)
        ? current[field].filter((value) => value !== id)
        : [...current[field], id],
    }));
  const changeView = (next: LandingView) =>
    router.replace({
      pathname: '/articles',
      params: { view: next, ...(sample ? { preview: '1' } : {}) },
    });
  const menuSheet = menu ? (
    <NewsSheet title="Khám phá tin tức" onClose={() => setMenu(false)}>
      <View style={{ alignItems: 'center', marginBottom: 18 }}>
        <BackupedNavigation onNavigate={() => setMenu(false)} />
      </View>
      <NewsNavigation sample={sample} onNavigate={() => setMenu(false)} />
    </NewsSheet>
  ) : null;
  const card = (
    id: string,
    index: number,
    a: Assets,
    cover: number,
    w = 170,
    previewCounts?: [string, number],
  ) => {
    const article = source.find((item) => item.id === id);
    const result = article ? (
      <LandingCard
        key={`${id}:${index}`}
        id={id}
        title={article.title}
        width={w}
        assets={a}
        cover={cover}
        saved={session.saved.includes(id)}
        liked={session.liked.includes(id)}
        sample={sample}
        previewCounts={previewCounts}
        splitTitle={
          id === 'saigon-cleanup' && ((view === 'all' && index === 6) || view === 'latest')
        }
        onSave={() => toggle('saved', id)}
        onLike={() => toggle('liked', id)}
      />
    ) : null;
    return view === 'all' && index === 6 ? (
      <View key={`${id}:${index}`} style={{ width: w, height: 174, overflow: 'hidden' }}>
        {result}
      </View>
    ) : (
      result
    );
  };
  const content = (children: ReactNode) => (
    <QueryContent
      loading={!sample && query.isPending}
      error={!sample && query.isError}
      empty={!source.length && !query.isPending}
      retry={() => {
        void query.refetch();
      }}
    >
      {children}
    </QueryContent>
  );

  if (view !== 'all') {
    const a = newsLandingAssets[view === 'latest' ? '386:9787' : '386:9901'];
    const latestAssets = newsLandingAssets['386:9787'];
    const eventAssets = newsLandingAssets['386:9901'];
    return (
      <LegacyCanvas statusHeight={43}>
        <View
          style={{
            width: 428,
            height: 926,
            backgroundColor: '#FFFFFF',
            overflow: 'hidden',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            borderBottomLeftRadius: 50,
            borderBottomRightRadius: 50,
          }}
        >
          <StaticArt
            source={a.imgEllipse80}
            x={view === 'latest' ? -426 : -415}
            y={451}
            w={660}
            h={664}
          />
          <StaticArt source={a.imgEllipse80} x={183} y={315} w={660} h={664} />
          <LandingStatus assets={a} />
          <LegacyNewsHero assets={a} onMenu={() => setMenu(true)} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tìm bài viết"
            onPress={openSearch}
            style={{
              position: 'absolute',
              left: 32,
              top: 285,
              width: 365,
              height: 40,
              borderRadius: 20,
              borderColor: '#B8B8B8',
              borderWidth: 1,
              backgroundColor: '#FFFFFF',
            }}
          >
            <StaticArt source={a.imgGroup36936} x={8} y={5} w={27} />
            <T
              size={10}
              color="#8A8A8A"
              style={{
                position: 'absolute',
                left: 48,
                top: 5,
                fontFamily: 'InknutAntiqua_400Regular',
                lineHeight: 26,
              }}
            >
              Tìm kiếm...
            </T>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mở menu tin tức"
            hitSlop={10}
            onPress={() => setMenu(true)}
            style={{ position: 'absolute', left: 359, top: 294, width: 22, height: 22 }}
          >
            <Artwork source={a.imgMenu} width={22} />
          </Pressable>
          {view === 'latest' ? (
            <>
              <LandingTabs view={view} onChange={changeView} legacy />
              <T
                accessibilityRole="header"
                size={15}
                color="#000000"
                style={{
                  position: 'absolute',
                  left: 32,
                  top: 381,
                  fontFamily: 'InknutAntiqua_700Bold',
                  lineHeight: 39,
                }}
              >
                Tin mới nhất
              </T>
              <T
                size={6}
                color="#818181"
                style={{
                  position: 'absolute',
                  left: 33,
                  top: 413,
                  fontFamily: 'InknutAntiqua_700Bold',
                  lineHeight: 15.6,
                }}
              >
                “Cùng GreenSteps – Phân loại rác, bảo vệ hành tinh xanh”
              </T>
              {(['previous', 'next'] as const).map((direction, index) => (
                <Pressable
                  key={direction}
                  accessibilityRole="button"
                  accessibilityLabel={index ? 'Trang tin mới tiếp theo' : 'Trang tin mới trước'}
                  accessibilityState={{
                    disabled: index ? activePage >= pageCount - 1 : activePage === 0,
                  }}
                  disabled={index ? activePage >= pageCount - 1 : activePage === 0}
                  hitSlop={8}
                  onPress={() =>
                    setPage((value) =>
                      Math.max(0, Math.min(pageCount - 1, value + (index ? 1 : -1))),
                    )
                  }
                  style={{
                    position: 'absolute',
                    left: 329 + 35 * index,
                    top: 396,
                    width: 28,
                    height: 28,
                  }}
                >
                  <Artwork
                    source={index ? latestAssets.imgEllipse287 : latestAssets.imgEllipse286}
                    width={28}
                  />
                  <StaticArt
                    source={index ? latestAssets.chevronForward : latestAssets.chevronBackward}
                    x={3}
                    y={3}
                    w={22}
                  />
                </Pressable>
              ))}
              <View style={{ position: 'absolute', left: 0, top: 447, width: 428, minHeight: 363 }}>
                {content(
                  latest.slice(activePage * 4, activePage * 4 + 4).map((article, index) => {
                    const covers: Record<string, number> = {
                      'saigon-cleanup': latestAssets.imgRectangle937,
                      'green-sunday': latestAssets.imgRectangle941,
                      'storm-cleanup': latestAssets.imgRectangle763,
                      'ha-long': latestAssets.imgRectangle939,
                    };
                    return (
                      <View
                        key={article.id}
                        style={{
                          position: 'absolute',
                          left: [32, 224, 33, 229][index],
                          top: index < 2 ? 0 : 189,
                        }}
                      >
                        {card(
                          article.id,
                          index,
                          latestAssets,
                          covers[article.id] ?? newsCover(article),
                          170,
                          article.id === 'ha-long' ? ['1.7k', 20] : undefined,
                        )}
                      </View>
                    );
                  }),
                )}
              </View>
              <StaticArt source={latestAssets.imgLine} x={142} y={912.44} w={143.005} h={2.56} />
            </>
          ) : (
            <ScrollView
              accessibilityLabel="Bài đọc về sự kiện sắp tới"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              style={{ position: 'absolute', left: 28, top: 346, width: 372, height: 531 }}
              contentContainerStyle={{ minHeight: 643 }}
            >
              <LandingTabs view={view} onChange={changeView} legacy inEvents />
              <View style={{ marginTop: 24, height: 574 }}>
                {content(
                  byId(eventIds).map((article, index) => (
                    <View
                      key={article.id}
                      style={{
                        position: 'absolute',
                        left: [0, 202, 0, 201, 9][index],
                        top: [0, 0, 203, 196, 400][index],
                      }}
                    >
                      {card(
                        article.id,
                        index,
                        {
                          ...eventAssets,
                          imgImage36: eventAssets.imgImage27,
                          imgImage37: eventAssets.imgImage34,
                          imgImage38: eventAssets.imgImage35,
                        },
                        [
                          eventAssets.imgRectangle937,
                          eventAssets.imgRectangle939,
                          eventAssets.imgRectangle940,
                          eventAssets.imgRectangle941,
                          eventAssets.imgRectangle763,
                        ][index]!,
                      )}
                    </View>
                  )),
                )}
              </View>
            </ScrollView>
          )}
          <View style={{ position: 'absolute', left: 0, top: 810, width: 428 }}>
            <NewsDesignNavigation source={a} offsetX={4} />
          </View>
          {menuSheet}
        </View>
      </LegacyCanvas>
    );
  }

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{
        flex: 1,
        backgroundColor: '#F0F9FF',
        overflow: 'hidden',
        borderTopLeftRadius: Platform.OS === 'web' ? 20 : 0,
        borderTopRightRadius: Platform.OS === 'web' ? 20 : 0,
        borderBottomLeftRadius: Platform.OS === 'web' ? 50 : 0,
        borderBottomRightRadius: Platform.OS === 'web' ? 50 : 0,
        paddingTop: Platform.OS === 'web' ? 0 : insets.top,
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          gap: 16,
          paddingBottom: 148 + (Platform.OS === 'web' ? 0 : insets.bottom),
        }}
      >
        {Platform.OS === 'web' ? (
          <View style={{ height: 49 }}>
            <LandingStatus assets={main} />
          </View>
        ) : null}
        <View
          style={{
            padding: 20,
            gap: 12,
            borderRadius: 24,
            overflow: 'hidden',
            marginTop: Platform.OS === 'web' ? 0 : 16,
          }}
        >
          <Artwork
            source={main.imgHeroBanner}
            width={width - 32}
            height={268}
            fit="cover"
            style={{ position: 'absolute', inset: 0, height: '100%' }}
          />
          <View
            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,23,42,0.45)' }}
          />
          <T accessibilityRole="header" size={20} weight="bold" color="#FFFFFF" lineHeight={24}>
            {'CẬP NHẬT TIN TỨC\nVÌ MỘT HÀNH TINH XANH'}
          </T>
          {['Cập nhật hôm nay, bảo vệ mai sau', 'Bắt đầu hành trình xanh', 'Tìm hiểu ngay'].map(
            (text, index) => (
              <View
                key={text}
                style={{ flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 20 }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <T size={10} weight="bold" color="#0F172A">
                    {index + 1}
                  </T>
                </View>
                {index === 2 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Tìm hiểu ngay"
                    onPress={() => router.push('/handbook')}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                  >
                    <T size={12} weight="bold" color="#0F172A">
                      {text}
                    </T>
                  </Pressable>
                ) : (
                  <T size={12} weight="semibold" color="#FFFFFF" style={{ flex: 1 }}>
                    {text}
                  </T>
                )}
              </View>
            ),
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cộng đồng xanh"
            onPress={() => router.push('/community')}
            style={{
              backgroundColor: '#FFFFFF',
              padding: 12,
              flexDirection: 'row',
              gap: 10,
              alignItems: 'center',
              borderRadius: 16,
            }}
          >
            <View style={{ flexDirection: 'row', width: 88 }}>
              {[main.imgEllipse, main.imgEllipse1, main.imgEllipse2, main.imgEllipse3].map(
                (source, i) => (
                  <Artwork
                    key={i}
                    source={source}
                    width={28}
                    style={{ marginRight: i === 3 ? 0 : -8 }}
                  />
                ),
              )}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T size={12} weight="bold" color="#0F172A">
                Cộng đồng xanh
              </T>
              <T size={10} lineHeight={12} color="#64748B">
                Hàng nghìn người đã quan tâm đến môi trường
              </T>
            </View>
            <View
              style={{
                backgroundColor: '#E2E8F0',
                width: 28,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Artwork source={main.imgArrowRight} width={14} />
            </View>
          </Pressable>
        </View>
        <View
          style={{
            height: 44,
            borderWidth: 1,
            borderColor: '#D7E7F3',
            backgroundColor: '#FFFFFF',
            borderRadius: 22,
            flexDirection: 'row',
            alignItems: 'center',
            paddingLeft: 15,
            paddingRight: 11,
            gap: 12,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tìm bài viết"
            onPress={openSearch}
            style={{ flex: 1, flexDirection: 'row', gap: 12, alignItems: 'center' }}
          >
            <View
              style={{
                backgroundColor: '#147CC1',
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Artwork source={main.imgSearch} width={16} />
            </View>
            <T size={14} color="#94A3B8">
              Tìm kiếm...
            </T>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bài đã lưu"
            onPress={() => router.push('/articles/saved')}
            style={{
              position: 'absolute',
              right: 52,
              top: 4,
              width: 70,
              height: 32,
              backgroundColor: '#D9F0FC',
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <T size={11} weight="semibold" color="#147CC1">
              ♥ Đã lưu
            </T>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mở menu tin tức"
            hitSlop={8}
            onPress={() => setMenu(true)}
          >
            <Artwork source={main.imgMenu} width={22} />
          </Pressable>
        </View>
        <LandingTabs view={view} onChange={changeView} />
        {content(
          <>
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                padding: 16,
                gap: 12,
                boxShadow: '0px 8px 12px rgba(15,23,42,0.08)',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <T size={12} weight="bold" color="#0F172A">
                  Bài nổi bật
                </T>
                <MoreLink onPress={() => openArticle('daily-waste')} />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đọc bài nổi bật"
                onPress={() => openArticle('daily-waste')}
                style={{ gap: 12 }}
              >
                <Artwork
                  source={main.imgFrame}
                  width={width - 64}
                  height={160}
                  fit="cover"
                  style={{ borderRadius: 16 }}
                />
                <View style={{ gap: 8 }}>
                  <T size={18} lineHeight={24} weight="bold" color="#0F172A">
                    Mỗi ngày, thế giới thải ra khoảng 11 triệu...
                  </T>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <Artwork source={main.imgEye} width={14} />
                      <T size={12} weight="semibold" color="#64748B">
                        {sample ? '1.2k' : '2.2k'}
                      </T>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <Artwork source={main.imgMessageCircle} width={14} />
                      <T
                        size={12}
                        weight="semibold"
                        color="#64748B"
                        style={sample ? { width: 16 } : undefined}
                      >
                        {sample
                          ? 50
                          : session.comments.filter(
                              (comment) => comment.articleId === 'daily-waste',
                            ).length}
                      </T>
                    </View>
                  </View>
                </View>
              </Pressable>
            </View>
            <View style={{ gap: 12 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <T size={16} weight="bold" color="#0F172A">
                  Tất cả bài viết
                </T>
                <MoreLink onPress={openSearch} />
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {byId(mainIds).map((article, index) =>
                  card(
                    article.id,
                    index,
                    main,
                    [
                      main.imgRectangle763,
                      main.imgRectangle942,
                      main.imgRectangle940,
                      main.imgRectangle937,
                      main.imgRectangle939,
                      main.imgRectangle941,
                      main.imgRectangle937,
                    ][index]!,
                    cardWidth,
                  ),
                )}
              </View>
            </View>
          </>,
        )}
      </ScrollView>
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: Platform.OS === 'web' ? 0 : insets.bottom,
        }}
      >
        <NewsDesignNavigation source={main} />
      </View>
      {menuSheet}
    </View>
  );
}

function StaticArt({
  source,
  x,
  y,
  w,
  h = w,
  rotate,
  radius = 0,
  fit = 'fill',
}: {
  source: number;
  x: number;
  y: number;
  w: number;
  h?: number;
  rotate?: string;
  radius?: number;
  fit?: 'cover' | 'contain' | 'fill';
}) {
  return (
    <Artwork
      source={source}
      width={w}
      height={h}
      fit={fit}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        borderRadius: radius,
        ...(rotate ? { transform: [{ rotate: rotate as `${number}deg` }] } : {}),
      }}
    />
  );
}
function LandingStatus({ assets: a }: { assets: Assets }) {
  if (Platform.OS !== 'web') return null;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 43 }}
    >
      <StaticArt source={a.imgTime!} x={12} y={12} w={52} h={21} />
      <Artwork
        source={a.imgRectangle}
        width={22}
        height={11.333}
        style={{ position: 'absolute', right: 27, top: 17.333 }}
      />
      <Artwork
        source={a.imgCombinedShape}
        width={1.328}
        height={4}
        style={{ position: 'absolute', right: 24.67, top: 21 }}
      />
      <Artwork
        source={a.imgRectangle1}
        width={18}
        height={7.333}
        style={{ position: 'absolute', right: 29, top: 19.333 }}
      />
      <Artwork
        source={a.imgWifi}
        width={15.272}
        height={10.966}
        style={{ position: 'absolute', right: 54.03, top: 17.333 }}
      />
      <Artwork
        source={a.imgMobileSignal}
        width={17}
        height={10.666}
        style={{ position: 'absolute', right: 74.33, top: 17.67 }}
      />
    </View>
  );
}
function MoreLink({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Xem thêm"
      onPress={onPress}
      style={{ flexDirection: 'row', gap: 6, alignItems: 'center', width: 79 }}
    >
      <Artwork source={main.imgArrowRight} width={14} />
      <T size={12} weight="semibold" color="#0F172A">
        Xem thêm
      </T>
    </Pressable>
  );
}
function LandingTabs({
  view,
  onChange,
  legacy = false,
  inEvents = false,
}: {
  view: LandingView;
  onChange: (view: LandingView) => void;
  legacy?: boolean;
  inEvents?: boolean;
}) {
  return (
    <View
      style={
        legacy
          ? {
              ...(inEvents
                ? { height: 25 }
                : { position: 'absolute' as const, left: 44, top: 342, width: 344, height: 27 }),
            }
          : { flexDirection: 'row', gap: 8, flexWrap: 'wrap' }
      }
    >
      {(['all', 'latest', 'events'] as const).map((id, index) => (
        <Pressable
          key={id}
          accessibilityRole="button"
          accessibilityLabel={['Tất cả', 'Tin mới nhất', 'Sự kiện sắp tới'][index]}
          accessibilityState={{ selected: view === id }}
          onPress={() => onChange(id)}
          style={{
            ...(legacy
              ? {
                  position: 'absolute' as const,
                  left: [0, 119, 241][index],
                  top: inEvents ? 0 : index,
                  width: 103,
                  height: 25,
                }
              : { height: 32, paddingHorizontal: 14 }),
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 16,
            borderWidth: view === id && !legacy ? 0 : 1,
            borderColor: legacy ? '#075A9C' : '#D7E7F3',
            backgroundColor: view === id ? '#147CC1' : '#FFFFFF',
          }}
        >
          <T
            size={legacy ? 11 : 13}
            weight={legacy || view === id ? 'bold' : 'semibold'}
            color={view === id ? '#FFFFFF' : legacy ? '#676767' : '#0F172A'}
          >
            {['Tất cả', 'Tin mới nhất', 'Sự kiện sắp tới'][index]}
          </T>
        </Pressable>
      ))}
    </View>
  );
}
function LegacyNewsHero({ assets: a, onMenu }: { assets: Assets; onMenu: () => void }) {
  return (
    <>
      <StaticArt source={a.imgRectangle951!} x={19} y={43} w={390} h={220} />
      <T
        size={6}
        color="#6B6B6B"
        style={{
          position: 'absolute',
          left: 70,
          top: 81,
          fontFamily: 'InknutAntiqua_700Bold',
          lineHeight: 15,
        }}
      >
        Cập nhật hôm nay, bảo vệ mai sau
      </T>
      {[92, 142, 192].map((y, i) => (
        <View key={y} style={{ position: 'absolute', left: 40, top: y, width: 20, height: 20 }}>
          <Artwork source={i ? a.imgEllipse117 : a.imgEllipse116} width={20} />
          <T
            size={10}
            weight="bold"
            color={i ? '#FFFFFF' : '#000000'}
            style={{ position: 'absolute', left: 7.27, top: 3.55 }}
          >
            {i + 1}
          </T>
        </View>
      ))}
      <T
        accessibilityRole="header"
        size={20}
        weight="bold"
        color="#366B87"
        lineHeight={24}
        style={{ position: 'absolute', left: 70, top: 100, width: 329 }}
      >
        {'CẬP NHẬT TIN TỨC\nVÌ MỘT HÀNH TINH XANH'}
      </T>
      {[112, 162].map((y) => (
        <StaticArt key={y} source={a.imgLine54!} x={35} y={y + 14.5} w={30} h={1} rotate="90deg" />
      ))}
      <T
        size={7}
        color="#6B6B6B"
        style={{
          position: 'absolute',
          left: 70,
          top: 148,
          fontFamily: 'InknutAntiqua_700Bold',
          lineHeight: 18,
        }}
      >
        Bắt đầu hành trình xanh
      </T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tìm hiểu ngay"
        onPress={() => router.push('/handbook')}
        style={{
          position: 'absolute',
          left: 70,
          top: 190,
          width: 65,
          height: 22,
          borderRadius: 15,
          backgroundColor: '#075A9C',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <T size={6} color="#FFFFFF" style={{ fontFamily: 'InknutAntiqua_700Bold', lineHeight: 15 }}>
          Tìm hiểu ngay
        </T>
      </Pressable>
      <StaticArt source={a.imgRectangle957!} x={246} y={208.11} w={163} h={55.889} />
      {[a.imgEllipse282, a.imgEllipse283, a.imgEllipse284, a.imgEllipse285].map((source, i) => (
        <StaticArt key={i} source={source!} x={[252, 267, 281, 295][i]!} y={233} w={28} />
      ))}
      <T
        size={6}
        color="#000000"
        style={{
          position: 'absolute',
          left: 329,
          top: 226,
          fontFamily: 'InknutAntiqua_700Bold',
          lineHeight: 15,
        }}
      >
        Cộng đồng xanh
      </T>
      <T
        size={6}
        color="#777777"
        lineHeight={7.26}
        style={{ position: 'absolute', left: 329, top: 240.74, width: 77 }}
      >
        Hàng nghìn người đã quan tâm đến môi trường
      </T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cộng đồng xanh"
        onPress={() => router.push('/community')}
        style={{ position: 'absolute', left: 246, top: 229, width: 163, height: 35 }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Khám phá thêm tin tức"
        onPress={onMenu}
        style={{ position: 'absolute', left: 305, top: 208, width: 100, height: 22 }}
      >
        <T
          size={8}
          color="#000000"
          style={{
            position: 'absolute',
            left: 15,
            top: 0,
            fontFamily: 'InknutAntiqua_700Bold',
            lineHeight: 21,
          }}
        >
          Xem thêm
        </T>
        <StaticArt source={a.imgImage54!} x={77} y={4} w={15} fit="cover" />
      </Pressable>
    </>
  );
}
function LandingCard({
  id,
  title,
  width,
  assets: a,
  cover,
  saved,
  liked,
  sample,
  previewCounts,
  splitTitle,
  onSave,
  onLike,
}: {
  id: string;
  title: string;
  width: number;
  assets: Assets;
  cover: number;
  saved: boolean;
  liked: boolean;
  sample: boolean;
  previewCounts?: [string, number];
  splitTitle?: boolean;
  onSave: () => void;
  onLike: () => void;
}) {
  const metadata = articleMetadata[id]!;
  const left = ['storm-cleanup', 'local-cleanup', 'ha-long', 'daily-waste'].includes(id);
  const viewCount =
    sample && previewCounts ? previewCounts[0] : `${Number((metadata.views / 1000).toFixed(1))}k`;
  const likes = (sample && previewCounts ? previewCounts[1] : metadata.likes) + Number(liked);
  const titles: Record<string, string> = {
    ...designTitles,
    'storm-cleanup': 'Người dân tham gia\ndọn rác sau bão số 13',
    'saigon-cleanup': 'Các bạn trẻ của nhóm Sài Gòn Xanh dọn rác ở ..',
    'youth-ideas': 'Các bạn trẻ với\nnhững ý tưởng xử lý ...',
    'daily-waste': 'Mỗi ngày, thế giới\nthải ra khoảng 11 triệu...',
  };
  return (
    <View
      style={{
        width,
        height: 174,
        borderRadius: 15,
        backgroundColor: '#FFFFFF',
        boxShadow: '0px 4px 4px rgba(0,0,0,0.25)',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Đọc ${title}`}
        onPress={() => openArticle(id)}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Artwork
          source={cover}
          width={width * 0.8824}
          height={90}
          fit="cover"
          style={{
            position: 'absolute',
            left: width * (left ? 0.0529 : 0.0588),
            top: 11,
            borderRadius: 10,
          }}
        />
        <T
          size={12}
          weight={left ? 'semibold' : 'bold'}
          color="#000000"
          numberOfLines={2}
          style={{
            position: 'absolute',
            left: width * 0.0647,
            top: 109,
            width: width * (left ? 0.8765 : 0.8882),
            height: 30,
          }}
        >
          {splitTitle ? 'Các bạn trẻ của nhóm \nSài Gòn Xanh dọn rác ở ..' : (titles[id] ?? title)}
        </T>
        <StaticArt
          source={a.imgImage37!}
          x={width * 0.0765}
          y={146}
          w={width * 0.0882}
          fit="cover"
        />
        <T
          size={10}
          weight="bold"
          color="#7F7F7F"
          style={{ position: 'absolute', left: width * 0.1647, top: 147 }}
        >
          {viewCount}
        </T>
        <T
          size={10}
          weight="bold"
          color="#7F7F7F"
          style={{ position: 'absolute', left: width * 0.8588, top: 146 }}
        >
          {likes}
        </T>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${saved ? 'Bỏ lưu bài' : 'Lưu bài'} ${title}`}
        accessibilityState={{ selected: saved }}
        onPress={onSave}
        hitSlop={8}
        style={{
          position: 'absolute',
          left: width * (left ? 0.8471 : 0.8529),
          top: left ? 109 : 106,
          opacity: saved ? 1 : 0.35,
        }}
      >
        <Artwork source={a.imgImage36} width={width * 0.0882} fit="cover" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${liked ? 'Bỏ thích bài' : 'Thích bài'} ${title}`}
        accessibilityState={{ selected: liked }}
        onPress={onLike}
        hitSlop={8}
        style={{ position: 'absolute', left: width * 0.7706, top: 145, opacity: liked ? 0.65 : 1 }}
      >
        <Artwork source={a.imgImage38} width={width * 0.0765} fit="cover" />
      </Pressable>
    </View>
  );
}
