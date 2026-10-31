import { useRef, useState, type ComponentRef } from 'react';
import { Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Artwork } from '../../design-system/DesignScreen';
import { LegacyStatusBar } from '../../design-system/LegacyCanvas';
import { newsDetailAssets } from '../../design-system/news-detail-assets';
import { useApp } from '../../providers';
import { articleMetadata, createNewsSession, type NewsArticle } from '../../services/news';
import { Button } from '../../design-system/ui';
import { NewsDesignNavigation, NewsText as T } from './NewsDesignParts';
import { newsDetailDesignData } from './news-detail-design-data';

type Frame = keyof typeof newsDetailDesignData;
type Box = { x: number; y: number; w: number; h: number };
type Run = { text: string; size: number; weight: string; lineHeight: number; color: string };
type Block = { marker?: string; indent?: number; runs: Run[] };
type RichText = Box & { id: string; text: string; blocks: Block[] };
type Picture = Box & {
  id: string;
  key: string;
  fit: string;
  radius: number;
  flipX: boolean;
  crop?: number[][];
};
type Section = Box & { id: string; kind: string; texts: RichText[]; images: Picture[] };

export function newsArticleFrame(id: string, expanded = false): Frame | undefined {
  return (Object.keys(newsDetailDesignData) as Frame[]).find((frame) => {
    const data = newsDetailDesignData[frame];
    return data.articleId === id && (id !== 'daily-waste' || data.expanded === expanded);
  });
}

/** The saved design supplies rich copy and media; all interactions remain native. */
export function NewsArticleScreen({
  article,
  sample = false,
  initiallyExpanded = false,
}: {
  article: NewsArticle;
  sample?: boolean;
  initiallyExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const frame = newsArticleFrame(article.id, expanded)!;
  const data = newsDetailDesignData[frame];
  const assets: Record<string, number> = newsDetailAssets[frame];
  const { news, setNews } = useApp();
  const [example, setExample] = useState(createNewsSession);
  const session = sample ? example : news;
  const update = sample ? setExample : setNews;
  const [width, setWidth] = useState(428);
  const scale = width / 428;
  const insets = useSafeAreaInsets();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const saved = session.saved.includes(article.id);
  const liked = session.liked.includes(article.id);
  const metadata = articleMetadata[article.id]!;
  const toggle = (field: 'saved' | 'liked') =>
    update((current) => ({
      ...current,
      [field]: current[field].includes(article.id)
        ? current[field].filter((id) => id !== article.id)
        : [...current[field], article.id],
    }));
  const discussion = () =>
    router.push({
      pathname: '/articles/discussion',
      params: { id: article.id, ...(sample ? { preview: '1' } : {}) },
    });
  const changeExpansion = () => {
    setExpanded((value) => !value);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  return (
    <View
      testID={`news-article-${frame}`}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ flex: 1, backgroundColor: '#EFEDED' }}
    >
      <View style={{ height: 254 * scale, marginTop: Platform.OS === 'web' ? 0 : insets.top }}>
        <Artwork source={assets[data.hero]} width={width} height={254 * scale} fit="cover" />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
          <LegacyStatusBar assets={newsDetailAssets[frame]} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          hitSlop={10}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/articles'))}
          style={{
            position: 'absolute',
            top: (Platform.OS === 'web' ? 52 : 10) * scale,
            left: 10 * scale,
            width: 28 * scale,
            height: 28 * scale,
            borderRadius: 20,
            backgroundColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Artwork source={assets.back ?? newsDetailAssets['386:17608'].back} width={22 * scale} />
        </Pressable>
      </View>
      <View
        style={{
          marginTop: -44 * scale,
          marginHorizontal: 23 * scale,
          minHeight: 87 * scale,
          paddingTop: 8 * scale,
          paddingBottom: 14 * scale,
          paddingLeft: 23 * scale,
          paddingRight: 6 * scale,
          borderRadius: 20 * scale,
          backgroundColor: '#FFFFFF',
          boxShadow: '0px 4px 4px rgba(0,0,0,0.25)',
        }}
      >
        <T
          accessibilityRole="header"
          size={16 * scale}
          lineHeight={19 * scale}
          weight="semibold"
          color="#000000"
          style={{ width: Math.min(data.titleBox.w * scale, width - 98 * scale) }}
        >
          {data.title.trim()}
        </T>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 8 * scale,
            gap: 7 * scale,
            minHeight: 19 * scale,
          }}
        >
          <Artwork source={assets.clock} width={16 * scale} />
          <T size={11 * scale} lineHeight={13 * scale} color="#7B7777">
            {data.minutes}
          </T>
          <View
            style={{
              marginLeft: 8 * scale,
              borderRadius: 5 * scale,
              backgroundColor: '#78B0CE',
              paddingHorizontal: 8 * scale,
              paddingVertical: 3 * scale,
            }}
          >
            <T size={11 * scale} lineHeight={13 * scale} weight="semibold" color="#FFFFFF">
              Tale
            </T>
          </View>
          <T size={11 * scale} lineHeight={13 * scale} color="#7B7777">
            Tái Chế
          </T>
          {data.discussion ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Bình luận bài viết"
              hitSlop={8}
              onPress={discussion}
              style={{
                marginLeft: 'auto',
                paddingHorizontal: 10 * scale,
                paddingVertical: 5 * scale,
                borderRadius: 15,
                backgroundColor: '#D9F0FC',
              }}
            >
              <T size={11 * scale} weight="semibold" color="#147CC1">
                Bình luận →
              </T>
            </Pressable>
          ) : null}
        </View>
      </View>
      <ScrollView
        ref={scroll}
        testID="article-body"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 18 * scale, paddingBottom: 16, gap: 10 * scale }}
      >
        {(data.sections as Section[]).map((section, index) => (
          <ArticleSection
            key={`${frame}:${section.id}`}
            section={section}
            scale={scale}
            assets={assets}
            intro={index === 0}
            expanded={expanded}
            daily={article.id === 'daily-waste'}
            onExpand={changeExpansion}
            expandedCopy={article.body}
          />
        ))}
        <View style={{ padding: 20, gap: 12 }}>
          <Button
            title={saved ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}
            icon={saved ? 'bookmark' : 'bookmark-outline'}
            variant="secondary"
            onPress={() => toggle('saved')}
          />
          <Button
            title={`${liked ? 'Bỏ thích' : 'Thích'} · ${metadata.likes + Number(liked)} lượt thích mẫu`}
            icon="thumbs-up-outline"
            variant="secondary"
            onPress={() => toggle('liked')}
          />
          <Button
            title={`Thảo luận bài viết · ${session.comments.filter((comment) => comment.articleId === article.id).length}`}
            icon="chatbubbles-outline"
            onPress={discussion}
          />
          <Button
            title="Xem bài viết đã lưu"
            variant="quiet"
            onPress={() => router.push(sample ? '/articles/saved?preview=1' : '/articles/saved')}
          />
          <T size={12} color="#677C8C">
            Nội dung minh họa theo thiết kế. Lưu và thích trong phiên demo.
          </T>
        </View>
      </ScrollView>
      <View
        style={{
          backgroundColor: '#EFEDED',
          paddingBottom: Platform.OS === 'web' ? 0 : insets.bottom,
        }}
      >
        <NewsDesignNavigation source={newsDetailAssets[frame]} offsetX={data.navOffset} />
      </View>
    </View>
  );
}

function ArticleSection({
  section,
  scale,
  assets,
  intro,
  expanded,
  daily,
  onExpand,
  expandedCopy,
}: {
  section: Section;
  scale: number;
  assets: Record<string, number>;
  intro: boolean;
  expanded: boolean;
  daily: boolean;
  onExpand: () => void;
  expandedCopy: string;
}) {
  const [textBottom, setTextBottom] = useState(0);
  const { fontScale } = useWindowDimensions();
  // Keep prose in natural flow so native font metrics cannot hide the final lines.
  if (intro || section.kind === 'actions')
    return (
      <View style={{ paddingHorizontal: 18 * scale, gap: 14 * scale }}>
        {section.texts.map((text, index) => {
          const expandable = intro && index === 0;
          const copy = expandable
            ? {
                ...text,
                blocks: text.blocks.map((block) => ({
                  ...block,
                  runs: block.runs.map((run) => ({
                    ...run,
                    text: run.text.replace(/\.{3}xem thêm/g, ''),
                  })),
                })),
              }
            : text;
          const richText = (
            <ArticleRichText
              text={copy}
              scale={scale}
              expansion={expandable ? expanded : undefined}
            />
          );
          return (
            <View key={text.id}>
              {expandable ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={expanded ? 'Thu gọn bài viết' : 'Xem thêm bài viết'}
                  accessibilityHint={copy.text.replace(/\.{3}xem thêm/g, '')}
                  accessibilityState={{ expanded }}
                  onPress={onExpand}
                  style={{ minHeight: 44 }}
                >
                  {richText}
                </Pressable>
              ) : (
                richText
              )}
              {expandable && expanded && !daily ? (
                <T
                  size={14 * scale}
                  lineHeight={19 * scale}
                  style={{ marginTop: 12 * scale }}
                  color="#000000"
                >
                  {expandedCopy}
                </T>
              ) : null}
            </View>
          );
        })}
      </View>
    );
  if (Platform.OS !== 'web' && fontScale > 1.05) {
    return <AccessibleArticleMedia section={section} scale={scale} assets={assets} />;
  }
  // The media collages are deliberately positioned by the saved section geometry.
  return (
    <View
      style={{
        minHeight: Math.max(section.h * scale, textBottom),
        marginBottom: section.kind === 'materials' ? 22 * scale : 0,
      }}
    >
      {section.images.map((picture) => (
        <View
          key={picture.id}
          style={{
            position: 'absolute',
            left: (picture.x - (section.kind === 'materials' ? 5 : 0)) * scale,
            top: (picture.y - section.y - (section.kind === 'materials' ? 5 : 0)) * scale,
            width: (picture.w + (section.kind === 'materials' ? 10 : 0)) * scale,
            height: (picture.h + (section.kind === 'materials' ? 10 : 0)) * scale,
            borderRadius: picture.radius * scale,
            padding: section.kind === 'materials' ? 5 * scale : 0,
            backgroundColor: section.kind === 'materials' ? '#F8F6F6' : undefined,
          }}
        >
          <ArticlePicture picture={picture} scale={scale} source={assets[picture.key]!} />
        </View>
      ))}
      {section.texts.map((text, index) => (
        <View
          key={text.id}
          onLayout={(event) => {
            const bottom = (text.y - section.y) * scale + event.nativeEvent.layout.height;
            setTextBottom((current) => Math.max(current, bottom));
          }}
          style={{
            position: 'absolute',
            left: text.x * scale,
            top: (text.y - section.y) * scale,
            width: text.w * scale,
            ...(section.kind === 'materials' && index > 0
              ? {
                  backgroundColor: '#147CC1',
                  borderRadius: 5 * scale,
                  paddingHorizontal: 4 * scale,
                  marginLeft: -8 * scale,
                  width: (text.w + 16) * scale,
                  minHeight: 16 * scale,
                  justifyContent: 'center' as const,
                  alignItems: 'stretch' as const,
                  marginTop: -3 * scale,
                }
              : {}),
          }}
        >
          <ArticleRichText text={text} scale={scale} />
        </View>
      ))}
    </View>
  );
}

/** Let enlarged native text reflow instead of colliding with the fixed design collage. */
function AccessibleArticleMedia({
  section,
  scale,
  assets,
}: {
  section: Section;
  scale: number;
  assets: Record<string, number>;
}) {
  const [heading, ...copy] = section.texts;
  return (
    <View style={{ paddingHorizontal: 12 * scale, gap: 14 * scale }}>
      {heading ? <ArticleRichText text={heading} scale={scale} /> : null}
      {section.kind === 'materials' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 * scale }}>
          {section.images.map((picture, index) => (
            <View
              key={picture.id}
              style={{ flexBasis: '44%', flexGrow: 1, alignItems: 'center', gap: 8 * scale }}
            >
              <View
                style={{ padding: 5 * scale, borderRadius: 15 * scale, backgroundColor: '#F8F6F6' }}
              >
                <ArticlePicture picture={picture} scale={scale} source={assets[picture.key]!} />
              </View>
              {copy[index] ? (
                <View
                  style={{
                    alignSelf: 'stretch',
                    padding: 5 * scale,
                    borderRadius: 5 * scale,
                    backgroundColor: '#147CC1',
                  }}
                >
                  <ArticleRichText text={copy[index]!} scale={scale} />
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        <>
          {copy.map((text) => (
            <ArticleRichText key={text.id} text={text} scale={scale} />
          ))}
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', gap: 12 * scale }}>
            {section.images.map((picture) => (
              <ArticlePicture
                key={picture.id}
                picture={picture}
                scale={scale}
                source={assets[picture.key]!}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function ArticlePicture({
  picture,
  scale,
  source,
}: {
  picture: Picture;
  scale: number;
  source: number;
}) {
  const crop = picture.crop;
  return (
    <View
      style={{
        width: picture.w * scale,
        height: picture.h * scale,
        borderRadius: picture.radius * scale,
        overflow: 'hidden',
        transform: picture.flipX ? [{ scaleX: -1 }] : undefined,
      }}
    >
      <Artwork
        source={source}
        width={(picture.w * scale) / (crop?.[0]?.[0] ?? 1)}
        height={picture.h * scale}
        fit={picture.fit === 'cover' ? 'cover' : 'fill'}
        style={
          crop
            ? {
                position: 'absolute',
                left: (-(crop[0]?.[2] ?? 0) / (crop[0]?.[0] ?? 1)) * picture.w * scale,
                top: -(crop[1]?.[2] ?? 0) * picture.h * scale,
              }
            : undefined
        }
      />
    </View>
  );
}

function ArticleRichText({
  text,
  scale,
  expansion,
}: {
  text: RichText;
  scale: number;
  expansion?: boolean;
}) {
  return (
    <View>
      {text.blocks.map((block, index) => {
        const first = block.runs[0];
        if (!first) return null;
        return (
          <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            {block.marker ? (
              <T
                size={first.size * scale}
                lineHeight={first.lineHeight * scale}
                color={first.color}
                weight={first.weight as 'regular'}
                style={{ width: (block.indent ?? 15) * scale }}
              >
                {block.marker}
              </T>
            ) : null}
            <Text
              style={{
                flex: 1,
                fontSize: first.size * scale,
                lineHeight: first.lineHeight * scale,
                includeFontPadding: false,
              }}
            >
              {block.runs.map((run, runIndex) => (
                <Text
                  key={runIndex}
                  style={{
                    fontFamily: `BackupInter_${{ regular: '400Regular', medium: '500Medium', semibold: '600SemiBold', bold: '700Bold' }[run.weight] ?? '400Regular'}`,
                    fontSize: run.size * scale,
                    lineHeight: run.lineHeight * scale,
                    color: run.color,
                  }}
                >
                  {run.text}
                </Text>
              ))}
              {expansion !== undefined && index === text.blocks.length - 1 ? (
                <Text style={{ fontFamily: 'BackupInter_700Bold', color: '#000000' }}>
                  {expansion ? ' Thu gọn' : '...xem thêm'}
                </Text>
              ) : null}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
