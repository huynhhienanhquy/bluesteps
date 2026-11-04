import { useState, type PropsWithChildren } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Artwork, StatusSpace } from '../../design-system/DesignScreen';
import { Button, Icon, Label, Notice, Typography } from '../../design-system/ui';
import { useApp } from '../../providers';
import { errorMessage, type Schemas } from '../../services/api';
import { CurvedNavigation } from '../shared/DesignParts';
import { PointMap } from './PointMap';
import { AssetView, PostMedia } from '../community/PostMedia';
import { PrivateModal } from '../shared/PrivateModal';

const art = {
  back: require('../../../assets/icons/collection/point/back.svg'),
  share: require('../../../assets/icons/collection/point/share.svg'),
  star: require('../../../assets/icons/collection/point/star.svg'),
  halfStar: require('../../../assets/icons/collection/point/half-star.svg'),
};

export function CollectionPointPage({
  point,
  photos,
  reviewing,
  onViewChange,
  onDirections,
  children,
}: PropsWithChildren<{
  point?: Schemas['CollectionPoint'];
  photos: Schemas['MediaAsset'][];
  reviewing: boolean;
  onViewChange: (reviews: boolean) => void;
  onDirections: () => void;
}>) {
  const { colors, dark } = useApp();
  const insets = useSafeAreaInsets();
  const [gallery, setGallery] = useState<number | null>(null);
  const [shareError, setShareError] = useState('');
  const background = dark ? colors.background : '#F5F5F5';
  const rating = point?.averageRating;
  const starRating = Math.round((rating ?? 0) * 2) / 2;
  const selectedPhoto = gallery == null ? undefined : photos[gallery];
  const tabs = [
    { title: 'Tổng quan', reviews: false },
    { title: 'Bài đánh giá', reviews: true },
  ];
  return (
    <Typography.Provider value="inter">
      <View style={{ flex: 1, backgroundColor: background }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ height: 403 }}>
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 448 }}>
              <PointMap coordinate={point} />
              <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
                <Svg width="100%" height="100%">
                  <Defs>
                    <LinearGradient id="pointFade" x1="0%" y1="0%" x2="3.3%" y2="100%">
                      <Stop offset="53.478%" stopColor={background} stopOpacity={0} />
                      <Stop offset="84.235%" stopColor={background} stopOpacity={1} />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#pointFade)" />
                </Svg>
              </View>
            </View>
            <StatusSpace />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingHorizontal: 14,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Quay lại điểm thu gom"
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/collection'))}
                style={{ width: 46, height: 52, justifyContent: 'center' }}
              >
                <Artwork source={art.back} width={46.044} height={52.242} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Chia sẻ điểm thu gom"
                disabled={!point}
                onPress={() => {
                  if (!point) return;
                  setShareError('');
                  void Share.share({
                    message: `${point.name}\n${point.address}\n${Linking.createURL('/points/' + point.id)}`,
                  }).catch((cause) => setShareError(errorMessage(cause)));
                }}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Artwork source={art.share} width={24} />
              </Pressable>
            </View>
            {photos.length ? (
              <View
                style={{ position: 'absolute', right: 30, top: 265, flexDirection: 'row', gap: 12 }}
              >
                {photos.slice(0, 3).map((photo, index) => (
                  <View
                    key={photo.id}
                    style={{ width: 55, height: 60, borderRadius: 8, overflow: 'hidden' }}
                  >
                    <AssetView
                      asset={photo}
                      compact
                      context="điểm thu gom"
                      imageHeight={60}
                      imageFit="cover"
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Xem ảnh điểm thu gom ${index + 1}`}
                      onPress={() => setGallery(index)}
                      style={{ position: 'absolute', inset: 0 }}
                    />
                  </View>
                ))}
                {photos.length > 3 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Xem tất cả ${photos.length} ảnh điểm thu gom`}
                    onPress={() => setGallery(3)}
                    style={{
                      width: 55,
                      height: 60,
                      borderRadius: 8,
                      backgroundColor: '#89B7CF',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Label size={16} weight="medium" color="#000000">
                      +{photos.length - 3}
                    </Label>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
          <View style={{ paddingHorizontal: 24, gap: 18, backgroundColor: background }}>
            {shareError ? <Notice tone="error">{shareError}</Notice> : null}
            {point ? (
              <>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {point.materials.map((material) => (
                    <View
                      key={material.id}
                      style={{
                        borderRadius: 20,
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                        backgroundColor: colors.soft,
                      }}
                    >
                      <Label size={12} bold color={colors.brand}>
                        {material.name}
                      </Label>
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{ flex: 1, gap: 10 }}>
                    <Label size={24} bold heading style={{ lineHeight: 30 }}>
                      {point.name}
                    </Label>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        rating == null
                          ? 'Chưa có đánh giá công bố, mở mục đánh giá'
                          : `${rating.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} trên 5 sao từ ${point.reviewCount ?? 0} đánh giá, mở mục đánh giá`
                      }
                      onPress={() => onViewChange(true)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        {rating != null ? (
                          <>
                            {[0, 1, 2, 3, 4].map((index) => (
                              <View key={index} style={{ opacity: starRating > index ? 1 : 0.25 }}>
                                <Artwork
                                  source={
                                    starRating - index > 0 && starRating - index < 1
                                      ? art.halfStar
                                      : art.star
                                  }
                                  width={22}
                                />
                              </View>
                            ))}
                            <Label size={14} bold>
                              {rating.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                            </Label>
                          </>
                        ) : (
                          <Label size={12} color={colors.muted}>
                            Chưa có đánh giá công bố
                          </Label>
                        )}
                      </View>
                    </Pressable>
                  </View>
                  <Button title="Chỉ đường" onPress={onDirections} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9 }}>
                  <Icon name="location" size={20} color="#D20B18" />
                  <Label size={14} color={colors.muted} style={{ flex: 1, lineHeight: 20 }}>
                    {point.address}
                  </Label>
                </View>
                <View style={{ flexDirection: 'row', gap: 18 }}>
                  {tabs.map((tab) => (
                    <Pressable
                      key={tab.title}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: reviewing === tab.reviews }}
                      onPress={() => onViewChange(tab.reviews)}
                      style={{
                        minHeight: 44,
                        justifyContent: 'center',
                        borderBottomWidth: reviewing === tab.reviews ? 2 : 0,
                        borderBottomColor: colors.brand,
                      }}
                    >
                      <Label
                        size={16}
                        weight="semibold"
                        color={reviewing === tab.reviews ? colors.brand : colors.text}
                      >
                        {tab.title}
                      </Label>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
            {children}
          </View>
        </ScrollView>
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <CurvedNavigation selected="collection" />
        </View>
      </View>
      <PrivateModal
        visible={!!selectedPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setGallery(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.surface,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          }}
        >
          <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
            <Button title="Đóng ảnh địa điểm" variant="quiet" onPress={() => setGallery(null)} />
            {selectedPhoto ? (
              <>
                <PostMedia assets={[selectedPhoto]} context="điểm thu gom" />
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Button
                    title="Ảnh trước"
                    variant="quiet"
                    disabled={gallery === 0}
                    onPress={() => setGallery((index) => Math.max(0, (index ?? 0) - 1))}
                  />
                  <Label size={12}>
                    {(gallery ?? 0) + 1}/{photos.length}
                  </Label>
                  <Button
                    title="Ảnh sau"
                    variant="quiet"
                    disabled={gallery === photos.length - 1}
                    onPress={() =>
                      setGallery((index) => Math.min(photos.length - 1, (index ?? 0) + 1))
                    }
                  />
                </View>
              </>
            ) : null}
          </ScrollView>
        </View>
      </PrivateModal>
    </Typography.Provider>
  );
}
