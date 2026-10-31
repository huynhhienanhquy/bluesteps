import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useApp } from '../../providers';
import { Artwork } from '../../design-system/DesignScreen';
import { eventDesignAssets } from '../../design-system/event-design-assets';
import { events } from '../../services/fixtures';
import { saveTicketImage, shareTicketImage } from '../../services/ticket-image';
import { collectionColors as c } from '../collection/CollectionPage';
import { EventMissing, EventSummary } from './EventParts';
import {
  EventAction,
  EventFormPage,
  EventOutlineAction,
  EventSheet,
  EventText as T,
  EventTextAction,
} from './EventFormParts';

const a = eventDesignAssets['534:49416'];
const pattern = require('../../../assets/figma/534-49416/imgQrPattern.png');
const weekdays = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

export function EventTicketScreen() {
  const { id, preview } = useLocalSearchParams<{ id: string; preview?: string }>();
  const event = events.find((item) => item.id === id);
  const { eventPlanning, setEventPlanning } = useApp();
  const sample = preview === '1';
  const stored = id ? eventPlanning.registrations[id] : undefined;
  const registration =
    stored ??
    (sample
      ? { name: 'Nguyễn Minh Anh', people: 1, role: 'Hướng dẫn phân loại rác', checkedIn: false }
      : undefined);
  const card = useRef<ComponentRef<typeof View>>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [saveDenied, setSaveDenied] = useState(false);
  const [contact, setContact] = useState(false);
  const save = async (share = false) => {
    if (!event || !registration || !card.current || busy) return;
    setBusy(true);
    setMessage('');
    setSaveDenied(false);
    try {
      const result = await (share ? shareTicketImage : saveTicketImage)(card, event.id);
      setSaveDenied(result === 'permission-denied');
      setMessage(
        {
          saved: 'Đã lưu ảnh vé mẫu vào thư viện ảnh.',
          downloaded: 'Đã tải ảnh vé mẫu PNG xuống thiết bị.',
          'permission-denied':
            'Chưa có quyền lưu ảnh. Bạn có thể thử lại hoặc chọn Chia sẻ ảnh vé mẫu.',
          'share-opened': 'Đã mở bảng chia sẻ ảnh vé mẫu; bạn quyết định nơi lưu hoặc hủy.',
          unavailable:
            'Thiết bị chưa hỗ trợ chia sẻ ảnh vé. Bạn vẫn có thể sao chép thông tin vé mẫu.',
        }[result],
      );
    } catch {
      setSaveDenied(true);
      setMessage('Chưa lưu được ảnh vé mẫu. Hãy thử lại hoặc chọn chia sẻ ảnh.');
    } finally {
      setBusy(false);
    }
  };
  if (!event)
    return (
      <EventFormPage title="Vé tham gia" frame="534:49416" brandHeader footer={null}>
        <EventMissing />
      </EventFormPage>
    );
  if (!registration)
    return (
      <EventFormPage
        title="Vé tham gia"
        frame="534:49416"
        brandHeader
        footer={
          <EventAction
            title="Mở biểu mẫu đăng ký"
            onPress={() => router.replace(`/registration?id=${event.id}`)}
          />
        }
      >
        <EventSummary event={event} />
        <T>Bạn chưa tạo vé mẫu cho hoạt động này. Lưu hoạt động không tạo đăng ký hoặc vé.</T>
      </EventFormPage>
    );
  const date = event.date.split('-').reverse().join('/');
  const weekday = weekdays[new Date(`${event.date}T00:00:00Z`).getUTCDay()];
  const time = event.time.split(' · ')[0]!.replace(/\s*[–-]\s*/g, '–');
  const early = event.id === 'green-class' ? 'Có mặt lúc 07:45' : 'Có mặt sớm 15 phút';
  return (
    <EventFormPage
      title="Vé tham gia"
      frame="534:49416"
      brandHeader
      footer={
        <>
          <EventAction
            title={busy ? 'Đang tạo ảnh vé mẫu…' : 'Lưu vé vào thiết bị'}
            disabled={busy}
            shadow
            onPress={() => {
              void save();
            }}
          />
          <EventOutlineAction title="Về lịch hoạt động" onPress={() => router.push('/calendar')} />
          <EventOutlineAction
            title="Cài đặt nhắc lịch"
            onPress={() => router.push('/event-reminders')}
          />
          <EventTextAction
            title="Thông tin đăng ký"
            onPress={() =>
              router.push(`/registration?id=${event.id}${sample && !stored ? '&preview=1' : ''}`)
            }
          />
        </>
      }
    >
      <View
        ref={card}
        collapsable={false}
        testID="sample-event-ticket"
        style={{
          borderRadius: 24,
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          boxShadow: '0px 4px 16px rgba(0,0,0,0.08)',
        }}
      >
        <View style={{ backgroundColor: c.brand, padding: 22, gap: 10 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <T size={12} color="#FFFFFF">
              VÉ TÌNH NGUYỆN VIÊN · DEMO
            </T>
            <Artwork source={a.imgLeaf} width={22} />
          </View>
          <T size={28} lineHeight={34} weight="bold" color="#FFFFFF">
            {event.title}
          </T>
          <T color="#FFFFFF">{event.area}</T>
        </View>
        <View style={{ padding: 20, alignItems: 'center', gap: 10 }}>
          <T size={20} lineHeight={24} weight="bold">
            {registration.name}
          </T>
          <T size={12} color={c.muted} style={{ width: '100%', textAlign: 'center' }}>
            {registration.people} người · {registration.role}
          </T>
          <Artwork source={pattern} width={196} />
          <T weight="semibold" color={c.brand}>
            DEMO–{event.id.toUpperCase()}
          </T>
          <T size={12} color={c.muted} style={{ width: '100%', textAlign: 'center' }}>
            QR minh họa · Không dùng để quét thực tế
          </T>
        </View>
        <View style={{ height: 16, flexDirection: 'row', alignItems: 'center' }}>
          <Artwork source={a.imgKhuytVe} width={16} />
          <View
            style={{ flex: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: c.border }}
          />
          <Artwork source={a.imgKhuytVe} width={16} />
        </View>
        <View style={{ padding: 20, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <Artwork source={a.imgCalendarDays} width={22} />
            <View style={{ flex: 1, gap: 4 }}>
              <T size={16} weight="semibold" color={c.brand}>
                {weekday}, {date}
              </T>
              <T color={c.brand}>
                {time} • {early}
              </T>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <Artwork source={a.imgMapPin} width={22} />
            <View style={{ flex: 1, gap: 4 }}>
              <T size={16} weight="semibold" color={c.brand}>
                {event.id === 'green-class' ? 'Cổng chính của trường' : event.area}
              </T>
              <T size={12} color={c.muted}>
                Gặp điều phối viên tại bàn đón tiếp.
              </T>
            </View>
          </View>
        </View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            inset: 0,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 24,
          }}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Liên hệ nhóm tổ chức mẫu"
        onPress={() => setContact(true)}
        style={{
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 20,
          padding: 15,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Artwork source={a.imgVuesaxLinearMessage} width={22} />
        <View style={{ flex: 1, gap: 4 }}>
          <T size={16} weight="semibold" color={c.brand}>
            Nhóm {event.title}
          </T>
          <T size={12} color={c.muted}>
            Liên hệ ban tổ chức · Thông tin minh họa
          </T>
        </View>
        <Artwork source={a.imgPhone} width={22} />
      </Pressable>
      {message ? (
        <T accessibilityRole="alert" size={12} color={c.muted}>
          {message}
        </T>
      ) : null}
      {saveDenied ? (
        <EventOutlineAction
          title="Chia sẻ ảnh vé mẫu"
          onPress={() => {
            void save(true);
          }}
        />
      ) : null}
      {!sample ? (
        <View style={{ gap: 12 }}>
          <T size={12} color={c.muted}>
            Vé mẫu chỉ lưu trong phiên, không có giá trị tham gia thực tế.
          </T>
          <T>Trạng thái: {stored?.checkedIn ? 'Đã check-in mẫu' : 'Chưa check-in mẫu'}</T>
          <EventOutlineAction
            title="Sao chép thông tin vé mẫu"
            onPress={() => {
              void Clipboard.setStringAsync(
                `VÉ MẪU — KHÔNG CÓ GIÁ TRỊ THAM GIA\n${event.title}\n${event.time}\n${event.area}\n${registration.name} · ${registration.people} người · ${registration.role}`,
              )
                .then(() => setMessage('Đã sao chép thông tin vé mẫu.'))
                .catch(() => setMessage('Chưa sao chép được. Hãy thử lại trên thiết bị.'));
            }}
          />
          <EventAction
            title={stored?.checkedIn ? 'Đã check-in mẫu' : 'Mô phỏng check-in'}
            disabled={!stored || stored.checkedIn}
            onPress={() => {
              if (stored)
                setEventPlanning((current) => ({
                  ...current,
                  registrations: {
                    ...current.registrations,
                    [event.id]: { ...stored, checkedIn: true },
                  },
                }));
            }}
          />
          <EventOutlineAction
            title="Xem tổng kết mẫu"
            onPress={() => router.push(`/event-summary?id=${event.id}`)}
          />
        </View>
      ) : null}
      {contact ? (
        <EventSheet title="Liên hệ ban tổ chức" onClose={() => setContact(false)}>
          <T>
            Đây là nhóm minh họa. Chưa có số điện thoại hoặc hội thoại ban tổ chức đã xác minh để
            liên hệ.
          </T>
          <EventAction title="Đóng thông tin liên hệ" onPress={() => setContact(false)} />
        </EventSheet>
      ) : null}
    </EventFormPage>
  );
}
