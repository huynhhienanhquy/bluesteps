import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { PrivateModal as Modal } from './PrivateModal';
import * as ImagePicker from 'expo-image-picker';
import { Button, Label, Notice } from '../../design-system/ui';
import { useApp } from '../../providers';
import { errorMessage, operationKey, type Schemas } from '../../services/api';
import type { MediaSource } from '../../services/media-files';
import { uploadPostMedia } from '../../services/post-media';
import { PostMedia } from './PostMedia';
import { Artwork } from '../../design-system/DesignScreen';
import { ScanCapture } from './ScanCapture';

export function CollectionPhotos({
  photos,
  onChange,
  onBusy,
  disabled = false,
  context = 'proposal',
}: {
  photos: Schemas['MediaAsset'][];
  onChange: (photos: Schemas['MediaAsset'][]) => void;
  onBusy: (busy: boolean) => void;
  disabled?: boolean;
  context?: 'proposal' | 'report';
}) {
  const { api, colors } = useApp();
  const [sheet, setSheet] = useState<'source' | 'camera' | null>(null);
  const [picking, setPicking] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState<MediaSource[]>([]);
  const alive = useRef(true),
    working = useRef(false),
    pickerInFlight = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const currentPhotos = useRef(photos);
  useEffect(() => {
    currentPhotos.current = photos;
  }, [photos]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controller.current?.abort();
    };
  }, []);
  async function upload(sources: MediaSource[]) {
    if (working.current || disabled) return;
    if (currentPhotos.current.length + sources.length > 5) {
      setError('Tối đa 5 ảnh địa điểm.');
      return;
    }
    working.current = true;
    onBusy(true);
    setError('');
    setRetry([]);
    setProgress(0);
    const abort = new AbortController();
    controller.current = abort;
    let remaining = sources;
    try {
      for (const source of sources) {
        const asset = await uploadPostMedia(api, source, abort.signal, (bytes, total) => {
          if (alive.current) setProgress(Math.round((bytes / total) * 100));
        });
        if (!alive.current || abort.signal.aborted) return;
        const next = [...currentPhotos.current, asset];
        currentPhotos.current = next;
        onChange(next);
        remaining = remaining.slice(1);
      }
    } catch (cause) {
      if (alive.current && !abort.signal.aborted) {
        setError(errorMessage(cause));
        setRetry(remaining);
      }
    } finally {
      working.current = false;
      if (alive.current) {
        setProgress(null);
        onBusy(false);
      }
    }
  }
  async function pick() {
    const slots = 5 - currentPhotos.current.length;
    if (working.current || pickerInFlight.current || disabled || slots <= 0) return;
    pickerInFlight.current = true;
    setPicking(true);
    onBusy(true);
    setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: slots > 1,
        selectionLimit: slots,
        quality: 0.8,
      });
      if (!result.canceled && alive.current) {
        setSheet(null);
        await upload(
          result.assets.map((asset) => ({
            uri: asset.uri,
            name: asset.fileName ?? 'diem-thu-gom.jpg',
            mime: asset.mimeType ?? 'image/jpeg',
            kind: 'image',
            file: asset.file,
            clientUploadId: operationKey(),
          })),
        );
      }
    } catch (cause) {
      if (alive.current) {
        setSheet(null);
        setError(errorMessage(cause));
      }
    } finally {
      pickerInFlight.current = false;
      if (alive.current) {
        setPicking(false);
        onBusy(false);
      }
    }
  }
  const unavailable = disabled || picking || progress !== null || photos.length >= 5;
  const addLabel = context === 'report' ? 'Thêm ảnh hiện trạng' : 'Thêm ảnh địa điểm';
  return (
    <View style={{ gap: 12 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={addLabel}
        accessibilityState={{ disabled: unavailable }}
        disabled={unavailable}
        onPress={() => setSheet('source')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          padding: 16,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: '#147CC1',
          borderRadius: 14,
          backgroundColor: '#EDF7FC',
          opacity: disabled || photos.length >= 5 ? 0.45 : 1,
        }}
      >
        <Artwork
          source={require('../../../assets/icons/collection/forms/camera.svg')}
          width={28}
          height={28}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Label bold size={16} color="#172B3D">
            {context === 'report' ? 'Thêm ảnh hiện trạng' : 'Ảnh địa điểm *'}
          </Label>
          <Label size={12} color="#677C8C">
            {context === 'report'
              ? 'Ảnh chụp rõ thùng rác sẽ giúp xử lý nhanh hơn'
              : 'Chụp lối vào và khu vực nhận rác · tối đa 5 ảnh'}
          </Label>
        </View>
        <Artwork
          source={require('../../../assets/icons/collection/forms/plus.svg')}
          width={22}
          height={22}
        />
      </Pressable>
      {photos.length ? <Label size={12}>{photos.length}/5 ảnh đã thêm</Label> : null}
      {photos.map((photo, index) => (
        <View key={photo.id} style={{ gap: 8 }}>
          <PostMedia assets={[photo]} context="địa điểm" gallery />
          <Button
            title={`Bỏ ảnh ${index + 1}`}
            variant="quiet"
            disabled={disabled || picking || progress !== null}
            onPress={() => {
              const next = currentPhotos.current.filter((item) => item.id !== photo.id);
              currentPhotos.current = next;
              onChange(next);
            }}
          />
        </View>
      ))}
      {progress !== null ? (
        <>
          <Label>Đang tải ảnh {progress}%</Label>
          <Button title="Hủy tải ảnh" variant="quiet" onPress={() => controller.current?.abort()} />
        </>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      {retry.length && progress === null ? (
        <Button
          title="Thử tải ảnh lại"
          variant="secondary"
          disabled={disabled || picking}
          onPress={() => void upload(retry)}
        />
      ) : null}
      <Modal
        visible={sheet !== null}
        transparent={sheet === 'source'}
        onRequestClose={() => { if (!pickerInFlight.current) setSheet(null); }}
        animationType="slide"
      >
        {sheet === 'camera' ? (
          <ScanCapture
            mode="collection"
            onClose={() => { if (!pickerInFlight.current) setSheet(null); }}
            onPick={() => void pick()}
            onImage={(uri) => {
              if (pickerInFlight.current) return;
              setSheet(null);
              void upload([
                {
                  uri,
                  name: 'diem-thu-gom.jpg',
                  mime: 'image/jpeg',
                  kind: 'image',
                  clientUploadId: operationKey(),
                },
              ]);
            }}
          />
        ) : sheet === 'source' ? (
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#0006' }}>
            <View style={{ padding: 24, paddingBottom: 36, gap: 12, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.surface }}>
              <Label bold size={18}>{addLabel}</Label>
              <Button
                title="Chụp ảnh"
                icon="camera-outline"
                variant="secondary"
                disabled={picking}
                onPress={() => setSheet('camera')}
              />
              <Button
                title="Chọn từ thư viện"
                icon="images-outline"
                variant="secondary"
                pending={picking}
                onPress={() => void pick()}
              />
              <Button title="Hủy" variant="quiet" disabled={picking} onPress={() => setSheet(null)} />
            </View>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}
