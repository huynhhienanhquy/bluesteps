import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useApp } from '../../providers';
import { Artwork } from '../../design-system/DesignScreen';
import { collectionNavigationAssets } from '../../design-system/collection-navigation-assets';
import { designPoints, findCollectionPoint } from '../../services/collection';
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
const a = collectionNavigationAssets['534:48690'];
const issues = [
  'Thùng rác đã đầy',
  'Vị trí trên bản đồ chưa đúng',
  'Không tiếp nhận loại rác đã công bố',
  'Điểm đóng cửa hoặc ngừng hoạt động',
  'Vấn đề khác',
];

export function CollectionReportScreen() {
  const { point: param } = useLocalSearchParams<{ point?: string }>();
  const { selectedPoint } = useApp();
  const point = findCollectionPoint(param ?? selectedPoint) ?? designPoints[0]!;
  const [selected, setSelected] = useState([issues[0]!]);
  const [detail, setDetail] = useState(
    'Thùng nhựa ở cổng chính đã đầy, chưa thể bỏ thêm chai. Tôi đến lúc 09:30 hôm nay.',
  );
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  return (
    <CollectionPage
      title="Báo cáo vấn đề"
      source={a}
      footer={
        <CollectionAction
          title="Gửi báo cáo"
          onPress={() => {
            const message = !selected.length
              ? 'Chọn ít nhất một vấn đề để báo cáo.'
              : detail.trim() && detail.trim().length < 10
                ? 'Mô tả thêm cần ít nhất 10 ký tự hoặc để trống.'
                : '';
            setError(message);
            setPreview(!message);
          }}
        />
      }
    >
      <View
        style={{
          padding: 15,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 20,
          flexDirection: 'row',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <Artwork
          source={a.imgNhMinhHa}
          width={80}
          height={80}
          fit="cover"
          style={{ borderRadius: 16 }}
        />
        <View style={{ flex: 1, gap: 6 }}>
          <T size={16} weight="semibold">
            {point.name}
          </T>
          <T size={12} color={c.muted}>
            {point.id === 'green-hub' ? '460 Trần Đại Nghĩa, Ngũ Hành Sơn, Đà Nẵng' : point.address}
          </T>
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <T size={16} weight="semibold">
          Bạn gặp vấn đề gì?
        </T>
        <T size={12} color={c.muted}>
          Chọn tất cả vấn đề phù hợp
        </T>
        <View
          style={{ padding: 15, borderWidth: 1, borderColor: c.border, borderRadius: 20, gap: 10 }}
        >
          {issues.map((issue) => (
            <CollectionCheckRow
              key={issue}
              label={issue}
              checked={selected.includes(issue)}
              source={a.imgCheck}
              onPress={() => {
                setSelected((current) =>
                  current.includes(issue)
                    ? current.filter((value) => value !== issue)
                    : [...current, issue],
                );
                setError('');
              }}
            />
          ))}
        </View>
      </View>
      <CollectionPhotoField
        title="Thêm ảnh hiện trạng"
        detail="Ảnh chụp rõ thùng rác sẽ giúp xử lý nhanh hơn"
        camera={a.imgCamera}
        plus={a.imgPlus}
        photos={photos}
        onChange={setPhotos}
      />
      <CollectionField
        label="Mô tả thêm"
        value={detail}
        onChangeText={(value) => {
          setDetail(value);
          setError('');
        }}
        multiline
      />
      <CollectionInfo
        source={a.imgInfo}
        title="Cảm ơn bạn đã chia sẻ"
        detail="Báo cáo sẽ được xem xét trước khi cập nhật. Không để lại rác bên ngoài thùng."
      />
      {error ? (
        <T accessibilityRole="alert" color="#B42318">
          {error}
        </T>
      ) : null}
      {preview ? (
        <CollectionSheet title="Xem trước báo cáo" onClose={() => setPreview(false)}>
          <T weight="semibold">{point.name}</T>
          <T>{selected.join(' · ')}</T>
          <T>{detail.trim() || 'Không có mô tả thêm.'}</T>
          <T>{photos.length} ảnh hiện trạng</T>
          <T size={12} color={c.muted}>
            Chưa gửi tới hệ thống. Ứng dụng chưa kết nối dịch vụ tiếp nhận và xử lý báo cáo.
          </T>
          <CollectionAction title="Xong" onPress={() => setPreview(false)} />
        </CollectionSheet>
      ) : null}
    </CollectionPage>
  );
}
