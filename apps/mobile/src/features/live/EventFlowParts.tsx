import type { ComponentProps, PropsWithChildren, ReactNode, Ref } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Artwork } from '../../design-system/DesignScreen';
import { calendarArtwork as a } from '../../design-system/event-flow-artwork';
import { Label, Typography } from '../../design-system/ui';
import { useApp } from '../../providers';
import { CatalogHeader } from './DesignParts';

export function EventFlowPage({
  title,
  children,
  footer,
  navigation,
  brandHeader = false,
  scrollRef,
  onBodyLayout,
}: PropsWithChildren<{
  title: string;
  footer?: ReactNode;
  navigation?: ReactNode;
  brandHeader?: boolean;
  scrollRef?: Ref<ScrollView>;
  onBodyLayout?: (y: number) => void;
}>) {
  const { colors } = useApp();
  const insets = useSafeAreaInsets();
  return (
    <Typography.Provider value="inter">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: colors.surface }}
      >
        {Platform.OS !== 'web' ? <View style={{ height: insets.top }} /> : null}
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {Platform.OS === 'web' ? <View style={{ height: 49 }} /> : null}
          <View style={{ paddingHorizontal: 24, paddingVertical: 10 }}>
            <CatalogHeader
              title={title}
              titleColor={brandHeader ? '#147CC1' : undefined}
              action={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cá nhân"
                  onPress={() => router.push('/profile')}
                >
                  <Artwork source={a.brand} width={32} />
                </Pressable>
              }
            />
          </View>
          <View
            onLayout={
              onBodyLayout ? (event) => onBodyLayout(event.nativeEvent.layout.y) : undefined
            }
            style={{
              flexGrow: 1,
              paddingHorizontal: 24,
              paddingTop: 18,
              paddingBottom: 24,
              gap: 20,
            }}
          >
            {children}
          </View>
          {footer ? (
            <View
              style={{
                paddingHorizontal: 24,
                paddingTop: 18,
                paddingBottom: navigation ? 24 : Math.max(24, insets.bottom),
                gap: 8,
              }}
            >
              {footer}
            </View>
          ) : (
            <View style={{ height: navigation ? 0 : insets.bottom }} />
          )}
          {navigation}
          {Platform.OS === 'web' && !navigation ? (
            <View
              pointerEvents="none"
              style={{
                height: 4,
                width: 128,
                borderRadius: 3,
                backgroundColor: brandHeader ? '#147CC1' : '#172B3D',
                alignSelf: 'center',
                marginBottom: 12,
              }}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Typography.Provider>
  );
}

export function EventFlowHeading({ children }: PropsWithChildren) {
  return (
    <EventFlowText size={16} weight="semibold" heading style={{ lineHeight: 22 }}>
      {children}
    </EventFlowText>
  );
}

export function EventFlowText({ size = 14, color, style, ...props }: ComponentProps<typeof Label>) {
  const { dark, colors } = useApp();
  return (
    <Label
      {...props}
      family="inter"
      size={size}
      color={color ?? (dark ? colors.text : '#172B3D')}
      style={[{ lineHeight: size === 12 ? 16 : 20 }, style]}
    />
  );
}

export function EventFlowButton({
  title,
  onPress,
  disabled,
  pending,
  tone = 'primary',
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  pending?: boolean;
  tone?: 'primary' | 'outline' | 'quiet';
  accessibilityLabel?: string;
}) {
  const { colors } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: disabled || pending, busy: pending }}
      disabled={disabled || pending}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: tone === 'quiet' ? 40 : 50,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 18,
        borderWidth: tone === 'outline' ? 1 : 0,
        borderColor: '#147CC1',
        backgroundColor:
          tone === 'primary' ? '#147CC1' : tone === 'outline' ? colors.surface : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
      })}
    >
      {pending ? (
        <ActivityIndicator color={tone === 'primary' ? '#FFFFFF' : '#147CC1'} />
      ) : (
        <EventFlowText
          size={15}
          weight="semibold"
          color={tone === 'primary' ? '#FFFFFF' : '#147CC1'}
          style={{ textAlign: 'center', lineHeight: 22 }}
        >
          {title}
        </EventFlowText>
      )}
    </Pressable>
  );
}

export const eventFlowStyles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: '#DEEBF3', borderRadius: 20, padding: 16, gap: 10 },
  section: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
