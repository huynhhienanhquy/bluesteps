import { useCallback, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, usePathname } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Card, Label, Notice, Screen } from '../../design-system/ui';
import { RewardCatalog } from './RewardCatalog';
import { RewardJourney } from './RewardJourney';
import { ApiError, dateLabel, errorMessage, type Schemas } from '../../services/api';
import { useCommand, useResource } from '../../services/queries';
import { CommandError, QueryState, RequireAuth } from '../shared/common';
import { MediaSlot } from '../shared/DesignParts';
import { useApp } from '../../providers';
import { hasPendingRedemption, RewardRedemptionDialog } from './RewardRedemptionDialog';
import { redemptionStatusLabel } from './redemption-status';

export function RewardsScreen() {
  const path = usePathname();
  return path === '/rewards/catalog' ? <RewardCatalog /> : <RewardJourney />;
}

export { HistoryScreen } from './RewardHistory';
export { RewardsGuideScreen } from './RewardGuide';

export function RewardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useApp();
  return <RewardDetail key={`${user?.id ?? 'guest'}:${id}`} id={id} />;
}

function RewardDetail({ id }: { id: string }) {
  const { status, user } = useApp();
  const pendingRedemption = hasPendingRedemption(user?.id, id);
  const query = useResource<Schemas['Reward']>(`/v1/rewards/${id}`);
  const wallet = useResource<Schemas['Wallet']>('/v1/me/wallet', true);
  const [offer, setOffer] = useState<{ reward: Schemas['Reward']; quantity: number } | null>(null);
  const [quantity, setQuantity] = useState(1);
  const maximum = Math.min(20, query.data?.available ?? 0);
  const { refetch: refreshReward } = query;
  const { refetch: refreshWallet } = wallet;
  const refresh = useCallback(() => {
    void refreshReward();
    if (status === 'authenticated') void refreshWallet();
  }, [status, refreshReward, refreshWallet]);
  useFocusEffect(refresh);
  return (
    <Screen title={query.data?.name ?? 'Chi tiết quà'} back>
      <QueryState query={query}>
        {query.data && (
          <>
            <MediaSlot
              code={query.data.code}
              icon="gift-outline"
              style={{ height: 200, borderRadius: 16 }}
            />
            <Label>{query.data.description}</Label>
            <Card>
              <Label>{query.data.costPoints} điểm</Label>
              <Label>Còn {query.data.available} quà</Label>
            </Card>
            {!query.data.redemptionEnabled && <Notice>Hệ thống chưa mở đổi quà.</Notice>}
            {query.data.available === 0 ? (
              <Notice>Quà này đã hết. Bạn có thể chọn quà khác trong danh mục.</Notice>
            ) : null}
            <RequireAuth>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <Button
                  title="−"
                  accessibilityLabel="Giảm số quà"
                  disabled={quantity <= 1}
                  onPress={() => setQuantity((value) => Math.max(1, value - 1))}
                />
                <Label>{quantity} quà</Label>
                <Button
                  title="+"
                  accessibilityLabel="Tăng số quà"
                  disabled={quantity >= maximum}
                  onPress={() => setQuantity((value) => Math.max(1, Math.min(maximum, value + 1)))}
                />
              </View>
              {maximum > 0 && quantity > maximum ? (
                <>
                  <Notice tone="warning">
                    Số quà còn lại đã thay đổi. Chọn tối đa {maximum} quà.
                  </Notice>
                  <Button
                    title={`Chọn ${maximum} quà còn lại`}
                    variant="quiet"
                    onPress={() => setQuantity(maximum)}
                  />
                </>
              ) : null}
              <Label>
                Tổng cần đổi: {(BigInt(query.data.costPoints) * BigInt(quantity)).toString()} điểm
              </Label>
              <Label>Số dư của bạn: {wallet.data?.balance ?? '—'} điểm</Label>
              <Button
                title={pendingRedemption ? 'Kiểm tra lượt đổi' : 'Đổi quà'}
                disabled={
                  !pendingRedemption &&
                  (!query.data.redemptionEnabled ||
                    quantity < 1 ||
                    quantity > maximum ||
                    !wallet.data)
                }
                onPress={() => {
                  if (query.data && (pendingRedemption || (quantity >= 1 && quantity <= maximum)))
                    setOffer({ reward: query.data, quantity });
                }}
              />
              <CommandError error={wallet.error} />
            </RequireAuth>
          </>
        )}
      </QueryState>
      <Button
        title="Cập nhật điểm và số quà"
        variant="secondary"
        pending={query.isRefetching || wallet.isRefetching}
        onPress={refresh}
      />
      {offer ? (
        <RewardRedemptionDialog
          offer={offer.reward}
          current={query.data}
          quantity={offer.quantity}
          balance={wallet.data?.balance}
          onClose={() => setOffer(null)}
          onRefresh={() => {
            void query.refetch();
            void wallet.refetch();
          }}
          onContinue={() =>
            router.replace({
              pathname: '/rewards/catalog',
              params: { category: offer.reward.category },
            })
          }
        />
      ) : null}
    </Screen>
  );
}

export function RedemptionScreen() {
  const { id, historyPeriod } = useLocalSearchParams<{ id: string; historyPeriod?: string }>();
  const { user } = useApp();
  return (
    <RedemptionDetails
      key={`${user?.id ?? 'guest'}:${id}`}
      id={id}
      historyPeriod={historyPeriod === 'month' || historyPeriod === 'week' ? historyPeriod : 'all'}
    />
  );
}

function RedemptionDetails({
  id,
  historyPeriod,
}: {
  id: string;
  historyPeriod: 'all' | 'month' | 'week';
}) {
  const { user, status } = useApp();
  const cache = useQueryClient();
  const query = useResource<Schemas['RedemptionReceipt']>(`/v1/redemptions/${id}`, true);
  const command = useCommand<Schemas['RedemptionReceipt']>({ feedback: true });
  const [confirm, setConfirm] = useState(false);
  const cancelling = useRef(false);
  const copying = useRef(false);
  const [copyPending, setCopyPending] = useState(false);
  const [copied, setCopied] = useState('');
  const [copyError, setCopyError] = useState('');
  const canCancel = query.data?.status === 'reserved' && !query.isError;
  const canUseCode = canCancel || (query.data?.status === 'fulfilling' && !query.isError);
  const live = query.data?.status !== 'fulfilled' && query.data?.status !== 'refunded';
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      if (status !== 'authenticated') return;
      let timer: ReturnType<typeof setInterval> | undefined;
      const update = () => {
        if (!cancelling.current) void refetch();
      };
      const stop = () => {
        if (timer) clearInterval(timer);
        timer = undefined;
      };
      const start = () => {
        stop();
        if (AppState.currentState && AppState.currentState !== 'active') return;
        update();
        if (live) timer = setInterval(update, 20_000);
      };
      start();
      const subscription = AppState.addEventListener('change', (state) =>
        state === 'active' ? start() : stop(),
      );
      return () => {
        stop();
        subscription.remove();
      };
    }, [status, live, refetch]),
  );
  async function cancel() {
    if (cancelling.current || !canCancel || query.isFetching) return;
    cancelling.current = true;
    try {
      const receipt = await command.mutateAsync({ path: `/v1/redemptions/${id}/cancel` });
      const key = ['api', user?.id ?? 'guest', `/v1/redemptions/${id}`];
      await cache.cancelQueries({ queryKey: key, exact: true });
      cache.setQueryData(key, receipt);
      setConfirm(false);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) void refetch();
    } finally {
      cancelling.current = false;
    }
  }
  return (
    <Screen title="Thông tin nhận quà" back>
      <RequireAuth>
        <QueryState query={query}>
          {query.data ? (
            <>
              <Label size={22} bold heading>
                {query.data.rewardName}
              </Label>
              <Card>
                <Label>
                  {query.data.quantity} quà · {query.data.totalCost} điểm
                </Label>
                <Label>{redemptionStatusLabel(query.data.status)}</Label>
                <Label size={12}>Đã đổi lúc {dateLabel(query.data.createdAt)}</Label>
                {canUseCode ? (
                  <>
                    <Label size={24} bold>
                      Mã nhận quà: {query.data.claimCode}
                    </Label>
                    <Button
                      title={
                        copied === query.data.claimCode ? 'Đã sao chép mã' : 'Sao chép mã nhận quà'
                      }
                      variant="secondary"
                      pending={copyPending}
                      onPress={() => {
                        if (!canUseCode || copying.current || !query.data) return;
                        copying.current = true;
                        setCopyPending(true);
                        setCopyError('');
                        const code = query.data.claimCode;
                        void Clipboard.setStringAsync(code)
                          .then(() => setCopied(code))
                          .catch((cause) => setCopyError(errorMessage(cause)))
                          .finally(() => {
                            copying.current = false;
                            setCopyPending(false);
                          });
                      }}
                    />
                    {copyError ? <Notice tone="error">{copyError}</Notice> : null}
                  </>
                ) : null}
              </Card>
              {query.data.status === 'refunded' ? (
                <Notice>Điểm đã được hoàn về ví. Mã nhận quà đã hết hiệu lực.</Notice>
              ) : canUseCode ? (
                <Notice>
                  Giữ mã để ban quản lý xác nhận giao quà. Sau khi xác nhận, trạng thái sẽ chuyển
                  thành đã nhận.
                </Notice>
              ) : null}
              {canCancel && !confirm ? (
                <Button title="Hủy đổi quà" variant="danger" onPress={() => setConfirm(true)} />
              ) : null}
              {confirm && canCancel ? (
                <>
                  <Notice tone="warning">Hủy và hoàn {query.data.totalCost} điểm về ví?</Notice>
                  <Button
                    title="Xác nhận hủy đổi quà"
                    pending={command.isPending}
                    disabled={query.isFetching}
                    onPress={() => void cancel()}
                  />
                  <Button
                    title="Giữ lượt đổi quà"
                    variant="quiet"
                    disabled={command.isPending}
                    onPress={() => setConfirm(false)}
                  />
                </>
              ) : null}
            </>
          ) : null}
        </QueryState>
        <CommandError error={command.error} />
        <Button
          title="Cập nhật trạng thái nhận quà"
          variant="secondary"
          pending={query.isRefetching}
          disabled={command.isPending}
          onPress={() => void refetch()}
        />
        <Button
          title="Lịch sử điểm và quà"
          onPress={() =>
            router.dismissTo({ pathname: '/history', params: { period: historyPeriod } })
          }
        />
      </RequireAuth>
    </Screen>
  );
}
