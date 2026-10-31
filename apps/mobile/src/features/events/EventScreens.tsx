import { EventExploreScreen } from './EventExploreScreen';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../providers';
import { Button, Label, Notice, Row } from '../../design-system/ui';
import { events } from '../../services/fixtures';
import { EventCalendarScreen } from './EventCalendarScreen';
import { EventCard, EventCover, EventMissing, EventPage, EventSummary } from './EventParts';
import { SavedEventsScreen } from './SavedEventScreens';
import { EventDetailDesignScreen, eventDetailFrame } from './EventDetailDesignScreen';
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

export { EventCalendarScreen } from './EventCalendarScreen';

export function EventDetailScreen() {
  const { id, preview, interested } = useLocalSearchParams<{
    id: string;
    preview?: string;
    interested?: string;
  }>();
  const event = events.find((item) => item.id === id);
  const { colors, saved, toggleSaved, eventPlanning } = useApp();
  const registration = id ? eventPlanning.registrations[id] : undefined;
  if (event && eventDetailFrame(event.id))
    return (
      <EventDetailDesignScreen
        key={`${event.id}-${preview}-${interested}`}
        event={event}
        sample={preview === '1'}
        initiallyInterested={interested === '1'}
      />
    );
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
