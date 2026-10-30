import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useApp } from '../../providers';
import { Artwork } from '../../design-system/DesignScreen';
import { LegacyCanvas } from '../../design-system/LegacyCanvas';
import { LegacyNavigation } from '../../design-system/LegacyNavigation';
import { collectionNavigationAssets } from '../../design-system/collection-navigation-assets';
import { findCollectionPoint } from '../../services/collection';
import {
  CollectionAction,
  CollectionSheet,
  CollectionText as T,
  collectionColors as c,
} from './CollectionPage';
import { CollectionMapStatus } from './CollectionMapParts';
const a = collectionNavigationAssets['386:10186'];

export function PointDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { stops, setStops, setSelectedPoint } = useApp();
  const point = findCollectionPoint(id);
  const [sheet, setSheet] = useState<'actions' | 'photos' | 'reviews' | 'contact' | null>(null);
  const [copied, setCopied] = useState(false);
  if (!point)
    return (
      <LegacyCanvas>
        <T accessibilityRole="header" style={{ margin: 24, marginTop: 80 }}>
          Không tìm thấy điểm
        </T>
        <CollectionAction title="Tìm điểm thu gom" onPress={() => router.replace('/collection')} />
      </LegacyCanvas>
    );
  const original = point.id === 'green-hub';
  const image = (source: number, x: number, y: number, w: number, h = w) => (
    <Artwork
      source={source}
      width={w}
      height={h}
      style={{ position: 'absolute', left: x, top: y }}
    />
  );
  return (
    <LegacyCanvas height={1006} background="#F5F5F5" statusHeight={53}>
      <Artwork
        source={a.imgRectangle208}
        width={428}
        height={448}
        fit="cover"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          opacity: 0.6,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}
      />
      {image(require('../../../assets/figma/common/point-fade.svg'), 0, 0, 428, 448)}
      <CollectionMapStatus />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/collection'))}
        style={{ position: 'absolute', left: 3, top: 41, width: 46.044, height: 52.242 }}
      >
        <Artwork source={a.imgGroup182} width={46.044} height={52.242} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Chia sẻ điểm thu gom"
        onPress={() => setSheet('actions')}
        hitSlop={12}
        style={{ position: 'absolute', left: 378, top: 56, width: 20, height: 24 }}
      >
        <Artwork source={a.imgVector} width={20} height={24} />
      </Pressable>
      <View style={{ position: 'absolute', left: 142, top: 265, flexDirection: 'row', gap: 12 }}>
        {[a.imgRectangle911, a.imgRectangle912, a.imgRectangle913].map((source, index) => (
          <Pressable
            key={index}
            accessibilityRole="button"
            accessibilityLabel={`Xem ảnh ${index + 1} của điểm thu gom`}
            onPress={() => setSheet('photos')}
          >
            <Artwork
              source={source}
              width={55}
              height={60}
              fit="cover"
              style={{ borderRadius: 8 }}
            />
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Xem thêm ảnh điểm thu gom"
          onPress={() => setSheet('photos')}
          style={{
            width: 55,
            height: 60,
            backgroundColor: '#89B7CF',
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <T size={16} weight="medium" color="#000000">
            +4
          </T>
        </Pressable>
      </View>
      {[
        ['Hữu cơ', '#FFE030', 32, '#241C1D'],
        ['Vô cơ', '#FF0505', 137, '#FFFFFF'],
        ['Tái chế', '#2D528B', 236, '#FFFFFF'],
      ].map(([label, background, x, color]) => (
        <View
          key={label}
          style={{
            position: 'absolute',
            left: x as number,
            top: 403,
            width: 76,
            height: 26,
            backgroundColor: background as string,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <T weight="bold" color={color as string} lineHeight={17}>
            {label}
          </T>
        </View>
      ))}
      <T
        accessibilityRole="header"
        size={24}
        weight="bold"
        color="#000000"
        lineHeight={29}
        style={{ position: 'absolute', left: 26, top: 448, width: 258 }}
      >
        {point.name}
      </T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Chỉ đường"
        onPress={() => {
          setSelectedPoint(point.id);
          router.push(`/collection-directions?point=${point.id}`);
        }}
        style={{
          position: 'absolute',
          left: 308,
          top: 450,
          width: 94,
          height: 42,
          backgroundColor: c.brand,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <T weight="bold" color="#FFFFFF">
          Chỉ đường
        </T>
      </Pressable>
      {original ? (
        <>
          {[
            a.imgGroup36928,
            a.imgGroup36925,
            a.imgGroup36925,
            a.imgGroup36925,
            a.imgGroup36929,
          ].map((source, index) => (
            <View key={index}>{image(source, 103 + 27 * index, 484, 22)}</View>
          ))}
          <T weight="bold" color="#000000" style={{ position: 'absolute', left: 253, top: 485 }}>
            4.5
          </T>
        </>
      ) : null}
      {image(a.imgGroup36827, 26, 524, 15.126, 66.584)}
      <Text
        style={{
          position: 'absolute',
          left: 48,
          top: 526,
          fontFamily: 'BackupInter_300Light',
          color: '#555555',
          fontSize: 14,
          lineHeight: 20,
          width: 376,
        }}
      >{` ${point.address}`}</Text>
      <View style={{ position: 'absolute', left: 24, top: 573, flexDirection: 'row', gap: 13 }}>
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="Tổng quan"
          accessibilityState={{ selected: true }}
          aria-selected
          onPress={() => setSheet(null)}
        >
          <T size={16} weight="semibold" lineHeight={20} color={c.brand}>
            Tổng quan
          </T>
          <View
            style={{
              position: 'absolute',
              left: 6,
              top: 21,
              width: 70,
              height: 2,
              backgroundColor: c.brand,
            }}
          />
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="Bài đánh giá"
          accessibilityState={{ selected: false }}
          aria-selected={false}
          onPress={() => setSheet('reviews')}
        >
          <T size={16} weight="semibold" lineHeight={20} color="#000000">
            Bài đánh giá
          </T>
        </Pressable>
      </View>
      <T
        color="#000000"
        style={{ position: 'absolute', left: 24, top: 615, width: 285, height: 23 }}
      >
        Liên quan đến nội dung tìm kiếm của bạn
      </T>
      {[642, 687, 733, 778].map((y, index) => (
        <View
          key={y}
          style={{
            position: 'absolute',
            left: 24,
            top: y,
            width: 373,
            height: 41,
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: index === 0 ? 30 : 0,
            borderTopRightRadius: index === 0 ? 30 : 0,
            borderBottomLeftRadius: index === 3 ? 30 : 0,
            borderBottomRightRadius: index === 3 ? 30 : 0,
          }}
        />
      ))}
      {image(a.imgGroup36772, 37.875, 653.875, 20, 20)}
      <T weight="bold" color={c.brand} style={{ position: 'absolute', left: 68, top: 656 }}>
        {point.open ? 'Mở cửa' : 'Đóng cửa'}
      </T>
      <T color="#000000" style={{ position: 'absolute', left: 146, top: 656 }}>
        {original ? 'Mở cửa suốt ngày' : point.hours}
      </T>
      {image(a.imgRectangle925, 36, 699, 21, 20)}
      <Text
        style={{
          position: 'absolute',
          left: 65,
          top: 699,
          fontFamily: 'BackupInter_300Light',
          color: '#555555',
          fontSize: 14,
          lineHeight: 20,
        }}
      >
        Tình trạng:{' '}
        <T weight="bold" color={c.brand}>
          {point.available ? 'Còn trống' : 'Tạm ngừng'}
        </T>
      </Text>
      {image(a.imgRectangle925, 36, 746, 18, 20)}
      {image(a.imgVector31, 37.7, 786.75, 20.31, 20.31)}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Thông tin liên hệ điểm thu gom"
        onPress={() => setSheet('contact')}
        style={{ position: 'absolute', left: 62, top: 738, width: 322, height: 79, gap: 22 }}
      >
        <T color="#000000" style={{ marginTop: 8 }}>
          congviencongdong.com.vn
        </T>
        <T color="#000000" style={{ marginLeft: 4 }}>
          023928465725
        </T>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Báo cáo vấn đề"
        onPress={() => router.push(`/point-report?point=${point.id}`)}
        style={{
          position: 'absolute',
          left: 24,
          top: 831,
          width: 380,
          height: 44,
          backgroundColor: '#FFFFFF',
          borderRadius: 22,
          boxShadow: '0px 4px 6px rgba(0,0,0,.1)',
          flexDirection: 'row',
          gap: 8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Artwork source={a.imgAlertCircle} width={18} />
        <T weight="semibold" color={c.brand}>
          Báo cáo vấn đề
        </T>
      </Pressable>
      <LegacyNavigation selected="collection" handbook />
      {sheet === 'photos' ? (
        <CollectionSheet title="Ảnh điểm thu gom" onClose={() => setSheet(null)}>
          <ScrollView horizontal contentContainerStyle={{ gap: 12 }}>
            {[a.imgRectangle911, a.imgRectangle912, a.imgRectangle913].map((source, index) => (
              <Artwork
                key={index}
                source={source}
                width={240}
                height={280}
                fit="cover"
                style={{ borderRadius: 16 }}
              />
            ))}
          </ScrollView>
          <T size={12} color={c.muted}>
            Ảnh minh họa trong thiết kế.
          </T>
        </CollectionSheet>
      ) : null}
      {sheet === 'reviews' ? (
        <CollectionSheet title="Bài đánh giá" onClose={() => setSheet(null)}>
          <T>Chưa có bài đánh giá được kết nối cho điểm này.</T>
          <T size={12} color={c.muted}>
            Điểm 4.5 và ảnh trên màn hình là nội dung minh họa của thiết kế.
          </T>
        </CollectionSheet>
      ) : null}
      {sheet === 'contact' ? (
        <CollectionSheet title="Thông tin liên hệ" onClose={() => setSheet(null)}>
          <T>congviencongdong.com.vn</T>
          <T>023928465725</T>
          <T size={12} color={c.muted}>
            Thông tin mẫu từ thiết kế; chưa xác minh với đơn vị quản lý.
          </T>
        </CollectionSheet>
      ) : null}
      {sheet === 'actions' ? (
        <CollectionSheet title={point.name} onClose={() => setSheet(null)}>
          <CollectionAction
            title={stops.includes(point.id) ? 'Đã thêm vào hành trình' : 'Thêm vào hành trình'}
            disabled={stops.includes(point.id)}
            onPress={() => setStops([...stops, point.id])}
          />
          <CollectionAction
            title="Xem hành trình"
            onPress={() => {
              setSheet(null);
              router.push('/journey');
            }}
          />
          <CollectionAction
            title={copied ? 'Đã sao chép liên kết' : 'Sao chép liên kết'}
            onPress={() => {
              void Clipboard.setStringAsync(Linking.createURL(`/points/${point.id}`)).then(() =>
                setCopied(true),
              );
            }}
          />
          <T size={12} color={c.muted}>
            Dữ liệu minh họa trong phiên thử nghiệm, chưa lấy vị trí thiết bị.
          </T>
        </CollectionSheet>
      ) : null}
    </LegacyCanvas>
  );
}
