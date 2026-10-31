import { useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../providers';
import { Artwork } from '../../design-system/DesignScreen';
import { eventDetailAssets } from '../../design-system/event-detail-assets';
import { Button, Card, Empty, Label, Search } from '../../design-system/ui';
import { QueryContent } from '../../design-system/QueryContent';
import { useDemoQuery } from '../../services/useDemoQuery';
import { events } from '../../services/fixtures';
import { normalizeEventSearch } from '../../services/event-planning';
import { CollectionText as T } from '../collection/CollectionPage';
import { NewsDesignNavigation } from '../content/NewsDesignParts';
import { EventCover } from './EventParts';
import { EventSavedFeedback } from './EventSavedFeedback';

const a = eventDetailAssets['386:18069'];
const sampleImages = [a.imgRectangle2, a.imgRectangle3, a.imgRectangle4, a.imgRectangle5];
export function SavedEventsScreen() {
  const { preview, feedback: initialFeedback } = useLocalSearchParams<{
    preview?: string;
    feedback?: 'saved' | 'removed';
  }>();
  return (
    <SavedEventsView
      key={`${preview}-${initialFeedback}`}
      preview={preview}
      initialFeedback={initialFeedback}
    />
  );
}

function SavedEventsView({
  preview,
  initialFeedback,
}: {
  preview?: string;
  initialFeedback?: 'saved' | 'removed';
}) {
  const sample = preview === '1';
  const { saved, toggleSaved } = useApp();
  const query = useDemoQuery('events');
  const [search, setSearch] = useState('');
  const [removing, setRemoving] = useState<string>();
  const [feedback, setFeedback] = useState<'saved' | 'removed' | null>(
    sample && (initialFeedback === 'saved' || initialFeedback === 'removed')
      ? initialFeedback
      : null,
  );
  const [sampleIds, setSampleIds] = useState(['sample-0', 'sample-1', 'sample-2', 'sample-3']);
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const items = sample
    ? sampleIds.map((id) => ({ ...events[0]!, id }))
    : (query.data?.filter(
        (event) =>
          saved.includes(event.id) &&
          normalizeEventSearch(`${event.title} ${event.area}`).includes(
            normalizeEventSearch(search),
          ),
      ) ?? []);
  const route = (path: '/event-collections' | '/event-reminders' | '/events') =>
    router.push({ pathname: path, params: sample ? { preview: '1' } : {} });
  return (
    <View
      testID="saved-events-386:18069"
      style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: insets.top }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          minHeight: 54,
          gap: 12,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/events'))}
          hitSlop={10}
          style={{ width: 24, height: 44, justifyContent: 'center' }}
        >
          <Artwork
            source={require('../../../assets/figma/common/event-saved-back.svg')}
            width={24}
          />
        </Pressable>
        <T
          accessibilityRole="header"
          weight="bold"
          size={18}
          lineHeight={24}
          style={{ flex: 1, textAlign: 'center' }}
        >
          Hoạt động yêu thích
        </T>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 21,
          paddingTop: 12,
          paddingBottom: 24,
          gap: 16,
        }}
      >
        <View style={{ flexDirection: fontScale > 1.3 ? 'column' : 'row', gap: 12 }}>
          {(
            [
              ['Bộ sưu tập', a.imgFolder, '/event-collections'],
              ['Nhắc lịch', a.imgBell, '/event-reminders'],
            ] as const
          ).map(([label, icon, path], index) => (
            <Pressable
              key={path}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={() => route(path)}
              style={{
                flex: 1,
                minHeight: 44,
                padding: 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderWidth: 1,
                borderColor: index ? '#DEEBF3' : '#147CC1',
                borderRadius: 22,
                backgroundColor: index ? '#FFFFFF' : '#DCEEF9',
              }}
            >
              <Artwork source={icon} width={16} />
              <T size={14} weight="semibold" color={index ? '#677C8C' : '#147CC1'}>
                {label}
              </T>
            </Pressable>
          ))}
        </View>
        {!sample ? (
          <Search value={search} onChangeText={setSearch} placeholder="Tìm hoạt động đã lưu" />
        ) : null}
        {removing ? (
          <Card>
            <Label bold>Xóa hoạt động yêu thích?</Label>
            <Label size={13}>{items.find((event) => event.id === removing)?.title}</Label>
            <Label size={12}>
              Hoạt động sẽ được bỏ khỏi bộ sưu tập và nhắc lịch. Vé mẫu đã tạo vẫn được giữ.
            </Label>
            <Button
              title="Xác nhận xóa"
              variant="danger"
              onPress={() => {
                if (sample) setSampleIds((ids) => ids.filter((id) => id !== removing));
                else toggleSaved(removing);
                setRemoving(undefined);
                setFeedback('removed');
              }}
            />
            <Button title="Hủy xóa" variant="quiet" onPress={() => setRemoving(undefined)} />
          </Card>
        ) : null}
        <QueryContent
          loading={!sample && query.isPending}
          error={!sample && query.isError}
          retry={() => {
            void query.refetch();
          }}
        >
          {items.length ? (
            <View style={{ gap: 12 }}>
              {items.map((event) => {
                const sampleIndex = Number(event.id.split('-')[1]);
                return (
                  <View
                    key={event.id}
                    style={{
                      backgroundColor: '#F8FBFF',
                      padding: 12,
                      gap: fontScale > 1.3 ? 12 : 20,
                      borderRadius: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      flexWrap: fontScale > 1.3 ? 'wrap' : 'nowrap',
                    }}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Xem hoạt động ${event.title}`}
                      onPress={() =>
                        router.push({
                          pathname: '/events/[id]',
                          params: {
                            id: sample ? 'green-class' : event.id,
                            ...(sample ? { preview: '1' } : {}),
                          },
                        })
                      }
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: fontScale > 1.3 ? 12 : 20,
                        flex: 1,
                      }}
                    >
                      <View style={{ width: 70, height: 70, borderRadius: 10, overflow: 'hidden' }}>
                        {sample ? (
                          <Artwork
                            source={sampleImages[sampleIndex]!}
                            width={70}
                            height={70}
                            fit="cover"
                          />
                        ) : (
                          <EventCover event={event} height={70} />
                        )}
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <T size={16} lineHeight={21} weight="bold" color="#1A3F76">
                          {sample ? 'GIỜ HỌC XANH' : event.title}
                        </T>
                        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                          <Artwork source={a.imgMapPin} width={14} />
                          <T size={12} lineHeight={16} color="#2D528B" style={{ flex: 1 }}>
                            {event.area}
                          </T>
                        </View>
                      </View>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Xóa ${event.title}`}
                      onPress={() => setRemoving(event.id)}
                      style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}
                    >
                      <View
                        style={{
                          minHeight: 24,
                          padding: 6,
                          backgroundColor: '#E90404',
                          borderRadius: 10,
                        }}
                      >
                        <T
                          size={10}
                          lineHeight={12}
                          weight="semibold"
                          color="#FFFFFF"
                          style={{ textAlign: 'center' }}
                        >
                          Xóa
                        </T>
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : (
            <Empty
              title={search ? 'Không tìm thấy hoạt động đã lưu' : 'Chưa có hoạt động yêu thích'}
              detail="Khám phá và chạm trái tim để lưu hoạt động bạn quan tâm."
              action="Khám phá hoạt động"
              onPress={() => route('/events')}
            />
          )}
        </QueryContent>
      </ScrollView>
      <View style={{ paddingBottom: insets.bottom }}>
        <NewsDesignNavigation source={a} />
      </View>
      <EventSavedFeedback
        state={feedback}
        onClose={() => setFeedback(null)}
        onOpenSaved={() => setFeedback(null)}
      />
    </View>
  );
}

export { EventCollectionsScreen } from './EventCollectionsScreen';
export { EventRemindersScreen } from './EventRemindersScreen';
