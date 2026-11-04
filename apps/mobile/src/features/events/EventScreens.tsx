import { useState } from 'react';
import { Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Artwork } from '../../design-system/DesignScreen';
import { eventArtwork as a } from '../../design-system/catalog-artwork';
import {
  CatalogHeader,
  CatalogSearch,
  CatalogChip,
  CurvedNavigation,
  MediaSlot,
} from '../shared/DesignParts';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Icon, Typography, Label } from '../../design-system/ui';
import { useApp } from '../../providers';
import { usePages, useResource } from '../../services/queries';
import { type Schemas } from '../../services/api';
import { CommandError, More, QueryState, RequireAuth } from '../shared/common';
import { calendarDateKey, isCalendarDate } from './calendar-model';
import { SavedEventsScreen } from './SavedEventsScreen';
import { useSavedEvent } from './useSavedEvent';
import { EventSavedConfirmation } from './EventSavedConfirmation';

export function EventsScreen({ saved = false }: { saved?: boolean }) {
  const { user } = useApp();
  return saved ? <SavedEventsScreen /> : <EventBrowser key={user?.id ?? 'guest'} saved={false} />;
}

function EventBrowser({ saved }: { saved: boolean }) {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const selectedDate = saved && isCalendarDate(date) ? date : null;
  const [search, setSearch] = useState('');
  const [area, setArea] = useState('');
  const [topic, setTopic] = useState('');
  const [week, setWeek] = useState(false);
  const [showAreas, setShowAreas] = useState(false);
  const [showTopics, setShowTopics] = useState(false);
  const { status } = useApp();
  const preferences = useResource<Schemas['Preferences']>('/v1/me/preferences', true);
  const options = useResource<Schemas['EventFilterOptions']>('/v1/events/filter-options');
  const timezone = preferences.data?.timezone ?? 'Asia/Ho_Chi_Minh';
  const filters = new URLSearchParams({ q: search.trim(), timezone });
  if (topic) filters.set('topic', topic);
  if (area) filters.set('location', area);
  if (selectedDate) filters.set('on_date', selectedDate);
  if (week) filters.set('week_of', calendarDateKey(new Date(), timezone));
  const query = usePages<Schemas['GreenEvent']>(
    `${saved ? '/v1/me/saved-events' : '/v1/events'}?${filters}`,
    saved,
  );
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const locations = options.data?.locations ?? [];
  const insets = useSafeAreaInsets(),
    width = Math.min(428, useWindowDimensions().width);
  const content = (
    <>
      {!saved ? (
        <View style={{ gap: 7 }}>
          <Label family="inter" size={27} bold color="#075A9C" style={{ lineHeight: 33 }}>
            Một việc nhỏ,{'\n'}một thay đổi xanh.
          </Label>
          <Label family="inter" size={14} color="#677C8C" style={{ lineHeight: 20 }}>
            Tìm hoạt động ý nghĩa, cùng cộng đồng.
          </Label>
        </View>
      ) : null}
      <View style={{ gap: 8 }}>
        <Label family="inter" size={14} color="#172B3D">
          Tìm hoạt động
        </Label>
        <CatalogSearch
          value={search}
          onChangeText={setSearch}
          placeholder="Tên hoạt động hoặc địa điểm"
          source={a.search}
        />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {selectedDate ? (
          <CatalogChip
            label={`Ngày ${Number(selectedDate.slice(8))}/${Number(selectedDate.slice(5, 7))}`}
            selected
            onPress={() => router.setParams({ date: undefined })}
          />
        ) : null}
        <CatalogChip
          label={area || 'Khu vực'}
          selected={!!area}
          onPress={() => {
            setShowAreas((value) => !value);
            setShowTopics(false);
          }}
          icon={area ? <Artwork source={a.check} width={14} /> : null}
        />
        <CatalogChip label="Tuần này" selected={week} onPress={() => setWeek((v) => !v)} />
        <CatalogChip
          label={topic || 'Chủ đề'}
          selected={!!topic}
          onPress={() => {
            setShowTopics((value) => !value);
            setShowAreas(false);
          }}
        />
      </View>
      {showAreas ? (
        <View style={{ gap: 8, padding: 12, borderRadius: 16, backgroundColor: '#EDF7FC' }}>
          <QueryState query={options}>
            <CatalogChip
              label="Tất cả khu vực"
              selected={!area}
              onPress={() => {
                setArea('');
                setShowAreas(false);
              }}
            />
            {locations.length ? (
              locations.map((location) => (
                <CatalogChip
                  key={location}
                  label={location}
                  selected={area === location}
                  onPress={() => {
                    setArea(location);
                    setShowAreas(false);
                  }}
                />
              ))
            ) : (
              <Label family="inter" size={12}>
                Chưa có khu vực của hoạt động được công bố.
              </Label>
            )}
          </QueryState>
        </View>
      ) : null}
      {showTopics ? (
        <View style={{ gap: 8, padding: 12, borderRadius: 16, backgroundColor: '#EDF7FC' }}>
          <QueryState query={options}>
            <CatalogChip
              label="Tất cả chủ đề"
              selected={!topic}
              onPress={() => {
                setTopic('');
                setShowTopics(false);
              }}
            />
            {options.data?.topics.map((value) => (
              <CatalogChip
                key={value}
                label={value}
                selected={topic === value}
                onPress={() => {
                  setTopic(value);
                  setShowTopics(false);
                }}
              />
            ))}
          </QueryState>
        </View>
      ) : null}
      {!saved ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { name: 'Dọn rác', source: a.trash },
            { name: 'Trồng cây', source: a.sprout },
            { name: 'Phân loại', source: a.recycle },
          ].map((item) => (
            <Pressable
              key={item.name}
              accessibilityRole="button"
              accessibilityLabel={item.name}
              accessibilityState={{ selected: topic === item.name }}
              onPress={() => setTopic(topic === item.name ? '' : item.name)}
              style={{
                flex: 1,
                alignItems: 'center',
                gap: 8,
                padding: 12,
                borderRadius: 16,
                backgroundColor: topic === item.name ? '#DCEEF9' : '#EDF7FC',
                borderWidth: 1,
                borderColor: topic === item.name ? '#147CC1' : 'transparent',
              }}
            >
              <Artwork source={item.source} width={26} />
              <Label
                family="inter"
                size={14}
                weight="medium"
                color="#147CC1"
                style={{ lineHeight: 20 }}
              >
                {item.name}
              </Label>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={{ gap: 12 }}>
        <Label
          family="inter"
          size={16}
          weight="semibold"
          color="#172B3D"
          heading
          style={{ lineHeight: 22 }}
        >
          {saved ? 'Hoạt động yêu thích' : week ? 'Hoạt động tuần này' : 'Hoạt động dành cho bạn'}
        </Label>
        <QueryState
          query={query}
          empty={!items.length}
          emptyText={
            saved && !search.trim() && !topic && !area && !week && !selectedDate
              ? 'Chưa có hoạt động đã lưu'
              : 'Chưa có hoạt động phù hợp'
          }
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {items.map((event) => (
              <View key={event.id} style={{ width: (width - 64) / 2 }}>
                <EventCard event={event} saved={saved} />
              </View>
            ))}
          </View>
        </QueryState>
        <More query={query} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Lên lịch cho một tuần xanh"
        onPress={() => router.push('/calendar')}
        style={{
          padding: 16,
          backgroundColor: '#EDF7FC',
          borderWidth: 1,
          borderColor: '#DEEBF3',
          borderRadius: 22,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Artwork source={a.calendar} width={26} />
        <View style={{ flex: 1, gap: 4 }}>
          <Label
            family="inter"
            size={16}
            weight="semibold"
            color="#172B3D"
            style={{ lineHeight: 22 }}
          >
            Lên lịch cho một tuần xanh
          </Label>
          <Label family="inter" size={12} color="#677C8C" style={{ lineHeight: 16 }}>
            Xem hoạt động theo ngày, tránh trùng lịch.
          </Label>
        </View>
        <Artwork source={a.arrow} width={20} />
      </Pressable>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button title="Đã lưu" variant="quiet" onPress={() => router.push('/saved')} />
        <Button
          title="Bộ sưu tập"
          variant="quiet"
          onPress={() => router.push('/event-collections')}
        />
      </View>
    </>
  );
  return (
    <Typography.Provider value="inter">
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <View style={{ height: Platform.OS === 'web' ? 49 : insets.top }} />
        <View style={{ paddingHorizontal: 24, paddingVertical: 10 }}>
          <CatalogHeader
            title={saved ? 'Hoạt động đã lưu' : 'Khám phá hoạt động'}
            action={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cá nhân"
                onPress={() => router.push('/profile')}
              >
                <Artwork source={a.brand} width={32} />
              </Pressable>
            }
          />
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 18,
            paddingBottom: 24,
            gap: 20,
          }}
        >
          {saved && status !== 'authenticated' ? <RequireAuth>{content}</RequireAuth> : content}
        </ScrollView>
        <CurvedNavigation />
      </View>
    </Typography.Provider>
  );
}
function EventCard({ event, saved }: { event: Schemas['GreenEvent']; saved: boolean }) {
  const favorite = useSavedEvent(event.id);
  const [savedNotice, setSavedNotice] = useState(false);
  const isSaved = favorite.query.data?.saved ?? saved;
  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          borderRadius: 15,
          backgroundColor: '#FFFFFF',
          boxShadow: '0px 4px 4px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          minHeight: 270,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={event.title}
          onPress={() => router.push({ pathname: '/events/[id]', params: { id: event.id } })}
        >
          <MediaSlot
            uri={typeof event.details.imageUrl === 'string' ? event.details.imageUrl : undefined}
            icon="calendar-outline"
            style={{ height: 164 }}
          />
          <View style={{ padding: 12, gap: 14, minHeight: 106 }}>
            <Label
              family="inter"
              size={14}
              weight="semibold"
              color="#075A9C"
              style={{ lineHeight: 20 }}
            >
              {event.title}
            </Label>
            <Label family="inter" size={10} color="#075A9C" style={{ lineHeight: 14 }}>
              {event.location}
            </Label>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isSaved ? 'Bỏ lưu hoạt động' : 'Lưu hoạt động'}
          accessibilityState={{
            selected: isSaved,
            disabled: favorite.disabled,
            busy: favorite.pending,
          }}
          disabled={favorite.disabled}
          onPress={() => {
            void favorite.toggle().then((result) => {
              if (result === 'saved') setSavedNotice(true);
            });
          }}
          style={{
            position: 'absolute',
            top: 8,
            right: 6,
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={isSaved ? 'heart' : 'heart-outline'} size={20} color="#FD4E4E" />
        </Pressable>
      </View>
      <Label family="inter" size={12} color="#147CC1" style={{ lineHeight: 16 }}>
        {new Date(event.startsAt).toLocaleString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: event.timezone,
        })}
      </Label>
      <Label family="inter" size={12} color="#677C8C" style={{ lineHeight: 16 }}>
        {event.reservedCount} người tham gia · Còn {event.available} chỗ
      </Label>
      <CommandError error={favorite.error} />
      {favorite.query.isError ? (
        <Button
          title="Tải lại trạng thái lưu"
          variant="quiet"
          onPress={() => void favorite.query.refetch()}
        />
      ) : null}
      <EventSavedConfirmation visible={savedNotice} close={() => setSavedNotice(false)} />
    </View>
  );
}

export { EventDetailScreen } from './EventDetail';

export { RegistrationScreen } from './EventRegistration';

export { EventCollectionsScreen } from './EventCollections';

export { CalendarScreen } from './EventCalendar';

export { EventRemindersScreen, TicketScreen, EventSummaryScreen } from './EventSupportScreens';
