import { useOptionalLocalProfile } from './LocalProfileProvider';
import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useApp } from '../../providers';
import { Button, Icon, Label } from '../../design-system/ui';
import {
  Artwork,
  DesignIconButton,
  DesignLink,
  DesignScreen,
  DesignSection,
} from '../../design-system/DesignScreen';
import { profileArtwork as a } from '../../design-system/catalog-artwork';
import { usePages, useResource } from '../../services/queries';
import { dateLabel, type Schemas } from '../../services/api';
import { CommandError, RequireAuth } from '../shared/common';
import { UserAvatar } from './UserAvatar';
import {
  pointTransactionDestination,
  pointTransactionTitle,
} from '../collection/point-transaction';

const shortcuts: { title: string; source: number; path: Href }[] = [
  { title: 'Thành tích', source: a.trophy, path: '/achievements' },
  { title: 'Lịch sử', source: a.clock, path: '/history' },
  { title: 'Đã lưu', source: a.heart, path: '/saved' },
  { title: 'Thống kê', source: a.chart, path: '/statistics' },
];
const menu: { title: string; detail: string; source: number; path: Href }[] = [
  {
    title: 'Thông tin cá nhân',
    detail: 'Cập nhật tên, email và giới thiệu',
    source: a.user,
    path: '/edit-profile',
  },
  {
    title: 'Thông báo',
    detail: 'Theo dõi các cập nhật dành cho bạn',
    source: a.bell,
    path: '/notifications',
  },
  {
    title: 'Cài đặt ứng dụng',
    detail: 'Giao diện, bảo mật và tùy chọn khác',
    source: a.preferences,
    path: '/settings',
  },
];
export function ProfileOverview() {
  const { user, status, colors, logout } = useApp();
  const localProfile = useOptionalLocalProfile()?.profile;
  const [error, setError] = useState<unknown>(null);
  const [signingOut, setSigningOut] = useState(false);
  const logoutInFlight = useRef(false);
  const wallet = useResource<Schemas['Wallet']>('/v1/me/wallet', true, false);
  const stats = useResource<{
    sortingActions: number;
    verifiedKg: number | null;
    wallet: Schemas['Wallet'];
  }>('/v1/me/statistics', true, false);
  const ledger = usePages<Schemas['PointTransaction']>('/v1/me/point-transactions', true, false);
  const entries = ledger.data?.pages.flatMap((page) => page.items).slice(0, 2) ?? [];
  const panel = {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    overflow: 'hidden' as const,
  };
  return (
    <DesignScreen
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <DesignIconButton
            source={a.back}
            label="Về trang chủ"
            onPress={() => router.replace('/')}
          />
          <Label size={19} bold heading style={{ lineHeight: 27, flex: 1, textAlign: 'center' }}>
            Cá nhân
          </Label>
          <DesignIconButton
            source={a.settings}
            label="Cài đặt"
            onPress={() => router.push('/settings')}
          />
        </View>
      }
    >
      <View
        style={{
          minHeight: 220,
          backgroundColor: colors.brand,
          borderRadius: 28,
          overflow: 'hidden',
          padding: 20,
          gap: 18,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chỉnh sửa hồ sơ"
            onPress={() => router.push(user ? '/edit-profile' : '/login')}
            style={{
              width: 84,
              height: 84,
              padding: 4,
              backgroundColor: colors.surface,
              borderRadius: 42,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {user ? (
              <UserAvatar
                userId={user.id}
                name={user.displayName}
                size={76}
                foreground={colors.brand}
              />
            ) : (
              <Icon name="person-outline" size={40} />
            )}
          </Pressable>
          <View style={{ flex: 1, gap: 7 }}>
            <Label size={26} bold color={colors.heroText} style={{ lineHeight: 36 }}>
              {localProfile?.displayName ?? user?.displayName ?? 'Chào bạn!'}
            </Label>
            <Label size={12} weight="medium" color={colors.heroText} style={{ lineHeight: 18 }}>
              {localProfile?.email ?? user?.email ?? 'Đăng nhập để lưu hành trình'}
            </Label>
            <Label size={9} weight="semibold" color={colors.heroText} style={{ lineHeight: 13 }}>
              {user ? 'THÀNH VIÊN BLUESTEPS' : 'BLUESTEPS · MỖI NGÀY XANH'}
            </Label>
          </View>
        </View>
        <Label
          size={13}
          weight="semibold"
          color={colors.heroText}
          style={{ lineHeight: 18, maxWidth: '70%' }}
        >
          {(localProfile?.bio ?? user?.bio) || 'Một hành động nhỏ mỗi ngày.'}
        </Label>
        <DesignLink
          onPress={() => router.push(user ? '/edit-profile' : '/login')}
          style={{
            minHeight: 40,
            alignSelf: 'flex-start',
            paddingHorizontal: 16,
            borderRadius: 14,
            backgroundColor: colors.surface,
          }}
        >
          {user ? 'Chỉnh sửa hồ sơ' : 'Đăng nhập'}
        </DesignLink>
        <Artwork
          source={a.sprout}
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
          style={[panel, { flex: 1, minHeight: 116, padding: 13, paddingBottom: 8 }]}
        >
          <Artwork source={a.gift} width={25} />
          <Label size={29} bold color={colors.brand} style={{ lineHeight: 41, marginTop: 6 }}>
            {wallet.data?.balance ?? '—'}
          </Label>
          <Label size={11} weight="medium" color={colors.muted} style={{ lineHeight: 15 }}>
            Điểm hiện có
          </Label>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hành động phân loại"
          onPress={() => router.push('/statistics')}
          style={[panel, { flex: 1, minHeight: 116, padding: 13, paddingBottom: 8 }]}
        >
          <Artwork source={a.leaf} width={25} />
          <Label size={23} bold style={{ lineHeight: 32, marginTop: 6 }}>
            {stats.data?.sortingActions ?? '—'}
          </Label>
          <View
            style={{ height: 5, borderRadius: 3, backgroundColor: colors.border, marginTop: 5 }}
          />
          <Label
            size={10}
            weight="medium"
            color={colors.muted}
            style={{ lineHeight: 14, marginTop: 7 }}
          >
            Hành động phân loại
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
              accessibilityLabel={item.title}
              onPress={() => router.push(item.path)}
              style={{ flex: 1, minHeight: 94, alignItems: 'center' }}
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
              {index ? (
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
                accessibilityLabel={item.title}
                onPress={() => router.push(item.path)}
                style={{
                  minHeight: 77,
                  paddingHorizontal: 15,
                  paddingVertical: 12,
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
                <Artwork source={a.chevron} width={19} />
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
        <RequireAuth>
          {entries.length ? (
            <View style={panel}>
              {entries.map((entry, index) => (
                <View key={entry.id}>
                  {index ? (
                    <View
                      style={{ height: 1, marginHorizontal: 16, backgroundColor: colors.border }}
                    />
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push(pointTransactionDestination(entry) ?? '/history')}
                    style={{
                      minHeight: 85,
                      padding: 15,
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
                      <Artwork source={a.recycle} width={24} />
                    </View>
                    <View style={{ flex: 1, gap: 6 }}>
                      <Label size={13} weight="semibold" style={{ lineHeight: 18 }}>
                        {pointTransactionTitle(entry)}
                      </Label>
                      <Label
                        size={11}
                        weight="medium"
                        color={colors.muted}
                        style={{ lineHeight: 15 }}
                      >
                        {dateLabel(entry.createdAt)}
                      </Label>
                    </View>
                    <Label size={14} weight="semibold" color={colors.brand}>
                      {BigInt(entry.delta) > 0n ? '+' : ''}
                      {entry.delta}
                    </Label>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Label size={13} color={colors.muted}>
              {ledger.data ? 'Chưa có giao dịch điểm' : 'Mở lịch sử để xem giao dịch điểm.'}
            </Label>
          )}
        </RequireAuth>
      </View>
      <View
        style={{
          minHeight: 136,
          borderRadius: 26,
          backgroundColor: colors.mint,
          padding: 20,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
          <Artwork source={a.people} width={36} />
          <Label size={18} bold style={{ lineHeight: 25, flex: 1 }}>
            Hành trình xanh,{'\n'}cùng nhau sẽ vui hơn.
          </Label>
        </View>
        <DesignLink onPress={() => router.push('/community')}>Ghé thăm cộng đồng →</DesignLink>
      </View>
      {status === 'authenticated' ? (
        <Button
          title="Đăng xuất"
          variant="danger"
          pending={signingOut}
          onPress={() => {
            if (logoutInFlight.current) return;
            logoutInFlight.current = true;
            setSigningOut(true);
            setError(null);
            void logout()
              .then(() => router.replace('/'))
              .catch(setError)
              .finally(() => {
                logoutInFlight.current = false;
                setSigningOut(false);
              });
          }}
        />
      ) : null}
      <CommandError error={error} />
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
