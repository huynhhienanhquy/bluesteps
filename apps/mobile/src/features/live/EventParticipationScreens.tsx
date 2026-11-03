import { useCallback, useRef, useState } from 'react';
import { Image, Linking, Pressable, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Artwork } from '../../design-system/DesignScreen';
import {
  eventTicketArtwork as ticket,
  eventSummaryArtwork as summary,
} from '../../design-system/event-flow-artwork';
import { Button, Chip, MenuItem, Notice } from '../../design-system/ui';
import { useApp } from '../../providers';
import { ApiError, errorMessage, type Schemas } from '../../services/api';
import { saveTicket } from '../../services/save-ticket';
import { useCommand, useResource } from '../../services/queries';
import { CommandError, QueryState, RequireAuth } from './common';
import { MediaSlot } from './DesignParts';
import {
  EventFlowButton,
  EventFlowHeading,
  EventFlowPage,
  EventFlowText as Text,
  eventFlowStyles as s,
} from './EventFlowParts';
import { eventTimeRange } from './event-time';
import { useOptionalLocalProfile } from './LocalProfileProvider';
import { useEventPhase } from './useEventPhase';

type RegisteredEvent = Schemas['EventRegistration'] & {
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
};
function ParticipationList({ destination }: { destination: '/event-ticket' | '/event-summary' }) {
  const { status } = useApp();
  const query = useResource<{ items: RegisteredEvent[] }>('/v1/me/event-registrations', true);
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      if (status === 'authenticated') void refetch();
    }, [refetch, status]),
  );
  const now = Date.now();
  const registered = query.data?.items.filter((item) => item.status === 'registered') ?? [];
  const attended = registered.filter((item) => item.checkedInAt);
  const nextToEnd =
    destination === '/event-summary'
      ? attended
          .filter((item) => Date.parse(item.endsAt) > now)
          .sort((a, b) => Date.parse(a.endsAt) - Date.parse(b.endsAt))[0]
      : undefined;
  useEventPhase(nextToEnd);
  const items =
    destination === '/event-ticket'
      ? registered
      : attended.filter((item) => Date.parse(item.endsAt) <= now);
  return (
    <QueryState
      query={query}
      empty={!items.length}
      emptyText={
        destination === '/event-ticket'
          ? 'Bạn chưa có vé tham gia'
          : 'Chưa có hoạt động đã kết thúc mà bạn đã check-in'
      }
    >
      {items.map((item) => (
        <MenuItem
          key={item.id}
          title={item.title}
          detail={`${item.location} · ${new Date(item.startsAt).toLocaleString('vi-VN')}`}
          icon={destination === '/event-ticket' ? 'ticket-outline' : 'leaf-outline'}
          onPress={() => router.push({ pathname: destination, params: { id: item.eventId } })}
        />
      ))}
    </QueryState>
  );
}

export function TicketScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useApp();
  return id ? (
    <TicketDetail key={`${user?.id}:${id}`} id={id} />
  ) : (
    <EventFlowPage title="Vé tham gia" brandHeader>
      <RequireAuth>
        <ParticipationList destination="/event-ticket" />
      </RequireAuth>
      <EventFlowButton title="Khám phá hoạt động" onPress={() => router.push('/events')} />
    </EventFlowPage>
  );
}

function TicketDetail({ id }: { id: string }) {
  const { colors, status } = useApp();
  const query = useResource<Schemas['EventTicket']>(`/v1/events/${id}/ticket`, true);
  const command = useCommand();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const savingRef = useRef(false);
  const cancellingRef = useRef(false);
  const data = query.data;
  const { started, ended } = useEventPhase(data?.event);
  const { refetch } = query;
  const refreshTicket = useCallback(async () => {
    const result = await refetch();
    if (result.data && !result.error) setCancelled(false);
  }, [refetch]);
  useFocusEffect(
    useCallback(() => {
      if (status === 'authenticated') void refreshTicket();
    }, [status, refreshTicket]),
  );
  const ticketUnavailable =
    cancelled ||
    (query.isError &&
      query.error instanceof ApiError &&
      (query.error.status === 404 || query.error.code === 'REGISTRATION_CANCELLED'));
  const phone =
    typeof data?.event.details.contactPhone === 'string' &&
    /^\+?[\d ()-]{6,24}$/.test(data.event.details.contactPhone)
      ? data.event.details.contactPhone.replace(/[ ()-]/g, '')
      : null;
  return (
    <EventFlowPage
      title="Vé tham gia"
      brandHeader
      footer={
        <>
          <EventFlowButton
            title="Lưu vé vào thiết bị"
            pending={saving}
            disabled={!data || query.isError || query.isRefetching || command.isPending || cancelled}
            onPress={() => {
              if (!data || query.isError || savingRef.current || cancellingRef.current || cancelled)
                return;
              savingRef.current = true;
              setSaving(true);
              setError('');
              void saveTicket(data.qrImage, data.ticketCode)
                .catch((cause) => setError(errorMessage(cause)))
                .finally(() => {
                  savingRef.current = false;
                  setSaving(false);
                });
            }}
          />
          <EventFlowButton
            title="Cập nhật trạng thái vé"
            tone="outline"
            pending={query.isRefetching}
            disabled={command.isPending}
            onPress={() => void refreshTicket()}
          />
          <EventFlowButton
            title="Về lịch hoạt động"
            tone="outline"
            onPress={() => router.dismissTo('/calendar')}
          />
          <EventFlowButton
            title="Cài đặt nhắc lịch"
            tone="outline"
            disabled={!data || query.isError || cancelled || ended}
            onPress={() =>
              router.push({ pathname: '/event-reminders', params: { events: id, from: 'ticket' } })
            }
          />
          {data?.registration.checkedInAt && ended && !ticketUnavailable ? (
            <EventFlowButton
              title="Xem tổng kết hoạt động"
              tone="outline"
              onPress={() => router.push({ pathname: '/event-summary', params: { id } })}
            />
          ) : null}
          <EventFlowButton
            title="Thông tin đăng ký"
            tone="quiet"
            disabled={!data || query.isError || command.isPending || cancelled}
            onPress={() => setConfirmCancel((value) => !value)}
          />
        </>
      }
    >
      <RequireAuth>
        {ticketUnavailable ? (
          <View style={{ gap: 12 }}>
            <Notice tone={cancelled ? 'success' : 'info'}>
              {cancelled
                ? 'Đã hủy đăng ký. Vé này không còn hiệu lực.'
                : 'Vé chưa được cấp hoặc đăng ký đã hủy.'}
            </Notice>
            <Button
              title="Xem đăng ký tham gia"
              onPress={() => router.replace({ pathname: '/registration', params: { id } })}
            />
          </View>
        ) : (
          <QueryState query={query}>
            {data ? (
              <>
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: '#DEEBF3',
                    borderRadius: 24,
                    overflow: 'hidden',
                    backgroundColor: colors.surface,
                    boxShadow: '0px 4px 14px rgba(15,23,42,0.08)',
                  }}
                >
                  <View style={{ backgroundColor: '#147CC1', padding: 20, gap: 14 }}>
                    <View style={s.row}>
                      <Text size={12} color="#FFFFFF" style={{ flex: 1 }}>
                        VÉ THAM GIA
                      </Text>
                      <Artwork source={ticket.leaf} width={22} />
                    </View>
                    <Text size={28} weight="bold" color="#FFFFFF" style={{ lineHeight: 35 }}>
                      {data.event.title}
                    </Text>
                    <Text color="#FFFFFF">{data.event.location}</Text>
                  </View>
                  <View style={{ alignItems: 'center', padding: 20, gap: 10 }}>
                    <Text size={20} weight="bold" style={{ lineHeight: 26, textAlign: 'center' }}>
                      {data.registration.fullName}
                    </Text>
                    <Text size={12} color="#677C8C">
                      {data.registration.attendeeCount} người • {data.registration.volunteerRole}
                    </Text>
                    <Image
                      source={{ uri: data.qrImage }}
                      accessibilityLabel={`Mã QR vé ${data.ticketCode}`}
                      style={{ width: 196, height: 196 }}
                    />
                    <Text weight="semibold" color="#147CC1">
                      {data.ticketCode}
                    </Text>
                    <Text size={12} color="#677C8C" style={{ textAlign: 'center' }}>
                      {data.registration.checkedInAt
                        ? `Đã check-in · ${new Date(data.registration.checkedInAt).toLocaleString('vi-VN')}`
                        : 'Xuất trình mã QR để ban tổ chức xác nhận check-in.'}
                    </Text>
                  </View>
                  <View
                    style={{
                      borderTopWidth: 1,
                      borderTopColor: '#DEEBF3',
                      borderStyle: 'dashed',
                      padding: 20,
                      gap: 18,
                    }}
                  >
                    <View style={s.row}>
                      <Artwork source={ticket.calendar} width={22} />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text weight="semibold" color="#147CC1">
                          {eventTimeRange(data.event)}
                        </Text>
                        <Text size={12} color="#147CC1">
                          {typeof data.event.details.arrivalTime === 'string'
                            ? data.event.details.arrivalTime
                            : 'Có mặt trước giờ bắt đầu để check-in.'}
                        </Text>
                      </View>
                    </View>
                    <View style={s.row}>
                      <Artwork source={ticket.location} width={22} />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text weight="semibold" color="#147CC1">
                          {typeof data.event.details.meetingPoint === 'string'
                            ? data.event.details.meetingPoint
                            : data.event.location}
                        </Text>
                        <Text size={12} color="#677C8C">
                          {typeof data.event.details.arrivalInstructions === 'string'
                            ? data.event.details.arrivalInstructions
                            : 'Gặp ban tổ chức tại bàn đón tiếp.'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={[s.card, s.row]}>
                  <Artwork source={ticket.message} width={22} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text weight="semibold" color="#147CC1">
                      {typeof data.event.details.organizer === 'string'
                        ? data.event.details.organizer
                        : 'Ban tổ chức hoạt động'}
                    </Text>
                    <Text size={12} color="#677C8C">
                      {phone
                        ? `Liên hệ: ${phone}`
                        : 'Xem thông tin liên hệ trong chi tiết hoạt động.'}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Gọi ban tổ chức"
                    disabled={!phone}
                    accessibilityState={{ disabled: !phone }}
                    onPress={() => {
                      if (phone)
                        void Linking.openURL(`tel:${phone}`).catch((cause) =>
                          setError(errorMessage(cause)),
                        );
                    }}
                    style={{
                      minWidth: 44,
                      minHeight: 44,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: phone ? 1 : 0.4,
                    }}
                  >
                    <Artwork source={ticket.phone} width={22} />
                  </Pressable>
                </View>
                {confirmCancel ? (
                  <View style={[s.card, { gap: 12 }]}>
                    <EventFlowHeading>Thông tin đăng ký</EventFlowHeading>
                    <Text>
                      {data.registration.email} · {data.registration.phone}
                    </Text>
                    <Text>
                      {data.registration.attendeeCount} người · {data.registration.volunteerRole}
                    </Text>
                    {!data.registration.checkedInAt && !started ? (
                      <>
                        <Notice tone="warning">
                          Hủy đăng ký sẽ vô hiệu hóa vé và trả chỗ cho người khác.
                        </Notice>
                        <Button
                          title="Xác nhận hủy đăng ký"
                          variant="danger"
                          pending={command.isPending || query.isRefetching}
                          onPress={() => {
                            if (cancellingRef.current || started) return;
                            cancellingRef.current = true;
                            void command
                              .mutateAsync({
                                path: `/v1/events/${id}/registration`,
                                method: 'DELETE',
                              })
                              .then(() => {
                                setCancelled(true);
                                setConfirmCancel(false);
                              })
                              .catch(async (failure) => {
                                if (
                                  failure instanceof ApiError &&
                                  failure.status > 0 &&
                                  failure.status < 500 &&
                                  failure.status !== 409
                                )
                                  return;
                                const result = await refetch();
                                if (
                                  result.error instanceof ApiError &&
                                  result.error.code === 'REGISTRATION_CANCELLED'
                                ) {
                                  setCancelled(true);
                                  setConfirmCancel(false);
                                }
                              })
                              .finally(() => {
                                cancellingRef.current = false;
                              });
                          }}
                        />
                      </>
                    ) : (
                      <Text>Đăng ký đã bắt đầu tham gia, không thể hủy.</Text>
                    )}
                    <Button
                      title="Đóng thông tin đăng ký"
                      variant="quiet"
                      disabled={command.isPending}
                      onPress={() => setConfirmCancel(false)}
                    />
                  </View>
                ) : null}
              </>
            ) : null}
          </QueryState>
        )}
        <CommandError error={cancelled ? null : command.error} />
        {error ? <Notice tone="error">{error}</Notice> : null}
      </RequireAuth>
    </EventFlowPage>
  );
}

export function EventSummaryScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useApp();
  return id ? (
    <SummaryDetail key={`${user?.id}:${id}`} id={id} />
  ) : (
    <EventFlowPage title="Tổng kết hoạt động">
      <RequireAuth>
        <ParticipationList destination="/event-summary" />
      </RequireAuth>
      <EventFlowButton title="Khám phá hoạt động khác" onPress={() => router.replace('/events')} />
    </EventFlowPage>
  );
}

const tagOptions = [
  { id: 'well_organized', title: 'Tổ chức tốt' },
  { id: 'learned_something', title: 'Học được điều mới' },
  { id: 'needs_materials', title: 'Cần thêm học cụ' },
] as const;
function SummaryDetail({ id }: { id: string }) {
  const { colors, user, status } = useApp();
  const profile = useOptionalLocalProfile()?.profile;
  const query = useResource<Schemas['EventSummary']>(`/v1/events/${id}/summary`, true);
  const data = query.data;
  const command = useCommand<Schemas['EventFeedback']>();
  const cache = useQueryClient();
  const working = useRef(false);
  const { refetch } = query;
  const { ended } = useEventPhase(data?.event);
  useFocusEffect(
    useCallback(() => {
      if (status === 'authenticated' && ended) void refetch();
    }, [ended, refetch, status]),
  );
  const [rating, setRating] = useState<number | null>(null);
  const [tags, setTags] = useState<Schemas['EventFeedbackRequest']['tags'] | null>(null);
  const [body, setBody] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [checkingFeedback, setCheckingFeedback] = useState(false);
  const [recoveredFeedback, setRecoveredFeedback] = useState(false);
  const submitting = command.isPending || checkingFeedback;
  const currentRating = rating ?? data?.feedback?.rating ?? 0;
  const currentTags = tags ?? data?.feedback?.tags ?? [];
  const currentBody = body ?? data?.feedback?.body ?? '';
  const feedback = data?.feedback;
  const hasChanges =
    !feedback ||
    currentRating !== feedback.rating ||
    currentBody.trim() !== feedback.body ||
    currentTags.length !== feedback.tags.length ||
    currentTags.some((tag) => !feedback.tags.includes(tag));
  const album = data?.albumUrl && /^https:\/\//i.test(data.albumUrl) ? data.albumUrl : null;
  return (
    <EventFlowPage
      title="Tổng kết hoạt động"
      footer={
        <>
          <EventFlowButton
            title={feedback ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}
            disabled={!data?.canReview || !currentRating || !hasChanges}
            pending={submitting}
            onPress={() => {
              if (working.current || !data?.canReview || !currentRating || !hasChanges) return;
              working.current = true;
              setRecoveredFeedback(false);
              void command
                .mutateAsync({
                  path: `/v1/events/${id}/feedback`,
                  method: 'PUT',
                  body: {
                    rating: currentRating,
                    tags: currentTags,
                    body: currentBody.trim(),
                  },
                })
                .then(async (saved) => {
                  const key = ['api', user?.id ?? 'guest', `/v1/events/${id}/summary`];
                  await cache.cancelQueries({ queryKey: key, exact: true });
                  cache.setQueryData<Schemas['EventSummary']>(key, (current) => {
                    if (!current) return current;
                    if (
                      current.feedback &&
                      Date.parse(current.feedback.updatedAt) > Date.parse(saved.updatedAt)
                    )
                      return current;
                    return { ...current, feedback: saved };
                  });
                  setRating(null);
                  setTags(null);
                  setBody(null);
                })
                .catch(async (failure) => {
                  if (failure instanceof ApiError && failure.status > 0 && failure.status < 500) {
                    if (failure.status === 409) void refetch();
                    return;
                  }
                  setCheckingFeedback(true);
                  try {
                    const result = await refetch();
                    const saved = result.data?.feedback;
                    if (
                      result.isSuccess &&
                      saved &&
                      saved.rating === currentRating &&
                      saved.body === currentBody.trim() &&
                      saved.tags.length === currentTags.length &&
                      currentTags.every((tag) => saved.tags.includes(tag))
                    ) {
                      setRecoveredFeedback(true);
                      setRating(null);
                      setTags(null);
                      setBody(null);
                    }
                  } finally {
                    setCheckingFeedback(false);
                  }
                })
                .finally(() => {
                  working.current = false;
                });
            }}
          />
          <EventFlowButton
            title="Về lịch hoạt động"
            tone="quiet"
            onPress={() => router.dismissTo('/calendar')}
          />
          <EventFlowButton
            title="Xem album hoạt động"
            tone="quiet"
            disabled={!album}
            onPress={() => {
              if (album)
                void Linking.openURL(album).catch((cause) => setError(errorMessage(cause)));
            }}
          />
          <EventFlowButton
            title="Khám phá hoạt động khác"
            tone="outline"
            onPress={() => router.replace('/events')}
          />
        </>
      }
    >
      <RequireAuth>
        <QueryState query={query}>
          {data ? (
            <>
              <View style={{ gap: 12 }}>
                <MediaSlot
                  code={data.event.code}
                  uri={
                    typeof data.event.details.imageUrl === 'string'
                      ? data.event.details.imageUrl
                      : undefined
                  }
                  style={{ height: 190, borderRadius: 18 }}
                />
                <Text size={24} weight="bold" color="#075A9C" heading style={{ lineHeight: 32 }}>
                  Cảm ơn bạn đã gieo mầm xanh!
                </Text>
                <Text color="#677C8C">
                  {data.event.title} • {eventTimeRange(data.event).split(' • ')[0]}
                </Text>
                <Text size={12} color="#677C8C">
                  {data.event.location}
                </Text>
              </View>
              <View style={s.section}>
                <EventFlowHeading>Cùng nhau, chúng ta đã làm được</EventFlowHeading>
                <View style={[s.card, { flexDirection: 'row', gap: 8 }]}>
                  {[
                    ['Người được hướng dẫn', data.verifiedResults.guidedParticipants],
                    ['Người đã check-in', data.checkedInCount],
                    ['Góc phân loại', data.verifiedResults.sortingStations],
                  ].map(([label, value]) => (
                    <View key={String(label)} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                      <Text size={24} weight="bold" color="#147CC1" style={{ lineHeight: 30 }}>
                        {value ?? '—'}
                      </Text>
                      <Text size={12} color="#677C8C" style={{ textAlign: 'center' }}>
                        {label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
              <View
                style={[s.card, s.row, { backgroundColor: colors.mint, alignItems: 'flex-start' }]}
              >
                <Artwork source={summary.hand} width={30} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Text size={16} weight="semibold">
                    Dấu ấn của {profile?.displayName ?? user?.displayName ?? 'bạn'}
                  </Text>
                  <Text>
                    {data.registration?.checkedInAt
                      ? `Bạn đã check-in tham gia với vai trò ${data.registration.volunteerRole}.`
                      : 'Chưa có check-in được ban tổ chức xác nhận.'}
                  </Text>
                </View>
              </View>
              <View style={s.section}>
                <EventFlowHeading>Trải nghiệm của bạn thế nào?</EventFlowHeading>
                <View
                  accessibilityRole="radiogroup"
                  style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Pressable
                      key={value}
                      accessibilityRole="radio"
                      accessibilityLabel={`${value} sao`}
                      accessibilityState={{
                        checked: currentRating === value,
                        disabled: !data.canReview || submitting,
                      }}
                      disabled={!data.canReview || submitting}
                      onPress={() => {
                        if (working.current) return;
                        command.reset();
                        setRating(value);
                      }}
                      style={{
                        minWidth: 44,
                        minHeight: 44,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Artwork
                        source={value <= currentRating ? summary.selectedStar : summary.star}
                        width={34}
                      />
                    </Pressable>
                  ))}
                </View>
                {currentRating ? (
                  <Text color="#147CC1" style={{ textAlign: 'center' }}>
                    {currentRating}/5
                  </Text>
                ) : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {tagOptions.map((item) => (
                    <Chip
                      key={item.id}
                      label={item.title}
                      selected={currentTags.includes(item.id)}
                      disabled={!data.canReview || submitting}
                      onPress={() => {
                        if (data.canReview && !working.current) {
                          command.reset();
                          setTags(
                            currentTags.includes(item.id)
                              ? currentTags.filter((value) => value !== item.id)
                              : [...currentTags, item.id],
                          );
                        }
                      }}
                    />
                  ))}
                </View>
                <Text>Chia sẻ cảm nhận</Text>
                <TextInput
                  accessibilityLabel="Chia sẻ cảm nhận"
                  editable={data.canReview && !submitting}
                  multiline
                  maxLength={2000}
                  value={currentBody}
                  onChangeText={(value) => {
                    if (working.current) return;
                    command.reset();
                    setBody(value);
                  }}
                  placeholder="Điều gì khiến bạn nhớ nhất?"
                  placeholderTextColor="#677C8C"
                  style={{
                    minHeight: 88,
                    padding: 14,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: '#DEEBF3',
                    backgroundColor: colors.mint,
                    fontFamily: 'Inter_400Regular',
                    fontSize: 14,
                    color: colors.text,
                    textAlignVertical: 'top',
                  }}
                />
                {!data.canReview ? (
                  <Notice>Bạn có thể đánh giá sau khi đã check-in và hoạt động kết thúc.</Notice>
                ) : null}
                {(command.isSuccess || recoveredFeedback) && !hasChanges ? (
                  <Notice tone="success">Đã lưu đánh giá của bạn.</Notice>
                ) : null}
              </View>
              <Text size={12} color="#677C8C">
                Số người check-in được lấy từ vé đã xác nhận. Các kết quả khác chỉ hiện khi ban tổ
                chức công bố.
              </Text>
            </>
          ) : null}
        </QueryState>
        <CommandError error={checkingFeedback || recoveredFeedback ? null : command.error} />
        {error ? <Notice tone="error">{error}</Notice> : null}
      </RequireAuth>
    </EventFlowPage>
  );
}
