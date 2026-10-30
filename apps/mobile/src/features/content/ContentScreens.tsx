import { useState } from 'react';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useApp } from '../../providers';
import {
  Button,
  Card,
  Empty,
  Icon,
  Label,
  MenuItem,
  Notice,
  Screen,
  Search,
} from '../../design-system/ui';
import { QueryContent } from '../../design-system/QueryContent';
import { useDemoQuery } from '../../services/useDemoQuery';
import { articles } from '../../services/fixtures';
import { formatDemoDate, type MockNotification } from '../../services/mock-session';

export function ArticlesScreen() {
  const query = useDemoQuery('articles');
  const [search, setSearch] = useState('');
  const items =
    query.data?.filter((item) =>
      item.title.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')),
    ) ?? [];
  return (
    <Screen title="Góc kiến thức xanh" subtitle="Đọc một chút, thay đổi từng ngày." back>
      <Search value={search} onChangeText={setSearch} placeholder="Tìm bài viết" />
      <QueryContent
        loading={query.isPending}
        error={query.isError}
        empty={!items.length}
        retry={() => {
          void query.refetch();
        }}
      >
        {items.map((article) => (
          <Card key={article.id}>
            <Icon name={article.icon} size={50} />
            <Label size={12}>{article.tag} · Bài đọc demo</Label>
            <Label bold size={22}>
              {article.title}
            </Label>
            <Button
              title="Đọc bài viết"
              variant="secondary"
              onPress={() => router.push(`/articles/${article.id}`)}
            />
          </Card>
        ))}
      </QueryContent>
    </Screen>
  );
}
export function ArticleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const article = articles.find((item) => item.id === id);
  return (
    <Screen title="Bài viết" back>
      {article ? (
        <>
          <Icon name={article.icon} size={64} />
          <Label size={28} bold>
            {article.title}
          </Label>
          <Label size={13}>{article.tag} · Nội dung minh họa · 29/10/2026</Label>
          <Label size={17}>{article.body}</Label>
          <Button
            title="Tra sổ tay vật liệu"
            variant="secondary"
            onPress={() => router.push('/handbook')}
          />
        </>
      ) : (
        <Empty title="Bài viết không tồn tại" />
      )}
    </Screen>
  );
}
export function NotificationsScreen() {
  const { notifications, markNotificationRead } = useApp();
  const query = useDemoQuery('notifications');
  const items =
    query.data?.flatMap((seed) =>
      notifications.filter((notification) => notification.id === seed.id),
    ) ?? [];
  const unread = items.filter((notification) => !notification.read).length;
  function open(notification: MockNotification) {
    markNotificationRead(notification.id);
    const target = notification.target;
    const path: Href =
      target.kind === 'event'
        ? `/events/${target.id}`
        : target.kind === 'article'
          ? `/articles/${target.id}`
          : target.kind === 'point'
            ? `/points/${target.id}`
            : target.kind === 'history'
              ? '/history'
              : '/onboarding';
    router.push(path);
  }
  return (
    <Screen title="Thông báo" subtitle={`${unread} chưa đọc · dữ liệu demo`} back>
      <Button
        title={unread === 0 ? 'Đã đọc tất cả trong demo' : 'Đánh dấu đã đọc'}
        variant="quiet"
        disabled={unread === 0}
        onPress={() => markNotificationRead()}
      />
      <QueryContent
        loading={query.isPending}
        error={query.isError}
        empty={!items.length}
        retry={() => {
          void query.refetch();
        }}
      >
        {items.map((notification) => (
          <MenuItem
            key={notification.id}
            title={`${notification.read ? '' : '● '}${notification.title}`}
            detail={`${formatDemoDate(notification.occurredAt)} · ${notification.body}`}
            icon={notification.icon}
            onPress={() => open(notification)}
          />
        ))}
      </QueryContent>
      <Notice>Chưa kết nối push notification hoặc inbox API.</Notice>
    </Screen>
  );
}
