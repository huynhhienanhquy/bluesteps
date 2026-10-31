import { useState } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../providers';
import { Artwork } from '../../design-system/DesignScreen';
import { newsExtendedAssets } from '../../design-system/news-extended-assets';
import { Empty } from '../../design-system/ui';
import { createNewsSession } from '../../services/news';
import { newsEvents } from '../../services/news-events';
import { NewsDesignNavigation, NewsText as T } from './NewsDesignParts';
import { ExtendedBack } from './NewsExtendedParts';

const a = newsExtendedAssets['680:5461'];
export function NewsEventScreen() {
  const { id, preview, confirm } = useLocalSearchParams<{
    id?: string;
    preview?: string;
    confirm?: string;
  }>();
  return (
    <NewsEvent
      key={`${id}:${preview}:${confirm}`}
      id={id ?? ''}
      sample={preview === '1'}
      initiallyConfirmed={preview === '1' && confirm === '1'}
    />
  );
}
function NewsEvent({
  id,
  sample,
  initiallyConfirmed,
}: {
  id: string;
  sample: boolean;
  initiallyConfirmed: boolean;
}) {
  const { news, setNews } = useApp();
  const [example, setExample] = useState(() => ({
    ...createNewsSession(),
    interestedEvents: initiallyConfirmed ? [id] : [],
  }));
  const session = sample ? example : news;
  const update = sample ? setExample : setNews;
  const [confirmed, setConfirmed] = useState(initiallyConfirmed);
  const event = newsEvents.find((item) => item.id === id);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const s = width / 428;
  const interested = session.interestedEvents.includes(id);
  const saved = session.savedEvents.includes(id);
  const calendar = () =>
    router.push({
      pathname: '/articles/calendar',
      params: { interested: '1', ...(sample ? { preview: '1' } : {}) },
    });
  if (!event)
    return (
      <View
        style={{ flex: 1, backgroundColor: '#F0F9FF', padding: 28, paddingTop: insets.top + 28 }}
      >
        <Empty
          title="Không tìm thấy sự kiện xanh"
          detail="Sự kiện không có trong danh sách hiện tại."
          action="Xem lịch xanh"
          onPress={() => router.replace('/articles/calendar')}
        />
      </View>
    );
  return (
    <View
      testID="news-extended-680:5461"
      style={{ flex: 1, backgroundColor: '#F0F9FF', paddingTop: insets.top }}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View testID="news-event-cover-viewport" style={{ height: 263 * s, overflow: 'hidden' }}>
          <Artwork
            source={a.imgNhBiaSKin}
            testID="news-event-cover"
            width={width}
            height={300 * s}
            fit="cover"
            style={{ position: 'absolute', top: -37 * s }}
          />
          <View style={{ position: 'absolute', left: 25 * s, top: 24 * s }}>
            <ExtendedBack size={34 * s} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Bỏ lưu sự kiện xanh' : 'Lưu sự kiện xanh'}
            accessibilityState={{ selected: saved }}
            onPress={() =>
              update((state) => ({
                ...state,
                savedEvents: saved
                  ? state.savedEvents.filter((value) => value !== id)
                  : [...state.savedEvents, id],
              }))
            }
            style={{
              position: 'absolute',
              right: 25 * s,
              top: 24 * s,
              width: 34 * s,
              height: 34 * s,
              borderRadius: 17 * s,
              backgroundColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            hitSlop={8}
          >
            <T size={18 * s} lineHeight={24 * s} color="#ED4F47" weight="semibold">
              {saved ? '♥' : '♡'}
            </T>
          </Pressable>
        </View>
        <View
          style={{
            backgroundColor: '#F0F9FF',
            borderTopLeftRadius: 22 * s,
            borderTopRightRadius: 22 * s,
            marginTop: -34 * s,
            paddingTop: 23 * s,
            paddingHorizontal: 28 * s,
          }}
        >
          <View
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: 12 * s,
              paddingVertical: 6 * s,
              backgroundColor: '#147CC1',
              borderRadius: 12 * s,
            }}
          >
            <T size={10 * s} lineHeight={13 * s} weight="bold" color="#FFFFFF">
              SỰ KIỆN XANH
            </T>
          </View>
          <T
            accessibilityRole="header"
            size={21 * s}
            lineHeight={25 * s}
            weight="bold"
            color="#0F172A"
            style={{ marginTop: 11 * s, minHeight: 60 * s }}
          >
            {event.title}
          </T>
          <T
            size={12 * s}
            lineHeight={16 * s}
            color="#6E7A87"
            style={{ marginTop: 9 * s, minHeight: 42 * s }}
          >
            {event.description}
          </T>
          <View
            style={{
              paddingHorizontal: 15 * s,
              paddingTop: 16 * s,
              paddingBottom: 13 * s,
              borderRadius: 15 * s,
              backgroundColor: '#FFFFFF',
              marginTop: 15 * s,
            }}
          >
            <T
              size={13 * s}
              lineHeight={17 * s}
              weight="semibold"
              color="#0B2E4F"
              style={{ minHeight: 25 * s }}
            >
              ◷ 02/11/2026 · 07:30 – 11:00
            </T>
            <View
              style={{
                height: 1,
                backgroundColor: '#D1E3ED',
                marginTop: 12 * s,
                marginBottom: 14 * s,
              }}
            />
            <T
              size={13 * s}
              lineHeight={17 * s}
              weight="semibold"
              color="#0B2E4F"
              style={{ minHeight: 25 * s }}
            >
              ⌖ {event.area}
            </T>
          </View>
          <T
            accessibilityRole="header"
            size={18 * s}
            lineHeight={23 * s}
            weight="bold"
            color="#0F172A"
            style={{ marginTop: 18 * s }}
          >
            Về hoạt động
          </T>
          <T size={12 * s} lineHeight={15 * s} color="#0F172A" style={{ marginTop: 11 * s }}>
            {event.about}
          </T>
          <T
            accessibilityRole="header"
            size={18 * s}
            lineHeight={23 * s}
            weight="bold"
            color="#0F172A"
            style={{ marginTop: 20 * s }}
          >
            Lịch trình ngắn
          </T>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 4 * s,
              backgroundColor: '#FFFFFF',
              borderRadius: 12 * s,
              padding: 8 * s,
              marginTop: 7 * s,
              minHeight: 48 * s,
            }}
          >
            {event.schedule.map(([time, label]) => (
              <View key={time} style={{ flexGrow: 1, flexBasis: 100 * s, gap: 2 * s }}>
                <T size={11 * s} lineHeight={14 * s} weight="bold" color="#147CC1">
                  {time}
                </T>
                <T size={10 * s} lineHeight={13 * s} color="#6E7A87">
                  {label}
                </T>
              </View>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={interested ? 'Xem lịch quan tâm' : 'Tham gia sự kiện'}
            onPress={() => {
              if (interested) {
                calendar();
                return;
              }
              update((state) => ({
                ...state,
                interestedEvents: [...new Set([...state.interestedEvents, id])],
              }));
              setConfirmed(true);
            }}
            style={{
              marginTop: 2 * s,
              backgroundColor: '#147CC1',
              borderRadius: 24 * s,
              paddingVertical: 13 * s,
              paddingHorizontal: 16,
              minHeight: 48 * s,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <T size={14 * s} lineHeight={18 * s} weight="bold" color="#FFFFFF">
              {interested ? 'Đã quan tâm · Xem lịch →' : 'Tham gia sự kiện   →'}
            </T>
          </Pressable>
          {interested ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Bỏ quan tâm sự kiện xanh"
              onPress={() =>
                update((state) => ({
                  ...state,
                  interestedEvents: state.interestedEvents.filter((value) => value !== id),
                }))
              }
              style={{ minHeight: 44, padding: 12, alignItems: 'center' }}
            >
              <T size={12} color="#147CC1">
                Bỏ quan tâm sự kiện
              </T>
            </Pressable>
          ) : null}
          {!sample ? (
            <T size={12} lineHeight={17} color="#6E7A87" style={{ marginTop: 16 }}>
              Sự kiện mẫu. Quan tâm giúp bạn xem lại trong lịch; đây chưa phải xác nhận đăng ký tham
              gia.
            </T>
          ) : null}
        </View>
      </ScrollView>
      <View style={{ paddingBottom: insets.bottom }}>
        <NewsDesignNavigation source={a} offsetX={4} testPrefix="news-extended-nav" />
      </View>
      <Modal
        transparent
        visible={confirmed}
        animationType="fade"
        onRequestClose={() => setConfirmed(false)}
      >
        <View
          accessibilityViewIsModal
          style={{
            flex: 1,
            backgroundColor: '#00000035',
            padding: 20,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            testID="news-extended-695:5419"
            style={{
              width: '100%',
              maxWidth: 340,
              borderRadius: 22,
              backgroundColor: '#FFFFFF',
              paddingTop: 23,
              paddingHorizontal: 25,
              paddingBottom: 15,
              alignItems: 'center',
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
              <T size={34} lineHeight={44} weight="bold" color="#147CC1">
                ✓
              </T>
            </View>
            <T
              accessibilityRole="header"
              size={19}
              lineHeight={24}
              weight="bold"
              color="#0F172A"
              style={{ textAlign: 'center', marginTop: 13, minHeight: 34 }}
            >
              Đã ghi nhận sự quan tâm
            </T>
            <T
              size={12}
              lineHeight={15}
              color="#6E7A87"
              style={{ textAlign: 'center', marginTop: 10, minHeight: 42 }}
            >
              Thông tin sự kiện đã được thêm vào lịch quan tâm của bạn.
            </T>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xong"
              onPress={() => setConfirmed(false)}
              style={{
                width: '100%',
                minHeight: 44,
                marginTop: 11,
                borderRadius: 20,
                backgroundColor: '#147CC1',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 11,
              }}
            >
              <T size={13} lineHeight={17} weight="semibold" color="#FFFFFF">
                Xong
              </T>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
