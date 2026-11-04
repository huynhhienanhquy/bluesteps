import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  View,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { PrivateModal as Modal } from '../shared/PrivateModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Artwork } from '../../design-system/DesignScreen';
import { newsArtwork as a } from '../../design-system/catalog-artwork';
import { CatalogHeader, CurvedNavigation, MediaSlot } from '../shared/DesignParts';
import { router, useFocusEffect, useLocalSearchParams, usePathname } from 'expo-router';
import { Button, Card, Icon, IconButton, Label, Typography } from '../../design-system/ui';
import { useApp } from '../../providers';
import { dateLabel, type Schemas } from '../../services/api';
import { screenAddress } from '../../services/auth-return';
import { useCommand, usePages, useResource } from '../../services/queries';
import { CommandError, More, QueryState, RequireAuth } from '../shared/common';
import { ArticleContent, expandableArticleIntro } from './ArticleContent';
import { ArticleReadPage } from './ArticleReadPage';
import { articleCoverUrl } from './article-reading';

export function NewsScreen({ saved = false }: { saved?: boolean }) {
  const {
    view: requestedView,
    topic,
    q: search = '',
  } = useLocalSearchParams<{ view?: string; topic?: string; q?: string }>();
  const view = requestedView === 'events' || requestedView === 'latest' ? requestedView : 'all';
  const path = usePathname();
  const setSearch = (q: string) => router.setParams({ q });
  const [menu, setMenu] = useState(false);
  const query = usePages<Schemas['Article']>(
    saved
      ? '/v1/me/saved-articles?q=' +
          encodeURIComponent(search) +
          (topic ? '&topic=' + encodeURIComponent(topic) : '')
      : '/v1/articles?q=' +
          encodeURIComponent(search) +
          (topic ? '&topic=' + encodeURIComponent(topic) : ''),
    saved,
    saved || view !== 'events',
  );
  const events = usePages<Schemas['GreenEvent']>(
    '/v1/events?q=' + encodeURIComponent(search),
    false,
    view === 'events' && !saved,
  );
  const { dark, colors, status } = useApp();
  const { refetch: refreshArticles } = query;
  useFocusEffect(
    useCallback(() => {
      if (saved && status === 'authenticated') void refreshArticles();
    }, [refreshArticles, saved, status]),
  );
  const items = (query.data?.pages.flatMap((page) => page.items) ?? []).sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  const eventItems = events.data?.pages.flatMap((page) => page.items) ?? [];
  const main = path === '/articles' && !saved && !topic;
  const gridItems = main && view === 'all' && !search ? items.slice(1) : items;
  const insets = useSafeAreaInsets(),
    width = Math.min(428, useWindowDimensions().width);
  const gridWidth = (width - 48) / 2;
  const content = (
    <>
      {main ? (
        <NewsHero />
      ) : (
        <CatalogHeader
          onBack={
            saved
              ? () => (router.canGoBack() ? router.back() : router.replace('/articles'))
              : undefined
          }
          title={
            saved
              ? 'Bài viết đã lưu'
              : path === '/articles/briefs'
                ? 'Bản tin nhanh'
                : 'Tìm kiếm và kết quả'
          }
        />
      )}
      <View
        style={{
          height: 44,
          backgroundColor: colors.surface,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: '#D7E7F3',
          paddingLeft: 16,
          paddingRight: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#147CC1',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Artwork source={a.search} width={16} />
        </View>
        <TextInput
          accessibilityLabel="Tìm bài viết"
          placeholder="Tìm kiếm..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
          maxLength={200}
          style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 14,
            flex: 1,
            minWidth: 0,
            height: 42,
            padding: 0,
            color: colors.text,
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đã lưu"
          onPress={() => router.push({ pathname: '/articles/saved', params: { q: search, topic } })}
          style={{ height: 36, justifyContent: 'center', paddingHorizontal: 5 }}
        >
          <Label family="inter" size={11} weight="semibold" color="#147CC1">
            ♥ Đã lưu
          </Label>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mở menu tin tức"
          onPress={() => setMenu(true)}
          style={{ minWidth: 30, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
        >
          <Artwork source={a.menu} width={22} />
        </Pressable>
      </View>
      {!saved ? (
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {[
            { key: 'all', title: 'Tất cả' },
            { key: 'latest', title: 'Tin mới nhất' },
            { key: 'events', title: 'Sự kiện sắp tới' },
          ].map((tab) => (
            <Pressable
              key={tab.key}
              accessibilityRole="button"
              accessibilityLabel={tab.title}
              accessibilityState={{ selected: view === tab.key }}
              aria-pressed={view === tab.key}
              onPress={() => router.setParams({ view: tab.key })}
              style={{
                minHeight: 32,
                paddingVertical: 7,
                paddingHorizontal: 14,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: view === tab.key ? '#147CC1' : '#D7E7F3',
                backgroundColor: view === tab.key ? '#147CC1' : colors.surface,
              }}
            >
              <Label
                family="inter"
                size={13}
                weight={view === tab.key ? 'bold' : 'semibold'}
                color={view === tab.key ? '#FFFFFF' : colors.text}
                style={{ lineHeight: 16 }}
              >
                {tab.title}
              </Label>
            </Pressable>
          ))}
        </View>
      ) : null}
      {view === 'events' && !saved ? (
        <QueryState
          query={events}
          empty={!eventItems.length}
          emptyText="Chưa có sự kiện được công bố"
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {eventItems.map((event) => (
              <Pressable
                key={event.id}
                accessibilityRole="button"
                accessibilityLabel={event.title}
                onPress={() =>
                  router.push({ pathname: '/articles/events/[id]', params: { id: event.id } })
                }
                style={{
                  width: gridWidth,
                  backgroundColor: colors.surface,
                  borderRadius: 15,
                  overflow: 'hidden',
                  padding: 10,
                  gap: 10,
                }}
              >
                <MediaSlot
                  uri={
                    typeof event.details.imageUrl === 'string' ? event.details.imageUrl : undefined
                  }
                  icon="calendar-outline"
                  style={{ height: 110, borderRadius: 10 }}
                />
                <Label family="inter" size={14} bold style={{ lineHeight: 20 }}>
                  {event.title}
                </Label>
                <Label family="inter" size={11} color={colors.muted}>
                  {dateLabel(event.startsAt)}
                </Label>
              </Pressable>
            ))}
          </View>
          <More query={events} />
        </QueryState>
      ) : (
        <>
          {main && view === 'all' && !search ? (
            <View
              style={{
                gap: 12,
                padding: 16,
                borderRadius: 20,
                backgroundColor: colors.surface,
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
                <Label family="inter" size={12} bold style={{ lineHeight: 16 }}>
                  Bài nổi bật
                </Label>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Xem thêm bài nổi bật"
                  onPress={() => router.push('/articles/search')}
                  style={{ minHeight: 32, flexDirection: 'row', gap: 6, alignItems: 'center' }}
                >
                  <Artwork source={a.arrow} width={14} />
                  <Label family="inter" size={12} weight="semibold">
                    Xem thêm
                  </Label>
                </Pressable>
              </View>
              <QueryState query={query} empty={!items.length} emptyText="Chưa có bài viết nổi bật">
                {items[0] ? <NewsCard article={items[0]} featured /> : null}
              </QueryState>
            </View>
          ) : null}
          <View style={{ gap: 12 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Label family="inter" size={16} bold heading style={{ lineHeight: 22 }}>
                {saved ? 'Bài đọc đã lưu' : view === 'latest' ? 'Tin mới nhất' : 'Tất cả bài viết'}
              </Label>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Xem tất cả bài viết"
                onPress={() => router.push('/articles/search')}
                style={{ minHeight: 32, justifyContent: 'center' }}
              >
                <Label family="inter" size={12} weight="semibold">
                  Xem thêm →
                </Label>
              </Pressable>
            </View>
            <QueryState
              query={query}
              empty={!gridItems.length}
              emptyText={saved ? 'Chưa có bài viết đã lưu' : 'Chưa có bài viết khác được công bố'}
            >
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                {gridItems.map((article) => (
                  <View key={article.id} style={{ width: gridWidth }}>
                    <NewsCard article={article} />
                  </View>
                ))}
              </View>
            </QueryState>
            <More query={query} />
          </View>
        </>
      )}
    </>
  );
  return (
    <Typography.Provider value="inter">
      <View style={{ flex: 1, backgroundColor: dark ? colors.background : '#F0F9FF' }}>
        <View style={{ height: Platform.OS === 'web' ? 49 : insets.top }} />
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 24,
            gap: 16,
          }}
        >
          {saved ? <RequireAuth>{content}</RequireAuth> : content}
        </ScrollView>
        <CurvedNavigation selected={main ? 'home' : null} />
        <Modal
          visible={menu}
          transparent
          animationType="fade"
          onRequestClose={() => setMenu(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(15,23,42,0.3)',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng menu"
              onPress={() => setMenu(false)}
              style={{ position: 'absolute', inset: 0 }}
            />
            <View
              style={{
                width: '100%',
                maxWidth: 360,
                padding: 20,
                gap: 4,
                backgroundColor: colors.surface,
                borderRadius: 20,
              }}
            >
              <Label family="inter" size={18} bold style={{ marginBottom: 12 }}>
                Khám phá tin tức
              </Label>
              {(
                [
                  { title: 'Tìm bài viết', path: '/articles/search' },
                  { title: 'Bài đọc đã lưu', path: '/articles/saved' },
                  { title: 'Danh sách đọc', path: '/articles/reading-list' },
                  { title: 'Chủ đề', path: '/articles/topics' },
                  { title: 'Lịch xanh', path: '/articles/calendar' },
                  { title: 'Bản tin nhanh', path: '/articles/briefs' },
                ] as const
              ).map((link) => (
                <Button
                  key={link.path}
                  title={link.title}
                  variant="quiet"
                  onPress={() => {
                    setMenu(false);
                    router.push(link.path);
                  }}
                />
              ))}
              <Button title="Đóng" variant="secondary" onPress={() => setMenu(false)} />
            </View>
          </View>
        </Modal>
      </View>
    </Typography.Provider>
  );
}
function NewsHero() {
  const { colors } = useApp();
  return (
    <View style={{ minHeight: 268, borderRadius: 24, overflow: 'hidden', padding: 20, gap: 12 }}>
      <Artwork
        source={a.hero}
        width={396}
        height={268}
        fit="cover"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
        }}
      />
      <View
        pointerEvents="none"
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,23,42,0.45)' }}
      />
      <Label family="inter" size={20} bold color="#FFFFFF" heading style={{ lineHeight: 24 }}>
        CẬP NHẬT TIN TỨC{'\n'}VÌ MỘT HÀNH TINH XANH
      </Label>
      {['Cập nhật hôm nay, bảo vệ mai sau', 'Bắt đầu hành trình xanh', 'Tìm hiểu ngay'].map(
        (text, index) => (
          <View key={text} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
              <Label family="inter" size={10} bold color="#0F172A" style={{ lineHeight: 13 }}>
                {index + 1}
              </Label>
            </View>
            {index === 2 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={text}
                onPress={() => router.push('/articles/topics')}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: '#FFF',
                }}
              >
                <Label family="inter" size={12} bold color="#0F172A" style={{ lineHeight: 16 }}>
                  {text}
                </Label>
              </Pressable>
            ) : (
              <Label
                family="inter"
                size={12}
                weight="semibold"
                color="#FFFFFF"
                style={{ lineHeight: 16, flex: 1 }}
              >
                {text}
              </Label>
            )}
          </View>
        ),
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cộng đồng xanh"
        onPress={() => router.push('/community')}
        style={{
          padding: 12,
          borderRadius: 16,
          backgroundColor: colors.surface,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <View style={{ flexDirection: 'row', paddingRight: 8 }}>
          {a.people.map((source, index) => (
            <Artwork
              key={index}
              source={source}
              width={28}
              style={{ marginRight: -8, borderRadius: 14 }}
            />
          ))}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Label family="inter" size={12} bold style={{ lineHeight: 15 }}>
            Cộng đồng xanh
          </Label>
          <Label family="inter" size={10} color={colors.muted} style={{ lineHeight: 13 }}>
            Hành động nhỏ, tương lai xanh
          </Label>
        </View>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: colors.soft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Artwork source={a.arrow} width={14} />
        </View>
      </Pressable>
    </View>
  );
}
export function NewsCard({
  article,
  featured = false,
}: {
  article: Schemas['Article'] & Partial<Pick<Schemas['ReadingArticle'], 'progress'>>;
  featured?: boolean;
}) {
  const { status, colors } = useApp();
  const pathname = usePathname();
  const params = useLocalSearchParams();
  const engagement = useResource<Schemas['ArticleEngagement']>(
    '/v1/articles/' + article.id + '/engagement',
    false,
    status === 'authenticated',
  );
  const command = useCommand();
  const liking = useRef(false);
  const likeDisabled = command.isPending || (status === 'authenticated' && !engagement.data);
  const resume = article.progress != null && article.progress > 0 && article.progress < 100;
  return (
    <View
      style={{
        borderRadius: 15,
        backgroundColor: colors.surface,
        padding: featured ? 0 : 10,
        gap: 10,
        boxShadow: featured ? undefined : '0px 4px 4px rgba(0,0,0,0.15)',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={article.title}
        onPress={() =>
          router.push({
            pathname: '/articles/[id]',
            params: { id: article.id, resume: resume ? '1' : undefined },
          })
        }
        style={{ gap: 10 }}
      >
        <MediaSlot
          code={article.code}
          uri={articleCoverUrl(article)}
          icon="newspaper-outline"
          style={{ height: featured ? 160 : 90, borderRadius: featured ? 16 : 10 }}
        />
        <Label
          family="inter"
          size={featured ? 18 : 12}
          bold
          style={{ lineHeight: featured ? 24 : 16 }}
        >
          {article.title}
        </Label>
      </Pressable>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 4,
        }}
      >
        <Label family="inter" size={featured ? 12 : 10} color={colors.muted} style={{ flex: 1 }}>
          {article.topic}
        </Label>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={engagement.data?.liked ? 'Bỏ thích bài viết' : 'Thích bài viết'}
          disabled={likeDisabled}
          accessibilityState={{
            selected: engagement.data?.liked ?? false,
            disabled: likeDisabled,
          }}
          onPress={() => {
            if (status !== 'authenticated') {
              router.push({
                pathname: '/login',
                params: { returnTo: screenAddress(pathname, params) },
              });
              return;
            }
            if (!engagement.data || liking.current) return;
            liking.current = true;
            void command
              .mutateAsync({
                path: `/v1/articles/${article.id}/reaction`,
                method: engagement.data.liked ? 'DELETE' : 'PUT',
              })
              .catch(() => engagement.refetch())
              .finally(() => {
                liking.current = false;
              });
          }}
          style={{
            minHeight: 32,
            minWidth: 32,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 4,
          }}
        >
          <Icon
            name={engagement.data?.liked ? 'heart' : 'heart-outline'}
            size={16}
            color="#FD4E4E"
          />
          {engagement.data ? (
            <Label family="inter" size={10}>
              {engagement.data.likes}
            </Label>
          ) : null}
        </Pressable>
      </View>
      {article.progress != null ? (
        <Label size={11} color={colors.muted}>
          {article.progress === 100
            ? 'Đã đọc'
            : article.progress > 0
              ? `Đọc tiếp · ${article.progress}%`
              : 'Chưa đọc'}
        </Label>
      ) : null}
      <CommandError error={command.error} />
    </View>
  );
}

export function ArticleScreen() {
  const { id, resume } = useLocalSearchParams<{ id: string; resume?: string }>();
  const { user } = useApp();
  return (
    <ArticleDetail
      key={`${user?.id ?? 'guest'}:${id}:${resume === '1' ? 'resume' : 'start'}`}
      id={id}
      resume={resume}
    />
  );
}

function ArticleDetail({ id, resume }: { id: string; resume?: string }) {
  const article = useResource<Schemas['Article']>(`/v1/articles/${id}`);
  const engagement = useResource<{ likes: number; liked: boolean; saved: boolean }>(
    `/v1/articles/${id}/engagement`,
  );
  const command = useCommand();
  const { status } = useApp();
  const updatingEngagement = useRef(false);
  const toggleEngagement = (action: 'like' | 'save') => {
    if (status !== 'authenticated' || !engagement.data || updatingEngagement.current) return;
    updatingEngagement.current = true;
    const liked = action === 'like';
    void command
      .mutateAsync({
        path: liked ? `/v1/articles/${id}/reaction` : `/v1/me/saved-articles/${id}`,
        method: (liked ? engagement.data.liked : engagement.data.saved) ? 'DELETE' : 'PUT',
      })
      .catch(() => engagement.refetch())
      .finally(() => {
        updatingEngagement.current = false;
      });
  };
  const reading = useResource<Schemas['ReadingProgress']>(`/v1/me/article-reading/${id}`, true);
  const progressCommand = useCommand<Schemas['ReadingProgress']>();
  const [introExpanded, setIntroExpanded] = useState(resume === '1');
  const savingProgress = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const geometry = useRef({
    id,
    bodyY: 0,
    bodyHeight: 0,
    navigationHeight: 0,
    viewport: 0,
    restored: false,
    sent: 0,
    latest: 0,
  });
  useEffect(() => {
    if (geometry.current.id !== id)
      geometry.current = {
        id,
        bodyY: 0,
        bodyHeight: 0,
        navigationHeight: 0,
        viewport: 0,
        restored: false,
        sent: 0,
        latest: 0,
      };
  }, [id]);
  useEffect(() => {
    if (resume === '1') setIntroExpanded(true);
  }, [resume]);
  async function saveProgress() {
    const current = geometry.current;
    const path = `/v1/me/article-reading/${id}`;
    if (savingProgress.current) return;
    savingProgress.current = true;
    try {
      while (
        mounted.current &&
        current.latest > Math.max(current.sent, reading.data?.progress ?? 0)
      ) {
        const progress = current.latest;
        const saved = await progressCommand.mutateAsync({
          path,
          method: 'PUT',
          body: { progress },
        });
        current.sent = Math.max(current.sent, progress, saved.progress);
      }
    } catch {
      // Keep the latest reading position available for retry.
    } finally {
      savingProgress.current = false;
    }
  }
  const restore = () => {
    const current = geometry.current;
    if (
      resume !== '1' ||
      current.restored ||
      !article.data ||
      !reading.data ||
      !current.viewport ||
      !current.bodyHeight ||
      !current.navigationHeight
    )
      return;
    current.restored = true;
    const progress = Math.min(95, reading.data.progress);
    scroll.current?.scrollTo({
      y:
        (Math.max(
          0,
          current.bodyY + current.bodyHeight - current.viewport + current.navigationHeight,
        ) *
          progress) /
        100,
      animated: false,
    });
  };
  useEffect(() => {
    restore();
    // Geometry callbacks also restore when layout arrives after the saved progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, article.data?.id, reading.data?.progress, resume]);
  return (
    <ArticleReadPage
      article={article.data}
      action={
        status === 'authenticated' ? (
          <IconButton
            name={engagement.data?.saved ? 'bookmark' : 'bookmark-outline'}
            label={engagement.data?.saved ? 'Bỏ lưu vào danh sách đọc' : 'Lưu vào danh sách đọc'}
            disabled={!engagement.data || command.isPending}
            onPress={() => toggleEngagement('save')}
          />
        ) : undefined
      }
      scrollRef={scroll}
      onLayout={(event) => {
        geometry.current.viewport = event.nativeEvent.layout.height;
        restore();
      }}
      onBodyLayout={(y) => {
        geometry.current.bodyY = y;
        restore();
      }}
      onNavigationLayout={(height) => {
        geometry.current.navigationHeight = height;
        restore();
      }}
      onScroll={(event) => {
        if (status !== 'authenticated' || !reading.data || !article.data || article.isError) return;
        const { contentOffset } = event.nativeEvent;
        const current = geometry.current;
        if (
          !current.bodyHeight ||
          !current.navigationHeight ||
          contentOffset.y <= 0 ||
          (resume === '1' && !current.restored)
        )
          return;
        const available = Math.max(
          1,
          current.bodyY + current.bodyHeight - current.viewport + current.navigationHeight,
        );
        const maximum = !introExpanded && expandableArticleIntro(article.data) ? 90 : 100;
        const progress = Math.max(
          5,
          Math.min(maximum, Math.floor((contentOffset.y / available) * 10) * 10),
        );
        geometry.current.latest = Math.max(geometry.current.latest, progress);
        void saveProgress();
      }}
    >
      <QueryState query={article}>
        {article.data && (
          <>
            <View
              onLayout={(event) => {
                geometry.current.bodyHeight = event.nativeEvent.layout.height;
                restore();
              }}
              style={{ gap: 18 }}
            >
              <Label size={11}>Đăng ngày {dateLabel(article.data.createdAt)}</Label>
              <ArticleContent
                article={article.data}
                expanded={introExpanded}
                onExpand={() => setIntroExpanded(true)}
              />
            </View>
            <QueryState query={engagement}>
              {engagement.data && (
                <Card>
                  <Label>{engagement.data.likes} lượt thích</Label>
                  {status === 'authenticated' ? (
                    <>
                      <Button
                        title={engagement.data.liked ? 'Bỏ thích bài viết' : 'Thích bài viết'}
                        pending={command.isPending}
                        onPress={() => toggleEngagement('like')}
                      />
                      <Button
                        title={engagement.data.saved ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}
                        pending={command.isPending}
                        variant="secondary"
                        onPress={() => toggleEngagement('save')}
                      />
                    </>
                  ) : (
                    <Button
                      title="Đăng nhập để thích hoặc lưu"
                      onPress={() =>
                        router.push({
                          pathname: '/login',
                          params: {
                            returnTo: `/articles/${encodeURIComponent(id)}${resume === '1' ? '?resume=1' : ''}`,
                          },
                        })
                      }
                    />
                  )}
                </Card>
              )}
            </QueryState>
            <CommandError error={command.error} />
            {status === 'authenticated' ? (
              <>
                <Label size={12}>
                  {reading.data?.progress === 100
                    ? 'Đã đọc xong bài viết'
                    : `Tiến độ đã lưu: ${reading.data?.progress ?? 0}%`}
                </Label>
                <Button
                  title={reading.data?.progress === 100 ? 'Đã đọc' : 'Đánh dấu đã đọc'}
                  disabled={reading.data?.progress === 100}
                  pending={progressCommand.isPending}
                  onPress={() => {
                    geometry.current.latest = 100;
                    void saveProgress();
                  }}
                />
                {progressCommand.isError && geometry.current.latest > 0 ? (
                  <Button
                    title="Thử lưu lại tiến độ"
                    variant="quiet"
                    pending={progressCommand.isPending}
                    onPress={() => void saveProgress()}
                  />
                ) : null}
                <Button
                  title="Danh sách đọc"
                  variant="quiet"
                  onPress={() => router.push('/articles/reading-list')}
                />
                <CommandError error={reading.error ?? progressCommand.error} />
              </>
            ) : null}
            <Button
              title="Thảo luận"
              onPress={() =>
                router.push({
                  pathname: '/articles/discussion',
                  params: { id, resume: resume === '1' ? '1' : undefined },
                })
              }
            />
          </>
        )}
      </QueryState>
    </ArticleReadPage>
  );
}
