import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../providers';
import { Artwork } from '../../design-system/DesignScreen';
import { eventDesignAssets } from '../../design-system/event-design-assets';
import { QueryContent } from '../../design-system/QueryContent';
import { useDemoQuery } from '../../services/useDemoQuery';
import { events } from '../../services/fixtures';
import {
  calendarDays,
  eventConflicts,
  eventTimeRange,
  formatEventMinute,
  shiftMonth,
} from '../../services/event-planning';
import { collectionColors as c } from '../collection/CollectionPage';
import {
  EventAction,
  EventFormPage,
  EventSheet,
  EventText as T,
  EventTextAction,
} from './EventFormParts';

const a = eventDesignAssets['534:49166'];
const weekdays = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

function CalendarPill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: selected ? c.brand : c.border,
        backgroundColor: selected ? c.soft : '#FFFFFF',
        paddingHorizontal: 13,
        paddingVertical: 9,
        borderRadius: 24,
      }}
    >
      {selected ? <Artwork source={a.imgCheck} width={14} /> : null}
      <T weight="medium" color={selected ? c.brand : c.muted}>
        {label}
      </T>
    </Pressable>
  );
}

export function EventCalendarScreen() {
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const sample = preview === '1';
  const { eventPlanning, saved } = useApp();
  const query = useDemoQuery('events');
  const [month, setMonth] = useState('2026-10');
  const [selected, setSelected] = useState('2026-10-25');
  const [mode, setMode] = useState('Tháng');
  const [filter, setFilter] = useState<'all' | 'saved' | 'registered'>('all');
  const [sheet, setSheet] = useState<'options' | 'tickets' | 'history' | 'day' | null>(null);
  const items = (query.data ?? []).filter(
    (event) =>
      filter === 'all' ||
      (filter === 'saved'
        ? saved.includes(event.id)
        : Boolean(eventPlanning.registrations[event.id])),
  );
  const dayItems = items
    .filter((event) => (selected ? event.date === selected : event.date.startsWith(month)))
    .sort(
      (left, right) => (eventTimeRange(left)?.start ?? 0) - (eventTimeRange(right)?.start ?? 0),
    );
  const conflicts = eventConflicts(dayItems);
  const conflictIds = new Set(
    conflicts.flatMap((conflict) => [conflict.first.id, conflict.second.id]),
  );
  const allDays = calendarDays(month);
  const lastDay = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0),
  ).getUTCDate();
  const firstIndex = allDays.indexOf(`${month}-01`);
  const monthDays = allDays.slice(0, Math.ceil((firstIndex + lastDay) / 7) * 7);
  const week = Math.max(0, Math.floor(allDays.indexOf(selected || `${month}-01`) / 7));
  const visibleDays = mode === 'Tháng' ? monthDays : allDays.slice(week * 7, week * 7 + 7);
  const weeks = Array.from({ length: visibleDays.length / 7 }, (_, index) =>
    visibleDays.slice(index * 7, index * 7 + 7),
  );
  const registrations = events.filter((event) => Boolean(eventPlanning.registrations[event.id]));
  const history = registrations.filter((event) => eventPlanning.registrations[event.id]?.checkedIn);
  const changeMonth = (delta: number) => {
    setMonth(shiftMonth(month, delta));
    setSelected('');
  };
  const selectedLabel = selected
    ? `${weekdays[new Date(`${selected}T00:00:00Z`).getUTCDay()]}, ngày ${Number(selected.slice(8))} tháng ${Number(selected.slice(5, 7))}`
    : 'Hoạt động trong tháng';
  const dateSuffix = selected
    ? `${Number(selected.slice(8))}/${Number(selected.slice(5, 7))}`
    : `${Number(month.slice(5))}/${month.slice(0, 4)}`;
  const applyFilter = (value: typeof filter) => {
    setFilter(value);
    setSheet(null);
  };
  return (
    <EventFormPage
      title="Lịch hoạt động"
      frame="534:49166"
      footer={
        <>
          <EventAction
            title={`Xem hoạt động ${selected ? 'ngày' : 'tháng'} ${dateSuffix}`}
            onPress={() => {
              if (dayItems.length === 1) router.push(`/events/${dayItems[0]!.id}`);
              else setSheet('day');
            }}
          />
          <EventTextAction title="Khám phá thêm hoạt động" onPress={() => router.push('/events')} />
        </>
      }
    >
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['Tháng', 'Tuần'].map((value) => (
            <CalendarPill
              key={value}
              label={value}
              selected={mode === value}
              onPress={() => setMode(value)}
            />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tùy chọn lịch"
          hitSlop={11}
          onPress={() => setSheet('options')}
        >
          <Artwork source={a.imgCalendarPlus} width={22} />
        </Pressable>
      </View>
      <View
        style={{ borderWidth: 1, borderColor: c.border, borderRadius: 20, padding: 15, gap: 10 }}
      >
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tháng trước"
            onPress={() => changeMonth(-1)}
            hitSlop={12}
          >
            <Artwork source={a.imgChevronLeft} width={18} />
          </Pressable>
          <T size={20} lineHeight={24} weight="bold">
            Tháng {Number(month.slice(5))}, {month.slice(0, 4)}
          </T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tháng sau"
            onPress={() => changeMonth(1)}
            hitSlop={12}
          >
            <Artwork source={a.imgChevronRight} width={18} />
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row' }}>
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
            <T key={day} size={12} color={c.muted} style={{ flex: 1, textAlign: 'center' }}>
              {day}
            </T>
          ))}
        </View>
        <View style={{ gap: 3 }}>
          {weeks.map((dates) => (
            <View key={dates[0]} style={{ flexDirection: 'row', gap: 3 }}>
              {dates.map((date) => {
                const active = date === selected;
                const hasEvent = items.some((event) => event.date === date);
                const marker = sample
                  ? ['2026-10-18', '2026-10-22', '2026-10-25'].includes(date)
                  : hasEvent;
                return (
                  <Pressable
                    key={date}
                    accessibilityRole="button"
                    accessibilityLabel={`Ngày ${Number(date.slice(8))} tháng ${Number(date.slice(5, 7))}${hasEvent ? ', có hoạt động' : ''}`}
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      setSelected(date);
                      if (!date.startsWith(month)) setMonth(date.slice(0, 7));
                    }}
                    style={{
                      flex: 1,
                      height: 42,
                      borderRadius: 14,
                      gap: 3,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: active ? c.brand : '#FFFFFF',
                    }}
                  >
                    <T
                      size={14}
                      lineHeight={17}
                      weight={active ? 'bold' : 'regular'}
                      color={active ? '#FFFFFF' : date.startsWith(month) ? c.ink : c.muted}
                    >
                      {Number(date.slice(8))}
                    </T>
                    {marker ? (
                      <Artwork source={active ? a.imgCoHotDng1 : a.imgCoHotDng} width={4} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Artwork source={a.imgDuSKin} width={5} />
          <T size={12} color={c.muted} style={{ flex: 1 }}>
            {sample
              ? 'Có hoạt động đã lưu hoặc đăng ký'
              : filter === 'all'
                ? 'Có hoạt động mẫu · Múi giờ Việt Nam'
                : filter === 'saved'
                  ? 'Có hoạt động đã lưu trong phiên'
                  : 'Có đăng ký mẫu trong phiên'}
          </T>
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <T accessibilityRole="header" size={16} weight="semibold">
          {selectedLabel}
        </T>
        <QueryContent
          loading={query.isPending}
          error={query.isError}
          retry={() => {
            void query.refetch();
          }}
        >
          {dayItems.length ? (
            dayItems.map((event, index) => {
              const time = eventTimeRange(event);
              const matching = conflicts.find((conflict) => conflict.second.id === event.id);
              const warning = Boolean(matching);
              return (
                <View
                  key={event.id}
                  style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}
                >
                  <T weight="medium" color={c.muted} style={{ width: 45 }}>
                    {time ? formatEventMinute(time.start) : '—'}
                  </T>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Xem hoạt động ${event.title}`}
                    onPress={() => router.push(`/events/${event.id}`)}
                    style={{
                      flex: 1,
                      padding: 13,
                      gap: 7,
                      borderWidth: 1,
                      borderColor: warning ? '#E9A23B' : c.border,
                      borderRadius: 14,
                      backgroundColor: warning ? '#FFF6E5' : c.mint,
                    }}
                  >
                    <T size={16} weight="semibold">
                      {event.title}
                    </T>
                    <T size={12} color={c.muted}>
                      {event.area}
                      {saved.includes(event.id) || (sample && index > 0) ? ' • Đã lưu' : ''}
                    </T>
                    <T weight="medium" color={warning ? '#92611C' : c.brand}>
                      {time
                        ? `${formatEventMinute(time.start)}–${formatEventMinute(time.end)}`
                        : event.time}{' '}
                      •{' '}
                      {matching
                        ? `Trùng ${matching.minutes % 60 === 0 ? `${matching.minutes / 60} giờ` : `${matching.minutes} phút`}`
                        : eventPlanning.registrations[event.id]
                          ? 'Đã đăng ký mẫu'
                          : conflictIds.has(event.id)
                            ? 'Dự định tham gia'
                            : 'Lịch mẫu'}
                    </T>
                  </Pressable>
                </View>
              );
            })
          ) : (
            <T color={c.muted}>Không có hoạt động trong thời gian này</T>
          )}
        </QueryContent>
      </View>
      {conflicts.map((conflict) => (
        <View
          key={`${conflict.first.id}-${conflict.second.id}`}
          style={{
            backgroundColor: '#FFF6E5',
            borderRadius: 14,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <Artwork source={a.imgTriangleAlert} width={20} />
          <View style={{ flex: 1, gap: 4 }}>
            <T weight="medium" color="#92611C">
              Hai hoạt động đang trùng giờ
            </T>
            <T size={12} color={c.muted}>
              {conflict.first.title} và {conflict.second.title} trùng từ{' '}
              {formatEventMinute(conflict.start)} đến {formatEventMinute(conflict.end)}. Hãy chọn
              lịch phù hợp trước khi đăng ký.
            </T>
          </View>
        </View>
      ))}
      <View style={{ gap: 12 }}>
        <T size={16} weight="semibold" accessibilityRole="header">
          Lịch sử tham gia
        </T>
        <View
          style={{
            padding: 13,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 14,
            backgroundColor: c.mint,
            gap: 7,
          }}
        >
          <T size={16} weight="semibold">
            Hoạt động đã tham gia
          </T>
          <T size={12} color={c.muted}>
            Mở lịch sử để chọn hoạt động cần tổng kết.
          </T>
          <T weight="medium" color={c.brand}>
            Dành cho hoạt động có check-in mẫu
          </T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xem tổng kết hoạt động đã tham gia"
            onPress={() => setSheet('history')}
            hitSlop={8}
          >
            <T weight="medium" color={c.brand}>
              Xem tổng kết hoạt động đã tham gia
            </T>
          </Pressable>
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <T size={16} weight="semibold" accessibilityRole="header">
          Vé của tôi
        </T>
        <View
          style={{
            padding: 13,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 14,
            backgroundColor: c.mint,
            gap: 7,
          }}
        >
          <T size={16} weight="semibold">
            Vé của tôi
          </T>
          <T size={12} color={c.muted}>
            Xem vé của những hoạt động đã đăng ký.
          </T>
          <T weight="medium" color={c.brand}>
            Chỉ lưu hoặc quan tâm sẽ chưa có vé
          </T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xem vé tham gia"
            onPress={() => setSheet('tickets')}
            hitSlop={8}
          >
            <T weight="medium" color={c.brand}>
              Xem vé tham gia
            </T>
          </Pressable>
        </View>
      </View>
      {sheet ? (
        <EventSheet
          title={
            sheet === 'options'
              ? 'Tùy chọn lịch'
              : sheet === 'tickets'
                ? 'Vé mẫu của tôi'
                : sheet === 'history'
                  ? 'Lịch sử tham gia mẫu'
                  : 'Hoạt động đang xem'
          }
          onClose={() => setSheet(null)}
        >
          {sheet === 'options' ? (
            <>
              <CalendarPill
                label="Tất cả hoạt động"
                selected={filter === 'all'}
                onPress={() => applyFilter('all')}
              />
              <CalendarPill
                label="Đã lưu"
                selected={filter === 'saved'}
                onPress={() => applyFilter('saved')}
              />
              <CalendarPill
                label="Đã đăng ký mẫu"
                selected={filter === 'registered'}
                onPress={() => applyFilter('registered')}
              />
              <EventTextAction
                title="Xem cả tháng"
                onPress={() => {
                  setSelected('');
                  setSheet(null);
                }}
              />
              <EventTextAction
                title="Cài đặt nhắc lịch"
                onPress={() => {
                  setSheet(null);
                  router.push('/event-reminders');
                }}
              />
            </>
          ) : (
            <>
              {(sheet === 'tickets' ? registrations : sheet === 'history' ? history : dayItems).map(
                (event) => (
                  <EventTextAction
                    key={event.id}
                    title={`${sheet === 'tickets' ? 'Mở vé' : sheet === 'history' ? 'Mở tổng kết' : 'Mở hoạt động'} ${event.title}`}
                    onPress={() => {
                      const destination = sheet;
                      setSheet(null);
                      if (destination === 'tickets') router.push(`/event-ticket?id=${event.id}`);
                      else if (destination === 'history')
                        router.push(`/event-summary?id=${event.id}`);
                      else router.push(`/events/${event.id}`);
                    }}
                  />
                ),
              )}
              {(
                sheet === 'tickets'
                  ? !registrations.length
                  : sheet === 'history'
                    ? !history.length
                    : !dayItems.length
              ) ? (
                <T color={c.muted}>
                  {sheet === 'tickets'
                    ? 'Chưa có vé mẫu. Lưu hoạt động không tạo vé.'
                    : sheet === 'history'
                      ? 'Chưa có check-in mẫu trong phiên. Không có dữ liệu tham gia thực tế.'
                      : 'Không có hoạt động trong thời gian này'}
                </T>
              ) : null}
            </>
          )}
          <EventAction title="Đóng tùy chọn lịch" onPress={() => setSheet(null)} />
        </EventSheet>
      ) : null}
    </EventFormPage>
  );
}
