import { useRef } from 'react';
import { router, useScrollToTop, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useApp } from '../../providers';
import { Button, Label, Icon, Notice } from '../../design-system/ui';
import {
  Artwork,
  DesignIconButton,
  DesignLink,
  DesignScreen,
  DesignSection,
  designStyles,
} from '../../design-system/DesignScreen';
import { homeAssets as a } from '../../design-system/app-assets';
import { materialArtwork } from '../../design-system/catalog-artwork';
import { usePages, useResource } from '../../services/queries';
import { useRefreshOnFocus } from '../../services/query-focus';
import type { Schemas } from '../../services/api';
import { QueryState } from '../shared/common';
import { MediaSlot } from '../shared/DesignParts';
import { useOnboarding } from '../onboarding/OnboardingProvider';
import { useOptionalLocalProfile } from '../profile/LocalProfileProvider';
import { UserAvatar } from '../profile/UserAvatar';
import { articleCoverUrl, estimatedReadingMinutes } from '../news/article-reading';

const shortcuts: { title: string; source: number; path: Href }[] = [
  { title: 'Phân loại', source: a.imgIconRecycle, path: '/handbook' },
  { title: 'Thu gom', source: a.imgIconMap, path: '/collection' },
  { title: 'Cộng đồng', source: a.imgIconPeople, path: '/community' },
  { title: 'Tin tức', source: a.imgIconBook, path: '/articles' },
];
export function HomeScreen() {
  const { user, status, colors } = useApp();
  const profile = useOptionalLocalProfile()?.profile;
  const displayName = profile?.displayName ?? user?.displayName;
  const { syncError, retrySync } = useOnboarding();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 410;
  const narrow = width < 380;
  const largeText = fontScale > 1.1;
  const scroll = useRef<ScrollView>(null);
  useScrollToTop(scroll);
  const wallet = useResource<Schemas['Wallet']>('/v1/me/wallet', true);
  const events = usePages<Schemas['GreenEvent']>('/v1/events');
  const articles = usePages<Schemas['Article']>('/v1/articles');
  const notifications = useResource<{ unread: number }>('/v1/me/notifications/summary', true);
  const unread = (notifications.data?.unread ?? 0) > 0;
  useRefreshOnFocus([
    status !== 'loading' && events,
    status !== 'loading' && articles,
    status === 'authenticated' && wallet,
    status === 'authenticated' && notifications,
  ]);
  const eventItems = events.data?.pages.flatMap((page) => page.items).slice(0, 2) ?? [];
  const article = articles.data?.pages.flatMap((page) => page.items)[0];
  return (
    <DesignScreen
      scrollRef={scroll}
      header={
        <View style={[designStyles.row, { gap: compact ? 12 : 24.5 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hồ sơ cá nhân"
            onPress={() => router.push('/profile')}
            style={[styles.avatar, { backgroundColor: colors.soft }]}
          >
            {user ? (
              <UserAvatar
                userId={user.id}
                name={user.displayName}
                size={48}
                foreground={colors.brand}
              />
            ) : (
              <Icon name="person-outline" size={26} />
            )}
          </Pressable>
          <View style={{ flex: 1, gap: 3 }}>
            <Label size={21} bold heading style={{ lineHeight: 29 }}>
              {user ? 'Chào ' + displayName + '!' : 'Chào bạn!'}
            </Label>
            <Label
              size={compact ? 10 : 11}
              weight="medium"
              color={colors.muted}
              style={{ lineHeight: 15 }}
            >
              Hôm nay, mình cùng sống xanh nhé.
            </Label>
          </View>
          <View>
            <DesignIconButton
              source={a.imgIconBell}
              label={
                notifications.data?.unread
                  ? `Thông báo, ${notifications.data.unread} chưa đọc`
                  : 'Thông báo'
              }
              onPress={() => router.push('/notifications')}
            />
            {unread ? (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 9,
                  right: 10,
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.brand,
                }}
              />
            ) : null}
          </View>
        </View>
      }
    >
      {syncError ? (
        <View style={{ gap: 8 }}>
          <Notice>Chưa lưu được lựa chọn từ màn giới thiệu. Bạn có thể thử lại.</Notice>
          <Button title="Lưu lại lựa chọn" variant="secondary" onPress={retrySync} />
        </View>
      ) : null}
      <View style={[styles.hero, { backgroundColor: colors.brand }]}>
        <View style={{ flex: 1, gap: 10, zIndex: 1 }}>
          <Label size={10} weight="semibold" color={colors.heroText} style={{ lineHeight: 14 }}>
            BLUENSTEPS · MỖI NGÀY XANH
          </Label>
          <Label
            size={narrow ? 22 : 24}
            bold
            color={colors.heroText}
            style={{ lineHeight: 34, marginTop: 5, maxWidth: largeText ? '100%' : 238 }}
          >
            Phân loại rác.{'\n'}Gieo mầm xanh.
          </Label>
          <Label
            size={12}
            color={colors.heroText}
            style={{ lineHeight: 17, maxWidth: 222, marginTop: -3 }}
          >
            Bắt đầu từ một món đồ nhỏ.{'\n'}Tạo nên những thay đổi lớn.
          </Label>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/scan')}
            style={[designStyles.whiteButton, { width: 181, marginTop: -1 }]}
          >
            <Label size={15} weight="semibold" color="#164561" style={{ lineHeight: 22 }}>
              Quét rác ngay
            </Label>
          </Pressable>
        </View>
        <Artwork
          source={a.imgTraiDtVaMmCay}
          width={largeText ? 64 : narrow ? 80 : compact ? 100 : 122}
          height={largeText ? 76 : narrow ? 95 : compact ? 119 : 145}
          style={
            largeText
              ? { position: 'absolute', right: 14, bottom: 16 }
              : { position: 'absolute', right: 14, top: compact ? 73 : 55 }
          }
        />
      </View>
      <View style={{ gap: 12 }}>
        <DesignSection title="Bạn muốn làm gì?" />
        <View style={[designStyles.row, { gap: 12 }]}>
          {shortcuts.map((item) => (
            <Pressable
              key={item.title}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              onPress={() => router.push(item.path)}
              style={styles.shortcut}
            >
              <View
                style={[
                  styles.shortcutIcon,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Artwork source={item.source} width={27} />
              </View>
              <Label
                size={11}
                weight="semibold"
                style={{ lineHeight: 15, textAlign: 'center', marginTop: 13 }}
              >
                {item.title}
              </Label>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={[styles.wallet, { backgroundColor: colors.soft }]}>
        <View
          style={[
            designStyles.row,
            { gap: 14, padding: 18, paddingBottom: 11, alignItems: 'flex-start' },
          ]}
        >
          <View style={[styles.walletIcon, { backgroundColor: colors.surface }]}>
            <Artwork source={a.imgIconGift} width={26} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Label size={10} weight="semibold" color={colors.muted} style={{ lineHeight: 14 }}>
              ĐIỂM XANH CỦA BẠN
            </Label>
            <Label size={30} bold color={colors.brand} style={{ lineHeight: 42 }}>
              {wallet.data?.balance ?? '—'}
            </Label>
          </View>
          <DesignLink
            onPress={() =>
              status === 'authenticated'
                ? router.push('/rewards')
                : router.push({ pathname: '/login', params: { returnTo: '/rewards' } })
            }
          >
            {status === 'authenticated' ? 'Đổi quà →' : 'Đăng nhập'}
          </DesignLink>
        </View>
        <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 18 }} />
        <View style={[designStyles.row, { paddingHorizontal: 18, gap: 10, minHeight: 66 }]}>
          <Artwork source={a.imgIconLeaf} width={24} />
          <Label size={12} weight="semibold" style={{ lineHeight: 17, flex: 1 }}>
            Phân loại rác mỗi ngày
          </Label>
          <DesignLink onPress={() => router.push('/scan')}>Bắt đầu</DesignLink>
        </View>
      </View>
      {status === 'authenticated' && wallet.isError ? <QueryState query={wallet} /> : null}
      <View style={{ gap: 12 }}>
        <DesignSection
          title="Hoạt động xanh"
          action="Đã lưu"
          onPress={() => router.push('/saved')}
        />
        <QueryState
          query={events}
          empty={!eventItems.length}
          emptyText="Chưa có hoạt động được công bố"
        >
          <View style={[designStyles.row, { gap: 14, alignItems: 'stretch' }]}>
            {eventItems.map((event) => (
              <Pressable
                key={event.id}
                accessibilityRole="button"
                accessibilityLabel={event.title}
                onPress={() => router.push({ pathname: '/events/[id]', params: { id: event.id } })}
                style={[
                  styles.event,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <MediaSlot
                  uri={
                    typeof event.details.imageUrl === 'string' ? event.details.imageUrl : undefined
                  }
                  icon="calendar-outline"
                  style={{ height: 116, width: '100%' }}
                />
                <View style={{ padding: 12, gap: 7, flex: 1 }}>
                  <Label size={14} weight="semibold" style={{ lineHeight: 20 }}>
                    {event.title}
                  </Label>
                  <Label size={11} weight="medium" color={colors.muted} style={{ lineHeight: 15 }}>
                    {event.location}
                  </Label>
                  <View
                    style={[
                      designStyles.row,
                      { justifyContent: 'space-between', marginTop: 'auto', gap: 4 },
                    ]}
                  >
                    <Label
                      size={9}
                      weight="medium"
                      color={colors.brand}
                      style={{ lineHeight: 13, flex: 1 }}
                    >
                      {event.reservedCount} người tham gia
                    </Label>
                    <Artwork source={a.imgIconArrow} width={18} />
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </QueryState>
      </View>
      <View style={{ gap: 12 }}>
        <DesignSection
          title="Sổ tay phân loại"
          action="Tất cả"
          onPress={() => router.push('/handbook')}
        />
        <View style={[designStyles.row, { gap: 13 }]}>
          {(
            [
              { title: 'Nhựa', kind: 'plastic', source: materialArtwork.plastic },
              { title: 'Giấy', kind: 'paper', source: materialArtwork.paper },
              { title: 'Pin', kind: 'battery', source: materialArtwork.battery },
            ] as const
          ).map((item) => (
            <Pressable
              key={item.kind}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              onPress={() =>
                router.push({ pathname: '/handbook/types/[kind]', params: { kind: item.kind } })
              }
              style={[
                styles.material,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Artwork source={item.source} width={60} height={65} style={{ borderRadius: 8 }} />
              <Label size={13} weight="semibold" style={{ lineHeight: 18, marginTop: 13 }}>
                {item.title}
              </Label>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <DesignSection
          title="Góc sống xanh"
          action="Xem thêm"
          onPress={() => router.push('/articles')}
        />
        <QueryState query={articles} empty={!article} emptyText="Chưa có bài đọc được công bố">
          {article ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={article.title}
              onPress={() =>
                router.push({ pathname: '/articles/[id]', params: { id: article.id } })
              }
              style={[
                styles.article,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <MediaSlot
                code={article.code}
                uri={articleCoverUrl(article)}
                icon="newspaper-outline"
                style={{ width: 102, height: 106, borderRadius: 16 }}
              />
              <View style={{ flex: 1, gap: 8, paddingTop: 3 }}>
                <Label size={9} weight="semibold" color={colors.brand} style={{ lineHeight: 13 }}>
                  {article.topic}
                </Label>
                <Label size={14} weight="semibold" style={{ lineHeight: 20 }}>
                  {article.title}
                </Label>
                <Label size={11} color={colors.muted} style={{ lineHeight: 15 }}>
                  {estimatedReadingMinutes(article)} phút đọc · {article.topic}
                </Label>
              </View>
            </Pressable>
          ) : null}
        </QueryState>
      </View>
      <View style={[styles.community, { backgroundColor: colors.mint }]}>
        <View style={[designStyles.row, { gap: 14, alignItems: 'flex-start' }]}>
          <Artwork source={a.imgIconPeople1} width={38} />
          <Label size={20} bold style={{ lineHeight: 28, flex: 1 }}>
            Đi cùng nhau,{'\n'}xanh hơn mỗi ngày.
          </Label>
        </View>
        <Label size={12} color={colors.muted} style={{ lineHeight: 17 }}>
          Chia sẻ một hành động nhỏ để lan tỏa{'\n'}cảm hứng sống xanh đến mọi người.
        </Label>
        <DesignLink onPress={() => router.push('/community')}>Ghé cộng đồng →</DesignLink>
      </View>
      <DesignLink onPress={() => router.push('/messages')}>Tin nhắn →</DesignLink>
      <Label
        size={11}
        weight="medium"
        color={colors.muted}
        style={{ lineHeight: 15, textAlign: 'center' }}
      >
        Mỗi bước nhỏ của bạn đều có ý nghĩa.
      </Label>
    </DesignScreen>
  );
}
const styles = StyleSheet.create({
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    minHeight: 226,
    borderRadius: 28,
    overflow: 'hidden',
    paddingTop: 19,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  shortcut: { flex: 1, height: 96, alignItems: 'center' },
  shortcutIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wallet: { minHeight: 156, borderRadius: 26, overflow: 'hidden' },
  walletIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  event: { flex: 1, minHeight: 236, borderWidth: 1, borderRadius: 22, overflow: 'hidden' },
  material: {
    flex: 1,
    minHeight: 126,
    borderWidth: 1,
    borderRadius: 22,
    paddingTop: 12,
    paddingBottom: 12,
    alignItems: 'center',
  },
  article: {
    minHeight: 130,
    borderRadius: 24,
    borderWidth: 1,
    padding: 11,
    flexDirection: 'row',
    gap: 16,
  },
  community: { minHeight: 176, borderRadius: 26, padding: 20, paddingBottom: 6, gap: 8 },
});
