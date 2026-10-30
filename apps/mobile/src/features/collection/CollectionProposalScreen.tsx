import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useApp } from '../../providers';
import { Artwork } from '../../design-system/DesignScreen';
import { collectionNavigationAssets } from '../../design-system/collection-navigation-assets';
import {
  initialCollectionProposal,
  type CollectionProposalDraft,
} from '../../services/collection-forms';
import {
  CollectionAction,
  CollectionPage,
  CollectionSheet,
  CollectionText as T,
  collectionColors as c,
} from './CollectionPage';
import {
  CollectionCheckRow,
  CollectionField,
  CollectionInfo,
  CollectionPhotoField,
} from './CollectionFormParts';
const a = collectionNavigationAssets['534:48595'];
const materials = ['Nhựa', 'Giấy, bìa', 'Kim loại', 'Thủy tinh', 'Pin đã dùng', 'Điện tử'];
const consentLabel = 'Tôi xác nhận thông tin này là đề xuất từ cộng đồng, chưa được xác minh.';

export function CollectionProposalScreen() {
  const { pointProposalDraft, setPointProposalDraft } = useApp();
  const [draft, setDraft] = useState(() => pointProposalDraft ?? initialCollectionProposal());
  const [sheet, setSheet] = useState<'pin' | 'preview' | 'saved' | null>(null);
  const [pin, setPin] = useState({ x: 50, y: 35 });
  const pinWidth = useRef(380);
  const [error, setError] = useState('');
  const update = (patch: Partial<CollectionProposalDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setError('');
  };
  const save = () => {
    setPointProposalDraft({ ...draft, materials: [...draft.materials], photos: [...draft.photos] });
    setSheet('saved');
  };
  const submit = () => {
    const messages = [
      draft.name.trim().length < 3 && 'Nhập tên điểm thu gom từ 3 ký tự',
      draft.address.trim().length < 6 && 'Nhập địa chỉ đầy đủ',
      !draft.materials.length && 'Chọn ít nhất một loại rác',
      !draft.photos.length && 'Thêm ít nhất một ảnh địa điểm',
      !draft.consent && 'Xác nhận thông tin đề xuất từ cộng đồng',
    ].filter(Boolean);
    setError(messages.length ? `${messages.join('. ')}.` : '');
    if (!messages.length) setSheet('preview');
  };
  return (
    <CollectionPage
      title="Đề xuất điểm thu gom mới"
      source={a}
      footer={
        <>
          <CollectionAction title="Gửi đề xuất để xét duyệt" onPress={submit} />
          <Pressable accessibilityRole="button" onPress={save} style={{ alignItems: 'center' }}>
            <T weight="semibold" color={c.brand}>
              Lưu bản nháp
            </T>
          </Pressable>
        </>
      }
    >
      <CollectionInfo
        source={a.imgInfo}
        title="Cùng mở rộng bản đồ xanh"
        detail="Điểm bạn đề xuất chỉ xuất hiện công khai sau khi được đội ngũ xem xét."
      />
      <View style={{ gap: 12 }}>
        <T size={16} weight="semibold">
          Thông tin địa điểm
        </T>
        <CollectionField
          label="Tên điểm thu gom *"
          value={draft.name}
          onChangeText={(name) => update({ name })}
        />
        <CollectionField
          label="Địa chỉ *"
          value={draft.address}
          onChangeText={(address) => update({ address })}
          trailing={a.imgMapPin}
        />
        <View
          style={{
            height: 130,
            borderRadius: 16,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Artwork
            source={a.imgXemTrcBnD}
            width={380}
            height={130}
            fit="cover"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          />
          {draft.pin ? (
            <Artwork
              source={a.imgMapPin1}
              width={32}
              style={{
                position: 'absolute',
                left: `${draft.pin.x}%`,
                top: `${draft.pin.y}%`,
                transform: [{ translateX: -16 }, { translateY: -32 }],
              }}
            />
          ) : (
            <Artwork source={a.imgMapPin1} width={32} />
          )}
          <View
            style={{ backgroundColor: '#FFFFFF', padding: 8, borderRadius: 10, maxWidth: '95%' }}
          >
            <T size={12} color="#075A9C">
              {draft.address.split(',')[0] || 'Vị trí đề xuất'}
            </T>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <T size={12} color={c.muted} style={{ flex: 1 }}>
            {draft.pin ? 'Đã chỉnh ghim trong bản nháp' : 'Ghim tại lối vào khu dân cư'}
          </T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chỉnh ghim"
            onPress={() => {
              setPin(draft.pin ?? { x: 50, y: 35 });
              setSheet('pin');
            }}
          >
            <T weight="semibold" color={c.brand}>
              Chỉnh ghim
            </T>
          </Pressable>
        </View>
      </View>
      <CollectionPhotoField
        title="Ảnh địa điểm *"
        detail="Chụp lối vào và khu vực nhận rác • tối đa 5 ảnh"
        camera={a.imgCamera}
        plus={a.imgPlus}
        photos={draft.photos}
        onChange={(photos) => update({ photos })}
      />
      <View style={{ gap: 12 }}>
        <T size={16} weight="semibold">
          Loại rác dự kiến tiếp nhận *
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {materials.map((material) => {
            const checked = draft.materials.includes(material);
            return (
              <Pressable
                key={material}
                accessibilityRole="checkbox"
                accessibilityLabel={material}
                accessibilityState={{ checked }}
                aria-checked={checked}
                onPress={() =>
                  update({
                    materials: checked
                      ? draft.materials.filter((value) => value !== material)
                      : [...draft.materials, material],
                  })
                }
                style={{
                  height: 40,
                  paddingHorizontal: 13,
                  borderWidth: 1,
                  borderColor: checked ? c.brand : c.border,
                  borderRadius: 24,
                  backgroundColor: checked ? c.soft : '#FFFFFF',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {checked ? <Artwork source={a.imgCheck} width={14} /> : null}
                <T weight="medium" color={checked ? c.brand : c.muted}>
                  {material}
                </T>
              </Pressable>
            );
          })}
        </View>
      </View>
      <CollectionField
        label="Giờ tiếp nhận (nếu biết)"
        value={draft.hours}
        onChangeText={(hours) => update({ hours })}
        trailing={a.imgClock}
      />
      <CollectionCheckRow
        label={consentLabel}
        checked={draft.consent}
        source={a.imgCheck1}
        onPress={() => update({ consent: !draft.consent })}
      />
      {error ? (
        <T accessibilityRole="alert" color="#B42318">
          {error}
        </T>
      ) : null}
      {sheet === 'pin' ? (
        <CollectionSheet title="Chỉnh ghim địa điểm" onClose={() => setSheet(null)}>
          <T size={12} color={c.muted}>
            Chạm vào bản đồ mẫu để đặt ghim trong bản nháp. Ứng dụng chưa xác minh tọa độ thực tế.
          </T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đặt ghim trên bản đồ mẫu"
            onLayout={(event) => {
              pinWidth.current = event.nativeEvent.layout.width;
            }}
            onPress={(event) =>
              setPin({
                x: Math.max(
                  5,
                  Math.min(95, (event.nativeEvent.locationX / pinWidth.current) * 100),
                ),
                y: Math.max(15, Math.min(90, (event.nativeEvent.locationY / 220) * 100)),
              })
            }
            style={{ height: 220, borderRadius: 16, overflow: 'hidden' }}
          >
            <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
              <Artwork
                source={a.imgXemTrcBnD}
                width={380}
                height={220}
                fit="cover"
                style={{ width: '100%', height: '100%' }}
              />
              <Artwork
                source={a.imgMapPin1}
                width={32}
                style={{
                  position: 'absolute',
                  left: `${pin.x}%`,
                  top: `${pin.y}%`,
                  transform: [{ translateX: -16 }, { translateY: -32 }],
                }}
              />
            </View>
          </Pressable>
          <CollectionAction
            title="Lưu vị trí ghim"
            onPress={() => {
              update({ pin });
              setSheet(null);
            }}
          />
        </CollectionSheet>
      ) : null}
      {sheet === 'preview' ? (
        <CollectionSheet title="Xem trước đề xuất" onClose={() => setSheet(null)}>
          <T weight="semibold">{draft.name}</T>
          <T>{draft.address}</T>
          <T>{draft.materials.join(' · ')}</T>
          <T>{draft.hours || 'Chưa rõ giờ tiếp nhận'}</T>
          <T>{draft.photos.length} ảnh địa điểm</T>
          <T size={12} color={c.muted}>
            Chưa gửi tới hệ thống. Ứng dụng chưa kết nối dịch vụ xét duyệt đề xuất.
          </T>
          <CollectionAction title="Lưu bản nháp trong phiên" onPress={save} />
        </CollectionSheet>
      ) : null}
      {sheet === 'saved' ? (
        <CollectionSheet title="Đã lưu bản nháp" onClose={() => setSheet(null)}>
          <T>
            Bản nháp được giữ trong phiên hiện tại, chưa gửi hoặc xuất hiện công khai. Tải lại ứng
            dụng sẽ xóa dữ liệu phiên.
          </T>
          <CollectionAction title="Xong" onPress={() => setSheet(null)} />
        </CollectionSheet>
      ) : null}
    </CollectionPage>
  );
}
