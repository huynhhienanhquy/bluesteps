import { useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { Icon, Label, Notice } from '../../design-system/ui';
import { useApp } from '../../providers';
import { errorMessage, type Schemas } from '../../services/api';
import { MediaSlot } from './DesignParts';

function articleBlocks(article: Schemas['Article']): Schemas['ContentBlock'][] {
  return article.blocks.length ? article.blocks : [{ type: 'paragraph', text: article.summary }];
}

export function expandableArticleIntro(article: Schemas['Article']) {
  const intro = articleBlocks(article).find((block) => block.type === 'paragraph')?.text ?? '';
  return intro.length > 240 || intro.split('\n').length > 4;
}

export function ArticleContent({
  article,
  expanded,
  onExpand,
}: {
  article: Schemas['Article'];
  expanded: boolean;
  onExpand: () => void;
}) {
  const { colors } = useApp();
  const [error, setError] = useState('');
  const blocks = articleBlocks(article);
  const intro = blocks.findIndex((block) => block.type === 'paragraph');
  const expandable = expandableArticleIntro(article);
  return (
    <View style={{ gap: 18 }}>
      {blocks.map((block, index) => {
        if (block.type === 'gallery') {
          const images = block.images ?? [];
          const multiple = images.length > 1;
          const pictures = images.map((picture, imageIndex) => (
            <View
              key={`${picture.url}:${imageIndex}`}
              accessible
              accessibilityLabel={
                picture.alt || picture.caption || block.text || 'Ảnh trong bài viết'
              }
              style={{ width: multiple ? 106 : '100%', gap: 7 }}
            >
              <MediaSlot
                uri={picture.url}
                style={{ height: multiple ? 96 : 210, borderRadius: 10 }}
              />
              {picture.caption ? (
                <Label
                  size={multiple ? 11 : 12}
                  color={colors.muted}
                  style={{ textAlign: 'center' }}
                >
                  {picture.caption}
                </Label>
              ) : null}
            </View>
          ));
          return (
            <View key={index} style={{ gap: 12 }}>
              {block.text ? (
                <Label size={16} bold heading>
                  {block.text}
                </Label>
              ) : null}
              {multiple ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12 }}
                >
                  {pictures}
                </ScrollView>
              ) : (
                pictures
              )}
            </View>
          );
        }
        const isIntro = index === intro;
        return (
          <View key={index} style={{ gap: 6 }}>
            <Label
              size={block.type === 'heading' ? 18 : 15}
              bold={block.type === 'heading'}
              heading={block.type === 'heading'}
              selectable
              numberOfLines={isIntro && expandable && !expanded ? 5 : undefined}
              style={{ lineHeight: block.type === 'heading' ? 25 : 23 }}
            >
              {block.text}
            </Label>
            {isIntro && expandable && !expanded ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Xem thêm phần giới thiệu bài viết"
                accessibilityState={{ expanded: false }}
                onPress={onExpand}
                style={{ minHeight: 36, alignSelf: 'flex-start', justifyContent: 'center' }}
              >
                <Label size={14} bold color={colors.primary}>
                  Xem thêm
                </Label>
              </Pressable>
            ) : null}
          </View>
        );
      })}
      {article.sources.length ? (
        <View style={{ gap: 8 }}>
          <Label size={14} bold heading>
            Nguồn bài viết
          </Label>
          {article.sources.map((source, index) => {
            const url = source.url && /^https?:\/\/[^\s]+$/i.test(source.url) ? source.url : null;
            return (
              <Pressable
                key={`${source.title}:${index}`}
                accessibilityRole={url ? 'link' : undefined}
                accessibilityLabel={source.title}
                disabled={!url}
                onPress={() => {
                  if (!url) return;
                  setError('');
                  void Linking.openURL(url).catch((cause) => setError(errorMessage(cause)));
                }}
                style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 }}
              >
                <Label size={13} color={url ? colors.primary : colors.muted} style={{ flex: 1 }}>
                  {source.title}
                </Label>
                {url ? <Icon name="open-outline" size={18} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
          {error ? <Notice tone="error">{error}</Notice> : null}
        </View>
      ) : null}
    </View>
  );
}
