import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../providers';
import {
  Button,
  Card,
  Chip,
  Empty,
  Field,
  Icon,
  IconButton,
  Label,
  Notice,
  Row,
  Screen,
  Search,
} from '../../design-system/ui';
import { QueryContent } from '../../design-system/QueryContent';
import { useDemoQuery } from '../../services/useDemoQuery';
import { events, type GreenEvent } from '../../services/fixtures';

function EventCard({ event }: { event: GreenEvent }) {
  const { colors, saved, toggleSaved } = useApp();
  return (
    <Card>
      <Row>
        <View
          style={{
            backgroundColor: colors.soft,
            borderRadius: 14,
            padding: 12,
            alignItems: 'center',
          }}
        >
          <Label bold size={26} color={colors.primary}>
            {event.day}
          </Label>
          <Label size={10} bold>
            {event.month}
          </Label>
        </View>
        <View style={{ flex: 1 }}>
          <Label bold size={17}>
            {event.title}
          </Label>
          <Label size={12} color={colors.muted}>
            {event.area}
          </Label>
        </View>
        <IconButton
          name={saved.includes(event.id) ? 'bookmark' : 'bookmark-outline'}
          label={`${saved.includes(event.id) ? 'Bỏ lưu' : 'Lưu'} ${event.title}`}
          selected={saved.includes(event.id)}
          onPress={() => toggleSaved(event.id)}
        />
      </Row>
      <Label size={13}>{event.time}</Label>
      <Button
        title="Xem hoạt động"
        variant="secondary"
        onPress={() => router.push(`/events/${event.id}`)}
      />
    </Card>
  );
}
export function EventListScreen({
  savedOnly = false,
  calendar = false,
}: {
  savedOnly?: boolean;
  calendar?: boolean;
}) {
  const { saved, colors } = useApp();
  const query = useDemoQuery('events');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [selectedDay, setSelectedDay] = useState<string>();
  const items =
    query.data?.filter(
      (event) =>
        (!savedOnly || saved.includes(event.id)) &&
        (!calendar || !selectedDay || event.day === selectedDay) &&
        (category === 'Tất cả' || event.category === category) &&
        event.title.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')),
    ) ?? [];
  return (
    <Screen
      title={savedOnly ? 'Hoạt động đã lưu' : calendar ? 'Lịch hoạt động' : 'Hoạt động xanh'}
      subtitle={
        calendar ? 'Tháng 11/2026 · Asia/Ho_Chi_Minh · Demo' : 'Cùng nhau tạo nên thay đổi.'
      }
      back
    >
      <Search value={search} onChangeText={setSearch} placeholder="Tìm hoạt động" />
      {calendar ? (
        <Card>
          <Label bold size={20}>
            Tháng 11 năm 2026
          </Label>
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
            {Array.from({ length: 42 }, (_, i) => {
              const day = i - 5;
              const value = String(day).padStart(2, '0');
              const hasEvent = events.some((event) => event.day === value);
              return day > 0 && day <= 30 ? (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={`Ngày ${day} tháng 11${hasEvent ? ', có hoạt động' : ''}`}
                  accessibilityState={{ selected: selectedDay === value }}
                  onPress={() => setSelectedDay(selectedDay === value ? undefined : value)}
                  style={{
                    width: `${100 / 7}%`,
                    minHeight: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    backgroundColor: selectedDay === value ? colors.primary : 'transparent',
                  }}
                >
                  <Label
                    size={14}
                    bold={hasEvent}
                    color={selectedDay === value ? colors.heroText : colors.text}
                  >
                    {day}
                  </Label>
                  {hasEvent ? (
                    <View
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: selectedDay === value ? colors.heroText : colors.primary,
                      }}
                    />
                  ) : null}
                </Pressable>
              ) : (
                <View key={i} style={{ width: `${100 / 7}%`, minHeight: 44 }} />
              );
            })}
          </View>
          {selectedDay ? (
            <Button
              title="Xem cả tháng"
              variant="quiet"
              onPress={() => setSelectedDay(undefined)}
            />
          ) : null}
          <Label size={12}>Dấu chấm thể hiện hoạt động minh họa.</Label>
        </Card>
      ) : null}
      <Row style={{ flexWrap: 'wrap' }}>
        {['Tất cả', 'Thu gom', 'Workshop'].map((value) => (
          <Chip
            key={value}
            label={value}
            selected={category === value}
            onPress={() => setCategory(value)}
          />
        ))}
      </Row>
      {!savedOnly ? (
        <Row>
          <Button
            title="Đã lưu"
            variant="quiet"
            icon="bookmark-outline"
            onPress={() => router.push('/saved')}
          />
          <Button
            title={calendar ? 'Danh sách' : 'Xem lịch'}
            variant="quiet"
            icon="calendar-outline"
            onPress={() => router.push(calendar ? '/events' : '/calendar')}
          />
        </Row>
      ) : (
        <Notice>
          Lưu hoạt động giúp bạn tìm lại trong phiên demo. Lưu không đồng nghĩa đã đăng ký hay đặt
          nhắc lịch.
        </Notice>
      )}
      <QueryContent
        loading={query.isPending}
        error={query.isError}
        empty={!items.length}
        retry={() => {
          void query.refetch();
        }}
      >
        {items.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </QueryContent>
    </Screen>
  );
}
export function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = events.find((event) => event.id === id);
  const { colors, saved, toggleSaved } = useApp();
  return (
    <Screen title="Chi tiết hoạt động" back>
      {!event ? (
        <Empty title="Hoạt động không tồn tại" />
      ) : (
        <>
          <Card style={{ backgroundColor: colors.successSoft, alignItems: 'center', padding: 32 }}>
            <Icon name={event.icon} size={78} color={colors.success} />
            <Label size={12} bold color={colors.success}>
              {event.category.toUpperCase()} · DEMO
            </Label>
          </Card>
          <Label size={26} bold>
            {event.title}
          </Label>
          <Row>
            <Icon name="time-outline" />
            <Label style={{ flex: 1 }}>{event.time}</Label>
          </Row>
          <Row>
            <Icon name="location-outline" />
            <Label style={{ flex: 1 }}>{event.area}</Label>
          </Row>
          <Label>{event.description}</Label>
          <Notice tone="warning">
            Sức chứa và lịch chỉ là dữ liệu minh họa. Chưa có đơn vị tổ chức hoặc vé tham gia thật.
          </Notice>
          <Button
            title={saved.includes(event.id) ? 'Bỏ lưu hoạt động' : 'Lưu hoạt động'}
            variant="secondary"
            icon="bookmark-outline"
            onPress={() => toggleSaved(event.id)}
          />
          <Button
            title="Xem biểu mẫu đăng ký"
            onPress={() => router.push(`/registration?id=${event.id}`)}
          />
        </>
      )}
    </Screen>
  );
}
export function RegistrationScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [checked, setChecked] = useState(false);
  const valid = name.trim().length > 1 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && consent;
  return (
    <Screen title="Đăng ký tham gia" back>
      <Notice>
        Biểu mẫu frontend. Đăng ký thật cần Python Identity, capacity và ticket policy đã chốt.
      </Notice>
      <Field
        label="Họ và tên"
        value={name}
        onChangeText={setName}
        autoComplete="name"
        error={checked && name.trim().length < 2 ? 'Nhập tên ít nhất 2 ký tự.' : undefined}
      />
      <Field
        label="Email liên hệ"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        error={
          checked && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Nhập email hợp lệ.' : undefined
        }
      />
      <Chip
        label="Tôi đồng ý dùng thông tin cho hoạt động này"
        selected={consent}
        onPress={() => setConsent(!consent)}
      />
      <Button title="Kiểm tra biểu mẫu" onPress={() => setChecked(true)} />
      {checked ? (
        <Notice tone={valid ? 'success' : 'error'}>
          {valid
            ? 'Biểu mẫu hợp lệ. Chưa gửi, chưa giữ chỗ và chưa phát vé.'
            : 'Kiểm tra tên, email và sự đồng ý cho mục đích liên hệ.'}
        </Notice>
      ) : null}
    </Screen>
  );
}
