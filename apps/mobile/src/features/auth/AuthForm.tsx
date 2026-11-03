import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../providers';
import { ApiError, errorMessage } from '../../services/api';
import { Label, Notice } from '../../design-system/ui';
import { Artwork, DesignLink, StatusSpace } from '../../design-system/DesignScreen';
import { loginAssets, registerAssets } from '../../design-system/app-assets';
import { safeAuthReturn } from '../../services/auth-return';

const loginSchema = z.object({
  email: z.string().trim().max(254, 'Email tối đa 254 ký tự.').pipe(z.email('Nhập email hợp lệ.')),
  password: z.string().min(1, 'Nhập mật khẩu.'),
});
const registerSchema = loginSchema.extend({
  password: z
    .string()
    .min(8, 'Mật khẩu cần ít nhất 8 ký tự.')
    .max(128, 'Mật khẩu tối đa 128 ký tự.'),
  name: z
    .string()
    .trim()
    .min(2, 'Nhập họ tên ít nhất 2 ký tự.')
    .max(100, 'Họ tên tối đa 100 ký tự.'),
  consent: z.boolean().refine((value) => value, 'Cần đồng ý điều khoản để tiếp tục.'),
});
type AuthFields = z.infer<typeof registerSchema>;

export function AuthScreen({ mode = 'login' }: { mode?: 'login' | 'register' }) {
  const {
    email,
    authNotice,
    returnTo: requestedReturn,
  } = useLocalSearchParams<{ email?: string; authNotice?: string; returnTo?: string }>();
  const returnTo = safeAuthReturn(requestedReturn);
  const { colors, api, login } = useApp();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const register = mode === 'register';
  const assets = register ? registerAssets : loginAssets;
  const [visible, setVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [focused, setFocused] = useState('');
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [requestingVerification, setRequestingVerification] = useState(false);
  const sending = useRef(false);
  const active = useRef(true);
  useFocusEffect(
    useCallback(() => {
      active.current = true;
      return () => {
        active.current = false;
      };
    }, []),
  );
  const {
    control,
    getValues,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthFields>({
    resolver: zodResolver(
      register
        ? registerSchema
        : registerSchema.extend({
            password: loginSchema.shape.password,
            name: z.string(),
            consent: z.boolean(),
          }),
    ),
    defaultValues: { email: email ?? '', password: '', name: '', consent: false },
  });
  useEffect(() => {
    if (email !== undefined) setValue('email', email);
  }, [email, setValue]);
  const field = (name: 'name' | 'email' | 'password', label: string, placeholder: string) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <View style={{ gap: 8 }}>
          <Label size={13} weight="semibold" style={{ lineHeight: 20 }}>
            {label}
          </Label>
          <View
            style={{
              height: 56,
              borderWidth: 1,
              borderRadius: 16,
              backgroundColor: colors.surface,
              borderColor: errors[name]
                ? colors.danger
                : focused === name
                  ? colors.brand
                  : colors.border,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <TextInput
              ref={field.ref}
              accessibilityLabel={label}
              aria-invalid={!!errors[name]}
              value={field.value}
              onChangeText={field.onChange}
              editable={!pending}
              maxLength={name === 'name' ? 100 : name === 'email' ? 254 : 128}
              onFocus={() => setFocused(name)}
              onBlur={() => {
                field.onBlur();
                setFocused('');
              }}
              placeholder={placeholder}
              placeholderTextColor={colors.text}
              secureTextEntry={name === 'password' && !visible}
              autoCapitalize={name === 'email' ? 'none' : name === 'name' ? 'words' : 'none'}
              keyboardType={name === 'email' ? 'email-address' : 'default'}
              autoComplete={
                name === 'name'
                  ? 'name'
                  : name === 'email'
                    ? 'email'
                    : register
                      ? 'new-password'
                      : 'current-password'
              }
              style={{
                flex: 1,
                height: 54,
                paddingHorizontal: 16,
                color: colors.text,
                fontFamily: 'Montserrat_400Regular',
                fontSize: 14,
                lineHeight: 22,
                outlineWidth: 0,
              }}
            />
            {name === 'password' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                onPress={() => setVisible(!visible)}
                style={{ width: 52, height: 54, alignItems: 'center', justifyContent: 'center' }}
              >
                <Artwork source={assets.imgIconEye} width={24} />
              </Pressable>
            ) : null}
          </View>
          {errors[name] ? (
            <Label size={12} color={colors.danger}>
              {errors[name]?.message}
            </Label>
          ) : null}
        </View>
      )}
    />
  );
  const checkbox = (checked: boolean, label: string, onPress: () => void) => (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      aria-checked={checked}
      onPress={onPress}
      style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 }}
    >
      <View style={{ width: 28, height: 44, justifyContent: 'center', paddingLeft: 3 }}>
        <View
          style={{
            width: 22,
            height: 22,
            borderWidth: 1,
            borderRadius: 7,
            borderColor: checked ? colors.brand : colors.border,
            backgroundColor: checked ? colors.brand : colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {checked ? <Artwork source={assets.imgIconCheck} width={18} /> : null}
        </View>
      </View>
      <Label
        size={12}
        weight="medium"
        color={colors.muted}
        style={{ lineHeight: 18, flexShrink: 1 }}
      >
        {label}
      </Label>
    </Pressable>
  );
  const submit = (
    <Pressable
      accessibilityRole="button"
      disabled={pending}
      accessibilityState={{ busy: pending, disabled: pending }}
      onPress={() => {
        void handleSubmit(async (fields) => {
          if (sending.current) return;
          sending.current = true;
          setPending(true);
          setSubmitError('');
          setVerificationEmail('');
          try {
            if (register) {
              const config = await api.request<{ termsVersion: string }>(
                '/v1/bootstrap',
                {},
                false,
              );
              if (!active.current) return;
              const result = await api.request<{ challengeId: string }>(
                '/v1/auth/register',
                {
                  method: 'POST',
                  body: JSON.stringify({
                    name: fields.name,
                    email: fields.email,
                    password: fields.password,
                    consentVersion: config.termsVersion,
                  }),
                },
                false,
              );
              if (!active.current) return;
              router.replace({
                pathname: '/verify-email',
                params: {
                  challengeId: result.challengeId,
                  purpose: 'verify_email',
                  email: fields.email,
                  returnTo,
                },
              });
            } else {
              await login(fields.email, fields.password);
              if (active.current) router.dismissTo((returnTo ?? '/') as Href);
            }
          } catch (error) {
            if (active.current) {
              setSubmitError(errorMessage(error));
              setSubmitted(true);
              if (!register && error instanceof ApiError && error.code === 'INVALID_CREDENTIALS') {
                setVerificationEmail(fields.email);
              }
            }
          } finally {
            sending.current = false;
            setPending(false);
          }
        })();
      }}
      style={{
        height: 56,
        borderRadius: 18,
        backgroundColor: colors.brand,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Label size={15} weight="semibold" color={colors.heroText} style={{ lineHeight: 22 }}>
        {pending ? 'Đang xử lý…' : register ? 'Tạo tài khoản' : 'Đăng nhập'}
      </Label>
    </Pressable>
  );
  const result = (
    <>
      {!register && !submitted && (authNotice === 'verified' || authNotice === 'password_reset') ? (
        <Notice tone="success">
          {authNotice === 'verified'
            ? 'Email đã được xác minh. Đăng nhập để tiếp tục.'
            : 'Mật khẩu đã được cập nhật. Đăng nhập bằng mật khẩu mới.'}
        </Notice>
      ) : null}
      {submitted && submitError ? <Notice tone="error">{submitError}</Notice> : null}
      {!register && verificationEmail ? (
        <View style={{ gap: 4 }}>
          <Label size={12} color={colors.muted}>
            Nếu chưa xác minh {verificationEmail}, bạn có thể nhận lại mã để hoàn tất đăng ký.
          </Label>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Nhận lại mã xác minh email"
            accessibilityState={{ disabled: pending, busy: requestingVerification }}
            disabled={pending}
            style={{ minHeight: 44, justifyContent: 'center' }}
            onPress={() => {
              if (sending.current) return;
              sending.current = true;
              setPending(true);
              setRequestingVerification(true);
              setSubmitError('');
              const recipient = verificationEmail;
              void api
                .request<{ challengeId: string }>(
                  '/v1/auth/email-verification/request',
                  { method: 'POST', body: JSON.stringify({ email: recipient }) },
                  false,
                )
                .then((response) => {
                  if (!active.current) return;
                  router.push({
                    pathname: '/verify-email',
                    params: {
                      challengeId: response.challengeId,
                      purpose: 'verify_email',
                      email: recipient,
                      returnTo,
                    },
                  });
                })
                .catch((error) => {
                  if (active.current) setSubmitError(errorMessage(error));
                })
                .finally(() => {
                  sending.current = false;
                  setPending(false);
                  setRequestingVerification(false);
                });
            }}
          >
            <Label size={13} weight="semibold" color={colors.brand}>
              {requestingVerification ? 'Đang gửi mã…' : 'Nhận lại mã xác minh email'}
            </Label>
          </Pressable>
        </View>
      ) : null}
    </>
  );
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: register ? colors.background : colors.surface }}
    >
      <StatusBar style={register ? 'dark' : 'light'} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ minHeight: Math.max(height, 926), paddingBottom: insets.bottom }}
      >
        {register ? (
          <>
            <StatusSpace />
            <View
              style={{
                marginTop: 12,
                marginHorizontal: 24,
                height: 48,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Quay lại"
                onPress={() =>
                  router.canGoBack()
                    ? router.back()
                    : router.replace({ pathname: '/login', params: { returnTo } })
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
                <Artwork source={registerAssets.imgIconBack} width={24} />
              </Pressable>
              <Label size={12} weight="semibold" color={colors.muted} style={{ lineHeight: 17 }}>
                TẠO TÀI KHOẢN
              </Label>
            </View>
            <View style={{ marginTop: 37, marginHorizontal: 24, gap: 12 }}>
              <Label size={32} bold heading style={{ lineHeight: 42 }}>
                Bắt đầu cùng{'\n'}BlueSteps.
              </Label>
              <Artwork
                source={registerAssets.imgIconLeaf}
                width={54}
                style={{ position: 'absolute', right: 14, top: 1 }}
              />
              <Label size={15} color={colors.muted} style={{ lineHeight: 24 }}>
                Lưu hành trình sống xanh và nhận những gợi ý dành riêng cho bạn.
              </Label>
            </View>
            <View style={{ marginTop: 27, marginHorizontal: 24, gap: 16 }}>
              {field('name', 'Họ và tên', 'Nhập họ và tên')}
              {field('email', 'Email', 'Email của bạn')}
              {field('password', 'Mật khẩu', '••••••••••••')}
            </View>
            <View style={{ marginTop: 19, marginHorizontal: 24 }}>
              <Controller
                control={control}
                name="consent"
                render={({ field }) =>
                  checkbox(field.value, 'Tôi đồng ý với Điều khoản và Chính sách bảo mật.', () =>
                    field.onChange(!field.value),
                  )
                }
              />
              {errors.consent ? (
                <Label size={12} color={colors.danger}>
                  {errors.consent.message}
                </Label>
              ) : null}
            </View>
            <View style={{ marginTop: 38, marginHorizontal: 24 }}>{submit}</View>
            <DesignLink
              onPress={() =>
                router.replace({
                  pathname: '/login',
                  params: { email: getValues('email').trim(), returnTo },
                })
              }
              style={{ marginTop: 21, alignItems: 'center' }}
            >
              Đã có tài khoản? Đăng nhập
            </DesignLink>
            <Label
              size={11}
              weight="medium"
              color={colors.muted}
              style={{ textAlign: 'center', lineHeight: 15, marginTop: 23 }}
            >
              Một tài khoản. Nhiều hành động có ý nghĩa.
            </Label>
            {submitted ? (
              <View style={{ marginHorizontal: 24, marginTop: 20, gap: 12 }}>{result}</View>
            ) : null}
          </>
        ) : (
          <>
            <View
              style={{
                height: 314 + (Platform.OS === 'web' ? 0 : insets.top - 54),
                backgroundColor: colors.brand,
              }}
            >
              <StatusSpace />
              <View
                style={{
                  marginTop: 23,
                  marginLeft: 24,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Artwork source={loginAssets.imgIconLeaf} width={28} />
                <Label size={20} bold color={colors.heroText} style={{ lineHeight: 28 }}>
                  BlueSteps
                </Label>
              </View>
              <View style={{ marginTop: 32, marginLeft: 24, gap: 10 }}>
                <Label size={29} bold color={colors.heroText} heading style={{ lineHeight: 41 }}>
                  Chào bạn,{'\n'}mừng trở lại!
                </Label>
                <Label size={13} color={colors.heroText} style={{ lineHeight: 18 }}>
                  Tiếp tục những bước nhỏ{'\n'}vì một hành tinh xanh.
                </Label>
              </View>
              <Artwork
                source={loginAssets.imgMmCayChaoMng}
                width={150}
                style={{ position: 'absolute', right: 10, bottom: 42 }}
              />
            </View>
            <View
              style={{
                marginTop: -38,
                minHeight: 650,
                paddingTop: 32,
                paddingHorizontal: 24,
                backgroundColor: colors.surface,
                borderTopLeftRadius: 36,
                borderTopRightRadius: 36,
              }}
            >
              <View style={{ gap: 16 }}>
                {field('email', 'Email', 'Email của bạn')}
                {field('password', 'Mật khẩu', '••••••••••••')}
              </View>
              <View
                style={{
                  marginTop: 14,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Label size={12} color={colors.muted}>
                  Phiên được lưu an toàn
                </Label>
                <DesignLink
                  onPress={() =>
                    router.push({
                      pathname: '/forgot-password',
                      params: { email: getValues('email').trim(), returnTo },
                    })
                  }
                >
                  Quên mật khẩu?
                </DesignLink>
              </View>
              <View style={{ marginTop: 12 }}>{submit}</View>
              <DesignLink
                onPress={() =>
                  router.replace({
                    pathname: '/register',
                    params: { email: getValues('email').trim(), returnTo },
                  })
                }
                style={{ marginTop: 18, alignItems: 'center' }}
              >
                Chưa có tài khoản? Đăng ký ngay
              </DesignLink>
              <View
                style={{
                  marginTop: 38,
                  flexDirection: 'row',
                  gap: 8,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Artwork source={loginAssets.imgIconShield} width={18} />
                <Label
                  size={11}
                  weight="medium"
                  color={colors.muted}
                  style={{ lineHeight: 15, width: 263 }}
                >
                  Thông tin của bạn được bảo vệ
                </Label>
              </View>
              {submitted ? <View style={{ marginTop: 20, gap: 12 }}>{result}</View> : null}
            </View>
          </>
        )}
      </ScrollView>
      {Platform.OS === 'web' ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: 16,
            height: 5,
            width: 128,
            borderRadius: 3,
            backgroundColor: colors.text,
            alignSelf: 'center',
          }}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}
