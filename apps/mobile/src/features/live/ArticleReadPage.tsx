import type { ComponentProps, PropsWithChildren, ReactNode, Ref } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusSpace } from '../../design-system/DesignScreen';
import { Icon, IconButton, Label, Typography } from '../../design-system/ui';
import { useApp } from '../../providers';
import type { Schemas } from '../../services/api';
import { CurvedNavigation, MediaSlot } from './DesignParts';
import { articleCoverUrl, estimatedReadingMinutes } from './article-reading';

export function ArticleReadPage({
  article,
  action,
  children,
  scrollRef,
  onLayout,
  onScroll,
  onContentSizeChange,
  onBodyLayout,
  onNavigationLayout,
}: PropsWithChildren<{
  article?: Schemas['Article'];
  action?: ReactNode;
  scrollRef?: Ref<ScrollView>;
  onLayout?: ComponentProps<typeof ScrollView>['onLayout'];
  onScroll?: ComponentProps<typeof ScrollView>['onScroll'];
  onContentSizeChange?: ComponentProps<typeof ScrollView>['onContentSizeChange'];
  onBodyLayout: (y: number) => void;
  onNavigationLayout: (height: number) => void;
}>) {
  const { colors } = useApp();
  const insets = useSafeAreaInsets();
  return (
    <Typography.Provider value="inter">
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <StatusSpace />
        <View>
          <MediaSlot
            code={article?.code}
            uri={articleCoverUrl(article)}
            icon="newspaper-outline"
            style={{ height: 190 }}
          />
          <View
            style={{
              position: 'absolute',
              top: 10,
              left: 12,
              borderRadius: 24,
              backgroundColor: colors.surface,
            }}
          >
            <IconButton
              name="chevron-back"
              label="Quay lại tin tức"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/articles'))}
            />
          </View>
          {action ? (
            <View
              style={{
                position: 'absolute',
                top: 10,
                right: 12,
                borderRadius: 24,
                backgroundColor: colors.surface,
              }}
            >
              {action}
            </View>
          ) : null}
        </View>
        <View
          style={{
            marginHorizontal: 24,
            marginTop: -30,
            borderRadius: 20,
            padding: 16,
            gap: 10,
            backgroundColor: colors.surface,
            boxShadow: '0px 4px 4px rgba(0,0,0,0.15)',
          }}
        >
          <Label size={16} weight="semibold" heading style={{ lineHeight: 23 }}>
            {article?.title ?? 'Bài viết'}
          </Label>
          {article ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <Icon name="time-outline" size={16} color={colors.muted} />
              <Label size={11} color={colors.muted}>
                Khoảng {estimatedReadingMinutes(article)} phút đọc
              </Label>
              <Label size={11} color={colors.muted}>
                · {article.topic}
              </Label>
            </View>
          ) : null}
        </View>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          onLayout={onLayout}
          onScroll={onScroll}
          scrollEventThrottle={250}
          onContentSizeChange={onContentSizeChange}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
        >
          <View
            onLayout={(event) => onBodyLayout(event.nativeEvent.layout.y + 24)}
            style={{ paddingHorizontal: 24, paddingTop: 24, gap: 20 }}
          >
            {children}
          </View>
        </ScrollView>
        <View
          onLayout={(event) => onNavigationLayout(event.nativeEvent.layout.height)}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
        >
          <CurvedNavigation variant="news" />
        </View>
      </View>
    </Typography.Provider>
  );
}
