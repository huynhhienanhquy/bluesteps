import { useCallback, useRef, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { Button, Card, Icon, Label, Notice, Typography } from '../../design-system/ui';
import { StatusSpace } from '../../design-system/DesignScreen';
import { errorMessage } from '../../services/api';

export function ScanCapture({
  onImage,
  onClose,
  onPick,
  mode = 'scan',
}: {
  onImage: (uri: string) => void;
  onClose: () => void;
  onPick: () => void;
  mode?: 'scan' | 'post' | 'message' | 'collection';
}) {
  const [permission, request] = useCameraPermissions();
  const [focused, setFocused] = useState(false),
    [ready, setReady] = useState(false);
  const [torch, setTorch] = useState(false),
    [facing, setFacing] = useState<'front' | 'back'>('back');
  const [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const camera = useRef<CameraView>(null),
    alive = useRef(false);
  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      setFocused(true);
      return () => {
        alive.current = false;
        setFocused(false);
        setReady(false);
      };
    }, []),
  );
  async function capture() {
    if (!camera.current || !ready || pending) return;
    setPending(true);
    setError('');
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.7 });
      if (alive.current && photo?.uri) onImage(photo.uri);
    } catch (cause) {
      if (alive.current) setError(errorMessage(cause));
    } finally {
      if (alive.current) setPending(false);
    }
  }
  return (
    <Typography.Provider value="inter">
      <View style={{ flex: 1, backgroundColor: '#147CC1' }}>
        <StatusSpace />
        <View style={{ flex: 1, backgroundColor: '#24343D' }}>
          {permission?.granted && focused ? (
            <>
              <CameraView
                ref={camera}
                style={{ position: 'absolute', inset: 0 }}
                facing={facing}
                enableTorch={torch && facing === 'back'}
                onCameraReady={() => setReady(true)}
                onMountError={() => {
                  setReady(false);
                  setError('Không mở được camera.');
                }}
              />
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: '16%',
                  right: '16%',
                  top: '24%',
                  bottom: '30%',
                }}
              >
                {[
                  {
                    top: 0,
                    left: 0,
                    borderTopWidth: 7,
                    borderLeftWidth: 7,
                    borderTopLeftRadius: 28,
                  },
                  {
                    top: 0,
                    right: 0,
                    borderTopWidth: 7,
                    borderRightWidth: 7,
                    borderTopRightRadius: 28,
                  },
                  {
                    bottom: 0,
                    left: 0,
                    borderBottomWidth: 7,
                    borderLeftWidth: 7,
                    borderBottomLeftRadius: 28,
                  },
                  {
                    bottom: 0,
                    right: 0,
                    borderBottomWidth: 7,
                    borderRightWidth: 7,
                    borderBottomRightRadius: 28,
                  },
                ].map((corner, index) => (
                  <View
                    key={index}
                    style={{
                      position: 'absolute',
                      width: 64,
                      height: 64,
                      borderColor: '#FFFFFFCC',
                      ...corner,
                    }}
                  />
                ))}
                <View
                  style={{
                    position: 'absolute',
                    left: '20%',
                    right: '20%',
                    top: '50%',
                    height: 6,
                    borderRadius: 4,
                    backgroundColor: '#FFFFFFBB',
                    opacity: mode === 'scan' ? 1 : 0,
                  }}
                />
              </View>
              <View
                style={{
                  position: 'absolute',
                  left: 20,
                  right: 20,
                  top: 16,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <CameraControl
                  label="Đóng camera"
                  icon="arrow-back"
                  disabled={pending}
                  onPress={onClose}
                />
                <CameraControl
                  label={torch ? 'Tắt đèn' : 'Bật đèn'}
                  icon={torch ? 'flash' : 'flash-off'}
                  disabled={pending || facing === 'front'}
                  onPress={() => setTorch((value) => !value)}
                />
              </View>
              {mode !== 'scan' ? (
                <View
                  pointerEvents="none"
                  style={{ position: 'absolute', top: 82, left: 20, right: 20, gap: 8 }}
                >
                  <Label size={22} bold color="#FFFFFF" style={{ textAlign: 'center' }}>
                    {mode === 'collection'
                      ? 'Chụp ảnh địa điểm'
                      : mode === 'message'
                        ? 'Chụp ảnh cho tin nhắn'
                        : 'Chụp ảnh cho bài viết'}
                  </Label>
                  <Label size={15} color="#FFFFFF" style={{ textAlign: 'center' }}>
                    Đưa cảnh vào khung hình
                  </Label>
                </View>
              ) : null}
              <View
                style={{
                  position: 'absolute',
                  bottom: 36,
                  left: 24,
                  right: 24,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <CameraControl
                  label="Chọn ảnh từ thư viện"
                  icon="images-outline"
                  disabled={pending}
                  onPress={onPick}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Chụp ảnh"
                  accessibilityState={{ disabled: !ready || pending }}
                  disabled={!ready || pending}
                  onPress={() => void capture()}
                  style={{
                    width: 84,
                    height: 84,
                    borderRadius: 42,
                    borderWidth: 5,
                    borderColor: '#FFFFFFAA',
                    backgroundColor: ready ? '#FFFFFF' : '#FFFFFF66',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {pending ? (
                    <ActivityIndicator color="#147CC1" />
                  ) : (
                    <Icon name="camera-outline" size={30} color="#147CC1" />
                  )}
                </Pressable>
                <CameraControl
                  label="Đổi camera"
                  icon="camera-reverse-outline"
                  disabled={pending}
                  onPress={() => {
                    setReady(false);
                    setFacing((value) => (value === 'back' ? 'front' : 'back'));
                  }}
                />
              </View>
              {!ready && !error ? (
                <View
                  style={{
                    position: 'absolute',
                    top: '40%',
                    left: 24,
                    right: 24,
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <ActivityIndicator color="#FFFFFF" />
                  <Label color="#FFFFFF">Đang mở camera…</Label>
                </View>
              ) : null}
            </>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
              <Card>
                <Label size={22} bold heading>
                  {mode === 'collection'
                    ? 'Chụp ảnh địa điểm'
                    : mode === 'message'
                      ? 'Chụp ảnh cho tin nhắn'
                      : mode === 'post'
                        ? 'Chụp ảnh cho bài viết'
                        : 'Camera phân loại rác'}
                </Label>
                <Label>
                  {mode !== 'scan'
                    ? 'Cho phép camera để chụp ảnh đính kèm.'
                    : 'Cho phép camera để chụp ảnh vật phẩm. Bạn cũng có thể chọn ảnh có sẵn.'}
                </Label>
                <Button
                  title="Cho phép dùng camera"
                  onPress={() => {
                    void (
                      permission?.canAskAgain
                        ? request()
                        : Platform.OS === 'web'
                          ? Promise.reject(
                              new Error('Cho phép camera trong cài đặt của trình duyệt.'),
                            )
                          : Linking.openSettings()
                    ).catch((cause) => setError(errorMessage(cause)));
                  }}
                />
                <Button title="Chọn ảnh từ thư viện" variant="secondary" onPress={onPick} />
                <Button title="Đóng camera" variant="quiet" onPress={onClose} />
              </Card>
            </View>
          )}
          {!!error && (
            <View style={{ position: 'absolute', top: 90, left: 24, right: 24 }}>
              <Notice tone="error">{error}</Notice>
            </View>
          )}
        </View>
        <View style={{ height: 24 }} />
      </View>
    </Typography.Provider>
  );
}
function CameraControl({
  label,
  icon,
  disabled,
  onPress,
}: {
  label: string;
  icon: ComponentProps<typeof Icon>['name'];
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#0005',
        borderWidth: 1,
        borderColor: '#FFFFFFAA',
        opacity: disabled ? 0.5 : 1,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={28} color="#FFFFFF" />
    </Pressable>
  );
}
