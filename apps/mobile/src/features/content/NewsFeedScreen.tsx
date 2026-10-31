import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../providers';
import { QueryContent } from '../../design-system/QueryContent';
import { useDemoQuery } from '../../services/useDemoQuery';
import { articles } from '../../services/fixtures';
import { createNewsSession, filterNews, newsTopics, type NewsSession } from '../../services/news';
import { EventField, EventTextAction, EventRoleOption } from '../events/EventFormParts';
import { NewsNavigation } from './NewsParts';
import {
  NewsDesignPage,
  NewsDesignCard,
  NewsText as T,
  NewsSheet,
  NewsAction,
} from './NewsDesignParts';
import { designNewsIds, designSavedOrder } from './news-design-data';

export function ArticlesScreen({ savedOnly = false }: { savedOnly?: boolean }) {
  const params = useLocalSearchParams<{ topic?: string; q?: string; preview?: string }>();
  const topic = typeof params.topic === 'string' ? params.topic : 'Tất cả';
  const sample = params.preview === '1';
  return (
    <NewsFeed
      key={`${savedOnly}:${topic}:${sample}:${params.q}`}
      savedOnly={savedOnly}
      initialTopic={topic}
      initialSearch={
        typeof params.q === 'string' ? params.q : sample && !savedOnly ? 'rác thải' : ''
      }
      sample={sample}
    />
  );
}

function NewsFeed({
  savedOnly,
  initialTopic,
  initialSearch,
  sample,
}: {
  savedOnly: boolean;
  initialTopic: string;
  initialSearch: string;
  sample: boolean;
}) {
  const { news, setNews } = useApp();
  const [example, setExample] = useState<NewsSession>(() => ({
    ...createNewsSession(),
    saved: [...designSavedOrder],
  }));
  const session = sample ? example : news;
  const update = sample ? setExample : setNews;
  const query = useDemoQuery('articles');
  const [search, setSearch] = useState(initialSearch);
  const [topic, setTopic] = useState(initialTopic);
  const [sort, setSort] = useState<'newest' | 'popular' | 'saved'>(savedOnly ? 'saved' : 'newest');
  const [page, setPage] = useState(0);
  const [width, setWidth] = useState(380);
  const [sheet, setSheet] = useState<'sort' | 'topics' | 'remove' | null>(null);
  const [removing, setRemoving] = useState('');
  const [message, setMessage] = useState('');
  const source = (query.data ?? []).filter(
    (article) => !sample || designNewsIds.includes(article.id),
  );
  const items = filterNews(source, {
    search,
    topic,
    sort,
    savedIds: savedOnly ? session.saved : undefined,
  });
  const pageCount = Math.ceil(items.length / 4);
  const activePage = Math.min(page, Math.max(0, pageCount - 1));
  const visible = items.slice(activePage * 4, activePage * 4 + 4);
  const cardWidth = Math.min(170, (width - 12) / 2);
  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(0);
  };
  const changeTopic = (value: string) => {
    setTopic(value);
    setPage(0);
    setSheet(null);
  };
  const reset = () => {
    setSearch('');
    setTopic('Tất cả');
    setPage(0);
  };
  const savedCount = articles.filter((article) => session.saved.includes(article.id)).length;
  const topicPills = [
    'Tất cả',
    'Tái chế',
    'Sự kiện',
    ...(newsTopics.some((item) => item.id === topic) && !['Phân loại', 'Cộng đồng'].includes(topic)
      ? [topic]
      : []),
  ];
  const save = (id: string) => {
    if (savedOnly && session.saved.includes(id)) {
      setRemoving(id);
      setSheet('remove');
      return;
    }
    update((state) => ({
      ...state,
      saved: state.saved.includes(id)
        ? state.saved.filter((value) => value !== id)
        : [id, ...state.saved],
    }));
  };
  return (
    <NewsDesignPage
      savedOnly={savedOnly}
      title={savedOnly ? 'Bài viết đã lưu' : search || sample ? 'Tìm kiếm tin tức' : 'Tin tức'}
    >
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {savedOnly ? (
          <>
            <T size={13} color="#5B7182" style={{ marginTop: 14, height: 24 }}>
              Những câu chuyện xanh bạn muốn đọc lại
            </T>
            <View
              style={{ height: 96, borderRadius: 20, backgroundColor: '#DEF2FC', marginTop: 20 }}
            >
              <T
                size={30}
                weight="bold"
                color="#E7504B"
                style={{ position: 'absolute', left: 20, top: 22 }}
              >
                ♥
              </T>
              <T
                size={16}
                weight="bold"
                color="#16374D"
                style={{ position: 'absolute', left: 66, top: 22 }}
              >
                Bộ sưu tập của bạn
              </T>
              <T size={12} color="#537084" style={{ position: 'absolute', left: 66, top: 51 }}>
                {savedCount} bài viết đã lưu
              </T>
            </View>
            <View
              style={{
                marginTop: 27,
                height: 24,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <T size={17} weight="bold" color="#163044">
                Bài viết yêu thích
              </T>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sắp xếp bài đã lưu"
                onPress={() => setSheet('sort')}
                hitSlop={10}
                style={{ marginTop: 4, width: 104 }}
              >
                <T size={12} weight="semibold" color="#187DBF">
                  Sắp xếp ⌄
                </T>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <View
              style={{
                marginTop: 26,
                height: 50,
                borderRadius: 18,
                backgroundColor: '#FFFFFF',
                borderColor: '#C3DEEC',
                borderWidth: 1,
                flexDirection: 'row',
                alignItems: 'center',
                paddingLeft: 16,
                paddingRight: 18,
                gap: 8,
              }}
            >
              <T size={15} color="#20384A">
                ⌕
              </T>
              <TextInput
                accessibilityLabel="Tìm bài viết"
                value={search}
                onChangeText={changeSearch}
                placeholder="Tìm bài viết"
                placeholderTextColor="#687D8B"
                returnKeyType="search"
                style={{
                  flex: 1,
                  minWidth: 0,
                  color: '#20384A',
                  fontFamily: 'BackupInter_400Regular',
                  fontSize: 15,
                  lineHeight: 18.15,
                  padding: 0,
                }}
              />
              {search ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Xóa từ khóa"
                  onPress={() => changeSearch('')}
                  hitSlop={8}
                >
                  <T size={22} color="#687D8B">
                    ×
                  </T>
                </Pressable>
              ) : (
                <View style={{ width: 16 }} />
              )}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chọn chủ đề"
              onPress={() => setSheet('topics')}
              hitSlop={8}
              style={{ marginTop: 22, height: 24 }}
            >
              <T size={14} weight="bold" color="#1A3648">
                Chủ đề
              </T>
            </Pressable>
            <View style={{ marginTop: 6, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {topicPills.map((value) => {
                const selected =
                  topic === value ||
                  (value === 'Tái chế' && topic === 'Phân loại') ||
                  (value === 'Sự kiện' && topic === 'Cộng đồng');
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityLabel={value}
                    accessibilityState={{ selected }}
                    onPress={() => changeTopic(value)}
                    style={{
                      width: 104,
                      height: 34,
                      borderRadius: 17,
                      borderWidth: selected ? 0 : 1,
                      borderColor: '#CFE1EC',
                      backgroundColor: selected ? '#1880C7' : '#FFFFFF',
                      justifyContent: 'center',
                      paddingLeft: 9,
                    }}
                  >
                    <T size={12} weight="semibold" color={selected ? '#FFFFFF' : '#20374B'}>
                      {value}
                    </T>
                  </Pressable>
                );
              })}
            </View>
            <View
              style={{
                marginTop: 21,
                height: 24,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <T size={16} weight="bold" color="#163044">
                {items.length} kết quả phù hợp
              </T>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sắp xếp tin tức"
                onPress={() => setSheet('sort')}
                hitSlop={10}
                style={{ width: 100, marginTop: 4 }}
              >
                <T size={12} weight="semibold" color="#187DBF">
                  {sort === 'popular' ? 'Phổ biến' : 'Mới nhất'} ⌄
                </T>
              </Pressable>
            </View>
          </>
        )}
        {message ? (
          <T accessibilityRole="alert" size={12} color="#187DBF" style={{ marginTop: 12 }}>
            {message}
          </T>
        ) : null}
        <View style={{ marginTop: savedOnly ? 19 : 17 }}>
          <QueryContent
            loading={query.isPending}
            error={query.isError}
            retry={() => {
              void query.refetch();
            }}
          >
            {visible.length ? (
              <View style={{ gap: 18 }}>
                {[visible.slice(0, 2), visible.slice(2, 4)]
                  .filter((row) => row.length)
                  .map((row, rowIndex) => (
                    <View
                      key={rowIndex}
                      style={{ flexDirection: 'row', gap: 12, overflow: 'hidden' }}
                    >
                      {row.map((article) => (
                        <NewsDesignCard
                          key={article.id}
                          article={article}
                          width={cardWidth}
                          savedOnly={savedOnly}
                          saved={session.saved.includes(article.id)}
                          liked={session.liked.includes(article.id)}
                          onSave={() => save(article.id)}
                          onLike={() =>
                            update((state) => ({
                              ...state,
                              liked: state.liked.includes(article.id)
                                ? state.liked.filter((id) => id !== article.id)
                                : [...state.liked, article.id],
                            }))
                          }
                        />
                      ))}
                    </View>
                  ))}
              </View>
            ) : (
              <View style={{ gap: 16, paddingVertical: 20 }}>
                <T size={16} weight="semibold">
                  {savedOnly && !session.saved.length
                    ? 'Chưa có bài viết đã lưu'
                    : 'Không tìm thấy bài viết phù hợp'}
                </T>
                <T size={13} color="#5B7182">
                  Thử đổi từ khóa hoặc chủ đề để tìm thêm bài đọc.
                </T>
                <NewsAction
                  title={savedOnly && !session.saved.length ? 'Khám phá tin tức' : 'Xóa bộ lọc'}
                  onPress={() =>
                    savedOnly && !session.saved.length ? router.dismissTo('/articles') : reset()
                  }
                />
              </View>
            )}
          </QueryContent>
        </View>
        {!sample ? (
          <View style={{ gap: 18, marginTop: 24 }}>
            {pageCount > 1 ? (
              <View style={{ gap: 12 }}>
                <T size={12} color="#5B7182">
                  Trang {activePage + 1}/{pageCount} · {items.length} bài viết
                </T>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {activePage > 0 ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Trang bài trước"
                      onPress={() => setPage(activePage - 1)}
                      hitSlop={10}
                    >
                      <T weight="semibold" color="#187DBF">
                        Trang trước
                      </T>
                    </Pressable>
                  ) : null}
                  {activePage + 1 < pageCount ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Trang bài tiếp theo"
                      onPress={() => setPage(activePage + 1)}
                      hitSlop={10}
                    >
                      <T weight="semibold" color="#187DBF">
                        Xem thêm bài viết
                      </T>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}
            <NewsNavigation sample={sample} />
            <T size={12} color="#5B7182">
              Nội dung, ảnh và lượt tương tác minh họa cho UI. Các bài chưa được biên tập thành
              nguồn tin đã xác minh.
            </T>
          </View>
        ) : null}
      </View>
      {sheet ? (
        <NewsSheet
          title={
            sheet === 'remove'
              ? 'Bỏ lưu bài viết này?'
              : sheet === 'topics'
                ? 'Chủ đề'
                : 'Sắp xếp và lọc bài viết'
          }
          onClose={() => setSheet(null)}
        >
          {sheet === 'remove' ? (
            <>
              <T>{articles.find((article) => article.id === removing)?.title}</T>
              <NewsAction
                title="Xác nhận bỏ lưu bài"
                onPress={() => {
                  update((state) => ({
                    ...state,
                    saved: state.saved.filter((id) => id !== removing),
                  }));
                  setSheet(null);
                  setMessage('Đã bỏ lưu bài viết trong phiên demo.');
                }}
              />
              <EventTextAction title="Giữ bài đã lưu" onPress={() => setSheet(null)} />
            </>
          ) : sheet === 'topics' ? (
            <>
              {['Tất cả', ...newsTopics.map((value) => value.id)].map((value) => (
                <EventRoleOption
                  key={value}
                  value={value}
                  selected={topic === value}
                  onPress={() => changeTopic(value)}
                />
              ))}
            </>
          ) : (
            <>
              {savedOnly ? (
                <>
                  <EventField
                    label="Tìm bài viết đã lưu"
                    value={search}
                    onChangeText={changeSearch}
                  />
                  {['Tất cả', ...newsTopics.map((value) => value.id)].map((value) => (
                    <EventRoleOption
                      key={value}
                      value={value}
                      selected={topic === value}
                      onPress={() => changeTopic(value)}
                    />
                  ))}
                </>
              ) : null}
              {(
                [
                  ...(savedOnly ? [['saved', 'Theo lúc lưu']] : []),
                  ['newest', 'Mới nhất'],
                  ['popular', 'Phổ biến'],
                ] as const
              ).map(([value, label]) => (
                <EventRoleOption
                  key={value}
                  value={label!}
                  selected={sort === value}
                  onPress={() => {
                    setSort(value as typeof sort);
                    setPage(0);
                    setSheet(null);
                  }}
                />
              ))}
            </>
          )}
          <EventTextAction title="Đóng tùy chọn tin tức" onPress={() => setSheet(null)} />
        </NewsSheet>
      ) : null}
    </NewsDesignPage>
  );
}
