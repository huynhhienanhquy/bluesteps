import { router, type Href } from 'expo-router';
import { useApp } from '../../providers';
import { Button, MenuItem, Notice, Screen } from '../../design-system/ui';
import { QueryContent } from '../../design-system/QueryContent';
import { useDemoQuery } from '../../services/useDemoQuery';
import { formatDemoDate, type MockNotification } from '../../services/mock-session';

export { ArticlesScreen, ArticleDetailScreen } from './NewsScreens';
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
