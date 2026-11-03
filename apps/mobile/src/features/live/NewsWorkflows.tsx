import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Artwork, StatusSpace } from '../../design-system/DesignScreen';
import { Button, Chip, Icon, IconButton, Label, Typography } from '../../design-system/ui';
import { useApp } from '../../providers';
import { dateLabel, type Page, type Schemas } from '../../services/api';
import { useCommand, usePages, useResource } from '../../services/queries';
import { CommandError, More, QueryState, RequireAuth } from './common';
import { CurvedNavigation, MediaSlot } from './DesignParts';
import {
  calendarDateKey,
  isCalendarDate,
  shiftCalendarDate,
  shiftCalendarMonth,
} from './calendar-model';
import { eventTimeRange } from './event-time';
import { NewsCard } from './NewsScreens';
import { articleCoverUrl, estimatedReadingMinutes } from './article-reading';
export { estimatedReadingMinutes } from './article-reading';

const badges = [
  require('../../../assets/figma/612-5441/imgSTin.svg'),
  require('../../../assets/figma/612-5441/imgSTin1.svg'),
  require('../../../assets/figma/612-5441/imgSTin2.svg'),
];

export function NewsPage({
  title,
  description,
  eyebrow,
  children,
}: PropsWithChildren<{
  title: string;
  description: string;
  eyebrow?: string;
}>) {
  const { colors, dark } = useApp();
  const insets = useSafeAreaInsets();
  return (
    <Typography.Provider value="inter">
      <View style={{ flex: 1, backgroundColor: dark ? colors.background : '#F1F9FD' }}>
        <StatusSpace />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: 140 + insets.bottom,
            gap: 24,
          }}
        >
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, gap: 7 }}>
                {eyebrow ? (
                  <Label size={11} bold color="#167EC1">
                    {eyebrow}
                  </Label>
                ) : null}
                <Label size={27} bold heading style={{ lineHeight: 35 }}>
                  {title}
                </Label>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Quay lại Tin tức"
                onPress={() => router.dismissTo('/articles')}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#D9F0FC',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Label size={20} color="#147CC1">
                  ‹
                </Label>
              </Pressable>
            </View>
            <Label size={13} color={colors.muted}>
              {description}
            </Label>
          </View>
          {children}
        </ScrollView>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
          <CurvedNavigation variant="news" />
        </View>
      </View>
    </Typography.Provider>
  );
}

export function NewsCalendarScreen() {
  const { user } = useApp();
  return <NewsCalendar key={user?.id ?? 'guest'} />;
}

function NewsCalendar() {
  const { month: requestedMonth } = useLocalSearchParams<{ month?: string }>();
  const preferences = useResource<Schemas['Preferences']>('/v1/me/preferences', true);
  const timezone = preferences.data?.timezone ?? 'Asia/Ho_Chi_Minh';
  const month =
    requestedMonth && isCalendarDate(requestedMonth + '-01')
      ? requestedMonth
      : calendarDateKey(new Date(), timezone).slice(0, 7);
  const setChosen = (value: string | null) => router.setParams({ month: value ?? '' });
  const query = useResource<Schemas['NewsCalendar']>(
    `/v1/news-calendar?month=${month}&timezone=${encodeURIComponent(timezone)}`,
  );
  const { colors } = useApp();
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );
  return (
    <NewsPage
      title="Lịch sự kiện"
      eyebrow="CỘNG ĐỒNG XANH"
      description="Tham gia những hoạt động gần bạn."
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: 20,
          minHeight: 84,
          padding: 12,
          gap: 16,
        }}
      >
        <Button
          title="‹"
          accessibilityLabel="Tháng trước"
          disabled={month === '0001-01'}
          variant="quiet"
          onPress={() => setChosen(shiftCalendarMonth(month + '-01', -1).slice(0, 7))}
        />
        <View style={{ flex: 1, gap: 3 }}>
          <Label size={18} bold>
            Tháng {Number(month.slice(5))}, {month.slice(0, 4)}
          </Label>
          <Label size={12} color={colors.muted}>
            {query.data ? `${query.data.upcoming} hoạt động sắp tới` : 'Đang tải lịch…'}
          </Label>
        </View>
        <Button
          title="›"
          accessibilityLabel="Tháng sau"
          disabled={month === '9999-12'}
          variant="quiet"
          onPress={() => setChosen(shiftCalendarMonth(month + '-01', 1).slice(0, 7))}
        />
      </View>
      <Label size={18} bold heading>
        Hoạt động trong tháng
      </Label>
      <QueryState
        query={query}
        empty={!query.data?.items.length}
        emptyText="Tháng này chưa có hoạt động được công bố"
      >
        {query.data?.items.map((event, index) => {
          const local = calendarDateKey(event.startsAt, timezone);
          return (
            <Pressable
              key={event.id}
              accessibilityRole="button"
              accessibilityLabel={event.title}
              onPress={() =>
                router.push({ pathname: '/articles/events/[id]', params: { id: event.id, month } })
              }
              style={{
                minHeight: 124,
                borderRadius: 19,
                backgroundColor: colors.surface,
                padding: 14,
                flexDirection: 'row',
                gap: 14,
              }}
            >
              <View
                style={{
                  width: 66,
                  height: 78,
                  borderRadius: 14,
                  backgroundColor: ['#DAF0FC', '#E0F6E8', '#FAF2DC'][index % 3],
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                }}
              >
                <Label size={24} bold color="#167EC1">
                  {local.slice(8)}
                </Label>
                <Label size={11} color="#5B7385">
                  T{Number(local.slice(5, 7))}
                </Label>
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                <Label size={15} bold>
                  {event.title}
                </Label>
                <Label size={11} color={colors.muted}>
                  {event.location}
                </Label>
                <Label size={11} color={colors.muted}>
                  {eventTimeRange(event, timezone)}
                </Label>
                <Label size={11} color="#167EC1">
                  Xem chi tiết →
                </Label>
              </View>
            </Pressable>
          );
        })}
      </QueryState>
      <Button title="Về tháng hiện tại" variant="quiet" onPress={() => setChosen(null)} />
      <Button
        title="Xem tin sự kiện liên quan →"
        onPress={() => router.push('/articles?view=events')}
      />
      <Button
        title="Lịch hoạt động của tôi"
        variant="quiet"
        onPress={() => router.push('/calendar')}
      />
    </NewsPage>
  );
}

export function NewsBriefsScreen() {
  const { day } = useLocalSearchParams<{ day?: string }>();
  const { user } = useApp();
  return (
    <DailyBriefs
      key={`${user?.id ?? 'guest'}:${day ?? ''}`}
      initialDay={isCalendarDate(day) ? day : undefined}
    />
  );
}

function DailyBriefs({ initialDay }: { initialDay?: string }) {
  const [day, setDay] = useState<string | null>(initialDay ?? null);
  const preferences = useResource<Schemas['Preferences']>('/v1/me/preferences', true);
  const timezone = preferences.data?.timezone ?? 'Asia/Ho_Chi_Minh';
  const query = useResource<Schemas['DailyBriefs']>(
    `/v1/article-briefs?timezone=${encodeURIComponent(timezone)}${day ? '&day=' + day : ''}`,
  );
  const { colors } = useApp();
  const current = day ?? query.data?.date;
  return (
    <NewsPage
      title="Bản tin nhanh"
      eyebrow="TÓM TẮT MỖI NGÀY"
      description="Nắm ý chính chỉ trong vài phút."
    >
      <View
        style={{
          borderRadius: 18,
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: '#DDF2FB',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Label size={11} bold color="#167EC1" style={{ flex: 1, lineHeight: 18 }}>
            {current
              ? new Intl.DateTimeFormat('vi-VN', { weekday: 'long', timeZone: 'UTC' })
                  .format(new Date(current + 'T12:00:00Z'))
                  .toLocaleUpperCase('vi')
              : 'BẢN TIN'}
          </Label>
          {[-1, 1].map((offset) => (
            <Pressable
              key={offset}
              accessibilityRole="button"
              accessibilityLabel={offset < 0 ? 'Ngày trước' : 'Ngày sau'}
              disabled={
                !current ||
                (offset < 0 && current === '0001-01-01') ||
                (offset > 0 && current >= calendarDateKey(new Date(), timezone))
              }
              onPress={() => current && setDay(shiftCalendarDate(current, offset))}
              style={{
                width: 36,
                height: 24,
                alignItems: 'center',
                justifyContent: 'center',
                opacity:
                  offset > 0 && current && current >= calendarDateKey(new Date(), timezone)
                    ? 0.4
                    : 1,
              }}
            >
              <Label size={20} color="#167EC1">
                {offset < 0 ? '‹' : '›'}
              </Label>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Label size={19} bold color="#163345" style={{ flex: 1, lineHeight: 24 }}>
            {current
              ? `${Number(current.slice(8))} tháng ${Number(current.slice(5, 7))}`
              : 'Đang tải…'}
          </Label>
          <Label size={12} color="#167EC1">
            {query.data?.items.length ?? '—'} tin mới
          </Label>
        </View>
      </View>
      <QueryState
        query={query}
        empty={!query.data?.items.length}
        emptyText="Ngày này chưa có bản tin được công bố"
      >
        {query.data?.items.map((article, index) => (
          <Pressable
            key={article.id}
            accessibilityRole="button"
            accessibilityLabel={article.title}
            onPress={() => router.push({ pathname: '/articles/[id]', params: { id: article.id } })}
            style={{
              minHeight: 142,
              padding: 16,
              gap: 12,
              flexDirection: 'row',
              borderRadius: 20,
              backgroundColor: colors.surface,
            }}
          >
            <View style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}>
              <Artwork
                source={badges[index % 3]}
                width={38}
                height={38}
                style={{ position: 'absolute', inset: 0 }}
              />
              <Label size={13} bold color="#167EC1">
                {String(index + 1).padStart(2, '0')}
              </Label>
            </View>
            <View style={{ flex: 1, gap: 12 }}>
              <Label size={16} bold>
                {article.title}
              </Label>
              <Label size={12} color={colors.muted}>
                {article.summary}
              </Label>
              <Label size={11} color="#167EC1">
                Đọc bài đầy đủ →
              </Label>
            </View>
          </Pressable>
        ))}
      </QueryState>
      {day ? (
        <Button title="Về bản tin mới nhất" variant="quiet" onPress={() => setDay(null)} />
      ) : null}
      <Label size={12} color="#306980">
        ✦ Mỗi hành động nhỏ đều tạo thay đổi lớn.
      </Label>
    </NewsPage>
  );
}

function ArticleRow({
  article,
}: {
  article: Schemas['Article'] & Partial<Schemas['ReadingArticle']>;
}) {
  const { colors } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={article.title}
      onPress={() =>
        router.push({
          pathname: '/articles/[id]',
          params: {
            id: article.id,
            resume: article.progress && article.progress < 100 ? '1' : undefined,
          },
        })
      }
      style={{
        flexDirection: 'row',
        gap: 14,
        minHeight: 112,
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 10,
      }}
    >
      <MediaSlot
        code={article.code}
        uri={articleCoverUrl(article)}
        icon="newspaper-outline"
        style={{ width: 106, height: 92, borderRadius: 10 }}
      />
      <View style={{ flex: 1, gap: 8 }}>
        <Label size={10} bold color="#147CC1">
          {article.topic.toLocaleUpperCase('vi')}
        </Label>
        <Label size={14} bold style={{ lineHeight: 21 }}>
          {article.title}
        </Label>
        <Label size={10} color={colors.muted}>
          Khoảng {estimatedReadingMinutes(article)} phút đọc
          {article.progress
            ? ` · ${article.progress === 100 ? 'Đã đọc' : 'Đã đọc ' + article.progress + '%'}`
            : ''}
        </Label>
        {article.progress && article.progress < 100 ? (
          <View
            accessibilityLabel={`Tiến độ đọc ${article.progress}%`}
            style={{ height: 4, borderRadius: 2, backgroundColor: '#D9F0FC' }}
          >
            <View
              style={{
                width: `${article.progress}%`,
                height: 4,
                backgroundColor: '#147CC1',
                borderRadius: 2,
              }}
            />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export function ReadingListScreen() {
  const { status } = useApp();
  const params = useLocalSearchParams<{ layout?: string; state?: string }>();
  const layout = params.layout === 'grid' ? 'grid' : 'list';
  const state =
    params.state === 'unread' || params.state === 'reading' || params.state === 'completed'
      ? params.state
      : 'all';
  const query = usePages<Schemas['ReadingArticle']>(`/v1/me/reading-list?state=${state}`, true);
  const summary = useResource<{
    total: number;
    unread: number;
    reading: number;
    completed: number;
  }>('/v1/me/reading-summary', true);
  const { refetch: refreshList } = query;
  const { refetch: refreshSummary } = summary;
  useFocusEffect(
    useCallback(() => {
      if (status !== 'authenticated') return;
      void refreshList();
      void refreshSummary();
    }, [refreshList, refreshSummary, status]),
  );
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <NewsPage title="Danh sách đọc" description="Những câu chuyện bạn muốn đọc lại">
      <RequireAuth>
        <View style={{ padding: 15, backgroundColor: '#D9F0FC', borderRadius: 14 }}>
          <Label size={14} bold color="#0B2E4F">
            ▣ Bạn đã lưu {summary.data?.total ?? '—'} bài viết
          </Label>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[
            { id: 'all' as const, label: 'Tất cả' },
            { id: 'unread' as const, label: 'Chưa đọc' },
            { id: 'reading' as const, label: 'Đọc tiếp' },
            { id: 'completed' as const, label: 'Đã đọc' },
          ].map((filter) => (
            <Chip
              key={filter.id}
              label={filter.label}
              selected={state === filter.id}
              onPress={() => router.setParams({ state: filter.id })}
            />
          ))}
        </View>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Label size={20} bold heading>
            Đọc khi bạn có thời gian
          </Label>
        </View>
        <Button
          title={layout === 'list' ? 'Xem lưới →' : 'Xem danh sách →'}
          variant="quiet"
          onPress={() => router.setParams({ layout: layout === 'list' ? 'grid' : 'list' })}
        />
        <QueryState
          query={query}
          empty={!items.length}
          emptyText="Chưa có bài viết trong danh sách này"
        >
          <View
            style={{
              flexDirection: layout === 'grid' ? 'row' : 'column',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            {items.map((article, index) =>
              layout === 'grid' ? (
                <View key={article.id} style={{ width: '48%' }}>
                  <NewsCard article={article} />
                </View>
              ) : index === 0 && state === 'all' ? (
                <View key={article.id} style={{ width: '100%' }}>
                  <NewsCard article={article} featured />
                  <Label size={11}>Đã lưu {dateLabel(article.savedAt)}</Label>
                </View>
              ) : (
                <View key={article.id} style={{ width: '100%' }}>
                  <ArticleRow article={article} />
                </View>
              ),
            )}
          </View>
          <More query={query} />
        </QueryState>
      </RequireAuth>
    </NewsPage>
  );
}

export function NewsSearchScreen() {
  const { user } = useApp();
  return <NewsSearch key={user?.id ?? 'guest'} />;
}

function NewsSearch() {
  const params = useLocalSearchParams<{
    q?: string;
    topic?: string;
    days?: string;
    layout?: string;
  }>();
  const search = (params.q ?? '').trim().slice(0, 100);
  const topic = params.topic ?? '';
  const days = params.days === '7' ? 7 : params.days === '30' ? 30 : null;
  const layout = params.layout === 'grid' ? 'grid' : 'list';
  const [draft, setDraft] = useState(search);
  useEffect(() => setDraft(search), [search]);
  const { status, colors } = useApp();
  const query = usePages<Schemas['Article']>(
    `/v1/articles?q=${encodeURIComponent(search)}${topic ? '&topic=' + encodeURIComponent(topic) : ''}${days ? '&days=' + days : ''}`,
  );
  const topics = useResource<Page<Schemas['ArticleTopic']>>('/v1/article-topics');
  const recent = useResource<Schemas['RecentSearch'][]>('/v1/me/article-searches', true);
  const command = useCommand();
  const historyBusy = useRef(false);
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const removeSearch = (id?: string) => {
    if (historyBusy.current) return;
    historyBusy.current = true;
    void command
      .mutateAsync({
        path: id ? `/v1/me/article-searches/${id}` : '/v1/me/article-searches',
        method: 'DELETE',
      })
      .catch(() => {})
      .finally(() => {
        historyBusy.current = false;
      });
  };
  const submit = (term = draft) => {
    const value = term.trim().slice(0, 100);
    setDraft(value);
    router.setParams({ q: value });
    if (value && status === 'authenticated' && !historyBusy.current) {
      historyBusy.current = true;
      void command
        .mutateAsync({ path: '/v1/me/article-searches', body: { term: value } })
        .catch(() => {})
        .finally(() => {
          historyBusy.current = false;
        });
    }
  };
  return (
    <NewsPage title="Tìm kiếm tin tức" description="Tìm câu chuyện và hoạt động xanh bạn quan tâm">
      <View
        style={{
          minHeight: 52,
          borderWidth: 1.5,
          borderColor: '#147CC1',
          backgroundColor: colors.surface,
          borderRadius: 26,
          flexDirection: 'row',
          paddingHorizontal: 14,
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Label size={27} color="#147CC1">
          ⌕
        </Label>
        <TextInput
          accessibilityLabel="Tìm bài viết"
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => submit()}
          returnKeyType="search"
          maxLength={100}
          placeholder="Từ khóa tin tức"
          placeholderTextColor={colors.muted}
          style={{
            flex: 1,
            minWidth: 0,
            color: colors.text,
            fontFamily: 'Inter_400Regular',
            fontSize: 15,
            height: 48,
          }}
        />
        {draft ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xóa từ khóa"
            onPress={() => {
              setDraft('');
              router.setParams({ q: '' });
            }}
            style={{ minHeight: 44, minWidth: 30, justifyContent: 'center', alignItems: 'center' }}
          >
            <Label size={22}>×</Label>
          </Pressable>
        ) : null}
      </View>
      <Button title="Tìm kiếm" pending={command.isPending} onPress={() => submit()} />
      {status === 'authenticated' ? (
        <>
          <Label size={15} bold>
            Tìm kiếm gần đây
          </Label>
          <QueryState query={recent}>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {recent.data?.map((item) => (
                <View
                  key={item.id}
                  style={{ flexDirection: 'row', alignItems: 'center', maxWidth: '100%' }}
                >
                  <Chip
                    label={item.term}
                    selected={search === item.term}
                    onPress={() => submit(item.term)}
                  />
                  <IconButton
                    name="close"
                    label={`Xóa từ khóa ${item.term} khỏi lịch sử`}
                    disabled={command.isPending}
                    onPress={() => removeSearch(item.id)}
                  />
                </View>
              ))}
            </View>
            {recent.data?.length ? (
              <Button
                title="Xóa lịch sử tìm kiếm"
                variant="quiet"
                pending={command.isPending}
                onPress={() => removeSearch()}
              />
            ) : (
              <Label size={12} color={colors.muted}>
                Chưa có tìm kiếm gần đây
              </Label>
            )}
          </QueryState>
        </>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip
          label="Mọi thời gian"
          selected={!days}
          onPress={() => router.setParams({ days: '' })}
        />
        <Chip
          label="7 ngày"
          selected={days === 7}
          onPress={() => router.setParams({ days: '7' })}
        />
        <Chip
          label="30 ngày"
          selected={days === 30}
          onPress={() => router.setParams({ days: '30' })}
        />
        <Chip
          label="Tất cả chủ đề"
          selected={!topic}
          onPress={() => router.setParams({ topic: '' })}
        />
        <QueryState query={topics}>
          {topics.data?.items.map((item) => (
            <Chip
              key={item.id}
              label={item.name}
              selected={topic === item.id}
              onPress={() => router.setParams({ topic: item.id })}
            />
          ))}
        </QueryState>
      </View>
      <View style={{ height: 1, backgroundColor: '#D1E3ED' }} />
      <Label size={20} bold heading>
        {search ? `Kết quả cho “${search}”` : 'Khám phá bài viết'}
      </Label>
      <Label size={11} color={colors.muted}>
        {items.length}
        {query.hasNextPage ? '+' : ''} bài viết
      </Label>
      <QueryState query={query} empty={!items.length} emptyText="Không tìm thấy bài viết phù hợp">
        <View
          style={{ flexDirection: layout === 'grid' ? 'row' : 'column', flexWrap: 'wrap', gap: 12 }}
        >
          {items.map((article) => (
            <View key={article.id} style={{ width: layout === 'grid' ? '48%' : '100%' }}>
              {layout === 'grid' ? (
                <NewsCard article={article} />
              ) : (
                <ArticleRow article={article} />
              )}
            </View>
          ))}
        </View>
        <More query={query} />
      </QueryState>
      <Button
        title={layout === 'list' ? 'Xem dạng lưới →' : 'Xem dạng danh sách →'}
        variant="quiet"
        onPress={() => router.setParams({ layout: layout === 'list' ? 'grid' : 'list' })}
      />
      <CommandError error={command.error} />
    </NewsPage>
  );
}

export function NewsTopicsScreen() {
  const query = useResource<Page<Schemas['ArticleTopic']>>('/v1/article-topics');
  const { status } = useApp();
  const command = useCommand();
  const following = useRef(false);
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      if (status === 'authenticated') void refetch();
    }, [refetch, status]),
  );
  const topics = query.data?.items ?? [];
  const first = topics[0];
  const open = (topic: Schemas['ArticleTopic']) =>
    router.push({ pathname: '/articles/search', params: { topic: topic.id } });
  const follow = (topic: Schemas['ArticleTopic']) => {
    if (status === 'guest') {
      router.push({ pathname: '/login', params: { returnTo: '/articles/topics' } });
      return;
    }
    if (status !== 'authenticated' || following.current) return;
    following.current = true;
    void command
      .mutateAsync({
        path: `/v1/me/followed-topics/${encodeURIComponent(topic.id)}`,
        method: topic.followed ? 'DELETE' : 'PUT',
      })
      .catch(() => {})
      .finally(() => {
        following.current = false;
      });
  };
  const followButton = (topic: Schemas['ArticleTopic']) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${topic.followed ? 'Bỏ theo dõi' : 'Theo dõi'} chủ đề ${topic.name}`}
      accessibilityState={{ selected: topic.followed, disabled: command.isPending }}
      disabled={command.isPending}
      onPress={() => follow(topic)}
      style={{
        position: 'absolute',
        right: 12,
        top: 12,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={topic.followed ? 'heart' : 'heart-outline'} size={20} color="#147CC1" />
    </Pressable>
  );
  return (
    <NewsPage
      title="Khám phá chủ đề"
      eyebrow="GREENSTEPS JOURNAL"
      description="Chọn câu chuyện truyền cảm hứng cho bạn."
    >
      <QueryState query={query} empty={!topics.length} emptyText="Chưa có chủ đề được công bố">
        {first ? (
          <View
            style={{
              backgroundColor: '#0E5D7F',
              height: 200,
              borderRadius: 22,
              overflow: 'hidden',
            }}
          >
            <Artwork
              source={require('../../../assets/figma/612-5286/imgFrame.png')}
              width={220}
              height={200}
              fit="cover"
              style={{ position: 'absolute', right: 0, top: 0, opacity: 0.48, borderRadius: 20 }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Chủ đề ${first.name}`}
              onPress={() => open(first)}
              style={{ height: 200, padding: 20, gap: 22 }}
            >
              <Label size={11} bold color="#C7EDF8">
                01 / CHỦ ĐỀ NỔI BẬT
              </Label>
              <Label
                size={27}
                bold
                color="#FFFFFF"
                style={{ width: '65%', lineHeight: 35, flex: 1 }}
              >
                {first.name}
              </Label>
              <Label size={12} bold color="#FFFFFF">
                {first.articleCount} bài viết →
              </Label>
            </Pressable>
            {followButton(first)}
          </View>
        ) : null}
        {topics.length > 1 ? (
          <Label size={18} bold heading>
            Dành cho bạn
          </Label>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {topics.slice(1).map((topic, index) => (
            <View
              key={topic.id}
              style={{
                width: '48%',
                minHeight: 154,
                borderRadius: 20,
                backgroundColor: ['#E1F7ED', '#EAF6DE', '#E2EFFC', '#FAF0DD'][index % 4],
                overflow: 'hidden',
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Chủ đề ${topic.name}`}
                onPress={() => open(topic)}
                style={{ padding: 16, gap: 12 }}
              >
                <View
                  style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Artwork
                    source={require('../../../assets/figma/612-5286/imgBiuTng.svg')}
                    width={46}
                    height={46}
                    style={{ position: 'absolute', inset: 0 }}
                  />
                  <Label size={23} color={['#1B7652', '#44762D', '#2F639B', '#916923'][index % 4]}>
                    {['♻', '☘', '✦', '▧'][index % 4]}
                  </Label>
                </View>
                <Label size={15} bold color="#163345">
                  {topic.name}
                </Label>
                <Label size={11} color="#1B7652">
                  {topic.articleCount} bài viết →
                </Label>
              </Pressable>
              {followButton(topic)}
            </View>
          ))}
        </View>
      </QueryState>
      <CommandError error={command.error} />
    </NewsPage>
  );
}
