import { useOptionalLocalProfile } from './LocalProfileProvider';
import { useRef, useState, type PropsWithChildren, type ComponentProps } from 'react';
import { Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { PrivateModal as Modal } from './PrivateModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Artwork, DesignLink, DesignScreen, StatusSpace } from '../../design-system/DesignScreen';
import { settingsArtwork as a } from '../../design-system/settings-artwork';
import { Button, Chip, Icon, Label, Notice, Typography } from '../../design-system/ui';
import { useApp } from '../../providers';
import { dateLabel, type Schemas } from '../../services/api';
import { useCommand, useDraft, useResource } from '../../services/queries';
import { useSavePreferences } from '../../services/preferences';
import { CommandError, QueryState, RequireAuth } from './common';
import { AccountButton } from './OnboardingParts';
import { AccountField } from './AuthParts';
import { PinSettings } from './PinSettings';
import { usePin } from './PinProvider';
import { UserAvatar } from './UserAvatar';

type Overlay = 'search' | 'sound' | 'history' | 'pin' | 'timezone';
type Art = ComponentProps<typeof Artwork>['source'];
const entries = [
  {
    title: 'Thay đổi mật khẩu',
    detail: 'Bảo mật tài khoản',
    icon: a.lock,
    category: 'Bảo mật',
    path: '/change-password',
  },
  {
    title: 'Sửa thông tin cá nhân',
    detail: 'Tên, ngày sinh và quốc gia',
    icon: a.user,
    category: 'Hồ sơ',
    path: '/edit-profile',
  },
  {
    title: 'Thông báo',
    detail: 'Xem cập nhật dành cho bạn',
    icon: a.bell,
    category: 'Thông báo',
    path: '/notifications',
  },
  {
    title: 'Âm thanh và rung',
    detail: 'Âm báo và phản hồi thao tác',
    icon: a.sound,
    category: 'Thông báo',
    overlay: 'sound',
  },
  {
    title: 'Lịch sử đăng nhập',
    detail: 'Thiết bị và phiên truy cập',
    icon: a.computer,
    category: 'Bảo mật',
    overlay: 'history',
  },
  {
    title: 'Thiết lập mật mã',
    detail: 'Khóa ứng dụng bằng PIN 6 số',
    icon: a.lock,
    category: 'Bảo mật',
    overlay: 'pin',
  },
  {
    title: 'Múi giờ',
    detail: 'Thời gian hiển thị trong tài khoản',
    icon: a.computer,
    category: 'Hồ sơ',
    overlay: 'timezone',
  },
] as const;

export function SettingsScreen() {
  const { colors, dark, user, theme, logout, status } = useApp();
  const params = useLocalSearchParams<{ overlay?: string }>();
  const localProfile = useOptionalLocalProfile()?.profile;
  const [overlay, setOverlay] = useState<Overlay | null>(() =>
    ['search', 'sound', 'history', 'pin', 'timezone'].includes(params.overlay ?? '')
      ? (params.overlay as Overlay)
      : null,
  );
  const [logoutError, setLogoutError] = useState<unknown>();
  const query = useResource<Schemas['Preferences']>('/v1/me/preferences', true);
  const save = useSavePreferences();
  const background = dark ? colors.surface : '#F2F2F2';
  const ink = dark ? colors.text : '#000000';
  const openEntry = (entry: (typeof entries)[number]) => {
    if ('path' in entry) router.push(entry.path);
    else setOverlay(entry.overlay);
  };
  return (
    <Typography.Provider value="inter">
      <View style={{ flex: 1, backgroundColor: '#147CC1' }}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <StatusSpace />
          <View
            style={{
              minHeight: 49,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 18,
              gap: 12,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}
              style={{ width: 44, height: 49, justifyContent: 'center' }}
            >
              <Artwork source={a.back} width={30} />
            </Pressable>
            <Label
              family="inter"
              size={32}
              bold
              heading
              color="#FFFFFF"
              style={{ flex: 1, textAlign: 'center', lineHeight: 39 }}
            >
              Cài đặt
            </Label>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tìm kiếm cài đặt"
              onPress={() => setOverlay('search')}
              style={{
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 22,
                backgroundColor: '#F2F2F2',
              }}
            >
              <Artwork source={a.search} width={24} />
            </Pressable>
          </View>
          <View style={{ marginTop: 20, marginHorizontal: 18, gap: 16 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Hồ sơ cá nhân"
              onPress={() => router.push(user ? '/profile' : '/login')}
              style={{
                minHeight: 85,
                borderRadius: 30,
                backgroundColor: background,
                paddingVertical: 5,
                paddingLeft: 38,
                paddingRight: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <View style={{ flex: 1, gap: 8 }}>
                <Label family="inter" size={16} bold color={ink}>
                  {localProfile?.displayName ?? user?.displayName ?? 'Chào bạn!'}
                </Label>
                <Label family="inter" size={16} color={ink}>
                  {localProfile?.email ?? user?.email ?? 'Đăng nhập để lưu cài đặt'}
                </Label>
              </View>
              <View
                style={{
                  width: 75,
                  height: 75,
                  borderRadius: 38,
                  backgroundColor: colors.soft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {user ? (
                  <UserAvatar userId={user.id} name={user.displayName} size={75} />
                ) : (
                  <Icon name="person-outline" size={36} />
                )}
              </View>
            </Pressable>
            <View
              style={{
                borderRadius: 30,
                backgroundColor: background,
                paddingVertical: 8,
                marginTop: 14,
              }}
            >
              {(['dark', 'light'] as const).map((value, index) => (
                <View key={value}>
                  {index ? (
                    <View
                      style={{
                        height: 1,
                        backgroundColor: colors.border,
                        marginLeft: 69,
                        marginRight: 32,
                      }}
                    />
                  ) : null}
                  <SettingsRow
                    title={value === 'dark' ? 'Giao diện tối' : 'Giao diện sáng'}
                    detail={
                      value === 'dark'
                        ? 'Chế độ ban đêm · Đỡ mỏi mắt'
                        : 'Chế độ ban ngày · Rõ ràng, sáng sủa'
                    }
                    source={value === 'dark' ? a.night : a.day}
                    tile={value === 'dark' ? '#D47FB5' : '#7098FF'}
                    checked={theme === value}
                    disabled={save.isPending || !user}
                    onPress={() => save.mutate({ theme: value })}
                  />
                </View>
              ))}
            </View>
            <View style={{ borderRadius: 30, backgroundColor: background, paddingVertical: 8 }}>
              <SettingsRow
                title="Âm thanh và rung"
                detail="Chế độ âm thanh · Phản hồi thao tác"
                source={a.sound}
                tile="#EF5F5F"
                onPress={() => setOverlay('sound')}
              />
              <View
                style={{
                  height: 1,
                  backgroundColor: colors.border,
                  marginLeft: 69,
                  marginRight: 32,
                }}
              />
              <SettingsRow
                title="Thông báo"
                detail="Cập nhật trong ứng dụng"
                source={a.notifications}
                tile="#99D1EE"
                onPress={() => router.push('/notifications')}
              />
            </View>
            <View
              style={{
                borderRadius: 30,
                backgroundColor: background,
                paddingVertical: 3,
                marginTop: 3,
              }}
            >
              {[entries[0], entries[1], entries[4], entries[5]].map((entry, index) => (
                <View key={entry.title}>
                  {index ? (
                    <View
                      style={{
                        height: 1,
                        backgroundColor: colors.border,
                        marginLeft: 55,
                        marginRight: 32,
                      }}
                    />
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openEntry(entry)}
                    style={{
                      minHeight: 54,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingLeft: 58,
                      paddingRight: 30,
                      paddingVertical: 14,
                    }}
                  >
                    <Label family="inter" size={16} color={ink} style={{ flex: 1 }}>
                      {entry.title}
                    </Label>
                    <Artwork source={a.chevron} width={14} height={18} />
                  </Pressable>
                </View>
              ))}
            </View>
            <CommandError error={save.error ?? logoutError} />
            {status === 'authenticated' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đăng xuất"
                onPress={() =>
                  void logout()
                    .then(() => router.replace('/login'))
                    .catch(setLogoutError)
                }
                style={{
                  minHeight: 68,
                  marginTop: 22,
                  paddingHorizontal: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <Artwork
                  source={a.logout}
                  width={24}
                  style={{ transform: [{ rotate: '180deg' }] }}
                />
                <Label family="inter" size={20} bold color="#FFFFFF">
                  Đăng xuất
                </Label>
              </Pressable>
            ) : (
              <View style={{ marginTop: 20 }}>
                <RequireAuth />
              </View>
            )}
            {user ? (
              <DesignLink
                onPress={() => setOverlay('timezone')}
                style={{
                  alignSelf: 'center',
                  backgroundColor: background,
                  paddingHorizontal: 20,
                  borderRadius: 18,
                }}
              >
                Múi giờ · {query.data?.timezone ?? '…'}
              </DesignLink>
            ) : null}
            {user ? (
              <DesignLink
                onPress={() => save.mutate({ theme: 'system' })}
                style={{
                  alignSelf: 'center',
                  backgroundColor: background,
                  paddingHorizontal: 20,
                  borderRadius: 18,
                }}
              >
                Dùng giao diện hệ thống{theme === 'system' ? ' ✓' : ''}
              </DesignLink>
            ) : null}
            <DesignLink
              onPress={() => router.push('/legal')}
              style={{
                alignSelf: 'center',
                backgroundColor: background,
                paddingHorizontal: 20,
                borderRadius: 18,
              }}
            >
              Điều khoản và bảo mật
            </DesignLink>
          </View>
        </ScrollView>
        {overlay ? (
          <SettingsSheet
            key={overlay}
            name={overlay}
            close={() => setOverlay(null)}
            change={setOverlay}
          >
            <RequireAuth>
              {overlay === 'sound' ? (
                <SoundSettings close={() => setOverlay(null)} />
              ) : overlay === 'history' ? (
                <SessionSettings close={() => setOverlay(null)} />
              ) : overlay === 'timezone' ? (
                <TimezoneSettings close={() => setOverlay(null)} />
              ) : overlay === 'pin' ? (
                <PinSettings close={() => setOverlay(null)} />
              ) : (
                <SettingsSearch open={openEntry} close={() => setOverlay(null)} />
              )}
            </RequireAuth>
          </SettingsSheet>
        ) : null}
      </View>
    </Typography.Provider>
  );
}

function SettingsRow({
  title,
  detail,
  source,
  tile,
  checked,
  disabled,
  onPress,
}: {
  title: string;
  detail: string;
  source: Art;
  tile: string;
  checked?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors, dark } = useApp();
  return (
    <Pressable
      accessibilityRole={checked === undefined ? 'button' : 'switch'}
      accessibilityLabel={title}
      accessibilityState={{ checked, disabled }}
      aria-checked={checked}
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 64,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        paddingHorizontal: 19,
        paddingVertical: 10,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <View
        style={{
          width: 35,
          height: 35,
          borderRadius: 10,
          backgroundColor: tile,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Artwork source={source} width={24} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Label
          family="inter"
          size={16}
          color={dark ? colors.text : '#000000'}
          style={{ lineHeight: 20 }}
        >
          {title}
        </Label>
        <Label family="inter" size={12} color={colors.muted} style={{ lineHeight: 15 }}>
          {detail}
        </Label>
      </View>
      {checked !== undefined ? (
        <View style={{ width: 38, height: 15, borderRadius: 20, backgroundColor: colors.surface }}>
          <View
            style={{
              position: 'absolute',
              left: checked ? 18 : 0,
              width: 20,
              height: 15,
              borderRadius: 20,
              backgroundColor: '#61B7E5',
              opacity: checked ? 1 : 0.5,
            }}
          />
        </View>
      ) : null}
    </Pressable>
  );
}

export function SettingsSheet({
  name,
  close,
  children,
}: PropsWithChildren<{ name: Overlay; close: () => void; change?: (next: Overlay) => void }>) {
  const { colors } = useApp();
  const pin = usePin();
  const dismiss = () => {
    if (name !== 'pin' || !pin.busy) close();
  };
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wantedHeight =
    name === 'search' ? 760 : name === 'history' ? 680 : name === 'pin' ? 684 : 570;
  const sheetHeight = Math.min(wantedHeight + insets.bottom, height - Math.max(24, insets.top));
  const title = {
    search: 'Tìm kiếm cài đặt',
    sound: 'Âm thanh và rung',
    history: 'Lịch sử đăng nhập',
    pin: 'Thiết lập mã PIN',
    timezone: 'Múi giờ',
  }[name];
  return (
    <Modal transparent visible animationType="slide" onRequestClose={dismiss}>
      <Typography.Provider value="montserrat">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(22,69,97,0.24)',
            justifyContent: name === 'pin' ? 'center' : 'flex-end',
            paddingHorizontal: name === 'pin' ? 24 : 0,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng bảng cài đặt"
            onPress={dismiss}
            style={{ position: 'absolute', top: 0, right: 0, left: 0, bottom: 0 }}
          />
          <View
            accessibilityViewIsModal
            role={Platform.OS === 'web' ? 'dialog' : undefined}
            aria-label={title}
            style={{
              height: sheetHeight,
              backgroundColor: colors.surface,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              borderBottomLeftRadius: name === 'pin' ? 32 : 0,
              borderBottomRightRadius: name === 'pin' ? 32 : 0,
              paddingBottom: insets.bottom,
              overflow: 'hidden',
            }}
          >
            {name !== 'pin' ? (
              <View
                style={{
                  width: 52,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: colors.border,
                  alignSelf: 'center',
                  marginTop: 12,
                }}
              />
            ) : null}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingLeft: 24,
                paddingRight: 22,
                marginTop: name === 'pin' ? 22 : 11,
                minHeight: 54,
              }}
            >
              <Label size={23} bold heading style={{ lineHeight: 32, flex: 1 }}>
                {title}
              </Label>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng"
                onPress={dismiss}
                style={{ width: 44, height: 48, alignItems: 'center', justifyContent: 'center' }}
              >
                <Label size={28} color={colors.muted}>
                  ×
                </Label>
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 16 }}
            >
              {children}
            </ScrollView>
          </View>
        </View>
      </Typography.Provider>
    </Modal>
  );
}

function SoundSettings({ close }: { close: () => void }) {
  const { colors } = useApp();
  const query = useResource<Schemas['Preferences']>('/v1/me/preferences', true);
  const [changes, setChanges] = useState<Partial<Pick<Schemas['Preferences'], 'sound' | 'haptics'>>>(
    {},
  );
  const preview = query.data
    ? {
        sound: changes.sound ?? query.data.sound,
        haptics: changes.haptics ?? query.data.haptics,
      }
    : undefined;
  const dirty =
    preview?.sound !== query.data?.sound || preview?.haptics !== query.data?.haptics;
  const save = useSavePreferences();
  return (
    <QueryState query={query}>
      <Label size={13} color={colors.muted} style={{ lineHeight: 18, marginTop: 6 }}>
        Chọn cách BlueSteps phản hồi với bạn.
      </Label>
      <View style={{ marginTop: 32, gap: 12 }}>
        {(
          [
            {
              key: 'sound',
              title: 'Âm thanh',
              detail: 'Âm báo và hiệu ứng trong ứng dụng',
              source: a.sound,
            },
            {
              key: 'haptics',
              title: 'Rung',
              detail: 'Phản hồi khi hoàn thành thao tác',
              source: a.vibration,
            },
          ] as const
        ).map((item) => {
          const checked = !!preview?.[item.key];
          return (
            <Pressable
              key={item.key}
              accessibilityRole="switch"
              accessibilityLabel={item.title}
              accessibilityState={{ checked, disabled: save.isPending }}
              aria-checked={checked}
              disabled={save.isPending}
              onPress={() =>
                setChanges((current) => {
                  const next = { ...current };
                  if (!checked === query.data?.[item.key]) delete next[item.key];
                  else next[item.key] = !checked;
                  return next;
                })
              }
              style={{
                minHeight: 88,
                borderRadius: 22,
                backgroundColor: colors.background,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <Artwork source={item.source} width={26} />
              <View style={{ flex: 1, gap: 6 }}>
                <Label size={15} weight="semibold" style={{ lineHeight: 22 }}>
                  {item.title}
                </Label>
                <Label size={11} weight="medium" color={colors.muted} style={{ lineHeight: 15 }}>
                  {item.detail}
                </Label>
              </View>
              <View
                style={{
                  width: 54,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: checked ? colors.brand : colors.border,
                  padding: 4,
                }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: colors.surface,
                    marginLeft: checked ? 22 : 0,
                  }}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
      <Label size={12} color={colors.muted} style={{ lineHeight: 17, marginTop: 24 }}>
        Tùy chọn này chỉ áp dụng trong ứng dụng.{'\n'}Bạn vẫn kiểm soát âm lượng trên thiết bị.
      </Label>
      <Button
        title="Thử âm thanh và rung"
        variant="quiet"
        disabled={!preview || (!preview.sound && !preview.haptics)}
        onPress={() => {
          if (preview)
            void import('../../services/feedback')
              .then(({ playFeedback }) => playFeedback(preview))
              .catch(() => {});
        }}
      />
      <View style={{ flex: 1, minHeight: 32 }} />
      <CommandError error={save.error} />
      <AccountButton
        title="Lưu thay đổi"
        pending={save.isPending}
        disabled={!dirty}
        onPress={() => {
          if (dirty)
            void save
              .mutateAsync(changes)
              .then(close)
              .catch(() => {});
        }}
      />
      <DesignLink onPress={close} style={{ alignItems: 'center', marginTop: 3 }}>
        Hủy
      </DesignLink>
    </QueryState>
  );
}

export function SessionsScreen() {
  return (
    <DesignScreen title="Lịch sử đăng nhập">
      <RequireAuth>
        <SessionSettings />
      </RequireAuth>
    </DesignScreen>
  );
}

export function SessionSettings({ close }: { close?: () => void }) {
  const { colors } = useApp();
  const query = useResource<Schemas['SessionList']>('/v1/me/sessions', true);
  const command = useCommand();
  const [selected, setSelected] = useState<string | null>(null);
  const [revoked, setRevoked] = useState(false);
  const working = useRef(false);
  return (
    <>
      <Label
        size={13}
        color={colors.muted}
        style={{ lineHeight: 18, marginTop: 6, marginBottom: 26 }}
      >
        Xem các thiết bị đã truy cập tài khoản của bạn.
      </Label>
      <CommandError error={command.error} />
      {revoked ? <Notice tone="success">Đã thu hồi phiên đăng nhập.</Notice> : null}
      <QueryState
        query={query}
        empty={!query.data?.items.length}
        emptyText="Không có phiên đăng nhập"
      >
        <View style={{ gap: 16 }}>
          {query.data?.items.map((session) => (
            <View
              key={session.id}
              style={{
                minHeight: session.isCurrent ? 112 : 88,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: session.isCurrent ? colors.mint : colors.surface,
                borderRadius: 22,
                padding: 18,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 18,
              }}
            >
              <Artwork
                source={session.deviceLabel?.includes('web') ? a.computer : a.device}
                width={28}
              />
              <View style={{ flex: 1, gap: 7 }}>
                <Label size={15} weight="semibold">
                  {session.deviceLabel ?? 'Thiết bị'}
                </Label>
                {session.isCurrent ? (
                  <Label size={12} weight="semibold" color={colors.brand}>
                    Thiết bị hiện tại
                  </Label>
                ) : null}
                <Label size={11} color={colors.muted}>
                  {dateLabel(session.createdAt)}
                </Label>
              </View>
              {selected === session.id && !session.isCurrent ? (
                <View style={{ gap: 4 }}>
                  <Button
                    title="Xác nhận thu hồi"
                    variant="danger"
                    pending={command.isPending}
                    onPress={() => {
                      if (working.current) return;
                      working.current = true;
                      void command
                        .mutateAsync({ path: `/v1/me/sessions/${session.id}`, method: 'DELETE' })
                        .then(() => {
                          setRevoked(true);
                          setSelected(null);
                        })
                        .catch(() => {})
                        .finally(() => {
                          working.current = false;
                        });
                    }}
                  />
                  <Button
                    title="Hủy"
                    variant="quiet"
                    disabled={command.isPending}
                    onPress={() => {
                      command.reset();
                      setSelected(null);
                    }}
                  />
                </View>
              ) : !session.isCurrent ? (
                <Button
                  title="Thu hồi phiên"
                  variant="quiet"
                  disabled={command.isPending}
                  onPress={() => {
                    command.reset();
                    setRevoked(false);
                    setSelected(session.id);
                  }}
                />
              ) : null}
            </View>
          ))}
        </View>
      </QueryState>
      <View style={{ flex: 1, minHeight: 40 }} />
      <Label size={12} color={colors.muted} style={{ lineHeight: 17, marginBottom: 36 }}>
        Không nhận ra thiết bị? Hãy đăng xuất phiên đó và đổi mật khẩu để bảo vệ tài khoản.
      </Label>
      {close ? <AccountButton title="Đóng lịch sử" onPress={close} /> : null}
    </>
  );
}

function TimezoneSettings({ close }: { close: () => void }) {
  const query = useResource<Schemas['Preferences']>('/v1/me/preferences', true);
  const draft = useDraft(query.data, 'timezone');
  const save = useSavePreferences();
  const timezone = draft.value?.timezone.trim() ?? '';
  let invalidTimezone = false;
  if (timezone) {
    try {
      new Intl.DateTimeFormat('vi-VN', { timeZone: timezone });
      invalidTimezone = /^[+-]/.test(timezone);
    } catch {
      invalidTimezone = true;
    }
  }
  return (
    <QueryState query={query}>
      <View style={{ gap: 24, paddingTop: 24 }}>
        <AccountField
          label="Múi giờ IANA"
          value={draft.value?.timezone ?? ''}
          onChangeText={(value) => {
            draft.change('timezone', value);
            save.reset();
          }}
          editable={!save.isPending}
          error={invalidTimezone ? 'Nhập tên múi giờ như Asia/Ho_Chi_Minh hoặc UTC.' : undefined}
          autoCapitalize="none"
          placeholder="Asia/Ho_Chi_Minh"
        />
        <CommandError error={save.error} />
        <AccountButton
          title="Lưu múi giờ"
          pending={save.isPending}
          disabled={!timezone || invalidTimezone || timezone === query.data?.timezone}
          onPress={() => {
            if (timezone && !invalidTimezone && timezone !== query.data?.timezone)
              void save
                .mutateAsync({ timezone })
                .then(close)
                .catch(() => {});
          }}
        />
      </View>
    </QueryState>
  );
}

const normalizeSettingsSearch = (text: string) =>
  text
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .trim();

function SettingsSearch({
  open,
  close,
}: {
  open: (entry: (typeof entries)[number]) => void;
  close: () => void;
}) {
  const { colors } = useApp();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const terms = normalizeSettingsSearch(search).split(/\s+/).filter(Boolean);
  const results = entries.filter((entry) => {
    if (category !== 'Tất cả' && category !== entry.category) return false;
    const text = normalizeSettingsSearch(`${entry.title} ${entry.detail} ${entry.category}`);
    return terms.every((term) => text.includes(term));
  });
  return (
    <>
      <View style={{ marginTop: 24 }}>
        <AccountField
          label="Từ khóa"
          value={search}
          onChangeText={setSearch}
          placeholder="Nhập từ khóa…"
        />
      </View>
      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 19, marginBottom: 19 }}
      >
        {['Tất cả', 'Bảo mật', 'Thông báo', 'Hồ sơ'].map((value) => (
          <Chip
            key={value}
            label={value}
            selected={category === value}
            onPress={() => setCategory(value)}
          />
        ))}
      </View>
      <View style={{ gap: 8 }}>
        {results.map((entry) => (
          <Pressable
            key={entry.title}
            accessibilityRole="button"
            onPress={() => {
              close();
              open(entry);
            }}
            style={{
              minHeight: 64,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 18,
              backgroundColor: colors.background,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <Artwork source={entry.icon} width={24} />
            <View style={{ flex: 1, gap: 4 }}>
              <Label size={13} weight="semibold">
                {entry.title}
              </Label>
              <Label size={10} color={colors.muted}>
                {entry.detail}
              </Label>
            </View>
            <Artwork source={a.chevron} width={14} height={18} />
          </Pressable>
        ))}
      </View>
      {!results.length ? <Notice>Không tìm thấy cài đặt phù hợp.</Notice> : null}
      <DesignLink onPress={close} style={{ marginTop: 19, alignItems: 'center' }}>
        Hủy tìm kiếm
      </DesignLink>
    </>
  );
}
