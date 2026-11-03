import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusSpace } from '../../design-system/DesignScreen';
import { Button, Icon, Label, Typography } from '../../design-system/ui';
import { useApp } from '../../providers';
import { ApiError, type Schemas } from '../../services/api';
import { useCommand, useResource } from '../../services/queries';
import { CommandError, QueryState } from './common';
import { CurvedNavigation, MediaSlot } from './DesignParts';
import { eventTimeRange } from './event-time';
import { isCalendarDate } from './calendar-model';
import { PrivateModal } from './PrivateModal';
import { useEventPhase } from './useEventPhase';

export function NewsEventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useApp();
  return <NewsEventDetail key={`${user?.id ?? 'guest'}:${id}`} id={id} />;
}

function NewsEventDetail({ id }: { id: string }) {
  const { colors, dark, status } = useApp();
  const insets = useSafeAreaInsets();
  const { month } = useLocalSearchParams<{ month?: string }>();
  const returnMonth = month && isCalendarDate(month + '-01') ? month : undefined;
  const event = useResource<Schemas['GreenEvent']>(`/v1/events/${id}`);
  const engagement = useResource<{ saved: boolean; collectionId: string | null }>(
    `/v1/events/${id}/engagement`,
    true,
  );
  const command = useCommand();
  const working = useRef(false);
  const [confirmingSave, setConfirmingSave] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const { refetch } = engagement;
  useFocusEffect(
    useCallback(() => {
      if (status === 'authenticated') void refetch();
    }, [refetch, status]),
  );
  const item = event.data;
  const { ended } = useEventPhase(item);
  const background = dark ? colors.background : '#F0F9FF';
  const pending = command.isPending || confirmingSave;
  const disabled =
    pending || status === 'loading' || (status === 'authenticated' && !engagement.data);
  const interested = engagement.data?.saved ?? false;
  const schedule = Array.isArray(item?.details.schedule)
    ? item.details.schedule.filter(
        (entry): entry is { time: string; title: string } =>
          !!entry &&
          typeof entry === 'object' &&
          'time' in entry &&
          typeof entry.time === 'string' &&
          'title' in entry &&
          typeof entry.title === 'string',
      )
    : [];
  async function saveInterest(remove = false) {
    if (working.current || disabled) return;
    if (status !== 'authenticated') {
      router.push({
        pathname: '/login',
        params: {
          returnTo: `/articles/events/${encodeURIComponent(id)}${returnMonth ? '?month=' + returnMonth : ''}`,
        },
      });
      return;
    }
    if (!remove && interested) {
      setConfirmed(true);
      return;
    }
    working.current = true;
    try {
      await command.mutateAsync({
        path: `/v1/me/saved-events/${id}`,
        method: remove ? 'DELETE' : 'PUT',
        body: remove ? undefined : {},
      });
      if (!remove) setConfirmed(true);
    } catch (cause) {
      if (!(cause instanceof ApiError) || cause.status === 0 || cause.status >= 500) {
        setConfirmingSave(true);
        const result = await refetch();
        if (result.isSuccess && result.data.saved === !remove) {
          command.reset();
          if (!remove) setConfirmed(true);
        }
      }
    } finally {
      working.current = false;
      setConfirmingSave(false);
    }
  }
  return (
    <Typography.Provider value="inter">
      <View style={{ flex: 1, backgroundColor: background }}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ height: 300 }}>
            <MediaSlot
              code={item?.code}
              uri={typeof item?.details.imageUrl === 'string' ? item.details.imageUrl : undefined}
              icon="calendar-outline"
              style={{ position: 'absolute', inset: 0 }}
            />
            <View style={{ height: 115, backgroundColor: '#0D212B61' }}>
              <StatusSpace />
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingHorizontal: 25,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Quay lại lịch sự kiện"
                  onPress={() =>
                    router.canGoBack()
                      ? router.back()
                      : router.replace({
                          pathname: '/articles/calendar',
                          params: { month: returnMonth },
                        })
                  }
                  hitSlop={5}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Label size={18} weight="semibold">
                    ‹
                  </Label>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={interested ? 'Bỏ quan tâm sự kiện' : 'Quan tâm sự kiện'}
                  accessibilityState={{ selected: interested, disabled }}
                  disabled={disabled}
                  onPress={() => void saveInterest(interested)}
                  hitSlop={5}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={interested ? 'heart' : 'heart-outline'} size={21} color="#ED4F47" />
                </Pressable>
              </View>
            </View>
          </View>
          <View
            style={{
              marginTop: -34,
              borderRadius: 22,
              backgroundColor: background,
              padding: 28,
              gap: 18,
            }}
          >
            <QueryState query={event}>
              {item ? (
                <>
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      backgroundColor: '#147CC1',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 12,
                    }}
                  >
                    <Label size={10} bold color="#FFFFFF">
                      SỰ KIỆN XANH
                    </Label>
                  </View>
                  <Label size={21} bold heading style={{ lineHeight: 27 }}>
                    {item.title}
                  </Label>
                  {typeof item.details.summary === 'string' ? (
                    <Label size={12} color={colors.muted} style={{ lineHeight: 18 }}>
                      {item.details.summary}
                    </Label>
                  ) : null}
                  <View
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 15,
                      padding: 15,
                      gap: 16,
                    }}
                  >
                    <Label size={13} weight="semibold">
                      ◷ {eventTimeRange(item)}
                    </Label>
                    <View style={{ height: 1, backgroundColor: colors.border }} />
                    <Label size={13} weight="semibold">
                      ⌖ {item.location}
                    </Label>
                  </View>
                  <Label size={18} bold heading>
                    Về hoạt động
                  </Label>
                  <Label size={12} style={{ lineHeight: 17 }}>
                    {item.description}
                  </Label>
                  <Label size={18} bold heading>
                    Lịch trình ngắn
                  </Label>
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      backgroundColor: colors.surface,
                      borderRadius: 12,
                      padding: 8,
                      gap: 8,
                    }}
                  >
                    {(schedule.length
                      ? schedule
                      : [
                          {
                            time: new Date(item.startsAt).toLocaleTimeString('vi-VN', {
                              timeZone: item.timezone,
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            }),
                            title: 'Bắt đầu',
                          },
                          {
                            time: new Date(item.endsAt).toLocaleTimeString('vi-VN', {
                              timeZone: item.timezone,
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            }),
                            title: 'Kết thúc',
                          },
                        ]
                    ).map((entry, index) => (
                      <View key={index} style={{ minWidth: 92, flex: 1, gap: 2 }}>
                        <Label size={11} bold color={colors.brand}>
                          {entry.time}
                        </Label>
                        <Label size={10} color={colors.muted}>
                          {entry.title}
                        </Label>
                      </View>
                    ))}
                  </View>
                  <Button
                    title={
                      ended
                        ? 'Sự kiện đã kết thúc'
                        : interested
                          ? 'Đã quan tâm sự kiện'
                          : 'Tham gia sự kiện →'
                    }
                    pending={pending}
                    disabled={disabled || ended}
                    onPress={() => void saveInterest()}
                  />
                  <Button
                    title="Xem đăng ký và vé tham gia"
                    variant="quiet"
                    onPress={() => router.push({ pathname: '/events/[id]', params: { id } })}
                  />
                  <CommandError
                    error={command.error ?? (status === 'authenticated' ? engagement.error : null)}
                  />
                  {engagement.isError ? (
                    <Button
                      title="Tải lại trạng thái quan tâm"
                      variant="quiet"
                      onPress={() => void refetch()}
                    />
                  ) : null}
                </>
              ) : null}
            </QueryState>
          </View>
        </ScrollView>
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <CurvedNavigation variant="news" />
        </View>
      </View>
      <PrivateModal
        visible={confirmed}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmed(false)}
      >
        <View
          style={{
            flex: 1,
            padding: 24,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0F172A55',
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 340,
              borderRadius: 22,
              padding: 24,
              backgroundColor: colors.surface,
              alignItems: 'center',
              gap: 16,
            }}
          >
            <View
              style={{
                width: 68,
                height: 68,
                borderRadius: 34,
                backgroundColor: '#F0F9FF',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Label size={34} bold color="#147CC1">
                ✓
              </Label>
            </View>
            <Label size={19} bold heading style={{ textAlign: 'center' }}>
              Đã ghi nhận sự quan tâm
            </Label>
            <Label size={12} color={colors.muted} style={{ textAlign: 'center', lineHeight: 18 }}>
              Thông tin sự kiện đã được thêm vào lịch quan tâm của bạn.
            </Label>
            <View style={{ alignSelf: 'stretch' }}>
              <Button title="Xong" onPress={() => setConfirmed(false)} />
            </View>
          </View>
        </View>
      </PrivateModal>
    </Typography.Provider>
  );
}
