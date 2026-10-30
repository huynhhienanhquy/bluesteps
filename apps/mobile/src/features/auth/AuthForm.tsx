import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { router } from 'expo-router';
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
import { Label, Notice } from '../../design-system/ui';
import { Artwork, DesignLink, StatusSpace } from '../../design-system/DesignScreen';
import {
  assets386_7184 as loginAssets,
  assets386_7390 as registerAssets,
} from '../../design-system/screen-assets';

const loginSchema = z.object({
  email: z.email('Nhập email hợp lệ.'),
  password: z.string().min(1, 'Nhập mật khẩu.'),
});
const registerSchema = loginSchema.extend({
  password: z
    .string()
    .min(8, 'Mật khẩu cần ít nhất 8 ký tự.')
    .max(128, 'Mật khẩu tối đa 128 ký tự.'),
  name: z.string().trim().min(2, 'Nhập họ tên ít nhất 2 ký tự.'),
  consent: z.boolean().refine((value) => value, 'Cần đồng ý điều khoản để tiếp tục.'),
});
type AuthFields = z.infer<typeof registerSchema>;

export function AuthScreen({ mode = 'login' }: { mode?: 'login' | 'register' }) {
  const { colors } = useApp();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const register = mode === 'register';
  const assets = register ? registerAssets : loginAssets;
  const [visible, setVisible] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [provider, setProvider] = useState('');
  const [focused, setFocused] = useState('');
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthFields>({
    resolver: zodResolver(
      register ? registerSchema : registerSchema.extend({ password: loginSchema.shape.password }),
    ),
    defaultValues: { email: '', password: '', name: register ? '' : 'Demo', consent: true },
  });
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
      onPress={() => {
        void handleSubmit(() => setSubmitted(true))();
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
        {register ? 'Tạo tài khoản' : 'Đăng nhập'}
      </Label>
    </Pressable>
  );
  const result = (
    <>
      {submitted ? (
        <Notice>
          Đây là bản xem trước. Chưa có tài khoản hoặc phiên đăng nhập được tạo. Mật khẩu không được
          lưu hay gửi đi.
        </Notice>
      ) : null}
      {provider ? (
        <>
          <Notice>Đăng nhập với {provider} chưa được kết nối trong bản xem trước.</Notice>
          <DesignLink
            onPress={() => router.push({ pathname: '/connected-account', params: { provider } })}
          >
            Xem màn hoàn tất mẫu
          </DesignLink>
        </>
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
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
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
              {field('name', 'Họ và tên', 'Linh Chi')}
              {field('email', 'Email', 'linhchi@example.com')}
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
              onPress={() => router.replace('/login')}
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
            {submitted || provider ? (
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
              <StatusSpace inverse source={loginAssets.imgSongWiFiPin} />
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
                  GreenSteps
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
                {field('email', 'Email', 'linhchi@example.com')}
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
                {checkbox(remember, 'Ghi nhớ tôi', () => setRemember(!remember))}
                <DesignLink onPress={() => router.push('/forgot-password')}>
                  Quên mật khẩu?
                </DesignLink>
              </View>
              <View style={{ marginTop: 12 }}>{submit}</View>
              <View
                style={{
                  marginTop: 26,
                  height: 18,
                  flexDirection: 'row',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <View style={{ height: 1, flex: 1, backgroundColor: colors.border }} />
                <Label
                  size={12}
                  weight="medium"
                  color={colors.muted}
                  style={{ width: 206, textAlign: 'center', lineHeight: 18 }}
                >
                  hoặc tiếp tục với
                </Label>
                <View style={{ height: 1, flex: 1, backgroundColor: colors.border }} />
              </View>
              <View style={{ marginTop: 24, flexDirection: 'row', gap: 14 }}>
                {[
                  { name: 'Google', source: loginAssets.imgIcon, textWidth: 68 },
                  { name: 'Facebook', source: loginAssets.imgIcon1, textWidth: 88 },
                ].map((item) => (
                  <Pressable
                    key={item.name}
                    accessibilityRole="button"
                    accessibilityLabel={`Tiếp tục với ${item.name}`}
                    onPress={() => setProvider(item.name)}
                    style={{
                      flex: 1,
                      height: 54,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 9,
                    }}
                  >
                    <Artwork source={item.source} width={22} />
                    <Label
                      size={13}
                      weight="semibold"
                      style={{ lineHeight: 18, width: item.textWidth }}
                    >
                      {item.name}
                    </Label>
                  </Pressable>
                ))}
              </View>
              <DesignLink
                onPress={() => router.replace('/register')}
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
              {submitted || provider ? (
                <View style={{ marginTop: 20, gap: 12 }}>{result}</View>
              ) : null}
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
