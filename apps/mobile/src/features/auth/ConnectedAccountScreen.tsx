import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../providers';
import { Label, Notice } from '../../design-system/ui';
import { Artwork, DesignLink } from '../../design-system/DesignScreen';
import { assets386_7348 as a } from '../../design-system/recovery-assets';
import { assets386_7184 as loginAssets } from '../../design-system/screen-assets';
import { AccountButton, AccountField, AccountPage } from './AccountLayout';

export function ConnectedAccountScreen() {
  const { colors } = useApp();
  const { provider } = useLocalSearchParams<{ provider?: string }>();
  const providerName = provider === 'Facebook' ? 'Facebook' : 'Google';
  const [name, setName] = useState('Linh Chi');
  const [consent, setConsent] = useState(true);
  const [checked, setChecked] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  return (
    <AccountPage
      stage="HOÀN TẤT TÀI KHOẢN"
      statusSource={a.imgSongWiFiPin}
      backSource={a.imgIconBack}
      bottomPadding={30}
    >
      <View style={{ marginTop: 37, marginHorizontal: 24, gap: 12 }}>
        <Label size={32} bold heading style={{ lineHeight: 42 }}>
          Chào mừng,{'\n'}Linh Chi!
        </Label>
        <Artwork
          source={a.imgIconLeaf}
          width={54}
          style={{ position: 'absolute', right: 15, top: 3 }}
        />
        <Label size={15} color={colors.muted} style={{ lineHeight: 24 }}>
          Chỉ còn một bước nhỏ để kết nối tài khoản với BlueSteps.
        </Label>
      </View>
      <View
        style={{
          marginTop: 30,
          marginHorizontal: 24,
          height: 134,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 26,
          backgroundColor: colors.surface,
        }}
      >
        <Artwork
          source={providerName === 'Google' ? a.imgIcon : loginAssets.imgIcon1}
          width={26}
          style={{ position: 'absolute', left: 19, top: 15 }}
        />
        <Label
          size={15}
          weight="semibold"
          style={{ position: 'absolute', left: 55, top: 17, lineHeight: 22 }}
        >
          {providerName}
        </Label>
        <Label
          size={10}
          weight="semibold"
          color={colors.brand}
          style={{ position: 'absolute', right: 19, top: 21, lineHeight: 14 }}
        >
          Đã kết nối
        </Label>
        <View
          style={{
            position: 'absolute',
            left: 19,
            top: 68,
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.soft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Label size={15} bold color={colors.brand} style={{ lineHeight: 21 }}>
            LC
          </Label>
        </View>
        <Label
          size={14}
          weight="semibold"
          style={{ position: 'absolute', left: 77, top: 68, lineHeight: 20 }}
        >
          Linh Chi
        </Label>
        <Label
          size={12}
          weight="medium"
          color={colors.muted}
          style={{ position: 'absolute', left: 77, top: 92, lineHeight: 18 }}
        >
          linhchi@example.com
        </Label>
      </View>
      <View style={{ marginTop: 31, marginHorizontal: 24 }}>
        <AccountField
          label="Tên hiển thị"
          value={name}
          onChangeText={setName}
          autoComplete="name"
          error={checked && name.trim().length < 2 ? 'Nhập họ tên ít nhất 2 ký tự.' : undefined}
        />
      </View>
      <View
        style={{
          marginTop: 28,
          marginHorizontal: 24,
          height: 94,
          borderRadius: 22,
          backgroundColor: colors.mint,
        }}
      >
        <Artwork
          source={a.imgIconShield}
          width={28}
          style={{ position: 'absolute', left: 16, top: 18 }}
        />
        <Label
          size={13}
          weight="semibold"
          style={{ position: 'absolute', left: 58, top: 16, lineHeight: 18 }}
        >
          Bạn kiểm soát thông tin của mình
        </Label>
        <Label
          size={12}
          color={colors.muted}
          style={{ position: 'absolute', left: 58, top: 42, lineHeight: 17 }}
        >
          Chỉ sử dụng tên, email và ảnh đại diện.{'\n'}Không đăng bài lên trang cá nhân của bạn.
        </Label>
      </View>
      <View style={{ marginTop: 13, marginHorizontal: 24 }}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="Tôi đồng ý với Điều khoản và Chính sách bảo mật."
          accessibilityState={{ checked: consent }}
          aria-checked={consent}
          onPress={() => setConsent(!consent)}
          style={{ minHeight: 44, flexDirection: 'row', gap: 10, alignItems: 'center' }}
        >
          <View style={{ width: 28, height: 44, justifyContent: 'center', paddingLeft: 3 }}>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 7,
                borderWidth: 1,
                borderColor: consent ? colors.brand : colors.border,
                backgroundColor: consent ? colors.brand : colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {consent ? <Artwork source={a.imgIconCheck} width={18} /> : null}
            </View>
          </View>
          <Label size={12} weight="medium" color={colors.muted} style={{ lineHeight: 18, flex: 1 }}>
            Tôi đồng ý với Điều khoản và Chính sách bảo mật.
          </Label>
        </Pressable>
        {checked && !consent ? (
          <Label size={12} color={colors.danger}>
            Cần đồng ý điều khoản để tiếp tục.
          </Label>
        ) : null}
      </View>
      <View style={{ marginTop: 33, marginHorizontal: 24 }}>
        <AccountButton
          title="Hoàn tất và tiếp tục"
          onPress={() => {
            setChecked(true);
            setSubmitted(consent && name.trim().length >= 2);
          }}
        />
      </View>
      <DesignLink
        onPress={() => router.replace('/login')}
        style={{ marginTop: 6, alignItems: 'center' }}
      >
        Dùng tài khoản khác
      </DesignLink>
      {submitted ? (
        <View style={{ margin: 24 }}>
          <Notice>
            Thông tin đã qua kiểm tra. Đây là tài khoản mẫu, chưa kết nối với {providerName}.
          </Notice>
          <DesignLink onPress={() => router.replace('/')}>Tiếp tục khám phá</DesignLink>
        </View>
      ) : null}
    </AccountPage>
  );
}
