import { useCallback } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Artwork, DesignLink, StatusSpace } from '../../design-system/DesignScreen';
import { rewardArtwork as a } from '../../design-system/reward-artwork';
import pathSegments from '../../design-system/journey-decoration.json';
import { Icon, Label, Notice, Typography } from '../../design-system/ui';
import { useApp } from '../../providers';
import type { Schemas } from '../../services/api';
import { useResource } from '../../services/queries';
import { CommandError, RequireAuth } from '../shared/common';
import { useOptionalLocalProfile } from '../profile/LocalProfileProvider';
import { UserAvatar } from '../profile/UserAvatar';

const milestones = [
  { name: 'Mầm xanh', x: 176, y: 388, earth: true },
  { name: 'Người Bảo Vệ Trái Đất', x: 268, y: 489, source: a.protector, width: 60, height: 60 },
  { name: 'Chiến Binh Tái Chế', x: 146, y: 546, source: a.recycler, width: 64, height: 86 },
  { name: 'Đại sứ xanh', x: 46, y: 663 },
  { name: 'Người Gìn Giữ Hành Tinh', x: 146, y: 753 },
  { name: 'Anh Hùng Sinh Thái', x: 290, y: 847 },
  { name: 'Hộ Vệ Thiên Nhiên', x: 174, y: 1000 },
  { name: 'Tinh Linh Môi Trường', x: 69, y: 1105 },
  { name: 'Đại sứ xanh', x: 55, y: 1303 },
  { name: 'Người Gìn Giữ Hành Tinh', x: 155, y: 1393 },
  { name: 'Anh Hùng Sinh Thái', x: 299, y: 1487 },
] as const;

export function RewardJourney() {
  const { colors, user, status } = useApp();
  const profile = useOptionalLocalProfile()?.profile;
  const { width, fontScale } = useWindowDimensions();
  const scale = width / 428;
  const wallet = useResource<Schemas['Wallet']>('/v1/me/wallet', true);
  const program = useResource<Schemas['RewardProgram']>('/v1/reward-program');
  const { refetch: refreshWallet } = wallet;
  const { refetch: refreshProgram } = program;
  useFocusEffect(
    useCallback(() => {
      void refreshProgram();
      if (status === 'authenticated') void refreshWallet();
    }, [status, refreshWallet, refreshProgram]),
  );
  const earned = BigInt(wallet.data?.lifetimeEarned ?? '0');
  const thresholds = program.data?.levelThresholds ?? [];
  const level = thresholds.filter((value) => earned >= BigInt(value)).length;
  const nextLevel = thresholds.find((value) => earned < BigInt(value));
  return (
    <Typography.Provider value="inter">
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          <View style={{ backgroundColor: colors.brand, paddingBottom: 58 }}>
            <StatusSpace />
            <Label
              family="inter"
              size={20}
              bold
              heading
              color="#000000"
              style={{ lineHeight: 27, textAlign: 'center', paddingHorizontal: 24 }}
            >
              Tích điểm & phần thưởng
            </Label>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Hồ sơ cá nhân"
              onPress={() => router.push('/profile')}
              style={{
                marginTop: 9,
                marginHorizontal: 32,
                flexDirection: 'row',
                gap: 20,
                alignItems: 'center',
              }}
            >
              <View style={{ flex: 1, gap: 7 }}>
                <Label
                  family="inter"
                  size={22}
                  bold
                  color={colors.heroText}
                  style={{ lineHeight: 28 }}
                >
                  {profile?.displayName ?? user?.displayName ?? 'Hành trình xanh của bạn'}
                </Label>
                <Label family="inter" size={14} color={colors.heroText} style={{ lineHeight: 20 }}>
                  Cùng BlueSteps sống xanh mỗi ngày
                </Label>
              </View>
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  borderWidth: 2,
                  borderColor: '#FFFFFF',
                  backgroundColor: colors.soft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {user ? (
                  <UserAvatar userId={user.id} name={user.displayName} size={46} />
                ) : (
                  <Icon name="person-outline" size={28} />
                )}
              </View>
            </Pressable>
          </View>
          <View
            style={{
              marginTop: -49,
              overflow: 'hidden',
              borderTopLeftRadius: 35,
              borderTopRightRadius: 35,
            }}
          >
            <Artwork
              source={a.background}
              width={width}
              height={1563 * scale}
              fit="fill"
              style={{ position: 'absolute', left: 0, top: 0 }}
            />
            <View style={{ paddingHorizontal: 24, paddingTop: 15, gap: 14 }}>
              <View
                style={{
                  minHeight: 100,
                  padding: 12,
                  paddingLeft: 82,
                  borderRadius: 20,
                  backgroundColor: colors.surface,
                  boxShadow: '0px 4px 4px rgba(0,0,0,0.25)',
                  justifyContent: 'center',
                  gap: 9,
                }}
              >
                <Artwork
                  source={a.ecosystem}
                  width={75}
                  height={94}
                  style={{ position: 'absolute', left: 9, top: 3 }}
                />
                <Label family="inter" size={15} weight="semibold" style={{ lineHeight: 21 }}>
                  Tổng điểm tích lũy: {wallet.data?.lifetimeEarned ?? '—'} điểm
                </Label>
                <View
                  style={{
                    height: 25,
                    borderRadius: 15,
                    backgroundColor: '#AAD7EF',
                    justifyContent: 'center',
                    paddingHorizontal: 12,
                  }}
                >
                  <Label family="inter" size={11} color={colors.text} style={{ lineHeight: 15 }}>
                    {wallet.data
                      ? `Cấp ${level + 1} · ${nextLevel ? `Còn ${BigInt(nextLevel) - earned} điểm tới mốc ${nextLevel}` : 'Đã đạt các mốc hiện tại'}`
                      : 'Đăng nhập để xem cấp bậc'}
                  </Label>
                </View>
              </View>
              <View
                style={{
                  minHeight: 41,
                  borderRadius: 20,
                  backgroundColor: colors.surface,
                  boxShadow: '0px 4px 4px rgba(0,0,0,0.2)',
                  paddingHorizontal: 21,
                  paddingVertical: 9,
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <Label family="inter" size={15} weight="semibold" style={{ lineHeight: 21 }}>
                  Điểm hiện tại của bạn:
                </Label>
                <Label
                  family="inter"
                  size={18}
                  bold
                  color={colors.brand}
                  style={{ lineHeight: 24 }}
                >
                  {wallet.data?.balance ?? '—'} điểm
                </Label>
              </View>
              {status !== 'authenticated' ? <RequireAuth /> : <CommandError error={wallet.error} />}
              <Label
                family="inter"
                size={12}
                weight="semibold"
                style={{ lineHeight: 18, textAlign: 'center' }}
              >
                {nextLevel
                  ? `Mốc tiếp theo: ${nextLevel} điểm tích lũy`
                  : 'Hành trình xanh của bạn'}
              </Label>
            </View>
            <View style={{ width, height: 1288 * scale }}>
              <View
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                aria-hidden
                style={{
                  position: 'absolute',
                  width: 428,
                  height: 1288,
                  left: (width - 428) / 2,
                  transform: [{ scale }],
                  transformOrigin: 'top center',
                }}
              >
                {pathSegments.map((segment, index) => (
                  <View
                    key={index}
                    style={{
                      position: 'absolute',
                      left: segment.x,
                      top: segment.y - 373,
                      width: segment.w,
                      height: segment.h,
                      backgroundColor: '#685454',
                      transformOrigin: 'top left',
                      transform: [{ rotate: `${-segment.rotation}deg` }],
                    }}
                  />
                ))}
                {milestones.map((item, index) => (
                  <View
                    key={index}
                    style={{
                      position: 'absolute',
                      left: item.x,
                      top: item.y - 373,
                      width: 85,
                      height: 120,
                    }}
                  >
                    <Artwork
                      source={'earth' in item ? a.earthPlatform : a.platform}
                      width={'earth' in item ? 85 : 75}
                      height={'earth' in item ? 39 : 46}
                      style={{
                        position: 'absolute',
                        top:
                          'earth' in item
                            ? 39
                            : 'source' in item && item.source === a.recycler
                              ? 64
                              : 48,
                      }}
                    />
                    <Artwork
                      source={'earth' in item ? a.earth : 'source' in item ? item.source : a.sprout}
                      width={'earth' in item ? 73 : 'width' in item ? item.width : 70}
                      height={'earth' in item ? 72 : 'height' in item ? item.height : 70}
                      style={{ position: 'absolute', left: 'earth' in item ? 6 : 3, top: 0 }}
                    />
                    <View
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 9,
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: '#DFE8DC',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon
                        name={index <= level ? 'checkmark' : 'lock-closed'}
                        size={12}
                        color="#647461"
                      />
                    </View>
                    <Label
                      family="inter"
                      size={11}
                      bold
                      color="#FFFF56"
                      style={{
                        position: 'absolute',
                        top:
                          'earth' in item
                            ? 79
                            : 'source' in item && item.source === a.recycler
                              ? 112
                              : 96,
                        left: -35,
                        width: 155,
                        lineHeight: 16,
                        textAlign: 'center',
                        textShadowColor: '#000000',
                        textShadowOffset: { width: 0, height: 0 },
                        textShadowRadius: 1.2,
                      }}
                    >
                      {item.name}
                    </Label>
                  </View>
                ))}
              </View>
              <View style={{ position: 'absolute', right: 10, top: 0, gap: 8 }}>
                {(
                  [
                    { title: 'Cách tính điểm', path: '/rewards/guide', source: a.guide },
                    { title: 'Phần thưởng', path: '/rewards/catalog', source: a.gift },
                    { title: 'Lịch sử', path: '/history', source: a.history },
                  ] as const
                ).map((item) => (
                  <Pressable
                    key={item.path}
                    accessibilityRole="button"
                    onPress={() => router.push(item.path)}
                    style={{ alignItems: 'center', gap: 5, minHeight: fontScale > 1.1 ? 90 : 78 }}
                  >
                    <View
                      style={{ paddingHorizontal: 5, borderRadius: 10, backgroundColor: '#FB7C7C' }}
                    >
                      <Label
                        family="inter"
                        size={8}
                        weight="semibold"
                        color="#FFFFFF"
                        style={{ lineHeight: 12 }}
                      >
                        {item.title}
                      </Label>
                    </View>
                    <View
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        backgroundColor: colors.brand,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Artwork source={item.source} width={30} />
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
          <View style={{ paddingHorizontal: 24, marginTop: 12, gap: 12 }}>
            <Notice>
              Cấp bậc tính theo tổng điểm tích lũy. Đổi quà trừ điểm khả dụng và giữ nguyên tổng
              điểm tích lũy.
            </Notice>
            <DesignLink onPress={() => router.push('/rewards/catalog')}>
              Khám phá phần thưởng
            </DesignLink>
          </View>
        </ScrollView>
      </View>
    </Typography.Provider>
  );
}
