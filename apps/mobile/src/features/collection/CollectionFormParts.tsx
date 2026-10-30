import { useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Artwork } from '../../design-system/DesignScreen';
import { CollectionText as T, collectionColors as c } from './CollectionPage';

export function CollectionField({
  label,
  value,
  onChangeText,
  trailing,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  trailing?: number;
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      <T weight="medium">{label}</T>
      <View
        style={{
          height: multiline ? 84 : 48,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 12,
          backgroundColor: '#F5F9FC',
          padding: 13,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          maxLength={multiline ? 1000 : 200}
          style={{
            flex: 1,
            minWidth: 0,
            height: multiline ? 56 : 20,
            paddingHorizontal: 0,
            paddingVertical: multiline ? 8 : 0,
            fontFamily: 'BackupInter_400Regular',
            fontSize: 14,
            lineHeight: 20,
            color: c.ink,
            includeFontPadding: false,
            textAlignVertical: 'center',
            outlineWidth: 0,
          }}
        />
        {trailing ? (
          <View pointerEvents="none">
            <Artwork source={trailing} width={18} />
          </View>
        ) : null}
      </View>
    </View>
  );
}
export function CollectionInfo({
  title,
  detail,
  source,
}: {
  title: string;
  detail: string;
  source: number;
}) {
  return (
    <View
      style={{
        padding: 14,
        backgroundColor: c.mint,
        borderRadius: 14,
        flexDirection: 'row',
        gap: 10,
      }}
    >
      <Artwork source={source} width={20} />
      <View style={{ flex: 1, gap: 4 }}>
        <T weight="medium" color={c.brand}>
          {title}
        </T>
        <T size={12} color={c.muted}>
          {detail}
        </T>
      </View>
    </View>
  );
}
export function CollectionCheckRow({
  label,
  checked,
  source,
  onPress,
}: {
  label: string;
  checked: boolean;
  source: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      aria-checked={checked}
      onPress={onPress}
      style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderWidth: 1.5,
          borderColor: checked ? c.brand : c.border,
          backgroundColor: checked ? c.brand : '#FFFFFF',
          borderRadius: 6,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? <Artwork source={source} width={15} /> : null}
      </View>
      <T style={{ flex: 1 }}>{label}</T>
    </Pressable>
  );
}
export function CollectionPhotoField({
  title,
  detail,
  camera,
  plus,
  photos,
  onChange,
}: {
  title: string;
  detail: string;
  camera: number;
  plus: number;
  photos: string[];
  onChange: (photos: string[]) => void;
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pick = async () => {
    setError('');
    if (photos.length >= 5) {
      setError('Bạn có thể thêm tối đa 5 ảnh. Xóa một ảnh để thay ảnh mới.');
      return;
    }
    setBusy(true);
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError('Cho phép truy cập thư viện ảnh trong cài đặt thiết bị để thêm ảnh.');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 5 - photos.length,
        quality: 0.85,
      });
      if (!result.canceled) {
        const next = [...new Set([...photos, ...result.assets.map((asset) => asset.uri)])];
        if (next.length > 5) setError('Chỉ giữ tối đa 5 ảnh trong bản nháp.');
        onChange(next.slice(0, 5));
      }
    } catch {
      setError('Không mở được thư viện ảnh. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 12 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={() => {
          void pick();
        }}
        style={{
          padding: 17,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: c.brand,
          borderRadius: 16,
          backgroundColor: c.mint,
          flexDirection: 'row',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <Artwork source={camera} width={28} />
        <View style={{ flex: 1, gap: 4 }}>
          <T size={16} weight="semibold">
            {title}
          </T>
          <T size={12} color={c.muted}>
            {detail}
          </T>
        </View>
        <Artwork source={plus} width={22} />
      </Pressable>
      {photos.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {photos.map((uri, index) => (
            <View key={uri} style={{ width: 84, height: 72 }}>
              <Artwork
                source={{ uri }}
                width={84}
                height={72}
                fit="cover"
                style={{ borderRadius: 12 }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Xóa ảnh ${index + 1}`}
                onPress={() => {
                  onChange(photos.filter((photo) => photo !== uri));
                  setError('');
                }}
                style={{
                  position: 'absolute',
                  right: -4,
                  top: -4,
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: '#FFFFFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Artwork
                  source={require('../../../assets/figma/common/journey-close.svg')}
                  width={16}
                />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      {error ? (
        <T accessibilityRole="alert" size={12} color="#B42318">
          {error}
        </T>
      ) : null}
    </View>
  );
}
