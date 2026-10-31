import { useState, type PropsWithChildren, type ReactNode } from 'react';
import {
  Platform,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
  type TextProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { Artwork } from '../../design-system/DesignScreen';
import { newsDesignAssets } from '../../design-system/news-design-assets';
import { CollectionText, CollectionSheet, CollectionAction } from '../collection/CollectionPage';
import { articleMetadata, type NewsArticle } from '../../services/news';
import { designTitles, newsCover } from './news-design-data';

export { CollectionSheet as NewsSheet, CollectionAction as NewsAction };
export function NewsText({
  size = 14,
  ...props
}: TextProps & {
  size?: number;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  color?: string;
  lineHeight?: number;
}) {
  return <CollectionText size={size} lineHeight={size * 1.21} {...props} />;
}

type NavigationAssets = Pick<
  (typeof newsDesignAssets)['609:5165'],
  | 'imgRectangle87'
  | 'imgGroup'
  | 'imgGroup1'
  | 'imgGroup2'
  | 'imgGroup37108'
  | 'imgGroup36731'
  | 'imgLine1'
>;
export function NewsDesignNavigation({
  source: a,
  offsetX = 0,
  testPrefix,
}: {
  source: NavigationAssets;
  offsetX?: number;
  testPrefix?: string;
}) {
  const [width, setWidth] = useState(428);
  const scale = width / 428;
  const rect = (left: number, top: number, right: number, bottom: number) =>
    [left * 4.28, top * 1.16, (100 - left - right) * 4.28, (100 - top - bottom) * 1.16] as const;
  const grow = ([x, y, w, h]: readonly number[], horizontal: number, vertical: number) =>
    [
      x! - (w! * horizontal) / 100,
      y! - (h! * vertical) / 100,
      w! * (1 + (2 * horizontal) / 100),
      h! * (1 + (2 * vertical) / 100),
    ] as const;
  const scan = rect(41.36, 0, 41.12, 35.34);
  const layers = [
    ['imgRectangle87', rect(39.49, 42.24, 38.32, 0)],
    ['imgGroup', rect(85.28, 50, 8.18, 25.86)],
    ['imgGroup1', grow(rect(65.65, 50, 27.8, 25.86), 2.68, 2.68)],
    ['imgGroup2', grow(rect(28.5, 50, 64.95, 23.67), 2.68, 2.46)],
    ['imgGroup37108', [428 * 0.028, 51, 428 * (1 - 0.028 - 0.7687), 47]],
    ['imgGroup36731', [scan[0] - scan[2] * 0.0533, scan[1], scan[2] * 1.1066, scan[3] * 1.1067]],
    ['imgLine1', [428 * 0.3575, 116 * 0.9483 - 2.56, 428 * (1 - 0.3575 - 0.3131), 2.56]],
  ] as const;
  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ width: '100%', height: 116 * scale, overflow: 'hidden' }}
    >
      <View
        style={{
          position: 'absolute',
          left: (-428 * 0.0187 + offsetX) * scale,
          top: 116 * 0.3362 * scale,
          width: 428 * 0.4323 * scale,
          height: 116 * 0.6638 * scale,
          backgroundColor: '#147CC1',
          borderBottomLeftRadius: 25,
          borderTopRightRadius: 35,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: (-428 * 0.0187 - offsetX) * scale,
          top: 116 * 0.3534 * scale,
          width: 428 * 0.4323 * scale,
          height: 116 * 0.6466 * scale,
          backgroundColor: '#147CC1',
          borderBottomRightRadius: 25,
          borderTopLeftRadius: 35,
        }}
      />
      {layers
        .filter(([key]) => Platform.OS === 'web' || key !== 'imgLine1')
        .map(([key, r]) => (
          <Artwork
            key={key}
            source={a[key]}
            testID={testPrefix ? `${testPrefix}-${key}` : undefined}
            width={r[2] * scale}
            height={r[3] * scale}
            fit="fill"
            style={{ position: 'absolute', left: (r[0] + offsetX) * scale, top: r[1] * scale }}
          />
        ))}
      {(
        [
          ['Trang chủ', '/', 0.028, 0.2033],
          ['Thu gom', '/collection', 0.25, 0.18],
          ['Đổi quà', '/rewards', 0.64, 0.18],
          ['Cá nhân', '/profile', 0.83, 0.17],
        ] as const
      ).map(([label, path, left, w]) => (
        <Pressable
          key={label}
          accessibilityRole="tab"
          accessibilityLabel={label}
          accessibilityState={{ selected: label === 'Trang chủ' }}
          onPress={() => router.replace(path)}
          style={{
            position: 'absolute',
            left: width * left + offsetX * scale,
            top: 49 * scale,
            width: width * w,
            height: 50 * scale,
          }}
        />
      ))}
      <Pressable
        accessibilityRole="tab"
        accessibilityLabel="Quét rác"
        onPress={() => router.push('/scan')}
        style={{
          position: 'absolute',
          left: width * 0.4 + offsetX * scale,
          top: 0,
          width: width * 0.2,
          height: 83 * scale,
        }}
      />
    </View>
  );
}

export function NewsDesignPage({
  children,
  savedOnly = false,
  title,
  frame,
  journal = false,
  journalSubtitle = 'Chọn câu chuyện truyền cảm hứng cho bạn.',
  journalLabel = 'GREENSTEPS JOURNAL',
  journalBack = false,
  headerAction,
  backTo,
}: PropsWithChildren<{
  savedOnly?: boolean;
  title: string;
  frame?: '609:5165' | '609:5266' | '609:5361' | '612:5286' | '612:5362' | '612:5441';
  journal?: boolean;
  journalSubtitle?: string;
  journalLabel?: string;
  journalBack?: boolean;
  headerAction?: ReactNode;
  backTo?: Href;
}>) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [width, setWidth] = useState(428);
  const a = newsDesignAssets[frame ?? (savedOnly ? '609:5266' : '609:5165')];
  const scale = width / 428;
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <View
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={{
          flex: 1,
          backgroundColor: journal ? '#F1F9FD' : '#EEF8FE',
          overflow: 'hidden',
          borderRadius: Platform.OS === 'web' ? 28 : 0,
          paddingTop: Platform.OS === 'web' ? 0 : insets.top,
        }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            minHeight: height,
            paddingBottom: 140 * scale + (Platform.OS === 'web' ? 0 : insets.bottom),
          }}
        >
          {Platform.OS === 'web' ? (
            <View style={{ height: 49, marginHorizontal: 16 }}>
              <Artwork
                source={a.imgTime}
                width={52}
                height={21}
                style={{ position: 'absolute', left: 12, top: 12 }}
              />
              <Artwork
                source={a.imgRectangle}
                width={22}
                height={11.333}
                style={{ position: 'absolute', right: 27, top: 17.333 }}
              />
              <Artwork
                source={a.imgCombinedShape}
                width={1.328}
                height={4}
                style={{ position: 'absolute', right: 24.67, top: 21 }}
              />
              <Artwork
                source={a.imgRectangle1}
                width={18}
                height={7.333}
                style={{ position: 'absolute', right: 29, top: 19.333 }}
              />
              <Artwork
                source={a.imgWifi}
                width={15.272}
                height={10.965}
                style={{ position: 'absolute', right: 54.03, top: 17.333 }}
              />
              <Artwork
                source={a.imgMobileSignal}
                width={17}
                height={10.666}
                style={{ position: 'absolute', right: 74.33, top: 17.667 }}
              />
            </View>
          ) : null}
          {journal ? (
            <View style={{ paddingHorizontal: 24, paddingTop: 21 }}>
              <NewsText size={11} weight="bold" color="#167EC1" style={{ height: 24 }}>
                {journalLabel}
              </NewsText>
              {journalBack ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Quay lại"
                  hitSlop={8}
                  onPress={() =>
                    router.canGoBack() ? router.back() : router.replace(backTo ?? '/articles')
                  }
                  style={{
                    position: 'absolute',
                    right: 21,
                    top: 11,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#D9F0FC',
                  }}
                >
                  <NewsText
                    size={11}
                    weight="semibold"
                    color="#147CC1"
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 6,
                      width: 32,
                      textAlign: 'center',
                    }}
                  >
                    ‹
                  </NewsText>
                </Pressable>
              ) : null}
              <NewsText
                accessibilityRole="header"
                size={27}
                weight="bold"
                color="#163345"
                style={{ marginTop: 1 }}
              >
                {title}
              </NewsText>
              <NewsText size={13} color="#5B7385" style={{ marginTop: 8.33, height: 24 }}>
                {journalSubtitle}
              </NewsText>
              {headerAction ? (
                <View style={{ position: 'absolute', right: 24, top: 21 }}>{headerAction}</View>
              ) : null}
            </View>
          ) : (
            <View
              style={{
                marginTop: 15,
                marginHorizontal: 24,
                height: 42,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Quay lại"
                onPress={() =>
                  router.canGoBack()
                    ? router.back()
                    : router.replace(backTo ?? (savedOnly ? '/articles' : '/'))
                }
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  borderWidth: 1,
                  borderColor: '#DBE9F1',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <NewsText
                  size={21}
                  weight="semibold"
                  color="#1975B5"
                  style={{ position: 'absolute', left: 11, top: 6 }}
                >
                  ‹
                </NewsText>
              </Pressable>
              <NewsText
                accessibilityRole="header"
                size={23}
                weight="bold"
                color="#152F41"
                style={{ flex: 1, transform: [{ translateY: 2 }] }}
              >
                {title}
              </NewsText>
            </View>
          )}
          <View style={{ paddingHorizontal: 24 }}>{children}</View>
        </ScrollView>
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingBottom: Platform.OS === 'web' ? 0 : insets.bottom,
            backgroundColor: 'transparent',
          }}
        >
          <NewsDesignNavigation source={a} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export function NewsDesignCard({
  article,
  width,
  savedOnly,
  saved,
  liked,
  onSave,
  onLike,
}: {
  article: NewsArticle;
  width: number;
  savedOnly: boolean;
  saved: boolean;
  liked: boolean;
  onSave: () => void;
  onLike: () => void;
}) {
  const a = newsDesignAssets['609:5165'];
  const s = newsDesignAssets['609:5266'];
  const metadata = articleMetadata[article.id]!;
  const leftPhoto = ['storm-cleanup', 'local-cleanup', 'ha-long'].includes(article.id);
  const cover =
    savedOnly && article.id === 'green-sunday'
      ? s.imgRectangle942
      : savedOnly && article.id === 'saigon-cleanup'
        ? s.imgRectangle937
        : newsCover(article);
  const imageX = width * (leftPhoto ? 0.0529 : 0.0588);
  const heartX = width * (leftPhoto ? 0.8471 : 0.8529);
  return (
    <View
      style={{
        width,
        height: 174,
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        boxShadow: '0px 4px 4px rgba(0,0,0,0.25)',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Đọc ${article.title}`}
        onPress={() => router.push(`/articles/${article.id}`)}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Artwork
          source={cover}
          width={width * 0.8824}
          height={174 * 0.5173}
          fit="cover"
          style={{ position: 'absolute', left: imageX, top: 174 * 0.0632, borderRadius: 10 }}
        />
        <NewsText
          size={12}
          weight={leftPhoto ? 'semibold' : 'bold'}
          color="#000000"
          numberOfLines={2}
          style={{
            position: 'absolute',
            left: width * 0.0647,
            top: 174 * 0.6264,
            width: width * (leftPhoto ? 0.8765 : 0.8882),
            height: 174 * 0.1725,
          }}
        >
          {designTitles[article.id] ?? article.title}
        </NewsText>
        <Artwork
          source={savedOnly ? s.imgImage42 : a.imgImage37}
          width={width * 0.0882}
          fit="cover"
          style={{ position: 'absolute', left: width * 0.0765, top: 146 }}
        />
        <NewsText
          size={10}
          weight="bold"
          color="#7F7F7F"
          style={{ position: 'absolute', left: width * 0.1647, top: 174 * 0.8448 }}
        >
          {metadata.views >= 1000
            ? `${Number((metadata.views / 1000).toFixed(1))}k`
            : metadata.views}
        </NewsText>
        <NewsText
          size={10}
          weight="bold"
          color="#7F7F7F"
          style={{ position: 'absolute', left: width * 0.8588, top: 174 * 0.8391 }}
        >
          {metadata.likes + Number(liked)}
        </NewsText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${saved ? 'Bỏ lưu bài' : 'Lưu bài'} ${article.title}`}
        accessibilityState={{ selected: saved }}
        onPress={onSave}
        hitSlop={10}
        style={{
          position: 'absolute',
          left: heartX,
          top: leftPhoto ? 109 : 106,
          opacity: saved ? 1 : 0.35,
        }}
      >
        <Artwork
          source={savedOnly ? s.imgImage44 : a.imgImage36}
          width={width * 0.0882}
          fit="cover"
        />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${liked ? 'Bỏ thích bài' : 'Thích bài'} ${article.title}`}
        accessibilityState={{ selected: liked }}
        onPress={onLike}
        hitSlop={10}
        style={{ position: 'absolute', left: width * 0.7706, top: 145, opacity: liked ? 0.65 : 1 }}
      >
        <Artwork
          source={savedOnly ? s.imgImage43 : a.imgImage38}
          width={width * 0.0765}
          fit="cover"
        />
      </Pressable>
    </View>
  );
}
