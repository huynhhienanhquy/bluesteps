import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../../providers';
import { Artwork } from '../../design-system/DesignScreen';
import { LegacyCanvas } from '../../design-system/LegacyCanvas';
import { LegacyNavigation } from '../../design-system/LegacyNavigation';
import { collectionFlowAssets } from '../../design-system/collection-flow-assets';
import { designPoints } from '../../services/collection';
import {
  CollectionAction,
  CollectionSheet,
  CollectionText as T,
  collectionColors as c,
} from './CollectionPage';
import { CollectionMapStatus } from './CollectionMapParts';
const a = collectionFlowAssets['386:8633'];
const markers = [
  [328, 266],
  [278, 34],
  [89, 723],
  [359, 662],
  [237, 463],
  [49, 537],
  [144, 299],
  [-5, 357],
  [6, 119],
  [401, 448],
  [223, 160],
];

export function CollectionExploreScreen() {
  const { setSelectedPoint } = useApp();
  const [search, setSearch] = useState('');
  const [tools, setTools] = useState(false);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const nearby = (query = search.trim()) =>
    router.push(query ? `/collection?query=${encodeURIComponent(query)}` : '/collection');
  return (
    <LegacyCanvas statusHeight={51}>
      <Artwork
        source={a.imgImage79}
        width={895}
        height={625}
        fit="cover"
        style={{ position: 'absolute', left: -267, top: 135, transform: [{ rotate: '90deg' }] }}
      />
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: 2, top: 1, width: 428, height: 49 }}
      >
        <CollectionMapStatus />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        style={{
          position: 'absolute',
          left: 22,
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
        color="#000000"
        style={{ position: 'absolute', left: 158, top: 58 }}
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
          left: 32,
          top: 103,
          width: 364,
          height: 50,
          borderRadius: 15,
          backgroundColor: '#FFFFFF',
          boxShadow: '0px 4px 4px rgba(0,0,0,.25)',
        }}
      >
        <TextInput
          ref={input}
          accessibilityLabel="Tìm điểm thu gom"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => nearby()}
          returnKeyType="search"
          placeholder="Tìm kiếm địa điểm phân loại rác"
          placeholderTextColor="#DADADA"
          style={{
            height: 50,
            width: 320,
            paddingHorizontal: 19,
            paddingVertical: 0,
            fontFamily: 'BackupInter_400Regular',
            fontSize: 16,
            color: '#000000',
            outlineWidth: 0,
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nhập địa điểm"
          onPress={() => input.current?.focus()}
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tùy chọn bản đồ"
        onPress={() => setTools(true)}
        style={{ position: 'absolute', left: 369, top: 787, width: 53, height: 53 }}
      >
        <Artwork source={a.imgFrame36724} width={53} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Vị trí trong bản mẫu"
        onPress={() => setTools(true)}
        style={{ position: 'absolute', left: 373, top: 729, width: 45, height: 45 }}
      >
        <Artwork source={a.imgEllipse85} width={45} />
        <Artwork
          source={a.imgDiscovery}
          width={23.334}
          style={{ position: 'absolute', left: 11.333, top: 11.333 }}
        />
      </Pressable>
      {markers.map(([x, y], index) => {
        const point = designPoints[index % designPoints.length]!;
        return (
          <Pressable
            key={index}
            accessibilityRole="button"
            accessibilityLabel={`Xem điểm ${point.name}, ký hiệu ${index + 1}`}
            onPress={() => {
              setSelectedPoint(point.id);
              nearby(point.name);
            }}
            style={{ position: 'absolute', left: x, top: y, width: 27, height: 40 }}
          >
            <Artwork source={a.imgEllipse24} width={27} height={40} />
            <Artwork
              source={a.imgEllipse25}
              width={16.714}
              height={19.259}
              style={{ position: 'absolute', left: 5.14, top: 5.93 }}
            />
          </Pressable>
        );
      })}
      <Artwork
        source={a.imgGroup36931}
        width={18}
        style={{ position: 'absolute', left: 251, top: 367 }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Xem các điểm gần vị trí mẫu"
        onPress={() => {
          setSelectedPoint('green-hub');
          nearby('');
        }}
        style={{
          position: 'absolute',
          left: 111,
          top: 227,
          width: 286,
          height: 286,
          borderRadius: 143,
        }}
      >
        <Artwork source={a.imgEllipse323} width={286} />
      </Pressable>
      <LegacyNavigation selected="collection" handbook />
      <View
        style={{
          position: 'absolute',
          left: 24,
          top: 760,
          width: 380,
          flexDirection: 'row',
          gap: 12,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Bộ lọc điểm thu gom"
          onPress={() => router.push('/collection-filters?next=nearby')}
          style={{
            width: 185,
            height: 56,
            borderWidth: 1,
            borderColor: '#D2E7F4',
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            boxShadow: '0px 4px 4px rgba(0,0,0,.08)',
            flexDirection: 'row',
            gap: 8,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Artwork source={a.imgFilter} width={20} />
          <T weight="medium" color={c.brand}>
            Bộ lọc
          </T>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đề xuất địa điểm"
          onPress={() => router.push('/point-proposal')}
          style={{
            width: 183,
            height: 56,
            backgroundColor: c.brand,
            borderRadius: 16,
            boxShadow: '0px 4px 4px rgba(0,0,0,.08)',
            flexDirection: 'row',
            gap: 8,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Artwork source={a.imgPlus} width={20} />
          <T weight="medium" color="#FFFFFF">
            Đề xuất địa điểm
          </T>
        </Pressable>
      </View>
      {tools ? (
        <CollectionSheet title="Bản đồ khám phá" onClose={() => setTools(false)}>
          <T>Bản đồ, các điểm và vùng vị trí dùng dữ liệu minh họa. Chưa lấy GPS thiết bị.</T>
          <CollectionAction
            title="Xem các điểm gần đây"
            onPress={() => {
              setTools(false);
              nearby('');
            }}
          />
          <CollectionAction
            title="Lập hành trình"
            onPress={() => {
              setTools(false);
              router.push('/journey');
            }}
          />
        </CollectionSheet>
      ) : null}
    </LegacyCanvas>
  );
}
