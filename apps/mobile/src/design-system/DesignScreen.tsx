import type { ComponentProps, PropsWithChildren, ReactNode, Ref } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Label, Typography, type FontFamily } from './ui';
import { router } from 'expo-router';
import { useApp } from '../providers';
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
  fit?: 'contain' | 'cover' | 'fill';
}) {
  return (
    <Image source={source} style={[{ width, height }, style]} contentFit={fit} accessible={false} />
  );
}
export function StatusSpace() {
  const insets = useSafeAreaInsets();
  return <View style={{ height: Platform.OS === 'web' ? 54 : insets.top }} />;
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

/** Figma's 54 px system inset + 82 px header; native uses the real system inset. */
export function DesignScreen({
  children,
  title,
  header,
  action,
  back = true,
  contentStyle,
  family = 'montserrat',
  background,
  footer,
  headerStyle,
  scrollRef,
}: PropsWithChildren<{
  title?: string;
  header?: ReactNode;
  action?: ReactNode;
  back?: boolean;
  contentStyle?: ViewStyle;
  family?: FontFamily;
  background?: string;
  footer?: ReactNode;
  headerStyle?: ViewStyle;
  scrollRef?: Ref<ScrollView>;
}>) {
  const { colors } = useApp();
  return (
    <Typography.Provider value={family}>
      <View style={{ flex: 1, backgroundColor: background ?? colors.background }}>
        <StatusSpace />
        <View
          style={[
            { minHeight: 82, paddingTop: 8, paddingBottom: 26, paddingHorizontal: 24 },
            headerStyle,
          ]}
        >
          {header ?? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {back ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Quay lại"
                  onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
                  style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Artwork
                    source={require('../../assets/icons/auth/login/icon-back.svg')}
                    width={24}
                  />
                </Pressable>
              ) : (
                <View style={{ width: 48 }} />
              )}
              <Label
                size={19}
                bold
                heading
                style={{ flex: 1, textAlign: 'center', lineHeight: 27 }}
              >
                {title}
              </Label>
              {action ?? <View style={{ width: 48 }} />}
            </View>
          )}
        </View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            ref={scrollRef}
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
        </KeyboardAvoidingView>
        {footer}
      </View>
    </Typography.Provider>
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
        gap: 8,
      }}
    >
      <Label size={19} bold heading style={{ lineHeight: 27, flexShrink: 1 }}>
        {title}
      </Label>
      {action && onPress ? <DesignLink onPress={onPress}>{action}</DesignLink> : null}
    </View>
  );
}

export const designStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  whiteButton: {
    minHeight: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D2E7F4',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
export function DesignLink({
  children,
  onPress,
  style,
}: PropsWithChildren<{ onPress: () => void; style?: ComponentProps<typeof View>['style'] }>) {
  const { colors } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[{ minHeight: 44, justifyContent: 'center' }, style]}
    >
      <Label size={13} weight="semibold" color={colors.brand}>
        {children}
      </Label>
    </Pressable>
  );
}
