import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useApp } from '../../providers';
import { Label } from '../../design-system/ui';
import { Artwork, DesignLink } from '../../design-system/DesignScreen';
import { LegacyCanvas } from '../../design-system/LegacyCanvas';
import { AccountButton, AccountField } from '../auth/AccountLayout';
import {
  assets514_5093 as searchAssets,
  assets514_5096 as soundAssets,
  assets514_5099 as historyAssets,
} from '../../design-system/settings-assets';

export type SettingsOverlayName = 'search' | 'sound' | 'history' | 'pin';
const fold = (value: string) =>
  value
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

export function SettingsOverlay({
  name,
  close,
  change,
}: {
  name: SettingsOverlayName | null;
  close: () => void;
  change: (name: SettingsOverlayName) => void;
}) {
  const { colors, experience, setExperience } = useApp();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [sound, setSound] = useState(experience.soundEnabled);
  const [vibrate, setVibrate] = useState(experience.vibrationEnabled);
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');
  if (!name) return null;
  const height = { search: 760, sound: 570, history: 680, pin: 684 }[name];
  const title = {
    search: 'Tìm kiếm cài đặt',
    sound: 'Âm thanh và rung',
    history: 'Lịch sử đăng nhập',
    pin: 'Thiết lập mã PIN',
  }[name];
  const navigate = (path: Href) => {
    close();
    router.push(path);
  };
  const results = [
    {
      title: 'Thay đổi mật khẩu',
      detail: 'Bảo mật tài khoản',
      category: 'Bảo mật',
      source: searchAssets.imgIconLock,
      press: () => navigate('/change-password'),
    },
    {
      title: 'Sửa thông tin cá nhân',
      detail: 'Tên, email và ảnh đại diện',
      category: 'Hồ sơ',
      source: searchAssets.imgIconUser,
      press: () => navigate('/edit-profile'),
    },
    {
      title: 'Thông báo',
      detail: 'Xem cập nhật dành cho bạn',
      category: 'Thông báo',
      source: searchAssets.imgIconBell,
      press: () => navigate('/notifications'),
    },
    {
      title: 'Âm thanh và rung',
      detail: 'Âm báo và phản hồi thao tác',
      category: 'Thông báo',
      source: searchAssets.imgIconSound,
      press: () => change('sound'),
    },
    {
      title: 'Lịch sử đăng nhập',
      detail: 'Thiết bị và phiên truy cập',
      category: 'Bảo mật',
      source: searchAssets.imgIconComputer,
      press: () => change('history'),
    },
    {
      title: 'Thiết lập mật mã',
      detail: 'Tạo mã PIN gồm 6 chữ số',
      category: 'Bảo mật',
      source: searchAssets.imgIconLock,
      press: () => change('pin'),
    },
  ].filter(
    (item) =>
      (category === 'Tất cả' || item.category === category) &&
      fold(`${item.title} ${item.detail}`).includes(fold(query)),
  );
  return (
    <Modal
      transparent
      animationType="fade"
      visible
      onRequestClose={close}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={{ flex: 1, alignItems: 'center' }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 428 }}>
          <LegacyCanvas height={931} background="transparent" nativeStatus={false}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng bảng cài đặt"
              onPress={close}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 428,
                height: 931,
                backgroundColor: 'rgba(22,69,97,0.24)',
              }}
            />
            <View
              role="dialog"
              aria-modal
              accessibilityLabel={title}
              style={{
                position: 'absolute',
                left: name === 'pin' ? 24 : 0,
                top: name === 'pin' ? 123 : 931 - height,
                width: name === 'pin' ? 380 : 428,
                height,
                backgroundColor: colors.surface,
                borderTopLeftRadius: name === 'pin' ? 30 : 32,
                borderTopRightRadius: name === 'pin' ? 30 : 32,
                borderBottomLeftRadius: name === 'pin' ? 30 : 0,
                borderBottomRightRadius: name === 'pin' ? 30 : 0,
                overflow: 'hidden',
              }}
            >
              {name !== 'pin' ? (
                <View
                  style={{
                    position: 'absolute',
                    top: 12,
                    left: 188,
                    width: 52,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: colors.border,
                  }}
                />
              ) : null}
              <Label
                size={23}
                bold
                heading
                style={{
                  position: 'absolute',
                  left: 24,
                  top: name === 'pin' ? 28 : 39,
                  lineHeight: 32,
                }}
              >
                {title}
              </Label>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={name === 'pin' ? 'Đóng thiết lập PIN' : 'Đóng'}
                onPress={close}
                style={{
                  position: 'absolute',
                  left: name === 'pin' ? 320 : 360,
                  top: name === 'pin' ? 17 : 28,
                  width: 44,
                  height: 48,
                  alignItems: 'center',
                }}
              >
                <Label
                  size={28}
                  weight="medium"
                  color={colors.muted}
                  style={{ lineHeight: 39, marginTop: 4 }}
                >
                  ×
                </Label>
              </Pressable>
              {name === 'search' ? (
                <>
                  <View style={{ position: 'absolute', left: 24, top: 102, width: 380 }}>
                    <AccountField
                      label="Từ khóa"
                      value={query}
                      onChangeText={setQuery}
                      placeholder="Nhập từ khóa…"
                      focusedStyle
                    />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Xóa tìm kiếm"
                    onPress={() => setQuery('')}
                    style={{
                      position: 'absolute',
                      left: 354,
                      top: 131,
                      width: 44,
                      height: 54,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Label
                      size={24}
                      weight="medium"
                      color={colors.muted}
                      style={{ lineHeight: 34 }}
                    >
                      ×
                    </Label>
                  </Pressable>
                  <View
                    style={{
                      position: 'absolute',
                      left: 24,
                      top: 205,
                      flexDirection: 'row',
                      gap: 12,
                    }}
                  >
                    {[
                      { title: 'Tất cả', width: 70 },
                      { title: 'Bảo mật', width: 82 },
                      { title: 'Thông báo', width: 100 },
                      { title: 'Hồ sơ', width: 92 },
                    ].map((item) => (
                      <Pressable
                        key={item.title}
                        accessibilityRole="button"
                        accessibilityState={{ selected: category === item.title }}
                        aria-pressed={category === item.title}
                        onPress={() => setCategory(item.title)}
                        style={{
                          width: item.width,
                          height: 36,
                          borderRadius: 14,
                          borderWidth: category === item.title ? 1 : 0,
                          borderColor: colors.brand,
                          backgroundColor:
                            category === item.title ? colors.mint : colors.background,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Label
                          size={11}
                          weight="semibold"
                          color={colors.brand}
                          style={{ lineHeight: 15 }}
                        >
                          {item.title}
                        </Label>
                      </Pressable>
                    ))}
                  </View>
                  <ScrollView
                    style={{ position: 'absolute', left: 24, top: 260, width: 380, height: 424 }}
                    contentContainerStyle={{ gap: 8 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    {results.length ? (
                      results.map((item) => (
                        <Pressable
                          key={item.title}
                          accessibilityRole="button"
                          accessibilityLabel={item.title}
                          onPress={item.press}
                          style={{
                            height: 64,
                            borderRadius: 18,
                            backgroundColor: colors.background,
                          }}
                        >
                          <Artwork
                            source={item.source}
                            width={25}
                            style={{ position: 'absolute', left: 14, top: 19 }}
                          />
                          <View style={{ position: 'absolute', left: 52, top: 12, gap: 4 }}>
                            <Label size={13} weight="semibold" style={{ lineHeight: 18 }}>
                              {item.title}
                            </Label>
                            <Label
                              size={10}
                              weight="medium"
                              color={colors.muted}
                              style={{ lineHeight: 14 }}
                            >
                              {item.detail}
                            </Label>
                          </View>
                          <Artwork
                            source={searchAssets.imgIconChevron}
                            width={18}
                            style={{ position: 'absolute', left: 348, top: 23 }}
                          />
                        </Pressable>
                      ))
                    ) : (
                      <Label
                        size={13}
                        color={colors.muted}
                        style={{ padding: 20, textAlign: 'center' }}
                      >
                        Không tìm thấy cài đặt phù hợp.
                      </Label>
                    )}
                  </ScrollView>
                  <DesignLink
                    onPress={close}
                    style={{
                      position: 'absolute',
                      top: 700,
                      left: 24,
                      width: 380,
                      alignItems: 'center',
                    }}
                  >
                    Hủy tìm kiếm
                  </DesignLink>
                </>
              ) : null}
              {name === 'sound' ? (
                <>
                  <Label
                    size={13}
                    color={colors.muted}
                    style={{ position: 'absolute', left: 24, top: 88, lineHeight: 18 }}
                  >
                    Chọn cách GreenSteps phản hồi với bạn.
                  </Label>
                  {[
                    {
                      title: 'Âm thanh',
                      detail: 'Âm báo và hiệu ứng trong ứng dụng',
                      source: soundAssets.imgIconSound,
                      selected: sound,
                      set: setSound,
                      y: 138,
                    },
                    {
                      title: 'Rung',
                      detail: 'Phản hồi khi hoàn thành thao tác',
                      source: soundAssets.imgIconVibrate,
                      selected: vibrate,
                      set: setVibrate,
                      y: 238,
                    },
                  ].map((item) => (
                    <Pressable
                      key={item.title}
                      accessibilityRole="switch"
                      accessibilityLabel={item.title}
                      accessibilityState={{ checked: item.selected }}
                      aria-checked={item.selected}
                      onPress={() => item.set(!item.selected)}
                      style={{
                        position: 'absolute',
                        left: 24,
                        top: item.y,
                        width: 380,
                        height: 88,
                        borderRadius: 22,
                        backgroundColor: colors.background,
                      }}
                    >
                      <Artwork
                        source={item.source}
                        width={26}
                        style={{ position: 'absolute', left: 16, top: 20 }}
                      />
                      <View style={{ position: 'absolute', left: 58, top: 17, gap: 6 }}>
                        <Label size={15} weight="semibold" style={{ lineHeight: 22 }}>
                          {item.title}
                        </Label>
                        <Label
                          size={11}
                          weight="medium"
                          color={colors.muted}
                          style={{ lineHeight: 15 }}
                        >
                          {item.detail}
                        </Label>
                      </View>
                      <View
                        style={{
                          position: 'absolute',
                          left: 308,
                          top: 26,
                          width: 54,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: item.selected ? colors.brand : colors.soft,
                        }}
                      >
                        <View
                          style={{
                            position: 'absolute',
                            left: item.selected ? 26 : 4,
                            top: 4,
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: '#FFFFFF',
                          }}
                        />
                      </View>
                    </Pressable>
                  ))}
                  <Label
                    size={12}
                    color={colors.muted}
                    style={{ position: 'absolute', left: 24, top: 350, lineHeight: 17 }}
                  >
                    Tùy chọn này chỉ áp dụng trong ứng dụng.{'\n'}Bạn vẫn kiểm soát âm lượng trên
                    thiết bị.
                  </Label>
                  <View style={{ position: 'absolute', left: 24, top: 448, width: 380 }}>
                    <AccountButton
                      title="Lưu thay đổi"
                      onPress={() => {
                        setExperience((current) => ({
                          ...current,
                          soundEnabled: sound,
                          vibrationEnabled: vibrate,
                        }));
                        close();
                      }}
                    />
                  </View>
                  <DesignLink
                    onPress={close}
                    style={{
                      position: 'absolute',
                      left: 24,
                      top: 507,
                      width: 380,
                      alignItems: 'center',
                    }}
                  >
                    Hủy
                  </DesignLink>
                </>
              ) : null}
              {name === 'history' ? (
                <>
                  <Label
                    size={13}
                    color={colors.muted}
                    style={{ position: 'absolute', left: 24, top: 88, lineHeight: 18 }}
                  >
                    Xem các thiết bị đã truy cập tài khoản của bạn.
                  </Label>
                  <View
                    style={{
                      position: 'absolute',
                      left: 24,
                      top: 132,
                      width: 380,
                      height: 112,
                      borderRadius: 24,
                      backgroundColor: colors.mint,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Artwork
                      source={historyAssets.imgIconDevice}
                      width={32}
                      style={{ position: 'absolute', left: 15, top: 21 }}
                    />
                    <View style={{ position: 'absolute', left: 63, top: 16, gap: 7 }}>
                      <Label size={15} weight="semibold" style={{ lineHeight: 22 }}>
                        iPhone · GreenSteps
                      </Label>
                      <Label
                        size={12}
                        weight="semibold"
                        color={colors.brand}
                        style={{ lineHeight: 17 }}
                      >
                        Thiết bị hiện tại
                      </Label>
                      <Label
                        size={11}
                        weight="medium"
                        color={colors.muted}
                        style={{ lineHeight: 15 }}
                      >
                        Đang hoạt động
                      </Label>
                    </View>
                  </View>
                  {['Chrome · Windows', 'Safari · macOS'].map((device, index) => (
                    <View
                      key={device}
                      style={{
                        position: 'absolute',
                        left: 24,
                        top: 264 + index * 104,
                        width: 380,
                        height: 88,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 22,
                        backgroundColor: colors.surface,
                      }}
                    >
                      <Artwork
                        source={historyAssets.imgIconComputer}
                        width={29}
                        style={{ position: 'absolute', left: 15, top: 26 }}
                      />
                      <View style={{ position: 'absolute', left: 59, top: 15, gap: 8 }}>
                        <Label size={14} weight="semibold" style={{ lineHeight: 20 }}>
                          {device}
                        </Label>
                        <Label
                          size={11}
                          weight="medium"
                          color={colors.muted}
                          style={{ lineHeight: 15 }}
                        >
                          Đăng nhập gần đây
                        </Label>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Đăng xuất ${device}`}
                        onPress={() =>
                          setMessage(
                            'Đây là thiết bị minh họa. Chưa có phiên đăng nhập thật để đăng xuất.',
                          )
                        }
                        style={{
                          position: 'absolute',
                          left: 267,
                          top: 19,
                          width: 96,
                          height: 48,
                          alignItems: 'flex-end',
                          justifyContent: 'center',
                        }}
                      >
                        <Label
                          size={13}
                          weight="semibold"
                          color={colors.brand}
                          style={{ lineHeight: 18 }}
                        >
                          Đăng xuất
                        </Label>
                      </Pressable>
                    </View>
                  ))}
                  <Label
                    size={12}
                    color={colors.muted}
                    style={{ position: 'absolute', left: 24, top: 526, width: 380, lineHeight: 17 }}
                  >
                    {message ||
                      'Không nhận ra thiết bị? Hãy đăng xuất phiên đó\nvà đổi mật khẩu để bảo vệ tài khoản.'}
                  </Label>
                  <View style={{ position: 'absolute', left: 24, top: 598, width: 380 }}>
                    <AccountButton title="Đóng lịch sử" onPress={close} />
                  </View>
                </>
              ) : null}
              {name === 'pin' ? (
                <>
                  <Label
                    size={13}
                    color={colors.muted}
                    style={{ position: 'absolute', left: 24, top: 75, lineHeight: 18 }}
                  >
                    Thêm một lớp bảo vệ khi mở ứng dụng.
                  </Label>
                  <View
                    accessibilityLabel={`Đã nhập ${pin.length} trên 6 chữ số`}
                    style={{
                      position: 'absolute',
                      left: 64,
                      top: 128,
                      flexDirection: 'row',
                      gap: 24,
                    }}
                  >
                    {Array.from({ length: 6 }, (_, index) => (
                      <View
                        key={index}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          borderWidth: 1,
                          borderColor: colors.border,
                          backgroundColor: index < pin.length ? colors.brand : colors.surface,
                        }}
                      />
                    ))}
                  </View>
                  {[
                    ['1', '2', '3'],
                    ['4', '5', '6'],
                    ['7', '8', '9'],
                    ['', '0', '⌫'],
                  ].map((row, index) => (
                    <View
                      key={index}
                      style={{
                        position: 'absolute',
                        left: 30,
                        top: 204 + index * 72,
                        flexDirection: 'row',
                        gap: 22,
                      }}
                    >
                      {row.map((key, column) =>
                        key ? (
                          <Pressable
                            key={key}
                            accessibilityRole="button"
                            accessibilityLabel={key === '⌫' ? 'Xóa chữ số PIN' : `Phím ${key}`}
                            onPress={() => {
                              setMessage('');
                              setPin((current) =>
                                key === '⌫'
                                  ? current.slice(0, -1)
                                  : current.length < 6
                                    ? current + key
                                    : current,
                              );
                            }}
                            style={{
                              width: 92,
                              height: 60,
                              borderRadius: 18,
                              backgroundColor: colors.background,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Label size={25} weight="medium" style={{ lineHeight: 35 }}>
                              {key}
                            </Label>
                          </Pressable>
                        ) : (
                          <View key={column} style={{ width: 92, height: 60 }} />
                        ),
                      )}
                    </View>
                  ))}
                  {message ? (
                    <Label
                      size={11}
                      color={colors.muted}
                      style={{
                        position: 'absolute',
                        left: 24,
                        top: 495,
                        width: 332,
                        lineHeight: 16,
                      }}
                    >
                      {message}
                    </Label>
                  ) : null}
                  <View style={{ position: 'absolute', left: 24, top: 544, width: 332 }}>
                    <AccountButton
                      title="Tiếp tục"
                      onPress={() => {
                        setMessage(
                          pin.length === 6
                            ? 'Bản xem trước chưa bật khóa ứng dụng hoặc lưu mã PIN.'
                            : 'Nhập đủ 6 chữ số để tiếp tục.',
                        );
                        if (pin.length === 6) setPin('');
                      }}
                    />
                  </View>
                  <DesignLink
                    onPress={close}
                    style={{
                      position: 'absolute',
                      left: 24,
                      top: 608,
                      width: 332,
                      alignItems: 'center',
                    }}
                  >
                    Hủy
                  </DesignLink>
                </>
              ) : null}
            </View>
          </LegacyCanvas>
        </View>
      </View>
    </Modal>
  );
}
