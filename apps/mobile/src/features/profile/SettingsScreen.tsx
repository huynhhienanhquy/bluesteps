import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../providers';
import { Artwork } from '../../design-system/DesignScreen';
import { LegacyCanvas, LegacyStatusBar } from '../../design-system/LegacyCanvas';
import { assets386_8451 as a } from '../../design-system/settings-assets';
import { SettingsOverlay, type SettingsOverlayName } from './SettingsOverlay';

const backward = require('../../../assets/figma/common/back-chevron.png');
const forward = require('../../../assets/figma/common/forward-chevron.svg');
export function SettingsScreen() {
  const { dark, setTheme, experience, resetDemo, colors } = useApp();
  const params = useLocalSearchParams<{ overlay?: string }>();
  const [overlay, setOverlay] = useState<SettingsOverlayName | null>(() =>
    ['search', 'sound', 'history', 'pin'].includes(params.overlay ?? '')
      ? (params.overlay as SettingsOverlayName)
      : null,
  );
  const background = dark ? colors.surface : '#F2F2F2';
  const ink = dark ? colors.text : '#000000';
  const label = (text: string, x: number, y: number, size = 16, bold = false, color = ink) => (
    <Text
      style={{
        position: 'absolute',
        left: x,
        top: y,
        fontFamily: bold ? 'Inter_700Bold' : 'Inter_400Regular',
        fontSize: size,
        color,
      }}
    >
      {text}
    </Text>
  );
  const helper = (first: string, second: string, y: number) => (
    <>
      {label(first, 87, y, 12, false, dark ? colors.muted : '#C3C3C3')}
      <Artwork
        source={a.imgEllipse77}
        width={4}
        style={{ position: 'absolute', left: 192, top: y + 7 }}
      />
      {label(second, 206, y, 12, false, dark ? colors.muted : '#B9B9B9')}
    </>
  );
  return (
    <LegacyCanvas height={931} background="#147CC1">
      <LegacyStatusBar assets={a} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}
        style={{ position: 'absolute', left: 3, top: 59, width: 44, height: 44 }}
      >
        <Artwork source={backward} width={30} style={{ marginLeft: 7, marginTop: 7 }} />
      </Pressable>
      <Text
        accessibilityRole="header"
        style={{
          position: 'absolute',
          left: 150,
          top: 56,
          fontFamily: 'Inter_700Bold',
          fontSize: 32,
          color: '#FFFFFF',
        }}
      >
        Cài đặt
      </Text>
      <Artwork
        source={a.imgEllipse44}
        width={40}
        style={{ position: 'absolute', left: 361, top: 56 }}
      />
      <Artwork
        source={a.imgIconlySharpBoldSearch}
        width={24}
        style={{ position: 'absolute', left: 369, top: 64 }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tìm kiếm cài đặt"
        onPress={() => setOverlay('search')}
        style={{ position: 'absolute', left: 354, top: 49, width: 52, height: 54 }}
      />
      <View
        style={{
          position: 'absolute',
          left: 20,
          top: 123,
          width: 381,
          height: 85,
          borderRadius: 30,
          backgroundColor: background,
        }}
      />
      {label('Healing', 56, 139, 16, true)}
      {label('linhchi@gmail.com', 57, 167)}
      <Artwork
        source={a.imgEllipse10}
        width={75}
        style={{ position: 'absolute', left: 314, top: 128 }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Hồ sơ cá nhân"
        onPress={() => router.push('/profile')}
        style={{ position: 'absolute', left: 20, top: 123, width: 381, height: 85 }}
      />
      <View
        style={{
          position: 'absolute',
          left: 18,
          top: 238,
          width: 381,
          height: 146,
          borderRadius: 30,
          backgroundColor: background,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 18,
          top: 400,
          width: 381,
          height: 146,
          borderRadius: 30,
          backgroundColor: dark ? colors.surface : '#EFEFEF',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 18,
          top: 565,
          width: 381,
          height: 223,
          borderRadius: 30,
          backgroundColor: background,
        }}
      />
      {[
        [264, '#7098FF'],
        [324, '#D47FB5'],
        [425, '#EF5F5F'],
        [487, '#99D1EE'],
      ].map(([top, color]) => (
        <View
          key={top}
          style={{
            position: 'absolute',
            left: 37,
            top: Number(top),
            width: 35,
            height: 35,
            borderRadius: 10,
            backgroundColor: String(color),
          }}
        />
      ))}
      <Artwork
        source={a.imgIconlySharpBoldStar2}
        width={24}
        style={{ position: 'absolute', left: 43.014, top: 271.48 }}
      />
      <Artwork
        source={a.imgIconlySharpBoldStar}
        width={24}
        style={{ position: 'absolute', left: 43.014, top: 331.81 }}
      />
      <Artwork
        source={a.imgIconlySharpBoldVolumeUp1}
        width={24}
        style={{
          position: 'absolute',
          left: 44,
          top: 433.3,
          opacity: experience.soundEnabled ? 1 : 0.4,
        }}
      />
      <Artwork
        source={a.imgIconlySharpBoldVolumeUp}
        width={24}
        style={{ position: 'absolute', left: 44, top: 431 }}
      />
      <Artwork
        source={a.imgIconlySharpBoldPaper}
        width={24}
        style={{ position: 'absolute', left: 41.987, top: 495.664 }}
      />
      {label('Giao diện tối', 87, 261)}
      {label('Giao diện sáng', 87, 323)}
      {helper('Chế độ ban đêm', 'Đỡ mỏi mắt', 282)}
      {helper('Chế độ ban ngày', 'Rõ ràng, sáng sủa', 351)}
      {label('Âm thanh và rung', 87, 421)}
      {label('Thông báo', 87, 486)}
      {helper('Chế độ âm thanh', 'Nhạc chuông', 445)}
      {helper('Thanh tâm trạng', 'Không làm phiền', 514)}
      {[
        { y: 261, left: 337, selected: dark, name: 'Giao diện tối' },
        { y: 323, left: 336, selected: !dark, name: 'Giao diện sáng' },
      ].map((item) => (
        <View key={item.name}>
          <View
            style={{
              position: 'absolute',
              left: item.left,
              top: item.y,
              width: 37,
              height: 15,
              borderRadius: 20,
              backgroundColor: '#FFFFFF',
            }}
          >
            <View
              style={{
                position: 'absolute',
                left: item.selected ? 17 : 0,
                width: 20,
                height: 15,
                borderRadius: 20,
                backgroundColor: '#61B7E5',
                opacity: item.selected ? 1 : 0.5,
              }}
            />
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel={item.name}
            accessibilityState={{ checked: item.selected }}
            aria-checked={item.selected}
            onPress={() => setTheme(dark ? 'light' : 'dark')}
            style={{ position: 'absolute', left: 28, top: item.y - 16, width: 372, height: 61 }}
          />
        </View>
      ))}
      {[
        [87, 310],
        [87, 472],
        [77, 627],
        [73, 685],
        [73, 734],
      ].map(([left, top], index) => (
        <Artwork
          key={index}
          source={a.imgLine5}
          width={280}
          height={1}
          style={{ position: 'absolute', left, top }}
        />
      ))}
      {[
        {
          title: 'Thay đổi mật khẩu',
          y: 589,
          hit: 574,
          iconY: 584,
          press: () => router.push('/change-password'),
        },
        {
          title: 'Sửa thông tin cá nhân',
          y: 647,
          hit: 632,
          iconY: 642,
          press: () => router.push('/edit-profile'),
        },
        {
          title: 'Lịch sử đăng nhập',
          y: 697,
          hit: 688,
          iconY: 692,
          press: () => setOverlay('history'),
        },
        { title: 'Thiết lập mật mã', y: 753, hit: 741, iconY: 748, press: () => setOverlay('pin') },
      ].map((item) => (
        <View key={item.title}>
          {label(item.title, 76, item.y)}
          <Artwork
            source={forward}
            width={9.25}
            height={15}
            style={{
              position: 'absolute',
              left: 354.75,
              top: item.iconY + 7.5,
              transform: [{ rotate: '180deg' }],
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.title}
            onPress={item.press}
            style={{ position: 'absolute', left: 28, top: item.hit, width: 372, height: 54 }}
          />
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Âm thanh và rung"
        onPress={() => setOverlay('sound')}
        style={{ position: 'absolute', left: 28, top: 408, width: 372, height: 61 }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Thông báo"
        onPress={() => router.push('/notifications')}
        style={{ position: 'absolute', left: 28, top: 478, width: 372, height: 62 }}
      />
      {label('Đăng xuất', 69, 841, 20, true)}
      <Artwork
        source={a.imgIconlySharpTwoToneLogout}
        width={24}
        style={{ position: 'absolute', left: 32, top: 839, transform: [{ rotate: '180deg' }] }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đăng xuất"
        onPress={() => {
          resetDemo();
          router.replace('/login');
        }}
        style={{ position: 'absolute', left: 37, top: 826, width: 350, height: 68 }}
      />
      {overlay ? (
        <SettingsOverlay
          key={overlay}
          name={overlay}
          close={() => setOverlay(null)}
          change={setOverlay}
        />
      ) : null}
    </LegacyCanvas>
  );
}
