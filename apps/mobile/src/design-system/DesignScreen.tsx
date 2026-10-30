import type { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useApp } from '../providers';
import { Label } from './ui';
import { homeAssets } from './figma-assets';
import { assets386_7420 } from './screen-assets';

export function Artwork({
  source,
  width,
  height = width,
  style,
  fit = 'contain',
}: {
  source: ComponentProps<typeof Image>['source'];
  width: number;
  height?: number;
  style?: ComponentProps<typeof Image>['style'];
  fit?: 'cover' | 'contain' | 'fill';
}) {
  return (
    <Image
      source={source}
      style={[{ width, height }, style]}
      contentFit={fit}
      transition={0}
      accessible={false}
    />
  );
}

export function StatusSpace({
  inverse = false,
  source = homeAssets.imgSongWiFiPin,
  iconWidth = 76,
}: {
  inverse?: boolean;
  source?: ComponentProps<typeof Image>['source'];
  iconWidth?: number;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useApp();
  if (Platform.OS !== 'web') return <View style={{ height: insets.top }} />;
  return (
    <View
      style={{
        height: 54,
        paddingHorizontal: 24,
        paddingTop: 17,
        flexDirection: 'row',
        justifyContent: 'space-between',
      }}
    >
      <Label
        size={14}
        weight="semibold"
        color={inverse ? '#FFFFFF' : colors.text}
        style={{ lineHeight: 20 }}
      >
        9:41
      </Label>
      <Artwork source={source} width={iconWidth} height={20} />
    </View>
  );
}

export function DesignIconButton({
  source,
  label,
  onPress,
}: {
  source: ComponentProps<typeof Image>['source'];
  label: string;
  onPress: () => void;
}) {
  const { colors } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <Artwork source={source} width={24} />
    </Pressable>
  );
}

export function DesignScreen({
  children,
  title,
  header,
  action,
  back = true,
  contentStyle,
}: PropsWithChildren<{
  title?: string;
  header?: ReactNode;
  action?: ReactNode;
  back?: boolean;
  contentStyle?: ViewStyle;
}>) {
  const { colors } = useApp();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusSpace />
      <View style={{ height: 82, paddingTop: 8, paddingHorizontal: 24 }}>
        {header ?? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            {back ? (
              <DesignIconButton
                source={assets386_7420.imgIconBack}
                label="Quay lại"
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              />
            ) : (
              <View style={{ width: 48 }} />
            )}
            <Label size={19} bold heading style={{ flex: 1, textAlign: 'center', lineHeight: 27 }}>
              {title}
            </Label>
            {action ?? <View style={{ width: 48 }} />}
          </View>
        )}
      </View>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32, gap: 24 },
          contentStyle,
        ]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function DesignLink({
  children,
  onPress,
  style,
}: PropsWithChildren<{ onPress: () => void; style?: ViewStyle }>) {
  const { colors } = useApp();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[{ minHeight: 48, justifyContent: 'center' }, style]}
    >
      <Label size={13} weight="semibold" color={colors.brand} style={{ lineHeight: 18 }}>
        {children}
      </Label>
    </Pressable>
  );
}

export function DesignSection({
  title,
  action,
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
        minHeight: action ? 48 : 27,
      }}
    >
      <Label size={19} bold heading style={{ lineHeight: 27 }}>
        {title}
      </Label>
      {action && onPress ? <DesignLink onPress={onPress}>{action}</DesignLink> : null}
    </View>
  );
}

export const designStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  whiteButton: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D2E7F4',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
