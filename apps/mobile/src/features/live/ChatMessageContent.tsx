import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { Button, Label, Notice } from '../../design-system/ui';
import { useApp } from '../../providers';
import { ApiError, type Schemas } from '../../services/api';
import { useResource } from '../../services/queries';
import { QueryState } from './common';
import { PostMedia } from './PostMedia';
import { sharedPostContent } from './post-link';

export function ChatMessageContent({ text, own }: { text: string; own: boolean }) {
  const { colors } = useApp();
  const shared = sharedPostContent(text);
  const id = shared?.id;
  const post = useResource<Schemas['Post']>(`/v1/posts/${id ?? ''}`, false, !!id);
  if (id)
    return (
      <View style={{ gap: 10 }}>
        {shared?.caption ? <MessageText text={shared.caption} own={own} /> : null}
        <View style={{ borderRadius: 16, padding: 12, backgroundColor: colors.surface, gap: 10 }}>
          <Label size={11} color={colors.muted}>
            Bài đăng được chia sẻ
          </Label>
          {post.error instanceof ApiError && [403, 404].includes(post.error.status) ? (
            <Label size={13} color={colors.muted}>
              Bài đăng này đã bị gỡ hoặc bạn chưa có quyền xem.
            </Label>
          ) : (
            <QueryState query={post}>
              {post.data ? (
                <>
                  <Label size={13} bold>
                    {post.data.authorName}
                  </Label>
                  <Label size={14} numberOfLines={4}>
                    {post.data.body}
                  </Label>
                  {post.data.media?.length ? (
                    <PostMedia assets={post.data.media.slice(0, 2)} gallery />
                  ) : null}
                  <Label size={11} color={colors.muted}>
                    {post.data.likes} lượt thích · {post.data.comments ?? 0} bình luận
                  </Label>
                  <Button
                    title="Xem bài đăng"
                    variant="quiet"
                    onPress={() => router.push({ pathname: '/discussion', params: { id } })}
                  />
                </>
              ) : null}
            </QueryState>
          )}
        </View>
      </View>
    );
  return <MessageText text={text} own={own} />;
}

function MessageText({ text, own }: { text: string; own: boolean }) {
  const { colors } = useApp();
  const [error, setError] = useState('');
  return (
    <>
      <Label size={14} color={own ? colors.heroText : colors.text} selectable>
        {text.split(/((?:https?:\/\/|bluesteps:\/\/|exps?:\/\/)[^\s]+)/g).map((part, index) =>
          /^(https?:\/\/|bluesteps:\/\/|exps?:\/\/)/.test(part) ? (
            <Label
              key={index}
              size={14}
              color={own ? colors.heroText : colors.brand}
              style={{ textDecorationLine: 'underline' }}
              accessibilityRole="link"
              onPress={() => {
                setError('');
                void Linking.openURL(part).catch(() => setError('Chưa mở được liên kết này.'));
              }}
            >
              {part}
            </Label>
          ) : (
            part
          ),
        )}
      </Label>
      {error ? <Notice tone="error">{error}</Notice> : null}
    </>
  );
}
