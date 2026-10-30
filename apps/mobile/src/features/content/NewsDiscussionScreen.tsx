import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../providers';
import {
  Button,
  Card,
  Chip,
  Empty,
  Field,
  IconButton,
  Label,
  Notice,
  Row,
} from '../../design-system/ui';
import { articles } from '../../services/fixtures';
import { appendArticleComment } from '../../services/news';
import { ArticleMissing, NewsPage } from './NewsParts';

export function NewsDiscussionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { news, setNews, colors } = useApp();
  const article = articles.find((item) => item.id === id);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<number>();
  const [sort, setSort] = useState<'newest' | 'popular'>('newest');
  const [status, setStatus] = useState('');
  const [deleting, setDeleting] = useState<number>();
  const comments = news.comments
    .filter((comment) => comment.articleId === article?.id)
    .sort((a, b) =>
      sort === 'newest'
        ? b.id - a.id
        : b.likes +
            Number(news.likedComments.includes(b.id)) -
            (a.likes + Number(news.likedComments.includes(a.id))) || b.id - a.id,
    );
  const replying = news.comments.find(
    (comment) => comment.id === replyTo && comment.articleId === article?.id,
  );
  const send = () => {
    if (!article || !draft.trim()) {
      setStatus('Nhập nội dung thảo luận trước khi đăng.');
      return;
    }
    if (draft.trim().length > 500) {
      setStatus('Nội dung tối đa 500 ký tự.');
      return;
    }
    setNews((current) => appendArticleComment(current, article.id, draft, replyTo));
    setDraft('');
    setReplyTo(undefined);
    setStatus('Đã thêm thảo luận trong phiên demo.');
  };
  return (
    <NewsPage title="Thảo luận bài viết">
      {!article ? (
        <ArticleMissing />
      ) : (
        <>
          <Card style={{ backgroundColor: colors.soft }}>
            <Label size={16} bold>
              {article.title}
            </Label>
            <Button
              title="Về bài viết"
              variant="quiet"
              onPress={() => router.dismissTo(`/articles/${article.id}`)}
            />
          </Card>
          <Notice>Thảo luận riêng của bài đọc, chỉ lưu trong phiên demo.</Notice>
          <Row style={{ flexWrap: 'wrap' }}>
            <Chip label="Mới nhất" selected={sort === 'newest'} onPress={() => setSort('newest')} />
            <Chip
              label="Nổi bật"
              selected={sort === 'popular'}
              onPress={() => setSort('popular')}
            />
          </Row>
          <Label size={16} bold heading>
            {comments.length} bình luận
          </Label>
          {deleting ? (
            <Card>
              <Label bold>Xóa bình luận của bạn?</Label>
              <Button
                title="Xác nhận xóa bình luận"
                variant="danger"
                onPress={() => {
                  setNews((current) => ({
                    ...current,
                    comments: current.comments
                      .filter((comment) => comment.id !== deleting)
                      .map((comment) =>
                        comment.replyTo === deleting ? { ...comment, replyTo: undefined } : comment,
                      ),
                    likedComments: current.likedComments.filter((value) => value !== deleting),
                  }));
                  if (replyTo === deleting) setReplyTo(undefined);
                  setDeleting(undefined);
                  setStatus('Đã xóa bình luận trong phiên demo.');
                }}
              />
              <Button
                title="Giữ bình luận"
                variant="quiet"
                onPress={() => setDeleting(undefined)}
              />
            </Card>
          ) : null}
          {!comments.length ? (
            <Empty
              title="Chưa có thảo luận cho bài viết"
              detail="Chia sẻ một ý tưởng nhỏ để bắt đầu câu chuyện."
            />
          ) : (
            comments.map((comment) => {
              const parent = news.comments.find(
                (item) => item.id === comment.replyTo && item.articleId === article.id,
              );
              const liked = news.likedComments.includes(comment.id);
              return (
                <Card key={comment.id}>
                  <Label size={14} bold>
                    {comment.author}
                  </Label>
                  {parent ? (
                    <Label size={11} color={colors.muted}>
                      Trả lời {parent.author}: {parent.text}
                    </Label>
                  ) : null}
                  <Label size={14}>{comment.text}</Label>
                  <Row style={{ flexWrap: 'wrap' }}>
                    <IconButton
                      name={liked ? 'thumbs-up' : 'thumbs-up-outline'}
                      label={`${liked ? 'Bỏ thích' : 'Thích'} bình luận của ${comment.author}`}
                      selected={liked}
                      onPress={() =>
                        setNews((current) => ({
                          ...current,
                          likedComments: current.likedComments.includes(comment.id)
                            ? current.likedComments.filter((value) => value !== comment.id)
                            : [...current.likedComments, comment.id],
                        }))
                      }
                    />
                    <Label size={12}>{comment.likes + Number(liked)} lượt thích</Label>
                    <Button
                      title={`Trả lời ${comment.author}`}
                      variant="quiet"
                      onPress={() => {
                        setReplyTo(comment.id);
                        setStatus('');
                      }}
                    />
                    {comment.mine ? (
                      <IconButton
                        name="trash-outline"
                        label={`Xóa bình luận: ${comment.text}`}
                        onPress={() => setDeleting(comment.id)}
                      />
                    ) : null}
                  </Row>
                </Card>
              );
            })
          )}
          {replying ? (
            <Card>
              <Label size={13}>Đang trả lời {replying.author}</Label>
              <Button title="Hủy trả lời" variant="quiet" onPress={() => setReplyTo(undefined)} />
            </Card>
          ) : null}
          <Field
            label="Nội dung thảo luận bài viết"
            value={draft}
            onChangeText={(value) => {
              setDraft(value);
              setStatus('');
            }}
            multiline
            maxLength={500}
          />
          <Label size={11} color={colors.muted}>
            {draft.length}/500 ký tự
          </Label>
          <Button title="Đăng thảo luận trong demo" onPress={send} />
          {status ? <Notice>{status}</Notice> : null}
        </>
      )}
    </NewsPage>
  );
}
