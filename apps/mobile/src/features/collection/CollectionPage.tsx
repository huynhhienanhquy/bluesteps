import { useState, type PropsWithChildren, type ReactNode } from 'react';
import {
  Platform,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type TextProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { Artwork } from '../../design-system/DesignScreen';
import { collectionFlowAssets } from '../../design-system/collection-flow-assets';
const a = collectionFlowAssets['534:48401'];
type PageAssets = Pick<
  typeof a,
  | 'imgTime'
  | 'imgRectangle'
  | 'imgCombinedShape'
  | 'imgRectangle1'
  | 'imgWifi'
  | 'imgMobileSignal'
  | 'imgNhDiDin'
>;
export const collectionColors = {
  ink: '#172B3D',
  muted: '#677C8C',
  brand: '#147CC1',
  border: '#DEEBF3',
  soft: '#DCEEF9',
  mint: '#EDF7FC',
};
export function CollectionText({
  children,
  size = 14,
  weight = 'regular',
  color = collectionColors.ink,
  lineHeight = size === 12 ? 16 : size === 16 ? 22 : 20,
  style,
  ...props
}: TextProps & {
  size?: number;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  color?: string;
  lineHeight?: number;
}) {
  return (
    <Text
      {...props}
      style={[
        {
          fontFamily: {
            regular: 'BackupInter_400Regular',
            medium: 'BackupInter_500Medium',
            semibold: 'BackupInter_600SemiBold',
            bold: 'BackupInter_700Bold',
          }[weight],
          fontSize: size,
          lineHeight,
          color,
          includeFontPadding: false,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function CollectionPage({
  title,
  children,
  footer,
  source = a,
  backTo = '/collection',
  backSource = require('../../../assets/figma/common/collection-chevron.svg'),
  backSize = { width: 24, height: 24 },
  titleColor = collectionColors.ink,
  homeBarColor = collectionColors.ink,
  bottom,
}: PropsWithChildren<{
  title: string;
  footer: ReactNode;
  source?: PageAssets;
  backTo?: Href;
  backSource?: number;
  backSize?: { width: number; height: number };
  titleColor?: string;
  homeBarColor?: string;
  bottom?: ReactNode;
}>) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [width, setWidth] = useState(428);
  const scale = width / 428;
  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingTop: Platform.OS === 'web' ? 0 : insets.top,
      }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          minHeight: height - (Platform.OS === 'web' ? 0 : insets.top),
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
        {Platform.OS === 'web' ? (
          <View style={{ height: 49, width: '100%' }}>
            <Artwork
              source={source.imgTime}
              width={52}
              height={21}
              style={{ position: 'absolute', left: 12 * scale, top: 12 }}
            />
            <Artwork
              source={source.imgRectangle}
              width={22}
              height={11.333}
              style={{ position: 'absolute', right: 27 * scale, top: 17.333 }}
            />
            <Artwork
              source={source.imgCombinedShape}
              width={1.328}
              height={4}
              style={{ position: 'absolute', right: 24.67 * scale, top: 21 }}
            />
            <Artwork
              source={source.imgRectangle1}
              width={18}
              height={7.333}
              style={{ position: 'absolute', right: 29 * scale, top: 19.333 }}
            />
            <Artwork
              source={source.imgWifi}
              width={15.272}
              height={10.966}
              style={{ position: 'absolute', right: 54.03 * scale, top: 17.333 }}
            />
            <Artwork
              source={source.imgMobileSignal}
              width={17}
              height={10.666}
              style={{ position: 'absolute', right: 74.33 * scale, top: 17.667 }}
            />
          </View>
        ) : null}
        <View
          style={{
            paddingHorizontal: 24,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            hitSlop={10}
            onPress={() => (router.canGoBack() ? router.back() : router.replace(backTo))}
            style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}
          >
            <Artwork source={backSource} width={backSize.width} height={backSize.height} />
          </Pressable>
          <CollectionText
            accessibilityRole="header"
            size={18}
            weight="bold"
            color={titleColor}
            lineHeight={22}
            style={{ flex: 1 }}
          >
            {title}
          </CollectionText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cá nhân"
            onPress={() => router.push('/profile')}
          >
            <Artwork source={source.imgNhDiDin} width={32} />
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: 24, paddingTop: 18, paddingBottom: 24, gap: 20 }}>
          {children}
        </View>
        <View style={{ flex: 1 }} />
        <View style={{ paddingTop: 12, gap: 12 }}>
          <View style={{ paddingHorizontal: 24, gap: 10 }}>{footer}</View>
          {bottom ?? (
            <View
              style={{
                height: Platform.OS === 'web' ? 28 : Math.max(insets.bottom, 12),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {Platform.OS === 'web' ? (
                <View
                  style={{
                    height: 4,
                    width: 141,
                    backgroundColor: homeBarColor,
                    borderRadius: 4,
                  }}
                />
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
export function CollectionAction({
  title,
  onPress,
  disabled = false,
  label,
  shadow = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  label?: string;
  shadow?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        height: 50,
        borderRadius: 18,
        backgroundColor: collectionColors.brand,
        opacity: disabled ? 0.5 : 1,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: shadow ? '0px 5px 2px rgba(89,183,96,0.25)' : undefined,
      }}
    >
      <CollectionText
        size={15}
        weight="semibold"
        color="#FFFFFF"
        lineHeight={21.4286}
        style={{
          maxWidth: '90%',
          textAlign: 'center',
          transform: [{ translateX: 2.26 }, { translateY: -1.4286 }],
        }}
      >
        {title}
      </CollectionText>
    </Pressable>
  );
}

export function CollectionSheet({
  title,
  onClose,
  children,
}: PropsWithChildren<{ title: string; onClose: () => void }>) {
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đóng bảng tùy chọn"
          onPress={onClose}
          style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(22,69,97,.24)' }}
        />
        <View
          style={{
            width: '100%',
            maxWidth: 428,
            maxHeight: '85%',
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 24,
            gap: 16,
          }}
        >
          <CollectionText accessibilityRole="header" size={22} weight="bold" lineHeight={28}>
            {title}
          </CollectionText>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16 }}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
