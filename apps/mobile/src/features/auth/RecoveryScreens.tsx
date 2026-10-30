import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { z } from 'zod';
import { useApp } from '../../providers';
import { Label, Notice } from '../../design-system/ui';
import { Artwork, DesignLink } from '../../design-system/DesignScreen';
import {
  assets386_7225 as forgot,
  assets386_7266 as otp,
  assets386_7307 as reset,
} from '../../design-system/recovery-assets';
import { AccountButton, AccountField, AccountPage } from './AccountLayout';

export function ForgotPasswordScreen() {
  const { colors } = useApp();
  const [email, setEmail] = useState('');
  const [checked, setChecked] = useState(false);
  return (
    <AccountPage stage="KHÔI PHỤC TÀI KHOẢN">
      <Artwork
        source={forgot.imgMinhHaBoMt}
        width={280}
        height={214}
        style={{ alignSelf: 'center', marginTop: 32 }}
      />
      <View style={{ marginTop: 32, marginHorizontal: 24, gap: 12 }}>
        <Label size={32} bold heading style={{ lineHeight: 42 }}>
          Quên mật khẩu?
        </Label>
        <Label size={15} color={colors.muted} style={{ lineHeight: 24 }}>
          Đừng lo, chúng tôi sẽ gửi mã xác thực để giúp bạn lấy lại quyền truy cập.
        </Label>
      </View>
      <View style={{ marginTop: 40, marginHorizontal: 24 }}>
        <AccountField
          label="Email đã đăng ký"
          value={email}
          onChangeText={setEmail}
          placeholder="linhchi@example.com"
          autoComplete="email"
          keyboardType="email-address"
          autoCapitalize="none"
          focusedStyle
          error={checked && !z.email().safeParse(email).success ? 'Nhập email hợp lệ.' : undefined}
        />
      </View>
      <View
        style={{
          marginTop: 26,
          marginHorizontal: 24,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Artwork source={forgot.imgIconShield} width={28} />
        <Label size={13} color={colors.muted} style={{ lineHeight: 18, flex: 1 }}>
          Chúng tôi chỉ gửi mã đến email{'\n'}được liên kết với tài khoản của bạn.
        </Label>
      </View>
      <View style={{ marginTop: 54, marginHorizontal: 24 }}>
        <AccountButton
          title="Gửi mã xác thực"
          onPress={() => {
            setChecked(true);
            if (z.email().safeParse(email).success)
              router.push({ pathname: '/verify-email', params: { email } });
          }}
        />
      </View>
      <DesignLink
        onPress={() => router.replace('/login')}
        style={{ marginTop: 17, alignItems: 'center' }}
      >
        Quay lại đăng nhập
      </DesignLink>
    </AccountPage>
  );
}

export function VerifyEmailScreen() {
  const { colors } = useApp();
  const { email = 'linhchi@example.com' } = useLocalSearchParams<{ email?: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const update = (value: string) => {
    setCode(value.replace(/\D/g, '').slice(0, 6));
    setError('');
  };
  return (
    <AccountPage stage="XÁC THỰC EMAIL">
      <Artwork
        source={otp.imgMinhHaBoMt}
        width={280}
        height={164}
        style={{ alignSelf: 'center', marginTop: 26 }}
      />
      <View style={{ marginTop: 22, marginHorizontal: 24, gap: 12 }}>
        <Label size={32} bold heading style={{ lineHeight: 42, textAlign: 'center' }}>
          Kiểm tra email nhé!
        </Label>
        <Label size={15} color={colors.muted} style={{ lineHeight: 24, textAlign: 'center' }}>
          Nhập mã xác thực gồm 6 chữ số đã gửi đến
        </Label>
      </View>
      <Label
        size={14}
        weight="semibold"
        color={colors.brand}
        style={{ lineHeight: 20, textAlign: 'center', marginTop: 22, marginHorizontal: 24 }}
      >
        {email}
      </Label>
      <View style={{ marginTop: 36, marginHorizontal: 24 }}>
        <Pressable
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onPress={() => input.current?.focus()}
          style={{ flexDirection: 'row', gap: 10 }}
        >
          {Array.from({ length: 6 }, (_, index) => (
            <View
              key={index}
              style={{
                flex: 1,
                height: 66,
                borderWidth: index === Math.min(code.length, 5) ? 1.5 : 1,
                borderColor: error
                  ? colors.danger
                  : index === Math.min(code.length, 5)
                    ? colors.brand
                    : colors.border,
                borderRadius: 16,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Label size={25} weight="semibold" style={{ lineHeight: 35 }}>
                {code[index] ?? '—'}
              </Label>
            </View>
          ))}
        </Pressable>
        <TextInput
          ref={input}
          accessibilityLabel="Mã xác thực gồm 6 chữ số"
          value={code}
          onChangeText={update}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          style={{ position: 'absolute', width: '100%', height: 66, opacity: 0 }}
        />
        {error ? (
          <Label size={12} color={colors.danger}>
            {error}
          </Label>
        ) : null}
      </View>
      <DesignLink
        onPress={() => {
          void Clipboard.getStringAsync()
            .then((value) => {
              if (/^\d{6}$/.test(value.trim())) update(value.trim());
              else setError('Nội dung đã sao chép cần gồm 6 chữ số.');
            })
            .catch(() => setError('Không đọc được bộ nhớ tạm. Bạn có thể nhập mã trực tiếp.'));
        }}
        style={{ marginTop: 14, alignItems: 'center' }}
      >
        Dán mã từ email
      </DesignLink>
      <DesignLink
        onPress={() => setMessage('Bản xem trước chưa gửi email hoặc mã xác thực.')}
        style={{ marginTop: 55, alignItems: 'center' }}
      >
        Chưa nhận được mã? Gửi lại
      </DesignLink>
      <View style={{ marginTop: 33, marginHorizontal: 24 }}>
        <AccountButton
          title="Xác thực và tiếp tục"
          onPress={() => {
            if (code.length !== 6) setError('Nhập đủ 6 chữ số.');
            else router.push('/reset-password');
          }}
        />
      </View>
      <Label
        size={12}
        weight="medium"
        color={colors.muted}
        style={{ lineHeight: 18, textAlign: 'center', marginTop: 31, marginHorizontal: 24 }}
      >
        Đừng quên kiểm tra thư mục Spam / Thư rác.
      </Label>
      {message ? (
        <View style={{ margin: 24 }}>
          <Notice>{message}</Notice>
        </View>
      ) : null}
    </AccountPage>
  );
}

export function ResetPasswordScreen() {
  const { colors } = useApp();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [checked, setChecked] = useState(false);
  const [done, setDone] = useState(false);
  const valid = password.length >= 8 && password.length <= 128;
  const strength =
    Number(password.length >= 8) +
    Number(/[a-zA-Z]/.test(password)) +
    Number(/\d/.test(password) && /[^a-zA-Z\d]/.test(password)) +
    Number(password.length >= 16);
  return (
    <AccountPage stage="ĐẶT MẬT KHẨU MỚI">
      <Artwork
        source={reset.imgMinhHaBoMt}
        width={280}
        height={180}
        style={{ alignSelf: 'center', marginTop: 28 }}
      />
      <View style={{ marginTop: 21, marginHorizontal: 24, gap: 12 }}>
        <Label size={32} bold heading style={{ lineHeight: 42 }}>
          An toàn hơn.{'\n'}An tâm hơn.
        </Label>
        <Label size={15} color={colors.muted} style={{ lineHeight: 24 }}>
          Tạo mật khẩu mới để tiếp tục hành trình sống xanh của bạn.
        </Label>
      </View>
      <View style={{ marginTop: 33, marginHorizontal: 24 }}>
        <AccountField
          label="Mật khẩu mới"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••••••"
          secureTextEntry={!visible}
          autoComplete="new-password"
          toggle={() => setVisible(!visible)}
          toggleLabel={visible ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
          error={checked && !valid ? 'Mật khẩu cần từ 8 đến 128 ký tự.' : undefined}
        />
      </View>
      <View style={{ marginHorizontal: 24, marginTop: 12, flexDirection: 'row', gap: 6 }}>
        {Array.from({ length: 4 }, (_, index) => (
          <View
            key={index}
            style={{
              flex: 1,
              height: 5,
              borderRadius: 3,
              backgroundColor: index < strength ? colors.brand : colors.border,
            }}
          />
        ))}
      </View>
      <Label
        size={11}
        weight="medium"
        color={colors.brand}
        style={{ lineHeight: 15, marginHorizontal: 24, marginTop: 11 }}
      >
        {strength >= 3
          ? 'Mật khẩu mạnh · Có chữ, số và ký tự đặc biệt'
          : password
            ? 'Thêm độ dài, chữ, số và ký tự đặc biệt'
            : 'Dùng từ 8 đến 128 ký tự cho mật khẩu mới'}
      </Label>
      <View style={{ marginTop: 19, marginHorizontal: 24 }}>
        <AccountField
          label="Xác nhận mật khẩu mới"
          value={confirm}
          onChangeText={setConfirm}
          placeholder="••••••••••••"
          secureTextEntry={!confirmVisible}
          autoComplete="new-password"
          toggle={() => setConfirmVisible(!confirmVisible)}
          toggleLabel={confirmVisible ? 'Ẩn xác nhận mật khẩu' : 'Hiện xác nhận mật khẩu'}
          error={checked && password !== confirm ? 'Mật khẩu xác nhận chưa khớp.' : undefined}
        />
      </View>
      <View style={{ marginTop: 36, marginHorizontal: 24 }}>
        <AccountButton
          title="Lưu mật khẩu mới"
          onPress={() => {
            setChecked(true);
            setDone(valid && password === confirm);
          }}
        />
      </View>
      {done ? (
        <View style={{ margin: 24, gap: 12 }}>
          <Notice>Mật khẩu đã qua kiểm tra. Bản xem trước chưa cập nhật mật khẩu tài khoản.</Notice>
          <DesignLink onPress={() => router.replace('/login')}>Quay lại đăng nhập</DesignLink>
        </View>
      ) : null}
    </AccountPage>
  );
}
