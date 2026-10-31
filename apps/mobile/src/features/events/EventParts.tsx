import { type PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../../providers';
import { Artwork, DesignScreen } from '../../design-system/DesignScreen';
import { homeAssets } from '../../design-system/figma-assets';
import { eventDesignAssets } from '../../design-system/event-design-assets';
import { eventDetailAssets } from '../../design-system/event-detail-assets';
import { Button, Card, Icon, IconButton, Label, Row } from '../../design-system/ui';
import type { GreenEvent } from '../../services/fixtures';

export function EventPage({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <DesignScreen title={title} contentStyle={{ gap: 20, paddingBottom: 40 }}>
        {children}
      </DesignScreen>
    </KeyboardAvoidingView>
  );
}

export function EventCover({ event, height = 152 }: { event: GreenEvent; height?: number }) {
  const { colors } = useApp();
  const source =
    event.id === 'green-class'
      ? homeAssets.imgNhHotDng
      : event.id === 'beach'
        ? homeAssets.imgNhHotDng1
        : event.id === 'tree-day'
          ? eventDesignAssets['534:49034'].imgRectangle738
          : event.id === 'school-class'
            ? eventDetailAssets['386:9575'].imgRectangle749
            : event.id === 'garden'
              ? eventDetailAssets['386:10026'].imgRectangle749
              : undefined;
  return source ? (
    <Artwork source={source} width={380} height={height} fit="cover" style={{ width: '100%' }} />
  ) : (
    <View
      style={{
        height,
        backgroundColor: colors.soft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={event.icon} size={48} color={colors.brand} />
      <Label size={12} color={colors.muted}>
        {event.category}
      </Label>
    </View>
  );
}

export function EventCard({ event, onRemove }: { event: GreenEvent; onRemove?: () => void }) {
  const { saved, toggleSaved, colors } = useApp();
  return (
    <View style={{ flexGrow: 1, flexBasis: '46%', maxWidth: '100%', gap: 8 }}>
      <View
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 18,
          overflow: 'hidden',
          backgroundColor: colors.surface,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Xem hoạt động ${event.title}`}
          onPress={() => router.push(`/events/${event.id}`)}
        >
          <EventCover event={event} />
          <View style={{ padding: 12, gap: 8, minHeight: 98 }}>
            <Label size={14} bold color={colors.primaryDark}>
              {event.title}
            </Label>
            <Label size={11} color={colors.muted}>
              {event.area}
            </Label>
          </View>
        </Pressable>
        <View style={{ position: 'absolute', right: 6, top: 6 }}>
          <IconButton
            name={saved.includes(event.id) ? 'heart' : 'heart-outline'}
            label={`${saved.includes(event.id) ? 'Bỏ lưu' : 'Lưu'} ${event.title}`}
            selected={saved.includes(event.id)}
            onPress={() => {
              if (onRemove && saved.includes(event.id)) onRemove();
              else toggleSaved(event.id);
            }}
          />
        </View>
      </View>
      <Label size={11} color={colors.brand}>
        {event.time}
      </Label>
      <Label size={11} color={colors.muted}>
        Miễn phí · Hoạt động mẫu
      </Label>
      {onRemove ? (
        <Button title={`Xóa ${event.title}`} variant="danger" onPress={onRemove} />
      ) : null}
    </View>
  );
}

export function EventSummary({ event }: { event: GreenEvent }) {
  const { colors } = useApp();
  return (
    <Card style={{ backgroundColor: colors.soft }}>
      <Label size={11} color={colors.brand}>
        {event.category.toUpperCase()} · DEMO
      </Label>
      <Label size={18} bold>
        {event.title}
      </Label>
      <Label size={13}>{event.time}</Label>
      <Label size={12} color={colors.muted}>
        {event.area}
      </Label>
    </Card>
  );
}

export function CheckOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useApp();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: colors.brand,
          backgroundColor: selected ? colors.brand : colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? <Icon name="checkmark" size={18} color={colors.heroText} /> : null}
      </View>
      <Label size={13} style={{ flex: 1 }}>
        {label}
      </Label>
    </Pressable>
  );
}

export function EventMissing() {
  return (
    <Card>
      <Label bold>Hoạt động không tồn tại</Label>
      <Button title="Khám phá hoạt động" onPress={() => router.replace('/events')} />
    </Card>
  );
}

export function EventLinks() {
  return (
    <Row style={{ flexWrap: 'wrap' }}>
      <Button
        title="Đã lưu"
        variant="quiet"
        icon="heart-outline"
        onPress={() => router.push('/saved')}
      />
      <Button
        title="Xem lịch"
        variant="quiet"
        icon="calendar-outline"
        onPress={() => router.push('/calendar')}
      />
    </Row>
  );
}
