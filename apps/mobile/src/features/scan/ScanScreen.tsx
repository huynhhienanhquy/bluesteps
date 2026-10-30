import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Label, MenuItem, Notice } from '../../design-system/ui';
import { AccountButton } from '../auth/AccountLayout';
import { Artwork, DesignLink } from '../../design-system/DesignScreen';
import { wasteItems } from '../../services/fixtures';
import { handbookListAssets } from '../../design-system/handbook-list-assets';
import { CameraCapture } from './CameraCapture';
import { ScanScene, type ScanActions, type ScanVariant } from './ScanScene';
import { ScanDetailsScene, type ScanDetailVariant } from './ScanDetailsScene';

type Variant = ScanVariant | ScanDetailVariant;
const variants: Variant[] = [
  'start',
  'camera',
  'focused',
  'success',
  'result',
  'unrecognized',
  'loading',
  'detail',
  'award',
  'handbook',
];
const pictures: Record<string, number> = {
  bottle: handbookListAssets.imgImage13,
  paper: handbookListAssets.imgImage28,
  can: handbookListAssets.imgImage60,
  glass: handbookListAssets.imgImage29,
  battery: handbookListAssets.imgImage32,
  organic: handbookListAssets.imgImage30,
  'plastic-bag': handbookListAssets.imgImage58,
  notebook: handbookListAssets.imgImage28,
  jar: handbookListAssets.imgImage29,
  tea: handbookListAssets.imgImage30,
};
export function ScanScreen() {
  const params = useLocalSearchParams<{ state?: string; preview?: string }>();
  const preview = params.preview === '1' && variants.includes(params.state as Variant);
  const [interacted, setInteracted] = useState(false);
  const staticPreview = preview && !interacted;
  const [mode, setMode] = useState<'start' | 'camera' | 'review' | 'result' | 'detail'>('start');
  const [sample, setSample] = useState<Variant | null>(null);
  const [sheet, setSheet] = useState<'actions' | 'manual' | 'confirmation' | null>(null);
  const [selected, setSelected] = useState('bottle');
  const [photo, setPhoto] = useState<string>();
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const item = wasteItems.find((item) => item.id === selected)!;
  const variant = staticPreview
    ? (params.state as Variant)
    : (sample ?? (mode === 'review' ? 'focused' : mode));
  const start = () => {
    setInteracted(true);
    setSample(null);
    setMode('camera');
    setSheet(null);
    setError('');
  };
  async function pickPhoto() {
    if (picking) return;
    setPicking(true);
    setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.65,
        base64: false,
      });
      if (alive.current && !result.canceled && result.assets[0]) {
        setInteracted(true);
        setPhoto(result.assets[0].uri);
        setSample(null);
        setMode('review');
        setSheet('manual');
      }
    } catch {
      if (alive.current) {
        setError('Không mở được thư viện ảnh. Hãy thử lại hoặc chọn vật liệu thủ công.');
        setSheet('actions');
      }
    } finally {
      if (alive.current) setPicking(false);
    }
  }
  const chooseSample = (value: Variant) => {
    setInteracted(true);
    setSheet(null);
    setPhoto(undefined);
    setSelected('bottle');
    setSample(value);
  };
  const actions: ScanActions = {
    back: () => {
      setInteracted(true);
      if (variant !== 'start') {
        setMode('start');
        setSample(null);
        setPhoto(undefined);
      } else if (router.canGoBack()) router.back();
      else router.replace('/');
    },
    menu: () => setSheet('actions'),
    start,
    shutter: () => {
      if (staticPreview || sample) chooseSample(variant === 'camera' ? 'focused' : 'result');
      else setSheet('manual');
    },
    gallery: () => {
      void pickPhoto();
    },
    flip: () => {
      setError('Đổi camera hoạt động khi bạn mở camera thật. Đây là ảnh giao diện mẫu.');
      setSheet('actions');
    },
    flash: () => {
      setError('Đèn flash hoạt động khi bạn mở camera thật. Đây là ảnh giao diện mẫu.');
      setSheet('actions');
    },
    retry: start,
    handbook: () => chooseSample('handbook'),
    detail: () => {
      if (variant === 'success') chooseSample('result');
      else if (staticPreview || sample) chooseSample('detail');
      else {
        setInteracted(true);
        setMode('detail');
      }
    },
    dismiss: () => chooseSample('camera'),
  };
  const content = (
    <>
      {mode === 'review' && !staticPreview && !sample ? (
        <View style={{ position: 'absolute', left: 28, top: 630, width: 372 }}>
          <Notice>Ảnh chưa được nhận diện tự động. Chọn loại vật liệu để tiếp tục.</Notice>
        </View>
      ) : null}
      <Modal
        transparent
        animationType="fade"
        visible={sheet !== null}
        onRequestClose={() => setSheet(null)}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng tùy chọn quét"
            onPress={() => setSheet(null)}
            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(22,69,97,.24)' }}
          />
          <View
            role="dialog"
            aria-modal
            accessibilityLabel={sheet === 'manual' ? 'Chọn vật liệu' : 'Tùy chọn quét'}
            style={{
              width: '100%',
              maxWidth: 428,
              maxHeight: '88%',
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              padding: 24,
            }}
          >
            <ScrollView
              contentContainerStyle={{ gap: 16, paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              <Label size={23} bold heading>
                {sheet === 'manual'
                  ? 'Vật liệu của bạn là gì?'
                  : sheet === 'confirmation'
                    ? 'Xác nhận vật liệu'
                    : 'Tùy chọn quét'}
              </Label>
              {error ? <Notice tone="error">{error}</Notice> : null}
              {sheet === 'manual' ? (
                <>
                  <Label size={12}>
                    Chọn theo quan sát của bạn. Ảnh chưa gửi đến dịch vụ nhận diện.
                  </Label>
                  {wasteItems.map((material) => (
                    <MenuItem
                      key={material.id}
                      title={material.name}
                      detail={material.category}
                      icon={material.icon}
                      onPress={() => {
                        setInteracted(true);
                        setSelected(material.id);
                        setRecorded(false);
                        setSample(null);
                        setMode('result');
                        setSheet('confirmation');
                      }}
                    />
                  ))}
                </>
              ) : sheet === 'confirmation' ? (
                <>
                  <Label size={20} bold>
                    {item.name}
                  </Label>
                  <Label size={13}>{item.category} · Lựa chọn thủ công</Label>
                  {recorded ? (
                    <Notice tone="success">
                      Đã đánh dấu trong phiên demo. Điểm thưởng: 0 · POLICY_NOT_ENABLED.
                    </Notice>
                  ) : (
                    <Label size={13}>
                      Xác nhận chỉ lưu trong phiên xem trước; không cộng điểm.
                    </Label>
                  )}
                  {recorded ? (
                    <AccountButton
                      title="Tìm điểm thu gom"
                      onPress={() => {
                        setSheet(null);
                        router.push('/collection');
                      }}
                    />
                  ) : (
                    <AccountButton
                      title="Xác nhận lựa chọn trong demo"
                      onPress={() => setRecorded(true)}
                    />
                  )}
                  <AccountButton
                    title="Xem hướng dẫn vật liệu"
                    onPress={() => {
                      setSheet(null);
                      router.push(`/handbook/${selected}`);
                    }}
                  />
                  <DesignLink onPress={() => setSheet('manual')}>Chọn lại vật liệu</DesignLink>
                </>
              ) : (
                <>
                  <AccountButton title="Mở camera" onPress={start} />
                  <AccountButton
                    title={picking ? 'Đang mở thư viện…' : 'Chọn ảnh từ thư viện'}
                    disabled={picking}
                    onPress={() => {
                      void pickPhoto();
                    }}
                  />
                  <AccountButton
                    title="Chọn vật liệu thủ công"
                    onPress={() => setSheet('manual')}
                  />
                  {mode === 'result' && !sample ? (
                    <AccountButton
                      title="Xác nhận lựa chọn trong demo"
                      onPress={() => setSheet('confirmation')}
                    />
                  ) : null}
                  <Notice>
                    Ảnh chỉ xem trên thiết bị. Các trạng thái bên dưới là mẫu giao diện, chưa có
                    dịch vụ nhận diện hoặc cộng điểm.
                  </Notice>
                  {(
                    [
                      ['camera', 'Camera mẫu'],
                      ['focused', 'Khung nhận diện mẫu'],
                      ['unrecognized', 'Mẫu không nhận diện được'],
                      ['result', 'Thử kết quả minh họa'],
                      ['success', 'Mẫu quét thành công'],
                      ['loading', 'Mẫu đang xử lý'],
                      ['detail', 'Chi tiết kết quả mẫu'],
                      ['award', 'Mẫu thông báo 5 điểm'],
                      ['handbook', 'Sổ tay từ màn quét'],
                    ] as [Variant, string][]
                  ).map(([value, label]) => (
                    <DesignLink key={value} onPress={() => chooseSample(value)}>
                      {label}
                    </DesignLink>
                  ))}
                </>
              )}
              <DesignLink onPress={() => setSheet(null)} style={{ alignItems: 'center' }}>
                Đóng
              </DesignLink>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
  if (mode === 'camera' && !staticPreview && !sample)
    return (
      <>
        <CameraCapture
          actions={actions}
          onCapture={(uri) => {
            setPhoto(uri);
            setMode('review');
            setSheet('manual');
          }}
          onCancel={() => setSheet('manual')}
        />
        {content}
      </>
    );
  if (
    variant === 'loading' ||
    variant === 'detail' ||
    variant === 'award' ||
    variant === 'handbook'
  )
    return (
      <ScanDetailsScene
        variant={variant}
        photo={photo}
        result={
          !staticPreview && !sample && mode === 'detail'
            ? {
                title: item.name,
                category: item.category,
                instructions: item.steps,
                picture: pictures[selected]!,
              }
            : undefined
        }
        actions={{
          back: () => {
            setInteracted(true);
            if (variant === 'detail') {
              if (sample || staticPreview) chooseSample('result');
              else setMode('result');
            } else if (variant === 'handbook') chooseSample('unrecognized');
            else actions.back();
          },
          menu: actions.menu,
          detail: actions.detail,
          collect: () => router.push('/collection'),
          award: () => {
            if (staticPreview || sample) chooseSample('award');
            else setSheet('confirmation');
          },
          dismissAward: () => chooseSample('detail'),
          rewards: () => router.push('/rewards'),
          continueLoading: () => chooseSample('result'),
          material: (id) => router.push(`/handbook/${id}`),
        }}
      >
        {content}
      </ScanDetailsScene>
    );
  return (
    <ScanScene
      variant={variant}
      actions={actions}
      photo={photo}
      cameraContent={
        mode === 'result' && !staticPreview && !sample && !photo ? (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#DCEEF9',
            }}
          >
            <Artwork source={pictures[selected]} width={150} height={180} />
            <Label size={14} style={{ marginTop: 16 }}>
              Lựa chọn thủ công
            </Label>
          </View>
        ) : undefined
      }
      resultTitle={!staticPreview && !sample && selected !== 'bottle' ? item.name : undefined}
      resultImage={
        !staticPreview && !sample && selected !== 'bottle' ? pictures[selected] : undefined
      }
    >
      {content}
    </ScanScene>
  );
}
