import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Empty, Icon, Label, Notice, Row, Screen } from '../../design-system/ui';
import { Artwork } from '../../design-system/DesignScreen';
import { wasteItems } from '../../services/fixtures';
import { handbookCards } from './handbook-cards';
import { handbookListAssets } from '../../design-system/handbook-list-assets';
import { HandbookGuide, hasHandbookGuide } from './HandbookGuide';
export { HandbookLanding as HandbookScreen } from './HandbookLanding';
const otherMaterials: Record<string, number> = {
  medical: 5,
  tissue: 13,
  rubber: 15,
  ceramic: 16,
  bulb: 17,
  fluorescent: 18,
};
export function WasteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = wasteItems.find((item) => item.id === id);
  if (id && hasHandbookGuide(id)) return <HandbookGuide key={id} material={id} />;
  const sourceCard =
    id && otherMaterials[id] !== undefined ? handbookCards[otherMaterials[id]!] : undefined;
  if (!item && sourceCard)
    return (
      <Screen title={sourceCard.title.replace(/\s+/g, ' ').trim()} back>
        <Card style={{ alignItems: 'center', gap: 16 }}>
          {sourceCard.images
            .filter(
              (img) =>
                img.w > 20 && !['imgImage62', 'imgImage64', 'imgImage66'].includes(img.source),
            )
            .map((img, i) => (
              <Artwork
                key={i}
                source={handbookListAssets[img.source as keyof typeof handbookListAssets]}
                width={img.w * 2}
                height={img.h * 2}
              />
            ))}
          <Label>{sourceCard.category}</Label>
        </Card>
        <Notice>Chưa có hướng dẫn chi tiết cho vật liệu này.</Notice>
        <Button title="Tìm điểm thu gom" onPress={() => router.push('/collection')} />
      </Screen>
    );
  return (
    <Screen title={item?.name ?? 'Không tìm thấy'} back>
      {!item ? (
        <Empty title="Vật liệu không tồn tại" />
      ) : (
        <>
          <Card style={{ alignItems: 'center', padding: 28 }}>
            <Icon name={item.icon} size={72} />
            <Label bold size={24}>
              {item.name}
            </Label>
            <Label>
              {item.category} · {item.material}
            </Label>
          </Card>
          {item.hazardous ? (
            <Notice tone="warning">
              Vật liệu cần thu gom riêng. Không trộn với rác sinh hoạt.
            </Notice>
          ) : null}
          <Label size={20} bold>
            Chuẩn bị trước khi gửi
          </Label>
          {item.steps.map((step, i) => (
            <Row key={step} style={{ alignItems: 'flex-start' }}>
              <Label size={20} bold>
                {i + 1}.
              </Label>
              <View style={{ flex: 1 }}>
                <Label>{step}</Label>
              </View>
            </Row>
          ))}
          <Notice>
            Hướng dẫn minh họa · Đà Nẵng · 29/10/2026. Kiểm tra quy định thực tế với đơn vị thu gom;
            không áp dụng màu thùng như quy tắc chung.
          </Notice>
          <Button
            title="Tìm điểm thu gom"
            icon="location-outline"
            onPress={() => router.push('/collection')}
          />
        </>
      )}
    </Screen>
  );
}
