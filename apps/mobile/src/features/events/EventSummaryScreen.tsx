import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../providers';
import { Artwork } from '../../design-system/DesignScreen';
import { eventDesignAssets } from '../../design-system/event-design-assets';
import { events } from '../../services/fixtures';
import { collectionColors as c } from '../collection/CollectionPage';
import { EventCover, EventMissing } from './EventParts';
import {
  EventAction,
  EventField,
  EventFormPage,
  EventOutlineAction,
  EventSheet,
  EventText as T,
  EventTextAction,
} from './EventFormParts';

const a = eventDesignAssets['534:49760'];
const options = ['Tổ chức tốt', 'Học được điều mới', 'Cần thêm học cụ'];

export function EventSummaryScreen() {
  const { id, preview } = useLocalSearchParams<{ id: string; preview?: string }>();
  const event = events.find((item) => item.id === id);
  const { eventPlanning, setEventPlanning } = useApp();
  const registration = id ? eventPlanning.registrations[id] : undefined;
  const sample = preview === '1';
  const [rating, setRating] = useState(registration?.feedback?.rating ?? 4);
  const [tags, setTags] = useState<string[]>(
    registration?.feedback?.tags ?? (sample ? options.slice(0, 2) : []),
  );
  const [comment, setComment] = useState(
    registration?.feedback?.comment ??
      (sample ? 'Các bé rất hào hứng! Mong có thêm học cụ để nhiều bé cùng thực hành hơn.' : ''),
  );
  const [sent, setSent] = useState(false);
  const [album, setAlbum] = useState(false);
  const submit = () => {
    if (!event || (!registration && !sample)) return;
    if (registration)
      setEventPlanning((current) => ({
        ...current,
        registrations: {
          ...current.registrations,
          [event.id]: { ...registration, feedback: { rating, tags, comment: comment.trim() } },
        },
      }));
    setSent(true);
  };
  if (!event)
    return (
      <EventFormPage title="Tổng kết hoạt động" frame="534:49760" footer={null}>
        <EventMissing />
      </EventFormPage>
    );
  return (
    <EventFormPage
      title="Tổng kết hoạt động"
      frame="534:49760"
      footer={
        <>
          <EventAction
            title="Gửi đánh giá"
            label="Lưu phản hồi trong demo"
            shadow
            disabled={!registration && !sample}
            onPress={submit}
          />
          <EventTextAction title="Xem album hoạt động" onPress={() => setAlbum(true)} />
          <EventOutlineAction
            title="Khám phá hoạt động khác"
            onPress={() => router.push('/events')}
          />
        </>
      }
    >
      <View style={{ gap: 12 }}>
        <View style={{ height: 190, borderRadius: 16, overflow: 'hidden' }}>
          {event.id === 'green-class' ? (
            <Artwork
              source={a.imgNhMinhHa}
              width={380}
              height={190}
              fit="cover"
              style={{ width: '100%' }}
            />
          ) : (
            <EventCover event={event} height={190} />
          )}
        </View>
        <T size={24} weight="bold" lineHeight={29} color="#075A9C" accessibilityRole="header">
          Cảm ơn bạn đã gieo mầm xanh!
        </T>
        <T color={c.muted}>
          {event.title} • {event.date.split('-').reverse().join('/')}
        </T>
        <T size={12} color={c.muted}>
          {event.area}
        </T>
      </View>
      <View style={{ gap: 12 }}>
        <T size={16} weight="semibold" accessibilityRole="header">
          Cùng nhau, chúng ta đã làm được
        </T>
        <View
          style={{
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 20,
            padding: 15,
            flexDirection: 'row',
            gap: 8,
          }}
        >
          {[
            ['200', 'trẻ được hướng dẫn'],
            ['24', 'tình nguyện viên'],
            ['3', 'góc phân loại'],
          ].map(([value, label]) => (
            <View key={label} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
              <T size={24} lineHeight={29} weight="bold" color={c.brand}>
                {value}
              </T>
              <T size={12} color={c.muted} style={{ textAlign: 'center' }}>
                {label}
              </T>
            </View>
          ))}
        </View>
      </View>
      <View
        style={{
          padding: 15,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.mint,
          flexDirection: 'row',
          gap: 12,
        }}
      >
        <Artwork source={a.imgHandHeart} width={30} />
        <View style={{ flex: 1, gap: 7 }}>
          <T size={16} weight="semibold">
            Dấu ấn của {registration?.name ?? (sample ? 'Minh Anh' : 'bạn')}
          </T>
          <T>Minh họa: hướng dẫn 12 trẻ thực hành và hỗ trợ 1 trong 3 góc phân loại trong 2 giờ.</T>
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <T size={16} weight="semibold" accessibilityRole="header">
          Trải nghiệm của bạn thế nào?
        </T>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18 }}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityLabel={`Đánh giá ${value} sao`}
              accessibilityState={{ selected: value === rating }}
              hitSlop={5}
              onPress={() => {
                setRating(value);
                setSent(false);
              }}
            >
              <Artwork source={value <= rating ? a.imgStar : a.imgStar1} width={34} />
            </Pressable>
          ))}
        </View>
        <T weight="medium" color={c.brand} style={{ textAlign: 'center' }}>
          {rating}/5 • {rating >= 4 ? 'Rất ý nghĩa' : 'Cần cải thiện'}
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {options.map((tag) => {
            const selected = tags.includes(tag);
            return (
              <Pressable
                key={tag}
                accessibilityRole="button"
                accessibilityLabel={tag}
                accessibilityState={{ selected }}
                onPress={() => {
                  setTags(selected ? tags.filter((item) => item !== tag) : [...tags, tag]);
                  setSent(false);
                }}
                style={{
                  flexDirection: 'row',
                  gap: 6,
                  alignItems: 'center',
                  paddingHorizontal: 13,
                  paddingVertical: 9,
                  minWidth: selected && tag === options[0] ? 125 : undefined,
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: selected ? c.brand : c.border,
                  backgroundColor: selected ? c.soft : '#FFFFFF',
                }}
              >
                {selected ? <Artwork source={a.imgCheck} width={14} /> : null}
                <T weight="medium" color={selected ? c.brand : c.muted}>
                  {tag}
                </T>
              </Pressable>
            );
          })}
        </View>
        <EventField
          label="Chia sẻ cảm nhận"
          accessibilityLabel="Chia sẻ thêm"
          value={comment}
          onChangeText={(value) => {
            setComment(value);
            setSent(false);
          }}
          multiline
          maxLength={500}
          style={{ minHeight: 84, textAlignVertical: 'top' }}
        />
      </View>
      <T size={12} color={c.muted}>
        Số liệu minh họa cho thiết kế, không phải kết quả được xác minh.
      </T>
      {!registration && !sample ? (
        <T color={c.muted}>Tạo vé mẫu để thử lưu phản hồi trong phiên.</T>
      ) : null}
      {sent ? (
        <T accessibilityRole="alert" color="#237B57">
          {registration
            ? 'Đã lưu phản hồi trong phiên demo, chưa gửi ban tổ chức.'
            : 'Đã ghi nhận phản hồi xem trước trên màn này; chưa gửi ban tổ chức.'}
        </T>
      ) : null}
      {album ? (
        <EventSheet title="Album hoạt động" onClose={() => setAlbum(false)}>
          <View style={{ height: 190, borderRadius: 16, overflow: 'hidden' }}>
            {event.id === 'green-class' ? (
              <Artwork
                source={a.imgNhMinhHa}
                width={380}
                height={190}
                fit="cover"
                style={{ width: '100%' }}
              />
            ) : (
              <EventCover event={event} height={190} />
            )}
          </View>
          <T size={12} color={c.muted}>
            Ảnh minh họa từ thiết kế, chưa phải album được ban tổ chức xác minh.
          </T>
          <EventAction title="Đóng album" onPress={() => setAlbum(false)} />
        </EventSheet>
      ) : null}
    </EventFormPage>
  );
}
