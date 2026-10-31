import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../providers';
import { Button, Card, Label } from '../../design-system/ui';
import { articles } from '../../services/fixtures';
import { articleMetadata } from '../../services/news';
import { ArticleCard, ArticleCover, ArticleMissing, NewsPage } from './NewsParts';
import { ArticlesScreen as NewsSearchScreen } from './NewsFeedScreen';
import { NewsLandingScreen } from './NewsLandingScreen';
import { NewsArticleScreen, newsArticleFrame } from './NewsArticleScreen';

export function ArticlesScreen({ savedOnly = false }: { savedOnly?: boolean }) {
  const params = useLocalSearchParams<{
    view?: string;
    q?: string;
    topic?: string;
    preview?: string;
  }>();
  if (savedOnly || params.view === 'search' || params.q !== undefined || params.topic !== undefined)
    return <NewsSearchScreen savedOnly={savedOnly} />;
  const view = params.view === 'latest' || params.view === 'events' ? params.view : 'all';
  return (
    <NewsLandingScreen
      key={`${view}:${params.preview}`}
      view={view}
      sample={params.preview === '1'}
    />
  );
}

export function ArticleDetailScreen() {
  const { id, preview, expanded } = useLocalSearchParams<{
    id: string;
    preview?: string;
    expanded?: string;
  }>();
  const article = articles.find((item) => item.id === id);
  if (article && newsArticleFrame(article.id)) {
    return (
      <NewsArticleScreen
        key={`${id}:${preview}:${expanded}`}
        article={article}
        sample={preview === '1'}
        initiallyExpanded={expanded === '1'}
      />
    );
  }
  return <GenericArticleDetailScreen />;
}

function GenericArticleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { news, setNews, colors } = useApp();
  const article = articles.find((item) => item.id === id);
  const metadata = article ? articleMetadata[article.id]! : undefined;
  const saved = !!article && news.saved.includes(article.id);
  const liked = !!article && news.liked.includes(article.id);
  return (
    <NewsPage title="Bài viết">
      {!article || !metadata ? (
        <ArticleMissing />
      ) : (
        <>
          <Label size={12} bold color={colors.brand}>
            {article.tag.toUpperCase()} · NỘI DUNG DEMO
          </Label>
          <Label size={25} bold heading>
            {article.title}
          </Label>
          <Label size={12} color={colors.muted}>
            {metadata.minutes} phút đọc · {metadata.date.split('-').reverse().join('/')} · BlueSteps
            mẫu
          </Label>
          <View style={{ borderRadius: 20, overflow: 'hidden' }}>
            <ArticleCover article={article} height={220} />
          </View>
          <Label size={17} bold>
            {metadata.summary}
          </Label>
          {article.body.split('\n\n').map((paragraph, index) => (
            <Label key={index} size={15}>
              {paragraph}
            </Label>
          ))}
          <Card style={{ backgroundColor: colors.soft }}>
            <Label size={15} bold>
              Đọc và thực hành
            </Label>
            <Label size={13}>
              Tìm hiểu hướng dẫn của điểm thu gom tại địa phương trước khi mang vật liệu đến.
            </Label>
            <Button
              title="Tra sổ tay vật liệu"
              variant="quiet"
              onPress={() => router.push('/handbook')}
            />
          </Card>
          <Button
            title={saved ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}
            icon={saved ? 'bookmark' : 'bookmark-outline'}
            variant="secondary"
            onPress={() =>
              setNews((current) => ({
                ...current,
                saved: current.saved.includes(article.id)
                  ? current.saved.filter((value) => value !== article.id)
                  : [article.id, ...current.saved],
              }))
            }
          />
          <Button
            title={`${liked ? 'Bỏ thích' : 'Thích'} · ${metadata.likes + Number(liked)} lượt thích mẫu`}
            icon="thumbs-up-outline"
            variant="secondary"
            onPress={() =>
              setNews((current) => ({
                ...current,
                liked: current.liked.includes(article.id)
                  ? current.liked.filter((value) => value !== article.id)
                  : [...current.liked, article.id],
              }))
            }
          />
          <Button
            title={`Thảo luận bài viết · ${news.comments.filter((comment) => comment.articleId === article.id).length}`}
            icon="chatbubbles-outline"
            onPress={() => router.push(`/articles/discussion?id=${article.id}`)}
          />
          <Button
            title="Xem bài viết đã lưu"
            variant="quiet"
            onPress={() => router.push('/articles/saved')}
          />
          <Label size={17} bold heading>
            Đọc thêm cùng chủ đề
          </Label>
          {articles
            .filter((item) => item.id !== article.id && item.tag === article.tag)
            .map((item) => (
              <ArticleCard key={item.id} article={item} />
            ))}
          {!articles.some((item) => item.id !== article.id && item.tag === article.tag) ? (
            <Button
              title="Khám phá các chủ đề khác"
              variant="secondary"
              onPress={() => router.push('/articles/topics')}
            />
          ) : null}
        </>
      )}
    </NewsPage>
  );
}
