import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useApp } from '../../providers';
import { Artwork } from '../../design-system/DesignScreen';
import { LegacyCanvas } from '../../design-system/LegacyCanvas';
import { LegacyNavigation } from '../../design-system/LegacyNavigation';
import { collectionNavigationAssets } from '../../design-system/collection-navigation-assets';
import {
  CollectionAction,
  CollectionSheet,
  CollectionText as T,
  collectionColors as c,
} from './CollectionPage';
import { CollectionMapStatus } from './CollectionMapParts';
const a = collectionNavigationAssets['386:10351'];
const modes = [
  { label: 'Lái xe', minutes: 5, x: 21, underline: 24, textX: 42 },
  { label: 'Xe máy', minutes: 4, x: 126, underline: 126, textX: 153 },
  { label: 'Phương tiện công cộng', minutes: 9, x: 238, underline: 238, textX: 256 },
  { label: 'Đi bộ', minutes: 9, x: 341, underline: 341, textX: 364 },
];

export function CollectionRouteScreen() {
  const { point } = useLocalSearchParams<{ point?: string }>();
  const { selectedPoint } = useApp();
  const destination = point ?? selectedPoint;
  const [mode, setMode] = useState(0);
  const [departure, setDeparture] = useState('10:00');
  const [draft, setDraft] = useState(departure);
  const [avoid, setAvoid] = useState([false, false]);
  const [sheet, setSheet] = useState<'departure' | 'start' | 'share' | null>(null);
  const [copied, setCopied] = useState(false);
  const image = (source: number, x: number, y: number, w: number, h = w) => (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: x, top: y, width: w, height: h }}
    >
      <Artwork source={source} width={w} height={h} />
    </View>
  );
  const body = (
    text: string,
    x: number,
    y: number,
    width?: number,
    size = 16,
    color = '#4C4C4C',
  ) => (
    <T
      key={`${text}-${y}`}
      size={size}
      color={color}
      lineHeight={size === 13 ? 16 : size === 14 ? 17 : 19}
      style={{ position: 'absolute', left: x, top: y, width }}
    >
      {text}
    </T>
  );
  const journey = () => router.push(`/journey?point=${destination}`);
  return (
    <LegacyCanvas height={1050} statusHeight={50}>
      <Artwork
        source={a.imgMap}
        width={438.786}
        height={1050}
        fit="fill"
        style={{ position: 'absolute', left: -5.05, top: 1.89 }}
      />
      <CollectionMapStatus />
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 54,
          width: 428,
          height: 880,
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: 35,
          borderTopRightRadius: 35,
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Thu gọn các chặng"
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace('/collection-directions')
        }
        hitSlop={10}
        style={{
          position: 'absolute',
          left: 184,
          top: 60,
          width: 60,
          height: 3,
          backgroundColor: '#898989',
        }}
      />
      <T
        size={24}
        weight="semibold"
        lineHeight={29}
        color="#000000"
        style={{ position: 'absolute', left: 20, top: 80 }}
      >
        {modes[mode]!.label}
      </T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Xem bản đồ tuyến đường"
        onPress={() => router.replace(`/collection-directions?point=${destination}`)}
        style={{ position: 'absolute', left: 323, top: 80 }}
      >
        <Artwork source={a.imgGroup36938} width={29} height={30} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đóng các chặng"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/collection'))}
        style={{ position: 'absolute', left: 368, top: 80 }}
      >
        <Artwork source={a.imgGroup36937} width={29} height={30} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Lập hành trình nhiều điểm"
        onPress={journey}
        style={{
          position: 'absolute',
          left: 24,
          top: 124,
          width: 380,
          height: 44,
          paddingHorizontal: 16,
          borderWidth: 1,
          borderColor: '#D2E7F4',
          borderRadius: 22,
          backgroundColor: '#FFFFFF',
          boxShadow: '0px 4px 6px rgba(0,0,0,.08)',
          flexDirection: 'row',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <Artwork source={a.imgPlus4} width={18} />
        <T weight="semibold" color={c.brand} style={{ flex: 1 }}>
          Lập hành trình nhiều điểm
        </T>
        <Artwork source={a.imgArrowCurveRightUp1} width={20} />
      </Pressable>
      {modes.map((item, index) => (
        <Pressable
          key={item.label}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          aria-pressed={mode === index}
          accessibilityState={{ selected: mode === index }}
          onPress={() => setMode(index)}
          style={{ position: 'absolute', left: item.x - 5, top: 185, width: 83, height: 45 }}
        >
          <T
            size={13}
            lineHeight={16}
            color={mode === index ? '#266F96' : '#000000'}
            style={{ position: 'absolute', left: item.textX - item.x + 5, top: 10 }}
          >
            {item.minutes} phút
          </T>
        </Pressable>
      ))}
      {image(a.imgIcon1, 20.32, 217.86, 17.5, 17.4)}
      {image(a.imgGroup, 128, 196, 20, 14)}
      {image(a.imgIcon, 237.33, 216.85, 13.33, 19.5)}
      {image(a.imgIconsDirectionsWalk, 341, 194, 20, 18)}
      <View
        style={{
          position: 'absolute',
          left: modes[mode]!.underline,
          top: 222,
          width: 55,
          height: 3,
          backgroundColor: '#6CB4DA',
          borderTopLeftRadius: 5,
          borderTopRightRadius: 5,
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đổi giờ khởi hành"
        onPress={() => {
          setDraft(departure);
          setSheet('departure');
        }}
        style={{
          position: 'absolute',
          left: 20,
          top: 240,
          width: 164,
          height: 35,
          borderRadius: 10,
          backgroundColor: '#DCEEF9',
        }}
      >
        <T
          weight="medium"
          color="#366B87"
          lineHeight={17}
          style={{ position: 'absolute', left: 6, top: 9 }}
        >
          Khởi hành lúc {departure}
        </T>
      </Pressable>
      {[197, 374].map((x, index) => (
        <Pressable
          key={x}
          accessibilityRole="button"
          accessibilityLabel={`Tránh trạm thu phí, tùy chọn ${index + 1}`}
          aria-pressed={avoid[index]}
          accessibilityState={{ selected: avoid[index] }}
          onPress={() =>
            setAvoid((current) => current.map((value, i) => (i === index ? !value : value)))
          }
          style={{
            position: 'absolute',
            left: x,
            top: 240,
            width: 164,
            height: 35,
            borderRadius: 10,
            backgroundColor: '#DCEEF9',
            borderWidth: avoid[index] ? 1 : 0,
            borderColor: c.brand,
          }}
        />
      ))}
      <T
        size={24}
        weight="medium"
        lineHeight={29}
        color="#000000"
        style={{ position: 'absolute', left: 21, top: 292 }}
      >
        {modes[mode]!.minutes} phút (2,0 km)
      </T>
      {image(a.imgArrowTriangleDown, 161, 309, 20)}
      <T
        weight="medium"
        color="#366B87"
        lineHeight={17}
        style={{ position: 'absolute', left: 217, top: 311 }}
      >
        Tránh trạm thu phí
      </T>
      <T
        weight="medium"
        color="#366B87"
        lineHeight={17}
        style={{ position: 'absolute', left: 394, top: 311, width: 144 }}
      >
        Tránh trạm thu phí
      </T>
      {body('Tuyến đường gần nhất', 20, 330, undefined, 16, '#787878')}
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 360.5,
          width: 428,
          height: 1,
          backgroundColor: '#D0D0D0',
        }}
      />
      <T
        accessibilityRole="header"
        size={20}
        weight="medium"
        lineHeight={24}
        color="#000000"
        style={{ position: 'absolute', left: 13, top: 383 }}
      >
        Các chặng
      </T>
      {body('Vị trí của bạn', 73, 432)}
      {image(a.imgGroup36931, 32, 433, 18)}
      {image(a.imgLine33, 73, 460.5, 355, 1)}
      {body('Đi về phía hướng Tây', 73, 486)}
      {image(a.imgArrowUp, 29, 486, 24)}
      {body('90 m', 75, 511, undefined, 14, '#787878')}
      {image(a.imgLine38, 118, 518.5, 310, 1)}
      {body('Rẽ phải', 73, 553)}
      {image(a.imgArrowCurveRightUp, 29, 556, 24)}
      {body('160 m', 75, 578, undefined, 14, '#787878')}
      {image(a.imgLine40, 123, 585.5, 305, 1)}
      {body('Rẽ trái', 73, 623)}
      {image(a.imgArrowCurveLeftUp, 29, 622, 24)}
      {body('80 m', 75, 648, undefined, 14, '#787878')}
      {image(a.imgLine40, 123, 655.5, 305, 1)}
      {body('Rẽ phải về hướng Trần Đại Nghĩa/Đ. Trần Hưng Đạo/ĐT607', 76, 695, 333)}
      {image(a.imgArrowCurveRightUp, 32, 698, 24)}
      <Artwork
        source={a.imgAlertCircle}
        width={15}
        style={{ position: 'absolute', left: 78, top: 742, transform: [{ scaleY: -1 }] }}
      />
      {body('Đi qua Tuyết Nhung ở phía bên phải', 97, 742, undefined, 13, '#8B8B8B')}
      {body('130 m', 78, 770, undefined, 14, '#787878')}
      {image(a.imgLine40, 126, 777.5, 305, 1)}
      {image(a.imgLine37, 0, 826.2, 428, 0.8)}
      {body('Rẽ phải vào Trần Đại Nghĩa/Đ. Trần Đại Nghĩa', 76, 814, 333)}
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 870,
          width: 428,
          height: 54,
          backgroundColor: '#FFFFFF',
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Bắt đầu"
        onPress={() => setSheet('start')}
        style={{
          position: 'absolute',
          left: 20,
          top: 879,
          width: 110,
          height: 35,
          borderRadius: 20,
          backgroundColor: c.brand,
        }}
      >
        <T
          size={15}
          weight="medium"
          color="#FFFFFF"
          lineHeight={18}
          style={{ position: 'absolute', left: 37, top: 8 }}
        >
          Bắt đầu
        </T>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Thêm điểm dừng"
        onPress={journey}
        style={{
          position: 'absolute',
          left: 143,
          top: 879,
          width: 164,
          height: 35,
          borderRadius: 20,
          backgroundColor: '#DCEEF9',
        }}
      >
        <Artwork
          source={a.imgPlus03}
          width={5}
          style={{ position: 'absolute', left: 25, top: 9 }}
        />
        <T
          weight="medium"
          color="#366B87"
          lineHeight={17}
          style={{ position: 'absolute', left: 35, top: 9 }}
        >
          Thêm điểm dừng
        </T>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Chia sẻ tuyến đường"
        onPress={() => setSheet('share')}
        style={{
          position: 'absolute',
          left: 325,
          top: 879,
          width: 114,
          height: 35,
          borderRadius: 20,
          backgroundColor: '#DCEEF9',
        }}
      >
        <T
          weight="medium"
          color="#366B87"
          lineHeight={17}
          style={{ position: 'absolute', left: 43, top: 8 }}
        >
          Chia sẻ
        </T>
      </Pressable>
      <LegacyNavigation selected="collection" handbook />
      {sheet === 'departure' ? (
        <CollectionSheet title="Giờ khởi hành" onClose={() => setSheet(null)}>
          <TextInput
            accessibilityLabel="Giờ khởi hành"
            value={draft}
            onChangeText={setDraft}
            placeholder="HH:mm"
            maxLength={5}
            style={{
              height: 48,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 14,
              padding: 12,
              fontFamily: 'BackupInter_400Regular',
              fontSize: 16,
              color: c.ink,
            }}
          />
          <CollectionAction
            title="Lưu giờ khởi hành"
            disabled={!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(draft)}
            onPress={() => {
              setDeparture(draft);
              setSheet(null);
            }}
          />
          <T size={12} color={c.muted}>
            Tuyến và thời gian đang dùng dữ liệu mẫu; thay đổi lựa chọn chưa tính lại tuyến thực tế.
          </T>
        </CollectionSheet>
      ) : null}
      {sheet === 'start' ? (
        <CollectionSheet title="Tuyến đường minh họa" onClose={() => setSheet(null)}>
          <T>Bản đồ là tuyến mẫu trong thiết kế, chưa có GPS hoặc dẫn đường trực tiếp.</T>
          <CollectionAction
            title="Xem chỉ đường mẫu"
            onPress={() => {
              setSheet(null);
              router.push(`/collection-navigation?point=${destination}`);
            }}
          />
        </CollectionSheet>
      ) : null}
      {sheet === 'share' ? (
        <CollectionSheet title="Chia sẻ tuyến đường" onClose={() => setSheet(null)}>
          <CollectionAction
            title={copied ? 'Đã sao chép liên kết' : 'Sao chép liên kết tuyến mẫu'}
            onPress={() => {
              void Clipboard.setStringAsync(
                Linking.createURL(`/collection-route?point=${destination}`),
              ).then(() => setCopied(true));
            }}
          />
        </CollectionSheet>
      ) : null}
    </LegacyCanvas>
  );
}
