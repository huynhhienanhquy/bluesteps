import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Artwork } from '../../design-system/DesignScreen';
import { settingsArtwork } from '../../design-system/settings-artwork';
import { Button, Label, Notice } from '../../design-system/ui';
import { useApp } from '../../providers';
import { errorMessage } from '../../services/api';
import type { AvatarSource } from '../../services/local-profile-storage';
import { useLocalProfile, type LocalProfile } from './LocalProfileProvider';
import { UserAvatar } from './UserAvatar';
export function AvatarEditor({
  profile,
  disabled,
  onSaved,
  onBusy,
}: {
  profile: LocalProfile;
  disabled?: boolean;
  onSaved: (profile: LocalProfile) => void;
  onBusy: (busy: boolean) => void;
}) {
  const { colors } = useApp(),
    local = useLocalProfile();
  const [open, setOpen] = useState(false),
    [source, setSource] = useState<AvatarSource | null>(null),
    [working, setWorking] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  const alive = useRef(true),
    busy = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(
    () => () => {
      if (source?.uri.startsWith('blob:') && typeof URL !== 'undefined')
        URL.revokeObjectURL(source.uri);
    },
    [source],
  );
  async function choose(camera = false) {
    if (disabled || busy.current) return;
    busy.current = true;
    setWorking(true);
    onBusy(true);
    setError('');
    setMessage('');
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) throw new Error('Cho phép camera để chụp ảnh đại diện.');
      }
      if (!alive.current) return;
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      };
      const result = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets[0]) {
        const photo = result.assets[0];
        if (alive.current) {
          setSource({ uri: photo.uri, file: photo.file, mime: photo.mimeType ?? undefined });
          setOpen(true);
        } else if (photo.uri.startsWith('blob:') && typeof URL !== 'undefined') {
          URL.revokeObjectURL(photo.uri);
        }
      }
    } catch (cause) {
      if (alive.current) setError(errorMessage(cause));
    } finally {
      busy.current = false;
      if (alive.current) {
        setWorking(false);
        onBusy(false);
      }
    }
  }
  async function persist(remove = false) {
    if (disabled || busy.current || (!remove && !source)) return;
    busy.current = true;
    setWorking(true);
    onBusy(true);
    setError('');
    try {
      const updated = await local.setAvatar(remove ? null : source, profile.revision);
      if (alive.current) {
        onSaved(updated);
        setSource(null);
        setOpen(false);
        setMessage(
          remove ? 'Đã gỡ ảnh đại diện trên thiết bị.' : 'Đã lưu ảnh đại diện trên thiết bị.',
        );
      }
    } catch (cause) {
      if (alive.current) {
        setError(errorMessage(cause));
        local.reload();
      }
    } finally {
      busy.current = false;
      if (alive.current) {
        setWorking(false);
        onBusy(false);
      }
    }
  }
  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          alignSelf: 'center',
          width: 120,
          height: 120,
          borderRadius: 60,
          borderWidth: 3,
          borderColor: colors.brand,
          backgroundColor: colors.mint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <UserAvatar
          userId={profile.id}
          name={profile.displayName}
          size={114}
          foreground={colors.brand}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thay ảnh đại diện"
          disabled={disabled || working}
          onPress={() => {
            if (busy.current) return;
            if (open) setSource(null);
            setError('');
            setOpen(!open);
          }}
          style={{
            position: 'absolute',
            right: -3,
            bottom: 2,
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: colors.soft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Artwork source={settingsArtwork.camera} width={24} />
        </Pressable>
      </View>
      {open ? (
        <View style={{ gap: 10 }}>
          <Label size={12}>Ảnh đại diện chỉ được lưu và hiển thị trên thiết bị này.</Label>
          <Button
            title="Chọn ảnh đại diện từ thư viện"
            variant="secondary"
            disabled={disabled || working}
            onPress={() => void choose()}
          />
          <Button
            title="Chụp ảnh đại diện"
            variant="quiet"
            disabled={disabled || working}
            onPress={() => void choose(true)}
          />
          {source ? (
            <>
              <Image
                source={{ uri: source.uri }}
                accessibilityLabel="Xem trước ảnh đại diện"
                resizeMode="cover"
                style={{ width: 160, height: 160, borderRadius: 80, alignSelf: 'center' }}
              />
              <Button
                title="Dùng ảnh này làm đại diện"
                pending={working}
                disabled={disabled}
                onPress={() => void persist()}
              />
              <Button
                title="Bỏ ảnh đã chọn"
                variant="quiet"
                disabled={working}
                onPress={() => setSource(null)}
              />
            </>
          ) : null}
          {profile.avatarUri ? (
            <Button
              title="Gỡ ảnh đại diện hiện tại"
              variant="danger"
              disabled={disabled || working}
              onPress={() => void persist(true)}
            />
          ) : null}
        </View>
      ) : null}
      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
    </View>
  );
}
