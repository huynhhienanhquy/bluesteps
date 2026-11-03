import { useState, type PropsWithChildren, type ReactNode, type ComponentProps, type Ref } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { PrivateModal as Modal } from './PrivateModal';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Artwork, DesignLink, StatusSpace } from '../../design-system/DesignScreen';
import { rewardArtwork as a } from '../../design-system/reward-artwork';
import { Icon, Label, Typography } from '../../design-system/ui';
import { useApp } from '../../providers';
import { CurvedNavigation } from './DesignParts';

/** Shared frame 386:11451/12071 header; content remains scrollable at large font sizes. */
export function RewardPage({
  title,
  balance,
  children,
  action,
  headerHeight = 172,
  tabs = false,
  background,
  titleArtwork,
  backdrop,
  scrollRef,
}: PropsWithChildren<{
  title: string;
  balance?: string;
  action?: ReactNode;
  headerHeight?: number;
  tabs?: boolean;
  background?: string;
  titleArtwork?: ComponentProps<typeof Artwork>['source'];
  backdrop?: ReactNode;
  scrollRef?: Ref<ScrollView>;
}>) {
  const { colors } = useApp();
  const insets = useSafeAreaInsets();
  return (
    <Typography.Provider value="inter">
      <View style={{ flex: 1, backgroundColor: background ?? colors.surface }}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {backdrop ? (
            <View
              pointerEvents="none"
              style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
            >
              {backdrop}
            </View>
          ) : null}
          <View
            style={{
              minHeight: headerHeight - (Platform.OS === 'web' ? 0 : 54) + insets.top,
              borderBottomLeftRadius: 25,
              borderBottomRightRadius: 25,
              backgroundColor: colors.brand,
            }}
          >
            <StatusSpace />
            <View
              style={{
                minHeight: 38,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                paddingHorizontal: 24,
                marginTop: -5,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Quay lại"
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/rewards'))}
                style={{
                  width: 44,
                  minHeight: 44,
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                }}
              >
                <Artwork source={a.back} width={22} height={28} />
              </Pressable>
              <View style={{ flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <Label
                  family="inter"
                  size={28}
                  bold
                  heading
                  color={colors.heroText}
                  style={{ flexShrink: 1, lineHeight: 34 }}
                >
                  {title}
                </Label>
                {titleArtwork ? <Artwork source={titleArtwork} width={30} /> : null}
              </View>
              <RewardMenu />
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                marginLeft: 37,
                marginRight: 30,
                marginTop: 2,
              }}
            >
              <Artwork source={a.plus} width={35} />
              <Label
                family="inter"
                size={30}
                bold
                color={colors.heroText}
                style={{ lineHeight: 38 }}
              >
                {balance ?? '—'} điểm
              </Label>
            </View>
            {action ? (
              <View
                style={{ alignSelf: 'flex-end', marginRight: 34, marginTop: -17, marginBottom: 16 }}
              >
                {action}
              </View>
            ) : null}
          </View>
          {children}
        </ScrollView>
        {tabs ? null : <CurvedNavigation selected="rewards" variant="rewards" />}
      </View>
    </Typography.Provider>
  );
}

export function RewardMenu() {
  const { colors } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tùy chọn điểm xanh"
        onPress={() => setOpen(true)}
        style={{ width: 28, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="ellipsis-vertical" color={colors.heroText} size={24} />
      </Pressable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(22,69,97,0.24)',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng tùy chọn điểm xanh"
            onPress={() => setOpen(false)}
            style={{ position: 'absolute', inset: 0 }}
          />
          <View
            accessibilityViewIsModal
            style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 24, gap: 8 }}
          >
            <Label family="inter" size={22} bold heading>
              Điểm xanh
            </Label>
            {(
              [
                { title: 'Phần thưởng', path: '/rewards/catalog' },
                { title: 'Lịch sử điểm và quà', path: '/history' },
                { title: 'Cách quy đổi điểm', path: '/rewards/guide' },
              ] as const
            ).map((item) => (
              <DesignLink
                key={item.path}
                onPress={() => {
                  setOpen(false);
                  router.push(item.path);
                }}
              >
                {item.title}
              </DesignLink>
            ))}
            <DesignLink onPress={() => setOpen(false)}>Đóng</DesignLink>
          </View>
        </View>
      </Modal>
    </>
  );
}

export function RewardPill({ children, onPress }: PropsWithChildren<{ onPress: () => void }>) {
  const { colors } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        minHeight: 30,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 25,
        backgroundColor: '#FFFFFFAA',
        flexDirection: 'row',
        gap: 4,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Label family="inter" size={12} bold color={colors.text} style={{ lineHeight: 18 }}>
        {children}
      </Label>
      <Icon name="chevron-forward" size={16} />
    </Pressable>
  );
}
