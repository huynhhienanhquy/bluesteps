import { useState } from 'react';
import { Pressable, TextInput, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../providers';
import { articles } from '../../services/fixtures';
import {
  articleMetadata,
  createNewsSession,
  filterNews,
  normalizeNewsSearch,
} from '../../services/news';
import { rememberNewsSearch } from '../../services/news-events';
import { useDemoQuery } from '../../services/useDemoQuery';
import { QueryContent } from '../../design-system/QueryContent';
import { Empty } from '../../design-system/ui';
import { newsExtendedAssets } from '../../design-system/news-extended-assets';
import { NewsText as T } from './NewsDesignParts';
import { newsCover } from './news-design-data';
import { NewsExtendedPage, NewsReadingRow } from './NewsExtendedParts';

const a = newsExtendedAssets['680:5343'];
export const searchExamples = [
  {
    id: 'daily-waste',
    title: 'Mỗi ngày, thế giới thải ra khoảng 11 triệu tấn rác',
    tag: 'TÁI CHẾ',
    meta: '1.2k lượt xem · 5 phút đọc',
    cover: a.imgNhBaiVit,
  },
  {
    id: 'storm-cleanup',
    title: 'Người dân chung tay dọn rác sau cơn bão',
    tag: 'CỘNG ĐỒNG',
    meta: '1.7k lượt xem · 4 phút đọc',
    cover: a.imgNhBaiVit1,
  },
  {
    id: 'saigon-cleanup',
    title: 'Làm sạch dòng kênh: một hành động nhỏ, đổi thay lớn',
    tag: 'SỐNG XANH',
    meta: '1.2k lượt xem · 6 phút đọc',
    cover: a.imgNhBaiVit2,
  },
];
export function NewsSearchScreen() {
  const { preview, q } = useLocalSearchParams<{ preview?: string; q?: string }>();
  return (
    <NewsSearch
      key={`${preview}:${q}`}
      sample={preview === '1'}
      initialSearch={q ?? (preview === '1' ? 'rác thải' : '')}
    />
  );
}
function NewsSearch({ sample, initialSearch }: { sample: boolean; initialSearch: string }) {
  const { news, setNews } = useApp();
  const [example, setExample] = useState(() => ({
    ...createNewsSession(),
    recentSearches: ['tái chế', 'dọn rác', 'sống xanh'],
  }));
  const session = sample ? example : news;
  const update = sample ? setExample : setNews;
  const [search, setSearch] = useState(initialSearch);
  const { width } = useWindowDimensions();
  const s = width / 428;
  const query = useDemoQuery('articles');
  const term = normalizeNewsSearch(search);
  const source = sample
    ? articles.filter((item) => searchExamples.some((row) => row.id === item.id))
    : (query.data ?? []);
  const rows = sample
    ? searchExamples.filter(
        (row) =>
          !term ||
          term === 'rac thai' ||
          normalizeNewsSearch(
            `${row.title} ${row.tag} ${articles.find((item) => item.id === row.id)?.body}`,
          ).includes(term),
      )
    : filterNews(source, { search, topic: 'Tất cả', sort: 'newest' }).map((article) => ({
        id: article.id,
        title: article.title,
        tag: article.tag.toUpperCase(),
        meta: `${articleMetadata[article.id]!.views} lượt xem · ${articleMetadata[article.id]!.minutes} phút đọc`,
        cover: searchExamples.find((row) => row.id === article.id)?.cover ?? newsCover(article),
      }));
  const remember = (value = search) =>
    update((state) => ({
      ...state,
      recentSearches: rememberNewsSearch(state.recentSearches, value),
    }));
  const grid = () => {
    remember();
    router.push({
      pathname: '/articles',
      params: { view: 'search', q: search, ...(sample ? { preview: '1' } : {}) },
    });
  };
  return (
    <NewsExtendedPage
      frame="680:5343"
      title="Tìm kiếm tin tức"
      subtitle="Tìm câu chuyện và hoạt động xanh bạn quan tâm"
    >
      <View
        style={{
          minHeight: 52 * s,
          backgroundColor: '#FFFFFF',
          borderWidth: 1.5,
          borderColor: '#147CC1',
          borderRadius: 26 * s,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <T
          size={27 * s}
          lineHeight={33 * s}
          color="#147CC1"
          style={{ marginLeft: 13 * s, width: 26 * s }}
        >
          ⌕
        </T>
        <TextInput
          accessibilityLabel="Tìm kiếm tin tức"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => remember()}
          returnKeyType="search"
          placeholder="Từ khóa hoặc chủ đề"
          maxLength={100}
          style={{
            flex: 1,
            fontFamily: 'BackupInter_600SemiBold',
            fontSize: 15 * s,
            color: '#0F172A',
            paddingVertical: 12 * s,
            paddingLeft: 11 * s,
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Xóa từ khóa tìm kiếm"
          onPress={() => setSearch('')}
          style={{ width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <T size={19 * s} color="#6E7A87">
            ×
          </T>
        </Pressable>
      </View>
      <T
        size={15 * s}
        lineHeight={19 * s}
        weight="bold"
        color="#0F172A"
        style={{ marginTop: 21 * s }}
      >
        {session.recentSearches.length ? 'Tìm kiếm gần đây' : 'Gợi ý tìm kiếm'}
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 * s, marginTop: 12 * s }}>
        {(session.recentSearches.length
          ? session.recentSearches
          : ['tái chế', 'dọn rác', 'sống xanh']
        ).map((keyword) => (
          <Pressable
            key={keyword}
            accessibilityRole="button"
            accessibilityLabel={`Tìm ${keyword}`}
            onPress={() => {
              setSearch(keyword);
              remember(keyword);
            }}
            style={{
              minHeight: 33 * s,
              paddingVertical: 8 * s,
              paddingHorizontal: 24 * s,
              borderRadius: 16 * s,
              backgroundColor: '#FFFFFF',
              justifyContent: 'center',
            }}
          >
            <T size={12 * s} lineHeight={15 * s} weight="semibold" color="#147CC1">
              {keyword}
            </T>
          </Pressable>
        ))}
      </View>
      <View style={{ height: 1, backgroundColor: '#D1E3ED', marginTop: 19 * s }} />
      <T
        accessibilityRole="header"
        size={20 * s}
        lineHeight={25 * s}
        weight="bold"
        color="#0F172A"
        style={{ marginTop: 18 * s }}
      >
        {search.trim() ? `Kết quả cho “${search.trim()}”` : 'Tất cả bài viết'}
      </T>
      <T size={11 * s} lineHeight={15 * s} color="#6E7A87" style={{ marginTop: 8 * s }}>
        {rows.length} bài viết
      </T>
      <QueryContent
        loading={!sample && query.isPending}
        error={!sample && query.isError}
        retry={() => {
          void query.refetch();
        }}
      >
        <View style={{ marginTop: 20 * s, gap: 12 * s }}>
          {rows.length ? (
            rows.map((row) => (
              <NewsReadingRow
                key={row.id}
                testID={`news-search-cover-${row.id}`}
                {...row}
                scale={s}
                onPress={() => {
                  remember();
                  router.push({
                    pathname: '/articles/[id]',
                    params: { id: row.id, ...(sample ? { preview: '1' } : {}) },
                  });
                }}
              />
            ))
          ) : (
            <Empty
              title="Không tìm thấy bài viết"
              detail="Thử từ khóa ngắn hơn hoặc xem tất cả bài viết."
              action="Xóa từ khóa"
              onPress={() => setSearch('')}
            />
          )}
        </View>
      </QueryContent>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Xem dạng lưới"
        onPress={grid}
        style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center', marginTop: 8 * s }}
      >
        <T size={13 * s} weight="semibold" color="#147CC1">
          Xem dạng lưới →
        </T>
      </Pressable>
    </NewsExtendedPage>
  );
}
