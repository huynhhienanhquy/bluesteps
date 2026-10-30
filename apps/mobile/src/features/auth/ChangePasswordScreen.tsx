import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../../providers';
import { Label, Notice } from '../../design-system/ui';
import { Artwork, DesignLink } from '../../design-system/DesignScreen';
import { assets521_4735 as a } from '../../design-system/settings-assets';
import { AccountButton, AccountField, AccountPage } from './AccountLayout';

export function ChangePasswordScreen() {
  const { colors } = useApp();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState([false, false, false]);
  const [checked, setChecked] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const valid =
    password.length >= 8 &&
    password.length <= 128 &&
    current.length > 0 &&
    current !== password &&
    password === confirmation;
  const strength =
    Number(password.length >= 8) +
    Number(/[a-zA-Z]/.test(password)) +
    Number(/\d/.test(password) && /[^a-zA-Z\d]/.test(password)) +
    Number(password.length >= 16);
  const field = (
    label: string,
    value: string,
    update: (value: string) => void,
    index: number,
    error?: string,
  ) => (
    <AccountField
      label={label}
      value={value}
      onChangeText={update}
      placeholder="••••••••••••"
      autoComplete={index === 0 ? 'current-password' : 'new-password'}
      secureTextEntry={!visible[index]}
      toggle={() =>
        setVisible((current) => current.map((item, at) => (at === index ? !item : item)))
      }
      toggleLabel={`${visible[index] ? 'Ẩn' : 'Hiện'} ${label.toLocaleLowerCase('vi')}`}
      toggleSource={a.imgFrame1}
      error={error}
    />
  );
  return (
    <AccountPage
      stage="BẢO MẬT TÀI KHOẢN"
      statusSource={a.imgSongWiFiPin}
      backSource={a.imgFrame}
      iconWidth={78}
      fallback="/settings"
    >
      <View style={{ marginTop: 35, marginHorizontal: 24 }}>
        <Label size={28} bold heading style={{ lineHeight: 39 }}>
          Thay đổi mật khẩu
        </Label>
        <Label size={14} color={colors.muted} style={{ lineHeight: 20, marginTop: 13 }}>
          Xác nhận bằng mật khẩu hiện tại, sau đó{'\n'}tạo mật khẩu mới cho tài khoản của bạn.
        </Label>
      </View>
      <View style={{ marginTop: 51, marginHorizontal: 24 }}>
        {field(
          'Mật khẩu hiện tại',
          current,
          setCurrent,
          0,
          checked && !current ? 'Nhập mật khẩu hiện tại.' : undefined,
        )}
      </View>
      <DesignLink
        onPress={() => router.push('/forgot-password')}
        style={{ marginTop: 6, marginHorizontal: 24, alignItems: 'flex-end' }}
      >
        Quên mật khẩu hiện tại?
      </DesignLink>
      <View style={{ marginTop: 12, marginHorizontal: 24 }}>
        {field(
          'Mật khẩu mới',
          password,
          setPassword,
          1,
          checked && (password.length < 8 || password.length > 128)
            ? 'Mật khẩu cần từ 8 đến 128 ký tự.'
            : checked && current === password
              ? 'Chọn mật khẩu khác mật khẩu hiện tại.'
              : undefined,
        )}
      </View>
      <View style={{ marginTop: 13, marginHorizontal: 24, flexDirection: 'row', gap: 6 }}>
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
        color={colors.muted}
        style={{ lineHeight: 15, marginHorizontal: 24, marginTop: 10 }}
      >
        Ít nhất 8 ký tự, gồm chữ, số và ký tự đặc biệt.
      </Label>
      <View style={{ marginTop: 21, marginHorizontal: 24 }}>
        {field(
          'Xác nhận mật khẩu mới',
          confirmation,
          setConfirmation,
          2,
          checked && confirmation !== password ? 'Mật khẩu xác nhận chưa khớp.' : undefined,
        )}
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
        <Artwork source={a.imgFrame2} width={22} />
        <Label size={11} weight="medium" color={colors.muted} style={{ lineHeight: 15, flex: 1 }}>
          Mật khẩu mới nên khác mật khẩu đang dùng.
        </Label>
      </View>
      <View style={{ marginTop: 30, marginHorizontal: 24 }}>
        <AccountButton
          title="Cập nhật mật khẩu"
          onPress={() => {
            setChecked(true);
            setSubmitted(valid);
          }}
        />
      </View>
      <DesignLink
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))}
        style={{ marginTop: 9, alignItems: 'center' }}
      >
        Hủy
      </DesignLink>
      {submitted ? (
        <View style={{ margin: 24 }}>
          <Notice>Thông tin đã qua kiểm tra. Bản xem trước chưa đổi mật khẩu tài khoản.</Notice>
        </View>
      ) : null}
    </AccountPage>
  );
}
