import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import {
  AppState,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Button, Field, Icon, Label, Notice, Typography } from '../../design-system/ui';
import { StatusSpace } from '../../design-system/DesignScreen';
import { useApp } from '../../providers';
import { ApiError, dateLabel, errorMessage, type Schemas } from '../../services/api';
import {
  notificationPermission,
  syncDeviceReminders,
  type DeviceReminder,
} from '../../services/device-notifications';
import { useCommand, usePages, useResource } from '../../services/queries';
import { CommandError, More, QueryState, RequireAuth } from '../shared/common';
import { CurvedNavigation } from '../shared/DesignParts';
import { notificationTarget, notificationTargetLabel } from '../../services/notification-target';
import { notificationDay, notificationDayTitle, notificationTime } from './notification-dates';

function inboxFilter(value: unknown) {
  return value === 'unread' || value === 'activity' ? value : 'all';
}

function NotificationsPage({
  title,
  children,
  settings = false,
  fromInbox = false,
  refreshing = false,
  onRefresh,
}: PropsWithChildren<{
  title: string;
  settings?: boolean;
  fromInbox?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}>) {
  const insets = useSafeAreaInsets();
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  return (
    <Typography.Provider value="inter">
      <View style={{ flex: 1, backgroundColor: '#147CC1' }}>
        <StatusBar style="light" />
        <StatusSpace />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingTop: 10,
            paddingBottom: 20,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={() =>
              (!settings || fromInbox) && router.canGoBack()
                ? router.back()
                : settings
                  ? router.replace({
                      pathname: '/notifications',
                      params: { filter: inboxFilter(filter) },
                    })
                  : router.replace('/')
            }
            style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}
          >
            <Label size={30} color="#FFFFFF">
              ‹
            </Label>
          </Pressable>
          <Label
            size={28}
            bold
            heading
            color="#FFFFFF"
            style={{ flex: 1, textAlign: 'center', lineHeight: 36 }}
          >
            {title}
          </Label>
          {!settings ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cài đặt thông báo"
              onPress={() =>
                router.push({
                  pathname: '/notifications',
                  params: { view: 'settings', fromInbox: '1', filter: inboxFilter(filter) },
                })
              }
              style={{
                minWidth: 44,
                minHeight: 44,
                alignItems: 'flex-end',
                justifyContent: 'center',
              }}
            >
              <Icon name="settings-outline" size={25} color="#FFFFFF" />
            </Pressable>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>
        <ScrollView
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#FFFFFF"
                colors={['#147CC1']}
              />
            ) : undefined
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 30,
            paddingBottom: 140 + insets.bottom,
            gap: 18,
          }}
        >
          {children}
        </ScrollView>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
          <CurvedNavigation variant="news" />
        </View>
      </View>
    </Typography.Provider>
  );
}

export function NotificationsScreen() {
  const { view, id, fromInbox, fromRewards, fromReminders } = useLocalSearchParams<{
    view?: string;
    id?: string;
    fromInbox?: string;
    fromRewards?: string;
    fromReminders?: string;
  }>();
  const { user } = useApp();
  if (view === 'settings')
    return (
      <NotificationsPage
        title="Cài đặt"
        settings
        fromInbox={fromInbox === '1' || fromRewards === '1' || fromReminders === '1'}
      >
        <RequireAuth>
          <NotificationSettings key={user?.id} />
        </RequireAuth>
      </NotificationsPage>
    );
  if (id)
    return (
      <NotificationsPage title="Chi tiết" settings fromInbox={fromInbox === '1'}>
        <RequireAuth>
          <NotificationDetail key={`${user?.id}:${id}`} id={id} />
        </RequireAuth>
      </NotificationsPage>
    );
  return <NotificationList key={user?.id} />;
}

function NotificationList() {
  const { status } = useApp();
  const { filter: requestedFilter } = useLocalSearchParams<{ filter?: string }>();
  const filter = inboxFilter(requestedFilter);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);
  const mounted = useRef(true);
  const query = usePages<Schemas['Notification']>(
    `/v1/me/notifications${filter === 'unread' ? '?unread=true' : filter === 'activity' ? '?category=activity' : ''}`,
    true,
  );
  const summary = useResource<{ total: number; unread: number; activity: number }>(
    '/v1/me/notifications/summary',
    true,
  );
  const preferences = useResource<Schemas['Preferences']>('/v1/me/preferences', true);
  const timezone = preferences.data?.timezone ?? 'Asia/Ho_Chi_Minh';
  const command = useCommand();
  const { refetch: refreshItems } = query;
  const { refetch: refreshSummary } = summary;
  const refresh = useCallback(async () => {
    if (status !== 'authenticated') return;
    await Promise.all([refreshItems(), refreshSummary()]);
  }, [status, refreshItems, refreshSummary]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useFocusEffect(
    useCallback(() => {
      if (status !== 'authenticated') return;
      let timer: ReturnType<typeof setInterval> | undefined;
      const stop = () => {
        if (timer) clearInterval(timer);
        timer = undefined;
      };
      const start = () => {
        stop();
        if (AppState.currentState && AppState.currentState !== 'active') return;
        void refresh();
        timer = setInterval(() => void refresh(), 30_000);
      };
      start();
      const subscription = AppState.addEventListener('change', (state) =>
        state === 'active' ? start() : stop(),
      );
      return () => {
        stop();
        subscription.remove();
      };
    }, [status, refresh]),
  );
  const pullRefresh = () => {
    if (status !== 'authenticated' || refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    void refresh().finally(() => {
      refreshingRef.current = false;
      if (mounted.current) setRefreshing(false);
    });
  };
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const marking = useRef(false);
  const markRead = (id?: string) => {
    if (status !== 'authenticated' || marking.current) return;
    marking.current = true;
    void command
      .mutateAsync(
        id
          ? {
              path: `/v1/me/notifications/${id}`,
              method: 'PATCH',
              body: { read: true },
            }
          : {
              path: '/v1/me/notifications/read-all',
              body: { cutoff: new Date().toISOString() },
            },
      )
      .catch(() => refresh())
      .finally(() => {
        marking.current = false;
      });
  };
  return (
    <NotificationsPage
      title="Thông báo"
      refreshing={refreshing}
      onRefresh={status === 'authenticated' ? pullRefresh : undefined}
    >
      <RequireAuth>
        <Label color="#FFFFFF" size={14}>
          Theo dõi hoạt động và ưu đãi của bạn
        </Label>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'all' as const, label: 'Tất cả' },
            { id: 'unread' as const, label: 'Chưa đọc' },
            { id: 'activity' as const, label: 'Hoạt động' },
          ].map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: filter === item.id }}
              aria-selected={filter === item.id}
              onPress={() => router.setParams({ filter: item.id })}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 24,
                backgroundColor: filter === item.id ? '#FFFFFF' : '#FFFFFF33',
              }}
            >
              <Label size={13} bold color={filter === item.id ? '#147CC1' : '#FFFFFF'}>
                {item.label}
              </Label>
            </Pressable>
          ))}
        </View>
        <View style={{ padding: 17, backgroundColor: '#E8F5FC', borderRadius: 12 }}>
          <Label size={14} bold color="#0E2E47">
            ● {summary.data?.unread ?? '—'} thông báo chưa đọc
          </Label>
        </View>
        <QueryState query={query}>
          {!items.length ? (
            <View style={{ alignItems: 'center', gap: 18, paddingVertical: 48 }}>
              <Icon name="checkmark-circle-outline" size={60} color="#FFFFFF" />
              <Label size={20} bold color="#FFFFFF" style={{ textAlign: 'center' }}>
                {filter === 'unread'
                  ? 'Bạn đã xem hết thông báo'
                  : filter === 'activity'
                    ? 'Chưa có thông báo hoạt động'
                    : 'Chưa có thông báo'}
              </Label>
              <Button title="Khám phá hoạt động" onPress={() => router.push('/events')} />
            </View>
          ) : (
            items.map((item, index) => (
              <View key={item.id} style={{ gap: 18 }}>
                {index === 0 ||
                notificationDay(item.createdAt, timezone) !==
                  notificationDay(items[index - 1]!.createdAt, timezone) ? (
                  <Label size={14} bold heading color="#FFFFFF">
                    {notificationDayTitle(notificationDay(item.createdAt, timezone), timezone)}
                  </Label>
                ) : null}
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 17, padding: 16, gap: 8 }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Chi tiết ${item.title}`}
                    onPress={() =>
                      router.push({
                        pathname: '/notifications',
                        params: { id: item.id, fromInbox: '1', filter },
                      })
                    }
                    style={{ flexDirection: 'row', gap: 12 }}
                  >
                    <View
                      style={{
                        width: 43,
                        height: 43,
                        backgroundColor: '#E8F5FC',
                        borderRadius: 22,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Label size={22} color="#147CC1">
                        {item.category === 'offers'
                          ? '▣'
                          : item.category === 'community'
                            ? '◉'
                            : '♻'}
                      </Label>
                    </View>
                    <View style={{ flex: 1, gap: 8 }}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Label size={15} bold color="#0E2E47" style={{ flex: 1, lineHeight: 21 }}>
                          {item.title}
                        </Label>
                        {!item.readAt ? (
                          <View
                            accessibilityLabel="Chưa đọc"
                            style={{
                              width: 9,
                              height: 9,
                              marginTop: 4,
                              borderRadius: 5,
                              backgroundColor: '#179C59',
                            }}
                          />
                        ) : null}
                      </View>
                      <Label size={12} color="#0E2E47" style={{ lineHeight: 17 }}>
                        {item.body}
                      </Label>
                      <Label size={11} color="#61788A">
                        {notificationTime(item.createdAt, timezone)}
                      </Label>
                    </View>
                  </Pressable>
                  {!item.readAt ? (
                    <Button
                      title="Đánh dấu đã đọc"
                      variant="quiet"
                      pending={command.isPending}
                      onPress={() => markRead(item.id)}
                    />
                  ) : null}
                </View>
              </View>
            ))
          )}
          <More query={query} />
        </QueryState>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đánh dấu tất cả đã đọc"
          accessibilityState={{ disabled: command.isPending || summary.data?.unread === 0 }}
          disabled={command.isPending || summary.data?.unread === 0}
          onPress={() => markRead()}
          style={{
            minHeight: 48,
            borderRadius: 24,
            backgroundColor: '#FFFFFF',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 12,
          }}
        >
          <Label size={14} bold color="#147CC1">
            Đánh dấu tất cả đã đọc
          </Label>
        </Pressable>
        <CommandError error={command.error} />
        <CommandError error={summary.error} />
      </RequireAuth>
    </NotificationsPage>
  );
}

function NotificationDetail({ id }: { id: string }) {
  const query = useResource<Schemas['Notification']>(`/v1/me/notifications/${id}`, true);
  const { mutateAsync, error, isPending } = useCommand();
  const marking = useRef(false);
  const { refetch } = query;
  const data = query.data;
  const target = notificationTarget(data?.targetPath);
  const unread = !!data && !data.readAt;
  const markRead = useCallback(() => {
    if (marking.current) return;
    marking.current = true;
    void mutateAsync({
      path: `/v1/me/notifications/${id}`,
      method: 'PATCH',
      body: { read: true },
    })
      .catch(() => refetch())
      .finally(() => {
        marking.current = false;
      });
  }, [id, mutateAsync, refetch]);
  useEffect(() => {
    if (unread) markRead();
  }, [unread, markRead]);
  const readError =
    unread && error ? (
      <>
        <CommandError error={error} />
        <Button
          title="Thử đánh dấu đã đọc"
          variant="secondary"
          pending={isPending}
          onPress={markRead}
        />
      </>
    ) : null;
  if (data?.details?.kind === 'sorting') {
    const recordedAt =
      typeof data.details.recordedAt === 'string' ? data.details.recordedAt : data.createdAt;
    const points = String(data.details.points ?? '0');
    const earnedPoints = Number(points) > 0;
    const reason = data.details.awardReason;
    const noPointsText =
      reason === 'DAILY_LIMIT_REACHED'
        ? 'Bạn đã đạt giới hạn điểm phân loại trong ngày.'
        : reason === 'POLICY_NOT_ENABLED'
          ? 'Chương trình cộng điểm phân loại hiện chưa mở.'
          : reason === 'UNKNOWN_CATEGORY'
            ? 'Vật phẩm này chưa có quy tắc cộng điểm.'
            : 'Lượt phân loại đã được lưu vào lịch sử.';
    const fromScan = data.details.source === 'scan';
    return (
      <>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 24,
            gap: 12,
          }}
        >
          <View
            style={{
              width: 94,
              height: 94,
              borderRadius: 47,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#E8F5FC',
            }}
          >
            <Label size={38} color="#179C59">
              ♻
            </Label>
          </View>
          <Label size={20} bold heading color="#0E2E47" style={{ textAlign: 'center' }}>
            {data.title}
          </Label>
          <Label size={12} color="#61788A">
            {dateLabel(recordedAt)}
          </Label>
        </View>
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, gap: 6 }}>
          {earnedPoints ? (
            <>
              <Label size={13} color="#61788A">
                Bạn đã nhận
              </Label>
              <Label size={23} bold color="#179C59">
                + {points} điểm xanh
              </Label>
            </>
          ) : (
            <>
              <Label size={18} bold color="#0E2E47">
                Chưa được cộng điểm
              </Label>
              <Label size={13} color="#61788A">
                {noPointsText}
              </Label>
            </>
          )}
        </View>
        <Label size={18} bold heading color="#FFFFFF">
          Chi tiết lượt phân loại
        </Label>
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, paddingHorizontal: 18 }}>
          {[
            {
              label: 'Hoạt động',
              value: fromScan ? 'Phân loại từ ảnh quét' : 'Phân loại thủ công',
            },
            { label: 'Trạng thái', value: 'Đã hoàn thành' },
            { label: 'Ghi nhận', value: dateLabel(recordedAt) },
          ].map((row, index) => (
            <View
              key={row.label}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: 12,
                paddingVertical: 14,
                borderTopWidth: index ? 1 : 0,
                borderTopColor: '#D1E3ED',
              }}
            >
              <Label size={13} color="#61788A">
                {row.label}
              </Label>
              <Label size={13} bold color={index === 1 ? '#179C59' : '#0E2E47'}>
                {row.value}
              </Label>
            </View>
          ))}
        </View>
        {earnedPoints ? (
          <Button
            title="Dùng điểm để đổi quà"
            variant="secondary"
            onPress={() => router.push('/rewards/catalog')}
          />
        ) : (
          <Button
            title="Xem lịch sử phân loại"
            variant="secondary"
            onPress={() => router.push('/history')}
          />
        )}
        {target ? (
          <Button
            title={fromScan ? 'Xem kết quả quét' : 'Xem hướng dẫn phân loại'}
            variant="secondary"
            onPress={() => router.push(target as Href)}
          />
        ) : null}
        {readError}
      </>
    );
  }
  return (
    <QueryState query={query}>
      {data ? (
        <>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, gap: 18 }}>
            <Label size={24} bold heading color="#0E2E47" style={{ lineHeight: 32 }}>
              {data.title}
            </Label>
            <Label size={12} color="#61788A">
              {dateLabel(data.createdAt)}
            </Label>
            <Label size={15} color="#0E2E47" style={{ lineHeight: 23 }}>
              {data.body}
            </Label>
            {data.details?.points ? (
              <Label size={32} bold color="#147CC1" style={{ lineHeight: 40 }}>
                +{String(data.details.points)} điểm xanh
              </Label>
            ) : null}
            <Label color="#61788A" size={12}>
              Trạng thái: Đã nhận thông báo
            </Label>
          </View>
          {target ? (
            <Button
              title={notificationTargetLabel(target)}
              onPress={() => router.push(target as Href)}
            />
          ) : null}
          {data.details?.points ? (
            <Button title="Dùng điểm để đổi quà" onPress={() => router.push('/rewards/catalog')} />
          ) : null}
          {readError}
        </>
      ) : null}
    </QueryState>
  );
}

function NotificationSettings() {
  const { colors, user } = useApp();
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const cache = useQueryClient();
  const query = useResource<Schemas['NotificationPreferences']>(
    '/v1/me/notification-preferences',
    true,
  );
  const command = useCommand<Schemas['NotificationPreferences']>();
  const mark = useCommand();
  const [dailyTime, setDailyTime] = useState<string | null>(null);
  const [zone, setZone] = useState<string | null>(null);
  const [reminderError, setReminderError] = useState('');
  const [checkingSave, setCheckingSave] = useState(false);
  const [recoveredSave, setRecoveredSave] = useState(false);
  const [conflict, setConflict] = useState(false);
  const saving = useRef(false);
  const pending = command.isPending || checkingSave;
  const save = (changes: Partial<Schemas['NotificationPreferences']>, onSaved?: () => void) => {
    if (!query.data || saving.current) return;
    saving.current = true;
    setRecoveredSave(false);
    setConflict(false);
    const { version, ...values } = query.data;
    void command
      .mutateAsync({
        path: '/v1/me/notification-preferences',
        method: 'PUT',
        body: { ...values, ...changes, expectedVersion: version },
      })
      .then((saved) => {
        cache.setQueryData<Schemas['NotificationPreferences']>(
          ['api', user?.id ?? 'guest', '/v1/me/notification-preferences'],
          (current) => (current && current.version > saved.version ? current : saved),
        );
        onSaved?.();
      })
      .catch(async (cause) => {
        if (
          cause instanceof ApiError &&
          cause.status > 0 &&
          cause.status < 500 &&
          cause.status !== 409
        )
          return;
        setCheckingSave(true);
        const result = await query.refetch();
        if (!result.isSuccess || !result.data) return;
        const latest = result.data;
        const matches = Object.entries(changes).every(
          ([field, value]) => latest[field as keyof typeof latest] === value,
        );
        if (matches) {
          setRecoveredSave(true);
          onSaved?.();
        } else if (cause instanceof ApiError && cause.status === 409) setConflict(true);
      })
      .finally(() => {
        setCheckingSave(false);
        saving.current = false;
      });
  };
  function saveReminder() {
    if (!query.data) return;
    const time = (dailyTime ?? query.data.dailyTime).trim();
    const timezone = (zone ?? query.data.timezone).trim();
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      setReminderError('Nhập giờ theo định dạng HH:MM, ví dụ 08:00.');
      return;
    }
    try {
      if (!timezone) throw new Error();
      new Intl.DateTimeFormat('vi-VN', { timeZone: timezone });
    } catch {
      setReminderError('Nhập múi giờ hợp lệ, ví dụ Asia/Ho_Chi_Minh.');
      return;
    }
    setReminderError('');
    save({ dailyTime: time, timezone }, () => {
      setDailyTime(null);
      setZone(null);
    });
  }
  return (
    <>
      <Label size={14} color="#FFFFFF">
        Chọn những cập nhật bạn muốn nhận
      </Label>
      <Label size={18} bold color="#FFFFFF">
        Thông báo đẩy
      </Label>
      <DevicePermission />
      <QueryState query={query}>
        {query.data ? (
          <>
            <View style={{ paddingHorizontal: 17, backgroundColor: '#FFFFFF', borderRadius: 18 }}>
              {[
                {
                  id: 'activity' as const,
                  title: 'Hoạt động',
                  detail: 'Kết quả phân loại và điểm xanh',
                },
                { id: 'offers' as const, title: 'Ưu đãi', detail: 'Voucher và quà đổi điểm' },
                {
                  id: 'community' as const,
                  title: 'Cộng đồng',
                  detail: 'Bài đăng và phản hồi mới',
                },
                { id: 'news' as const, title: 'Tin tức', detail: 'Câu chuyện và sự kiện xanh' },
              ].map((item, index) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    minHeight: 81,
                    borderTopWidth: index ? 1 : 0,
                    borderTopColor: '#D1E3ED',
                  }}
                >
                  <View style={{ flex: 1, gap: 7 }}>
                    <Label size={15} bold color="#0E2E47">
                      {item.title}
                    </Label>
                    <Label size={11} color="#61788A">
                      {item.detail}
                    </Label>
                  </View>
                  <Switch
                    accessibilityLabel={`Thông báo ${item.title}`}
                    value={query.data![item.id]}
                    disabled={pending}
                    onValueChange={(value) => save({ [item.id]: value })}
                    trackColor={{ true: '#147CC1' }}
                  />
                </View>
              ))}
            </View>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, padding: 17, gap: 15 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Label bold style={{ flex: 1 }} color="#0E2E47">
                  Nhắc tôi điểm danh
                </Label>
                <Switch
                  accessibilityLabel="Nhắc tôi điểm danh"
                  value={query.data.dailyReminder}
                  disabled={pending}
                  onValueChange={(value) => save({ dailyReminder: value })}
                  trackColor={{ true: '#147CC1' }}
                />
              </View>
              <Field
                label="Giờ nhắc điểm danh (HH:MM)"
                value={dailyTime ?? query.data.dailyTime}
                onChangeText={(value) => {
                  setDailyTime(value);
                  setReminderError('');
                  command.reset();
                }}
                editable={!pending}
              />
              <Field
                label="Múi giờ nhắc điểm danh"
                value={zone ?? query.data.timezone}
                onChangeText={(value) => {
                  setZone(value);
                  setReminderError('');
                  command.reset();
                }}
                editable={!pending}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {reminderError ? <Notice tone="error">{reminderError}</Notice> : null}
              <Button
                title="Lưu giờ nhắc"
                pending={pending}
                disabled={dailyTime == null && zone == null}
                onPress={saveReminder}
              />
              <Label size={12} color="#61788A">
                Lời nhắc chỉ gửi khi bạn chưa điểm danh trong ngày. Thông báo trong ứng dụng luôn có
                thể xem trong hộp thư.
              </Label>
            </View>
            {command.isSuccess || recoveredSave ? (
              <Notice tone="success">Đã lưu cài đặt thông báo.</Notice>
            ) : null}
          </>
        ) : null}
      </QueryState>
      {conflict ? (
        <Notice tone="warning">
          Cài đặt đã thay đổi ở nơi khác. Đã tải bản mới nhất, hãy kiểm tra trước khi lưu lại.
        </Notice>
      ) : (
        <CommandError error={checkingSave || recoveredSave ? null : command.error} />
      )}
      <Label size={18} bold color="#FFFFFF">
        Quản lý
      </Label>
      <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 8, gap: 5 }}>
        <Button
          title="Đánh dấu tất cả đã đọc"
          variant="quiet"
          pending={mark.isPending}
          onPress={() =>
            mark.mutate({
              path: '/v1/me/notifications/read-all',
              body: { cutoff: new Date().toISOString() },
            })
          }
        />
        <Button
          title="Về danh sách thông báo"
          variant="quiet"
          onPress={() =>
            router.dismissTo({
              pathname: '/notifications',
              params: { filter: inboxFilter(filter) },
            })
          }
        />
      </View>
      <CommandError error={mark.error} />
    </>
  );
}

function DevicePermission() {
  const { api, user } = useApp();
  const [granted, setGranted] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let active = true;
    const refresh = () => {
      void notificationPermission()
        .then((allowed) => {
          if (active) setGranted(allowed);
        })
        .catch(() => {});
    };
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  if (Platform.OS === 'web')
    return (
      <Notice>
        Bạn có thể xem thông báo tại đây. Dùng ứng dụng trên điện thoại để nhận lời nhắc trên thiết
        bị.
      </Notice>
    );
  return (
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, padding: 17, gap: 12 }}>
      <Label color="#0E2E47">
        {granted
          ? 'Thiết bị đã cho phép thông báo.'
          : 'Cho phép BlueSteps gửi lời nhắc trên thiết bị.'}
      </Label>
      <Button
        title={granted ? 'Cập nhật lời nhắc trên thiết bị' : 'Bật thông báo trên thiết bị'}
        pending={pending}
        onPress={() => {
          setPending(true);
          setError(null);
          void (async () => {
            const allowed = await notificationPermission(true);
            setGranted(allowed);
            if (!allowed) {
              await Linking.openSettings();
              return;
            }
            const reminders = await api.request<DeviceReminder[]>('/v1/me/device-reminders');
            if (user) await syncDeviceReminders(user.id, reminders);
          })()
            .catch((failure) => setError(errorMessage(failure)))
            .finally(() => setPending(false));
        }}
      />
      <Label size={12} color="#61788A">
        Lời nhắc trên thiết bị được cập nhật cho 7 ngày tới mỗi khi bạn mở ứng dụng.
      </Label>
      {error ? <Notice tone="error">{error}</Notice> : null}
    </View>
  );
}
