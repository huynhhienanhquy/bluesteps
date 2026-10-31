import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../providers';
import { Notice } from '../../design-system/ui';
import { events } from '../../services/fixtures';
import { EventMissing } from './EventParts';
import { Artwork } from '../../design-system/DesignScreen';
import { eventDesignAssets } from '../../design-system/event-design-assets';
import { collectionColors as eventColors } from '../collection/CollectionPage';
import { CollectionInfo } from '../collection/CollectionFormParts';
import {
  EventAction,
  EventCheck,
  EventField,
  EventFormPage,
  EventRoleOption,
  EventSheet,
  EventText,
} from './EventFormParts';

const roles = ['Hướng dẫn phân loại rác', 'Hỗ trợ đón tiếp', 'Hỗ trợ hậu cần'];
export function RegistrationScreen() {
  const { id, preview } = useLocalSearchParams<{ id: string; preview?: string }>();
  const event = events.find((item) => item.id === id);
  const { eventPlanning, setEventPlanning } = useApp();
  const existing = id ? eventPlanning.registrations[id] : undefined;
  const sample = preview === '1';
  const [name, setName] = useState(existing?.name ?? (sample ? 'Nguyễn Minh Anh' : ''));
  const [email, setEmail] = useState(
    existing?.email ?? (sample ? 'minhanh.nguyen@example.com' : ''),
  );
  const [phone, setPhone] = useState(existing?.phone ?? (sample ? '090 123 4567' : ''));
  const [people, setPeople] = useState(existing?.people ?? 1);
  const [role, setRole] = useState(existing?.role ?? roles[0]!);
  const [roleOpen, setRoleOpen] = useState(false);
  const [safety, setSafety] = useState(sample);
  const [consent, setConsent] = useState(sample);
  const [checked, setChecked] = useState(false);
  const a = eventDesignAssets['534:49326'];
  const errors = {
    name: name.trim().length < 2 ? 'Nhập tên ít nhất 2 ký tự.' : undefined,
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? 'Nhập email hợp lệ.' : undefined,
    phone: !/^(?:0\d{9}|\+84\d{9})$/.test(phone.replace(/[\s.-]/g, ''))
      ? 'Nhập số điện thoại Việt Nam hợp lệ.'
      : undefined,
  };
  const submit = () => {
    setChecked(true);
    if (!event || Object.values(errors).some(Boolean) || !safety || !consent) return;
    setEventPlanning((current) => ({
      ...current,
      registrations: {
        ...current.registrations,
        [event.id]: {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          people,
          role,
          checkedIn: existing?.checkedIn ?? false,
          feedback: existing?.feedback,
        },
      },
    }));
    router.replace(`/event-ticket?id=${event.id}`);
  };
  if (!event) {
    return (
      <EventFormPage title="Đăng ký tham gia" footer={null}>
        <EventMissing />
      </EventFormPage>
    );
  }
  const date = event.date.split('-').reverse().join('/');
  const time = event.time.split(' · ')[0]!.replace(/\s*[–-]\s*/g, '–');
  return (
    <EventFormPage
      title="Đăng ký tham gia"
      footer={
        <EventAction
          title="Xác nhận đăng ký • Miễn phí"
          label="Xác nhận đăng ký mẫu · Miễn phí"
          onPress={submit}
        />
      }
    >
      <View
        style={{
          padding: 15,
          gap: 10,
          borderWidth: 1,
          borderColor: eventColors.border,
          borderRadius: 20,
          backgroundColor: eventColors.mint,
        }}
      >
        <EventText size={12} color={eventColors.brand}>
          TÌNH NGUYỆN VIÊN • {event.category.toLocaleUpperCase('vi')}
        </EventText>
        <EventText size={16} weight="semibold">
          {event.title}
        </EventText>
        <EventText>
          {date} • {time}
        </EventText>
        <EventText size={12} color={eventColors.muted}>
          {event.area}
        </EventText>
      </View>
      <CollectionInfo
        source={a.imgInfo}
        title="Đăng ký làm tình nguyện viên"
        detail="Thông tin chỉ lưu trong phiên mẫu; chưa gửi ban tổ chức, giữ chỗ hoặc cấp vé thật."
      />
      <View style={{ gap: 12 }}>
        <EventText size={16} weight="semibold" accessibilityRole="header">
          Thông tin người tham gia
        </EventText>
        <EventField
          label="Họ và tên *"
          value={name}
          onChangeText={setName}
          autoComplete="name"
          maxLength={100}
          error={checked ? errors.name : undefined}
        />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <EventText>Số người tham gia</EventText>
            <EventText size={12} color={eventColors.muted}>
              Bao gồm bạn • từ 18 tuổi
            </EventText>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 18,
              padding: 10,
              borderRadius: 12,
              backgroundColor: eventColors.mint,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Giảm số người"
              accessibilityState={{ disabled: people === 1 }}
              disabled={people === 1}
              onPress={() => setPeople(Math.max(1, people - 1))}
              hitSlop={12}
            >
              <Artwork source={a.imgMinus} width={18} />
            </Pressable>
            <EventText
              size={16}
              weight="semibold"
              color="#000000"
              style={{ minWidth: 8, textAlign: 'center' }}
            >
              {people}
            </EventText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tăng số người"
              accessibilityState={{ disabled: people === 5 }}
              disabled={people === 5}
              onPress={() => setPeople(Math.min(5, people + 1))}
              hitSlop={12}
            >
              <Artwork source={a.imgPlus} width={18} />
            </Pressable>
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <EventText weight="medium">Vai trò tình nguyện *</EventText>
          <Pressable
            accessibilityRole="combobox"
            accessibilityLabel="Vai trò tình nguyện"
            accessibilityState={{ expanded: roleOpen }}
            onPress={() => setRoleOpen(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: 48,
              padding: 13,
              gap: 8,
              borderWidth: 1,
              borderColor: eventColors.border,
              borderRadius: 12,
              backgroundColor: '#F5F9FC',
            }}
          >
            <EventText style={{ flex: 1 }}>{role}</EventText>
            <Artwork source={a.imgChevronDown} width={18} />
          </Pressable>
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <EventText size={16} weight="semibold" accessibilityRole="header">
          Thông tin liên hệ
        </EventText>
        <EventField
          label="Số điện thoại *"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          maxLength={20}
          error={checked ? errors.phone : undefined}
        />
        <EventField
          label="Email nhận vé *"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          maxLength={254}
          error={checked ? errors.email : undefined}
        />
      </View>
      <View style={{ gap: 12 }}>
        <EventText size={16} weight="semibold" accessibilityRole="header">
          Chuẩn bị trước khi tham gia
        </EventText>
        <EventText color={eventColors.muted}>
          {event.id === 'green-class'
            ? 'Có mặt lúc 07:45 tại cổng trường. Mang bình nước cá nhân, mặc trang phục gọn gàng; ban tổ chức chuẩn bị học cụ.'
            : 'Có mặt sớm 15 phút tại điểm hẹn. Mang bình nước cá nhân và mặc trang phục gọn gàng.'}
        </EventText>
        <EventCheck
          label="Tôi đã đọc yêu cầu và đồng ý tuân thủ hướng dẫn an toàn của ban tổ chức."
          accessibilityLabel="Tôi đã đọc yêu cầu và đồng ý tuân thủ hướng dẫn an toàn"
          selected={safety}
          onPress={() => setSafety(!safety)}
        />
        <EventCheck
          label="Cho phép dùng thông tin liên hệ để gửi vé và thông báo về hoạt động này."
          accessibilityLabel="Cho phép dùng thông tin liên hệ cho hoạt động này"
          selected={consent}
          onPress={() => setConsent(!consent)}
        />
      </View>
      <EventText size={12} color={eventColors.muted}>
        Miễn phí tham gia. Bạn có thể liên hệ ban tổ chức nếu cần thay đổi đăng ký.
      </EventText>
      {checked && (Object.values(errors).some(Boolean) || !safety || !consent) ? (
        <Notice tone="error">Kiểm tra thông tin và hai mục đồng ý trước khi tiếp tục.</Notice>
      ) : null}
      {roleOpen ? (
        <EventSheet title="Vai trò tình nguyện" onClose={() => setRoleOpen(false)}>
          {roles.map((value) => (
            <EventRoleOption
              key={value}
              value={value}
              selected={role === value}
              onPress={() => {
                setRole(value);
                setRoleOpen(false);
              }}
            />
          ))}
          <EventAction title="Đóng" onPress={() => setRoleOpen(false)} />
        </EventSheet>
      ) : null}
    </EventFormPage>
  );
}

export { EventTicketScreen } from './EventTicketScreen';

export { EventSummaryScreen } from './EventSummaryScreen';
