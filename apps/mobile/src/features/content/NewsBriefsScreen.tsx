import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Artwork } from '../../design-system/DesignScreen';
import { newsDesignAssets } from '../../design-system/news-design-assets';
import { QueryContent } from '../../design-system/QueryContent';
import { useDemoQuery } from '../../services/useDemoQuery';
import { articles } from '../../services/fixtures';
import { articleMetadata, filterNews } from '../../services/news';
import { EventField, EventRoleOption, EventTextAction } from '../events/EventFormParts';
import { NewsAction, NewsDesignPage, NewsSheet, NewsText as T } from './NewsDesignParts';
import { briefExamples, digestDateLabel } from './news-digest-data';

const a = newsDesignAssets['612:5441'];
export function NewsBriefsScreen() {
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const sample = preview === '1';
  const query = useDemoQuery('articles');
  const [date, setDate] = useState(sample ? '2026-10-29' : '2026-10-30');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [read, setRead] = useState<string[]>([]);
  const [sheet, setSheet] = useState<'date' | 'example' | null>(null);
  const [custom, setCustom] = useState(date);
  const [error, setError] = useState('');
  const [example, setExample] = useState<(typeof briefExamples)[number]>();
  const dates = [...new Set(articles.map((article) => articleMetadata[article.id]!.date))]
    .sort()
    .reverse();
  const base = sample
    ? briefExamples.map((item) => ({ ...item, articleId: item.relatedArticle, date: '2026-10-29' }))
    : filterNews(query.data ?? [], { search: '', topic: 'Tất cả', sort: 'newest' }).map(
        (article) => ({
          id: article.id,
          title: article.title,
          summary: articleMetadata[article.id]!.summary,
          articleId: article.id,
          date: articleMetadata[article.id]!.date,
        }),
      );
  const items = base.filter(
    (item) => (!date || item.date === date) && (!onlyUnread || !read.includes(item.id)),
  );
  const label = date ? digestDateLabel(date) : null;
  return (
    <NewsDesignPage
      title="Bản tin nhanh"
      frame="612:5441"
      journal
      journalBack
      journalLabel="TÓM TẮT MỖI NGÀY"
      journalSubtitle="Nắm ý chính chỉ trong vài phút."
      backTo="/articles"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Chọn ngày bản tin"
        onPress={() => {
          setCustom(date);
          setError('');
          setSheet('date');
        }}
        style={{ height: 68, borderRadius: 18, backgroundColor: '#DDF2FB', marginTop: 20 }}
      >
        <T
          size={11}
          weight="bold"
          color="#167EC1"
          style={{ position: 'absolute', left: 16, top: 12 }}
        >
          {label?.day ?? 'CÁC BẢN TIN'}
        </T>
        <T
          size={19}
          weight="bold"
          color="#163345"
          style={{ position: 'absolute', left: 16, top: 29 }}
        >
          {label?.label ?? 'Tất cả ngày'}
        </T>
        <T
          size={12}
          weight="semibold"
          color="#167EC1"
          style={{ position: 'absolute', right: 9, top: 27, width: 100 }}
        >
          {String(items.length).padStart(2, '0')} tin{' '}
          {onlyUnread ? 'chưa đọc' : sample ? 'mới' : 'mẫu'}
        </T>
      </Pressable>
      <View style={{ marginTop: 28, gap: 15 }}>
        <QueryContent
          loading={!sample && query.isPending}
          error={!sample && query.isError}
          retry={() => {
            void query.refetch();
          }}
        >
          {items.length ? (
            items.map((item, index) => (
              <View
                key={item.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 20,
                  minHeight: 142,
                  paddingLeft: 66,
                  paddingRight: 23,
                  paddingTop: 20,
                  paddingBottom: 16.69,
                }}
              >
                <Artwork
                  source={[a.imgSTin, a.imgSTin1, a.imgSTin2][index % 3]!}
                  width={38}
                  style={{ position: 'absolute', left: 16, top: 17 }}
                />
                <T
                  size={13}
                  weight="bold"
                  color="#167EC1"
                  style={{ position: 'absolute', left: 24, top: 28 }}
                >
                  {String(index + 1).padStart(2, '0')}
                </T>
                <T size={16} weight="bold" color="#163345" style={{ minHeight: 19.36 }}>
                  {item.title}
                </T>
                <T size={12} color="#5B7385" style={{ minHeight: 29.04, marginTop: 12.64 }}>
                  {item.summary}
                </T>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Đọc toàn bài ${item.title}`}
                  hitSlop={8}
                  onPress={() => {
                    if (sample && item.id === 'preview-tip') {
                      router.push('/articles/topics');
                    } else if (sample) {
                      setExample(briefExamples.find((value) => value.id === item.id));
                      setSheet('example');
                    } else router.push(`/articles/${item.articleId}`);
                  }}
                  style={{ marginTop: 30.96 }}
                >
                  <T size={11} weight="semibold" color="#167EC1">
                    {sample && item.id === 'preview-tip'
                      ? 'Khám phá chủ đề   →'
                      : 'Đọc bài đầy đủ   →'}
                  </T>
                </Pressable>
                {!sample ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${read.includes(item.id) ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'} ${item.title}`}
                    hitSlop={8}
                    onPress={() =>
                      setRead((current) =>
                        current.includes(item.id)
                          ? current.filter((id) => id !== item.id)
                          : [...current, item.id],
                      )
                    }
                    style={{ marginTop: 14 }}
                  >
                    <T size={11} color="#167EC1">
                      {read.includes(item.id) ? 'Đã đọc · Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}
                    </T>
                  </Pressable>
                ) : null}
              </View>
            ))
          ) : (
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, gap: 12 }}>
              <T size={16} weight="semibold">
                Không có tin phù hợp
              </T>
              <T size={12} color="#5B7385">
                Bạn đã đọc các tin đang chọn, hoặc ngày này chưa có nội dung mẫu.
              </T>
              <NewsAction
                title="Xem tất cả tin"
                onPress={() => {
                  setDate('');
                  setOnlyUnread(false);
                }}
              />
            </View>
          )}
        </QueryContent>
      </View>
      <T size={12} weight="semibold" color="#306980" style={{ marginTop: 29, marginLeft: 11 }}>
        ✦ Mỗi hành động nhỏ đều tạo thay đổi lớn.
      </T>
      {!sample ? (
        <View style={{ marginTop: 20, gap: 16 }}>
          <EventTextAction
            title={onlyUnread ? 'Hiện cả tin đã đọc' : 'Chỉ tin chưa đọc trong màn này'}
            onPress={() => setOnlyUnread(!onlyUnread)}
          />
          <T size={12} color="#5B7385">
            Bản tin tổng hợp từ bài đọc demo; trạng thái đã đọc chỉ giữ khi màn này còn mở. Ngày và
            nội dung không phải bản tin được xác minh.
          </T>
          <EventTextAction title="Về tin tức" onPress={() => router.dismissTo('/articles')} />
        </View>
      ) : null}
      {sheet ? (
        <NewsSheet
          title={sheet === 'date' ? 'Chọn ngày bản tin' : 'Bản tin minh họa'}
          onClose={() => setSheet(null)}
        >
          {sheet === 'date' ? (
            <>
              <EventField
                label="Ngày bản tin (YYYY-MM-DD)"
                value={custom}
                onChangeText={(value) => {
                  setCustom(value);
                  setError('');
                }}
                maxLength={10}
              />
              <NewsAction
                title="Áp dụng ngày bản tin"
                onPress={() => {
                  if (!/^\d{4}-\d{2}-\d{2}$/.test(custom) || !digestDateLabel(custom)) {
                    setError('Nhập ngày hợp lệ theo YYYY-MM-DD.');
                    return;
                  }
                  setDate(custom);
                  setSheet(null);
                }}
              />
              <EventRoleOption
                value="Tất cả ngày"
                selected={!date}
                onPress={() => {
                  setDate('');
                  setSheet(null);
                }}
              />
              {(sample ? ['2026-10-29'] : dates).map((value) => (
                <EventRoleOption
                  key={value}
                  value={value.split('-').reverse().join('/')}
                  selected={date === value}
                  onPress={() => {
                    setDate(value);
                    setSheet(null);
                  }}
                />
              ))}
              {error ? (
                <T accessibilityRole="alert" size={12} color="#B3303F">
                  {error}
                </T>
              ) : null}
            </>
          ) : example ? (
            <>
              <T size={18} weight="bold">
                {example.title}
              </T>
              <T>{example.summary}</T>
              <T size={12} color="#5B7385">
                Đây là phần tóm tắt trong thiết kế, chưa có toàn văn/nguồn tin được xác minh. Bài
                đọc demo liên quan bên dưới không phải toàn văn của bản tin này.
              </T>
              <EventTextAction
                title="Mở bài đọc demo liên quan"
                onPress={() => {
                  setSheet(null);
                  router.push(`/articles/${example.relatedArticle}`);
                }}
              />
            </>
          ) : null}
          <EventTextAction title="Đóng tùy chọn bản tin" onPress={() => setSheet(null)} />
        </NewsSheet>
      ) : null}
    </NewsDesignPage>
  );
}
