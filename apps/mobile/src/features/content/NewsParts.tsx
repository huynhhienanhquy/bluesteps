import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../../providers';
import { Artwork, DesignScreen } from '../../design-system/DesignScreen';
import { newsCover } from './news-design-data';
import { Button, Card, Icon, IconButton, Label, Row } from '../../design-system/ui';
import { articleMetadata, type NewsArticle } from '../../services/news';

export function NewsPage({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <DesignScreen title={title} contentStyle={{ gap: 18, paddingBottom: 40 }}>
        {children}
      </DesignScreen>
    </KeyboardAvoidingView>
  );
}
export function NewsNavigation({
  onNavigate,
  sample = false,
}: { onNavigate?: () => void; sample?: boolean } = {}) {
  const { colors } = useApp();
  const links = [
    { label: 'Bài đã lưu', icon: 'bookmark-outline', path: '/articles/reading-list' },
    {
      label: 'Sự kiện xanh',
      icon: 'leaf-outline',
      path: '/articles/events/[id]',
      params: { id: 'nhieu-loc' },
    },
    { label: 'Chủ đề', icon: 'compass-outline', path: '/articles/topics' },
    { label: 'Lịch xanh', icon: 'calendar-outline', path: '/articles/calendar' },
    { label: 'Tin nhanh', icon: 'flash-outline', path: '/articles/briefs' },
  ] as const;
  return (
    <Row style={{ gap: 6 }}>
      {links.map((link) => (
        <Pressable
          key={link.path.toString()}
          accessibilityRole="button"
          accessibilityLabel={link.label}
          onPress={() => {
            onNavigate?.();
            if ('params' in link)
              router.push({
                pathname: link.path,
                params: { ...link.params, ...(sample ? { preview: '1' } : {}) },
              });
            else router.push({ pathname: link.path, params: sample ? { preview: '1' } : {} });
          }}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 70,
            borderRadius: 14,
            backgroundColor: colors.soft,
            gap: 5,
          }}
        >
          <Icon name={link.icon} size={22} color={colors.brand} />
          <Label size={10} bold color={colors.primaryDark}>
            {link.label}
          </Label>
        </Pressable>
      ))}
    </Row>
  );
}
export function ArticleCover({ article, height = 116 }: { article: NewsArticle; height?: number }) {
  return (
    <Artwork
      source={newsCover(article)}
      width={380}
      height={height}
      fit="cover"
      style={{ width: '100%' }}
    />
  );
}
export function ArticleCard({
  article,
  removeSaved,
}: {
  article: NewsArticle;
  removeSaved?: () => void;
}) {
  const { news, setNews, colors } = useApp();
  const metadata = articleMetadata[article.id]!;
  const saved = news.saved.includes(article.id);
  const liked = news.liked.includes(article.id);
  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: '46%',
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Đọc ${article.title}`}
        onPress={() => router.push(`/articles/${article.id}`)}
      >
        <ArticleCover article={article} />
        <View style={{ padding: 12, gap: 7 }}>
          <Label size={10} bold color={colors.brand}>
            {article.tag.toUpperCase()}
          </Label>
          <Label size={13} bold>
            {article.title}
          </Label>
          <Label size={10} color={colors.muted}>
            {metadata.minutes} phút đọc · {metadata.date.split('-').reverse().join('/')}
          </Label>
        </View>
      </Pressable>
      <Row style={{ justifyContent: 'space-between', padding: 8, paddingTop: 0, gap: 4 }}>
        <IconButton
          name={saved ? 'bookmark' : 'bookmark-outline'}
          label={`${saved ? 'Bỏ lưu bài' : 'Lưu bài'} ${article.title}`}
          selected={saved}
          onPress={() => {
            if (saved && removeSaved) removeSaved();
            else
              setNews((current) => ({
                ...current,
                saved: current.saved.includes(article.id)
                  ? current.saved.filter((id) => id !== article.id)
                  : [article.id, ...current.saved],
              }));
          }}
        />
        <IconButton
          name={liked ? 'thumbs-up' : 'thumbs-up-outline'}
          label={`${liked ? 'Bỏ thích bài' : 'Thích bài'} ${article.title}`}
          selected={liked}
          onPress={() =>
            setNews((current) => ({
              ...current,
              liked: current.liked.includes(article.id)
                ? current.liked.filter((id) => id !== article.id)
                : [...current.liked, article.id],
            }))
          }
        />
      </Row>
      <Label size={10} color={colors.muted} style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
        {metadata.views.toLocaleString('vi')} lượt xem · {metadata.likes + Number(liked)} thích mẫu
      </Label>
    </View>
  );
}
export function ArticleMissing() {
  return (
    <Card>
      <Label bold>Bài viết không tồn tại</Label>
      <Button title="Về tin tức" onPress={() => router.replace('/articles')} />
    </Card>
  );
}
