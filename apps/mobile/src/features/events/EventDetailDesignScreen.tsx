import { useState } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Artwork } from '../../design-system/DesignScreen';
import { MeasuredArtwork } from '../../design-system/MeasuredArtwork';
import { eventDetailAssets } from '../../design-system/event-detail-assets';
import { useApp } from '../../providers';
import { events, type GreenEvent } from '../../services/fixtures';
import { Button } from '../../design-system/ui';
import { NewsDesignNavigation } from '../content/NewsDesignParts';
import { CollectionText as T } from '../collection/CollectionPage';
import { EventSavedFeedback } from './EventSavedFeedback';
import { eventDetailDesignData } from './event-detail-design-data';

type Frame = keyof typeof eventDetailDesignData;
type Picture = {
  id: string;
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
  fit: string;
  crop?: number[][];
  rotation?: number;
  opacity?: number;
};
export const eventDetailFrame = (id: string, interested = false): Frame | undefined =>
  (Object.keys(eventDetailDesignData) as Frame[]).find((frame) => {
    const item = eventDetailDesignData[frame];
    return item.eventId === id && item.interested === interested;
  });

function Pictures({
  images,
  assets,
  scale,
  x = 0,
  y = 0,
}: {
  images: Picture[];
  assets: Record<string, number>;
  scale: number;
  x?: number;
  y?: number;
}) {
  return (
    <>
      {images.map((p, index) => (
        <MeasuredArtwork
          key={`${p.id}-${index}`}
          source={assets[p.key]!}
          image={{
            ...p,
            source: p.key,
            fit: p.fit === 'cover' ? 'cover' : 'fill',
            x: (p.x - x) * scale,
            y: (p.y - y) * scale,
            w: p.w * scale,
            h: p.h * scale,
            radius: p.radius * scale,
          }}
        />
      ))}
    </>
  );
}

/** Original media and geometry, with flowing text and native scroll/safe areas. */
export function EventDetailDesignScreen({
  event,
  sample = false,
  initiallyInterested = false,
}: {
  event: GreenEvent;
  sample?: boolean;
  initiallyInterested?: boolean;
}) {
  const { saved, toggleSaved, eventPlanning, setEventPlanning } = useApp();
  const [previewInterested, setPreviewInterested] = useState(initiallyInterested);
  const [previewSaved, setPreviewSaved] = useState(false);
  const interested = sample ? previewInterested : eventPlanning.interested.includes(event.id);
  const isSaved = sample ? previewSaved : saved.includes(event.id);
  const frame = eventDetailFrame(event.id, interested)!;
  const data = eventDetailDesignData[frame];
  const assets: Record<string, number> = eventDetailAssets[frame];
  const [width, setWidth] = useState(428);
  const scale = width / 428;
  const { fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [feedback, setFeedback] = useState<'saved' | 'removed' | null>(null);
  const [photo, setPhoto] = useState<number | null>(null);
  const registration = eventPlanning.registrations[event.id];
  const route = (
    path: '/events' | '/saved' | '/calendar' | '/event-collections' | '/event-reminders',
  ) => router.push({ pathname: path, params: sample ? { preview: '1' } : {} });
  const save = () => {
    if (sample) setPreviewSaved(!isSaved);
    else toggleSaved(event.id);
    setFeedback(isSaved ? 'removed' : 'saved');
  };
  const changeInterest = () => {
    if (sample) setPreviewInterested(!interested);
    else
      setEventPlanning((state) => ({
        ...state,
        interested: state.interested.includes(event.id)
          ? state.interested.filter((id) => id !== event.id)
          : [...state.interested, event.id],
      }));
  };
  const navigation = {
    imgRectangle87: assets[data.nav[0]!],
    imgGroup: assets[data.nav[1]!],
    imgGroup1: assets[data.nav[2]!],
    imgGroup2: assets[data.nav[3]!],
    imgGroup37108: assets[data.nav[4]!],
    imgGroup36731: assets[data.nav[5]!],
    imgLine1: assets[data.nav[6]!],
  };
  const relatedIds = data.related.texts
    .filter((text) => text.size === 10)
    .sort((a, b) => a.x - b.x)
    .map((text) =>
      /THCS|giải lao|vườn/i.test(text.text)
        ? 'garden'
        : /Trải nghiệm/.test(text.text)
          ? 'school-class'
          : /biển/i.test(text.text)
            ? 'beach'
            : 'green-class',
    );
  return (
    <View
      testID={`event-detail-${frame}`}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: insets.top }}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
          <Pictures images={data.background} assets={assets} scale={scale} />
        </View>
        <View
          style={{
            height: 389 * scale,
            borderBottomLeftRadius: 35 * scale,
            borderBottomRightRadius: 35 * scale,
            overflow: 'hidden',
            boxShadow: '0px 4px 4px #00000040',
          }}
        >
          <Pictures images={data.hero} assets={assets} scale={scale} />
          {[
            { x: 31, y: 158, w: 60, h: 60 },
            { x: 24, y: 210, w: 70, h: 70 },
            { x: 32, y: 276, w: 67, h: 56 },
          ].map((box, index) => (
            <Pressable
              key={index}
              accessibilityRole="button"
              accessibilityLabel={`Xem ảnh hoạt động ${index + 1}`}
              onPress={() =>
                setPhoto(
                  assets[
                    data.hero.find(
                      (image) => Math.abs(image.x - box.x) < 1 && Math.abs(image.y - box.y) < 1,
                    )!.key
                  ]!,
                )
              }
              style={{
                position: 'absolute',
                left: box.x * scale,
                top: box.y * scale,
                width: box.w * scale,
                height: box.h * scale,
                borderRadius: 15 * scale,
                borderWidth: 4 * scale,
                borderColor: '#FFFFFF',
              }}
            >
              {index === 2 ? (
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#55555577',
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <T size={13} weight="bold" color="#FFFFFF">
                    10+
                  </T>
                </View>
              ) : null}
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/events'))}
            style={{
              position: 'absolute',
              left: 14 * scale,
              top: 8,
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Artwork
              source={require('../../../assets/figma/common/event-back.svg')}
              width={40 * scale}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isSaved ? 'Bỏ lưu hoạt động' : 'Lưu hoạt động'}
            accessibilityState={{ selected: isSaved }}
            onPress={save}
            style={{
              position: 'absolute',
              right: 10 * scale,
              bottom: 8 * scale,
              width: 44,
              height: 44,
              borderRadius: 22,
              borderWidth: isSaved ? 2 : 0,
              borderColor: '#E95060',
            }}
          />
        </View>
        <View
          style={{ marginLeft: 28 * scale, marginRight: 12 * scale, marginTop: 15 * scale, gap: 6 }}
        >
          <T
            accessibilityRole="header"
            size={data.titleSize * scale}
            lineHeight={44 * scale}
            weight="bold"
            color="#2D528B"
            numberOfLines={sample && fontScale <= 1.05 ? 1 : undefined}
            style={{
              fontFamily: 'InknutAntiqua_700Bold',
              width: sample && fontScale <= 1.05 ? data.titleWidth * scale : undefined,
            }}
          >
            {sample ? data.title : event.title}
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {data.location ? (
              <Artwork source={assets[data.location.key]} width={15 * scale} height={22 * scale} />
            ) : null}
            <T size={15 * scale} lineHeight={20 * scale} color="#2D528B" style={{ flex: 1 }}>
              {sample ? data.area : event.area}
            </T>
          </View>
        </View>
        <View
          style={{
            marginTop: 24 * scale,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginHorizontal: 28 * scale,
            gap: 12,
          }}
        >
          <View
            accessible
            accessibilityLabel="Người tham gia minh họa"
            style={{ width: 145 * scale, height: 40 * scale }}
          >
            <Pictures images={data.people.images} assets={assets} scale={scale} x={28} y={496} />
            <T
              size={8 * scale}
              lineHeight={10 * scale}
              weight="bold"
              color="#326C8B"
              style={{ position: 'absolute', left: 113 * scale, top: 15 * scale }}
            >
              {data.people.texts.find((t) => t.size === 8)?.text}
            </T>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={interested ? 'Bỏ quan tâm hoạt động' : 'Quan tâm hoạt động'}
            accessibilityState={{ selected: interested }}
            onPress={changeInterest}
            style={{
              minHeight: 44,
              paddingHorizontal: 14 * scale,
              paddingVertical: 9,
              backgroundColor: interested ? '#147CC1' : '#FFFFFF',
              borderWidth: 1,
              borderColor: '#147CC1',
              boxShadow: '0px 3px 4px #00000040',
              borderRadius: 10,
              flexShrink: 1,
              justifyContent: 'center',
            }}
          >
            <T
              size={12}
              lineHeight={16}
              weight="bold"
              color={interested ? '#FFFFFF' : '#000000'}
              style={{ textAlign: 'center' }}
            >
              {interested ? 'Đã Quan Tâm' : 'Quan tâm'}
            </T>
          </Pressable>
        </View>
        <View
          style={{
            flexDirection: fontScale > 1.2 ? 'column' : 'row',
            marginHorizontal: 28 * scale,
            marginTop: 24 * scale,
            gap: fontScale > 1.2 ? 14 : 8,
          }}
        >
          {data.stats.texts.map((text, index) => {
            const start = [30, 173, 278][index]!;
            const pictures = data.stats.images.filter((p) => p.x >= start && p.x < start + 52);
            const [first, ...rest] = text.text.split('\n');
            return (
              <View
                key={text.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  flex: fontScale > 1.2 ? undefined : 1,
                  gap: 5,
                }}
              >
                <View style={{ width: 48 * scale, height: 48 * scale }}>
                  <Pictures
                    images={pictures}
                    assets={assets}
                    scale={scale}
                    x={start + 2}
                    y={pictures[0]?.y ?? 558}
                  />
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <T size={12 * scale} lineHeight={15 * scale} weight="bold" color="#000000">
                    {first}
                  </T>
                  <T size={12 * scale} lineHeight={15 * scale} color="#000000">
                    {rest.join('\n')}
                  </T>
                </View>
              </View>
            );
          })}
        </View>
        {data.actions !== 'footer' ? (
          <View style={{ margin: 22 * scale, gap: 12 }}>
            <View
              style={{
                flexDirection: data.actions === 'row' && fontScale <= 1.2 ? 'row' : 'column',
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Button
                  title="Khám phá tất cả"
                  variant="secondary"
                  onPress={() => route('/events')}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Lịch hoạt động"
                  variant="secondary"
                  onPress={() => route('/calendar')}
                />
              </View>
            </View>
            <Button
              title={registration ? 'Xem vé mẫu' : 'Đăng ký tham gia'}
              accessibilityLabel={registration ? 'Xem vé mẫu' : 'Xem biểu mẫu đăng ký'}
              onPress={() =>
                router.push(
                  registration ? `/event-ticket?id=${event.id}` : `/registration?id=${event.id}`,
                )
              }
            />
          </View>
        ) : null}
        <View
          style={{
            marginHorizontal: 24 * scale,
            marginTop: data.actions === 'footer' ? 30 * scale : 10,
            gap: 8,
          }}
        >
          <T accessibilityRole="header" size={15} lineHeight={20} weight="bold" color="#000000">
            {data.introTitle}
          </T>
          {data.intro.split('\n').map((paragraph, index) => (
            <T
              key={index}
              size={12}
              lineHeight={18}
              color="#000000"
              style={{ textAlign: 'justify' }}
            >
              {paragraph}
            </T>
          ))}
          {!sample ? (
            <T size={12} color="#526C89">
              Lịch, số người và đăng ký là dữ liệu mẫu trong phiên. Quan tâm và lưu yêu thích được
              giữ riêng.
            </T>
          ) : null}
        </View>
        <View
          style={{
            marginHorizontal: 24 * scale,
            marginTop: 24,
            marginBottom: 18,
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <T accessibilityRole="header" size={15} weight="bold" color="#2D528B">
            Hoạt động khác
          </T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tất cả hoạt động"
            onPress={() => route('/events')}
            hitSlop={12}
          >
            <T size={12} color="#326C8B">
              Tất cả
            </T>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingLeft: 24 * scale,
            paddingRight: 20 * scale,
            gap: 19 * scale,
            paddingBottom: 8,
          }}
        >
          {relatedIds.map((id, index) => {
            const x = data.related.x + index * 154;
            const images = data.related.images.filter((p) => p.x >= x && p.x < x + 135);
            const texts = data.related.texts.filter((p) => p.x >= x && p.x < x + 135);
            const cover = images.find((p) => p.w >= 130 && p.h > 100)!;
            const related = events.find((item) => item.id === id)!;
            return (
              <Pressable
                key={`${id}-${index}`}
                accessibilityRole="button"
                accessibilityLabel={`Xem hoạt động ${related.title}`}
                onPress={() =>
                  router.push({
                    pathname: '/events/[id]',
                    params: { id, ...(sample ? { preview: '1' } : {}) },
                  })
                }
                style={{
                  width: (fontScale > 1.05 ? 190 : 135) * scale,
                  height: fontScale > 1.05 ? undefined : 201 * scale,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 15 * scale,
                  overflow: 'hidden',
                  boxShadow: '0px 2px 4px #00000030',
                }}
              >
                {fontScale > 1.05 ? (
                  <>
                    <Artwork
                      source={assets[cover.key]!}
                      width={190 * scale}
                      height={122 * scale}
                      fit="cover"
                    />
                    <View style={{ padding: 10, gap: 8 }}>
                      <T size={12} lineHeight={17} weight="semibold" color="#2D528B">
                        {texts.find((text) => text.size === 10)?.text}
                      </T>
                      <T size={10} lineHeight={14} color="#2D528B">
                        {texts.find((text) => text.size === 6 && !/\d\+/.test(text.text))?.text}
                      </T>
                      <T size={10} lineHeight={14} color="#326C8B">
                        {texts.find((text) => /\d\+/.test(text.text))?.text} người tham gia minh họa
                      </T>
                    </View>
                  </>
                ) : (
                  <>
                    <Pictures
                      images={images}
                      assets={assets}
                      scale={scale}
                      x={x}
                      y={data.related.y}
                    />
                    {texts.map((text) => (
                      <T
                        key={text.id}
                        size={text.size * scale}
                        lineHeight={text.size * 1.2 * scale}
                        weight={text.weight === 'semibold' ? 'semibold' : 'regular'}
                        color={text.color}
                        style={{
                          position: 'absolute',
                          left: (text.x - x) * scale,
                          top: (text.y - data.related.y) * scale,
                          width: Math.min(text.w, 128) * scale,
                        }}
                      >
                        {text.text}
                      </T>
                    ))}
                  </>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
        {data.actions === 'footer' || !sample ? (
          <View style={{ margin: 24, gap: 10 }}>
            {data.actions === 'footer' ? (
              <Button
                title={registration ? 'Xem vé mẫu' : 'Xem biểu mẫu đăng ký'}
                onPress={() =>
                  router.push(
                    registration ? `/event-ticket?id=${event.id}` : `/registration?id=${event.id}`,
                  )
                }
              />
            ) : null}
            <Button
              title="Xem tổng kết mẫu"
              variant="quiet"
              onPress={() => router.push(`/event-summary?id=${event.id}`)}
            />
            <Button
              title="Hoạt động yêu thích"
              variant="secondary"
              onPress={() => route('/saved')}
            />
          </View>
        ) : null}
      </ScrollView>
      <View style={{ paddingBottom: insets.bottom }}>
        <NewsDesignNavigation source={navigation} />
      </View>
      <EventSavedFeedback
        state={feedback}
        onClose={() => setFeedback(null)}
        onOpenSaved={() => {
          setFeedback(null);
          route('/saved');
        }}
      />
      <Modal visible={photo !== null} transparent onRequestClose={() => setPhoto(null)}>
        <View
          style={{
            flex: 1,
            backgroundColor: '#10243CF2',
            justifyContent: 'center',
            padding: 20,
            gap: 24,
          }}
        >
          {photo !== null ? (
            <Artwork
              source={photo}
              width={Math.max(width - 40, 100)}
              height={width}
              fit="contain"
              style={{ alignSelf: 'center' }}
            />
          ) : null}
          <Button title="Đóng ảnh hoạt động" onPress={() => setPhoto(null)} />
        </View>
      </Modal>
    </View>
  );
}
