import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { QueryContent } from '../../design-system/QueryContent';
import { useDemoQuery } from '../../services/useDemoQuery';
import { useApp } from '../../providers';
import {
  Button,
  Card,
  Empty,
  Field,
  IconButton,
  Label,
  Notice,
  Row,
  Screen,
} from '../../design-system/ui';

export function CommunityScreen() {
  const { posts, liked, toggleLiked, colors } = useApp();
  return (
    <Screen
      title="Cộng đồng xanh"
      subtitle="Chia sẻ từng bước nhỏ của bạn."
      back
      action={
        <IconButton
          name="chatbubbles-outline"
          label="Tin nhắn"
          onPress={() => router.push('/messages')}
        />
      }
    >
      <Button
        title="Chia sẻ một điều xanh"
        icon="add-outline"
        onPress={() => router.push('/compose')}
      />
      {posts.map((post) => (
        <Card key={post.id}>
          <Row>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.soft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Label bold>{post.avatar}</Label>
            </View>
            <View style={{ flex: 1 }}>
              <Label bold>{post.author}</Label>
              <Label size={12} color={colors.muted}>
                {post.time}
              </Label>
            </View>
          </Row>
          <Label>{post.text}</Label>
          <Row>
            <Button
              title={`${post.likes + (liked.includes(post.id) ? 1 : 0)} thích`}
              icon={liked.includes(post.id) ? 'heart' : 'heart-outline'}
              variant="quiet"
              onPress={() => toggleLiked(post.id)}
            />
            <Button
              title="Xem thảo luận"
              icon="chatbubble-outline"
              variant="quiet"
              onPress={() => router.push(`/discussion?postId=${post.id}`)}
            />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
export function ComposerScreen() {
  const { addPost } = useApp();
  const [text, setText] = useState('');
  const [checked, setChecked] = useState(false);
  return (
    <Screen title="Chia sẻ điều xanh" back>
      <Notice>
        Bài viết chỉ thêm vào phiên demo trên thiết bị này. Chưa gửi hoặc hiển thị cho người khác.
      </Notice>
      <Field
        label="Nội dung bài viết"
        value={text}
        onChangeText={setText}
        multiline
        maxLength={2000}
        style={{ minHeight: 190, textAlignVertical: 'top' }}
        placeholder="Hôm nay bạn đã làm điều gì xanh?"
        error={checked && !text.trim() ? 'Nhập nội dung trước khi xem bài.' : undefined}
      />
      <Label size={12}>{text.length}/2000 ký tự · giới hạn demo</Label>
      <Button
        title="Thêm bài vào phiên demo"
        onPress={() => {
          setChecked(true);
          if (text.trim()) {
            addPost(text.trim());
            router.replace('/community');
          }
        }}
      />
      <Notice>
        Ảnh, quyền riêng tư và đăng bài thật sẽ được nối sau contract media và audience.
      </Notice>
    </Screen>
  );
}
export function DiscussionScreen() {
  const { postId = 'post-1' } = useLocalSearchParams<{ postId?: string }>();
  const query = useDemoQuery('comments');
  const comments = query.data?.filter((comment) => comment.postId === postId) ?? [];
  return (
    <Screen title="Thảo luận" back>
      <Notice>
        Bình luận và tác giả đều là dữ liệu mẫu. Chưa kết nối gửi bình luận thật hoặc kiểm duyệt.
      </Notice>
      <QueryContent
        loading={query.isPending}
        error={query.isError}
        retry={() => {
          void query.refetch();
        }}
      >
        {comments.length ? (
          comments.map((comment) => (
            <Card key={comment.id}>
              <Label bold>{comment.author}</Label>
              <Label>{comment.text}</Label>
              <Label size={12}>{comment.time}</Label>
            </Card>
          ))
        ) : (
          <Empty
            title="Chưa có bình luận trong demo"
            detail="Bài viết này chưa có bình luận mẫu."
          />
        )}
      </QueryContent>
      <Button title="Quay về cộng đồng" onPress={() => router.replace('/community')} />
    </Screen>
  );
}
