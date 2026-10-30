import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, type Href } from 'expo-router';
import { useApp } from '../../providers';
import { Label } from '../../design-system/ui';
import {
  Artwork,
  DesignIconButton,
  DesignLink,
  DesignScreen,
  DesignSection,
  designStyles,
} from '../../design-system/DesignScreen';
import { homeAssets as assets } from '../../design-system/figma-assets';
import { articles, events, wasteItems } from '../../services/fixtures';
import { mockProfile, mockWallet } from '../../services/mock-session';

export function HomeScreen() {
  const { colors } = useApp();
  const compact = useWindowDimensions().width < 410;
  const quickActions: { title: string; source: number; path: Href }[] = [
    { title: 'Phân loại', source: assets.imgIconRecycle, path: '/handbook' },
    { title: 'Thu gom', source: assets.imgIconMap, path: '/collection' },
    { title: 'Cộng đồng', source: assets.imgIconPeople, path: '/community' },
    { title: 'Tin tức', source: assets.imgIconBook, path: '/articles' },
  ];
  return (
    <DesignScreen
      header={
        <View
          style={[designStyles.row, { justifyContent: 'space-between', gap: compact ? 12 : 24.5 }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hồ sơ cá nhân"
            onPress={() => router.push('/profile')}
          >
            <Artwork
              source={assets.imgHSCaNhan}
              width={48}
              fit="cover"
              style={{ borderRadius: 24 }}
            />
          </Pressable>
          <View style={{ flex: 1, gap: 3 }}>
            <Label size={21} bold heading style={{ lineHeight: 29 }}>
              Chào {mockProfile.displayName}!
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
              source={assets.imgIconBell}
              label="Thông báo"
              onPress={() => router.push('/notifications')}
            />
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
          </View>
        </View>
      }
    >
      <View style={[styles.hero, { backgroundColor: colors.brand }]}>
        <Label
          size={10}
          weight="semibold"
          color={colors.heroText}
          style={{ lineHeight: 14, position: 'absolute', top: 19, left: 20 }}
        >
          BLUENSTEPS · MỖI NGÀY XANH
        </Label>
        <Label
          size={24}
          bold
          color={colors.heroText}
          style={{ lineHeight: 34, position: 'absolute', top: 48, left: 20 }}
        >
          Phân loại rác.{'\n'}Gieo mầm xanh.
        </Label>
        <Label
          size={12}
          color={colors.heroText}
          style={{ lineHeight: 17, position: 'absolute', top: 123, left: 20 }}
        >
          Bắt đầu từ một món đồ nhỏ.{'\n'}Tạo nên những thay đổi lớn.
        </Label>
        <Artwork
          source={assets.imgTraiDtVaMmCay}
          width={compact ? 100 : 122}
          height={compact ? 119 : 145}
          style={{ position: 'absolute', right: 14, top: compact ? 73 : 55 }}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/scan')}
          style={[
            designStyles.whiteButton,
            { position: 'absolute', top: 166, left: 20, width: 181 },
          ]}
        >
          <Label size={15} weight="semibold" color="#164561" style={{ lineHeight: 22 }}>
            Quét rác ngay
          </Label>
        </Pressable>
      </View>
      <View style={{ gap: 12 }}>
        <DesignSection title="Bạn muốn làm gì?" />
        <View style={[designStyles.row, { gap: 12 }]}>
          {quickActions.map((action) => (
            <Pressable
              key={action.title}
              accessibilityRole="button"
              accessibilityLabel={action.title}
              onPress={() => router.push(action.path)}
              style={styles.shortcut}
            >
              <View
                style={[
                  styles.shortcutIcon,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Artwork source={action.source} width={27} />
              </View>
              <Label
                size={11}
                weight="semibold"
                style={{ lineHeight: 15, textAlign: 'center', marginTop: 13 }}
              >
                {action.title}
              </Label>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={[styles.wallet, { backgroundColor: colors.soft }]}>
        <View style={[styles.walletIcon, { backgroundColor: colors.surface }]}>
          <Artwork source={assets.imgIconGift} width={26} />
        </View>
        <View style={{ position: 'absolute', left: 76, top: 18 }}>
          <Label size={10} weight="semibold" color={colors.muted} style={{ lineHeight: 14 }}>
            ĐIỂM XANH CỦA BẠN
          </Label>
          <Label size={30} bold color={colors.brand} style={{ lineHeight: 42, marginTop: 4 }}>
            {mockWallet.balance}
          </Label>
        </View>
        <DesignLink
          onPress={() => router.push('/rewards')}
          style={{ position: 'absolute', top: 25, right: 18 }}
        >
          Đổi quà →
        </DesignLink>
        <View
          style={{
            position: 'absolute',
            left: 18,
            right: 18,
            top: 89,
            height: 1,
            backgroundColor: colors.border,
          }}
        />
        <View
          style={[
            designStyles.row,
            { position: 'absolute', left: 18, right: 18, top: 100, gap: 10 },
          ]}
        >
          <Artwork source={assets.imgIconLeaf} width={24} />
          <Label size={12} weight="semibold" style={{ flex: 1, lineHeight: 17 }}>
            Phân loại rác mỗi ngày
          </Label>
          <DesignLink onPress={() => router.push('/scan')}>Bắt đầu</DesignLink>
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <DesignSection
          title="Hoạt động xanh"
          action="Đã lưu"
          onPress={() => router.push('/saved')}
        />
        <View style={[designStyles.row, { gap: 14 }]}>
          {[
            {
              title: 'Giờ học xanh',
              area: 'TP. Hồ Chí Minh',
              count: '200+',
              source: assets.imgNhHotDng,
            },
            {
              title: 'Vì một bãi biển sạch',
              area: 'Mỹ Khê, Đà Nẵng',
              count: '300+',
              source: assets.imgNhHotDng1,
            },
          ].map((item, index) => (
            <Pressable
              key={item.title}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              onPress={() => router.push(`/events/${events[index]!.id}`)}
              style={[
                styles.event,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Artwork
                source={item.source}
                width={183}
                height={116}
                fit="cover"
                style={{ width: '100%' }}
              />
              <View style={{ padding: 12, gap: 7 }}>
                <Label size={14} weight="semibold" style={{ lineHeight: 20 }}>
                  {item.title}
                </Label>
                <Label size={11} weight="medium" color={colors.muted} style={{ lineHeight: 15 }}>
                  {item.area}
                </Label>
              </View>
              <View
                style={[
                  designStyles.row,
                  {
                    position: 'absolute',
                    left: 12,
                    right: 12,
                    bottom: 16,
                    justifyContent: 'space-between',
                  },
                ]}
              >
                <Label size={9} weight="medium" color={colors.brand} style={{ lineHeight: 13 }}>
                  {item.count} người tham gia
                </Label>
                <Artwork source={assets.imgIconArrow} width={18} />
              </View>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <DesignSection
          title="Sổ tay phân loại"
          action="Tất cả"
          onPress={() => router.push('/handbook')}
        />
        <View style={[designStyles.row, { gap: 13 }]}>
          {[
            {
              title: 'Nhựa',
              source: assets.imgVtLiuNha,
              item: wasteItems.find((item) => item.material === 'Nhựa'),
            },
            {
              title: 'Giấy',
              source: assets.imgVtLiuGiy,
              item: wasteItems.find((item) => item.material === 'Giấy'),
            },
            {
              title: 'Pin',
              source: assets.imgVtLiuPin,
              item: wasteItems.find((item) => item.material === 'Pin'),
            },
          ].map((item) => (
            <Pressable
              key={item.title}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              onPress={() => router.push(item.item ? `/handbook/${item.item.id}` : '/handbook')}
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="11 triệu tấn rác mỗi ngày: Chúng ta có thể làm gì?"
          onPress={() => router.push(`/articles/${articles[0]!.id}`)}
          style={[styles.article, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Artwork
            source={assets.imgNhTinTc}
            width={102}
            height={106}
            fit="cover"
            style={{ borderRadius: 16 }}
          />
          <View style={{ flex: 1, gap: 8, alignSelf: 'flex-start', paddingTop: 3 }}>
            <Label size={9} weight="semibold" color={colors.brand} style={{ lineHeight: 13 }}>
              MÔI TRƯỜNG
            </Label>
            <Label size={14} weight="semibold" style={{ lineHeight: 20 }}>
              11 triệu tấn rác mỗi ngày:{'\n'}Chúng ta có thể làm gì?
            </Label>
            <Label size={11} weight="medium" color={colors.muted} style={{ lineHeight: 15 }}>
              5 phút đọc · Tái chế
            </Label>
          </View>
        </Pressable>
      </View>
      <View style={[styles.community, { backgroundColor: colors.mint }]}>
        <Artwork
          source={assets.imgIconPeople1}
          width={38}
          style={{ position: 'absolute', left: 20, top: 20 }}
        />
        <Label size={20} bold style={{ position: 'absolute', left: 72, top: 19, lineHeight: 28 }}>
          Đi cùng nhau,{'\n'}xanh hơn mỗi ngày.
        </Label>
        <Label
          size={12}
          color={colors.muted}
          style={{ position: 'absolute', left: 20, top: 82, lineHeight: 17 }}
        >
          Chia sẻ một hành động nhỏ để lan tỏa{'\n'}cảm hứng sống xanh đến mọi người.
        </Label>
        <DesignLink
          onPress={() => router.push('/community')}
          style={{ position: 'absolute', left: 20, top: 122 }}
        >
          Ghé cộng đồng →
        </DesignLink>
      </View>
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
  hero: { height: 226, borderRadius: 28, overflow: 'hidden' },
  shortcut: { flex: 1, height: 96, alignItems: 'center' },
  shortcutIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wallet: { height: 156, borderRadius: 26, overflow: 'hidden' },
  walletIcon: {
    position: 'absolute',
    left: 18,
    top: 18,
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  event: { flex: 1, height: 236, borderWidth: 1, borderRadius: 22, overflow: 'hidden' },
  material: {
    flex: 1,
    height: 126,
    borderWidth: 1,
    borderRadius: 22,
    paddingTop: 12,
    alignItems: 'center',
  },
  article: {
    height: 130,
    borderRadius: 24,
    borderWidth: 1,
    padding: 11,
    flexDirection: 'row',
    gap: 16,
  },
  community: { height: 176, borderRadius: 26, overflow: 'hidden' },
});
