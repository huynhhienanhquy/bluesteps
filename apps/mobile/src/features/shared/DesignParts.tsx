import { useState, type PropsWithChildren, type ComponentProps } from 'react';
import { Platform, Pressable, TextInput, View, type ViewStyle } from 'react-native';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Artwork } from '../../design-system/DesignScreen';
import {
  curvedArtwork,
  eventArtwork,
  handbookNavigationArtwork,
  savedEventsNavigationArtwork,
} from '../../design-system/catalog-artwork';
import { Icon, Label, Typography } from '../../design-system/ui';
import { useApp } from '../../providers';
import { rewardNavigationArtwork } from '../../design-system/reward-artwork';
import { eventDetailNavigationArtwork } from '../../design-system/event-flow-artwork';
import { catalogMedia, hasCatalogMedia } from '../../design-system/catalog-media';

export function CurvedNavigation({
  selected = null,
  variant = 'news',
}: {
  selected?: 'home' | 'collection' | 'rewards' | 'profile' | 'scan' | null;
  variant?: 'handbook' | 'news' | 'events' | 'rewards' | 'event-detail' | 'saved-events';
}) {
  const [width, setWidth] = useState(428),
    insets = useSafeAreaInsets();
  const scale = width / 428,
    bottom = Platform.OS === 'web' ? 0 : Math.max(0, insets.bottom - 12);
  const handbook = variant === 'handbook';
  const rewards = variant === 'rewards';
  const savedEvents = variant === 'saved-events';
  const artwork =
    variant === 'event-detail'
      ? eventDetailNavigationArtwork
      : variant === 'saved-events'
        ? savedEventsNavigationArtwork
        : curvedArtwork;
  const layers = [
    ['imgRectangle87', 177, 49, 95, 67],
    ['imgVector', 381.4, 63.6, 11.2, 11.2],
    ['imgVector1', 373, 58, 28, 28],
    ['imgVector2', 289.49, 69.85, 27.0035, 16.9],
    ['imgVector3', 288.25, 57.25, 29.5, 28.8],
    ['imgVector4', 129.25, 64.12, 29.5002, 25.1742],
    ['imgVector5', 130.14, 57.25, 27.7512, 27.4645],
    ['imgVector6', 47.25, 57.25, 29.5, 29.5],
    ['imgEllipse9', 181, 0, 83, 83],
    ['imgVector7', 207, 22, 32, 32],
    ['imgLine1', 161, 107.44, 141, 2.56],
  ] as const;
  const savedLayers = [
    ['bridge', 169, 49, 95, 67],
    ['home', 12, 51, 87, 47],
    ['collection', 121.25, 57.25, 29.5002, 32.0458],
    ['rewards', 280.25, 57.25, 29.5, 29.5],
    ['profile', 365, 58, 28, 28],
    ['scan', 173, 0, 83, 83],
    ['gesture', 153, 107.44, 141, 2.56],
  ] as const;
  const links = [
    { name: 'home', title: 'Trang chủ', path: '/', source: artwork.home, left: 9 },
    {
      name: 'collection',
      title: 'Thu gom',
      path: '/collection',
      source: artwork.collection,
      left: 102,
    },
    {
      name: 'rewards',
      title: 'Đổi quà',
      path: '/rewards',
      source: artwork.rewards,
      left: 264,
    },
    {
      name: 'profile',
      title: 'Cá nhân',
      path: '/profile',
      source: artwork.profile,
      left: 348,
    },
  ] as const;
  return (
    <View
      pointerEvents="box-none"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: 116 * scale + bottom, width: '100%' }}
    >
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          width: 428,
          height: 116,
          left: (width - 428) / 2,
          top: 0,
          transform: [{ scale }],
          transformOrigin: 'top center',
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: -8,
            top: 39,
            width: 185,
            height: 77,
            backgroundColor: '#147CC1',
            borderTopRightRadius: 35,
          }}
        />
        <View
          style={{
            position: 'absolute',
            right: -8,
            top: 41,
            width: 185,
            height: 75,
            backgroundColor: '#147CC1',
            borderTopLeftRadius: 35,
          }}
        />
        {handbook ? (
          layers
            .filter(([key]) => Platform.OS === 'web' || key !== 'imgLine1')
            .map(([key, left, top, w, h]) => (
              <Artwork
                key={key}
                source={handbookNavigationArtwork[key]}
                width={w}
                height={h}
                fit="fill"
                style={{ position: 'absolute', left: left - 8, top }}
              />
            ))
        ) : savedEvents ? (
          savedLayers
            .filter(([key]) => Platform.OS === 'web' || key !== 'gesture')
            .map(([key, left, top, w, h]) => (
              <Artwork
                key={key}
                source={
                  key === 'scan' && Platform.OS !== 'web'
                    ? savedEventsNavigationArtwork.scanNative
                    : savedEventsNavigationArtwork[key]
                }
                width={w}
                height={h}
                style={{ position: 'absolute', left, top }}
              />
            ))
        ) : (
          <>
            <Artwork
              source={rewards ? rewardNavigationArtwork.bridge : artwork.bridge}
              width={95}
              height={68}
              style={{ position: 'absolute', top: 49, left: 165 }}
            />
            {links.map((link) => (
              <View
                key={link.name}
                style={{
                  position: 'absolute',
                  left: link.left,
                  top: 49,
                  width: link.name === 'home' ? 87 : 83,
                  height: 47,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {rewards && link.name === 'rewards' ? (
                  <View
                    style={{
                      position: 'absolute',
                      width: 87,
                      height: 47,
                      borderTopLeftRadius: 60,
                      borderTopRightRadius: 25,
                      borderBottomLeftRadius: 25,
                      borderBottomRightRadius: 25,
                      backgroundColor: '#075A9C',
                      top: -1,
                      left: -9,
                    }}
                  />
                ) : null}
                <Artwork
                  source={
                    rewards
                      ? rewardNavigationArtwork[link.name]
                      : link.name === 'home' && selected !== 'home'
                        ? handbookNavigationArtwork.imgVector6
                        : link.source
                  }
                  width={
                    link.name === 'home' && selected === 'home'
                      ? 87
                      : link.name === 'rewards'
                        ? 29.5
                        : rewards && link.name === 'home'
                          ? 29.5
                          : 28
                  }
                  height={
                    link.name === 'home' && selected === 'home'
                      ? 47
                      : link.name === 'collection'
                        ? 32.0458
                        : link.name === 'rewards'
                          ? 29.5
                          : 28
                  }
                />
              </View>
            ))}
            <Artwork
              source={rewards ? rewardNavigationArtwork.scan : artwork.scan}
              width={83}
              height={83}
              style={{ position: 'absolute', left: 169, top: 0 }}
            />
            {Platform.OS === 'web' ? (
              <View
                style={{
                  position: 'absolute',
                  left: 150,
                  bottom: 8,
                  height: 3,
                  width: 128,
                  borderRadius: 2,
                  backgroundColor: '#000',
                }}
              />
            ) : null}
          </>
        )}
        {links.map((link, index) => (
          <Pressable
            key={link.name}
            accessibilityRole="tab"
            accessibilityLabel={link.title}
            accessibilityState={{ selected: selected === link.name }}
            aria-selected={selected === link.name}
            onPress={() => router.replace(link.path)}
            style={{
              position: 'absolute',
              left: [12, 94, 256, 340][index],
              top: 49,
              width: 83,
              height: 47,
              borderRadius: 25,
            }}
          />
        ))}
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="Quét rác"
          accessibilityState={{ selected: selected === 'scan' }}
          onPress={() => router.push('/scan')}
          style={{
            position: 'absolute',
            left: handbook || savedEvents ? 173 : 169,
            top: 0,
            width: 83,
            height: 83,
          }}
        />
      </View>
      {bottom ? (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            height: bottom,
            width: '100%',
            backgroundColor: '#147CC1',
          }}
        />
      ) : null}
    </View>
  );
}

export function CatalogHeader({
  title,
  action,
  onBack,
  large = false,
  titleColor = '#172B3D',
  centered = false,
}: {
  title: string;
  action?: React.ReactNode;
  onBack?: () => void;
  large?: boolean;
  titleColor?: string;
  centered?: boolean;
}) {
  return (
    <View
      style={{ minHeight: large ? 44 : 32, flexDirection: 'row', alignItems: 'center', gap: 12 }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
        hitSlop={6}
        style={{ width: 24, height: 32, alignItems: 'center', justifyContent: 'center' }}
      >
        <Artwork source={eventArtwork.back} width={24} />
      </Pressable>
      <Label
        heading
        family="inter"
        size={large ? 30 : 18}
        bold
        color={titleColor}
        style={{ lineHeight: large ? 36 : 24, flex: 1, textAlign: centered ? 'center' : 'left' }}
      >
        {title}
      </Label>
      {action}
    </View>
  );
}

export function CatalogSearch({
  value,
  onChangeText,
  placeholder,
  source,
  onSubmitEditing,
  menu,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  source?: ComponentProps<typeof Image>['source'];
  onSubmitEditing?: () => void;
  menu?: React.ReactNode;
}) {
  return (
    <View
      style={{
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#D7E7F3',
        backgroundColor: '#F4F9FC',
        paddingHorizontal: 14,
        gap: 10,
      }}
    >
      {!source ? <Icon name="search-outline" color="#147CC1" size={20} /> : null}
      <TextInput
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        placeholderTextColor="#64748B"
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        returnKeyType="search"
        style={{
          fontFamily: 'Inter_400Regular',
          fontSize: 14,
          color: '#172B3D',
          flex: 1,
          minWidth: 0,
          minHeight: 46,
          padding: 0,
        }}
      />
      {source ? <Artwork source={source} width={20} /> : null}
      {menu}
    </View>
  );
}

export function CatalogChip({
  label,
  selected,
  onPress,
  icon,
  disabled = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      aria-disabled={disabled}
      disabled={disabled}
      aria-pressed={selected}
      onPress={onPress}
      style={{
        minHeight: 40,
        opacity: disabled ? 0.5 : 1,
        borderRadius: 22,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: selected ? '#147CC1' : '#D7E7F3',
        backgroundColor: selected ? '#DCEEF9' : '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      {icon}
      <Label
        family="inter"
        size={14}
        weight="medium"
        color={selected ? '#147CC1' : '#64748B'}
        style={{ lineHeight: 20 }}
      >
        {label}
      </Label>
    </Pressable>
  );
}

export function MediaSlot({
  uri,
  code,
  icon = 'image-outline',
  style,
}: {
  uri?: string;
  code?: string;
  icon?: string;
  style?: ViewStyle;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const { colors } = useApp();
  const identity = uri ?? code;
  const source =
    identity && hasCatalogMedia(identity) ? catalogMedia[identity] : uri ? { uri } : undefined;
  return (
    <View
      style={[
        {
          overflow: 'hidden',
          backgroundColor: colors.soft,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {source && failed !== identity ? (
        <Image
          source={source}
          contentFit="cover"
          onError={() => setFailed(identity ?? null)}
          style={{ width: '100%', height: '100%' }}
          accessible={false}
        />
      ) : (
        <Icon name={icon} size={32} color={colors.muted} />
      )}
    </View>
  );
}

export function SectionLink({
  title,
  action = 'Xem thêm',
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <Label
        family="inter"
        size={16}
        weight="semibold"
        color="#172B3D"
        heading
        style={{ lineHeight: 22, flex: 1 }}
      >
        {title}
      </Label>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Label family="inter" size={12} weight="semibold" color="#147CC1">
            {action} →
          </Label>
        </Pressable>
      ) : null}
    </View>
  );
}

export function NavigationTile({
  children,
  onPress,
  style,
  label,
}: PropsWithChildren<{ onPress: () => void; style?: ViewStyle; label: string }>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={style}
    >
      {children}
    </Pressable>
  );
}

export function openPath(path: Href) {
  router.push(path);
}
export const CatalogTypography = Typography;
