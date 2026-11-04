import { useCallback, useRef, useState, type PropsWithChildren } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { PrivateModal as Modal } from '../shared/PrivateModal';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Artwork, DesignLink } from '../../design-system/DesignScreen';
import { registrationArtwork as a } from '../../design-system/event-flow-artwork';
import { Label, Notice } from '../../design-system/ui';
import { useApp } from '../../providers';
import { ApiError, type Schemas } from '../../services/api';
import { eventTimeRange } from './event-time';
import { useCommand, useResource } from '../../services/queries';
import { CommandError, QueryState, RequireAuth } from '../shared/common';
import { EventFlowHeading, EventFlowPage } from './EventFlowParts';
import { AccountButton } from '../onboarding/OnboardingParts';
import { useEventRegistration } from './useEventRegistration';
import { useEventPhase } from './useEventPhase';

export function RegistrationScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useApp();
  return (
    <EventFlowPage title="Đăng ký tham gia">
      <RequireAuth>
        {id ? (
          <RegistrationEntry key={`${user?.id}:${id}`} id={id} />
        ) : (
          <>
            <Notice>Chọn hoạt động để xem điều kiện đăng ký.</Notice>
            <AccountButton title="Khám phá hoạt động" onPress={() => router.replace('/events')} />
          </>
        )}
      </RequireAuth>
    </EventFlowPage>
  );
}

function RegistrationEntry({ id }: { id: string }) {
  const registration = useEventRegistration(id);
  return (
    <QueryState query={registration}>
      {registration.data?.status === 'registered' ? (
        <View style={{ gap: 16 }}>
          <Notice tone="success">Bạn đã đăng ký tham gia hoạt động này.</Notice>
          <Label>
            {registration.data.fullName} · {registration.data.attendeeCount} người
          </Label>
          <AccountButton
            title="Xem vé tham gia"
            onPress={() => router.replace({ pathname: '/event-ticket', params: { id } })}
          />
        </View>
      ) : (
        <RegistrationForm id={id} refreshRegistration={registration.refetch} />
      )}
    </QueryState>
  );
}

function RegistrationForm({
  id,
  refreshRegistration,
}: {
  id: string;
  refreshRegistration: ReturnType<typeof useEventRegistration>['refetch'];
}) {
  const { user, colors } = useApp();
  const query = useResource<Schemas['GreenEvent']>(`/v1/events/${id}`);
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );
  const command = useCommand<Schemas['EventRegistration']>({ feedback: true });
  const working = useRef(false);
  const [checkingRegistration, setCheckingRegistration] = useState(false);
  const [name, setName] = useState(user?.displayName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('');
  const [count, setCount] = useState(1);
  const [role, setRole] = useState<string | null>(null);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [safe, setSafe] = useState(false),
    [contact, setContact] = useState(false);
  const [validation, setValidation] = useState('');
  const item = query.data;
  const { started } = useEventPhase(item);
  const publishedRoles = Array.isArray(item?.details.volunteerRoles)
    ? item.details.volunteerRoles.filter((value): value is string => typeof value === 'string')
    : [];
  const roles = publishedRoles.length ? publishedRoles : ['Tình nguyện viên'];
  const maxCount = Math.min(20, item?.available ?? 0);
  const info =
    typeof item?.details.preparation === 'string'
      ? item.details.preparation
      : 'Hãy xem hướng dẫn do ban tổ chức công bố và xác nhận thời gian, địa điểm trước khi tham gia.';
  return (
    <QueryState query={query}>
      {item ? (
        <>
          <View
            style={{
              backgroundColor: colors.mint,
              borderWidth: 1,
              borderColor: '#DEEBF3',
              borderRadius: 20,
              padding: 16,
              gap: 12,
            }}
          >
            <Label
              family="inter"
              size={12}
              weight="medium"
              color={colors.brand}
              style={{ lineHeight: 17 }}
            >
              {item.topic.toLocaleUpperCase('vi')}
            </Label>
            <Label family="inter" size={16} weight="semibold" style={{ lineHeight: 22 }}>
              {item.title}
            </Label>
            <Label family="inter" size={14} style={{ lineHeight: 20 }}>
              {eventTimeRange(item)}
            </Label>
            <Label family="inter" size={12} color="#677C8C" style={{ lineHeight: 17 }}>
              {item.location}
            </Label>
          </View>
          <View
            style={{
              borderRadius: 14,
              padding: 14,
              backgroundColor: colors.mint,
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <Artwork source={a.info} width={20} />
            <View style={{ flex: 1, gap: 4 }}>
              <Label
                family="inter"
                size={14}
                weight="medium"
                color={colors.brand}
                style={{ lineHeight: 20 }}
              >
                Đăng ký tham gia hoạt động
              </Label>
              <Label family="inter" size={12} color="#677C8C" style={{ lineHeight: 17 }}>
                Xác nhận bên dưới để giữ chỗ và nhận vé tham gia trong ứng dụng.
              </Label>
            </View>
          </View>
          <View style={{ gap: 12 }}>
            <EventFlowHeading>Thông tin người tham gia</EventFlowHeading>
            <RegistrationField
              label="Họ và tên *"
              accessibilityLabel="Họ và tên người tham gia"
              value={name}
              onChangeText={setName}
              maxLength={100}
              editable={!command.isPending}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Label family="inter" size={14} style={{ lineHeight: 20 }}>
                  Số người tham gia
                </Label>
                <Label family="inter" size={12} color="#677C8C" style={{ lineHeight: 17 }}>
                  Bao gồm bạn · Còn {item.available} chỗ · Tối đa 20 người mỗi đăng ký
                </Label>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.mint,
                  borderRadius: 12,
                  paddingHorizontal: 4,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Giảm số người"
                  accessibilityState={{ disabled: count <= 1 || command.isPending }}
                  disabled={count <= 1 || command.isPending}
                  onPress={() => setCount((value) => Math.max(1, value - 1))}
                  style={{
                    width: 36,
                    minHeight: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: count <= 1 ? 0.4 : 1,
                  }}
                >
                  <Artwork source={a.minus} width={18} />
                </Pressable>
                <Label
                  family="inter"
                  size={16}
                  weight="semibold"
                  style={{ minWidth: 20, textAlign: 'center' }}
                >
                  {count}
                </Label>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Tăng số người"
                  accessibilityState={{ disabled: count >= maxCount || command.isPending }}
                  disabled={count >= maxCount || command.isPending}
                  onPress={() => setCount((value) => Math.min(maxCount, value + 1))}
                  style={{
                    width: 36,
                    minHeight: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: count >= maxCount ? 0.4 : 1,
                  }}
                >
                  <Artwork source={a.plus} width={18} />
                </Pressable>
              </View>
            </View>
            <View style={{ gap: 8 }}>
              <Label family="inter" size={14} weight="medium" style={{ lineHeight: 20 }}>
                Vai trò tình nguyện
              </Label>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Chọn vai trò tình nguyện"
                accessibilityState={{ disabled: command.isPending }}
                disabled={command.isPending}
                onPress={() => setRolesOpen(true)}
                style={{
                  backgroundColor: '#F5F9FC',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#DEEBF3',
                  minHeight: 48,
                  padding: 14,
                  flexDirection: 'row',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <Label
                  family="inter"
                  size={14}
                  color={roles.length ? '#172B3D' : '#677C8C'}
                  style={{ flex: 1, lineHeight: 20 }}
                >
                  {role ?? (roles.length ? 'Chọn vai trò' : 'Ban tổ chức chưa công bố vai trò')}
                </Label>
                <Artwork source={a.down} width={18} />
              </Pressable>
            </View>
          </View>
          <View style={{ gap: 12 }}>
            <EventFlowHeading>Thông tin liên hệ</EventFlowHeading>
            <RegistrationField
              label="Số điện thoại *"
              accessibilityLabel="Số điện thoại người tham gia"
              value={phone}
              onChangeText={setPhone}
              maxLength={30}
              keyboardType="phone-pad"
              placeholder="Số điện thoại của bạn"
              editable={!command.isPending}
            />
            <RegistrationField
              label="Email nhận vé *"
              accessibilityLabel="Email nhận vé"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              maxLength={254}
              editable={!command.isPending}
            />
          </View>
          <View style={{ gap: 12 }}>
            <EventFlowHeading>Chuẩn bị trước khi tham gia</EventFlowHeading>
            <Label family="inter" size={14} color="#677C8C" style={{ lineHeight: 20 }}>
              {info}
            </Label>
            <RegistrationAgreement
              checked={safe}
              disabled={command.isPending}
              change={() => setSafe((value) => !value)}
            >
              Tôi đã đọc yêu cầu và đồng ý tuân thủ hướng dẫn an toàn của ban tổ chức.
            </RegistrationAgreement>
            <RegistrationAgreement
              checked={contact}
              disabled={command.isPending}
              change={() => setContact((value) => !value)}
            >
              Cho phép dùng thông tin liên hệ để gửi vé và thông báo về hoạt động này.
            </RegistrationAgreement>
            <Label family="inter" size={12} color="#677C8C" style={{ lineHeight: 17 }}>
              Phí và điều kiện tham gia theo thông báo của ban tổ chức.
            </Label>
          </View>
          <CommandError error={command.error} />
          {validation ? <Notice tone="error">{validation}</Notice> : null}
          {started ? <Notice>Hoạt động đã bắt đầu và ngừng nhận đăng ký mới.</Notice> : null}
          {!started && maxCount === 0 ? <Notice>Hoạt động hiện đã hết chỗ.</Notice> : null}
          {!started && maxCount > 0 && count > maxCount ? (
            <Notice tone="warning">
              Hoạt động chỉ còn {maxCount} chỗ. Hãy giảm số người để tiếp tục.
            </Notice>
          ) : null}
          <AccountButton
            title="Xác nhận đăng ký"
            pending={command.isPending || checkingRegistration}
            disabled={started || count > maxCount}
            onPress={() => {
              if (working.current) return;
              const message =
                Date.parse(item.startsAt) <= Date.now()
                  ? 'Hoạt động đã bắt đầu và ngừng nhận đăng ký mới.'
                  : name.trim().length < 2
                    ? 'Nhập họ và tên ít nhất 2 ký tự.'
                    : !role || !roles.includes(role)
                      ? 'Chọn vai trò tình nguyện.'
                      : !/^\+?[\d ()-]{6,24}$/.test(phone.trim())
                        ? 'Nhập số điện thoại hợp lệ.'
                        : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
                          ? 'Nhập email nhận vé hợp lệ.'
                          : !safe || !contact
                            ? 'Đồng ý hướng dẫn an toàn và cho phép liên hệ để tiếp tục.'
                            : count > maxCount
                              ? 'Hoạt động không còn đủ chỗ cho số người đã chọn.'
                              : '';
              setValidation(message);
              if (message || !role) return;
              working.current = true;
              void command
                .mutateAsync({
                  path: `/v1/events/${id}/registrations`,
                  body: {
                    fullName: name.trim(),
                    attendeeCount: count,
                    volunteerRole: role,
                    phone: phone.trim(),
                    email: email.trim(),
                    safetyConsent: safe,
                    contactConsent: contact,
                  },
                })
                .then(() => router.replace({ pathname: '/event-ticket', params: { id } }))
                .catch(async (error) => {
                  if (error instanceof ApiError && error.code === 'ALREADY_REGISTERED') {
                    router.replace({ pathname: '/event-ticket', params: { id } });
                  } else if (error instanceof ApiError && error.status === 409) {
                    void query.refetch();
                  } else if (
                    !(error instanceof ApiError) ||
                    error.status === 0 ||
                    error.status >= 500
                  ) {
                    setCheckingRegistration(true);
                    try {
                      const result = await refreshRegistration();
                      if (result.isSuccess && result.data?.status === 'registered') {
                        router.replace({ pathname: '/event-ticket', params: { id } });
                      }
                    } finally {
                      setCheckingRegistration(false);
                    }
                  }
                })
                .finally(() => {
                  working.current = false;
                });
            }}
          />
          <DesignLink onPress={() => router.back()} style={{ alignSelf: 'center' }}>
            Quay lại hoạt động
          </DesignLink>
          <Modal
            transparent
            visible={rolesOpen}
            animationType="slide"
            onRequestClose={() => setRolesOpen(false)}
          >
            <View style={{ flex: 1, backgroundColor: '#172B3D55', justifyContent: 'flex-end' }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng vai trò"
                onPress={() => setRolesOpen(false)}
                style={{ position: 'absolute', inset: 0 }}
              />
              <View
                style={{
                  backgroundColor: colors.surface,
                  padding: 24,
                  paddingBottom: 40,
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  gap: 12,
                }}
              >
                <EventFlowHeading>Vai trò tình nguyện</EventFlowHeading>
                {roles.map((value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityLabel={value}
                    accessibilityState={{ checked: role === value }}
                    onPress={() => {
                      setRole(value);
                      setRolesOpen(false);
                    }}
                    style={{
                      minHeight: 48,
                      padding: 14,
                      borderRadius: 12,
                      backgroundColor: colors.mint,
                    }}
                  >
                    <Label family="inter" size={14}>
                      {value}
                    </Label>
                  </Pressable>
                ))}
                <DesignLink onPress={() => setRolesOpen(false)}>Đóng</DesignLink>
              </View>
            </View>
          </Modal>
        </>
      ) : null}
    </QueryState>
  );
}

function RegistrationField({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Label family="inter" size={14} weight="medium" style={{ lineHeight: 20 }}>
        {label}
      </Label>
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        placeholderTextColor="#677C8C"
        style={{
          minHeight: 48,
          padding: 14,
          borderRadius: 12,
          backgroundColor: '#F5F9FC',
          borderWidth: 1,
          borderColor: '#DEEBF3',
          color: '#172B3D',
          fontFamily: 'Inter_400Regular',
          fontSize: 14,
          lineHeight: 20,
        }}
      />
    </View>
  );
}
function RegistrationAgreement({
  checked,
  change,
  children,
  disabled = false,
}: PropsWithChildren<{ checked: boolean; change: () => void; disabled?: boolean }>) {
  const { colors } = useApp();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      aria-checked={checked}
      onPress={change}
      style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 5,
          borderWidth: 1,
          borderColor: colors.brand,
          backgroundColor: checked ? colors.brand : colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2,
        }}
      >
        {checked ? <Artwork source={a.check} width={16} /> : null}
      </View>
      <Label family="inter" size={14} style={{ flex: 1, lineHeight: 20 }}>
        {children}
      </Label>
    </Pressable>
  );
}
