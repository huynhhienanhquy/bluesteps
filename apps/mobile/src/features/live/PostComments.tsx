import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { StatusSpace } from '../../design-system/DesignScreen';
import { Button, Card, Icon, Label, Notice, Row, Typography } from '../../design-system/ui';
import { useApp } from '../../providers';
import { ApiError, dateLabel, type Page, type Schemas } from '../../services/api';
import { useCommand, usePages } from '../../services/queries';
import { CommandError, More, QueryState, RequireAuth } from './common';
import { PrivateModal } from './PrivateModal';
import { UserAvatar } from './UserAvatar';

type Comment = Schemas['ListedComment'];
export function PostComments({
  id,
  article,
  post,
  open,
  onOpen,
  onClose,
}: {
  id: string;
  article: boolean;
  post?: Schemas['Post'];
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const { colors, user } = useApp();
  const insets = useSafeAreaInsets();
  const path = `/v1/${article ? 'articles' : 'posts'}/${id}/comments`;
  const query = usePages<Comment>(path);
  const create = useCommand<Schemas['Comment']>();
  const change = useCommand();
  const cache = useQueryClient();
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const sending = useRef(false);
  const changing = useRef(false);
  const alive = useRef(true);
  const [text, setText] = useState('');
  const [reply, setReply] = useState<Comment | null>(null);
  const [unavailableReplyId, setUnavailableReplyId] = useState<string | null>(null);
  const comments = query.data?.pages.flatMap((page) => page.items) ?? [];
  const replyUnavailable =
    !!reply &&
    (reply.id === unavailableReplyId ||
      comments.some((comment) => comment.id === reply.id && !!comment.deletedAt));
  const cannotSend = create.isPending || !text.trim() || replyUnavailable;
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  useEffect(() => {
    if (article && open) input.current?.focus();
  }, [article, open, reply?.id]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  function close() {
    if (sending.current) return;
    Keyboard.dismiss();
    onClose();
  }
  function cancelReply() {
    if (sending.current) return;
    setReply(null);
    setUnavailableReplyId(null);
    create.reset();
  }
  async function send() {
    if (!user || sending.current || cannotSend) return;
    sending.current = true;
    const body = text.trim();
    const parentId = reply?.id ?? null;
    try {
      const saved = await create.mutateAsync({ path, body: { body, parentId } });
      if (!alive.current) return;
      const comment: Comment = {
        ...saved,
        authorName: user.displayName,
        deletedAt: null,
        likes: 0,
        liked: false,
      };
      cache.setQueryData<InfiniteData<Page<Comment>>>(
        ['api', user.id, 'pages', path],
        (current) => {
          if (!current) return current;
          if (current.pages.some((page) => page.items.some((item) => item.id === saved.id)))
            return current;
          return {
            ...current,
            pages: current.pages.map((page, index) =>
              index === 0
                ? {
                    ...page,
                    items: [comment, ...page.items],
                    totalCount: page.totalCount === undefined ? undefined : page.totalCount + 1,
                  }
                : page,
            ),
          };
        },
      );
      setText('');
      setReply(null);
      setSent(true);
      Keyboard.dismiss();
      onClose();
    } catch (cause) {
      if (alive.current && parentId && cause instanceof ApiError && cause.status === 404) {
        setUnavailableReplyId(parentId);
        void query.refetch();
      }
      // Keep the draft and idempotency key available for a retry.
    } finally {
      sending.current = false;
    }
  }
  async function update(comment: Comment, remove = false) {
    if (changing.current) return;
    changing.current = true;
    try {
      await change.mutateAsync({
        path: `/v1/comments/${comment.id}${remove ? '' : '/reaction'}`,
        method: remove || comment.liked ? 'DELETE' : 'PUT',
      });
      if (alive.current && remove) setDeleting(null);
    } catch {
      // The command error stays visible beside the list.
    } finally {
      changing.current = false;
    }
  }
  const count = query.data?.pages[0]?.totalCount;
  const authorsByComment = new Map(
    comments.filter((comment) => !comment.deletedAt).map((comment) => [comment.id, comment.authorName]),
  );
  return (
    <>
      <Row style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Label size={20} bold heading>
          Bình luận
        </Label>
        {query.data ? (
          <Label size={12} color={colors.muted}>
            {count ?? comments.filter((comment) => !comment.deletedAt).length}
            {count === undefined && query.hasNextPage ? '+' : ''} ý kiến
          </Label>
        ) : null}
      </Row>
      {sent ? <Notice tone="success">Đã gửi bình luận.</Notice> : null}
      <CommandError error={change.error} />
      <QueryState query={query}>
        {comments.length === 0 ? (
          <Label size={13} color={colors.muted}>
            Chưa có bình luận. Hãy chia sẻ điều bạn nghĩ nhé.
          </Label>
        ) : null}
        {comments.map((comment) => (
          <Card
            key={comment.id}
            style={{
              borderRadius: article ? 16 : 18,
              marginLeft: comment.parentId ? 16 : 0,
              padding: article ? 14 : 18,
              borderWidth: article ? 0 : 1,
              gap: 10,
            }}
          >
            <Row style={{ alignItems: 'flex-start', gap: 10 }}>
              <UserAvatar
                userId={comment.userId}
                name={comment.authorName}
                size={article ? 34 : 42}
              />
              <View style={{ flex: 1, gap: 5 }}>
                <Row
                  style={{
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                  }}
                >
                  <Label size={article ? 13 : 14} bold style={{ flexShrink: 1 }}>
                    {comment.userId === user?.id ? 'Bạn' : comment.authorName}
                  </Label>
                  {article ? (
                    <Label size={10} color={colors.muted}>
                      {dateLabel(comment.createdAt)}
                    </Label>
                  ) : null}
                </Row>
                {comment.parentId && !comment.deletedAt ? (
                  <Label size={11} color={colors.muted}>
                    {authorsByComment.has(comment.parentId)
                      ? `Trả lời ${authorsByComment.get(comment.parentId)}`
                      : 'Trả lời một bình luận'}
                  </Label>
                ) : null}
                <Label size={article ? 12 : 13}>
                  {comment.deletedAt ? 'Bình luận đã xóa' : comment.body}
                </Label>
                {!article ? (
                  <Label size={11} color={colors.muted}>
                    {dateLabel(comment.createdAt)}
                  </Label>
                ) : null}
              </View>
            </Row>
            {!comment.deletedAt && article ? (
              <Row
                style={{
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 16,
                }}
              >
                {user ? (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Trả lời ${comment.authorName}`}
                      disabled={create.isPending}
                      onPress={() => {
                        if (sending.current) return;
                        setReply(comment);
                        setSent(false);
                        create.reset();
                        onOpen();
                      }}
                      style={{ minHeight: 32, justifyContent: 'center' }}
                    >
                      <Label size={11} color={colors.primary}>
                        Trả lời
                      </Label>
                    </Pressable>
                    {user.id === comment.userId ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Xóa bình luận"
                        disabled={change.isPending}
                        onPress={() => setDeleting(comment.id)}
                        style={{ minHeight: 32, justifyContent: 'center' }}
                      >
                        <Label size={11} color={colors.muted}>
                          Xóa
                        </Label>
                      </Pressable>
                    ) : null}
                  </>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={comment.liked ? 'Bỏ thích bình luận' : 'Thích bình luận'}
                  accessibilityState={{
                    selected: comment.liked,
                    disabled: !user || change.isPending,
                  }}
                  disabled={!user || change.isPending}
                  onPress={() => void update(comment)}
                  style={{
                    minHeight: 32,
                    minWidth: 44,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 5,
                  }}
                >
                  <Icon
                    name={comment.liked ? 'heart' : 'heart-outline'}
                    size={14}
                    color={colors.primary}
                  />
                  <Label size={11} color={colors.primary}>
                    {comment.likes ?? 0}
                  </Label>
                </Pressable>
              </Row>
            ) : !comment.deletedAt ? (
              <Row style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                <Label size={12} color={colors.muted}>
                  {comment.likes ?? 0} lượt thích
                </Label>
                {user ? (
                  <>
                    <Button
                      title={comment.liked ? 'Bỏ thích bình luận' : 'Thích bình luận'}
                      variant="quiet"
                      pending={change.isPending}
                      onPress={() => void update(comment)}
                    />
                    <Button
                      title={`Trả lời ${comment.authorName}`}
                      variant="quiet"
                      disabled={create.isPending}
                      onPress={() => {
                        if (sending.current) return;
                        setReply(comment);
                        setSent(false);
                        create.reset();
                        onOpen();
                      }}
                    />
                    {user.id === comment.userId ? (
                      <Button
                        title="Xóa bình luận"
                        variant="quiet"
                        disabled={change.isPending}
                        onPress={() => setDeleting(comment.id)}
                      />
                    ) : null}
                  </>
                ) : null}
              </Row>
            ) : null}
            {deleting === comment.id ? (
              <View style={{ gap: 8 }}>
                <Label size={13}>Xóa bình luận này?</Label>
                <Row>
                  <Button
                    title="Giữ bình luận"
                    variant="quiet"
                    disabled={change.isPending}
                    onPress={() => setDeleting(null)}
                  />
                  <Button
                    title="Xác nhận xóa bình luận"
                    variant="danger"
                    pending={change.isPending}
                    onPress={() => void update(comment, true)}
                  />
                </Row>
              </View>
            ) : null}
          </Card>
        ))}
        <More query={query} />
      </QueryState>
      {article ? (
        <RequireAuth>
          {reply ? (
            <View style={{ gap: 8 }}>
              <Label size={12} color={colors.muted}>
                Đang trả lời {reply.authorName}
              </Label>
              <Label size={12} numberOfLines={3}>
                {reply.body}
              </Label>
              <Button
                title="Hủy trả lời"
                variant="quiet"
                disabled={create.isPending}
                onPress={cancelReply}
              />
            </View>
          ) : null}
          <View style={{ gap: 8 }}>
            <View
              style={{
                minHeight: 48,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                paddingLeft: 13,
                paddingRight: 3,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <TextInput
                ref={input}
                accessibilityLabel="Nội dung bình luận"
                placeholder="Viết bình luận..."
                placeholderTextColor={colors.muted}
                multiline
                maxLength={500}
                value={text}
                editable={!create.isPending}
                onFocus={() => {
                  setSent(false);
                  onOpen();
                }}
                onChangeText={(value) => {
                  if (sending.current) return;
                  setText(value);
                  setSent(false);
                  create.reset();
                }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  minHeight: 22,
                  maxHeight: 120,
                  paddingVertical: 10,
                  fontFamily: 'Inter_400Regular',
                  fontSize: 13,
                  color: colors.text,
                }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Gửi bình luận"
                accessibilityState={{
                  disabled: cannotSend,
                  busy: create.isPending,
                }}
                disabled={cannotSend}
                onPress={() => void send()}
                style={{
                  width: 44,
                  height: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: !text.trim() ? 0.5 : 1,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.brand,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon
                    name={create.isPending ? 'hourglass-outline' : 'arrow-up'}
                    color={colors.heroText}
                    size={20}
                  />
                </View>
              </Pressable>
            </View>
            {text.length ? (
              <Label size={11} color={colors.muted} style={{ textAlign: 'right' }}>
                {text.length}/500
              </Label>
            ) : null}
            {replyUnavailable ? (
              <Notice tone="warning">Bình luận gốc không còn khả dụng. Hủy trả lời để giữ nội dung dưới dạng bình luận mới.</Notice>
            ) : (
              <CommandError error={create.error} />
            )}
          </View>
        </RequireAuth>
      ) : (
        <RequireAuth>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Viết bình luận"
            onPress={() => {
              setSent(false);
              onOpen();
            }}
            style={{
              minHeight: 48,
              borderRadius: 24,
              backgroundColor: colors.surface,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Label size={13} color={colors.muted} style={{ flex: 1 }} numberOfLines={1}>
              {text || 'Viết bình luận...'}
            </Label>
            <Icon name="send" size={20} color={colors.brand} />
          </Pressable>
          <PrivateModal
            visible={open}
            animationType="slide"
            onRequestClose={close}
            onShow={() => input.current?.focus()}
          >
            <Typography.Provider value="inter">
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{
                  flex: 1,
                  backgroundColor: colors.background,
                  width: '100%',
                  maxWidth: 428,
                  alignSelf: 'center',
                }}
              >
                <View style={{ backgroundColor: colors.brand }}>
                  <StatusSpace />
                  <Row style={{ minHeight: 71, paddingHorizontal: 20, alignItems: 'center' }}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Quay lại bài đăng"
                      disabled={create.isPending}
                      onPress={close}
                      style={{ width: 44, height: 44, justifyContent: 'center' }}
                    >
                      <Icon name="chevron-back" size={26} color={colors.heroText} />
                    </Pressable>
                    <Label
                      size={25}
                      bold
                      heading
                      color={colors.heroText}
                      style={{ flex: 1, textAlign: 'center' }}
                    >
                      {reply ? 'Trả lời bình luận' : 'Viết bình luận'}
                    </Label>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Gửi bình luận"
                      accessibilityState={{
                        disabled: cannotSend,
                        busy: create.isPending,
                      }}
                      disabled={cannotSend}
                      onPress={() => void send()}
                      style={{
                        minWidth: 44,
                        minHeight: 44,
                        justifyContent: 'center',
                        alignItems: 'center',
                        opacity: !text.trim() ? 0.5 : 1,
                      }}
                    >
                      <Label size={15} bold color={colors.heroText}>
                        {create.isPending ? 'Đang gửi' : 'Gửi'}
                      </Label>
                    </Pressable>
                  </Row>
                </View>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{
                    padding: 20,
                    paddingBottom: Math.max(24, insets.bottom),
                    gap: 28,
                  }}
                >
                  {post ? (
                    <Card style={{ borderRadius: 18, minHeight: 117, padding: 13, borderWidth: 0 }}>
                      <Row style={{ alignItems: 'flex-start', gap: 12 }}>
                        <UserAvatar userId={post.userId} name={post.authorName} size={47} />
                        <View style={{ flex: 1, gap: 9 }}>
                          <Label size={14} bold>
                            {post.authorName}
                          </Label>
                          <Label size={13} numberOfLines={4}>
                            {post.body}
                          </Label>
                        </View>
                      </Row>
                    </Card>
                  ) : null}
                  {reply ? (
                    <View style={{ gap: 8 }}>
                      <Label size={13} color={colors.muted}>
                        Đang trả lời {reply.authorName}
                      </Label>
                      <Label size={13} numberOfLines={3}>
                        {reply.body}
                      </Label>
                      <Button
                        title="Hủy trả lời"
                        variant="quiet"
                        disabled={create.isPending}
                        onPress={cancelReply}
                      />
                    </View>
                  ) : null}
                  <View style={{ gap: 16 }}>
                    <Label size={18} bold>
                      Bình luận của bạn
                    </Label>
                    <View
                      style={{
                        backgroundColor: colors.surface,
                        borderRadius: 18,
                        minHeight: 150,
                        padding: 16,
                        gap: 12,
                      }}
                    >
                      <TextInput
                        ref={input}
                        accessibilityLabel="Nội dung bình luận"
                        value={text}
                        onChangeText={(value) => {
                          if (sending.current) return;
                          setText(value);
                          create.reset();
                        }}
                        maxLength={500}
                        multiline
                        editable={!create.isPending}
                        placeholder="Chia sẻ điều bạn nghĩ..."
                        placeholderTextColor={colors.muted}
                        textAlignVertical="top"
                        style={{
                          minHeight: 88,
                          color: colors.text,
                          fontSize: 15,
                          lineHeight: 21,
                          fontFamily: 'Inter_400Regular',
                          padding: 0,
                        }}
                      />
                      <Label size={11} color={colors.muted} style={{ textAlign: 'right' }}>
                        {text.length}/500
                      </Label>
                    </View>
                  </View>
                  {replyUnavailable ? (
                    <Notice tone="warning">Bình luận gốc không còn khả dụng. Hủy trả lời để giữ nội dung dưới dạng bình luận mới.</Notice>
                  ) : (
                    <CommandError error={create.error} />
                  )}
                </ScrollView>
              </KeyboardAvoidingView>
            </Typography.Provider>
          </PrivateModal>
        </RequireAuth>
      )}
    </>
  );
}
