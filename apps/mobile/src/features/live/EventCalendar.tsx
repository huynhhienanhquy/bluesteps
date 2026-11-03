import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Artwork, DesignLink } from '../../design-system/DesignScreen';
import { calendarArtwork as a } from '../../design-system/event-flow-artwork';
import { Label, Notice } from '../../design-system/ui';
import { useApp } from '../../providers';
import type { Schemas } from '../../services/api';
import { useResource } from '../../services/queries';
import { QueryState, RequireAuth } from './common';
import { CatalogChip } from './DesignParts';
import { AccountButton } from './OnboardingParts';
import { EventFlowHeading, EventFlowPage } from './EventFlowParts';
import {
  calendarDateKey,
  calendarDays,
  eventOnCalendarDate,
  shiftCalendarDate,
  shiftCalendarMonth,
} from './calendar-model';

export function CalendarScreen() {
  const { user } = useApp();
  return <CalendarBody key={user?.id ?? 'guest'} />;
}

function CalendarBody() {
  const { colors, status } = useApp();
  const scroll = useRef<ScrollView>(null);
  const bodyY = useRef(0);
  const dayY = useRef(0);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = setInterval(update, 60_000);
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') update();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, []);
  const preferences = useResource<Schemas['Preferences']>('/v1/me/preferences', true);
  const timezone = preferences.data?.timezone ?? 'Asia/Ho_Chi_Minh';
  const today = calendarDateKey(new Date(now), timezone);
  const [selection, setSelection] = useState<string | null>(null);
  const [mode, setMode] = useState<'month' | 'week'>('month');
  const selected = selection ?? today;
  const days = calendarDays(selected, mode);
  const start = shiftCalendarDate(days[0]!, -1) + 'T00:00:00Z';
  const end = shiftCalendarDate(days[days.length - 1]!, 2) + 'T00:00:00Z';
  const query = useResource<{
    items: Schemas['GreenEvent'][];
    overlaps: { eventIds: string[] }[];
    registeredEventIds: string[];
    checkedInEventIds?: string[];
  }>(`/v1/me/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, true);
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
      if (status === 'authenticated') void refetch();
    }, [refetch, status]),
  );
  const items = query.data?.items ?? [];
  const dayItems = items.filter((item) => eventOnCalendarDate(item, selected, timezone));
  const collisions =
    query.data?.overlaps.filter((pair) =>
      pair.eventIds.every((id) => dayItems.some((item) => item.id === id)),
    ) ?? [];
  const time = (value: string) =>
    new Intl.DateTimeFormat('vi-VN', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(value));
  const navigate = (offset: number) =>
    setSelection(
      mode === 'month'
        ? shiftCalendarMonth(selected, offset)
        : shiftCalendarDate(selected, offset * 7),
    );
  return (
    <EventFlowPage
      title="Lịch hoạt động"
      scrollRef={scroll}
      onBodyLayout={(y) => {
        bodyY.current = y;
      }}
      footer={
        <>
          <AccountButton
            title={`Xem hoạt động ngày ${Number(selected.slice(8))}/${Number(selected.slice(5, 7))}`}
            onPress={() =>
              scroll.current?.scrollTo({ y: bodyY.current + dayY.current, animated: true })
            }
          />
          <DesignLink onPress={() => router.push('/events')} style={{ alignItems: 'center' }}>
            Khám phá thêm hoạt động
          </DesignLink>
        </>
      }
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <CatalogChip
            label="Tháng"
            selected={mode === 'month'}
            onPress={() => setMode('month')}
            icon={mode === 'month' ? <Artwork source={a.check} width={14} /> : undefined}
          />
          <CatalogChip
            label="Tuần"
            selected={mode === 'week'}
            onPress={() => setMode('week')}
            icon={mode === 'week' ? <Artwork source={a.check} width={14} /> : undefined}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Khám phá hoạt động để thêm vào lịch"
          onPress={() => router.push('/events')}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Artwork source={a.add} width={24} />
        </Pressable>
      </View>
      <View
        style={{
          borderWidth: 1,
          borderColor: '#DEEBF3',
          borderRadius: 20,
          padding: 16,
          gap: 10,
          backgroundColor: colors.surface,
        }}
      >
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={mode === 'month' ? 'Tháng trước' : 'Tuần trước'}
            onPress={() => navigate(-1)}
            hitSlop={12}
          >
            <Artwork source={a.previous} width={18} />
          </Pressable>
          <Label family="inter" size={20} bold heading style={{ lineHeight: 27 }}>
            Tháng {Number(selected.slice(5, 7))}, {selected.slice(0, 4)}
          </Label>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={mode === 'month' ? 'Tháng sau' : 'Tuần sau'}
            onPress={() => navigate(1)}
            hitSlop={12}
          >
            <Artwork source={a.next} width={18} />
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row' }}>
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
            <Label
              key={day}
              family="inter"
              size={12}
              color="#677C8C"
              style={{ flex: 1, textAlign: 'center', lineHeight: 16 }}
            >
              {day}
            </Label>
          ))}
        </View>
        <View style={{ gap: 3 }}>
          {Array.from({ length: days.length / 7 }, (_, week) => (
            <View key={week} style={{ flexDirection: 'row', gap: 3 }}>
              {days.slice(week * 7, week * 7 + 7).map((date) => {
                const active = selected === date;
                const eventCount = items.filter((item) =>
                  eventOnCalendarDate(item, date, timezone),
                ).length;
                return (
                  <Pressable
                    key={date}
                    accessibilityRole="button"
                    accessibilityLabel={`Ngày ${Number(date.slice(8))} tháng ${Number(date.slice(5, 7))} năm ${date.slice(0, 4)}${eventCount ? `, ${eventCount} hoạt động đã lưu hoặc đăng ký` : ''}`}
                    accessibilityState={{ selected: active }}
                    aria-pressed={active}
                    onPress={() => setSelection(date)}
                    style={{
                      flex: 1,
                      minHeight: 42,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                      backgroundColor: active ? colors.brand : colors.surface,
                      borderWidth: date === today && !active ? 1 : 0,
                      borderColor: colors.border,
                    }}
                  >
                    <Label
                      family="inter"
                      size={14}
                      bold={active}
                      color={
                        active
                          ? colors.heroText
                          : date.slice(0, 7) === selected.slice(0, 7)
                            ? '#172B3D'
                            : '#677C8C'
                      }
                      style={{ lineHeight: 20 }}
                    >
                      {Number(date.slice(8))}
                    </Label>
                    {eventCount ? (
                      <Artwork
                        source={active ? a.selectedDot : a.dot}
                        width={active ? 5 : 4}
                        height={active ? 5 : 4}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 4 }}>
          <Artwork source={a.dot} width={4} height={4} />
          <Label family="inter" size={12} color="#677C8C" style={{ flex: 1, lineHeight: 17 }}>
            Có hoạt động đã lưu hoặc đăng ký
          </Label>
        </View>
      </View>
      <View
        onLayout={(event) => {
          dayY.current = event.nativeEvent.layout.y;
        }}
        style={{ gap: 12 }}
      >
        <EventFlowHeading>
          {new Intl.DateTimeFormat('vi-VN', {
            timeZone: 'UTC',
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          }).format(new Date(selected + 'T12:00:00Z'))}
        </EventFlowHeading>
        <RequireAuth>
          <QueryState query={query}>
            {!dayItems.length ? (
              <View
                style={{
                  borderRadius: 14,
                  padding: 14,
                  backgroundColor: colors.mint,
                  borderWidth: 1,
                  borderColor: '#DEEBF3',
                  gap: 8,
                }}
              >
                <Label family="inter" size={14} style={{ lineHeight: 20 }}>
                  Chưa có hoạt động đã lưu hoặc đăng ký trong ngày này
                </Label>
                <DesignLink onPress={() => router.push('/events')}>
                  Khám phá và lưu hoạt động
                </DesignLink>
              </View>
            ) : null}
            <View style={{ gap: 12 }}>
              {dayItems.map((item) => {
                const collision = collisions.some((pair) => pair.eventIds.includes(item.id));
                const registered = query.data?.registeredEventIds.includes(item.id);
                const attended = query.data?.checkedInEventIds?.includes(item.id);
                const finished = Date.parse(item.endsAt) <= now;
                return (
                  <View
                    key={item.id}
                    style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}
                  >
                    <Label
                      family="inter"
                      size={14}
                      color="#677C8C"
                      style={{ lineHeight: 20, paddingTop: 4, width: 42 }}
                    >
                      {time(item.startsAt)}
                    </Label>
                    <View
                      style={{
                        flex: 1,
                        borderWidth: 1,
                        borderColor: collision ? '#F5AF45' : '#DEEBF3',
                        borderRadius: 14,
                        padding: 14,
                        backgroundColor: collision ? '#FFF7E5' : colors.mint,
                        gap: 8,
                      }}
                    >
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={item.title}
                        onPress={() =>
                          router.push({ pathname: '/events/[id]', params: { id: item.id } })
                        }
                      >
                        <Label
                          family="inter"
                          size={16}
                          weight="semibold"
                          style={{ lineHeight: 22 }}
                        >
                          {item.title}
                        </Label>
                      </Pressable>
                      <Label family="inter" size={12} color="#677C8C" style={{ lineHeight: 17 }}>
                        {item.location}
                      </Label>
                      <Label
                        family="inter"
                        size={14}
                        weight="medium"
                        color={collision ? '#A8670F' : colors.brand}
                        style={{ lineHeight: 20 }}
                      >
                        {time(item.startsAt)}–{time(item.endsAt)} ·{' '}
                        {attended ? 'Đã check-in' : registered ? 'Đã đăng ký' : 'Đã lưu'}
                        {collision ? ' · Trùng giờ' : ''}
                      </Label>
                      {registered ? (
                        <DesignLink
                          onPress={() =>
                            router.push({
                              pathname: attended && finished ? '/event-summary' : '/event-ticket',
                              params: { id: item.id },
                            })
                          }
                        >
                          {attended && finished ? 'Xem tổng kết hoạt động' : 'Xem vé tham gia'}
                        </DesignLink>
                      ) : Date.parse(item.startsAt) > now && item.available > 0 ? (
                        <DesignLink
                          onPress={() =>
                            router.push({ pathname: '/registration', params: { id: item.id } })
                          }
                        >
                          Đăng ký tham gia
                        </DesignLink>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </QueryState>
        </RequireAuth>
      </View>
      {!!collisions.length ? (
        <View
          accessibilityRole="alert"
          style={{
            backgroundColor: '#FFF7E5',
            borderRadius: 14,
            padding: 14,
            flexDirection: 'row',
            gap: 10,
          }}
        >
          <Artwork source={a.warning} width={20} />
          <View style={{ flex: 1, gap: 4 }}>
            <Label family="inter" size={14} color="#9B5B09" style={{ lineHeight: 20 }}>
              Có hoạt động đang trùng giờ
            </Label>
            <Label family="inter" size={12} color="#677C8C" style={{ lineHeight: 17 }}>
              Hãy chọn lịch phù hợp trước khi đăng ký.
            </Label>
          </View>
        </View>
      ) : null}
      <View style={{ gap: 12 }}>
        <EventFlowHeading>Lịch sử tham gia</EventFlowHeading>
        <View
          style={{
            backgroundColor: colors.mint,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#DEEBF3',
            padding: 14,
            gap: 6,
          }}
        >
          <Label family="inter" size={16} weight="semibold">
            Hoạt động đã tham gia
          </Label>
          <Label family="inter" size={12} color="#677C8C">
            Tổng kết sẽ xuất hiện khi có kết quả đã xác minh.
          </Label>
          <DesignLink onPress={() => router.push('/event-summary')}>
            Xem tổng kết hoạt động
          </DesignLink>
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <EventFlowHeading>Vé của tôi</EventFlowHeading>
        <View
          style={{
            backgroundColor: colors.mint,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#DEEBF3',
            padding: 14,
            gap: 6,
          }}
        >
          <Label family="inter" size={16} weight="semibold">
            Vé của tôi
          </Label>
          <Label family="inter" size={12} color="#677C8C">
            Vé chỉ xuất hiện sau khi hệ thống xác nhận đăng ký. Chỉ lưu hoặc quan tâm sẽ chưa có vé.
          </Label>
          <DesignLink onPress={() => router.push('/event-ticket')}>Xem vé tham gia</DesignLink>
        </View>
      </View>
      <DesignLink onPress={() => setSelection(today)} style={{ alignSelf: 'center' }}>
        Về hôm nay
      </DesignLink>
      <DesignLink
        onPress={() => router.push({ pathname: '/event-reminders', params: { from: 'calendar' } })}
        style={{ alignSelf: 'center' }}
      >
        Cài đặt nhắc lịch
      </DesignLink>
      <Label family="inter" size={11} color="#677C8C" style={{ textAlign: 'center' }}>
        Múi giờ: {timezone}
      </Label>
      {preferences.isError ? (
        <Notice tone="warning">
          Chưa tải được múi giờ tài khoản. Lịch đang dùng giờ Việt Nam.
        </Notice>
      ) : null}
    </EventFlowPage>
  );
}
