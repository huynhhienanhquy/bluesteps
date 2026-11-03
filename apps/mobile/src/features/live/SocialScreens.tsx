import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Notice, Row } from '../../design-system/ui';
import { useApp } from '../../providers';
import type { Schemas } from '../../services/api';
import { useCommand, useResource } from '../../services/queries';
import { CommandError, QueryState } from './common';
import { CommunityPage, CommunityPost } from './CommunityScreens';
import { PostComments } from './PostComments';
import { ArticleDiscussionScreen } from './ArticleDiscussionScreen';

export { CommunityScreen } from './CommunityScreens';

export { ComposerScreen } from './ComposerScreen';

export function DiscussionScreen({ article = false }: { article?: boolean }) {
  return article ? <ArticleDiscussionScreen /> : <PostDiscussionScreen />;
}

function PostDiscussionScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useApp();
  if (!id)
    return (
      <CommunityPage title="Bài đăng">
        <Notice>Chọn bài viết để xem thảo luận.</Notice>
      </CommunityPage>
    );
  return <DiscussionBody key={`${user?.id ?? 'guest'}:${id}`} id={id} article={false} />;
}

function DiscussionBody({ id, article }: { id: string; article: boolean }) {
  const post = useResource<Schemas['Post']>(`/v1/posts/${id}`, false, !article);
  const { user, status } = useApp();
  const command = useCommand();
  const { write } = useLocalSearchParams<{ write?: string }>();
  const [writing, setWriting] = useState(write === '1' && status === 'authenticated');
  useEffect(() => {
    if (write === '1' && status === 'authenticated') setWriting(true);
  }, [write, status]);
  const [confirmAction, setConfirmAction] = useState<'delete' | 'block' | null>(null);
  const working = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const writeComment = () => {
    if (status !== 'authenticated')
      router.push({
        pathname: '/login',
        params: {
          returnTo: `${article ? '/articles/discussion' : '/discussion'}?id=${encodeURIComponent(id)}&write=1`,
        },
      });
    else setWriting(true);
  };
  async function confirm() {
    if (working.current || !post.data || !confirmAction) return;
    working.current = true;
    try {
      await command.mutateAsync({
        path: confirmAction === 'delete' ? `/v1/posts/${id}` : `/v1/me/blocks/${post.data.userId}`,
        method: confirmAction === 'delete' ? 'DELETE' : 'PUT',
      });
      if (alive.current) {
        if (router.canGoBack()) router.back();
        else router.replace('/community');
      }
    } catch {
      // Keep the confirmation available when the request fails.
    } finally {
      working.current = false;
    }
  }
  return (
    <CommunityPage title={article ? 'Thảo luận bài đọc' : 'Bài đăng'}>
      {!article ? (
        <QueryState query={post}>
          {post.data ? (
            <>
              <CommunityPost post={post.data} detail onComment={writeComment} />
              {status === 'authenticated' ? (
                <>
                  {user?.id === post.data.userId ? (
                    <Row>
                      <Button
                        title="Sửa bài viết"
                        variant="quiet"
                        onPress={() => router.push({ pathname: '/compose', params: { id } })}
                      />
                      <Button
                        title="Xóa bài viết"
                        variant="quiet"
                        onPress={() => setConfirmAction('delete')}
                      />
                    </Row>
                  ) : (
                    <Button
                      title="Chặn người dùng"
                      variant="quiet"
                      onPress={() => setConfirmAction('block')}
                    />
                  )}
                  {confirmAction ? (
                    <View style={{ gap: 10 }}>
                      <Notice tone="warning">
                        {confirmAction === 'delete'
                          ? 'Xóa bài viết này?'
                          : 'Chặn thành viên này? Bài viết và tin nhắn giữa hai bạn sẽ bị hạn chế.'}
                      </Notice>
                      <Row>
                        <Button
                          title="Hủy"
                          variant="quiet"
                          disabled={command.isPending}
                          onPress={() => setConfirmAction(null)}
                        />
                        <Button
                          title={
                            confirmAction === 'delete'
                              ? 'Xác nhận xóa bài viết'
                              : 'Xác nhận chặn người dùng'
                          }
                          variant="danger"
                          pending={command.isPending}
                          onPress={() => void confirm()}
                        />
                      </Row>
                    </View>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}
        </QueryState>
      ) : null}
      <CommandError error={command.error} />
      {article || post.data ? (
        <PostComments
          id={id}
          article={article}
          post={post.data}
          open={writing}
          onOpen={writeComment}
          onClose={() => {
            setWriting(false);
            if (write) router.setParams({ write: undefined });
          }}
        />
      ) : null}
    </CommunityPage>
  );
}
export { MessagesScreen } from './MessagesScreen';

export { ConversationScreen } from './ChatScreen';
