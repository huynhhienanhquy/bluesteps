import { useCallback } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Artwork, DesignLink } from '../../design-system/DesignScreen';
import { rewardArtwork as a } from '../../design-system/reward-artwork';
import { Button, Label, Notice } from '../../design-system/ui';
import { useApp } from '../../providers';
import type { Schemas } from '../../services/api';
import { useResource } from '../../services/queries';
import { CommandError } from './common';
import { RewardPage, RewardPill } from './RewardParts';

export function RewardsGuideScreen() {
  const { colors, status } = useApp();
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 428, 1);
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
  return (
    <RewardPage title="Quy đổi điểm xanh" balance={wallet.data?.balance} headerHeight={213}>
      <View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width,
            height: 717 * scale,
            overflow: 'hidden',
          }}
        >
          <Artwork
            source={a.guideBackground}
            width={width}
            height={785 * scale}
            fit="fill"
            style={{ position: 'absolute', top: -68 }}
          />
        </View>
        <View
          style={{
            marginTop: -52,
            marginHorizontal: 40,
            minHeight: 94,
            borderRadius: 20,
            backgroundColor: colors.mint,
            paddingHorizontal: 30,
            paddingVertical: 17,
            flexDirection: 'row',
            gap: 26,
            alignItems: 'center',
            boxShadow: '0px 4px 4px rgba(0,0,0,0.25)',
          }}
        >
          <Artwork source={a.protector} width={60} />
          <View style={{ flex: 1, gap: 8 }}>
            <Label family="inter" size={18} weight="semibold" style={{ lineHeight: 24 }}>
              Tổng điểm tích lũy
            </Label>
            <Label family="inter" size={18} bold color={colors.brand} style={{ lineHeight: 24 }}>
              {wallet.data?.lifetimeEarned ?? '—'} điểm
            </Label>
          </View>
        </View>
        <View style={{ marginTop: 28, paddingHorizontal: 28, gap: 13 }}>
          <View
            style={{
              height: 25,
              borderRadius: 15,
              backgroundColor: '#AAD7EF',
              justifyContent: 'center',
              alignItems: 'center',
              marginHorizontal: 48,
            }}
          >
            <Label family="inter" size={12} color="#164561">
              {program.data
                ? `Quy tắc ${program.data.version}`
                : program.isError || program.fetchStatus === 'paused'
                  ? 'Chưa có quy tắc điểm'
                  : 'Đang tải quy tắc điểm'}
            </Label>
          </View>
          <Label
            family="inter"
            size={18}
            bold
            heading
            style={{ textAlign: 'center', lineHeight: 25 }}
          >
            Cách tính điểm / 1 lần quét
          </Label>
          <Label family="inter" size={14} style={{ lineHeight: 20, textAlign: 'center' }}>
            Ghi nhận hành động phân loại để nhận điểm theo nhóm rác.
            {program.data ? ` Tối đa ${program.data.sortingDailyLimit} lượt có điểm mỗi ngày.` : ''}
          </Label>
          {program.isError || program.fetchStatus === 'paused' ? (
            <>
              <Notice>Chưa tải được quy tắc cộng điểm hiện hành.</Notice>
              <Button
                title="Tải lại quy tắc"
                variant="quiet"
                onPress={() => void program.refetch()}
              />
            </>
          ) : null}
          {status === 'authenticated' ? <CommandError error={wallet.error} /> : null}
        </View>
        <View style={{ height: 425 * scale, width, marginTop: 8 }}>
          <View
            style={{
              position: 'absolute',
              width: 428,
              height: 425,
              left: (width - 428) / 2,
              transform: [{ scale }],
              transformOrigin: 'top center',
            }}
          >
            <Artwork
              source={a.guideArrow}
              width={102.655}
              height={102.654}
              style={{
                position: 'absolute',
                left: 157.64,
                top: -20.95,
                transform: [{ rotate: '40.46deg' }],
              }}
            />
            <Artwork
              source={a.guideArrowHead}
              width={38.577}
              height={44.786}
              style={{
                position: 'absolute',
                left: 254.02,
                top: 20.44,
                transform: [{ rotate: '-132.65deg' }],
              }}
            />
            <Artwork
              source={a.guideArrow}
              width={64.122}
              style={{
                position: 'absolute',
                left: 268.18,
                top: 188.52,
                transform: [{ rotate: '174.89deg' }],
              }}
            />
            <Artwork
              source={a.guideSmallArrowHead}
              width={24.097}
              height={27.975}
              style={{
                position: 'absolute',
                left: 261.22,
                top: 236.45,
                transform: [{ rotate: '1.78deg' }],
              }}
            />
            <Artwork
              source={a.guideArrow}
              width={64.122}
              style={{
                position: 'absolute',
                left: 89.23,
                top: 193.58,
                transform: [{ rotate: '-90deg' }],
              }}
            />
            <Artwork
              source={a.guideSmallArrowHead}
              width={24.097}
              height={27.975}
              style={{
                position: 'absolute',
                left: 87.05,
                top: 180.04,
                transform: [{ rotate: '96.9deg' }],
              }}
            />
            {[
              {
                title: 'Rác tái chế',
                category: 'recycle',
                points: program.data?.sortingPoints.recycle,
                source: a.recycleBin,
                x: 46,
                y: 42,
                height: 77,
              },
              {
                title: 'Rác vô cơ',
                category: 'inorganic',
                points: program.data?.sortingPoints.inorganic,
                source: a.inorganicBin,
                x: 306,
                y: 42,
                height: 77,
              },
              {
                title: 'Rác hữu cơ',
                category: 'organic',
                points: program.data?.sortingPoints.organic,
                source: a.organicBin,
                x: 174,
                y: 189,
                height: 86,
              },
            ].map((item) => (
              <Pressable
                key={item.title}
                accessibilityRole="button"
                accessibilityLabel={`Mở sổ tay ${item.title}`}
                onPress={() =>
                  router.push({
                    pathname: '/handbook/category/[category]',
                    params: { category: item.category },
                  })
                }
                style={{ position: 'absolute', left: item.x, top: item.y, width: 77, height: 145 }}
              >
                <Artwork
                  source={a.guidePlatform}
                  width={75}
                  height={46}
                  style={{ position: 'absolute', top: item.height === 86 ? 71 : 59 }}
                />
                <Artwork
                  source={item.source}
                  width={77}
                  height={item.height}
                  style={{ position: 'absolute', top: 0 }}
                />
                <Label
                  family="inter"
                  size={15}
                  weight="semibold"
                  style={{
                    position: 'absolute',
                    width: 120,
                    left: -21,
                    top: item.height === 86 ? 125 : 118,
                    lineHeight: 21,
                    textAlign: 'center',
                  }}
                >
                  {item.title}
                  {item.points != null ? `\n+${item.points} điểm` : ''}
                </Label>
              </Pressable>
            ))}
            <Artwork
              source={a.guidePlatform}
              width={75}
              height={46}
              style={{ position: 'absolute', left: 25, top: 348 }}
            />
            <Artwork
              source={a.sprout}
              width={70}
              style={{ position: 'absolute', left: 28, top: 300 }}
            />
            <View style={{ position: 'absolute', right: 8, bottom: 20 }}>
              <RewardPill onPress={() => router.push('/rewards/catalog')}>Đổi thưởng</RewardPill>
            </View>
          </View>
        </View>
        <View style={{ paddingHorizontal: 24, gap: 10 }}>
          <Button title="Quét và phân loại rác" onPress={() => router.push('/scan')} />
          <Notice>
            Điểm được ghi nhận cùng hành động và lưu trên tài khoản. Dữ liệu tự khai không phải khối
            lượng đã được đơn vị thu gom xác minh.
          </Notice>
          <DesignLink onPress={() => router.replace('/rewards')}>Xem ví</DesignLink>
        </View>
      </View>
    </RewardPage>
  );
}
