import { useState, type PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Artwork } from '../../design-system/DesignScreen';
import { newsExtendedAssets } from '../../design-system/news-extended-assets';
import { NewsDesignNavigation, NewsText as T } from './NewsDesignParts';

export type ExtendedFrame = '680:5343' | '680:5406' | '680:5461';
export function NewsExtendedPage({
  frame,
  title,
  subtitle,
  children,
}: PropsWithChildren<{ frame: ExtendedFrame; title: string; subtitle: string }>) {
  const [width, setWidth] = useState(428);
  const insets = useSafeAreaInsets();
  const s = width / 428;
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        testID={`news-extended-${frame}`}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ flex: 1, backgroundColor: '#F0F9FF', paddingTop: insets.top }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 23 * s }}
        >
          <View
            style={{
              marginHorizontal: 28 * s,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 13 * s,
              minHeight: 34 * s,
            }}
          >
            <ExtendedBack size={34 * s} />
            <T
              accessibilityRole="header"
              size={25 * s}
              lineHeight={30 * s}
              weight="bold"
              color="#0F172A"
              style={{ flex: 1 }}
            >
              {title}
            </T>
          </View>
          <T
            size={12 * s}
            lineHeight={16 * s}
            color="#6E7A87"
            style={{ marginLeft: 30 * s, marginRight: 28 * s, marginTop: 9 * s, minHeight: 38 * s }}
          >
            {subtitle}
          </T>
          <View style={{ marginHorizontal: 28 * s, marginTop: 10 * s }}>{children}</View>
        </ScrollView>
        <View style={{ paddingBottom: insets.bottom }}>
          <NewsDesignNavigation
            source={newsExtendedAssets[frame]}
            offsetX={4}
            testPrefix="news-extended-nav"
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
export function ExtendedBack({ size = 34 }: { size?: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Quay lại"
      hitSlop={8}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/articles'))}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <T size={18} lineHeight={24} weight="semibold" color="#0B2E4F">
        ‹
      </T>
    </Pressable>
  );
}

export function NewsReadingRow({
  title,
  tag,
  meta,
  cover,
  scale = 1,
  onPress,
  testID,
}: {
  title: string;
  tag: string;
  meta: string;
  cover: number;
  scale?: number;
  onPress: () => void;
  testID?: string;
}) {
  const s = scale;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Đọc ${title}`}
      onPress={onPress}
      style={{
        padding: 10 * s,
        borderRadius: 16 * s,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        gap: 14 * s,
        alignItems: 'flex-start',
        minHeight: 112 * s,
      }}
    >
      <Artwork
        source={cover}
        testID={testID}
        width={116 * s}
        height={92 * s}
        fit="cover"
        style={{ borderRadius: 10 * s }}
      />
      <View style={{ flex: 1, paddingTop: 2 * s }}>
        <T size={10 * s} lineHeight={12 * s} weight="bold" color="#147CC1">
          {tag}
        </T>
        <T
          size={14 * s}
          lineHeight={17 * s}
          weight="semibold"
          color="#0F172A"
          style={{ marginTop: 10 * s, minHeight: 47 * s }}
        >
          {title}
        </T>
        <T size={10 * s} lineHeight={13 * s} color="#6E7A87" style={{ marginTop: 3 * s }}>
          {meta}
        </T>
      </View>
    </Pressable>
  );
}
