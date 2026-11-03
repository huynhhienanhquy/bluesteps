import { useState } from 'react';
import { Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Artwork, DesignLink } from '../../design-system/DesignScreen';
import { eventArtwork } from '../../design-system/catalog-artwork';
import { eventDetailArtwork as a } from '../../design-system/event-flow-artwork';
import { Button, Icon, Label, Typography } from '../../design-system/ui';
import { useApp } from '../../providers';
import type { Schemas } from '../../services/api';
import { eventTimeRange } from './event-time';
import { usePages, useResource } from '../../services/queries';
import { CommandError, More, QueryState } from './common';
import { CurvedNavigation, MediaSlot } from './DesignParts';
import { hasCatalogMedia } from '../../design-system/catalog-media';
import { useEventRegistration } from './useEventRegistration';
import { useEventPhase } from './useEventPhase';
import { useSavedEvent } from './useSavedEvent';
import { EventSavedConfirmation } from './EventSavedConfirmation';

export function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useApp();
  return <EventDetail key={`${user?.id ?? 'guest'}:${id}`} id={id} />;
}
function EventDetail({ id }: { id: string }) {
  const event = useResource<Schemas['GreenEvent']>(`/v1/events/${id}`);
  const favorite = useSavedEvent(id);
  const saved = favorite.query;
  const related = usePages<Schemas['GreenEvent']>('/v1/events');
  const checkInAccess = useResource<{ allowed: boolean }>(`/v1/events/${id}/check-in-access`, true);
  const { colors, status } = useApp();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [photo, setPhoto] = useState(0);
  const [savedNotice, setSavedNotice] = useState(false);
  const registration = useEventRegistration(id);
  const item = event.data;
  const { started, ended } = useEventPhase(item);
  const registered = registration.data?.status === 'registered';
  const canSummarize = registered && !!registration.data?.checkedInAt && ended;
  const registrationBusy = status === 'authenticated' && registration.isPending;
  const registrationFailed = status === 'authenticated' && registration.isError;
  const joinDisabled =
    !registered &&
    (started || (item?.available ?? 0) < 1 || registrationBusy || registrationFailed);
  const joinLabel = registered
    ? canSummarize
      ? 'Xem tổng kết hoạt động'
      : 'Xem vé tham gia'
    : registrationBusy
      ? 'Đang kiểm tra đăng ký…'
      : ended
        ? 'Hoạt động đã kết thúc'
        : started
          ? 'Hoạt động đã bắt đầu'
          : (item?.available ?? 0) < 1
            ? 'Đã hết chỗ đăng ký'
            : 'Đăng ký tham gia';
  const details = item?.details;
  const images = [
    ...new Set(
      [details?.imageUrl, ...(Array.isArray(details?.gallery) ? details.gallery : [])].filter(
        (value): value is string =>
          typeof value === 'string' && (/^https?:\/\//.test(value) || hasCatalogMedia(value)),
      ),
    ),
  ];
  const others =
    related.data?.pages.flatMap((page) => page.items).filter((other) => other.id !== id) ?? [];
  const duration = item
    ? Math.round((new Date(item.endsAt).getTime() - new Date(item.startsAt).getTime()) / 60000)
    : null;
  const minAge = typeof details?.minAge === 'number' ? details.minAge : null;
  const maxAge = typeof details?.maxAge === 'number' ? details.maxAge : null;
  const save = () => {
    void favorite.toggle().then((result) => {
      if (result === 'saved') setSavedNotice(true);
    });
  };
  const saveLabel = saved.data?.saved ? 'Bỏ lưu hoạt động' : 'Lưu hoạt động';
  return (
    <Typography.Provider value="inter">
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}
        >
          <View pointerEvents="none" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            <Artwork
              source={a.blueGlow}
              width={660}
              height={664}
              style={{ position: 'absolute', left: width - 234, top: 166 }}
            />
            <Artwork
              source={a.blueGlow}
              width={660}
              height={664}
              style={{ position: 'absolute', left: -379, top: 605 }}
            />
            <Artwork
              source={a.pinkGlow}
              width={660}
              height={664}
              style={{ position: 'absolute', left: -107, top: 608 }}
            />
          </View>
          <View
            style={{
              height: 390,
              borderBottomLeftRadius: 35,
              borderBottomRightRadius: 35,
              overflow: 'hidden',
              backgroundColor: colors.soft,
            }}
          >
            <MediaSlot
              uri={images[photo] ?? images[0]}
              icon="leaf-outline"
              style={{ position: 'absolute', inset: 0 }}
            />
            <View
              style={{
                height: Platform.OS === 'web' ? 37 : insets.top,
                backgroundColor: '#FFFFFFB3',
              }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/events'))}
              style={{
                position: 'absolute',
                top: (Platform.OS === 'web' ? 37 : insets.top) + 2,
                left: 18,
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#FFFFFFB3',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Artwork source={eventArtwork.back} width={24} />
            </Pressable>
            {images.length > 1 ? (
              <View style={{ position: 'absolute', left: 31, top: 81, gap: 12 }}>
                {images.slice(0, 3).map((uri, index) => (
                  <Pressable
                    key={uri}
                    accessibilityRole="button"
                    accessibilityLabel={`Xem ảnh hoạt động ${index + 1}`}
                    accessibilityState={{ selected: photo === index }}
                    onPress={() => setPhoto(index)}
                    style={{
                      borderWidth: 4,
                      borderColor: photo === index ? '#FFFFFF' : '#FFFFFFAA',
                      borderRadius: 15,
                      overflow: 'hidden',
                    }}
                  >
                    <MediaSlot uri={uri} style={{ width: 52, height: 52 }} />
                  </Pressable>
                ))}
                {images.length > 3 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Xem ảnh hoạt động tiếp theo"
                    onPress={() => setPhoto((value) => (value + 1) % images.length)}
                    style={{ borderRadius: 15, padding: 12, backgroundColor: '#FFFFFFBB' }}
                  >
                    <Label family="inter" size={12}>
                      +{images.length - 3} ảnh
                    </Label>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={saved.data?.saved ? 'Bỏ lưu yêu thích' : 'Lưu yêu thích'}
              accessibilityState={{
                disabled: favorite.disabled,
                busy: favorite.pending,
              }}
              disabled={favorite.disabled}
              onPress={save}
              style={{
                position: 'absolute',
                right: 16,
                bottom: 17,
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#FFFFFFDB',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {saved.data?.saved ? (
                <Artwork source={a.heart} width={24} />
              ) : (
                <Icon name="heart-outline" size={24} color="#EF5653" />
              )}
            </Pressable>
          </View>
          <View style={{ paddingHorizontal: 22, paddingTop: 10 }}>
            <QueryState query={event}>
              {item ? (
                <>
                  <View style={{ paddingHorizontal: 6 }}>
                    <Label
                      family="inknut"
                      size={22}
                      bold
                      heading
                      color="#1A3F76"
                      style={{ lineHeight: 46 }}
                    >
                      {item.title.toLocaleUpperCase('vi')}
                    </Label>
                    <View
                      style={{
                        flexDirection: 'row',
                        gap: 8,
                        alignItems: 'flex-start',
                        marginTop: 4,
                      }}
                    >
                      <Artwork source={a.location} width={16} height={23} />
                      <Label
                        family="inter"
                        size={15}
                        color="#2D528B"
                        style={{ flex: 1, lineHeight: 22 }}
                      >
                        {item.location}
                      </Label>
                    </View>
                  </View>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      justifyContent: 'space-between',
                      marginTop: 20,
                      paddingHorizontal: 13,
                    }}
                  >
                    <View
                      style={{
                        minHeight: 40,
                        paddingHorizontal: 13,
                        borderRadius: 20,
                        backgroundColor: colors.soft,
                        justifyContent: 'center',
                      }}
                    >
                      <Label family="inter" size={12} bold color="#326C8B">
                        {item.reservedCount} người đã đăng ký
                      </Label>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={saveLabel}
                      onPress={save}
                      accessibilityState={{ disabled: favorite.disabled, busy: favorite.pending }}
                      disabled={favorite.disabled}
                      style={{
                        minHeight: 35,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: '#7DAFCA',
                        backgroundColor: colors.surface,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        boxShadow: '0px 4px 4px rgba(0,0,0,0.25)',
                      }}
                    >
                      <Label family="inter" size={12} bold style={{ lineHeight: 17 }}>
                        {saved.data?.saved ? 'Đã quan tâm' : 'Quan tâm'}
                      </Label>
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 26 }}>
                    {[
                      {
                        source: a.participants,
                        value: `${item.available}/${item.capacity}`,
                        label: 'chỗ còn lại',
                      },
                      {
                        source: a.age,
                        value:
                          minAge === null
                            ? 'Chưa rõ'
                            : maxAge === null
                              ? `${minAge}+`
                              : `${minAge}–${maxAge}`,
                        label: 'độ tuổi',
                      },
                      { source: a.duration, value: `${duration ?? '—'}`, label: 'phút' },
                    ].map((stat) => (
                      <View
                        key={stat.label}
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 }}
                      >
                        <View style={{ width: 48, height: 48 }}>
                          <Artwork source={stat.source} width={48} height={48} />
                          {stat.source === a.participants ? (
                            <Artwork
                              source={a.group}
                              width={20}
                              height={20.153}
                              style={{ position: 'absolute', left: 14, top: 9 }}
                            />
                          ) : stat.source === a.duration ? (
                            <Artwork
                              source={a.clock}
                              width={25}
                              style={{ position: 'absolute', left: 12, top: 9 }}
                            />
                          ) : null}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Label family="inter" size={12} bold style={{ lineHeight: 16 }}>
                            {stat.value}
                          </Label>
                          <Label family="inter" size={12} style={{ lineHeight: 16 }}>
                            {stat.label}
                          </Label>
                        </View>
                      </View>
                    ))}
                  </View>
                  <View style={{ gap: 12, marginTop: 12 }}>
                    {checkInAccess.data?.allowed ? (
                      <DesignLink
                        onPress={() => router.push({ pathname: '/event-check-in', params: { id } })}
                      >
                        Check-in người tham gia
                      </DesignLink>
                    ) : null}
                    {[
                      { title: 'Khám phá tất cả', path: '/events' },
                      { title: 'Lịch hoạt động', path: '/calendar' },
                      { title: joinLabel, path: '/registration' },
                    ].map((action, index) => (
                      <Pressable
                        key={action.path}
                        accessibilityRole="button"
                        accessibilityLabel={action.title}
                        accessibilityState={{
                          disabled: index === 2 && joinDisabled,
                          busy: index === 2 && registrationBusy,
                        }}
                        disabled={index === 2 && joinDisabled}
                        onPress={() =>
                          action.path === '/registration'
                            ? router.push({
                                pathname: registered
                                  ? canSummarize
                                    ? '/event-summary'
                                    : '/event-ticket'
                                  : '/registration',
                                params: { id },
                              })
                            : router.push(action.path as '/events' | '/calendar')
                        }
                        style={{
                          minHeight: 44,
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          borderRadius: 14,
                          borderWidth: index === 2 ? 0 : 1,
                          borderColor: '#DEEBF3',
                          backgroundColor: index === 2 ? colors.brand : colors.surface,
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: index === 2 && joinDisabled ? 0.5 : 1,
                        }}
                      >
                        <Label
                          family="inter"
                          size={15}
                          weight="semibold"
                          color={index === 2 ? colors.heroText : '#172B3D'}
                          style={{ lineHeight: 20 }}
                        >
                          {action.title}
                        </Label>
                      </Pressable>
                    ))}
                    {registrationFailed ? (
                      <>
                        <CommandError error={registration.error} />
                        <Button
                          title="Tải lại trạng thái đăng ký"
                          variant="quiet"
                          onPress={() => void registration.refetch()}
                        />
                      </>
                    ) : null}
                  </View>
                  <CommandError error={favorite.error} />
                  {saved.isError && status === 'authenticated' ? (
                    <DesignLink onPress={() => void saved.refetch()}>
                      Tải lại trạng thái lưu
                    </DesignLink>
                  ) : null}
                  <View style={{ marginTop: 44, paddingHorizontal: 7, gap: 6 }}>
                    <Label family="inter" size={15} bold heading style={{ lineHeight: 21 }}>
                      {typeof details?.introductionTitle === 'string'
                        ? details.introductionTitle
                        : 'Về hoạt động'}
                    </Label>
                    <Label family="inter" size={12} style={{ lineHeight: 17 }}>
                      {item.description}
                    </Label>
                    <Label
                      family="inter"
                      size={12}
                      color={colors.muted}
                      style={{ lineHeight: 18, marginTop: 6 }}
                    >
                      {eventTimeRange(item)} · {item.timezone}
                    </Label>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
                    <Label family="inter" size={20} bold heading style={{ flex: 1 }}>
                      Hoạt động khác
                    </Label>
                    <DesignLink onPress={() => router.push('/events')}>Tất cả</DesignLink>
                  </View>
                  <QueryState
                    query={related}
                    empty={!others.length}
                    emptyText="Chưa có hoạt động khác"
                  >
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 20, paddingBottom: 8, paddingTop: 8 }}
                    >
                      {others.map((other) => (
                        <Pressable
                          key={other.id}
                          accessibilityRole="button"
                          accessibilityLabel={other.title}
                          onPress={() => {
                            setPhoto(0);
                            router.push({ pathname: '/events/[id]', params: { id: other.id } });
                          }}
                          style={{
                            width: Math.min(135, width * 0.36),
                            minHeight: 201,
                            borderRadius: 15,
                            backgroundColor: colors.surface,
                            boxShadow: '0px 4px 4px rgba(0,0,0,0.25)',
                            overflow: 'hidden',
                          }}
                        >
                          <MediaSlot
                            uri={
                              typeof other.details.imageUrl === 'string'
                                ? other.details.imageUrl
                                : undefined
                            }
                            style={{ height: 122 }}
                          />
                          <View style={{ padding: 8, gap: 5 }}>
                            <Label
                              family="inter"
                              size={10}
                              weight="semibold"
                              color="#2D528B"
                              style={{ lineHeight: 15 }}
                            >
                              {other.title}
                            </Label>
                            <Label
                              family="inter"
                              size={9}
                              color="#2D528B"
                              style={{ lineHeight: 13 }}
                            >
                              {other.location}
                            </Label>
                          </View>
                        </Pressable>
                      ))}
                    </ScrollView>
                    <More query={related} />
                  </QueryState>
                </>
              ) : null}
            </QueryState>
          </View>
        </ScrollView>
        <CurvedNavigation selected="home" variant="event-detail" />
        <EventSavedConfirmation visible={savedNotice} close={() => setSavedNotice(false)} />
      </View>
    </Typography.Provider>
  );
}
