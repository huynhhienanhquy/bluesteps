import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../providers';
import { Artwork } from '../../design-system/DesignScreen';
import { LegacyCanvas } from '../../design-system/LegacyCanvas';
import { LegacyNavigation } from '../../design-system/LegacyNavigation';
import { collectionAssets as a } from '../../design-system/collection-assets';
import {
  defaultCollectionFilters,
  designPoints,
  findCollectionPoint,
  matchingCollectionPoints,
  type DesignPoint,
} from '../../services/collection';
import { CollectionAction, CollectionText as T, collectionColors as c } from './CollectionPage';

export function CollectionMapScreen() {
  const { query } = useLocalSearchParams<{ query?: string }>();
  return <CollectionMapContent key={query ?? ''} initialQuery={query} />;
}

function CollectionMapContent({ initialQuery = '' }: { initialQuery?: string }) {
  const { collectionFilters, selectedPoint, setSelectedPoint } = useApp();
  const [search, setSearch] = useState(initialQuery);
  const [tools, setTools] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const offsetRef = useRef(offset);
  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);
  const dragStart = useRef({ x: 0, y: 0, pageX: 0, pageY: 0 });
  const searchRef = useRef<ComponentRef<typeof TextInput>>(null);
  const filtered =
    collectionFilters.applied || search
      ? matchingCollectionPoints(
          collectionFilters.applied
            ? collectionFilters
            : {
                ...defaultCollectionFilters(),
                materials: [],
                radius: 10,
                hours: 'all',
                available: false,
              },
          search,
        )
      : [designPoints[0]!, designPoints[0]!];
  const selected = findCollectionPoint(selectedPoint) ?? designPoints[0]!;
  const openDetails = (point: DesignPoint) => {
    setSelectedPoint(point.id);
    router.push(`/points/${point.id}`);
  };
  return (
    <LegacyCanvas statusHeight={53}>
      <View
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(event) => {
          dragStart.current = {
            ...offsetRef.current,
            pageX: event.nativeEvent.pageX,
            pageY: event.nativeEvent.pageY,
          };
        }}
        onResponderMove={(event) => {
          setOffset({
            x: Math.max(
              -130,
              Math.min(
                130,
                dragStart.current.x + event.nativeEvent.pageX - dragStart.current.pageX,
              ),
            ),
            y: Math.max(
              -100,
              Math.min(
                100,
                dragStart.current.y + event.nativeEvent.pageY - dragStart.current.pageY,
              ),
            ),
          });
        }}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 428,
          height: 849,
          overflow: 'hidden',
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 428,
            height: 896,
            transform: [{ translateX: offset.x }, { translateY: offset.y }, { scale: zoom }],
          }}
        >
          <Artwork
            source={a.imgImage79}
            width={896}
            height={626}
            fit="cover"
            style={{ position: 'absolute', left: -236, top: 135, transform: [{ rotate: '90deg' }] }}
          />
        </View>
      </View>
      {Platform.OS === 'web' ? (
        <View pointerEvents="none">
          <Artwork
            source={a.imgTime}
            width={52}
            height={21}
            style={{ position: 'absolute', left: 19, top: 15 }}
          />
          <Artwork
            source={a.imgMobileSignal}
            width={17}
            height={10.666}
            style={{ position: 'absolute', left: 330.667, top: 20.667 }}
          />
          <Artwork
            source={a.imgWifi}
            width={15.272}
            height={10.966}
            style={{ position: 'absolute', left: 352.697, top: 20.333 }}
          />
          <Artwork
            source={a.imgRectangle}
            width={22}
            height={11.333}
            style={{ position: 'absolute', left: 373, top: 20.333 }}
          />
          <Artwork
            source={a.imgCombinedShape}
            width={1.328}
            height={4}
            style={{ position: 'absolute', left: 396, top: 24 }}
          />
          <Artwork
            source={a.imgRectangle1}
            width={18}
            height={7.333}
            style={{ position: 'absolute', left: 375, top: 22.333 }}
          />
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        style={{
          position: 'absolute',
          left: 27,
          top: 50,
          width: 43,
          height: 43,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Artwork
          source={require('../../../assets/figma/common/collection-back.svg')}
          width={10.75}
          height={21.5}
        />
      </Pressable>
      <T
        accessibilityRole="header"
        size={20}
        weight="bold"
        lineHeight={24}
        style={{ position: 'absolute', left: 158, top: 58 }}
        color="#000000"
      >
        Khám phá
      </T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cá nhân"
        onPress={() => router.push('/profile')}
        style={{ position: 'absolute', left: 355, top: 50 }}
      >
        <Artwork source={a.imgEllipse1} width={40} />
      </Pressable>
      <View
        style={{
          position: 'absolute',
          left: 30,
          top: 103,
          width: 364,
          height: 50,
          backgroundColor: '#FFFFFF',
          borderRadius: 15,
          boxShadow: '0px 4px 4px rgba(0,0,0,.25)',
        }}
      >
        <TextInput
          ref={searchRef}
          accessibilityLabel="Tìm điểm thu gom"
          value={search}
          onChangeText={setSearch}
          placeholder="Công viên gần nhất"
          placeholderTextColor="#000000"
          style={{
            fontFamily: 'BackupInter_400Regular',
            fontSize: 16,
            color: '#000000',
            paddingHorizontal: 19,
            paddingVertical: 0,
            height: 50,
            width: 320,
            outlineWidth: 0,
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nhập địa điểm"
          onPress={() => searchRef.current?.focus()}
          style={{
            position: 'absolute',
            right: 8,
            top: 3,
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Artwork source={a.imgVoice} width={17.25} height={22.46} />
        </Pressable>
      </View>
      <View style={{ position: 'absolute', left: 24, top: 170, width: 380, gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Điểm đã chọn: ${selected.name}`}
          onPress={() => openDetails(selected)}
          style={{
            backgroundColor: '#FFFFFF',
            borderWidth: 2,
            borderColor: c.brand,
            borderRadius: 18,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 10,
            paddingVertical: 8,
            boxShadow: '0px 4px 8px rgba(0,0,0,.08)',
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: 1.5,
              borderColor: c.brand,
              backgroundColor: c.brand,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Artwork source={a.imgCheck} width={14} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T weight="semibold">Đã chọn</T>
            <T size={12} color={c.muted}>
              {selected.name}
            </T>
          </View>
          <View
            style={{
              height: 28,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: c.brand,
              paddingHorizontal: 10,
              justifyContent: 'center',
              backgroundColor: '#EAF7F1',
            }}
          >
            <T size={12} weight="semibold" color={c.brand}>
              {selected.available ? 'Còn chỗ' : 'Tạm ngừng'}
            </T>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="So sánh"
          onPress={() => router.push('/collection-compare')}
          style={{
            height: 50,
            backgroundColor: c.brand,
            borderRadius: 18,
            flexDirection: 'row',
            gap: 10,
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0px 4px 8px rgba(0,0,0,.08)',
          }}
        >
          <Artwork source={a.imgGitCompare} width={18} />
          <T size={15} weight="semibold" color="#FFFFFF">
            So sánh
          </T>
        </Pressable>
      </View>
      <T
        size={20}
        weight="bold"
        lineHeight={24}
        color={c.brand}
        style={{ position: 'absolute', left: 29, top: 607 }}
      >
        Gần bạn
      </T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tùy chọn bản đồ"
        onPress={() => setTools(true)}
        style={{ position: 'absolute', left: 352, top: 586, width: 45, height: 45 }}
      >
        <Artwork source={a.imgFrame36724} width={45} />
      </Pressable>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel="Điểm thu gom gần bạn"
        style={{ position: 'absolute', left: 0, top: 626, width: 428, height: 184 }}
        contentContainerStyle={{ gap: 15, paddingLeft: 29, paddingRight: 24, paddingBottom: 5 }}
        keyboardShouldPersistTaps="handled"
      >
        {filtered.length ? (
          filtered.map((point, index) => (
            <View key={`${point.id}-${index}`} style={{ width: 230, height: 179 }}>
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 15,
                  width: 230,
                  height: 163,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 20,
                  boxShadow: '0px 4px 4px rgba(0,0,0,.25)',
                }}
              />
              <Artwork
                source={a.imgRectangle768}
                width={91}
                height={78}
                fit="cover"
                style={{ position: 'absolute', left: 18, top: 21, borderRadius: 15 }}
              />
              <T
                size={11}
                weight="semibold"
                color="#000000"
                lineHeight={13}
                style={{ position: 'absolute', left: 110, top: 19, width: 110 }}
              >
                {point.cardName}
              </T>
              <T
                size={11}
                color={c.brand}
                lineHeight={13}
                style={{ position: 'absolute', left: 110, top: 58, width: 65 }}
              >
                {point.available ? 'Còn chỗ' : 'Tạm ngừng'}
              </T>
              <T
                size={11}
                color="#000000"
                lineHeight={13}
                style={{ position: 'absolute', left: 9, top: 109, width: 202 }}
              >
                {point.address}
              </T>
              <T
                size={11}
                color="#B2B2B2"
                lineHeight={13}
                style={{ position: 'absolute', left: 9, top: 148, width: 115 }}
              >
                {point.distance < 1
                  ? `${Math.round(point.distance * 1000)}m`
                  : `${point.distance}km`}{' '}
                - {point.minutes} phút đi bộ
              </T>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Xem điểm thu gom ${point.name}`}
                onPress={() => openDetails(point)}
                style={{ position: 'absolute', left: 0, top: 15, width: 230, height: 126 }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Chỉ đường đến ${point.name}`}
                onPress={() => {
                  setSelectedPoint(point.id);
                  router.push(`/journey?point=${point.id}`);
                }}
                style={{
                  position: 'absolute',
                  left: 158,
                  top: 141,
                  width: 62,
                  height: 28,
                  borderRadius: 20,
                  backgroundColor: c.brand,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <T size={10} lineHeight={12} color="#FFFFFF">
                  Chỉ đường
                </T>
              </Pressable>
            </View>
          ))
        ) : (
          <View
            style={{
              backgroundColor: '#FFFFFF',
              width: 370,
              height: 150,
              marginTop: 15,
              borderRadius: 20,
              padding: 24,
              gap: 12,
            }}
          >
            <T weight="semibold">Không có điểm phù hợp</T>
            <T size={12} color={c.muted}>
              Thử đổi từ khóa hoặc bộ lọc.
            </T>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Bộ lọc điểm thu gom"
              onPress={() => router.push('/collection-filters')}
            >
              <T color={c.brand}>Mở bộ lọc</T>
            </Pressable>
          </View>
        )}
      </ScrollView>
      <LegacyNavigation selected="collection" handbook />
      <Modal
        transparent
        visible={tools}
        animationType="fade"
        onRequestClose={() => setTools(false)}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng tùy chọn bản đồ"
            onPress={() => setTools(false)}
            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(22,69,97,.24)' }}
          />
          <View
            style={{
              backgroundColor: '#FFFFFF',
              width: '100%',
              maxWidth: 428,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 24,
              gap: 16,
            }}
          >
            <T accessibilityRole="header" size={22} weight="bold" lineHeight={28}>
              Tùy chọn bản đồ
            </T>
            <CollectionAction
              title="Bản đồ khám phá"
              onPress={() => {
                setTools(false);
                router.push('/collection-explore');
              }}
            />
            <CollectionAction
              title="Bộ lọc điểm thu gom"
              onPress={() => {
                setTools(false);
                router.push('/collection-filters');
              }}
            />
            <CollectionAction
              title="Phóng to bản đồ"
              onPress={() => {
                setZoom((current) => Math.min(current + 0.25, 2));
                setTools(false);
              }}
            />
            <CollectionAction
              title="Đặt lại bản đồ"
              onPress={() => {
                setZoom(1);
                setOffset({ x: 0, y: 0 });
                setSearch('');
                setTools(false);
              }}
            />
            <CollectionAction
              title="Hành trình"
              onPress={() => {
                setTools(false);
                router.push('/journey');
              }}
            />
            <CollectionAction
              title="Đề xuất điểm thu gom"
              onPress={() => {
                setTools(false);
                router.push('/point-proposal');
              }}
            />
            <T size={12} color={c.muted}>
              Bản đồ và tình trạng đang dùng dữ liệu minh họa, chưa lấy vị trí thiết bị.
            </T>
          </View>
        </View>
      </Modal>
    </LegacyCanvas>
  );
}
