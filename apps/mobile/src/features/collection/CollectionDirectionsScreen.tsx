import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../providers';
import { Artwork } from '../../design-system/DesignScreen';
import { LegacyCanvas } from '../../design-system/LegacyCanvas';
import { LegacyNavigation } from '../../design-system/LegacyNavigation';
import { collectionNavigationAssets } from '../../design-system/collection-navigation-assets';
import { designPoints, findCollectionPoint } from '../../services/collection';
import {
  CollectionAction,
  CollectionSheet,
  CollectionText as T,
  collectionColors as c,
} from './CollectionPage';
import { CollectionMapStatus } from './CollectionMapParts';
const a = collectionNavigationAssets['386:10279'];

export function CollectionDirectionsScreen() {
  const { point: param } = useLocalSearchParams<{ point?: string }>();
  const { selectedPoint, setSelectedPoint } = useApp();
  const [destination, setDestination] = useState(param ?? selectedPoint);
  const point = findCollectionPoint(destination) ?? designPoints[0]!;
  const [sheet, setSheet] = useState<'origin' | 'destination' | 'options' | 'start' | null>(null);
  const [origin, setOrigin] = useState('');
  const [draft, setDraft] = useState('');
  const [reversed, setReversed] = useState(false);
  const image = (source: number, x: number, y: number, w: number, h = w) => (
    <Artwork
      source={source}
      width={w}
      height={h}
      style={{ position: 'absolute', left: x, top: y }}
    />
  );
  const journey = () => {
    setSelectedPoint(point.id);
    router.push(`/journey?point=${point.id}`);
  };
  return (
    <LegacyCanvas statusHeight={50}>
      <Artwork
        source={a.imgMap}
        width={438.786}
        height={926}
        fit="fill"
        style={{ position: 'absolute', left: -5.05, top: 1.667 }}
      />
      <CollectionMapStatus />
      <View
        style={{
          position: 'absolute',
          left: 31,
          top: 67,
          width: 377,
          height: 108,
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: '#DADADA',
          borderRadius: 30,
          boxShadow: '0px 4px 4px rgba(0,0,0,.25)',
        }}
      />
      {image(a.imgGroup36931, 54, 88, 18)}
      {[112, 120, 128].map((y, index) => (
        <View
          key={y}
          style={{
            position: 'absolute',
            left: 62,
            top: y,
            width: 3,
            height: 3,
            borderRadius: 2,
            backgroundColor: index === 1 ? '#9E9E9E' : '#DADADA',
          }}
        />
      ))}
      {image(a.imgGroup36827, 56, 138, 15.126, 20)}
      <View
        style={{
          position: 'absolute',
          left: 87,
          top: 119,
          width: 248,
          height: 1,
          backgroundColor: '#DADADA',
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đổi vị trí khởi hành"
        onPress={() => {
          setDraft(origin);
          setSheet('origin');
        }}
        style={{
          position: 'absolute',
          left: 87,
          top: 83,
          width: 248,
          height: 30,
          justifyContent: 'center',
        }}
      >
        <T size={16} lineHeight={19} color="#000000" numberOfLines={1}>
          {reversed ? point.name : origin || 'Vị trí hiện tại của bạn'}
        </T>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đổi điểm đến"
        onPress={() => setSheet('destination')}
        style={{
          position: 'absolute',
          left: 87,
          top: 132,
          width: 248,
          height: 30,
          justifyContent: 'center',
        }}
      >
        <T size={16} lineHeight={19} color="#000000" numberOfLines={1}>
          {reversed ? origin || 'Vị trí hiện tại của bạn' : point.name}
        </T>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tùy chọn tuyến đường"
        onPress={() => setSheet('options')}
        hitSlop={12}
        style={{
          position: 'absolute',
          left: 365,
          top: 80,
          width: 20,
          height: 36,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Artwork source={a.imgGroup36932} width={5} height={21} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đảo chiều tuyến đường"
        onPress={() => setReversed(!reversed)}
        hitSlop={12}
        style={{ position: 'absolute', left: 365, top: 136, width: 19, height: 20 }}
      >
        <Artwork source={a.imgArrowSwitchHorizontal} width={19} height={20} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Lập hành trình nhiều điểm"
        onPress={journey}
        style={{
          position: 'absolute',
          left: 20,
          top: 645,
          width: 380,
          height: 44,
          paddingHorizontal: 11,
          paddingVertical: 7,
          backgroundColor: '#F4FBFF',
          borderWidth: 1,
          borderColor: '#D2E2F8',
          borderRadius: 20,
          flexDirection: 'row',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <Artwork source={a.imgPlus4} width={16} />
        <T weight="semibold" color={c.brand} style={{ flex: 1 }}>
          Lập hành trình nhiều điểm
        </T>
        <Artwork
          source={require('../../../assets/figma/common/collection-chevron.svg')}
          width={24}
        />
      </Pressable>
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 698,
          width: 428,
          height: 228,
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: 35,
          borderTopRightRadius: 35,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 184,
          top: 702,
          width: 60,
          height: 3,
          backgroundColor: '#898989',
        }}
      />
      <T
        accessibilityRole="header"
        size={24}
        weight="semibold"
        lineHeight={29}
        color="#000000"
        style={{ position: 'absolute', left: 20, top: 717 }}
      >
        Lái xe
      </T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Xem các chặng"
        onPress={() => router.push(`/collection-route?point=${point.id}`)}
        style={{ position: 'absolute', left: 324, top: 716 }}
      >
        <Artwork source={a.imgGroup36938} width={29} height={30} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đóng chỉ đường"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/collection'))}
        style={{ position: 'absolute', left: 369, top: 716 }}
      >
        <Artwork source={a.imgGroup36937} width={29} height={30} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Bắt đầu"
        onPress={() => setSheet('start')}
        style={{
          position: 'absolute',
          left: 20,
          top: 761,
          width: 110,
          height: 35,
          borderRadius: 20,
          backgroundColor: c.brand,
          flexDirection: 'row',
          gap: 8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Artwork source={a.imgIcon1} width={12} height={14} />
        <T size={15} weight="medium" color="#FFFFFF" lineHeight={18}>
          Bắt đầu
        </T>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Thêm điểm dừng"
        onPress={journey}
        style={{
          position: 'absolute',
          left: 144,
          top: 761,
          width: 164,
          height: 35,
          borderRadius: 20,
          backgroundColor: '#DCEEF9',
          flexDirection: 'row',
          gap: 6,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Artwork source={a.imgIcon} width={12} height={16} />
        <T weight="medium" color="#366B87" lineHeight={17}>
          Thêm điểm dừng
        </T>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Chia sẻ tuyến đường"
        onPress={() => setSheet('options')}
        style={{
          position: 'absolute',
          left: 325,
          top: 761,
          width: 114,
          height: 35,
          borderRadius: 20,
          backgroundColor: '#DCEEF9',
          flexDirection: 'row',
          gap: 6,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Artwork source={a.imgVector} width={18} />
        <T weight="medium" color="#366B87" lineHeight={17}>
          Chia sẻ
        </T>
      </Pressable>
      <LegacyNavigation selected="collection" handbook />
      {sheet === 'origin' ? (
        <CollectionSheet title="Đổi vị trí khởi hành" onClose={() => setSheet(null)}>
          <TextInput
            accessibilityLabel="Địa điểm khởi hành"
            value={draft}
            onChangeText={setDraft}
            placeholder="Nhập địa điểm khởi hành"
            style={{
              minHeight: 48,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 14,
              padding: 12,
              fontFamily: 'BackupInter_400Regular',
              color: c.ink,
            }}
          />
          <CollectionAction
            title="Lưu vị trí khởi hành"
            onPress={() => {
              setOrigin(draft.trim());
              setSheet(null);
            }}
          />
          <T size={12} color={c.muted}>
            Địa chỉ chỉ lưu trong phiên mẫu; chưa tra cứu tọa độ.
          </T>
        </CollectionSheet>
      ) : null}
      {sheet === 'destination' ? (
        <CollectionSheet title="Chọn điểm đến" onClose={() => setSheet(null)}>
          {designPoints.map((item) => (
            <CollectionAction
              key={item.id}
              title={item.name}
              onPress={() => {
                setDestination(item.id);
                setSelectedPoint(item.id);
                setSheet(null);
              }}
            />
          ))}
        </CollectionSheet>
      ) : null}
      {sheet === 'options' || sheet === 'start' ? (
        <CollectionSheet
          title={sheet === 'start' ? 'Tuyến đường minh họa' : 'Tùy chọn tuyến đường'}
          onClose={() => setSheet(null)}
        >
          <T>Bản đồ là tuyến mẫu trong thiết kế, chưa có GPS hoặc dẫn đường trực tiếp.</T>
          <CollectionAction
            title="Xem chỉ đường mẫu"
            onPress={() => {
              setSheet(null);
              router.push(`/collection-navigation?point=${point.id}`);
            }}
          />
          <CollectionAction
            title="Lập hành trình nhiều điểm"
            onPress={() => {
              setSheet(null);
              journey();
            }}
          />
          <CollectionAction
            title="Xem điểm đến"
            onPress={() => {
              setSheet(null);
              router.push(`/points/${point.id}`);
            }}
          />
        </CollectionSheet>
      ) : null}
    </LegacyCanvas>
  );
}
