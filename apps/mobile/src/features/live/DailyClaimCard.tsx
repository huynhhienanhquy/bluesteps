import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, View } from 'react-native';
import { PrivateModal as Modal } from './PrivateModal';
import { router, useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Artwork } from '../../design-system/DesignScreen';
import { rewardArtwork as a } from '../../design-system/reward-artwork';
import { Button, Label, Notice } from '../../design-system/ui';
import { useApp } from '../../providers';
import { ApiError, type Schemas } from '../../services/api';
import { useCommand, useResource } from '../../services/queries';
import { CommandError } from './common';

export function DailyClaimCard({ onBrowseRewards }: { onBrowseRewards: () => void }) {
  const { colors, status, user } = useApp();
  const cache = useQueryClient();
  const daily = useResource<Schemas['DailyClaimStatus']>('/v1/me/daily-claims', true);
  const program = useResource<Schemas['RewardProgram']>('/v1/reward-program');
  const command = useCommand<Schemas['DailyClaimResult']>({ feedback: true });
  const claiming = useRef(false);
  const preferences = useResource<Schemas['NotificationPreferences']>(
    '/v1/me/notification-preferences',
    true,
  );
  const reminder = useCommand<Schemas['NotificationPreferences']>();
  const savingReminder = useRef(false);
  const [reminderSaved, setReminderSaved] = useState(false);
  const reminderEnabled = preferences.data?.dailyReminder === true;

  async function changeReminder() {
    if (status === 'guest') {
      router.push({ pathname: '/login', params: { returnTo: '/rewards/catalog' } });
      return;
    }
    if (status !== 'authenticated' || savingReminder.current) return;
    if (!preferences.data || (!reminderEnabled && !preferences.data.offers)) {
      router.push({ pathname: '/notifications', params: { view: 'settings', fromRewards: '1' } });
      return;
    }
    const { version, ...settings } = preferences.data;
    savingReminder.current = true;
    setReminderSaved(false);
    try {
      const saved = await reminder.mutateAsync({
        path: '/v1/me/notification-preferences',
        method: 'PUT',
        body: { ...settings, dailyReminder: !reminderEnabled, expectedVersion: version },
      });
      cache.setQueryData<Schemas['NotificationPreferences']>(
        ['api', user?.id ?? 'guest', '/v1/me/notification-preferences'],
        (current) => (current && current.version > saved.version ? current : saved),
      );
      setReminderSaved(saved.dailyReminder);
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'VERSION_CONFLICT')
        await preferences.refetch();
    } finally {
      savingReminder.current = false;
    }
  }
  const [claimReceipt, setClaimReceipt] = useState<Schemas['DailyClaimResult'] | null>(null);
  const days = daily.data?.dailyPoints ?? program.data?.dailyPoints ?? [];
  const resetAt = daily.data?.nextResetAt;
  const { refetch } = daily;
  useFocusEffect(
    useCallback(() => {
      if (status !== 'authenticated') return;
      const refresh = () => {
        if (!claiming.current) void refetch();
      };
      refresh();
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          refresh();
          void cache.invalidateQueries({
            queryKey: ['api', user?.id ?? 'guest', '/v1/me/wallet'],
            exact: true,
          });
        }
      });
      return () => subscription.remove();
    }, [cache, refetch, status, user?.id]),
  );
  useEffect(() => {
    if (status !== 'authenticated' || !resetAt) return;
    const delay = Date.parse(resetAt) - Date.now();
    if (!Number.isFinite(delay)) return;
    const timer = setTimeout(() => void refetch(), Math.max(1_000, delay + 500));
    return () => clearTimeout(timer);
  }, [refetch, resetAt, status]);
  return (
    <View
      style={{
        marginTop: -92,
        marginHorizontal: 28,
        borderWidth: 0.5,
        borderColor: colors.border,
        borderRadius: 15,
        backgroundColor: colors.surface,
        padding: 13,
        minHeight: 165,
        boxShadow: '0px 4px 4px rgba(0,0,0,0.25)',
        gap: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Label family="inter" size={15} weight="semibold" style={{ flex: 1, lineHeight: 20 }}>
          Điểm danh nhận điểm mỗi ngày
        </Label>
        <Button
          title={reminderEnabled ? 'Hủy lời nhắc' : 'Nhắc tôi'}
          variant="secondary"
          pending={reminder.isPending}
          disabled={status === 'loading' || (status === 'authenticated' && preferences.isPending)}
          onPress={() => void changeReminder()}
        />
      </View>
      {reminderEnabled && preferences.data ? (
        <Label size={11} color={colors.muted}>
          {preferences.data.offers
            ? `Nhắc điểm danh lúc ${preferences.data.dailyTime} (${preferences.data.timezone})`
            : 'Lời nhắc đang tạm dừng vì thông báo Ưu đãi đã tắt.'}
        </Label>
      ) : null}
      {reminderSaved && reminderEnabled && preferences.data?.offers ? (
        <Notice tone="success">Đã đặt lời nhắc điểm danh.</Notice>
      ) : null}
      <CommandError error={reminder.error} />
      <View
        style={{ flexDirection: 'row', gap: 6 }}
        accessibilityLabel={`Chuỗi điểm danh ${daily.data?.streak ?? 0} ngày`}
      >
        {Array.from({ length: 7 }, (_, index) => {
          const received =
            !!daily.data &&
            index < (daily.data.claimedToday ? daily.data.cycleDay : daily.data.cycleDay - 1);
          const current = index === (daily.data?.cycleDay ?? 1) - 1;
          return (
            <View
              key={index}
              style={{
                flex: 1,
                minHeight: 75,
                borderRadius: 10,
                backgroundColor: received ? colors.mint : '#D4E6F1',
                borderWidth: current ? 1.5 : 0.5,
                borderColor: current ? colors.brand : '#7B9BAE',
                alignItems: 'center',
                paddingTop: 4,
                gap: 3,
              }}
            >
              <Label
                family="inter"
                size={8}
                weight="semibold"
                color="#334D5E"
                style={{ lineHeight: 13 }}
              >
                {current ? 'Hôm nay' : `Ngày ${index + 1}`}
              </Label>
              <Artwork
                source={index === 6 ? a.finalChest : a.chest}
                width={index === 6 ? 34 : 32}
                height={32}
              />
              <Label family="inter" size={8} color="#334D5E" style={{ lineHeight: 13 }}>
                {received ? '✓ ' : '+'}
                {days[index] ?? '—'} điểm
              </Label>
            </View>
          );
        })}
      </View>
      <Button
        title={daily.data?.claimedToday ? 'Quay lại ngày mai nhé' : 'Điểm danh'}
        pending={command.isPending}
        disabled={
          status === 'loading' ||
          (status === 'authenticated' && (!daily.data || daily.data.claimedToday))
        }
        onPress={() => {
          if (status !== 'authenticated') {
            if (status === 'guest')
              router.push({ pathname: '/login', params: { returnTo: '/rewards/catalog' } });
            return;
          }
          if (claiming.current || !daily.data || daily.data.claimedToday) return;
          claiming.current = true;
          command.mutate(
            { path: '/v1/me/daily-claims' },
            {
              onSuccess: (result) => {
                cache.setQueryData<Schemas['DailyClaimStatus']>(
                  ['api', user?.id ?? 'guest', '/v1/me/daily-claims'],
                  (current) =>
                    current &&
                    Date.parse(current.nextResetAt) > Date.parse(result.status.nextResetAt)
                      ? current
                      : result.status,
                );
                if (!result.alreadyClaimed) setClaimReceipt(result);
              },
              onSettled: () => {
                claiming.current = false;
              },
            },
          );
        }}
      />
      <CommandError
        error={command.error ?? (status === 'authenticated' ? daily.error : program.error)}
      />
      <Modal
        transparent
        animationType="fade"
        visible={!!claimReceipt}
        onRequestClose={() => setClaimReceipt(null)}
      >
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#182F3F55',
            padding: 28,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 360,
              alignItems: 'center',
              gap: 20,
              padding: 24,
              borderRadius: 26,
              backgroundColor: colors.surface,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng thông báo nhận điểm"
              onPress={() => setClaimReceipt(null)}
              style={{
                alignSelf: 'flex-end',
                minWidth: 44,
                minHeight: 36,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Label size={26}>×</Label>
            </Pressable>
            <Label family="inter" size={24} bold heading style={{ lineHeight: 32 }}>
              CHÚC MỪNG
            </Label>
            <Artwork source={a.celebrationTree} width={129} height={137} />
            <Label family="inter" size={18} style={{ textAlign: 'center', lineHeight: 26 }}>
              Bạn nhận được {claimReceipt?.points} điểm
            </Label>
            {claimReceipt?.walletBalance != null ? (
              <Label size={13} color={colors.muted}>
                Số dư sau điểm danh: {claimReceipt.walletBalance} điểm
              </Label>
            ) : null}
            <Button
              title="Đổi quà"
              onPress={() => {
                setClaimReceipt(null);
                onBrowseRewards();
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
