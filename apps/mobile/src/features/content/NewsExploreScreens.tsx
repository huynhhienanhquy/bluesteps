import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../../providers';
import {
  Button,
  Card,
  Chip,
  Empty,
  Icon,
  IconButton,
  Label,
  Notice,
  Row,
} from '../../design-system/ui';
import { QueryContent } from '../../design-system/QueryContent';
import { useDemoQuery } from '../../services/useDemoQuery';
import { articles } from '../../services/fixtures';
import { articleMetadata, filterNews, newsTopics } from '../../services/news';
import { calendarDays, shiftMonth } from '../../services/event-planning';
import { ArticleCard, NewsPage } from './NewsParts';

export function NewsTopicsScreen() {
  const { news, setNews, colors } = useApp();
  return (
    <NewsPage title="Khám phá chủ đề">
      <Label size={25} bold heading>
        Điều xanh bạn quan tâm
      </Label>
      <Label size={13} color={colors.muted}>
        Chọn một chủ đề để khám phá những bài đọc phù hợp.
      </Label>
      <Label size={12}>Đang theo dõi {news.followedTopics.length} chủ đề trong phiên demo</Label>
      {newsTopics.map((topic) => {
        const following = news.followedTopics.includes(topic.id);
        return (
          <Card key={topic.id}>
            <Row>
              <Icon name={topic.icon} size={36} color={colors.brand} />
              <View style={{ flex: 1 }}>
                <Label size={18} bold>
                  {topic.id}
                </Label>
                <Label size={12} color={colors.muted}>
                  {articles.filter((article) => article.tag === topic.id).length} bài đọc mẫu
                </Label>
              </View>
            </Row>
            <Label size={13}>{topic.description}</Label>
            <Button
              title={`Xem chủ đề ${topic.id}`}
              variant="secondary"
              onPress={() => router.push({ pathname: '/articles', params: { topic: topic.id } })}
            />
            <Button
              title={`${following ? 'Bỏ theo dõi' : 'Theo dõi'} ${topic.id}`}
              variant="quiet"
              onPress={() =>
                setNews((current) => ({
                  ...current,
                  followedTopics: current.followedTopics.includes(topic.id)
                    ? current.followedTopics.filter((value) => value !== topic.id)
                    : [...current.followedTopics, topic.id],
                }))
              }
            />
          </Card>
        );
      })}
      <Notice>Theo dõi chỉ lưu lựa chọn trong phiên, chưa đăng ký nhận thông báo.</Notice>
      <Button title="Về tin tức" variant="quiet" onPress={() => router.dismissTo('/articles')} />
    </NewsPage>
  );
}

export function NewsBriefsScreen() {
  const { colors } = useApp();
  const query = useDemoQuery('articles');
  const [date, setDate] = useState('2026-10-30');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [read, setRead] = useState<string[]>([]);
  const dates = [...new Set(articles.map((article) => articleMetadata[article.id]!.date))]
    .sort()
    .reverse();
  const items = filterNews(query.data ?? [], {
    search: '',
    topic: 'Tất cả',
    sort: 'newest',
  }).filter(
    (article) =>
      (!date || articleMetadata[article.id]!.date === date) &&
      (!onlyUnread || !read.includes(article.id)),
  );
  return (
    <NewsPage title="Bản tin nhanh">
      <View style={{ gap: 8 }}>
        <Icon name="flash-outline" size={36} color={colors.brand} />
        <Label size={25} bold heading>
          Một phút cho hành tinh
        </Label>
        <Label size={13} color={colors.muted}>
          Tóm tắt ngắn để chọn câu chuyện bạn muốn đọc tiếp.
        </Label>
      </View>
      <Row style={{ flexWrap: 'wrap' }}>
        <Chip label="Tất cả ngày" selected={!date} onPress={() => setDate('')} />
        {dates.map((value) => (
          <Chip
            key={value}
            label={value.split('-').reverse().slice(0, 2).join('/')}
            selected={date === value}
            onPress={() => setDate(value)}
          />
        ))}
      </Row>
      <Chip
        label="Chỉ tin chưa đọc trong màn này"
        selected={onlyUnread}
        onPress={() => setOnlyUnread(!onlyUnread)}
      />
      <Label size={16} bold heading>
        {date ? `Bản tin ${date.split('-').reverse().join('/')}` : 'Các bản tin gần đây'} ·{' '}
        {items.length} tin
      </Label>
      <QueryContent
        loading={query.isPending}
        error={query.isError}
        retry={() => {
          void query.refetch();
        }}
      >
        {items.length ? (
          items.map((article) => (
            <Card key={article.id}>
              <Label size={11} bold color={colors.brand}>
                {article.tag.toUpperCase()} ·{' '}
                {articleMetadata[article.id]!.date.split('-').reverse().join('/')}
              </Label>
              <Label size={18} bold>
                {article.title}
              </Label>
              <Label size={14}>{articleMetadata[article.id]!.summary}</Label>
              <Button
                title={`Đọc toàn bài ${article.title}`}
                variant="secondary"
                onPress={() => router.push(`/articles/${article.id}`)}
              />
              <Button
                title={`${read.includes(article.id) ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'} ${article.title}`}
                variant="quiet"
                onPress={() =>
                  setRead(
                    read.includes(article.id)
                      ? read.filter((value) => value !== article.id)
                      : [...read, article.id],
                  )
                }
              />
            </Card>
          ))
        ) : (
          <Empty
            title="Không có tin phù hợp"
            detail="Bạn đã đánh dấu đọc các tin đang chọn, hoặc chưa có nội dung ở ngày này."
            action="Xem tất cả tin"
            onPress={() => {
              setDate('');
              setOnlyUnread(false);
            }}
          />
        )}
      </QueryContent>
      <Notice>
        Bản tin tổng hợp từ bài đọc demo; trạng thái đã đọc chỉ giữ khi màn này còn mở.
      </Notice>
      <Button title="Về tin tức" variant="quiet" onPress={() => router.dismissTo('/articles')} />
    </NewsPage>
  );
}

export function NewsCalendarScreen() {
  const { colors } = useApp();
  const query = useDemoQuery('events');
  const [month, setMonth] = useState('2026-11');
  const [selected, setSelected] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const data =
    query.data?.filter((event) => category === 'Tất cả' || event.category === category) ?? [];
  const items = data.filter((event) =>
    selected ? event.date === selected : event.date.startsWith(month),
  );
  const selectMonth = (delta: number) => {
    setMonth(shiftMonth(month, delta));
    setSelected('');
  };
  return (
    <NewsPage title="Lịch sự kiện xanh">
      <Label size={25} bold heading>
        Hẹn nhau làm điều xanh
      </Label>
      <Label size={13} color={colors.muted}>
        Lịch khám phá trong mục Tin tức · Múi giờ Việt Nam
      </Label>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <IconButton name="chevron-back" label="Tháng trước" onPress={() => selectMonth(-1)} />
          <Label bold>
            Tháng {Number(month.slice(5))}, {month.slice(0, 4)}
          </Label>
          <IconButton name="chevron-forward" label="Tháng sau" onPress={() => selectMonth(1)} />
        </Row>
        <Row style={{ gap: 0 }}>
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
            <View key={day} style={{ width: `${100 / 7}%`, alignItems: 'center' }}>
              <Label size={12} bold>
                {day}
              </Label>
            </View>
          ))}
        </Row>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {calendarDays(month).map((date) => {
            const marked = data.some((event) => event.date === date);
            return (
              <Pressable
                key={date}
                accessibilityRole="button"
                accessibilityLabel={`Ngày ${Number(date.slice(8))} tháng ${Number(date.slice(5, 7))}${marked ? ', có sự kiện' : ''}`}
                accessibilityState={{ selected: selected === date }}
                aria-pressed={selected === date}
                onPress={() => {
                  setSelected(date);
                  setMonth(date.slice(0, 7));
                }}
                style={{
                  width: `${100 / 7}%`,
                  minHeight: 46,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  backgroundColor: selected === date ? colors.primary : 'transparent',
                }}
              >
                <Label
                  size={12}
                  bold={marked}
                  color={
                    selected === date
                      ? colors.heroText
                      : date.startsWith(month)
                        ? colors.text
                        : colors.muted
                  }
                >
                  {Number(date.slice(8))}
                </Label>
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: marked
                      ? selected === date
                        ? colors.heroText
                        : colors.brand
                      : 'transparent',
                  }}
                />
              </Pressable>
            );
          })}
        </View>
        <Button title="Xem cả tháng" variant="quiet" onPress={() => setSelected('')} />
      </Card>
      <Row style={{ flexWrap: 'wrap' }}>
        {['Tất cả', 'Thu gom', 'Workshop', 'Giáo dục'].map((value) => (
          <Chip
            key={value}
            label={value}
            selected={category === value}
            onPress={() => setCategory(value)}
          />
        ))}
      </Row>
      <Label size={16} bold heading>
        {selected
          ? `Sự kiện ngày ${selected.split('-').reverse().join('/')}`
          : 'Sự kiện trong tháng'}{' '}
        · {items.length}
      </Label>
      <QueryContent
        loading={query.isPending}
        error={query.isError}
        retry={() => {
          void query.refetch();
        }}
      >
        {items.length ? (
          items.map((event) => (
            <Card key={event.id}>
              <Label size={11} color={colors.brand}>
                {event.category.toUpperCase()}
              </Label>
              <Label size={18} bold>
                {event.title}
              </Label>
              <Label size={13}>{event.time}</Label>
              <Label size={13}>{event.area}</Label>
              <Button
                title={`Xem sự kiện ${event.title}`}
                variant="secondary"
                onPress={() => router.push(`/events/${event.id}`)}
              />
            </Card>
          ))
        ) : (
          <Empty
            title="Chưa có sự kiện phù hợp"
            detail="Đổi ngày, tháng hoặc chủ đề để xem các hoạt động mẫu khác."
          />
        )}
      </QueryContent>
      <Notice>
        Lịch và địa điểm minh họa từ danh mục hoạt động. Màn này giúp khám phá; chưa xác nhận lịch
        tổ chức hoặc đăng ký tham gia.
      </Notice>
      <Label size={17} bold heading>
        Đọc trước khi tham gia
      </Label>
      <ArticleCard article={articles.find((article) => article.id === 'community-day')!} />
      <Button title="Về tin tức" variant="quiet" onPress={() => router.dismissTo('/articles')} />
    </NewsPage>
  );
}
