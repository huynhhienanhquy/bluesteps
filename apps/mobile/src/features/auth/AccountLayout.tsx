import {
  forwardRef,
  useState,
  type ComponentProps,
  type ComponentRef,
  type PropsWithChildren,
} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { useApp } from '../../providers';
import { Artwork, StatusSpace } from '../../design-system/DesignScreen';
import { Label } from '../../design-system/ui';
import { assets386_7390 } from '../../design-system/screen-assets';

export function AccountPage({
  children,
  stage,
  statusSource,
  backSource = assets386_7390.imgIconBack,
  iconWidth = 76,
  fallback = '/login',
  bottomPadding = 56,
}: PropsWithChildren<{
  stage: string;
  statusSource?: ComponentProps<typeof Artwork>['source'];
  backSource?: ComponentProps<typeof Artwork>['source'];
  iconWidth?: number;
  fallback?: Href;
  bottomPadding?: number;
}>) {
  const { colors } = useApp();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ minHeight: 926, paddingBottom: bottomPadding }}
      >
        <StatusSpace source={statusSource} iconWidth={iconWidth} />
        <View
          style={{
            height: 48,
            marginTop: 12,
            marginHorizontal: 24,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
            style={{
              width: 48,
              height: 48,
              backgroundColor: colors.surface,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Artwork source={backSource} width={24} />
          </Pressable>
          <Label size={12} weight="semibold" color={colors.muted} style={{ lineHeight: 17 }}>
            {stage}
          </Label>
        </View>
        {children}
      </ScrollView>
      {Platform.OS === 'web' ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: 16,
            width: 128,
            height: 5,
            borderRadius: 3,
            backgroundColor: colors.text,
            alignSelf: 'center',
          }}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

export const AccountField = forwardRef<
  ComponentRef<typeof TextInput>,
  TextInputProps & {
    label: string;
    error?: string;
    focusedStyle?: boolean;
    toggle?: () => void;
    toggleLabel?: string;
    toggleSource?: ComponentProps<typeof Artwork>['source'];
  }
>(function AccountField(
  {
    label,
    error,
    focusedStyle,
    toggle,
    toggleLabel,
    toggleSource = assets386_7390.imgIconEye,
    ...props
  },
  ref,
) {
  const { colors } = useApp();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Label size={13} weight="semibold" style={{ lineHeight: 20 }}>
        {label}
      </Label>
      <View
        style={{
          height: 56,
          borderWidth: focused || focusedStyle ? 1.5 : 1,
          borderColor: error
            ? colors.danger
            : focused || focusedStyle
              ? colors.brand
              : colors.border,
          borderRadius: 16,
          backgroundColor: focusedStyle ? colors.background : colors.surface,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          aria-invalid={!!error}
          {...props}
          placeholderTextColor={colors.text}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          style={{
            flex: 1,
            height: 54,
            paddingHorizontal: 16,
            fontSize: 14,
            lineHeight: 22,
            color: colors.text,
            fontFamily: 'Montserrat_400Regular',
            outlineWidth: 0,
          }}
        />
        {toggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={toggleLabel}
            onPress={toggle}
            style={{ width: 52, height: 54, alignItems: 'center', justifyContent: 'center' }}
          >
            <Artwork source={toggleSource} width={24} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Label size={12} color={colors.danger}>
          {error}
        </Label>
      ) : null}
    </View>
  );
});

export function AccountButton({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={{
        height: 56,
        borderRadius: 18,
        backgroundColor: colors.brand,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Label size={15} weight="semibold" color={colors.heroText} style={{ lineHeight: 22 }}>
        {title}
      </Label>
    </Pressable>
  );
}
