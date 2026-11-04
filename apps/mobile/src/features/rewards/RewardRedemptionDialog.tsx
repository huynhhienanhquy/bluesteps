import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Label, Notice } from '../../design-system/ui';
import { useApp } from '../../providers';
import { ApiError, operationKey, type Schemas } from '../../services/api';
import { useCommand } from '../../services/queries';
import { CommandError } from '../shared/common';
import { MediaSlot } from '../shared/DesignParts';
import { PrivateModal } from '../shared/PrivateModal';

type RedemptionAttempt = { key: string; body: Schemas['RedemptionRequest'] };
const pendingAttempts = new Map<string, RedemptionAttempt>();

export function hasPendingRedemption(userId: string | undefined, rewardId: string) {
  return !!userId && pendingAttempts.has(`${userId}:${rewardId}`);
}

export function RewardRedemptionDialog({
  offer,
  current,
  quantity,
  balance,
  onClose,
  onRefresh,
  onContinue,
}: {
  offer: Schemas['Reward'];
  current?: Schemas['Reward'];
  quantity: number;
  balance?: string;
  onClose: () => void;
  onRefresh: () => void;
  onContinue?: () => void;
}) {
  const { colors, user } = useApp();
  const scope = `${user?.id}:${offer.id}`;
  const command = useCommand<Schemas['RedemptionReceipt']>({ feedback: true });
  const [receipt, setReceipt] = useState<Schemas['RedemptionReceipt']>();
  const [confirmedOffer, setConfirmedOffer] = useState(offer);
  const [uncertain, setUncertain] = useState(() => hasPendingRedemption(user?.id, offer.id));
  const submitting = useRef(false);
  const cost = BigInt(confirmedOffer.costPoints) * BigInt(quantity);
  const enoughPoints = balance != null && BigInt(balance) >= cost;
  const available = !!current && current.redemptionEnabled && quantity <= current.available;
  const changed = !!current && current.version !== confirmedOffer.version;
  const close = () => {
    if (!submitting.current) {
      onClose();
      if (receipt) onContinue?.();
    }
  };
  async function redeem() {
    if (!user || submitting.current) return;
    const pending = pendingAttempts.get(scope);
    if (!pending && (uncertain || !available || changed || !enoughPoints)) return;
    const request = pending ?? {
      key: operationKey(),
      body: {
        rewardId: confirmedOffer.id,
        quantity,
        expectedRewardVersion: confirmedOffer.version,
      },
    };
    pendingAttempts.set(scope, request);
    submitting.current = true;
    try {
      const result = await command.mutateAsync({ path: '/v1/redemptions', ...request });
      if (pendingAttempts.get(scope) === request) pendingAttempts.delete(scope);
      setUncertain(false);
      setReceipt(result);
    } catch (error) {
      // The client can detect a session change after the server has reserved the gift.
      const unknown =
        !(error instanceof ApiError) ||
        error.status === 0 ||
        error.status >= 500 ||
        error.code === 'SESSION_CHANGED';
      setUncertain(unknown);
      if (!unknown && pendingAttempts.get(scope) === request) pendingAttempts.delete(scope);
      if (error instanceof ApiError && error.status === 409) onRefresh();
    } finally {
      submitting.current = false;
    }
  }
  return (
    <PrivateModal transparent animationType="fade" visible onRequestClose={close}>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#182F3F38',
          padding: 24,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đóng thông báo đổi quà"
          onPress={close}
          style={{ position: 'absolute', inset: 0 }}
        />
        <ScrollView
          style={{
            flexGrow: 0,
            width: '100%',
            maxWidth: receipt ? 335 : 302,
            maxHeight: '92%',
            borderRadius: 25,
            backgroundColor: colors.surface,
          }}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: receipt ? 26 : 32,
            paddingBottom: receipt ? 21 : 32,
            gap: receipt ? 0 : 14,
          }}
        >
          <Label
            family="inter"
            size={receipt ? 25 : 20}
            weight={receipt ? 'bold' : 'semibold'}
            heading
            color={receipt ? '#EAD705' : colors.text}
            style={{
              textAlign: 'center',
              lineHeight: receipt ? 31 : 24,
              marginBottom: receipt ? 20 : 0,
              ...(receipt
                ? {
                    textShadowColor: '#000000',
                    textShadowRadius: 1.5,
                    textShadowOffset: { width: 0, height: 0 },
                  }
                : {}),
            }}
          >
            {receipt ? 'CHÚC MỪNG' : 'Xác nhận đổi quà?'}
          </Label>
          {receipt ? (
            <>
              <MediaSlot
                code={offer.code}
                icon="gift-outline"
                style={{
                  alignSelf: 'center',
                  width: 175,
                  height: 128,
                  borderRadius: 10,
                  marginBottom: 22,
                  boxShadow: '0px 6px 4px rgba(0,0,0,0.25)',
                }}
              />
              <Label
                family="inter"
                size={18}
                weight="semibold"
                style={{ textAlign: 'center', lineHeight: 22, marginBottom: 11 }}
              >
                Bạn nhận được{' '}
                <Label family="inter" size={18} bold color={colors.brand}>
                  {receipt.quantity > 1 ? `${receipt.quantity} ` : ''}
                  {receipt.rewardName}
                </Label>
              </Label>
              <Label
                family="inter"
                size={15}
                style={{ textAlign: 'center', lineHeight: 19, marginBottom: 11 }}
              >
                “Kiếm thật nhiều điểm để đổi nhiều phần quà hấp dẫn”
              </Label>
              <RedemptionAction
                title="Nhận ngay"
                large
                onPress={() => {
                  onClose();
                  router.push({ pathname: '/rewards/redemption', params: { id: receipt.id } });
                }}
              />
            </>
          ) : (
            <>
              {!uncertain ? (
                <Label family="inter" size={16} style={{ textAlign: 'center', lineHeight: 19 }}>
                  Bạn đang có {balance ?? '—'} điểm. Quà “
                  <Label family="inter" size={16} weight="semibold">
                    {quantity > 1 ? `${quantity} ` : ''}
                    {confirmedOffer.name}
                  </Label>
                  ” cần{' '}
                  <Label family="inter" size={16} weight="semibold">
                    {cost.toString()}
                  </Label>{' '}
                  điểm.
                </Label>
              ) : null}
              {!uncertain && balance != null && !enoughPoints ? (
                <Notice tone="warning">Bạn chưa có đủ điểm để đổi quà này.</Notice>
              ) : null}
              {uncertain ? (
                <Notice tone="warning">
                  Chưa nhận được kết quả đổi quà. Thử lại để tiếp tục cùng yêu cầu.
                </Notice>
              ) : !available ? (
                <Notice tone="warning">Quà không còn đủ số lượng hoặc đang tạm ngừng đổi.</Notice>
              ) : changed && current ? (
                <>
                  <Notice tone="warning">
                    Thông tin quà đã thay đổi. Tổng điểm hiện tại là{' '}
                    {(BigInt(current.costPoints) * BigInt(quantity)).toString()} điểm.
                  </Notice>
                  <Button
                    title="Dùng thông tin mới"
                    variant="secondary"
                    disabled={command.isPending}
                    onPress={() => {
                      if (submitting.current) return;
                      setConfirmedOffer(current);
                      command.reset();
                    }}
                  />
                </>
              ) : null}
              <CommandError error={command.error} />
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <RedemptionAction
                  title={uncertain ? 'Thử lại yêu cầu' : 'Đổi ngay'}
                  pending={command.isPending}
                  disabled={!uncertain && (!available || changed || !enoughPoints)}
                  onPress={() => void redeem()}
                />
                <RedemptionAction title="Hủy" cancel disabled={command.isPending} onPress={close} />
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </PrivateModal>
  );
}

function RedemptionAction({
  title,
  large = false,
  cancel = false,
  disabled = false,
  pending = false,
  onPress,
}: {
  title: string;
  large?: boolean;
  cancel?: boolean;
  disabled?: boolean;
  pending?: boolean;
  onPress: () => void;
}) {
  const { colors, dark } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || pending, busy: pending }}
      disabled={disabled || pending}
      onPress={onPress}
      style={{
        alignSelf: 'center',
        minWidth: large ? 125 : 90,
        minHeight: large ? 50 : 40,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: large ? 20 : 10,
        backgroundColor: cancel ? (dark ? colors.soft : '#B9B9B9') : colors.brand,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {pending ? (
        <ActivityIndicator size="small" color={colors.heroText} />
      ) : (
        <Label
          family="inter"
          size={large ? 17 : 15}
          bold
          color={dark ? colors.text : '#000000'}
          style={{ lineHeight: large ? 23 : 18, textAlign: 'center' }}
        >
          {title}
        </Label>
      )}
    </Pressable>
  );
}
