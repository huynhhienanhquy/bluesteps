import { useState, type PropsWithChildren, type ComponentProps } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
  type TextInputProps,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../providers';
import { Artwork, StatusSpace } from '../../design-system/DesignScreen';
import { Label } from '../../design-system/ui';
import { registerAssets } from '../../design-system/app-assets';
import { safeAuthReturn } from '../../services/auth-return';

export function AccountPage({
  children,
  stage,
  backSource = registerAssets.imgIconBack,
}: { stage: string; backSource?: ComponentProps<typeof Artwork>['source'] } & PropsWithChildren) {
  const { colors } = useApp();
  const { returnTo: requestedReturn, email } = useLocalSearchParams<{
    returnTo?: string;
    email?: string;
  }>();
  const returnTo = safeAuthReturn(requestedReturn);
  const { height } = useWindowDimensions();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          minHeight: Platform.OS === 'web' ? 926 : height,
          paddingBottom: 16,
        }}
      >
        <StatusSpace />
        <View
          style={{
            height: 48,
            marginTop: 12,
            marginHorizontal: 24,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace({ pathname: '/login', params: { email, returnTo } })
            }
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Artwork source={backSource} width={24} />
          </Pressable>
          <Label
            size={12}
            weight="semibold"
            color={colors.muted}
            style={{ lineHeight: 17, textAlign: 'right', flex: 1 }}
          >
            {stage}
          </Label>
        </View>
        {children}
        <View style={{ flexGrow: 1, minHeight: 32 }} />
        {Platform.OS === 'web' ? (
          <View
            pointerEvents="none"
            style={{
              width: 128,
              height: 5,
              borderRadius: 3,
              backgroundColor: colors.text,
              alignSelf: 'center',
            }}
          />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
export function AccountField({
  label,
  error,
  toggle,
  toggleLabel,
  toggleSource = registerAssets.imgIconEye,
  ...props
}: TextInputProps & {
  label: string;
  error?: string;
  toggle?: () => void;
  toggleLabel?: string;
  toggleSource?: ComponentProps<typeof Artwork>['source'];
}) {
  const { colors } = useApp();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Label size={13} weight="semibold" style={{ lineHeight: 20 }}>
        {label}
      </Label>
      <View
        style={{
          minHeight: 56,
          borderRadius: 16,
          borderWidth: focused ? 1.5 : 1,
          borderColor: error ? colors.danger : focused ? colors.brand : colors.border,
          backgroundColor: colors.surface,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TextInput
          {...props}
          accessibilityLabel={props.accessibilityLabel ?? label}
          aria-invalid={!!error}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          placeholderTextColor={colors.muted}
          style={[
            {
              flex: 1,
              minWidth: 0,
              height: 54,
              paddingHorizontal: 16,
              fontFamily: 'Montserrat_400Regular',
              fontSize: 14,
              lineHeight: 22,
              color: colors.text,
              ...(Platform.OS === 'web' ? { outlineWidth: 0 } : {}),
            },
            props.style,
          ]}
        />
        {toggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={toggleLabel ?? 'Hiện hoặc ẩn mật khẩu'}
            onPress={toggle}
            style={{ width: 52, minHeight: 54, alignItems: 'center', justifyContent: 'center' }}
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
}
