import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { AppState, Pressable, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Artwork, DesignLink } from '../../design-system/DesignScreen';
import { AccountField, AccountPage } from './AuthParts';
import { AccountButton } from '../onboarding/OnboardingParts';
import {
  forgotArtwork as forgot,
  otpArtwork as otp,
  resetArtwork as reset,
} from '../../design-system/recovery-artwork';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Label, Notice } from '../../design-system/ui';
import { passwordArtwork } from '../../design-system/settings-artwork';
import { useApp } from '../../providers';
import { useCommand } from '../../services/queries';
import { CommandError, RequireAuth } from '../shared/common';
import { ApiError, errorMessage } from '../../services/api';
import { safeAuthReturn } from '../../services/auth-return';
import {
  clearResetCredential,
  getResetCredential,
  setResetCredential,
} from '../../services/recovery-state';

function useActiveScreen() {
  const active = useRef(true);
  useFocusEffect(
    useCallback(() => {
      active.current = true;
      return () => {
        active.current = false;
      };
    }, []),
  );
  return active;
}

export function ForgotPasswordScreen() {
  const { colors } = useApp();
  const params = useLocalSearchParams<{ email?: string; returnTo?: string }>();
  const returnTo = safeAuthReturn(params.returnTo);
  const [email, setEmail] = useState(params.email ?? '');
  const [emailTouched, setEmailTouched] = useState(false);
  const command = useCommand<{ challengeId: string }>({ authenticated: false });
  const active = useActiveScreen();
  const sending = useRef(false);
  const validEmail = email.trim().length <= 254 && /^\S+@\S+\.\S+$/.test(email.trim());
  return (
    <AccountPage stage="KHÔI PHỤC TÀI KHOẢN" backSource={forgot.back}>
      <Artwork
        source={forgot.hero}
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
          accessibilityLabel="Email"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            command.reset();
          }}
          onBlur={() => setEmailTouched(true)}
          error={emailTouched && !validEmail ? 'Nhập địa chỉ email đã đăng ký hợp lệ.' : undefined}
          placeholder="Email của bạn"
          autoComplete="email"
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!command.isPending}
          maxLength={254}
        />
      </View>
      <View
        style={{
          marginTop: 26,
          marginHorizontal: 24,
          flexDirection: 'row',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <Artwork source={forgot.shield} width={28} />
        <Label size={13} color={colors.muted} style={{ lineHeight: 18, flex: 1 }}>
          Chúng tôi chỉ gửi mã đến email{'\n'}được liên kết với tài khoản của bạn.
        </Label>
      </View>
      <View style={{ marginTop: 54, marginHorizontal: 24, gap: 12 }}>
        <CommandError error={command.error} />
        <AccountButton
          title="Gửi mã xác thực"
          accessibilityLabel="Gửi mã xác minh"
          pending={command.isPending}
          disabled={!validEmail}
          onPress={() => {
            if (sending.current || !validEmail) return;
            sending.current = true;
            const recipient = email.trim();
            clearResetCredential();
            void command
              .mutateAsync({
                path: '/v1/auth/password-reset/request',
                body: { email: recipient },
              })
              .then((result) => {
                if (!active.current) return;
                router.push({
                  pathname: '/verify-email',
                  params: {
                    challengeId: result.challengeId,
                    purpose: 'password_reset',
                    email: recipient,
                    returnTo,
                  },
                });
              })
              .catch(() => {})
              .finally(() => {
                sending.current = false;
              });
          }}
        />
      </View>
      <DesignLink
        onPress={() => {
          if (!sending.current)
            router.replace({ pathname: '/login', params: { email: email.trim(), returnTo } });
        }}
        style={{ marginTop: 17, alignItems: 'center' }}
      >
        Quay lại đăng nhập
      </DesignLink>
    </AccountPage>
  );
}
export function VerifyEmailScreen() {
  const params = useLocalSearchParams<{
    challengeId?: string;
    purpose?: string;
    email?: string;
    returnTo?: string;
  }>();
  return (
    <Verification key={`${params.purpose}:${params.challengeId}:${params.email}`} {...params} />
  );
}

function Verification(params: {
  challengeId?: string;
  purpose?: string;
  email?: string;
  returnTo?: string;
}) {
  const { colors } = useApp();
  const returnTo = safeAuthReturn(params.returnTo);
  const [challengeId, setChallengeId] = useState(params.challengeId ?? '');
  const [code, setCode] = useState('');
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const command = useCommand<{ resetToken?: string } | undefined>({ authenticated: false });
  const resend = useCommand<{ challengeId: string }>({ authenticated: false });
  const active = useActiveScreen();
  const working = useRef(false);
  const [resendAt, setResendAt] = useState(() => Date.now() + (params.challengeId ? 60_000 : 0));
  const [now, setNow] = useState(Date.now);
  const seconds = Math.max(0, Math.ceil((resendAt - now) / 1000));
  useEffect(() => {
    if (!seconds) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [seconds > 0]);
  const [verified, setVerified] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [pasteError, setPasteError] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const recovery = params.purpose === 'password_reset';
  const busy = command.isPending || resend.isPending || pasting;
  return (
    <AccountPage stage="XÁC THỰC EMAIL" backSource={otp.back}>
      <Artwork
        source={otp.hero}
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
        {params.email ?? 'email của bạn'}
      </Label>
      <View style={{ marginTop: 36, marginHorizontal: 24 }}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
          pointerEvents="none"
          style={{ flexDirection: 'row', gap: 10 }}
        >
          {Array.from({ length: 6 }, (_, index) => (
            <View
              key={index}
              style={{
                flex: 1,
                height: 66,
                borderWidth: index === Math.min(code.length, 5) ? 1.5 : 1,
                borderColor: command.isError
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
        </View>
        <TextInput
          ref={input}
          accessibilityLabel="Mã xác minh"
          value={code}
          onChangeText={(value) => {
            setCode(value.replace(/\D/g, '').slice(0, 6));
            setPasteError('');
            command.reset();
          }}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          editable={!verified && !busy}
          caretHidden
          underlineColorAndroid="transparent"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            color: 'transparent',
            backgroundColor: 'transparent',
            fontSize: 16,
          }}
        />
      </View>
      <DesignLink
        onPress={() => {
          if (working.current || verified) return;
          working.current = true;
          setPasting(true);
          setPasteError('');
          void Clipboard.getStringAsync()
            .then((value) => {
              if (!active.current) return;
              const pasted = value.trim();
              if (/^\d{6}$/.test(pasted)) {
                setCode(pasted);
                command.reset();
              } else {
                setPasteError('Sao chép đúng 6 chữ số trong email rồi dán lại.');
                input.current?.focus();
              }
            })
            .catch((error) => {
              if (active.current) setPasteError(errorMessage(error));
            })
            .finally(() => {
              working.current = false;
              if (active.current) setPasting(false);
            });
        }}
        style={{ marginTop: 14, alignItems: 'center' }}
      >
        {pasting ? 'Đang dán mã…' : 'Dán mã từ email'}
      </DesignLink>
      {params.email && !verified ? (
        <View style={{ marginTop: 55, marginHorizontal: 24 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Gửi lại mã"
            accessibilityState={{ disabled: busy || seconds > 0, busy: resend.isPending }}
            disabled={busy || seconds > 0}
            style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
            onPress={() => {
              if (working.current || seconds > 0) return;
              working.current = true;
              command.reset();
              setPasteError('');
              setVerificationError('');
              void resend
                .mutateAsync({
                  path: recovery
                    ? '/v1/auth/password-reset/request'
                    : '/v1/auth/email-verification/request',
                  body: { email: params.email },
                })
                .then((result) => {
                  if (!active.current) return;
                  setChallengeId(result.challengeId);
                  setCode('');
                  setResendAt(Date.now() + 60_000);
                  setNow(Date.now());
                  router.setParams({ challengeId: result.challengeId });
                })
                .catch((error) => {
                  if (active.current && error instanceof ApiError && error.status === 429) {
                    setResendAt(Date.now() + 60_000);
                    setNow(Date.now());
                  }
                })
                .finally(() => {
                  working.current = false;
                });
            }}
          >
            <Label size={13} weight="semibold" color={colors.brand}>
              {resend.isPending
                ? 'Đang gửi lại mã…'
                : seconds > 0
                  ? `Gửi lại sau ${seconds} giây`
                  : 'Chưa nhận được mã? Gửi lại'}
            </Label>
          </Pressable>
        </View>
      ) : null}
      <View style={{ marginTop: 33, marginHorizontal: 24, gap: 12 }}>
        {pasteError ? <Notice tone="error">{pasteError}</Notice> : null}
        {verificationError ? <Notice tone="error">{verificationError}</Notice> : null}
        <CommandError error={command.error ?? resend.error} />
        {!challengeId && !params.email ? (
          <>
            <Notice>Hãy yêu cầu mã xác minh mới để tiếp tục.</Notice>
            <AccountButton
              title={recovery ? 'Yêu cầu mã đặt lại mật khẩu' : 'Quay lại đăng nhập'}
              onPress={() =>
                router.replace({
                  pathname: recovery ? '/forgot-password' : '/login',
                  params: { returnTo },
                })
              }
            />
          </>
        ) : verified ? (
          <>
            <Notice tone="success">Email đã được xác minh. Bạn có thể đăng nhập.</Notice>
            <AccountButton
              title="Đăng nhập"
              onPress={() =>
                router.replace({
                  pathname: '/login',
                  params: { email: params.email ?? '', authNotice: 'verified', returnTo },
                })
              }
            />
          </>
        ) : (
          <AccountButton
            title="Xác thực và tiếp tục"
            accessibilityLabel="Xác nhận mã"
            disabled={!challengeId || !/^\d{6}$/.test(code) || resend.isPending || pasting}
            pending={command.isPending}
            onPress={() => {
              if (working.current || !challengeId || !/^\d{6}$/.test(code)) return;
              working.current = true;
              resend.reset();
              setVerificationError('');
              void command
                .mutateAsync({
                  path: recovery
                    ? '/v1/auth/password-reset/verify'
                    : '/v1/auth/email-verification/verify',
                  body: { challengeId, code },
                })
                .then((result) => {
                  if (!active.current) return;
                  setCode('');
                  if (recovery) {
                    if (!result?.resetToken) {
                      setVerificationError(
                        'Chưa nhận được quyền đặt lại mật khẩu. Hãy yêu cầu mã mới.',
                      );
                      return;
                    }
                    setResetCredential(result.resetToken, params.email ?? '');
                    router.replace({
                      pathname: '/reset-password',
                      params: { email: params.email ?? '', returnTo },
                    });
                  } else setVerified(true);
                })
                .catch(() => {})
                .finally(() => {
                  working.current = false;
                });
            }}
          />
        )}
      </View>
      <Label
        size={12}
        weight="medium"
        color={colors.muted}
        style={{ lineHeight: 18, textAlign: 'center', marginTop: 31, marginHorizontal: 24 }}
      >
        Đừng quên kiểm tra thư mục Spam / Thư rác.
      </Label>
    </AccountPage>
  );
}
export function ResetPasswordScreen() {
  const { colors } = useApp();
  const { email, returnTo: requestedReturn } = useLocalSearchParams<{
    email?: string;
    returnTo?: string;
  }>();
  const returnTo = safeAuthReturn(requestedReturn);
  const recoveryEmail = email ?? '';
  const [resetToken, setResetToken] = useState(() => getResetCredential(recoveryEmail));
  const [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false),
    [confirmVisible, setConfirmVisible] = useState(false);
  const command = useCommand({ authenticated: false });
  const active = useActiveScreen();
  const saving = useRef(false);
  useEffect(() => {
    const refresh = () => {
      if (saving.current || !resetToken || getResetCredential(recoveryEmail) === resetToken) return;
      setResetToken(null);
      setPassword('');
      setConfirm('');
    };
    refresh();
    const timer = setInterval(refresh, 10_000);
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, [recoveryEmail, resetToken]);
  const valid = password.length >= 8 && password.length <= 128;
  return (
    <AccountPage stage="MẬT KHẨU MỚI" backSource={reset.back}>
      <Artwork
        source={reset.hero}
        width={280}
        height={180}
        style={{ alignSelf: 'center', marginTop: 28 }}
      />
      <View style={{ marginTop: 21, marginHorizontal: 24, gap: 12 }}>
        <Label size={32} bold heading style={{ lineHeight: 42 }}>
          Đặt mật khẩu{'\n'}mới cho bạn.
        </Label>
        <Label size={15} color={colors.muted} style={{ lineHeight: 24 }}>
          Tạo mật khẩu mới để tiếp tục hành trình sống xanh của bạn.
        </Label>
      </View>
      <View style={{ marginTop: 33, marginHorizontal: 24, gap: 12 }}>
        {!resetToken ? (
          <>
            <Notice tone="warning">
              Hãy xác minh email để bắt đầu hoặc làm mới yêu cầu đặt lại mật khẩu.
            </Notice>
            <AccountButton
              title="Khôi phục mật khẩu"
              onPress={() =>
                router.replace({ pathname: '/forgot-password', params: { email, returnTo } })
              }
            />
          </>
        ) : (
          <>
            <AccountField
              label="Mật khẩu mới"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!visible}
              maxLength={128}
              placeholder="Ít nhất 8 ký tự"
              autoCapitalize="none"
              autoComplete="new-password"
              autoCorrect={false}
              editable={!command.isPending}
              toggle={() => setVisible((value) => !value)}
              toggleLabel={visible ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
              toggleSource={reset.eye}
            />
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[2, 4, 6, 8].map((length) => (
                <View
                  key={length}
                  style={{
                    flex: 1,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: password.length >= length ? colors.brand : colors.border,
                  }}
                />
              ))}
            </View>
            <Label size={12} color={colors.muted} style={{ lineHeight: 18 }}>
              {valid ? 'Đủ độ dài tối thiểu' : 'Sử dụng từ 8 đến 128 ký tự.'}
            </Label>
            <View style={{ marginTop: 11 }}>
              <AccountField
                label="Xác nhận mật khẩu mới"
                accessibilityLabel="Nhập lại mật khẩu"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={!confirmVisible}
                maxLength={128}
                autoCapitalize="none"
                autoComplete="new-password"
                autoCorrect={false}
                editable={!command.isPending}
                error={confirm && confirm !== password ? 'Mật khẩu xác nhận chưa khớp.' : undefined}
                toggle={() => setConfirmVisible((value) => !value)}
                toggleLabel={confirmVisible ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
                toggleSource={reset.eye}
              />
            </View>
            <View style={{ marginTop: 24, gap: 12 }}>
              <CommandError error={command.error} />
              <AccountButton
                title="Lưu mật khẩu mới"
                accessibilityLabel="Lưu mật khẩu"
                pending={command.isPending}
                disabled={!valid || password !== confirm}
                onPress={() => {
                  if (saving.current || !valid || password !== confirm) return;
                  if (getResetCredential(recoveryEmail) !== resetToken) {
                    setResetToken(null);
                    setPassword('');
                    setConfirm('');
                    return;
                  }
                  saving.current = true;
                  void command
                    .mutateAsync({
                      path: '/v1/auth/password-reset/complete',
                      body: { resetToken, newPassword: password },
                    })
                    .then(() => {
                      if (getResetCredential(recoveryEmail) === resetToken) clearResetCredential();
                      if (!active.current) return;
                      setPassword('');
                      setConfirm('');
                      router.replace({
                        pathname: '/login',
                        params: { email: email ?? '', authNotice: 'password_reset', returnTo },
                      });
                    })
                    .catch((error) => {
                      if (
                        active.current &&
                        error instanceof ApiError &&
                        error.code === 'RESET_TOKEN_INVALID'
                      ) {
                        if (getResetCredential(recoveryEmail) === resetToken)
                          clearResetCredential();
                        setResetToken(null);
                        setPassword('');
                        setConfirm('');
                      }
                    })
                    .finally(() => {
                      saving.current = false;
                    });
                }}
              />
            </View>
          </>
        )}
      </View>
    </AccountPage>
  );
}

export function ChangePasswordScreen() {
  return (
    <AccountPage stage="BẢO MẬT TÀI KHOẢN" backSource={passwordArtwork.back}>
      <RequireAuth>
        <ChangePasswordForm />
      </RequireAuth>
    </AccountPage>
  );
}
function ChangePasswordForm() {
  const { logout, colors, user } = useApp();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [shown, setShown] = useState({ current: false, next: false, confirm: false });
  const command = useCommand();
  const [saving, setSaving] = useState(false);
  const working = useRef(false);
  const valid = next.length >= 8 && next.length <= 128 && next === confirm && next !== current;
  return (
    <>
      <View style={{ marginTop: 35, marginHorizontal: 24, gap: 13 }}>
        <Label size={28} bold heading style={{ lineHeight: 39 }}>
          Thay đổi mật khẩu
        </Label>
        <Label size={14} color={colors.muted} style={{ lineHeight: 20 }}>
          Xác nhận bằng mật khẩu hiện tại, sau đó{'\n'}tạo mật khẩu mới cho tài khoản của bạn.
        </Label>
      </View>
      <View style={{ marginTop: 51, marginHorizontal: 24 }}>
        <AccountField
          label="Mật khẩu hiện tại"
          value={current}
          onChangeText={setCurrent}
          editable={!saving}
          secureTextEntry={!shown.current}
          maxLength={128}
          autoComplete="current-password"
          autoCapitalize="none"
          toggle={() => setShown((value) => ({ ...value, current: !value.current }))}
          toggleLabel={shown.current ? 'Ẩn mật khẩu hiện tại' : 'Hiện mật khẩu hiện tại'}
          toggleSource={passwordArtwork.eye}
        />
      </View>
      <DesignLink
        onPress={() => {
          if (!working.current)
            router.push({
              pathname: '/forgot-password',
              params: { email: user?.email, returnTo: '/settings' },
            });
        }}
        style={{ marginTop: 6, marginHorizontal: 24, alignItems: 'flex-end', minHeight: 48 }}
      >
        Quên mật khẩu hiện tại?
      </DesignLink>
      <View style={{ marginTop: 12, marginHorizontal: 24 }}>
        <AccountField
          label="Mật khẩu mới"
          value={next}
          onChangeText={setNext}
          editable={!saving}
          error={next && next === current ? 'Chọn mật khẩu khác mật khẩu hiện tại.' : undefined}
          secureTextEntry={!shown.next}
          maxLength={128}
          autoComplete="new-password"
          autoCapitalize="none"
          toggle={() => setShown((value) => ({ ...value, next: !value.next }))}
          toggleLabel={shown.next ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
          toggleSource={passwordArtwork.eye}
        />
      </View>
      <View style={{ marginTop: 13, marginHorizontal: 24, flexDirection: 'row', gap: 6 }}>
        {[2, 4, 6, 8].map((length) => (
          <View
            key={length}
            style={{
              height: 5,
              flex: 1,
              borderRadius: 3,
              backgroundColor: next.length >= length ? colors.brand : colors.border,
            }}
          />
        ))}
      </View>
      <Label
        size={11}
        weight="medium"
        color={colors.muted}
        style={{ lineHeight: 15, marginTop: 10, marginHorizontal: 24 }}
      >
        Sử dụng từ 8 đến 128 ký tự.
      </Label>
      <View style={{ marginTop: 21, marginHorizontal: 24 }}>
        <AccountField
          label="Xác nhận mật khẩu mới"
          value={confirm}
          onChangeText={setConfirm}
          editable={!saving}
          error={confirm && confirm !== next ? 'Mật khẩu xác nhận chưa khớp.' : undefined}
          secureTextEntry={!shown.confirm}
          maxLength={128}
          autoComplete="new-password"
          autoCapitalize="none"
          toggle={() => setShown((value) => ({ ...value, confirm: !value.confirm }))}
          toggleLabel={shown.confirm ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
          toggleSource={passwordArtwork.eye}
        />
      </View>
      <View
        style={{
          marginTop: 22,
          marginHorizontal: 24,
          flexDirection: 'row',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <Artwork source={passwordArtwork.shield} width={22} />
        <Label size={11} weight="medium" color={colors.muted} style={{ lineHeight: 16, flex: 1 }}>
          Mật khẩu mới nên khác mật khẩu đang dùng.
        </Label>
      </View>
      <View style={{ marginTop: 30, marginHorizontal: 24, gap: 12 }}>
        <CommandError error={command.error} />
        <AccountButton
          title="Cập nhật mật khẩu"
          accessibilityLabel="Đổi mật khẩu"
          pending={saving}
          disabled={!current || !valid}
          onPress={() => {
            if (working.current || !current || !valid) return;
            working.current = true;
            setSaving(true);
            const email = user?.email;
            void command
              .mutateAsync({
                path: '/v1/me/password',
                body: { currentPassword: current, newPassword: next },
              })
              .then(async () => {
                setCurrent('');
                setNext('');
                setConfirm('');
                await logout().catch(() => {});
                router.replace({
                  pathname: '/login',
                  params: { email, authNotice: 'password_reset', returnTo: '/settings' },
                });
              })
              .catch(() => {})
              .finally(() => {
                working.current = false;
                setSaving(false);
              });
          }}
        />
      </View>
      <DesignLink
        onPress={() => {
          if (!working.current) router.dismissTo('/settings');
        }}
        style={{ marginTop: 8, alignItems: 'center' }}
      >
        Hủy
      </DesignLink>
    </>
  );
}
