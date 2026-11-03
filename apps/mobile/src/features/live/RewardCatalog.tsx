import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Artwork, DesignLink } from '../../design-system/DesignScreen';
import { rewardArtwork as a } from '../../design-system/reward-artwork';
import { Button, Icon, Label } from '../../design-system/ui';
import { useApp } from '../../providers';
import type { Schemas } from '../../services/api';
import { usePages, useResource } from '../../services/queries';
import { CommandError, More, QueryState, RequireAuth } from './common';
import { MediaSlot } from './DesignParts';
import { RewardPage, RewardPill } from './RewardParts';
import { DailyClaimCard } from './DailyClaimCard';
import { hasPendingRedemption, RewardRedemptionDialog } from './RewardRedemptionDialog';

const categoryLabels = {
  recycled: 'Đồ tái chế',
  voucher: 'Voucher',
  entertainment: 'Giải trí',
  other: 'Khác',
};
type Category = keyof typeof categoryLabels;
const rewardCategories = Object.keys(categoryLabels) as Category[];

export function RewardCatalog() {
  const { colors, status, dark, user } = useApp();
  const scroll = useRef<ScrollView>(null);
  const catalogOffset = useRef(0);
  const { width } = useWindowDimensions();
  const wallet = useResource<Schemas['Wallet']>('/v1/me/wallet', true);
  const params = useLocalSearchParams<{ category?: string }>();
  const category = rewardCategories.find((item) => item === params.category);
  const catalog = usePages<Schemas['Reward']>(
    category ? `/v1/rewards?category=${category}` : '/v1/rewards',
  );
  const { refetch: refreshCatalog } = catalog;
  const { refetch: refreshWallet } = wallet;
  useFocusEffect(
    useCallback(() => {
      void refreshCatalog();
      if (status === 'authenticated') void refreshWallet();
    }, [status, refreshCatalog, refreshWallet]),
  );
  const [offer, setOffer] = useState<{ reward: Schemas['Reward']; account: string } | null>(null);
  useEffect(() => {
    setOffer(null);
  }, [user?.id]);
  const all = catalog.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <RewardPage
      title="Phần thưởng"
      scrollRef={scroll}
      titleArtwork={a.catalogGift}
      balance={wallet.data?.balance}
      headerHeight={248}
      background={dark ? colors.background : '#F7F7F7'}
      backdrop={
        <>
          <Artwork
            source={a.catalogGlow}
            width={673}
            height={673}
            style={{ position: 'absolute', left: -426, top: 195 }}
          />
          <Artwork
            source={a.catalogGlow}
            width={673}
            height={673}
            style={{ position: 'absolute', left: width - 254, top: -10 }}
          />
        </>
      }
      action={<RewardPill onPress={() => router.push('/history')}>Lịch sử</RewardPill>}
    >
      <DailyClaimCard
        key={user?.id ?? 'guest'}
        onBrowseRewards={() =>
          scroll.current?.scrollTo({ y: catalogOffset.current, animated: true })
        }
      />
      <View
        onLayout={(event) => {
          catalogOffset.current = event.nativeEvent.layout.y;
        }}
        style={{ marginTop: 24, paddingHorizontal: 30, gap: 20 }}
      >
        <View style={{ gap: 9, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Artwork source={a.sectionGift} width={25} />
            <Label
              family="inter"
              size={20}
              bold
              heading
              color="#185B86"
              style={{ lineHeight: 27, flexShrink: 1 }}
            >
              ĐỔI CÁC PHẦN QUÀ
            </Label>
          </View>
          <Label family="inter" size={14} style={{ textAlign: 'center', lineHeight: 21 }}>
            Gom rác, tích xanh - Đổi quà thật nhanh!
          </Label>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 5 }}
        >
          <RewardCategory
            label="Tất cả"
            selected={!category}
            onPress={() => router.setParams({ category: undefined })}
          />
          {rewardCategories.map((value) => (
            <RewardCategory
              key={value}
              label={categoryLabels[value]}
              selected={category === value}
              onPress={() => router.setParams({ category: value })}
            />
          ))}
        </ScrollView>
        <Label family="inter" size={12} style={{ lineHeight: 18, textAlign: 'center' }}>
          🌱 Phân loại rác - Sống xanh mỗi ngày cùng BlueSteps ♻
        </Label>
        {status === 'authenticated' ? <CommandError error={wallet.error} /> : <RequireAuth />}
        <QueryState
          query={catalog}
          empty={!all.length}
          emptyText={category ? 'Chưa có quà trong danh mục này' : 'Chưa có quà được công bố'}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
            {all.map((item) => (
              <View
                key={item.id}
                style={{
                  width: '47.8%',
                  minHeight: 172,
                  padding: 10,
                  borderRadius: 15,
                  backgroundColor: colors.surface,
                  boxShadow: '0px 4px 3px rgba(0,0,0,0.22)',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={item.name}
                  onPress={() =>
                    router.push({ pathname: '/rewards/[id]', params: { id: item.id } })
                  }
                  style={{ width: '100%', alignItems: 'center', gap: 4 }}
                >
                  <MediaSlot
                    code={item.code}
                    icon="gift-outline"
                    style={{ width: '100%', height: 72, borderRadius: 12 }}
                  />
                  <Label
                    family="inter"
                    size={15}
                    bold
                    color="#185B86"
                    style={{ lineHeight: 20, textAlign: 'center' }}
                  >
                    {item.name}
                  </Label>
                  <Label family="inter" size={12} style={{ lineHeight: 16, textAlign: 'center' }}>
                    {item.description}
                  </Label>
                  <View
                    style={{
                      borderRadius: 10,
                      backgroundColor: colors.brand,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    <Icon name="leaf" size={10} color="#D6EE70" />
                    <Label
                      family="inter"
                      size={10}
                      color={colors.heroText}
                      style={{ lineHeight: 14 }}
                    >
                      {item.costPoints} điểm
                    </Label>
                  </View>
                  <Label family="inter" size={10} color={colors.muted} style={{ lineHeight: 14 }}>
                    Còn {item.available}
                  </Label>
                </Pressable>
                {(item.redemptionEnabled && item.available > 0) ||
                hasPendingRedemption(user?.id, item.id) ? (
                  <Button
                    title={
                      hasPendingRedemption(user?.id, item.id) ? 'Kiểm tra lượt đổi' : 'Đổi quà'
                    }
                    accessibilityLabel={`Đổi quà ${item.name}`}
                    variant="quiet"
                    disabled={
                      status === 'authenticated' &&
                      !wallet.data &&
                      !hasPendingRedemption(user?.id, item.id)
                    }
                    onPress={() => {
                      if (!user) {
                        router.push({
                          pathname: '/login',
                          params: { returnTo: `/rewards/${item.id}` },
                        });
                        return;
                      }
                      setOffer({ reward: item, account: user.id });
                    }}
                  />
                ) : null}
              </View>
            ))}
          </View>
          <More query={catalog} />
        </QueryState>
        <DesignLink onPress={() => router.push('/rewards/guide')} style={{ alignSelf: 'center' }}>
          Cách quy đổi điểm xanh
        </DesignLink>
      </View>
      {offer && offer.account === user?.id ? (
        <RewardRedemptionDialog
          offer={offer.reward}
          current={all.find((item) => item.id === offer.reward.id)}
          quantity={1}
          balance={wallet.data?.balance}
          onClose={() => setOffer(null)}
          onRefresh={() => {
            void catalog.refetch();
            void wallet.refetch();
          }}
        />
      ) : null}
    </RewardPage>
  );
}

export function RewardCategory({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={onPress}
      style={{
        minHeight: 30,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#478AAE',
        backgroundColor: selected ? colors.brand : colors.surface,
        paddingHorizontal: 13,
        paddingVertical: 5,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Label
        family="inter"
        size={14}
        color={selected ? colors.heroText : colors.text}
        style={{ lineHeight: 20 }}
      >
        {label}
      </Label>
    </Pressable>
  );
}
