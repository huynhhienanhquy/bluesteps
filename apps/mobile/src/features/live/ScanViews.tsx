import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import { PrivateModal as Modal } from './PrivateModal';
import { router } from 'expo-router';
import { Artwork, StatusSpace } from '../../design-system/DesignScreen';
import { Button, Card, Field, Icon, Label, Notice, Typography } from '../../design-system/ui';
import { useApp } from '../../providers';
import type { Schemas } from '../../services/api';
import { RequireAuth } from './common';
import { CurvedNavigation } from './DesignParts';
import { CollectionMaterialLink } from './CollectionMaterialLink';

const art = {
  leaf: require('../../../assets/images/scan/leaf.png'),
  gradient: require('../../../assets/images/scan/gradient.svg'),
};
export type SelectedPhoto = { uri: string; inputKind: 'camera' | 'library'; imageId: string };

export function ScanPhotoResult({
  photo,
  prediction,
  recognize,
  error,
  pending,
  back,
  details,
  pick,
  retry,
}: {
  photo: SelectedPhoto;
  prediction: Schemas['ScanPrediction'] | null;
  recognize: () => void;
  error: string;
  pending: boolean;
  back: () => void;
  details: () => void;
  pick: () => void;
  retry: () => void;
}) {
  const [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  return (
    <Typography.Provider value="inter">
      <View style={{ flex: 1, backgroundColor: '#147CC1' }}>
        <View style={{ backgroundColor: '#147CC1' }}>
          <StatusSpace />
        </View>
        <View style={{ flex: 1, backgroundColor: '#202D36' }}>
          <Image
            source={{ uri: photo.uri }}
            accessibilityLabel="Ảnh đã chọn"
            style={{ position: 'absolute', width: '100%', height: '100%' }}
            resizeMode="cover"
            onLoad={() => {
              setLoading(false);
              setFailed(false);
              recognize();
            }}
            onError={() => {
              setLoading(false);
              setFailed(true);
            }}
          />
          <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
            <View
              style={{
                position: 'absolute',
                top: 0,
                height: '14%',
                width: '100%',
                backgroundColor: '#0006',
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                height: '14%',
                width: '100%',
                backgroundColor: '#0006',
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: '14%',
                bottom: '14%',
                left: 0,
                width: '25%',
                backgroundColor: '#0006',
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: '14%',
                bottom: '14%',
                right: 0,
                width: '25%',
                backgroundColor: '#0006',
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: '14%',
                bottom: '14%',
                left: '25%',
                right: '25%',
                borderWidth: 1,
                borderColor: '#FFFFFF',
              }}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            disabled={pending}
            onPress={back}
            style={{ position: 'absolute', left: 14, top: 12, padding: 10 }}
          >
            <Icon name="arrow-back" color="#FFFFFF" size={26} />
          </Pressable>
          {!!error && (
            <View style={{ position: 'absolute', top: 16, left: 64, right: 16 }}>
              <Notice tone="error">{error}</Notice>
            </View>
          )}
          {loading || pending ? (
            <View
              accessibilityLiveRegion="polite"
              style={{
                position: 'absolute',
                top: '30%',
                left: 24,
                right: 24,
                alignItems: 'center',
                gap: 12,
              }}
            >
              <ActivityIndicator color="#FFFFFF" size="large" />
              <Label bold color="#FFFFFF">
                {loading ? 'Đang mở ảnh…' : 'Đang nhận diện rác…'}
              </Label>
            </View>
          ) : failed ? (
            <View style={{ position: 'absolute', top: '30%', left: 24, right: 24 }}>
              <Card style={{ borderRadius: 20, padding: 24 }}>
                <Label size={20} bold heading>
                  Không mở được ảnh
                </Label>
                <Label>Ảnh chưa đọc được. Vui lòng chụp lại hoặc chọn ảnh khác.</Label>
                <Button title="Quét lại" onPress={retry} />
                <Button
                  title="Sổ tay rác"
                  variant="secondary"
                  onPress={() => router.push('/handbook')}
                />
              </Card>
            </View>
          ) : !prediction ? (
            <View style={{ position: 'absolute', top: '34%', left: 24, right: 24 }}>
              <Card>
                <Label bold>Chưa nhận diện được ảnh</Label>
                <Button title="Thử nhận diện lại" onPress={recognize} />
                <Button
                  title="Sổ tay rác"
                  variant="secondary"
                  onPress={() => router.push('/handbook')}
                />
              </Card>
            </View>
          ) : prediction.status === 'unrecognized' ? (
            <View style={{ position: 'absolute', top: '34%', left: 24, right: 24 }}>
              <Card>
                <Label bold>Chưa đủ độ tin cậy</Label>
                <Label>
                  Dự đoán: {prediction.resultLabel} ({(prediction.confidence * 100).toFixed(1)}%).
                  Hãy chụp rõ một vật phẩm hoặc tra cứu thủ công.
                </Label>
                <Button title="Sổ tay rác" onPress={() => router.push('/handbook')} />
              </Card>
            </View>
          ) : !acknowledged ? (
            <View
              style={{
                position: 'absolute',
                left: '18%',
                right: '18%',
                top: '38%',
                borderRadius: 24,
                backgroundColor: '#EEF9FE',
                padding: 24,
                alignItems: 'center',
                gap: 16,
              }}
            >
              <Icon name="checkmark-circle" color="#72B0CF" size={54} />
              <Label size={18} bold heading>
                Quét thành công!
              </Label>
              <Button title="Xem kết quả" onPress={() => setAcknowledged(true)} />
            </View>
          ) : (
            <View
              accessibilityLiveRegion="polite"
              style={{ position: 'absolute', left: '14%', right: '14%', bottom: '18%', gap: 30 }}
            >
              <View
                style={{
                  borderRadius: 16,
                  backgroundColor: '#FFFFFF',
                  padding: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 20,
                }}
              >
                <Icon name={prediction.resultItem?.icon ?? 'scan-outline'} size={54} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Label size={14} color="#8C8686">
                    Kết quả
                  </Label>
                  <Label size={20} bold color="#515152" heading>
                    {prediction.resultLabel}
                  </Label>
                  <Label size={12}>Độ tin cậy: {(prediction.confidence * 100).toFixed(1)}%</Label>
                </View>
              </View>
              <Button title="Chi tiết" onPress={details} />
            </View>
          )}
          <View
            style={{
              position: 'absolute',
              bottom: 20,
              left: 20,
              right: 20,
              flexDirection: 'row',
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Button title="Chọn ảnh khác" variant="secondary" pending={pending} onPress={pick} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Chụp lại" disabled={pending} onPress={retry} />
            </View>
          </View>
        </View>
        <View style={{ height: 24 }} />
      </View>
    </Typography.Provider>
  );
}

export function ScanDetails({
  scan,
  prediction,
  pending,
  error,
  weight,
  setWeight,
  login,
  confirm,
  reset,
  back,
  receipt,
  closeReceipt,
  openReceipt,
}: {
  scan: Schemas['ScanResult'] | null | undefined;
  prediction: Schemas['ScanPrediction'] | null;
  pending: boolean;
  error: string;
  weight: string;
  setWeight: (value: string) => void;
  login: () => void;
  confirm: () => void;
  reset: () => void;
  back: () => void;
  receipt: Schemas['SortingResponse'] | null;
  closeReceipt: () => void;
  openReceipt: () => void;
}) {
  const { colors, status } = useApp(),
    { width, height } = useWindowDimensions();
  const [confirmation, setConfirmation] = useState(false);
  const result = scan ?? prediction;
  const item = result?.resultItem;
  const close = () => {
    if (!pending) setConfirmation(false);
  };
  return (
    <Typography.Provider value="inter">
      <View style={{ flex: 1, backgroundColor: '#D8EDF8' }}>
        <Artwork
          source={art.gradient}
          width={Math.min(428, width)}
          height={height}
          fit="fill"
          style={{ position: 'absolute', top: 0, left: 0 }}
        />
        <View style={{ backgroundColor: '#147CC1' }}>
          <StatusSpace />
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 14,
            paddingTop: 8,
            paddingBottom: 24,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            disabled={pending}
            onPress={back}
            style={{ padding: 8 }}
          >
            <Icon name="chevron-back" color="#FFFFFF" size={26} />
          </Pressable>
          <Label size={28} bold color="#FFFFFF" heading style={{ flex: 1 }}>
            Kết quả quét rác
          </Label>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 150, gap: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              marginHorizontal: 16,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 24,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#3E8DB7',
              backgroundColor: '#FFFFFF',
            }}
          >
            <Icon name={item?.icon ?? 'scan-outline'} size={54} />
            <View style={{ flex: 1, gap: 8 }}>
              <Label size={20} bold color="#515152">
                {result?.resultLabel ?? 'Chưa có kết quả nhận diện'}
              </Label>
              <Label size={16} bold color="#515152">
                {item?.category ?? 'Tra cứu sổ tay để xem hướng dẫn'}
              </Label>
              {result?.confidence != null && (
                <Label size={12}>Độ tin cậy: {(result.confidence * 100).toFixed(1)}%</Label>
              )}
            </View>
          </View>
          <View style={{ gap: 24, paddingTop: 10 }}>
            <Card
              style={{ borderRadius: 20, backgroundColor: '#EAF6FCDD', borderColor: '#ABBCC4' }}
            >
              <Label size={14}>
                Kết quả gợi ý nhóm vật liệu từ ảnh. Hãy kiểm tra lại vật phẩm trước khi phân loại.
              </Label>
            </Card>
            {(item?.steps ?? []).map((step, index) => (
              <Card
                key={index}
                style={{ borderRadius: 20, backgroundColor: '#EAF6FCDD', borderColor: '#ABBCC4' }}
              >
                <Label size={14}>
                  {index + 1}. {step}
                </Label>
              </Card>
            ))}
          </View>
          {item ? (
            <CollectionMaterialLink material={item.material} />
          ) : (
            <Notice>
              Chưa có mục sổ tay được công bố cho kết quả này. Bạn có thể tra cứu thủ công; chưa ghi
              nhận điểm.
            </Notice>
          )}
          <Button
            title="Sổ tay rác"
            variant="secondary"
            onPress={() =>
              item
                ? router.push({ pathname: '/handbook/[id]', params: { id: item.id } })
                : router.push('/handbook')
            }
          />
          {status === 'guest' ? (
            <Button title="Đăng nhập để ghi nhận phân loại" onPress={login} />
          ) : (
            <RequireAuth>
              {scan?.confirmation ? (
                <>
                  <Notice tone="success">Lần quét này đã được xác nhận.</Notice>
                  <Button title="Xem kết quả nhận điểm" onPress={openReceipt} />
                </>
              ) : (
                <Button
                  title="Tích điểm xanh"
                  pending={pending}
                  disabled={!item || result?.status !== 'completed'}
                  onPress={() => setConfirmation(true)}
                />
              )}
            </RequireAuth>
          )}
          {!!error && <Notice tone="error">{error}</Notice>}
          <Button title="Quét lại" variant="quiet" disabled={pending} onPress={reset} />
        </ScrollView>
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <CurvedNavigation selected="scan" />
        </View>
        <Modal
          transparent
          animationType="none"
          visible={confirmation && !receipt && !scan?.confirmation}
          onRequestClose={close}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: '#0005',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <ScrollView
              style={{
                width: '100%',
                maxWidth: 360,
                maxHeight: '90%',
                flexGrow: 0,
                borderRadius: 32,
                backgroundColor: colors.surface,
              }}
              contentContainerStyle={{ padding: 24, gap: 16 }}
              keyboardShouldPersistTaps="handled"
            >
              <Label size={22} bold heading>
                Xác nhận phân loại
              </Label>
              <Label>
                Chỉ xác nhận sau khi bạn đã xử lý {result?.resultLabel.toLocaleLowerCase('vi-VN')}{' '}
                theo hướng dẫn. Ảnh được gửi tới máy chủ để nhận diện và không được lưu lại.
              </Label>
              <Field
                label="Khối lượng đã cân (kg, không bắt buộc)"
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                editable={!pending}
              />
              <Label size={11}>Khối lượng tự ghi nhận; chỉ nhập khi bạn đã cân.</Label>
              {!!error && <Notice tone="error">{error}</Notice>}
              <Button title="Xác nhận đã phân loại" pending={pending} onPress={confirm} />
              <Button title="Để sau" disabled={pending} variant="quiet" onPress={close} />
            </ScrollView>
          </View>
        </Modal>
        <Modal transparent animationType="none" visible={!!receipt} onRequestClose={closeReceipt}>
          <View
            style={{
              flex: 1,
              backgroundColor: '#617D8B66',
              padding: 36,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: '100%',
                maxWidth: 360,
                borderRadius: 48,
                backgroundColor: '#EEF9FE',
                padding: 24,
                gap: 20,
                alignItems: 'center',
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng kết quả nhận điểm"
                onPress={closeReceipt}
                style={{ alignSelf: 'flex-end', padding: 4 }}
              >
                <Icon name="close-circle-outline" size={24} />
              </Pressable>
              <Label size={20} bold heading style={{ textAlign: 'center' }}>
                {Number(receipt?.award.points) > 0 ? 'CHÚC MỪNG' : 'ĐÃ LƯU PHÂN LOẠI'}
              </Label>
              <Label style={{ textAlign: 'center' }}>
                Bạn đã xác nhận phân loại {result?.resultLabel.toLocaleLowerCase('vi-VN')}.
              </Label>
              <Artwork source={art.leaf} width={104} height={104} />
              <Label size={18}>Bạn nhận được {receipt?.award.points ?? '0'} điểm</Label>
              {receipt?.award.reason === 'DAILY_LIMIT_REACHED' ? (
                <Label size={12}>Đã đạt giới hạn nhận điểm hôm nay.</Label>
              ) : null}
              <Label size={12}>Số dư sau ghi nhận: {receipt?.walletBalance} điểm</Label>
              <View style={{ width: '100%', gap: 12 }}>
                <Button
                  title="Đi đến trang tích điểm để đổi quà"
                  onPress={() => {
                    closeReceipt();
                    router.push('/rewards');
                  }}
                />
                <Button
                  title="Trở về trang chủ"
                  variant="secondary"
                  onPress={() => {
                    closeReceipt();
                    router.replace('/');
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Typography.Provider>
  );
}
