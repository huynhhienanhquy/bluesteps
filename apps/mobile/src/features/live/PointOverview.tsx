import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Artwork } from '../../design-system/DesignScreen';
import { Label, Notice } from '../../design-system/ui';
import { useApp } from '../../providers';
import { errorMessage, type Schemas } from '../../services/api';
import { handoverMaterials } from './journey-materials';
import { pointCapacityLabel } from './collection-point-status';
import { pointWebsite } from './point-website';

const art = {
  clock: require('../../../assets/figma/386-10186/imgGroup36772.svg'),
  capacity: require('../../../assets/figma/386-10186/imgRectangle925.png'),
  call: require('../../../assets/figma/386-10186/imgVector31.svg'),
  report: require('../../../assets/figma/386-10186/imgAlertCircle.svg'),
};

export function PointOverview({
  point,
  carried,
  onReport,
}: {
  point: Schemas['CollectionPoint'];
  carried: string[];
  onReport: () => void;
}) {
  const { colors } = useApp();
  const [error, setError] = useState('');
  const accepted = handoverMaterials(point.materials, carried);
  const rawPhone = point.contactPhone?.trim();
  const phone =
    rawPhone && /^\+?[\d ()-]{6,24}$/.test(rawPhone) ? rawPhone.replace(/[ ()-]/g, '') : null;
  const website = pointWebsite(point.websiteUrl);
  const openLabel =
    point.openNow == null ? 'Chưa rõ giờ mở cửa' : point.openNow ? 'Mở cửa' : 'Ngoài giờ tiếp nhận';
  const openUrl = (url: string) => {
    setError('');
    void Linking.openURL(url).catch((cause) => setError(errorMessage(cause)));
  };
  return (
    <View style={{ gap: 12 }}>
      <Label size={14}>
        {carried.length ? 'Các loại rác bạn đã chọn' : 'Thông tin điểm thu gom'}
      </Label>
      {carried.length ? (
        <Notice tone={accepted.length === carried.length ? 'success' : 'warning'}>
          Điểm này nhận {accepted.length}/{carried.length} loại rác bạn đã chọn
          {accepted.length ? ` · ${accepted.map((item) => item.name).join(', ')}` : ''}.
        </Notice>
      ) : null}
      <View style={{ borderRadius: 30, overflow: 'hidden', gap: 5 }}>
        <View style={[styles.row, { backgroundColor: colors.surface }]}>
          <Artwork source={art.clock} width={22} />
          <Label
            size={14}
            bold
            color={point.openNow === false ? colors.muted : colors.brand}
            style={{ flexShrink: 1 }}
          >
            {openLabel}
          </Label>
          <Label size={14} style={{ flex: 1, lineHeight: 20 }}>
            {point.alwaysOpen ? 'Mở cửa suốt ngày' : point.hours || 'Chưa công bố lịch tiếp nhận'}
          </Label>
        </View>
        <View style={[styles.row, { backgroundColor: colors.surface }]}>
          <Artwork source={art.capacity} width={21} height={20} />
          <Label size={14} color={colors.muted}>
            Tình trạng
          </Label>
          <Label size={14} bold color={colors.brand} style={{ flex: 1 }}>
            {pointCapacityLabel(point.capacityState)}
          </Label>
        </View>
        {website ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Mở website ${new URL(website).hostname}`}
            onPress={() => openUrl(website)}
            style={[styles.row, { backgroundColor: colors.surface }]}
          >
            <Artwork source={art.capacity} width={18} height={20} />
            <Label size={14} style={{ flex: 1 }}>
              {new URL(website).hostname}
            </Label>
          </Pressable>
        ) : null}
        {phone ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Gọi điểm thu gom ${rawPhone}`}
            onPress={() => openUrl('tel:' + phone)}
            style={[styles.row, { backgroundColor: colors.surface }]}
          >
            <Artwork source={art.call} width={20} height={20} />
            <Label size={14} style={{ flex: 1 }}>
              {rawPhone}
            </Label>
          </Pressable>
        ) : null}
      </View>
      {point.staffed != null ? (
        <Label size={13} color={colors.muted}>
          {point.staffed ? 'Có nhân viên hỗ trợ' : 'Không có nhân viên hỗ trợ'}
        </Label>
      ) : null}
      {point.entranceLabel ? <Label size={13}>Lối vào · {point.entranceLabel}</Label> : null}
      {point.handoverInstructions ? (
        <Label size={13} style={{ lineHeight: 20 }}>
          {point.handoverInstructions}
        </Label>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Báo cáo vấn đề tại điểm thu gom"
        onPress={onReport}
        style={{
          minHeight: 44,
          borderRadius: 22,
          backgroundColor: colors.surface,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: 12,
          boxShadow: '0px 4px 6px rgba(0,0,0,0.1)',
        }}
      >
        <Artwork source={art.report} width={18} />
        <Label size={14} weight="semibold" color={colors.brand}>
          Báo cáo vấn đề
        </Label>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 41,
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
