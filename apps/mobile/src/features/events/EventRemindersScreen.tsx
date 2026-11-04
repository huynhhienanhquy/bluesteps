import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Switch, TextInput, View } from 'react-native';
import { PrivateModal as Modal } from '../shared/PrivateModal';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Artwork } from '../../design-system/DesignScreen';
import { eventReminderArtwork as a } from '../../design-system/event-flow-artwork';
import { Button, Chip, Field, Notice } from '../../design-system/ui';
import { useApp } from '../../providers';
import { ApiError, errorMessage, type Schemas } from '../../services/api';
import { useCommand, useResource } from '../../services/queries';
import { CommandError, QueryState, RequireAuth } from '../shared/common';
import { eventTimeRange } from './event-time';
import { EventReminderCollectionPicker } from './EventReminderCollectionPicker';
import { isCalendarDate } from './calendar-model';
import {
  EventFlowButton,
  EventFlowHeading,
  EventFlowPage,
  EventFlowText as Text,
  eventFlowStyles as s,
} from './EventFlowParts';

export function EventRemindersScreen() {
  const { user } = useApp();
  const { events, from, savedDate } = useLocalSearchParams<{
    events?: string;
    from?: string;
    savedDate?: string;
  }>();
  return (
    <RequireAuth>
      <ReminderForm key={`${user?.id}:${events ?? ''}:${from ?? ''}:${savedDate ?? ''}`} />
    </RequireAuth>
  );
}
function ReminderForm() {
  const {
    events: requested,
    from,
    savedDate,
  } = useLocalSearchParams<{ events?: string; from?: string; savedDate?: string }>();
  const ticketId =
    from === 'ticket' &&
    requested &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requested)
      ? requested
      : null;
  const { user, colors } = useApp();
  const cache = useQueryClient();
  const query = useResource<Schemas['ReminderSettings']>('/v1/me/event-reminders', true);
  const events = useResource<Schemas['GreenEvent'][]>('/v1/me/remindable-events', true);
  const { refetch: refreshSettings } = query;
  const { refetch: refreshEvents } = events;
  const accountId = user?.id;
  useFocusEffect(
    useCallback(() => {
      if (!accountId) return;
      void refreshSettings();
      void refreshEvents();
    }, [accountId, refreshSettings, refreshEvents]),
  );
  const command = useCommand<Schemas['ReminderSettings']>();
  const [draft, setDraft] = useState<Partial<Schemas['ReminderSettings']>>({});
  const [base, setBase] = useState<Schemas['ReminderSettings'] | null>(null);
  const [reloading, setReloading] = useState(false);
  const [quietOpen, setQuietOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const [validation, setValidation] = useState('');
  const working = useRef(false);
  const appliedRequested = useRef(false);
  const source = base ?? query.data;
  const settings = source ? { ...source, ...draft } : null;
  const busy = command.isPending || reloading;
  const conflict =
    (!!base && !!query.data && base.version !== query.data.version) ||
    (command.error instanceof ApiError && command.error.code === 'VERSION_CONFLICT');
  useEffect(() => {
    const saved = query.data;
    const available = events.data;
    if (appliedRequested.current || !saved || !available) return;
    appliedRequested.current = true;
    const requestedIds =
      requested?.split(',').filter((id) => available.some((event) => event.id === id)) ?? [];
    if (requestedIds.some((id) => !saved.eventIds.includes(id))) {
      setBase((current) => current ?? saved);
      if (new Set([...saved.eventIds, ...requestedIds]).size > 100)
        setValidation(
          'Chỉ chọn tối đa 100 hoạt động. Bỏ chọn một hoạt động trước khi thêm hoạt động từ vé.',
        );
      setDraft((current) => ({
        ...current,
        eventIds: [...new Set([...(current.eventIds ?? saved.eventIds), ...requestedIds])].slice(
          0,
          100,
        ),
      }));
    }
  }, [query.data, events.data, requested]);
  const selected = (draft.eventIds ?? settings?.eventIds ?? []).filter(
    (id) => !events.data || events.data.some((event) => event.id === id),
  );
  const offsets = settings?.offsets ?? [60, 1440];
  const removedCount = (draft.eventIds ?? settings?.eventIds ?? []).length - selected.length;
  const change = <K extends keyof Schemas['ReminderSettings']>(
    key: K,
    value: Schemas['ReminderSettings'][K],
  ) => {
    if (working.current) return;
    setBase((current) => current ?? query.data ?? null);
    setValidation('');
    command.reset();
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const save = () => {
    if (!settings || working.current || !events.data || conflict) return;
    const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    if (!timePattern.test(settings.quietStart) || !timePattern.test(settings.quietEnd)) {
      setValidation('Nhập giờ yên lặng theo định dạng HH:MM, ví dụ 22:00.');
      return;
    }
    try {
      if (!settings.timezone.trim()) throw new Error();
      new Intl.DateTimeFormat('vi-VN', { timeZone: settings.timezone.trim() });
    } catch {
      setValidation('Nhập múi giờ hợp lệ, ví dụ Asia/Ho_Chi_Minh.');
      return;
    }
    const error =
      !offsets.length || offsets.length > 8
        ? 'Chọn từ 1 đến 8 thời điểm nhắc.'
        : settings.enabled && (!selected.length || !(settings.inApp || settings.email))
          ? 'Chọn ít nhất một hoạt động, thời điểm nhắc và cách nhận thông báo.'
          : '';
    setValidation(error);
    if (error) return;
    working.current = true;
    void command
      .mutateAsync({
        path: '/v1/me/event-reminders',
        method: 'PUT',
        body: {
          enabled: settings.enabled,
          eventIds: selected,
          offsets,
          inApp: settings.inApp,
          email: settings.email,
          sound: settings.sound,
          quietStart: settings.quietStart,
          quietEnd: settings.quietEnd,
          timezone: settings.timezone.trim(),
          expectedVersion: settings.version,
        },
      })
      .then(async (saved) => {
        const key = ['api', user?.id ?? 'guest', '/v1/me/event-reminders'];
        await cache.cancelQueries({ queryKey: key, exact: true });
        cache.setQueryData<Schemas['ReminderSettings']>(key, (current) =>
          current && current.version > saved.version ? current : saved,
        );
        setDraft({});
        setBase(null);
      })
      .catch((error) => {
        if (error instanceof ApiError && error.code === 'VERSION_CONFLICT') void query.refetch();
        if (error instanceof ApiError && error.code === 'EVENT_NOT_SAVED') void events.refetch();
      })
      .finally(() => {
        working.current = false;
      });
  };
  async function reload() {
    if (working.current) return;
    working.current = true;
    setReloading(true);
    setValidation('');
    try {
      const [settingsResult, eventsResult] = await Promise.all([query.refetch(), events.refetch()]);
      if (settingsResult.error) throw settingsResult.error;
      if (eventsResult.error) throw eventsResult.error;
      setBase(null);
      setDraft({});
      command.reset();
    } catch (cause) {
      setValidation(errorMessage(cause));
    } finally {
      working.current = false;
      setReloading(false);
    }
  }
  return (
    <EventFlowPage
      title="Cài đặt nhắc lịch"
      footer={
        <>
          <EventFlowButton
            title="Lưu cài đặt nhắc lịch"
            disabled={!settings || !events.data || conflict}
            pending={busy}
            onPress={save}
          />
          <EventFlowButton
            title={
              ticketId
                ? 'Về vé tham gia'
                : from === 'collections'
                  ? 'Về bộ sưu tập'
                  : from === 'calendar'
                    ? 'Về lịch hoạt động'
                    : 'Về hoạt động yêu thích'
            }
            tone="outline"
            disabled={busy}
            onPress={() =>
              ticketId
                ? router.dismissTo({ pathname: '/event-ticket', params: { id: ticketId } })
                : from === 'collections'
                  ? router.dismissTo('/event-collections')
                  : from === 'calendar'
                    ? router.dismissTo('/calendar')
                    : router.dismissTo({
                        pathname: '/saved',
                        params:
                          from === 'saved' && isCalendarDate(savedDate) ? { date: savedDate } : {},
                      })
            }
          />
        </>
      }
    >
      <QueryState query={query}>
        {settings ? (
          <>
            <View style={[s.card, { backgroundColor: colors.mint, gap: 16 }]}>
              <View style={s.row}>
                <Artwork source={a.bell} width={30} />
                <View style={{ flex: 1, gap: 4 }}>
                  <EventFlowHeading>Đừng bỏ lỡ hẹn xanh</EventFlowHeading>
                  <Text size={12} color="#677C8C">
                    Nhắc bạn về những hoạt động đã lưu hoặc đăng ký.
                  </Text>
                </View>
              </View>
              <View style={[s.row, { justifyContent: 'space-between' }]}>
                <Text style={{ flex: 1 }}>Bật nhắc lịch hoạt động</Text>
                <Switch
                  accessibilityLabel="Bật nhắc lịch hoạt động"
                  value={settings.enabled}
                  disabled={busy}
                  onValueChange={(value) => change('enabled', value)}
                  trackColor={{ true: '#147CC1' }}
                />
              </View>
            </View>
            <View style={s.section}>
              <EventFlowHeading>Áp dụng cho hoạt động</EventFlowHeading>
              <View style={s.card}>
                <QueryState
                  query={events}
                  empty={!events.data?.length}
                  emptyText="Chưa có hoạt động sắp diễn ra đã lưu hoặc đăng ký"
                >
                  {events.data?.map((event) => (
                    <Pressable
                      key={event.id}
                      accessibilityRole="checkbox"
                      accessibilityLabel={event.title}
                      accessibilityState={{
                        checked: selected.includes(event.id),
                        disabled: busy || (!selected.includes(event.id) && selected.length >= 100),
                      }}
                      disabled={busy || (!selected.includes(event.id) && selected.length >= 100)}
                      aria-checked={selected.includes(event.id)}
                      onPress={() =>
                        change(
                          'eventIds',
                          selected.includes(event.id)
                            ? selected.filter((id) => id !== event.id)
                            : [...selected, event.id],
                        )
                      }
                      style={[s.row, { minHeight: 52 }]}
                    >
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderWidth: 1.5,
                          borderColor: selected.includes(event.id) ? '#147CC1' : '#DEEBF3',
                          backgroundColor: selected.includes(event.id) ? '#147CC1' : colors.surface,
                          borderRadius: 6,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {selected.includes(event.id) ? (
                          <Artwork source={a.check} width={14} />
                        ) : null}
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text>{event.title}</Text>
                        <Text size={12} color="#677C8C">
                          {eventTimeRange(event)}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </QueryState>
                {removedCount > 0 ? (
                  <Notice>
                    {removedCount} hoạt động đã kết thúc hoặc được bỏ khỏi lịch. Lưu để cập nhật
                    danh sách nhắc.
                  </Notice>
                ) : null}
              </View>
              <EventFlowButton
                title="Chọn thêm từ bộ sưu tập"
                tone="quiet"
                disabled={busy || !events.data}
                onPress={() => setCollectionsOpen(true)}
              />
            </View>
            <View style={s.section}>
              <EventFlowHeading>Nhắc trước khi bắt đầu</EventFlowHeading>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { minutes: 60, title: '1 giờ' },
                  { minutes: 180, title: '3 giờ' },
                  { minutes: 1440, title: '1 ngày' },
                  ...offsets
                    .filter((value) => ![60, 180, 1440].includes(value))
                    .map((minutes) => ({ minutes, title: `${minutes} phút` })),
                ].map((item) => (
                  <Chip
                    key={item.minutes}
                    label={item.title}
                    selected={offsets.includes(item.minutes)}
                    disabled={busy || (!offsets.includes(item.minutes) && offsets.length >= 8)}
                    onPress={() =>
                      change(
                        'offsets',
                        offsets.includes(item.minutes)
                          ? offsets.filter((value) => value !== item.minutes)
                          : [...offsets, item.minutes],
                      )
                    }
                  />
                ))}
                <Chip
                  label="Tùy chỉnh"
                  selected={customOpen}
                  disabled={busy || offsets.length >= 8}
                  onPress={() => setCustomOpen(true)}
                />
              </View>
              <Text size={12} color="#677C8C">
                Bạn nhận một lời nhắc cho mỗi thời điểm đã chọn. Thời điểm đã qua sẽ được bỏ qua.
              </Text>
            </View>
            <View style={s.section}>
              <EventFlowHeading>Cách nhận thông báo</EventFlowHeading>
              <View style={s.card}>
                {[
                  {
                    key: 'inApp' as const,
                    title: 'Thông báo trong ứng dụng',
                    detail: 'Hiện trong hộp thông báo BlueSteps',
                  },
                  { key: 'email' as const, title: 'Email nhắc lịch', detail: user?.email ?? '' },
                  {
                    key: 'sound' as const,
                    title: 'Âm thanh và rung',
                    detail: 'Áp dụng khi hiển thị lời nhắc trên thiết bị',
                  },
                ].map((item) => (
                  <View key={item.key} style={s.row}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text>{item.title}</Text>
                      <Text size={12} color="#677C8C">
                        {item.detail}
                      </Text>
                    </View>
                    <Switch
                      accessibilityLabel={item.title}
                      value={settings[item.key]}
                      disabled={busy}
                      onValueChange={(value) => change(item.key, value)}
                      trackColor={{ true: '#147CC1' }}
                    />
                  </View>
                ))}
              </View>
              <EventFlowButton
                title="Cài đặt thông báo trên thiết bị"
                tone="quiet"
                disabled={busy}
                onPress={() =>
                  router.push({
                    pathname: '/notifications',
                    params: { view: 'settings', fromReminders: '1' },
                  })
                }
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Giờ yên lặng"
              disabled={busy}
              onPress={() => setQuietOpen(true)}
              style={[s.row, { minHeight: 52 }]}
            >
              <Artwork source={a.moon} width={22} />
              <View style={{ flex: 1, gap: 4 }}>
                <EventFlowHeading>Giờ yên lặng</EventFlowHeading>
                <Text size={12} color="#677C8C">
                  {settings.quietStart}–{settings.quietEnd} · {settings.timezone}
                </Text>
              </View>
              <Artwork source={a.next} width={18} />
            </Pressable>
            <View
              style={[
                s.card,
                s.row,
                {
                  backgroundColor: colors.mint,
                  borderWidth: 0,
                  borderRadius: 14,
                  padding: 14,
                  alignItems: 'flex-start',
                },
              ]}
            >
              <Artwork source={a.info} width={20} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text weight="medium" color="#147CC1">
                  Lời nhắc tiếp theo
                </Text>
                <Text size={12} color="#677C8C">
                  {Object.keys(draft).length
                    ? 'Lưu thay đổi để cập nhật lịch nhắc.'
                    : query.data?.nextReminder
                      ? new Date(query.data.nextReminder).toLocaleString('vi-VN', {
                          timeZone: settings.timezone,
                        })
                      : settings.enabled
                        ? 'Không còn thời điểm nhắc phù hợp trước khi hoạt động bắt đầu.'
                        : 'Bật và lưu cài đặt để lên lịch nhắc.'}
                </Text>
              </View>
            </View>
            {command.isSuccess && !Object.keys(draft).length ? (
              <Notice tone="success">Đã lưu cài đặt nhắc lịch.</Notice>
            ) : null}
            {validation ? <Notice tone="error">{validation}</Notice> : null}
            {conflict ? (
              <View style={{ gap: 10 }}>
                <Notice tone="warning">
                  Cài đặt đã thay đổi ở nơi khác. Nội dung đang sửa vẫn được giữ. Dùng bản mới nhất
                  sẽ thay các nội dung đang nhập.
                </Notice>
                <Button
                  title="Dùng cài đặt mới nhất"
                  variant="secondary"
                  pending={reloading}
                  onPress={() => void reload()}
                />
              </View>
            ) : null}
            <CommandError error={command.error} />
            {collectionsOpen && events.data ? (
              <EventReminderCollectionPicker
                available={events.data}
                selected={selected}
                onClose={() => setCollectionsOpen(false)}
                onApply={(ids) => {
                  if (working.current) return;
                  change('eventIds', [...new Set([...selected, ...ids])].slice(0, 100));
                  setCollectionsOpen(false);
                }}
              />
            ) : null}
            <Modal
              transparent
              visible={quietOpen || customOpen}
              animationType="slide"
              onRequestClose={() => {
                setQuietOpen(false);
                setCustomOpen(false);
              }}
            >
              <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#172B3D55' }}>
                <View
                  style={{
                    padding: 24,
                    gap: 16,
                    backgroundColor: colors.surface,
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                  }}
                >
                  {quietOpen ? (
                    <>
                      <EventFlowHeading>Giờ yên lặng</EventFlowHeading>
                      <Field
                        label="Bắt đầu (HH:MM)"
                        editable={!busy}
                        value={settings.quietStart}
                        onChangeText={(value) => change('quietStart', value)}
                      />
                      <Field
                        label="Kết thúc (HH:MM)"
                        editable={!busy}
                        value={settings.quietEnd}
                        onChangeText={(value) => change('quietEnd', value)}
                      />
                      <Field
                        label="Múi giờ IANA"
                        editable={!busy}
                        value={settings.timezone}
                        onChangeText={(value) => change('timezone', value)}
                      />
                      <Text size={12}>
                        Lời nhắc trong giờ yên lặng được chuyển đến lúc kết thúc, nếu hoạt động chưa
                        bắt đầu.
                      </Text>
                    </>
                  ) : (
                    <>
                      <EventFlowHeading>Nhắc trước khi bắt đầu</EventFlowHeading>
                      <TextInput
                        accessibilityLabel="Số phút nhắc trước"
                        keyboardType="number-pad"
                        editable={!busy}
                        maxLength={5}
                        value={custom}
                        onChangeText={setCustom}
                        placeholder="Số phút từ 1 đến 43200"
                        style={{
                          minHeight: 48,
                          borderWidth: 1,
                          borderColor: colors.border,
                          borderRadius: 12,
                          padding: 12,
                          color: colors.text,
                        }}
                      />
                      <Button
                        title="Thêm thời điểm nhắc"
                        disabled={
                          busy ||
                          !/^\d+$/.test(custom) ||
                          Number(custom) < 1 ||
                          Number(custom) > 43200 ||
                          offsets.length >= 8
                        }
                        onPress={() => {
                          change('offsets', [...new Set([...offsets, Number(custom)])]);
                          setCustom('');
                          setCustomOpen(false);
                        }}
                      />
                    </>
                  )}
                  <Button
                    title="Đóng"
                    variant="quiet"
                    onPress={() => {
                      setQuietOpen(false);
                      setCustomOpen(false);
                    }}
                  />
                </View>
              </View>
            </Modal>
          </>
        ) : null}
      </QueryState>
    </EventFlowPage>
  );
}
