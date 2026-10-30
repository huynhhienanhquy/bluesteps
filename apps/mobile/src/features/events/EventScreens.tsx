import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
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
  Search,
} from '../../design-system/ui';
import { QueryContent } from '../../design-system/QueryContent';
import { useDemoQuery } from '../../services/useDemoQuery';
import { events } from '../../services/fixtures';
import { calendarDays, normalizeEventSearch, shiftMonth } from '../../services/event-planning';
import {
  EventCard,
  EventCover,
  EventLinks,
  EventMissing,
  EventPage,
  EventSummary,
} from './EventParts';
import { SavedEventsScreen } from './SavedEventScreens';
export { RegistrationScreen } from './EventParticipationScreens';

export function EventListScreen({
  savedOnly = false,
  calendar = false,
}: {
  savedOnly?: boolean;
  calendar?: boolean;
}) {
  if (savedOnly) return <SavedEventsScreen />;
  if (calendar) return <EventCalendarScreen />;
  return <EventExploreScreen />;
}

function EventExploreScreen() {
  const { colors } = useApp();
  const query = useDemoQuery('events');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [city, setCity] = useState('Tất cả khu vực');
  const [weekend, setWeekend] = useState(false);
  const items =
    query.data?.filter(
      (event) =>
        (category === 'Tất cả' ||
          (category === 'Trồng cây' ? event.id === 'garden' : event.category === category)) &&
        (city === 'Tất cả khu vực' || event.area.includes('TP HCM')) &&
        (!weekend || [0, 6].includes(new Date(`${event.date}T00:00:00Z`).getUTCDay())) &&
        normalizeEventSearch(`${event.title} ${event.area}`).includes(normalizeEventSearch(search)),
    ) ?? [];
  return (
    <EventPage title="Khám phá hoạt động">
      <View style={{ gap: 6 }}>
        <Label size={26} bold color={colors.primaryDark}>
          Một việc nhỏ,{'\n'}một thay đổi xanh.
        </Label>
        <Label size={13} color={colors.muted}>
          Tìm hoạt động ý nghĩa, cùng cộng đồng.
        </Label>
      </View>
      <Search value={search} onChangeText={setSearch} placeholder="Tìm hoạt động" />
      <Row style={{ flexWrap: 'wrap' }}>
        <Chip
          label="TP HCM"
          selected={city === 'TP HCM'}
          onPress={() => setCity(city === 'TP HCM' ? 'Tất cả khu vực' : 'TP HCM')}
        />
        <Chip label="Cuối tuần" selected={weekend} onPress={() => setWeekend(!weekend)} />
        <Chip
          label="Tất cả"
          selected={category === 'Tất cả' && city === 'Tất cả khu vực' && !weekend && !search}
          onPress={() => {
            setCategory('Tất cả');
            setCity('Tất cả khu vực');
            setWeekend(false);
            setSearch('');
          }}
        />
      </Row>
      <Row style={{ gap: 10 }}>
        {(
          [
            ['Thu gom', 'Dọn rác', 'trash-outline'],
            ['Trồng cây', 'Trồng cây', 'leaf-outline'],
            ['Giáo dục', 'Phân loại', 'school-outline'],
          ] as const
        ).map(([value, title, icon]) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={title}
            accessibilityState={{ selected: category === value }}
            onPress={() => setCategory(category === value ? 'Tất cả' : value)}
            style={{
              flex: 1,
              minHeight: 82,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: category === value ? colors.brand : colors.border,
              backgroundColor: colors.soft,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
            }}
          >
            <Icon name={icon} color={colors.brand} />
            <Label size={12} color={colors.brand}>
              {title}
            </Label>
          </Pressable>
        ))}
      </Row>
      <EventLinks />
      <Label size={16} bold heading>
        Hoạt động dành cho bạn · {items.length}
      </Label>
      <QueryContent
        loading={query.isPending}
        error={query.isError}
        empty={!items.length}
        retry={() => {
          void query.refetch();
        }}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          {items.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </View>
      </QueryContent>
      <Card style={{ backgroundColor: colors.soft }}>
        <Label bold>Lên lịch cho một tuần xanh</Label>
        <Label size={12} color={colors.muted}>
          Xem hoạt động theo ngày, tránh trùng lịch.
        </Label>
        <Button
          title="Mở lịch hoạt động"
          variant="quiet"
          icon="calendar-outline"
          onPress={() => router.push('/calendar')}
        />
      </Card>
      <Notice>
        Lịch và địa điểm mẫu theo thiết kế. Lưu hoạt động chỉ áp dụng trong phiên này.
      </Notice>
    </EventPage>
  );
}

export function EventCalendarScreen() {
  const { colors, eventPlanning } = useApp();
  const query = useDemoQuery('events');
  const [month, setMonth] = useState('2026-10');
  const [selected, setSelected] = useState('2026-10-25');
  const [mode, setMode] = useState('Tháng');
  const [registeredOnly, setRegisteredOnly] = useState(false);
  const days = calendarDays(month);
  const weekIndex = Math.max(0, Math.floor(days.indexOf(selected) / 7));
  const visibleDays = mode === 'Tuần' ? days.slice(weekIndex * 7, weekIndex * 7 + 7) : days;
  const data =
    query.data?.filter((event) => !registeredOnly || !!eventPlanning.registrations[event.id]) ?? [];
  const items = data.filter((event) =>
    selected ? event.date === selected : event.date.startsWith(month),
  );
  const changeMonth = (delta: number) => {
    setMonth(shiftMonth(month, delta));
    setSelected('');
  };
  return (
    <EventPage title="Lịch hoạt động">
      <Notice>
        Lịch mẫu · Múi giờ Việt Nam (Asia/Ho_Chi_Minh). Tháng mặc định theo thiết kế đã lưu.
      </Notice>
      <Row>
        {['Tháng', 'Tuần'].map((value) => (
          <Chip
            key={value}
            label={value}
            selected={mode === value}
            onPress={() => setMode(value)}
          />
        ))}
      </Row>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <IconButton name="chevron-back" label="Tháng trước" onPress={() => changeMonth(-1)} />
          <Label bold>
            Tháng {Number(month.slice(5))}, {month.slice(0, 4)}
          </Label>
          <IconButton name="chevron-forward" label="Tháng sau" onPress={() => changeMonth(1)} />
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
          {visibleDays.map((date) => {
            const activeMonth = date.startsWith(month);
            const hasEvent = data.some((event) => event.date === date);
            return (
              <Pressable
                key={date}
                accessibilityRole="button"
                accessibilityLabel={`Ngày ${Number(date.slice(8))} tháng ${Number(date.slice(5, 7))}${hasEvent ? ', có hoạt động' : ''}`}
                accessibilityState={{ selected: selected === date }}
                onPress={() => {
                  setSelected(date);
                  if (!activeMonth) setMonth(date.slice(0, 7));
                }}
                style={{
                  width: `${100 / 7}%`,
                  minHeight: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  backgroundColor: selected === date ? colors.primary : 'transparent',
                  gap: 3,
                }}
              >
                <Label
                  size={13}
                  bold={hasEvent}
                  color={
                    selected === date ? colors.heroText : activeMonth ? colors.text : colors.muted
                  }
                >
                  {Number(date.slice(8))}
                </Label>
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: hasEvent
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
        <Chip
          label="Tất cả hoạt động"
          selected={!registeredOnly}
          onPress={() => setRegisteredOnly(false)}
        />
        <Chip
          label="Đã đăng ký mẫu"
          selected={registeredOnly}
          onPress={() => setRegisteredOnly(true)}
        />
      </Row>
      <Label bold heading>
        {selected
          ? `Hoạt động ngày ${selected.split('-').reverse().join('/')}`
          : 'Hoạt động trong tháng'}
      </Label>
      <QueryContent
        loading={query.isPending}
        error={query.isError}
        retry={() => {
          void query.refetch();
        }}
      >
        {items.length ? (
          items.map((event) => <EventCard key={event.id} event={event} />)
        ) : (
          <Empty
            title="Không có hoạt động trong thời gian này"
            detail="Chọn ngày khác, đổi tháng hoặc xem tất cả hoạt động."
          />
        )}
      </QueryContent>
      <Button
        title="Khám phá hoạt động"
        variant="secondary"
        onPress={() => router.push('/events')}
      />
    </EventPage>
  );
}

export function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = events.find((item) => item.id === id);
  const { colors, saved, toggleSaved, eventPlanning } = useApp();
  const registration = id ? eventPlanning.registrations[id] : undefined;
  return (
    <EventPage title="Chi tiết hoạt động">
      {!event ? (
        <EventMissing />
      ) : (
        <>
          <View style={{ borderRadius: 22, overflow: 'hidden' }}>
            <EventCover event={event} height={226} />
          </View>
          <Label size={25} bold heading>
            {event.title}
          </Label>
          <EventSummary event={event} />
          <Row style={{ justifyContent: 'space-between' }}>
            {[
              ['Miễn phí', 'Tham gia'],
              ['18+', 'Tình nguyện viên'],
              ['2 giờ', 'Thời lượng mẫu'],
            ].map(([value, label]) => (
              <View key={label} style={{ flex: 1, alignItems: 'center' }}>
                <Label bold size={16} color={colors.brand}>
                  {value}
                </Label>
                <Label size={10} color={colors.muted}>
                  {label}
                </Label>
              </View>
            ))}
          </Row>
          <Label size={18} bold heading>
            Cùng nhau gieo mầm xanh
          </Label>
          <Label>{event.description}</Label>
          <Label size={18} bold heading>
            Chuẩn bị trước khi tham gia
          </Label>
          <Label size={13}>
            Mang bình nước cá nhân, trang phục gọn gàng và đến sớm 15 phút. Đọc hướng dẫn và làm
            theo điều phối viên tại điểm hẹn.
          </Label>
          <Notice>
            Lịch, số người và địa điểm là dữ liệu mẫu. Các thao tác tham gia dưới đây chỉ mô phỏng
            trong phiên.
          </Notice>
          <Button
            title={saved.includes(event.id) ? 'Bỏ lưu hoạt động' : 'Lưu hoạt động'}
            variant="secondary"
            icon="heart-outline"
            onPress={() => toggleSaved(event.id)}
          />
          <Button
            title={registration ? 'Xem vé mẫu' : 'Xem biểu mẫu đăng ký'}
            onPress={() =>
              router.push(
                registration ? `/event-ticket?id=${event.id}` : `/registration?id=${event.id}`,
              )
            }
          />
          <Button
            title="Xem tổng kết mẫu"
            variant="quiet"
            onPress={() => router.push(`/event-summary?id=${event.id}`)}
          />
          <Label size={18} bold heading>
            Hoạt động khác
          </Label>
          {events
            .filter((item) => item.id !== event.id)
            .slice(0, 2)
            .map((item) => (
              <EventCard key={item.id} event={item} />
            ))}
        </>
      )}
    </EventPage>
  );
}
