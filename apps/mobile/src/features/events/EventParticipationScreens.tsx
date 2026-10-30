import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useApp } from '../../providers';
import {
  Button,
  Card,
  Chip,
  Field,
  Icon,
  IconButton,
  Label,
  Notice,
  Row,
} from '../../design-system/ui';
import { events } from '../../services/fixtures';
import { CheckOption, EventMissing, EventPage, EventSummary } from './EventParts';

const roles = ['Hướng dẫn phân loại rác', 'Hỗ trợ đón tiếp', 'Hỗ trợ hậu cần'];
export function RegistrationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = events.find((item) => item.id === id);
  const { eventPlanning, setEventPlanning } = useApp();
  const existing = id ? eventPlanning.registrations[id] : undefined;
  const [name, setName] = useState(existing?.name ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [people, setPeople] = useState(existing?.people ?? 1);
  const [role, setRole] = useState(existing?.role ?? roles[0]!);
  const [safety, setSafety] = useState(false);
  const [consent, setConsent] = useState(false);
  const [checked, setChecked] = useState(false);
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
  return (
    <EventPage title="Đăng ký tham gia">
      {!event ? (
        <EventMissing />
      ) : (
        <>
          <EventSummary event={event} />
          <Notice>
            Thử đăng ký tình nguyện viên trong demo. Thông tin chỉ lưu trong phiên; chưa gửi cho ban
            tổ chức, giữ chỗ hoặc cấp vé thật.
          </Notice>
          <Label size={17} bold heading>
            Thông tin người tham gia
          </Label>
          <Field
            label="Họ và tên *"
            value={name}
            onChangeText={setName}
            autoComplete="name"
            maxLength={100}
            error={checked ? errors.name : undefined}
          />
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Label size={14}>Số người tham gia</Label>
              <Label size={11}>Bao gồm bạn · từ 18 tuổi · tối đa 5 người mẫu</Label>
            </View>
            <IconButton
              name="remove"
              label="Giảm số người"
              onPress={() => setPeople(Math.max(1, people - 1))}
            />
            <Label bold>{people}</Label>
            <IconButton
              name="add"
              label="Tăng số người"
              onPress={() => setPeople(Math.min(5, people + 1))}
            />
          </Row>
          <Label size={14} bold>
            Vai trò tình nguyện *
          </Label>
          {roles.map((value) => (
            <Chip
              key={value}
              label={value}
              selected={role === value}
              onPress={() => setRole(value)}
            />
          ))}
          <Label size={17} bold heading>
            Thông tin liên hệ
          </Label>
          <Field
            label="Số điện thoại *"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            maxLength={20}
            error={checked ? errors.phone : undefined}
          />
          <Field
            label="Email nhận vé *"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            maxLength={254}
            error={checked ? errors.email : undefined}
          />
          <Label size={17} bold heading>
            Chuẩn bị trước khi tham gia
          </Label>
          <Label size={13}>
            Có mặt trước 15 phút tại điểm hẹn. Mang bình nước cá nhân và mặc trang phục gọn gàng.
          </Label>
          <CheckOption
            label="Tôi đã đọc yêu cầu và đồng ý tuân thủ hướng dẫn an toàn"
            selected={safety}
            onPress={() => setSafety(!safety)}
          />
          <CheckOption
            label="Cho phép dùng thông tin liên hệ cho hoạt động này"
            selected={consent}
            onPress={() => setConsent(!consent)}
          />
          {checked && (Object.values(errors).some(Boolean) || !safety || !consent) ? (
            <Notice tone="error">Kiểm tra thông tin và hai mục đồng ý trước khi tiếp tục.</Notice>
          ) : null}
          <Button title="Xác nhận đăng ký mẫu · Miễn phí" onPress={submit} />
        </>
      )}
    </EventPage>
  );
}

export function EventTicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = events.find((item) => item.id === id);
  const { colors, eventPlanning, setEventPlanning } = useApp();
  const registration = id ? eventPlanning.registrations[id] : undefined;
  const [message, setMessage] = useState('');
  return (
    <EventPage title="Vé tham gia">
      {!event ? (
        <EventMissing />
      ) : !registration ? (
        <>
          <EventSummary event={event} />
          <Notice>
            Bạn chưa tạo vé mẫu cho hoạt động này. Lưu hoạt động không tạo đăng ký hoặc vé.
          </Notice>
          <Button
            title="Mở biểu mẫu đăng ký"
            onPress={() => router.replace(`/registration?id=${event.id}`)}
          />
        </>
      ) : (
        <>
          <Notice>Vé minh họa · Không dùng để tham gia hoặc quét thực tế.</Notice>
          <Card style={{ backgroundColor: colors.soft, alignItems: 'center', gap: 18 }}>
            <Label size={12} bold color={colors.brand}>
              VÉ TÌNH NGUYỆN VIÊN · DEMO
            </Label>
            <Label size={24} bold>
              {event.title}
            </Label>
            <Label size={13} style={{ textAlign: 'center' }}>
              {event.area}
            </Label>
            <Label size={19} bold>
              {registration.name}
            </Label>
            <Label size={13}>
              {registration.people} người · {registration.role}
            </Label>
            <View style={{ padding: 20, backgroundColor: colors.surface, borderRadius: 18 }}>
              <Icon name="qr-code-outline" size={124} color={colors.text} />
            </View>
            <Label size={12}>QR minh họa · Không dùng để quét thực tế</Label>
            <Label bold color={colors.brand}>
              DEMO–{event.id.toUpperCase()}
            </Label>
            <Label size={13}>{event.time}</Label>
          </Card>
          <Card>
            <Label bold>Thông tin tham gia</Label>
            <Label size={13}>Có mặt sớm 15 phút · Điểm hẹn: cổng chính</Label>
            <Label size={13}>
              Gặp điều phối viên tại bàn đón tiếp. Thông tin người tổ chức thật chưa được kết nối.
            </Label>
            <Label size={13}>
              Trạng thái: {registration.checkedIn ? 'Đã check-in mẫu' : 'Chưa check-in mẫu'}
            </Label>
          </Card>
          <Button
            title="Sao chép thông tin vé mẫu"
            variant="secondary"
            onPress={() => {
              void Clipboard.setStringAsync(
                `VÉ MẪU — KHÔNG CÓ GIÁ TRỊ THAM GIA\n${event.title}\n${event.time}\n${event.area}\n${registration.name} · ${registration.people} người · ${registration.role}`,
              )
                .then(() => setMessage('Đã sao chép thông tin vé mẫu.'))
                .catch(() => setMessage('Chưa sao chép được. Hãy thử lại trên thiết bị.'));
            }}
          />
          {message ? <Notice>{message}</Notice> : null}
          <Button
            title={registration.checkedIn ? 'Đã check-in mẫu' : 'Mô phỏng check-in'}
            disabled={registration.checkedIn}
            onPress={() => {
              setEventPlanning((current) => ({
                ...current,
                registrations: {
                  ...current.registrations,
                  [event.id]: { ...registration, checkedIn: true },
                },
              }));
            }}
          />
          <Button
            title="Xem tổng kết mẫu"
            variant="secondary"
            onPress={() => router.push(`/event-summary?id=${event.id}`)}
          />
          <Button
            title="Về lịch hoạt động"
            variant="quiet"
            onPress={() => router.push('/calendar')}
          />
        </>
      )}
    </EventPage>
  );
}

export function EventSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = events.find((item) => item.id === id);
  const { colors, eventPlanning, setEventPlanning } = useApp();
  const registration = id ? eventPlanning.registrations[id] : undefined;
  const [rating, setRating] = useState(registration?.feedback?.rating ?? 4);
  const [tags, setTags] = useState<string[]>(registration?.feedback?.tags ?? []);
  const [comment, setComment] = useState(registration?.feedback?.comment ?? '');
  const [sent, setSent] = useState(false);
  return (
    <EventPage title="Tổng kết hoạt động">
      {!event ? (
        <EventMissing />
      ) : (
        <>
          <View style={{ alignItems: 'center', gap: 10 }}>
            <Icon name="leaf-outline" size={54} color={colors.success} />
            <Label size={25} bold heading style={{ textAlign: 'center' }}>
              Cảm ơn bạn đã gieo mầm xanh!
            </Label>
          </View>
          <EventSummary event={event} />
          <Notice>
            Đây là bản xem trước tổng kết. Số liệu minh họa không xác nhận bạn đã tham gia hoặc nhận
            điểm.
          </Notice>
          <Label size={17} bold heading>
            Cùng nhau, chúng ta đã làm được
          </Label>
          <Card>
            <Row>
              {[
                ['200', 'người được hướng dẫn'],
                ['24', 'tình nguyện viên'],
                ['3', 'góc phân loại'],
              ].map(([value, label]) => (
                <View key={label} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <Label size={27} bold color={colors.brand}>
                    {value}
                  </Label>
                  <Label size={11} style={{ textAlign: 'center' }}>
                    {label}
                  </Label>
                </View>
              ))}
            </Row>
            <Label size={11} color={colors.muted}>
              Bộ số liệu mẫu từ thiết kế · chưa có báo cáo tổ chức
            </Label>
          </Card>
          <Label size={17} bold heading>
            Trải nghiệm của bạn thế nào?
          </Label>
          <Row style={{ flexWrap: 'wrap' }}>
            {[1, 2, 3, 4, 5].map((value) => (
              <IconButton
                key={value}
                name={value <= rating ? 'star' : 'star-outline'}
                label={`Đánh giá ${value} sao`}
                selected={value === rating}
                onPress={() => {
                  setRating(value);
                  setSent(false);
                }}
              />
            ))}
          </Row>
          <Label size={13}>
            {rating}/5 · {rating >= 4 ? 'Rất ý nghĩa' : 'Cần cải thiện'}
          </Label>
          <Row style={{ flexWrap: 'wrap' }}>
            {['Tổ chức tốt', 'Nhiều trải nghiệm', 'Cần hướng dẫn thêm'].map((tag) => (
              <Chip
                key={tag}
                label={tag}
                selected={tags.includes(tag)}
                onPress={() => {
                  setTags(
                    tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag],
                  );
                  setSent(false);
                }}
              />
            ))}
          </Row>
          <Field
            label="Chia sẻ thêm"
            value={comment}
            onChangeText={(value) => {
              setComment(value);
              setSent(false);
            }}
            multiline
            maxLength={500}
          />
          {registration ? (
            <Button
              title="Lưu phản hồi trong demo"
              onPress={() => {
                setEventPlanning((current) => ({
                  ...current,
                  registrations: {
                    ...current.registrations,
                    [event.id]: {
                      ...registration,
                      feedback: { rating, tags, comment: comment.trim() },
                    },
                  },
                }));
                setSent(true);
              }}
            />
          ) : (
            <Notice>Tạo vé mẫu để thử lưu phản hồi trong phiên.</Notice>
          )}
          {sent ? (
            <Notice tone="success">Đã lưu phản hồi trong phiên demo, chưa gửi ban tổ chức.</Notice>
          ) : null}
          <Button
            title="Khám phá hoạt động khác"
            variant="secondary"
            onPress={() => router.push('/events')}
          />
        </>
      )}
    </EventPage>
  );
}
