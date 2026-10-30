import { useState } from 'react';
import { Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { z } from 'zod';
import { Artwork } from '../../design-system/DesignScreen';
import { LegacyCanvas, LegacyStatusBar } from '../../design-system/LegacyCanvas';
import { Label, Notice } from '../../design-system/ui';
import { AccountButton, AccountField } from '../auth/AccountLayout';
import { assets386_8516 as a } from '../../design-system/settings-assets';

const back = require('../../../assets/figma/common/edit-back.png');
const originalBack = require('../../../assets/figma/common/back-chevron-dark.png');
const down = require('../../../assets/figma/common/down-chevron.png');
const systemFont =
  Platform.OS === 'web' ? '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' : undefined;
const formatBirthday = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/');
};
function validBirthday(value: string) {
  const parts = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (!parts) return false;
  const day = Number(parts[1]),
    month = Number(parts[2]),
    year = Number(parts[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function EditProfileScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');
  const [country, setCountry] = useState('');
  const [photo, setPhoto] = useState<string>();
  const [picker, setPicker] = useState<'date' | 'country' | null>(null);
  const [checked, setChecked] = useState(false);
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(false);
  const errors = {
    name: checked && !!name && name.trim().length < 2,
    email: checked && !!email && !z.email().safeParse(email).success,
    birthday: checked && !!birthday && !validBirthday(birthday),
  };
  async function choosePhoto() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setMessage('Bạn có thể cho phép truy cập ảnh để đổi ảnh đại diện.');
        return;
      }
      const selection = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });
      if (!selection.canceled && selection.assets[0]) setPhoto(selection.assets[0].uri);
    } catch {
      setMessage('Chưa mở được thư viện ảnh. Hãy thử lại.');
    }
  }
  const inputStyle = {
    fontFamily: systemFont,
    fontSize: 14,
    lineHeight: 16,
    color: '#000000',
    height: 40,
    paddingHorizontal: 12,
    paddingVertical: 0,
    outlineWidth: 0,
  };
  return (
    <LegacyCanvas background="#FFFFFF">
      <LegacyStatusBar assets={a} />
      <Artwork
        source={originalBack}
        width={35}
        style={{ position: 'absolute', left: 10, top: 66 }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}
        style={{ position: 'absolute', left: 15, top: 56, width: 49, height: 49 }}
      >
        <Artwork source={back} width={35} style={{ marginLeft: 7, marginTop: 7 }} />
      </Pressable>
      <Text
        accessibilityRole="header"
        style={{
          position: 'absolute',
          left: 134,
          top: 61,
          fontFamily: 'Inter_700Bold',
          fontSize: 32,
          color: '#000000',
        }}
      >
        Chỉnh sửa
      </Text>
      <Artwork
        source={a.imgEllipse9}
        width={120}
        style={{ position: 'absolute', left: 165, top: 118 }}
      />
      <Artwork
        source={photo ? { uri: photo } : a.imgEllipse10}
        width={110}
        fit={photo ? 'cover' : 'contain'}
        style={{ position: 'absolute', left: 170, top: 123, borderRadius: 55 }}
      />
      <Artwork
        source={a.imgEllipse12}
        width={30}
        style={{ position: 'absolute', left: 255, top: 203 }}
      />
      <Artwork
        source={a.imgIconlySharpLightCamera}
        width={24}
        style={{ position: 'absolute', left: 258, top: 206 }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đổi ảnh đại diện"
        onPress={() => {
          void choosePhoto();
        }}
        style={{ position: 'absolute', left: 248, top: 196, width: 44, height: 44 }}
      />
      {[
        {
          label: 'Tên',
          placeholder: 'Linh Chi',
          value: name,
          update: setName,
          y: 263,
          error: errors.name,
        },
        {
          label: 'Email',
          placeholder: 'linhchi@gmail.com',
          value: email,
          update: setEmail,
          y: 368,
          error: errors.email,
        },
        {
          label: 'Mật khẩu',
          placeholder: '*******',
          value: '',
          update: () => {},
          y: 474,
          error: false,
        },
        {
          label: 'Ngày sinh',
          placeholder: '30/10/2005',
          value: birthday,
          update: (value: string) => setBirthday(formatBirthday(value)),
          y: 580,
          error: errors.birthday,
        },
        {
          label: 'Quốc gia',
          placeholder: 'VietNam',
          value: country,
          update: setCountry,
          y: 686,
          error: false,
        },
      ].map((item) => (
        <View
          key={item.label}
          style={{ position: 'absolute', left: 55, top: item.y, width: 317, height: 65 }}
        >
          <Text
            style={{
              fontFamily: systemFont,
              fontWeight: '500',
              fontSize: 14,
              lineHeight: 16,
              color: '#000000',
            }}
          >
            {item.label}
          </Text>
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 23,
              width: 317,
              height: 42,
              backgroundColor: '#FFFFFF',
              borderWidth: 1,
              borderColor: item.error ? '#B3303F' : '#000000',
              borderRadius: 10,
              boxShadow: '0px 4px 2px rgba(0,0,0,0.25)',
            }}
          >
            <TextInput
              accessibilityLabel={item.label}
              value={item.value}
              onChangeText={item.update}
              placeholder={item.placeholder}
              placeholderTextColor="#DADADA"
              readOnly={item.label === 'Mật khẩu'}
              keyboardType={
                item.label === 'Email'
                  ? 'email-address'
                  : item.label === 'Ngày sinh'
                    ? 'number-pad'
                    : 'default'
              }
              autoCapitalize={item.label === 'Email' ? 'none' : 'sentences'}
              autoComplete={
                item.label === 'Tên' ? 'name' : item.label === 'Email' ? 'email' : 'off'
              }
              style={[
                inputStyle,
                { paddingRight: ['Ngày sinh', 'Quốc gia'].includes(item.label) ? 36 : 12 },
              ]}
            />
            {item.label === 'Mật khẩu' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Thay đổi mật khẩu"
                onPress={() => router.push('/change-password')}
                style={{ position: 'absolute', inset: 0 }}
              />
            ) : null}
          </View>
          {['Ngày sinh', 'Quốc gia'].includes(item.label) ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.label === 'Ngày sinh' ? 'Chọn ngày sinh' : 'Chọn quốc gia'}
              onPress={() => setPicker(item.label === 'Ngày sinh' ? 'date' : 'country')}
              style={{ position: 'absolute', left: 281, top: 17, width: 42, height: 48 }}
            >
              <Artwork source={down} width={30} style={{ marginLeft: 6, marginTop: 12 }} />
            </Pressable>
          ) : null}
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setChecked(true);
          const valid =
            (!name || name.trim().length >= 2) &&
            (!email || z.email().safeParse(email).success) &&
            (!birthday || validBirthday(birthday));
          setSaved(valid);
          setMessage(
            valid
              ? 'Đã cập nhật bản xem trước. Hồ sơ tài khoản chưa thay đổi.'
              : 'Kiểm tra tên, email và ngày sinh theo định dạng ngày/tháng/năm.',
          );
        }}
        style={{
          position: 'absolute',
          left: 76,
          top: 809,
          width: 271,
          height: 44,
          borderRadius: 10,
          backgroundColor: '#147CC1',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{ fontFamily: 'Inter_700Bold', fontSize: 16, lineHeight: 16, color: '#FFFFFF' }}
        >
          Lưu thay đổi
        </Text>
      </Pressable>
      {message ? (
        <View
          accessibilityRole="alert"
          style={{ position: 'absolute', left: 55, top: 865, width: 317 }}
        >
          <Label size={11} color={saved ? '#237B57' : '#B3303F'} style={{ lineHeight: 16 }}>
            {message}
          </Label>
        </View>
      ) : null}
      <Modal
        transparent
        animationType="fade"
        visible={picker !== null}
        onRequestClose={() => setPicker(null)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đóng lựa chọn"
          onPress={() => setPicker(null)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(22,69,97,.24)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              width: '100%',
              maxWidth: 380,
              backgroundColor: '#FFFFFF',
              padding: 24,
              borderRadius: 26,
              gap: 20,
            }}
          >
            <Label size={23} bold heading>
              {picker === 'date' ? 'Chọn ngày sinh' : 'Chọn quốc gia'}
            </Label>
            <AccountField
              label={picker === 'date' ? 'Ngày/tháng/năm' : 'Tên quốc gia'}
              value={picker === 'date' ? birthday : country}
              onChangeText={picker === 'date' ? setBirthday : setCountry}
              placeholder={picker === 'date' ? '30/10/2005' : 'VietNam'}
            />
            {picker === 'country' ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {['VietNam', 'Thái Lan', 'Singapore'].map((value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    onPress={() => setCountry(value)}
                    style={{ padding: 10, borderRadius: 14, backgroundColor: '#EDF7FC' }}
                  >
                    <Label size={13}>{value}</Label>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {picker === 'date' && birthday && !validBirthday(birthday) ? (
              <Notice tone="error">Nhập ngày hợp lệ theo định dạng ngày/tháng/năm.</Notice>
            ) : null}
            <AccountButton
              title="Áp dụng"
              onPress={() => {
                if (picker !== 'date' || !birthday || validBirthday(birthday)) setPicker(null);
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </LegacyCanvas>
  );
}
