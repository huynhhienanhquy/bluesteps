import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../providers';
import { Button, Card, Chip, Empty, Label, Notice, Row, Search } from '../../design-system/ui';
import { QueryContent } from '../../design-system/QueryContent';
import { useDemoQuery } from '../../services/useDemoQuery';
import { articles } from '../../services/fixtures';
import { articleMetadata, filterNews, newsTopics } from '../../services/news';
import { ArticleCard, ArticleCover, ArticleMissing, NewsNavigation, NewsPage } from './NewsParts';

export function ArticlesScreen({ savedOnly = false }: { savedOnly?: boolean }) {
  const { topic: initialTopic } = useLocalSearchParams<{ topic?: string }>();
  return (
    <ArticleFeed
      key={`${savedOnly}:${initialTopic ?? 'Tất cả'}`}
      savedOnly={savedOnly}
      initialTopic={initialTopic ?? 'Tất cả'}
    />
  );
}

function ArticleFeed({ savedOnly, initialTopic }: { savedOnly: boolean; initialTopic: string }) {
  const { news, setNews, colors } = useApp();
  const query = useDemoQuery('articles');
  const [search, setSearch] = useState('');
  const [topic, setTopic] = useState(initialTopic);
  const [sort, setSort] = useState<'newest' | 'popular'>('newest');
  const [removing, setRemoving] = useState<string>();
  const [removed, setRemoved] = useState(false);
  const items = filterNews(query.data ?? [], {
    search,
    topic,
    sort,
    savedIds: savedOnly ? news.saved : undefined,
  });
  return (
    <NewsPage title={savedOnly ? 'Bài viết đã lưu' : search ? 'Tìm kiếm tin tức' : 'Tin tức'}>
      {!savedOnly ? (
        <>
          <View style={{ gap: 6 }}>
            <Label size={25} bold heading color={colors.primaryDark}>
              Cập nhật hôm nay,{'\n'}bảo vệ mai sau.
            </Label>
            <Label size={12} color={colors.muted}>
              Đọc một chút, bắt đầu một thay đổi nhỏ.
            </Label>
          </View>
          <NewsNavigation />
        </>
      ) : (
        <Notice>Bài viết được lưu riêng với hoạt động, chỉ trong phiên demo.</Notice>
      )}
      <Search value={search} onChangeText={setSearch} placeholder="Tìm bài viết" />
      <Label size={14} bold heading>
        Chủ đề
      </Label>
      <Row style={{ flexWrap: 'wrap', gap: 8 }}>
        {['Tất cả', ...newsTopics.map((item) => item.id)].map((value) => (
          <Chip
            key={value}
            label={value}
            selected={topic === value}
            onPress={() => setTopic(value)}
          />
        ))}
      </Row>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
        <Label size={14} bold>
          {items.length} kết quả phù hợp
        </Label>
        <Row style={{ flexWrap: 'wrap', gap: 6 }}>
          <Chip label="Mới nhất" selected={sort === 'newest'} onPress={() => setSort('newest')} />
          <Chip label="Phổ biến" selected={sort === 'popular'} onPress={() => setSort('popular')} />
        </Row>
      </Row>
      {removing ? (
        <Card>
          <Label bold>Bỏ lưu bài viết này?</Label>
          <Label size={13}>{articles.find((article) => article.id === removing)?.title}</Label>
          <Button
            title="Xác nhận bỏ lưu bài"
            variant="danger"
            onPress={() => {
              setNews((current) => ({
                ...current,
                saved: current.saved.filter((id) => id !== removing),
              }));
              setRemoving(undefined);
              setRemoved(true);
            }}
          />
          <Button title="Giữ bài đã lưu" variant="quiet" onPress={() => setRemoving(undefined)} />
        </Card>
      ) : null}
      {removed ? <Notice tone="success">Đã bỏ lưu bài viết trong phiên demo.</Notice> : null}
      <QueryContent
        loading={query.isPending}
        error={query.isError}
        retry={() => {
          void query.refetch();
        }}
      >
        {items.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {items.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                removeSaved={
                  savedOnly
                    ? () => {
                        setRemoving(article.id);
                        setRemoved(false);
                      }
                    : undefined
                }
              />
            ))}
          </View>
        ) : (
          <Empty
            title={
              savedOnly && !news.saved.length
                ? 'Chưa có bài viết đã lưu'
                : 'Không tìm thấy bài viết phù hợp'
            }
            detail="Thử đổi từ khóa hoặc chủ đề để tìm thêm bài đọc."
            action={savedOnly ? 'Khám phá tin tức' : 'Xóa bộ lọc'}
            onPress={() => {
              if (savedOnly) router.dismissTo('/articles');
              else {
                setSearch('');
                setTopic('Tất cả');
              }
            }}
          />
        )}
      </QueryContent>
      <Notice>
        Nội dung và lượt tương tác minh họa. Các bài chưa được biên tập thành nguồn tin đã xác minh.
      </Notice>
    </NewsPage>
  );
}

export function ArticleDetailScreen() {
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
                  : [...current.saved, article.id],
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
