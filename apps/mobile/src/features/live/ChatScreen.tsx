import { UserAvatar } from './UserAvatar';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { PrivateModal as Modal } from './PrivateModal';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Field, Icon, Label, Notice, Row, Typography } from '../../design-system/ui';
import { Artwork, StatusSpace } from '../../design-system/DesignScreen';
import { useApp } from '../../providers';
import { errorMessage, operationKey, type Schemas } from '../../services/api';
import type { MediaSource } from '../../services/media-files';
import { uploadPostMedia } from '../../services/post-media';
import { useCommand, useResource } from '../../services/queries';
import { CommandError, QueryState, RequireAuth } from './common';
import { ComposerSheet } from './ComposerSheet';
import { PostMedia } from './PostMedia';
import { useChatMessages } from './useChatMessages';
import { ScanCapture } from './ScanCapture';
import { ChatComposer } from './ChatComposer';
import { ChatEmojiPicker } from './ChatEmojiPicker';
import { ChatMessageContent } from './ChatMessageContent';
import { postLink, sharedPostContent, validPostId } from './post-link';

type Selected = {
  source: MediaSource;
  progress: number;
  asset?: Schemas['MediaAsset'];
  error?: string;
};
export function ConversationScreen() {
  const { id, share_post } = useLocalSearchParams<{ id?: string; share_post?: string }>();
  const sharePost = validPostId(share_post);
  const { user } = useApp();
  if (!id)
    return (
      <View style={{ flex: 1, padding: 20 }}>
        <StatusSpace />
        <Notice>Chọn hội thoại để bắt đầu nhắn tin.</Notice>
        <Button title="Về tin nhắn" onPress={() => router.replace('/messages')} />
      </View>
    );
  return (
    <Typography.Provider value="inter">
      <RequireAuth>
        <ChatBody key={`${user?.id}:${id}:${sharePost ?? ''}`} id={id} sharePost={sharePost} />
      </RequireAuth>
    </Typography.Provider>
  );
}

function ChatBody({ id, sharePost }: { id: string; sharePost: string | null }) {
  const { api, user, colors, dark } = useApp();
  const insets = useSafeAreaInsets();
  const conversation = useResource<Schemas['Conversation']>(`/v1/conversations/${id}`, true);
  const [atBottom, setAtBottom] = useState(true);
  const messages = useChatMessages(id, atBottom);
  const command = useCommand<Schemas['Message']>();
  const [text, setText] = useState(() => (sharePost ? postLink(sharePost) : ''));
  const [sheet, setSheet] = useState(sharePost ? 'preview' : '');
  const [selected, setSelected] = useState<Selected[]>([]);
  const [error, setError] = useState('');
  const [selecting, setSelecting] = useState(false);
  const [newMessages, setNewMessages] = useState(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const nearBottom = useRef(true);
  const previousLatest = useRef(0);
  const alive = useRef(true);
  const controllers = useRef(new Map<string, AbortController>());
  const pending = useRef<{ signature: string; id: string } | null>(null);
  const sending = useRef(false);
  const picking = useRef(false);
  const attachmentIds = useRef(new Set<string>());
  useFocusEffect(
    useCallback(() => {
      if (sheet !== 'emoji') return;
      const listener = BackHandler.addEventListener('hardwareBackPress', () => {
        setSheet('');
        return true;
      });
      return () => listener.remove();
    }, [sheet]),
  );
  useEffect(() => {
    alive.current = true;
    const current = controllers.current;
    return () => {
      alive.current = false;
      for (const controller of current.values()) controller.abort();
    };
  }, []);
  useEffect(() => {
    const latest = messages.items.at(-1)?.sequence ?? 0;
    if (latest > previousLatest.current && !nearBottom.current) setNewMessages(true);
    previousLatest.current = latest;
  }, [messages.items]);
  function open(value: string) {
    if (sending.current || picking.current) return;
    Keyboard.dismiss();
    setSheet(value);
  }
  async function upload(source: MediaSource) {
    if (controllers.current.has(source.clientUploadId) || sending.current) return;
    const controller = new AbortController();
    controllers.current.set(source.clientUploadId, controller);
    const update = (patch: Partial<Selected>) => {
      if (alive.current && !controller.signal.aborted)
        setSelected((current) =>
          current.map((item) =>
            item.source.clientUploadId === source.clientUploadId ? { ...item, ...patch } : item,
          ),
        );
    };
    update({ error: undefined, progress: 0 });
    try {
      const asset = await uploadPostMedia(api, source, controller.signal, (loaded, total) =>
        update({ progress: Math.round((loaded / total) * 100) }),
      );
      update({ asset, progress: 100 });
    } catch (cause) {
      update({ error: errorMessage(cause) });
    } finally {
      if (controllers.current.get(source.clientUploadId) === controller)
        controllers.current.delete(source.clientUploadId);
    }
  }
  function add(sources: MediaSource[]) {
    if (!alive.current || sending.current) return;
    if (attachmentIds.current.size + sources.length > 10) {
      setError('Tối đa 10 tệp trong một tin nhắn.');
      return;
    }
    for (const source of sources) attachmentIds.current.add(source.clientUploadId);
    setSelected((current) => [...current, ...sources.map((source) => ({ source, progress: 0 }))]);
    setSheet('preview');
    for (const source of sources) void upload(source);
  }
  async function pick(images: boolean) {
    if (picking.current || sending.current) return;
    if (attachmentIds.current.size >= 10) {
      setError('Tối đa 10 tệp trong một tin nhắn. Gỡ một tệp trước khi chọn thêm.');
      return;
    }
    picking.current = true;
    setSelecting(true);
    Keyboard.dismiss();
    setError('');
    try {
      if (images) {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images', 'videos'],
          allowsMultipleSelection: true,
          selectionLimit: Math.max(1, 10 - attachmentIds.current.size),
          quality: 0.8,
        });
        if (!result.canceled)
          add(
            result.assets.map((asset) => ({
              uri: asset.uri,
              name: asset.fileName ?? (asset.type === 'video' ? 'video.mp4' : 'photo.jpg'),
              mime: asset.mimeType ?? (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
              kind: asset.type === 'video' ? 'video' : 'image',
              size: asset.fileSize,
              file: asset.file,
              clientUploadId: operationKey(),
            })),
          );
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          multiple: true,
          copyToCacheDirectory: true,
        });
        if (!result.canceled)
          add(
            result.assets.map((asset) => ({
              uri: asset.uri,
              name: asset.name,
              mime: asset.mimeType ?? 'application/octet-stream',
              kind: asset.mimeType?.startsWith('audio/')
                ? 'audio'
                : asset.mimeType?.startsWith('image/')
                  ? 'image'
                  : asset.mimeType?.startsWith('video/')
                    ? 'video'
                    : 'file',
              size: asset.size,
              file: asset.file,
              clientUploadId: operationKey(),
            })),
          );
      }
    } catch (cause) {
      if (alive.current) setError(errorMessage(cause));
    } finally {
      picking.current = false;
      if (alive.current) setSelecting(false);
    }
  }
  const ready = selected.every((item) => !!item.asset);
  const canSend =
    (!!text.trim() || selected.length > 0) && ready && !command.isPending && !selecting;
  function send() {
    if (!canSend || sending.current || picking.current) return;
    sending.current = true;
    const sentText = text;
    const sentAttachments = selected.map((item) => item.source.clientUploadId);
    const mediaIds = selected.flatMap((item) => (item.asset ? [item.asset.id] : []));
    const signature = JSON.stringify([sentText.trim(), mediaIds]);
    if (pending.current?.signature !== signature)
      pending.current = { signature, id: operationKey() };
    void command
      .mutateAsync({
        path: `/v1/conversations/${id}/messages`,
        body: { clientMessageId: pending.current.id, text: sentText.trim(), mediaIds },
      })
      .then((message) => {
        if (!alive.current) return;
        pending.current = null;
        for (const attachment of sentAttachments) attachmentIds.current.delete(attachment);
        setSheet('');
        setText((current) => (current === sentText ? '' : current));
        setSelected((current) =>
          current.filter((item) => !item.asset || !mediaIds.includes(item.asset.id)),
        );
        messages.append(message);
        nearBottom.current = true;
        setAtBottom(true);
      })
      .catch(() => {})
      .finally(() => {
        sending.current = false;
      });
  }
  const close = () => setSheet('');
  if (messages.denied || conversation.isError)
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, paddingHorizontal: 20, gap: 16 }}>
        <StatusSpace />
        <Button
          title="Về tin nhắn"
          variant="quiet"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/messages'))}
        />
        <QueryState query={conversation.isError ? conversation : messages.history}>
          <Notice tone="error">Bạn không còn quyền truy cập hội thoại này.</Notice>
        </QueryState>
      </View>
    );
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.surface }}
    >
      <StatusSpace />
      <Row style={{ paddingHorizontal: 18, minHeight: 64, alignItems: 'center', gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/messages'))}
          style={{ width: 24, height: 44, justifyContent: 'center' }}
        >
          {dark ? (
            <Icon name="chevron-back" size={24} />
          ) : (
            <Artwork
              source={require('../../../assets/icons/chat/chatchevronbackward.svg')}
              width={10.7917}
              height={17.5}
            />
          )}
        </Pressable>
        {conversation.data?.members
          .filter((member) => member.id !== user?.id)
          .slice(0, 1)
          .map((member) => (
            <Pressable
              key={member.id}
              accessibilityRole="button"
              accessibilityLabel="Xem trang cá nhân"
              onPress={() => router.push({ pathname: '/community', params: { member: member.id } })}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <UserAvatar userId={member.id} name={member.displayName} size={51} />
              <View style={{ flex: 1, gap: 5 }}>
                <Label size={14} bold heading numberOfLines={1}>
                  {member.displayName}
                </Label>
                <Label size={11} color={colors.muted}>
                  Xem trang cá nhân
                </Label>
              </View>
            </Pressable>
          )) ?? (
          <Label size={16} bold>
            Hội thoại
          </Label>
        )}
      </Row>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ padding: 18, gap: 12 }}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        scrollEventThrottle={100}
        onScroll={({ nativeEvent: event }) => {
          nearBottom.current =
            event.contentSize.height - event.contentOffset.y - event.layoutMeasurement.height < 120;
          setAtBottom(nearBottom.current);
          if (nearBottom.current) setNewMessages(false);
        }}
        onContentSizeChange={() => {
          if (nearBottom.current) scroll.current?.scrollToEnd({ animated: false });
        }}
      >
        {messages.hasMore ? (
          <Button
            title="Tải thêm tin nhắn"
            variant="quiet"
            pending={messages.loading}
            onPress={() => {
              nearBottom.current = false;
              setAtBottom(false);
              void messages.loadOlder();
            }}
          />
        ) : null}
        {!messages.history.isPending && !messages.hasMore
          ? conversation.data?.members
              .filter((member) => member.id !== user?.id)
              .slice(0, 1)
              .map((member) => (
                <View
                  key={member.id}
                  style={{ alignItems: 'center', gap: 10, paddingVertical: 16 }}
                >
                  <UserAvatar userId={member.id} name={member.displayName} size={130} />
                  <Label size={14} bold>
                    {member.displayName}
                  </Label>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Xem trang cá nhân"
                    onPress={() =>
                      router.push({ pathname: '/community', params: { member: member.id } })
                    }
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 12,
                      minHeight: 36,
                      paddingHorizontal: 24,
                      justifyContent: 'center',
                    }}
                  >
                    <Label size={12}>Xem trang cá nhân</Label>
                  </Pressable>
                </View>
              ))
          : null}
        <QueryState query={messages.history}>
          {messages.items.map((message, index) => {
            const own = message.userId === user?.id;
            const previous = messages.items[index - 1];
            const date = new Date(message.createdAt);
            const newDay =
              !previous ||
              new Date(previous.createdAt).toLocaleDateString() !== date.toLocaleDateString();
            const sender = conversation.data?.members.find(
              (member) => member.id === message.userId,
            );
            const showAvatar =
              !previous ||
              newDay ||
              previous?.userId !== message.userId ||
              date.getTime() - new Date(previous.createdAt).getTime() > 300_000;
            const media = !!message.media?.length;
            return (
              <View key={message.id} style={{ gap: 10 }}>
                {newDay ? (
                  <Label
                    size={12}
                    color={colors.muted}
                    style={{ textAlign: 'center', marginVertical: 10 }}
                  >
                    {date.toLocaleDateString('vi-VN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Label>
                ) : null}
                <Row
                  style={{
                    alignItems: 'flex-end',
                    justifyContent: own ? 'flex-end' : 'flex-start',
                    gap: 12,
                  }}
                >
                  {!own ? (
                    showAvatar ? (
                      <UserAvatar
                        userId={message.userId}
                        name={sender?.displayName ?? 'Thành viên'}
                        size={44}
                      />
                    ) : (
                      <View style={{ width: 44 }} />
                    )
                  ) : null}
                  <View
                    style={{
                      maxWidth: own ? '80%' : '76%',
                      width: media ? '76%' : undefined,
                      gap: 4,
                    }}
                  >
                    <Card
                      style={{
                        borderWidth: 0,
                        borderRadius: 18,
                        padding: own || media ? 12 : 0,
                        gap: 8,
                        backgroundColor: media ? colors.soft : own ? colors.brand : colors.surface,
                      }}
                    >
                      {message.text ? (
                        <ChatMessageContent text={message.text} own={own && !media} />
                      ) : null}
                      {media ? <PostMedia assets={message.media} context="tin nhắn" /> : null}
                    </Card>
                    <Label
                      size={10}
                      color={colors.muted}
                      style={{ textAlign: own ? 'right' : 'left' }}
                    >
                      {own ? 'Đã gửi · ' : ''}
                      {date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </Label>
                  </View>
                </Row>
              </View>
            );
          })}
        </QueryState>
        <CommandError error={messages.error} />
        {messages.readError ? (
          <View style={{ gap: 8 }}>
            <Notice>Chưa cập nhật được trạng thái đã đọc.</Notice>
            <Button
              title="Cập nhật trạng thái đã đọc"
              variant="quiet"
              disabled={!atBottom}
              onPress={messages.retryRead}
            />
          </View>
        ) : null}
      </ScrollView>
      {newMessages ? (
        <Button
          title="Tin nhắn mới"
          variant="secondary"
          onPress={() => {
            nearBottom.current = true;
            setAtBottom(true);
            setNewMessages(false);
            scroll.current?.scrollToEnd({ animated: true });
          }}
        />
      ) : null}
      {sheet !== 'emoji' || command.error || error || selected.length || sharedPostContent(text) ? (
        <View
          style={{
            padding: 16,
            paddingBottom: sheet === 'emoji' ? 8 : Math.max(16, insets.bottom),
            gap: 10,
            borderTopWidth: 1,
            borderColor: colors.border,
          }}
        >
          <CommandError error={command.error} />
          {error ? <Notice tone="error">{error}</Notice> : null}
          {selected.length || sharedPostContent(text) ? (
            <Button
              title={
                selected.length
                  ? `Xem trước ${selected.length} tệp đính kèm`
                  : 'Xem trước bài đăng được chia sẻ'
              }
              variant="quiet"
              disabled={command.isPending || selecting}
              onPress={() => open('preview')}
            />
          ) : null}
          {sheet !== 'emoji' ? (
            <ChatComposer
              text={text}
              onChange={setText}
              disabled={command.isPending || selecting}
              pending={command.isPending}
              canSend={canSend}
              hasAttachments={selected.length > 0}
              send={send}
              onAction={(action) => {
                if (action === 'images') void pick(true);
                else if (action === 'file') void pick(false);
                else open(action);
              }}
            />
          ) : null}
        </View>
      ) : null}
      {sheet === 'emoji' ? (
        <ChatEmojiPicker
          text={text}
          onChange={setText}
          disabled={command.isPending || selecting}
          pending={command.isPending}
          canSend={canSend}
          send={send}
          close={close}
          bottom={insets.bottom}
        />
      ) : null}
      <ComposerSheet title="Đính kèm" visible={sheet === 'attach'} close={close}>
        <Button
          title="Chọn ảnh hoặc video"
          disabled={selecting || command.isPending}
          onPress={() => void pick(true)}
        />
        <Button
          title="Chụp ảnh"
          variant="secondary"
          disabled={selecting || command.isPending}
          onPress={() => open('camera')}
        />
        <Button
          title="Chọn tệp"
          variant="secondary"
          disabled={selecting || command.isPending}
          onPress={() => void pick(false)}
        />
        <Button
          title="Ghi âm"
          variant="secondary"
          disabled={selecting || command.isPending}
          onPress={() => open('record')}
        />
      </ComposerSheet>
      {sheet === 'camera' ? (
        <Modal visible animationType="slide" onRequestClose={close}>
          <ScanCapture
            mode="message"
            onClose={close}
            onPick={() => void pick(true)}
            onImage={(uri) =>
              add([
                {
                  uri,
                  kind: 'image',
                  mime: 'image/jpeg',
                  name: 'chat-camera.jpg',
                  clientUploadId: operationKey(),
                },
              ])
            }
          />
        </Modal>
      ) : null}
      <ComposerSheet title="Ghi âm" visible={sheet === 'record'} close={close}>
        <Notice>Chức năng ghi âm hiện chưa được bật.</Notice>
      </ComposerSheet>
      <ComposerSheet title="Xem trước tin nhắn" visible={sheet === 'preview'} close={close}>
        {sharedPostContent(text) ? <ChatMessageContent text={text} own={false} /> : null}
        {selected.map((item) => (
          <Card key={item.source.clientUploadId}>
            {item.asset ? (
              <PostMedia assets={[item.asset]} context="tin nhắn" />
            ) : (
              <Label>
                {item.source.name} · {item.progress}%
              </Label>
            )}
            {item.error ? (
              <>
                <Notice tone="error">{item.error}</Notice>
                <Button
                  title={'Thử tải lại ' + item.source.name}
                  onPress={() => void upload(item.source)}
                />
              </>
            ) : null}
            <Button
              title={'Gỡ tệp ' + item.source.name}
              variant="quiet"
              disabled={command.isPending}
              onPress={() => {
                if (sending.current) return;
                controllers.current.get(item.source.clientUploadId)?.abort();
                attachmentIds.current.delete(item.source.clientUploadId);
                setSelected((current) =>
                  current.filter(
                    (value) => value.source.clientUploadId !== item.source.clientUploadId,
                  ),
                );
              }}
            />
          </Card>
        ))}
        <Field
          label="Chú thích tin nhắn"
          value={text}
          onChangeText={setText}
          maxLength={4000}
          editable={!command.isPending}
        />
        <CommandError error={command.error} />
        <Button
          title="Gửi tin nhắn từ xem trước"
          pending={command.isPending}
          disabled={!canSend}
          onPress={send}
        />
      </ComposerSheet>
    </KeyboardAvoidingView>
  );
}
