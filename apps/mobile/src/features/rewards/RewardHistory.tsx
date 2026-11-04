import { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Artwork, DesignLink } from '../../design-system/DesignScreen';
import { rewardArtwork as a } from '../../design-system/reward-artwork';
import { Label } from '../../design-system/ui';
import { useApp } from '../../providers';
import { dateLabel, type Schemas } from '../../services/api';
import { usePages, useResource } from '../../services/queries';
import { More, QueryState, RequireAuth } from '../shared/common';
import { RewardPage, RewardPill } from './RewardParts';
import { RewardCategory } from './RewardCatalog';
import { redemptionStatusLabel } from './redemption-status';
import {
  pointTransactionDestination,
  pointTransactionTitle,
} from '../collection/point-transaction';

type Period = 'all' | 'month' | 'week';

export function HistoryScreen() {
  const { user } = useApp();
  return <HistoryBody key={user?.id ?? 'guest'} />;
}
function HistoryBody() {
  const { colors, status } = useApp();
  const { period: requestedPeriod } = useLocalSearchParams<{ period?: string }>();
  const period: Period =
    requestedPeriod === 'week' || requestedPeriod === 'month' ? requestedPeriod : 'all';
  const wallet = useResource<Schemas['Wallet']>('/v1/me/wallet', true);
  const summary = useResource<Schemas['HistorySummary']>('/v1/me/history-summary', true);
  const ledger = usePages<Schemas['PointTransaction']>(
    `/v1/me/point-transactions?period=${period}`,
    true,
  );
  const redemptions = usePages<Schemas['Redemption']>(`/v1/me/redemptions?period=${period}`, true);
  const sorting = usePages<Schemas['Activity']>(`/v1/me/activity?period=${period}`, true);
  const { refetch: refreshWallet } = wallet;
  const { refetch: refreshSummary } = summary;
  const { refetch: refreshLedger } = ledger;
  const { refetch: refreshRedemptions } = redemptions;
  const { refetch: refreshSorting } = sorting;
  useFocusEffect(
    useCallback(() => {
      if (status !== 'authenticated') return;
      void refreshWallet();
      void refreshSummary();
      void refreshLedger();
      void refreshRedemptions();
      void refreshSorting();
    }, [status, refreshWallet, refreshSummary, refreshLedger, refreshRedemptions, refreshSorting]),
  );
  const timezone = summary.data?.timezone ?? 'Asia/Ho_Chi_Minh';
  const items = ledger.data?.pages.flatMap((page) => page.items) ?? [];
  const gifts = redemptions.data?.pages.flatMap((page) => page.items) ?? [];
  const actions = sorting.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <RewardPage
      title="Lịch sử"
      balance={wallet.data?.balance}
      action={<RewardPill onPress={() => router.push('/rewards')}>Tìm thêm điểm</RewardPill>}
    >
      <View style={{ paddingTop: 28, paddingHorizontal: 37, gap: 24 }}>
        <View style={{ gap: 13, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Artwork source={a.sectionGift} width={25} />
            <Label
              family="inter"
              size={20}
              bold
              heading
              color="#185B86"
              style={{ lineHeight: 27, flexShrink: 1 }}
            >
              Lịch sử tích điểm và đổi quà
            </Label>
          </View>
          <Label family="inter" size={12} style={{ lineHeight: 18, textAlign: 'center' }}>
            🌱 Phân loại rác - Sống xanh mỗi ngày cùng BlueSteps ♻
          </Label>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
          {(
            [
              { value: 'all', title: 'Tất cả' },
              { value: 'month', title: 'Tháng này' },
              { value: 'week', title: 'Tuần này' },
            ] as const
          ).map((item) => (
            <RewardCategory
              key={item.value}
              label={item.title}
              selected={period === item.value}
              onPress={() => router.setParams({ period: item.value })}
            />
          ))}
        </View>
        <RequireAuth>
          <QueryState query={wallet}>
            <QueryState query={summary}>
              <View
                style={{
                  minHeight: 89,
                  borderRadius: 15,
                  backgroundColor: colors.mint,
                  paddingHorizontal: 12,
                  paddingVertical: 17,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {[
                  { value: summary.data?.weeklyEarned ?? '—', title: 'Điểm tuần này' },
                  { value: summary.data?.monthlyEarned ?? '—', title: 'Điểm tháng này' },
                  { value: wallet.data?.lifetimeEarned ?? '—', title: 'Điểm tổng tích lũy' },
                ].map((item) => (
                  <View key={item.title} style={{ flex: 1, alignItems: 'center', gap: 12 }}>
                    <Label
                      family="inter"
                      size={14}
                      bold
                      color={colors.brand}
                      style={{ lineHeight: 19 }}
                    >
                      {item.value}
                    </Label>
                    <Label family="inter" size={12} style={{ lineHeight: 17, textAlign: 'center' }}>
                      {item.title}
                    </Label>
                  </View>
                ))}
              </View>
              <Label size={11} color={colors.muted}>
                Điểm đã tích lũy từ các hoạt động. Điểm đổi quà và hoàn điểm được liệt kê trong giao
                dịch.
              </Label>
            </QueryState>
          </QueryState>
          <QueryState
            query={ledger}
            empty={!items.length}
            emptyText="Chưa có giao dịch điểm trong thời gian này"
          >
            <View style={{ borderLeftWidth: 4, borderLeftColor: colors.brand, marginLeft: 10 }}>
              {items.map((item) => {
                const destination = pointTransactionDestination(item, period);
                const title = pointTransactionTitle(item);
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole={destination ? 'button' : undefined}
                    accessibilityLabel={
                      destination ? `${title}, ${item.delta} điểm. Xem chi tiết` : undefined
                    }
                    disabled={!destination}
                    onPress={() => {
                      if (destination) router.push(destination);
                    }}
                    style={{
                      minHeight: 39,
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: 12,
                      paddingVertical: 6,
                      marginLeft: -7,
                    }}
                  >
                    <Artwork source={a.leaf} width={30} />
                    <Label
                      family="inter"
                      size={14}
                      bold
                      color={colors.brand}
                      style={{ lineHeight: 20, width: 90 }}
                    >
                      {new Intl.DateTimeFormat('vi-VN', {
                        timeZone: timezone,
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      }).format(new Date(item.createdAt))}
                    </Label>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Label family="inter" size={12} style={{ lineHeight: 18 }}>
                        {title}
                      </Label>
                      <Label family="inter" size={10} color={colors.muted}>
                        Số dư: {item.balanceAfter}
                      </Label>
                      {destination ? (
                        <Label size={10} color={colors.brand}>
                          Xem chi tiết ›
                        </Label>
                      ) : null}
                    </View>
                    <Label
                      family="inter"
                      size={14}
                      bold
                      color={colors.brand}
                      style={{ lineHeight: 20 }}
                    >
                      {BigInt(item.delta) > 0n ? '+' : ''}
                      {item.delta}
                    </Label>
                  </Pressable>
                );
              })}
            </View>
          </QueryState>
          <More query={ledger} />
          <Label family="inter" size={18} bold heading color="#185B86">
            Quà đã đổi
          </Label>
          <QueryState
            query={redemptions}
            empty={!gifts.length}
            emptyText="Chưa có quà đã đổi trong thời gian này"
          >
            <View style={{ gap: 12 }}>
              {gifts.map((item) => (
                <View
                  key={item.id}
                  style={{
                    padding: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 15,
                    backgroundColor: colors.surface,
                    gap: 8,
                  }}
                >
                  <Label family="inter" size={15} weight="semibold">
                    {item.rewardName ?? 'Phần quà đã đổi'}
                  </Label>
                  <Label family="inter" size={12}>
                    {item.quantity} quà · {item.totalCost} điểm
                  </Label>
                  <Label family="inter" size={12} color={colors.muted}>
                    {dateLabel(item.createdAt)} · {redemptionStatusLabel(item.status)}
                  </Label>
                  <DesignLink
                    onPress={() =>
                      router.push({
                        pathname: '/rewards/redemption',
                        params: { id: item.id, historyPeriod: period },
                      })
                    }
                  >
                    Thông tin nhận quà
                  </DesignLink>
                </View>
              ))}
            </View>
          </QueryState>
          <More query={redemptions} />
          <Label family="inter" size={18} bold heading color="#185B86">
            Lịch sử phân loại
          </Label>
          <QueryState
            query={sorting}
            empty={!actions.length}
            emptyText="Chưa có lần phân loại trong thời gian này"
          >
            {actions.map((item) => (
              <View
                key={item.id}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  borderRadius: 15,
                  padding: 14,
                  gap: 6,
                }}
              >
                <Label bold>{item.itemName ?? 'Vật phẩm đã phân loại'}</Label>
                <Label size={12} color={colors.muted}>
                  {item.source === 'scan' ? 'Xác nhận từ ảnh quét' : 'Ghi nhận thủ công'}
                  {' · '}
                  {dateLabel(item.createdAt)}
                </Label>
                {item.scanId || item.itemName ? (
                  <DesignLink
                    onPress={() => {
                      if (item.scanId) {
                        router.push({
                          pathname: '/scan',
                          params: { scanId: item.scanId, reviewFrom: 'history' },
                        });
                      } else {
                        router.push({ pathname: '/handbook/[id]', params: { id: item.itemId } });
                      }
                    }}
                  >
                    {item.scanId ? 'Xem kết quả quét' : 'Xem hướng dẫn phân loại'}
                  </DesignLink>
                ) : null}
              </View>
            ))}
          </QueryState>
          <More query={sorting} />
        </RequireAuth>
        <DesignLink onPress={() => router.push('/rewards/catalog')}>
          Khám phá phần thưởng
        </DesignLink>
      </View>
    </RewardPage>
  );
}
