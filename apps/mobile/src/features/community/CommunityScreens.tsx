import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  View,
} from 'react-native';
import { PrivateModal as Modal } from '../shared/PrivateModal';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { StatusSpace } from '../../design-system/DesignScreen';
import {
  Button,
  Card,
  Chip,
  Icon,
  Label,
  Notice,
  Row,
  Search,
  Typography,
} from '../../design-system/ui';
import { useApp } from '../../providers';
import { dateLabel, type Schemas } from '../../services/api';
import { useCommand, usePages, useResource } from '../../services/queries';
import { CurvedNavigation } from '../shared/DesignParts';
import { CommandError, More, QueryState, RequireAuth } from '../shared/common';
import { PostMedia } from './PostMedia';
import { audiences, emotionLabel } from './post-options';
import { FriendButtons, FriendsList } from './FriendControls';
import { UserAvatar } from '../profile/UserAvatar';
import { postLink } from './post-link';
import { ComposerSheet } from './ComposerSheet';

type Post = Schemas['Post'];
type Member = Schemas['CommunityMember'];
const openPost = (id: string) => router.push({ pathname: '/discussion', params: { id } });
export const openMember = (id: string) =>
  router.push({ pathname: '/community', params: { member: id } });

export function CommunityPage({
  title,
  children,
  light = false,
  action,
}: PropsWithChildren<{ title: string; light?: boolean; action?: ReactNode }>) {
  const { colors } = useApp();
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  return (
    <Typography.Provider value="inter">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: light ? colors.surface : colors.background }}
      >
        <View style={{ backgroundColor: light ? colors.surface : '#147CC1' }}>
          <StatusSpace />
          <Row style={{ paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              style={{ width: 36, height: 44, justifyContent: 'center' }}
            >
              <Icon name="chevron-back" color={light ? colors.primary : '#FFFFFF'} size={26} />
            </Pressable>
            <Label
              size={light ? 24 : 26}
              bold
              heading
              color={light ? colors.primary : '#FFFFFF'}
              style={{ flex: 1, textAlign: 'center' }}
            >
              {title}
            </Label>
            {action ?? <View style={{ width: 36 }} />}
          </Row>
        </View>
        <ScrollView
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: 140, gap: 18 }}
        >
          {children}
        </ScrollView>
        {!keyboard ? (
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
            <CurvedNavigation variant="handbook" />
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Typography.Provider>
  );
}

export function CommunityScreen() {
  const { member } = useLocalSearchParams<{ member?: string }>();
  const { user } = useApp();
  return member ? (
    <MemberScreen key={`${user?.id ?? 'guest'}:${member}`} id={member} />
  ) : (
    <CommunityDiscovery key={user?.id ?? 'guest'} />
  );
}

function CommunityDiscovery() {
  const {
    view = 'posts',
    q = '',
    topic,
    member_scope,
  } = useLocalSearchParams<{ view?: string; q?: string; topic?: string; member_scope?: string }>();
  const current = [
    'posts',
    'members',
    'topics',
    'following',
    'saved',
    'hidden',
    'blocked',
    'friends',
  ].includes(view)
    ? view
    : 'posts';
  const followingMembers = current === 'members' && member_scope === 'following';
  const relatedMembers = current === 'posts' && !!q.trim() && !topic;
  const personal =
    followingMembers || ['following', 'saved', 'hidden', 'blocked', 'friends'].includes(current);
  const { status } = useApp();
  const suffix = `q=${encodeURIComponent(q)}${topic ? `&topic=${encodeURIComponent(topic)}` : ''}`;
  const path =
    current === 'saved'
      ? '/v1/me/saved-posts'
      : current === 'hidden'
        ? '/v1/me/hidden-posts'
        : `/v1/posts?${suffix}${current === 'following' ? '&feed=following' : ''}`;
  const posts = usePages<Post>(
    path,
    personal,
    !['members', 'topics', 'blocked', 'friends'].includes(current),
  );
  const members = usePages<Member>(
    current === 'blocked'
      ? '/v1/me/blocked-members'
      : `/v1/community/members?q=${encodeURIComponent(q)}${followingMembers ? '&following=true' : ''}`,
    current === 'blocked' || followingMembers,
    current === 'members' || current === 'blocked' || relatedMembers,
  );
  const topics = usePages<Schemas['CommunityTopic']>(
    `/v1/community/topics?q=${encodeURIComponent(q)}`,
    false,
    current === 'topics',
  );
  const setView = (next: string) => router.setParams({ view: next, topic: undefined });
  const memberItems = members.data?.pages.flatMap((page) => page.items) ?? [];
  const content =
    current === 'friends' ? (
      <FriendsList />
    ) : current === 'members' || current === 'blocked' ? (
      <QueryState
        query={members}
        empty={!members.data?.pages[0]?.items.length}
        emptyText={
          current === 'blocked'
            ? 'Chưa có thành viên đã chặn'
            : followingMembers
              ? 'Chưa tìm thấy thành viên đang theo dõi'
              : 'Chưa tìm thấy thành viên'
        }
      >
        <Label bold size={18}>
          {current === 'blocked' ? 'Thành viên đã chặn' : 'Thành viên'}
        </Label>
        <Label size={12}>
          Đã tải {memberItems.length}
          {members.hasNextPage ? '+' : ''} thành viên
        </Label>
        {memberItems.map((member) =>
          current === 'blocked' ? (
            <BlockedMember key={member.id} member={member} />
          ) : (
            <MemberCard key={member.id} member={member} />
          ),
        )}
        <More query={members} />
      </QueryState>
    ) : current === 'topics' ? (
      <QueryState
        query={topics}
        empty={!topics.data?.pages[0]?.items.length}
        emptyText="Chưa tìm thấy chủ đề"
      >
        <Label bold size={18}>
          Chủ đề
        </Label>
        {topics.data?.pages
          .flatMap((page) => page.items)
          .map((entry) => (
            <Card key={entry.id}>
              <Button
                title={entry.name}
                variant="quiet"
                icon="leaf-outline"
                onPress={() => router.setParams({ view: 'posts', topic: entry.name, q: '' })}
              />
              <Label size={13}>{entry.postCount} bài viết</Label>
            </Card>
          ))}
        <More query={topics} />
      </QueryState>
    ) : (
      <QueryState
        query={posts}
        empty={!posts.data?.pages[0]?.items.length}
        emptyText={current === 'hidden' ? 'Chưa có bài viết đã ẩn' : 'Chưa có bài viết'}
      >
        {posts.data?.pages
          .flatMap((page) => page.items)
          .map((post) => (
            <CommunityPost key={post.id} post={post} />
          ))}
        <More query={posts} />
      </QueryState>
    );
  return (
    <CommunityPage
      title={
        current === 'saved'
          ? 'Bài đã lưu'
          : current === 'hidden'
            ? 'Bài đã ẩn'
            : current === 'members' || current === 'topics' || q.trim()
              ? 'Khám phá'
              : 'Cộng đồng'
      }
    >
      {!['saved', 'hidden', 'blocked', 'friends'].includes(current) ? (
        <Search
          value={q}
          onChangeText={(q) => router.setParams({ q })}
          placeholder="Tìm kiếm cộng đồng"
          maxLength={100}
        />
      ) : null}
      <Row style={{ flexWrap: 'wrap' }}>
        {[
          ['posts', 'Bài viết'],
          ['members', 'Thành viên'],
          ['topics', 'Chủ đề'],
        ].map(([key, label]) => (
          <Chip key={key} label={label!} selected={current === key} onPress={() => setView(key!)} />
        ))}
      </Row>
      {current === 'members' ? (
        <Row style={{ flexWrap: 'wrap' }}>
          <Chip
            label="Tất cả thành viên"
            selected={!followingMembers}
            onPress={() => router.setParams({ member_scope: 'all' })}
          />
          <Chip
            label="Thành viên đang theo dõi"
            selected={followingMembers}
            onPress={() => router.setParams({ member_scope: 'following' })}
          />
        </Row>
      ) : null}
      <Row style={{ flexWrap: 'wrap' }}>
        {[
          ['following', 'Đang theo dõi'],
          ['saved', 'Đã lưu'],
          ['hidden', 'Đã ẩn'],
          ['blocked', 'Đã chặn'],
          ['friends', 'Bạn bè'],
        ].map(([key, label]) => (
          <Chip key={key} label={label!} selected={current === key} onPress={() => setView(key!)} />
        ))}
      </Row>
      {topic && current === 'posts' ? (
        <Card>
          <Label bold>Chủ đề: {topic}</Label>
          <Button
            title="Tất cả chủ đề"
            variant="quiet"
            onPress={() => router.setParams({ topic: undefined })}
          />
        </Card>
      ) : null}
      <Button
        title="Viết bài"
        icon="create-outline"
        onPress={() =>
          status === 'authenticated'
            ? router.push('/compose')
            : router.push({ pathname: '/login', params: { returnTo: '/compose' } })
        }
      />
      {personal ? <RequireAuth>{content}</RequireAuth> : content}
      {relatedMembers && memberItems.length ? (
        <>
          <Label size={18} bold heading>
            Thành viên liên quan
          </Label>
          {memberItems.slice(0, 3).map((entry) => (
            <MemberCard key={entry.id} member={entry} />
          ))}
          <Button
            title="Xem tất cả thành viên"
            variant="quiet"
            onPress={() => router.setParams({ view: 'members', member_scope: 'all' })}
          />
        </>
      ) : null}
    </CommunityPage>
  );
}

function Initials({ name, userId }: { name: string; userId?: string }) {
  return <UserAvatar userId={userId} name={name} />;
}

function FollowButton({ member }: { member: Member }) {
  const { user, status } = useApp();
  const command = useCommand();
  const working = useRef(false);
  if (user?.id === member.id) return null;
  return (
    <>
      <Button
        title={member.following ? '✓ Đang theo dõi' : '+ Theo dõi'}
        variant={member.following ? 'secondary' : 'primary'}
        pending={command.isPending}
        onPress={() => {
          if (status !== 'authenticated') {
            router.push({
              pathname: '/login',
              params: { returnTo: `/community?member=${encodeURIComponent(member.id)}` },
            });
            return;
          }
          if (working.current) return;
          working.current = true;
          void command
            .mutateAsync({
              path: `/v1/me/followed-members/${member.id}`,
              method: member.following ? 'DELETE' : 'PUT',
            })
            .catch(() => {})
            .finally(() => {
              working.current = false;
            });
        }}
      />
      <CommandError error={command.error} />
    </>
  );
}

function BlockedMember({ member }: { member: Member }) {
  const command = useCommand();
  return (
    <Card>
      <Label bold>{member.displayName}</Label>
      <Button
        title={`Bỏ chặn ${member.displayName}`}
        pending={command.isPending}
        onPress={() => command.mutate({ path: `/v1/me/blocks/${member.id}`, method: 'DELETE' })}
      />
      <CommandError error={command.error} />
    </Card>
  );
}

function MemberCard({ member }: { member: Member }) {
  return (
    <Card>
      <Row style={{ alignItems: 'center' }}>
        <Initials name={member.displayName} userId={member.id} />
        <View style={{ flex: 1 }}>
          <Button
            title={member.displayName}
            variant="quiet"
            onPress={() => openMember(member.id)}
          />
          <Label size={13}>{member.bio || 'Thành viên BlueSteps'}</Label>
        </View>
      </Row>
      <FollowButton member={member} />
    </Card>
  );
}

function MemberScreen({ id }: { id: string }) {
  const member = useResource<Member>(`/v1/community/members/${id}`);
  const posts = usePages<Post>(
    `/v1/posts?author_id=${encodeURIComponent(id)}`,
    false,
    !!member.data,
  );
  const { user, status } = useApp();
  const command = useCommand();
  const conversation = useCommand<Schemas['Conversation']>();
  const [confirmBlock, setConfirmBlock] = useState(false);
  const working = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const { refetch: refreshMember } = member;
  const { refetch: refreshPosts } = posts;
  useFocusEffect(
    useCallback(() => {
      let focused = true;
      void refreshMember().then((result) => {
        if (focused && !result.error && result.data) void refreshPosts();
      });
      return () => {
        focused = false;
      };
    }, [refreshMember, refreshPosts]),
  );
  return (
    <CommunityPage title="Trang thành viên">
      <QueryState query={member}>
        {member.data ? (
          <>
            <Card style={{ borderRadius: 22, gap: 18 }}>
              <Row style={{ alignItems: 'center' }}>
                <Initials name={member.data.displayName} userId={member.data.id} />
                <View style={{ flex: 1 }}>
                  <Label bold size={22}>
                    {member.data.displayName}
                  </Label>
                  <Label size={13}>{member.data.bio || 'Thành viên BlueSteps'}</Label>
                </View>
              </Row>
              <Row style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <Label size={13}>{member.data.postCount} bài viết</Label>
                <Label size={13}>{member.data.followerCount} người theo dõi</Label>
                <Label size={13}>Đang theo dõi {member.data.followingCount}</Label>
              </Row>
              <FollowButton member={member.data} />
              <FriendButtons member={member.data} />
              {status === 'authenticated' && user?.id !== id ? (
                <>
                  <Button
                    title="Nhắn tin"
                    variant="secondary"
                    pending={conversation.isPending}
                    disabled={command.isPending}
                    onPress={() => {
                      if (working.current) return;
                      working.current = true;
                      void conversation
                        .mutateAsync({ path: '/v1/conversations', body: { recipientId: id } })
                        .then((created) => {
                          if (alive.current)
                            router.push({ pathname: '/conversation', params: { id: created.id } });
                        })
                        .catch(() => {})
                        .finally(() => {
                          working.current = false;
                        });
                    }}
                  />
                  <CommandError error={conversation.error} />
                  <Button
                    title="Chặn thành viên"
                    variant="quiet"
                    disabled={conversation.isPending || command.isPending}
                    onPress={() => setConfirmBlock(true)}
                  />
                  {confirmBlock ? (
                    <>
                      <Notice tone="warning">
                        Chặn sẽ bỏ theo dõi giữa hai tài khoản và ẩn nội dung của nhau.
                      </Notice>
                      <Button
                        title="Hủy chặn thành viên"
                        variant="quiet"
                        disabled={command.isPending}
                        onPress={() => setConfirmBlock(false)}
                      />
                      <Button
                        title="Xác nhận chặn thành viên"
                        variant="danger"
                        pending={command.isPending}
                        disabled={conversation.isPending}
                        onPress={() => {
                          if (working.current) return;
                          working.current = true;
                          void command
                            .mutateAsync({ path: `/v1/me/blocks/${id}`, method: 'PUT' })
                            .then(() => {
                              if (alive.current) router.replace('/community');
                            })
                            .catch(() => {})
                            .finally(() => {
                              working.current = false;
                            });
                        }}
                      />
                      <CommandError error={command.error} />
                    </>
                  ) : null}
                </>
              ) : null}
            </Card>
            <Label bold size={19}>
              Bài viết gần đây
            </Label>
            <QueryState
              query={posts}
              empty={!posts.data?.pages[0]?.items.length}
              emptyText="Chưa có bài viết hiển thị"
            >
              {posts.data?.pages
                .flatMap((page) => page.items)
                .map((post) => (
                  <CommunityPost key={post.id} post={post} />
                ))}
              <More query={posts} />
            </QueryState>
          </>
        ) : null}
      </QueryState>
    </CommunityPage>
  );
}

export function CommunityPost({
  post,
  detail = false,
  onComment,
}: {
  post: Post;
  detail?: boolean;
  onComment?: () => void;
}) {
  const { status } = useApp();
  const command = useCommand();
  return (
    <Card style={{ borderRadius: 22, gap: 14 }}>
      <Row style={{ alignItems: 'center' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Trang thành viên ${post.authorName}`}
          onPress={() => openMember(post.userId)}
        >
          <Initials name={post.authorName} userId={post.userId} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Button title={post.authorName} variant="quiet" onPress={() => openMember(post.userId)} />
          <Label size={12}>
            {dateLabel(post.createdAt)} · {audiences[post.visibility]}
          </Label>
        </View>
        <PostOptions post={post} compact />
      </Row>
      {post.topic ? (
        <Label size={12} bold color="#147CC1">
          {post.topic}
        </Label>
      ) : null}
      {post.emotion ? <Label size={13}>{emotionLabel(post.emotion)}</Label> : null}
      {post.place ? (
        <Label size={13}>
          📍 {post.place.name}
          {post.place.address ? ' · ' + post.place.address : ''}
        </Label>
      ) : null}
      {detail ? (
        <Label>{post.body}</Label>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Mở bài viết: ${post.body}`}
          onPress={() => openPost(post.id)}
        >
          <Label>{post.body}</Label>
        </Pressable>
      )}
      <PostMedia assets={post.media ?? []} />
      <Label size={12}>
        {post.likes} lượt thích · {post.comments ?? 0} bình luận
      </Label>
      <Row style={{ flexWrap: 'wrap' }}>
        <Button
          title={post.liked ? 'Bỏ thích' : 'Thích'}
          variant="quiet"
          pending={command.isPending}
          onPress={() =>
            status === 'authenticated'
              ? command.mutate({
                  path: `/v1/posts/${post.id}/reaction`,
                  method: post.liked ? 'DELETE' : 'PUT',
                })
              : router.push('/login')
          }
        />
        <Button
          title="Bình luận"
          variant="quiet"
          onPress={onComment ?? (() => openPost(post.id))}
        />
        <PostShare post={post} />
      </Row>
      <CommandError error={command.error} />
    </Card>
  );
}

function PostShare({ post }: { post: Post }) {
  const [failure, setFailure] = useState('');
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        title="Chia sẻ"
        variant="quiet"
        icon="share-social-outline"
        onPress={() => {
          setFailure('');
          setOpen(true);
        }}
      />
      <ComposerSheet title="Chia sẻ bài đăng" visible={open} close={() => setOpen(false)}>
        <Button
          title="Gửi qua tin nhắn"
          icon="chatbubble-outline"
          onPress={() => {
            setOpen(false);
            router.push({ pathname: '/messages', params: { share_post: post.id } });
          }}
        />
        <Button
          title="Chia sẻ qua ứng dụng khác"
          variant="secondary"
          icon="share-social-outline"
          onPress={() => {
            setFailure('');
            void Share.share({
              message: postLink(post.id),
            })
              .then(() => setOpen(false))
              .catch(() =>
                setFailure('Chưa thể mở chia sẻ. Bạn có thể sao chép liên kết trong tùy chọn.'),
              );
          }}
        />
        {failure ? <Notice tone="error">{failure}</Notice> : null}
      </ComposerSheet>
    </>
  );
}

export function PostOptions({ post, compact = false }: { post: Post; compact?: boolean }) {
  const { colors, status } = useApp();
  const command = useCommand();
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const toggle = (kind: 'saved' | 'hidden') => {
    setMessage('');
    void command
      .mutateAsync({
        path: `/v1/me/${kind === 'saved' ? 'saved' : 'hidden'}-posts/${post.id}`,
        method: post[kind] ? 'DELETE' : 'PUT',
      })
      .then(() => setExpanded(false))
      .catch(() => {});
  };
  return (
    <>
      {!compact ? <PostShare post={post} /> : null}
      {compact ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tùy chọn bài đăng"
          onPress={() => {
            setFailure('');
            setMessage('');
            setExpanded(true);
          }}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="ellipsis-vertical" size={22} />
        </Pressable>
      ) : (
        <Button
          title="Tùy chọn bài đăng"
          variant="quiet"
          icon="ellipsis-horizontal"
          onPress={() => {
            setFailure('');
            setMessage('');
            setExpanded(true);
          }}
        />
      )}
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <Modal
        visible={expanded}
        transparent
        animationType="slide"
        onRequestClose={() => setExpanded(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng tùy chọn bài đăng"
            onPress={() => setExpanded(false)}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View
            accessibilityViewIsModal
            style={{
              maxHeight: '80%',
              flexGrow: 0,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              backgroundColor: colors.surface,
            }}
          >
            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 18 }}>
              <Label bold size={20} heading>
                Tùy chọn bài đăng
              </Label>
              {status === 'authenticated' ? (
                <Button
                  title={post.saved ? 'Bỏ lưu bài đăng' : 'Lưu bài đăng'}
                  variant="quiet"
                  pending={command.isPending}
                  onPress={() => toggle('saved')}
                />
              ) : null}
              <Button
                title="Sao chép liên kết"
                variant="quiet"
                onPress={() => {
                  setMessage('');
                  void Clipboard.setStringAsync(postLink(post.id))
                    .then((copied) => {
                      if (copied) {
                        setFailure('');
                        setMessage('Đã sao chép liên kết');
                      } else setFailure('Không thể sao chép liên kết.');
                    })
                    .catch(() => setFailure('Không thể sao chép liên kết.'));
                }}
              />
              {message ? <Notice>{message}</Notice> : null}
              {status === 'authenticated' ? (
                <Button
                  title={post.hidden ? 'Hiện lại bài đăng' : 'Ẩn bài đăng'}
                  variant="quiet"
                  pending={command.isPending}
                  onPress={() => toggle('hidden')}
                />
              ) : null}
              {failure ? <Notice tone="error">{failure}</Notice> : null}
              <CommandError error={command.error} />
              <Button title="Hủy" variant="quiet" onPress={() => setExpanded(false)} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
