import { Pressable, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useApp } from '../../providers';
import { Label } from '../../design-system/ui';
import {
  Artwork,
  DesignIconButton,
  DesignLink,
  DesignScreen,
  DesignSection,
  designStyles,
} from '../../design-system/DesignScreen';
import { assets386_7420 as assets } from '../../design-system/screen-assets';
import { mockProfile, mockWallet } from '../../services/mock-session';

export function ProfileOverview() {
  const { colors } = useApp();
  const shortcuts: { title: string; source: number; path: Href }[] = [
    { title: 'Thành tích', source: assets.imgIconTrophy, path: '/achievements' },
    { title: 'Lịch sử', source: assets.imgIconClock, path: '/history' },
    { title: 'Đã lưu', source: assets.imgIconHeart, path: '/saved' },
    { title: 'Thống kê', source: assets.imgIconChart, path: '/statistics' },
  ];
  const menu: { title: string; detail: string; source: number; path: Href }[] = [
    {
      title: 'Thông tin cá nhân',
      detail: 'Cập nhật tên, email và ảnh đại diện',
      source: assets.imgIconUser,
      path: '/edit-profile',
    },
    {
      title: 'Thông báo',
      detail: 'Theo dõi các cập nhật dành cho bạn',
      source: assets.imgIconBell,
      path: '/notifications',
    },
    {
      title: 'Cài đặt ứng dụng',
      detail: 'Giao diện, bảo mật và tùy chọn khác',
      source: assets.imgIconSettings1,
      path: '/settings',
    },
  ];
  const panel = {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    overflow: 'hidden' as const,
  };
  return (
    <DesignScreen
      title="Cá nhân"
      action={
        <DesignIconButton
          source={assets.imgIconSettings}
          label="Cài đặt"
          onPress={() => router.push('/settings')}
        />
      }
    >
      <View
        style={{ height: 220, backgroundColor: colors.brand, borderRadius: 28, overflow: 'hidden' }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chỉnh sửa ảnh đại diện"
          onPress={() => router.push('/edit-profile')}
          style={{
            position: 'absolute',
            left: 20,
            top: 22,
            padding: 4,
            backgroundColor: '#FFFFFF',
            borderRadius: 42,
          }}
        >
          <Artwork source={assets.imgLinhChi} width={76} fit="cover" style={{ borderRadius: 38 }} />
        </Pressable>
        <View style={{ position: 'absolute', left: 120, top: 24, gap: 7 }}>
          <Label size={26} bold color={colors.heroText} style={{ lineHeight: 36 }}>
            {mockProfile.displayName}
          </Label>
          <Label size={12} weight="medium" color={colors.heroText} style={{ lineHeight: 18 }}>
            linhchi@example.com
          </Label>
          <Label size={9} weight="semibold" color={colors.heroText} style={{ lineHeight: 13 }}>
            THÀNH VIÊN BLUESTEPS
          </Label>
        </View>
        <Label
          size={13}
          weight="semibold"
          color={colors.heroText}
          style={{ position: 'absolute', left: 20, top: 124, lineHeight: 18 }}
        >
          Cấp độ 2 · Chiến binh tái chế
        </Label>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/edit-profile')}
          style={[
            designStyles.whiteButton,
            { position: 'absolute', top: 159, left: 20, width: 205 },
          ]}
        >
          <Label size={15} weight="semibold" color="#164561" style={{ lineHeight: 22 }}>
            Chỉnh sửa hồ sơ
          </Label>
        </Pressable>
        <Artwork
          source={assets.imgMmXanhTrenThThanhVien}
          width={82}
          height={94}
          style={{ position: 'absolute', right: 20, top: 113 }}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Điểm hiện có"
          onPress={() => router.push('/rewards')}
          style={[panel, { flex: 1, height: 116, padding: 13 }]}
        >
          <Artwork source={assets.imgIconGift} width={25} />
          <Label size={29} bold color={colors.brand} style={{ lineHeight: 41, marginTop: 6 }}>
            {mockWallet.balance}
          </Label>
          <Label size={11} weight="medium" color={colors.muted} style={{ lineHeight: 15 }}>
            Điểm hiện có
          </Label>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tiến độ cấp độ"
          onPress={() => router.push('/achievements')}
          style={[panel, { flex: 1, height: 116, padding: 13 }]}
        >
          <Artwork source={assets.imgIconLeaf} width={25} />
          <Label size={23} bold style={{ lineHeight: 32, marginTop: 6 }}>
            120 / 200
          </Label>
          <View
            style={{ height: 5, backgroundColor: colors.border, borderRadius: 3, marginTop: 5 }}
          >
            <View
              style={{ width: '60%', height: 5, backgroundColor: colors.brand, borderRadius: 3 }}
            />
          </View>
          <Label
            size={10}
            weight="medium"
            color={colors.muted}
            style={{ lineHeight: 14, marginTop: 7 }}
          >
            Tiến độ cấp độ
          </Label>
        </Pressable>
      </View>
      <View style={{ gap: 12 }}>
        <DesignSection title="Hành trình của bạn" />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {shortcuts.map((item) => (
            <Pressable
              key={item.title}
              accessibilityRole="button"
              onPress={() => router.push(item.path)}
              style={{ flex: 1, height: 94, alignItems: 'center' }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 18,
                  borderWidth: 1,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Artwork source={item.source} width={26} />
              </View>
              <Label size={11} weight="semibold" style={{ lineHeight: 15, marginTop: 12 }}>
                {item.title}
              </Label>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <DesignSection title="Tài khoản của bạn" />
        <View style={panel}>
          {menu.map((item, index) => (
            <View key={item.title}>
              {index > 0 ? (
                <View
                  style={{
                    height: 1,
                    marginLeft: 69,
                    marginRight: 16,
                    backgroundColor: colors.border,
                  }}
                />
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(item.path)}
                style={{
                  height: index === 0 ? 77 : 77,
                  paddingHorizontal: 15,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 14,
                    backgroundColor: colors.mint,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Artwork source={item.source} width={22} />
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <Label size={14} weight="semibold" style={{ lineHeight: 20 }}>
                    {item.title}
                  </Label>
                  <Label size={10} weight="medium" color={colors.muted} style={{ lineHeight: 14 }}>
                    {item.detail}
                  </Label>
                </View>
                <Artwork source={assets.imgIconChevron} width={19} />
              </Pressable>
            </View>
          ))}
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <DesignSection
          title="Hoạt động gần đây"
          action="Xem tất cả"
          onPress={() => router.push('/history')}
        />
        <View style={panel}>
          {[
            { title: 'Hoàn thành 3 việc', time: '08:00 · Hôm nay', source: assets.imgIconRecycle },
            { title: 'Thắng giải game', time: 'Hôm qua', source: assets.imgIconTrophy1 },
          ].map((item, index) => (
            <View key={item.title}>
              {index > 0 ? (
                <View
                  style={{
                    height: 1,
                    marginLeft: 71,
                    marginRight: 16,
                    backgroundColor: colors.border,
                  }}
                />
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/history')}
                style={{
                  height: 85,
                  paddingHorizontal: 15,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    backgroundColor: colors.mint,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Artwork source={item.source} width={24} />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <Label size={13} weight="semibold" style={{ lineHeight: 18 }}>
                    {item.title}
                  </Label>
                  <Label size={11} weight="medium" color={colors.muted} style={{ lineHeight: 15 }}>
                    {item.time}
                  </Label>
                </View>
                <Label size={14} weight="semibold" color={colors.brand}>
                  +60
                </Label>
              </Pressable>
            </View>
          ))}
        </View>
      </View>
      <View style={{ height: 136, borderRadius: 26, backgroundColor: colors.mint }}>
        <Artwork
          source={assets.imgIconPeople}
          width={36}
          style={{ position: 'absolute', left: 20, top: 21 }}
        />
        <Label size={18} bold style={{ position: 'absolute', left: 72, top: 19, lineHeight: 25 }}>
          Hành trình xanh,{'\n'}cùng nhau sẽ vui hơn.
        </Label>
        <DesignLink
          onPress={() => router.push('/community')}
          style={{ position: 'absolute', left: 20, top: 81 }}
        >
          Ghé thăm cộng đồng →
        </DesignLink>
      </View>
      <Label
        size={11}
        weight="medium"
        color={colors.muted}
        style={{ textAlign: 'center', lineHeight: 15 }}
      >
        Một hành động nhỏ, một phiên bản tốt hơn.
      </Label>
    </DesignScreen>
  );
}
