import { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Artwork } from '../../design-system/DesignScreen';
import { newsExtendedAssets } from '../../design-system/news-extended-assets';
import { Empty } from '../../design-system/ui';
import { useApp } from '../../providers';
import { articles } from '../../services/fixtures';
import { articleMetadata, createNewsSession } from '../../services/news';
import { NewsSheet, NewsText as T } from './NewsDesignParts';
import { NewsExtendedPage, NewsReadingRow } from './NewsExtendedParts';
import { newsCover } from './news-design-data';

const a = newsExtendedAssets['680:5406'];
const examples = [
  {
    id: 'ha-long',
    title: 'Cùng nhau trả lại bờ biển trong lành',
    tag: 'CỘNG ĐỒNG',
    meta: '4 phút đọc   ·   Đã lưu hôm qua',
    cover: a.imgNhBaiNiBt,
  },
  {
    id: 'saigon-cleanup',
    title: 'Sài Gòn Xanh và những dòng kênh hồi sinh',
    tag: 'TIN MỚI',
    meta: '7 phút đọc · Đã lưu 2 ngày trước',
    cover: a.imgNhBaiVit,
  },
  {
    id: 'local-cleanup',
    title: 'Tuổi trẻ chung tay làm sạch dòng kênh',
    tag: 'CỘNG ĐỒNG',
    meta: '5 phút đọc · Đã lưu tuần trước',
    cover: a.imgNhBaiVit1,
  },
];
export function NewsReadingListScreen() {
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  return <ReadingList key={preview} sample={preview === '1'} />;
}
function ReadingList({ sample }: { sample: boolean }) {
  const { news, setNews } = useApp();
  const [example, setExample] = useState(() => ({
    ...createNewsSession(),
    saved: ['ha-long', 'saigon-cleanup', 'local-cleanup', 'tourism-cleanup'],
  }));
  const session = sample ? example : news;
  const update = sample ? setExample : setNews;
  const [removing, setRemoving] = useState('');
  const { width } = useWindowDimensions();
  const s = width / 428;
  const rows = session.saved.flatMap((id) => {
    const article = articles.find((item) => item.id === id);
    if (!article) return [];
    const design = examples.find((item) => item.id === id);
    return [
      {
        id,
        title: sample && design ? design.title : article.title,
        tag: sample && design ? design.tag : article.tag.toUpperCase(),
        cover: design?.cover ?? newsCover(article),
        meta:
          sample && design
            ? design.meta
            : `${articleMetadata[id]!.minutes} phút đọc · Đã lưu trong phiên`,
      },
    ];
  });
  const first = rows[0];
  const open = (id: string) =>
    router.push({
      pathname: '/articles/[id]',
      params: { id, ...(sample ? { preview: '1' } : {}) },
    });
  const grid = () =>
    router.push({ pathname: '/articles/saved', params: sample ? { preview: '1' } : {} });
  return (
    <NewsExtendedPage
      frame="680:5406"
      title="Danh sách đọc"
      subtitle="Những câu chuyện bạn muốn đọc lại"
    >
      <View
        style={{
          backgroundColor: '#D9F0FC',
          borderRadius: 14 * s,
          minHeight: 48 * s,
          paddingHorizontal: 14 * s,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 11 * s,
        }}
      >
        <T size={18 * s} weight="bold" color="#147CC1" style={{ width: 24 * s }}>
          ▣
        </T>
        <T size={14 * s} weight="semibold" color="#0B2E4F" style={{ flex: 1 }}>
          Bạn đã lưu {rows.length} bài viết
        </T>
      </View>
      {first ? (
        <>
          <T
            accessibilityRole="header"
            size={20 * s}
            lineHeight={25 * s}
            weight="bold"
            color="#0F172A"
            style={{ marginTop: 19 * s }}
          >
            Đọc khi bạn có thời gian
          </T>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 17 * s,
              padding: 10 * s,
              marginTop: 13 * s,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Đọc ${first.title}`}
              onPress={() => open(first.id)}
            >
              <Artwork
                source={first.cover}
                testID="news-reading-featured-cover"
                width={352 * s}
                height={139 * s}
                fit="cover"
                style={{ borderRadius: 12 * s }}
              />
              <View style={{ paddingHorizontal: 7 * s, paddingTop: 11 * s, gap: 7 * s }}>
                <T
                  size={10 * s}
                  lineHeight={13 * s}
                  weight="bold"
                  color="#147CC1"
                  style={{ paddingRight: 26 * s }}
                >
                  {first.tag}
                </T>
                <T
                  size={18 * s}
                  lineHeight={22 * s}
                  weight="bold"
                  color="#0F172A"
                  style={{ minHeight: 39 * s }}
                >
                  {first.title}
                </T>
                <T size={11 * s} lineHeight={15 * s} color="#6E7A87">
                  {first.meta}
                </T>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Bỏ lưu bài ${first.title}`}
              onPress={() => setRemoving(first.id)}
              style={{
                position: 'absolute',
                right: 5 * s,
                top: 152 * s,
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <T size={19 * s} weight="bold" color="#ED4F47">
                ♥
              </T>
            </Pressable>
          </View>
          <View
            style={{
              marginTop: 16 * s,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <T
              accessibilityRole="header"
              size={20 * s}
              lineHeight={25 * s}
              weight="bold"
              color="#0F172A"
            >
              Đọc tiếp
            </T>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xem lưới bài đã lưu"
              onPress={grid}
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <T size={12 * s} weight="semibold" color="#147CC1">
                Xem lưới →
              </T>
            </Pressable>
          </View>
          <View style={{ gap: 10 * s, marginTop: 8 * s }}>
            {rows.slice(1, sample ? 3 : undefined).map((row) => (
              <NewsReadingRow
                key={row.id}
                testID={`news-reading-cover-${row.id}`}
                {...row}
                scale={s}
                onPress={() => open(row.id)}
              />
            ))}
          </View>
          {sample && rows.length > 3 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xem tất cả bài đã lưu"
              onPress={grid}
              style={{ marginTop: 12, padding: 12, alignItems: 'center' }}
            >
              <T size={12} color="#147CC1">
                Xem tất cả {rows.length} bài đã lưu →
              </T>
            </Pressable>
          ) : null}
        </>
      ) : (
        <View style={{ marginTop: 24 }}>
          <Empty
            title="Chưa có bài viết đã lưu"
            detail="Lưu bài bạn muốn đọc lại để thêm vào danh sách này."
            action="Tìm bài viết"
            onPress={() => router.push('/articles/search')}
          />
        </View>
      )}
      {removing ? (
        <NewsSheet title="Bỏ bài khỏi danh sách đọc?" onClose={() => setRemoving('')}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xác nhận bỏ lưu bài đọc"
            onPress={() => {
              update((state) => ({ ...state, saved: state.saved.filter((id) => id !== removing) }));
              setRemoving('');
            }}
            style={{ minHeight: 44, padding: 12, backgroundColor: '#D9F0FC', borderRadius: 16 }}
          >
            <T color="#0B2E4F">Bỏ lưu bài</T>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Giữ bài đã lưu"
            onPress={() => setRemoving('')}
            style={{ minHeight: 44, padding: 12 }}
          >
            <T>Giữ bài đã lưu</T>
          </Pressable>
        </NewsSheet>
      ) : null}
    </NewsExtendedPage>
  );
}
