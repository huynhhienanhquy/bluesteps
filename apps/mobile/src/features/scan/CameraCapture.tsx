import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { Button, Label, Notice } from '../../design-system/ui';
import { ScanScene, type ScanActions } from './ScanScene';

/** A real camera replaces only the photographic layer in the original frame. */
export function CameraCapture({
  onCapture,
  onCancel,
  actions,
}: {
  onCapture: (uri: string) => void;
  onCancel: () => void;
  actions: ScanActions;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const alive = useRef(true);
  const [focused, setFocused] = useState(false);
  const [ready, setReady] = useState(false);
  const [torch, setTorch] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        setReady(false);
      };
    }, []),
  );
  async function capture() {
    if (!ready || pending || !camera.current) return;
    setPending(true);
    setError('');
    try {
      const picture = await camera.current.takePictureAsync({ quality: 0.65, base64: false });
      if (alive.current && picture?.uri) onCapture(picture.uri);
    } catch {
      if (alive.current) setError('Không chụp được ảnh. Hãy thử lại hoặc chọn vật liệu thủ công.');
    } finally {
      if (alive.current) setPending(false);
    }
  }
  const granted = permission?.granted;
  return (
    <ScanScene
      variant="camera"
      captureDisabled={!granted || !ready || pending}
      torch={torch}
      actions={{
        ...actions,
        shutter: () => {
          void capture();
        },
        flash: () => setTorch((value) => !value),
        flip: () => {
          setReady(false);
          setTorch(false);
          setFacing((value) => (value === 'back' ? 'front' : 'back'));
        },
      }}
      cameraContent={
        granted && focused ? (
          <CameraView
            ref={camera}
            style={{ flex: 1 }}
            facing={facing}
            enableTorch={torch && facing === 'back'}
            onCameraReady={() => setReady(true)}
            onMountError={() => {
              setReady(false);
              setError('Không mở được camera trên thiết bị này.');
            }}
          />
        ) : null
      }
    >
      {!granted ? (
        <View
          style={{
            position: 'absolute',
            left: 44,
            top: 286,
            width: 340,
            padding: 24,
            borderRadius: 24,
            gap: 16,
            backgroundColor: '#FFFFFF',
          }}
        >
          <Label size={22} bold heading>
            Camera quét rác
          </Label>
          <Label size={13}>Cho phép camera để chụp vật liệu. Ảnh chỉ được xem trên thiết bị.</Label>
          {permission ? (
            <Button
              title={permission.canAskAgain ? 'Cho phép dùng camera' : 'Mở cài đặt quyền camera'}
              onPress={() => {
                if (!permission.canAskAgain && Platform.OS === 'web') {
                  setError('Mở phần quyền của trang trong trình duyệt để cho phép camera.');
                  return;
                }
                void (permission.canAskAgain ? requestPermission() : Linking.openSettings()).catch(
                  () => {
                    if (alive.current)
                      setError('Chưa mở được quyền camera. Bạn vẫn có thể chọn thủ công.');
                  },
                );
              }}
            />
          ) : (
            <Label size={13}>Đang kiểm tra quyền camera…</Label>
          )}
          <Button title="Chọn vật liệu thay thế" variant="secondary" onPress={onCancel} />
        </View>
      ) : null}
      {error ? (
        <View style={{ position: 'absolute', left: 34, top: granted ? 638 : 640, width: 360 }}>
          <Notice tone="error">{error}</Notice>
        </View>
      ) : null}
    </ScanScene>
  );
}
