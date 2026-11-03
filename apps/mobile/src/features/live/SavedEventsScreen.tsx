import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Artwork } from '../../design-system/DesignScreen';
import { Button, Chip, Label, Typography } from '../../design-system/ui';
import { useApp } from '../../providers';
import type { Schemas } from '../../services/api';
import { useCommand, usePages, useResource } from '../../services/queries';
import { CommandError, More, QueryState, RequireAuth } from './common';
import { CatalogHeader, CurvedNavigation, MediaSlot } from './DesignParts';
import { isCalendarDate } from './calendar-model';

const art = {
  folder: require('../../../assets/figma/386-18069/imgFolder.svg'),
  bell: require('../../../assets/figma/386-18069/imgBell.svg'),
  pin: require('../../../assets/figma/386-18069/imgMapPin.svg'),
  pink:
    Platform.OS === 'web'
      ? require('../../../assets/figma/386-18069/imgEllipse78.svg')
      : require('../../../assets/figma/386-18069/imgEllipse78.native.png'),
  blue:
    Platform.OS === 'web'
      ? require('../../../assets/figma/386-18069/imgEllipse79.svg')
      : require('../../../assets/figma/386-18069/imgEllipse79.native.png'),
  removed: require('../../../assets/figma/386-10131/imgTwemojiCrossMark.svg'),
};

export function SavedEventsScreen() {
  const { user } = useApp();
  return <SavedEvents key={user?.id ?? 'guest'} />;
}

function SavedEvents() {
  const { colors, dark, status } = useApp();
  const insets = useSafeAreaInsets();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const selectedDate = isCalendarDate(date) ? date : null;
  const preferences = useResource<Schemas['Preferences']>('/v1/me/preferences', true);
  const timezone = preferences.data?.timezone ?? 'Asia/Ho_Chi_Minh';
  const filter = new URLSearchParams({ timezone });
  if (selectedDate) filter.set('on_date', selectedDate);
  const query = usePages<Schemas['GreenEvent']>(`/v1/me/saved-events?${filter}`, true);
  const items = [
    ...new Map(
      (query.data?.pages.flatMap((page) => page.items) ?? []).map((event) => [event.id, event]),
    ).values(),
  ];
  const [refreshing, setRefreshing] = useState(false);
  const [removed, setRemoved] = useState(0);
  const [navigationHeight, setNavigationHeight] = useState(116);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      if (status === 'authenticated') void refetch();
    }, [refetch, status]),
  );
  useEffect(() => {
    if (!removed) return;
    const timer = setTimeout(() => setRemoved(0), 3500);
    return () => clearTimeout(timer);
  }, [removed]);
  return (
    <Typography.Provider value="inter">
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        {!dark ? (
          <View pointerEvents="none" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            <Artwork
              source={art.pink}
              width={518}
              height={518}
              style={{ position: 'absolute', left: -213, top: -142 }}
            />
            <Artwork
              source={art.blue}
              width={518}
              height={518}
              style={{ position: 'absolute', left: -51, top: 4 }}
            />
          </View>
        ) : null}
        <View style={{ height: Platform.OS === 'web' ? 49 : insets.top }} />
        <View style={{ paddingHorizontal: 16 }}>
          <CatalogHeader
            title="Hoạt động yêu thích"
            titleColor={dark ? colors.text : '#172B3D'}
            centered
            action={<View style={{ width: 24 }} />}
          />
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                if (status !== 'authenticated') return;
                setRefreshing(true);
                void query.refetch().finally(() => {
                  if (alive.current) setRefreshing(false);
                });
              }}
            />
          }
          contentContainerStyle={{
            paddingHorizontal: 21,
            paddingTop: 23,
            paddingBottom: 24,
            gap: 16,
          }}
        >
          <RequireAuth>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {[
                {
                  title: 'Bộ sưu tập',
                  icon: art.folder,
                  primary: true,
                  open: () => router.push('/event-collections'),
                },
                {
                  title: 'Nhắc lịch',
                  icon: art.bell,
                  primary: false,
                  open: () =>
                    router.push({
                      pathname: '/event-reminders',
                      params: {
                        from: 'saved',
                        ...(selectedDate ? { savedDate: selectedDate } : {}),
                      },
                    }),
                },
              ].map((item) => (
                <Pressable
                  key={item.title}
                  accessibilityRole="button"
                  onPress={item.open}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    borderRadius: 22,
                    borderWidth: 1,
                    borderColor: item.primary ? colors.brand : dark ? colors.border : '#DEEBF3',
                    backgroundColor: item.primary ? colors.soft : colors.surface,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Artwork source={item.icon} width={16} height={16} />
                  <Label
                    size={14}
                    weight="semibold"
                    color={item.primary ? colors.brand : dark ? colors.muted : '#677C8C'}
                    style={{ lineHeight: 18 }}
                  >
                    {item.title}
                  </Label>
                </Pressable>
              ))}
            </View>
            {selectedDate ? (
              <Chip
                label={`Ngày ${Number(selectedDate.slice(8))}/${Number(selectedDate.slice(5, 7))} · Xóa lọc`}
                selected
                onPress={() => router.setParams({ date: undefined })}
              />
            ) : null}
            <QueryState
              query={query}
              empty={!items.length}
              emptyText={
                selectedDate
                  ? 'Chưa có hoạt động đã lưu trong ngày này'
                  : 'Chưa có hoạt động yêu thích'
              }
            >
              <View style={{ gap: 12 }}>
                {items.map((event) => (
                  <SavedEventRow
                    key={event.id}
                    event={event}
                    onRemoved={() => {
                      if (alive.current) setRemoved((value) => value + 1);
                    }}
                  />
                ))}
              </View>
              <More query={query} />
            </QueryState>
            {!query.isPending && !query.isError && !items.length ? (
              <Button
                title="Khám phá hoạt động"
                variant="secondary"
                onPress={() => router.push('/events')}
              />
            ) : null}
          </RequireAuth>
        </ScrollView>
        {removed ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hoạt động yêu thích đã xóa. Đóng thông báo"
            accessibilityLiveRegion="polite"
            onPress={() => setRemoved(0)}
            style={{
              position: 'absolute',
              bottom: navigationHeight + 8,
              alignSelf: 'center',
              width: '90%',
              maxWidth: 359,
              minHeight: 95,
              borderRadius: 40,
              overflow: 'hidden',
              zIndex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 32,
              gap: 9,
              backgroundColor: '#FFFFFF',
            }}
          >
            <Svg
              width="100%"
              height="100%"
              viewBox="0 0 359 95"
              preserveAspectRatio="none"
              style={{ position: 'absolute', inset: 0 }}
            >
              <Defs>
                <LinearGradient
                  id="removedEvent"
                  gradientUnits="userSpaceOnUse"
                  x1={30}
                  y1={-47}
                  x2={329}
                  y2={142}
                >
                  <Stop offset="26%" stopColor="#EE2020" stopOpacity={0.6} />
                  <Stop offset="72.639%" stopColor="#F57C7C" stopOpacity={0.764} />
                  <Stop offset="88.81%" stopColor="#F47676" stopOpacity={0.754} />
                  <Stop offset="100%" stopColor="#F58585" stopOpacity={0.7814} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#removedEvent)" />
            </Svg>
            <Artwork source={art.removed} width={18} height={18} />
            <Label size={18} bold color="#000000" style={{ flexShrink: 1, lineHeight: 22 }}>
              Hoạt động yêu thích đã xóa
            </Label>
          </Pressable>
        ) : null}
        <View onLayout={(event) => setNavigationHeight(event.nativeEvent.layout.height)}>
          <CurvedNavigation selected="home" variant="saved-events" />
        </View>
      </View>
    </Typography.Provider>
  );
}

function SavedEventRow({
  event,
  onRemoved,
}: {
  event: Schemas['GreenEvent'];
  onRemoved: () => void;
}) {
  const { colors, dark } = useApp();
  const command = useCommand();
  const working = useRef(false);
  return (
    <View style={{ gap: 8 }}>
      <View
        style={{
          backgroundColor: dark ? colors.soft : '#F8FBFF',
          borderRadius: 16,
          padding: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Xem ${event.title}`}
          onPress={() => router.push({ pathname: '/events/[id]', params: { id: event.id } })}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 20 }}
        >
          <MediaSlot
            uri={typeof event.details.imageUrl === 'string' ? event.details.imageUrl : undefined}
            icon="calendar-outline"
            style={{ width: 70, height: 70, borderRadius: 10 }}
          />
          <View style={{ flex: 1, gap: 4 }}>
            <Label size={16} bold color={dark ? colors.text : '#1A3F76'} style={{ lineHeight: 20 }}>
              {event.title}
            </Label>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Artwork source={art.pin} width={14} height={14} />
              <Label
                size={12}
                color={dark ? colors.muted : '#2D528B'}
                style={{ flex: 1, lineHeight: 15 }}
              >
                {event.location}
              </Label>
            </View>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Xóa ${event.title} khỏi hoạt động yêu thích`}
          accessibilityState={{ disabled: command.isPending, busy: command.isPending }}
          disabled={command.isPending}
          onPress={() => {
            if (working.current) return;
            working.current = true;
            void command
              .mutateAsync({ path: `/v1/me/saved-events/${event.id}`, method: 'DELETE' })
              .then(onRemoved)
              .catch(() => {})
              .finally(() => {
                working.current = false;
              });
          }}
          style={{ width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <View
            style={{
              width: 44,
              height: 24,
              borderRadius: 10,
              backgroundColor: '#E90404',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0px 0px 10px rgba(240,47,47,0.25)',
            }}
          >
            {command.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Label size={10} weight="semibold" color="#FFFFFF" style={{ lineHeight: 12 }}>
                Xóa
              </Label>
            )}
          </View>
        </Pressable>
      </View>
      <CommandError error={command.error} />
    </View>
  );
}
