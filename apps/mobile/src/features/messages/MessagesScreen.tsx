import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Artwork, StatusSpace } from '../../design-system/DesignScreen';
import { Button, Icon, Label, Row, Typography } from '../../design-system/ui';
import { useApp } from '../../providers';
import type { Schemas } from '../../services/api';
import { useCommand, usePages, useResource } from '../../services/queries';
import { CommandError, More, QueryState, RequireAuth } from '../shared/common';
import { useOptionalLocalProfile } from '../profile/LocalProfileProvider';
import { PrivateModal } from '../shared/PrivateModal';
import { UserAvatar } from '../profile/UserAvatar';
import { ChatNote } from './ChatNote';
import { sharedPostContent, validPostId } from '../community/post-link';

type Person = Schemas['PublicMember'];
type Conversation = Schemas['ConversationSummary'];
function useSearchTerm(value: string) {
  const [term, setTerm] = useState(value.trim());
  useEffect(() => {
    const timer = setTimeout(() => setTerm(value.trim()), 250);
    return () => clearTimeout(timer);
  }, [value]);
  return term;
}
function messagePreview(conversation: Conversation, userId?: string) {
  const message = conversation.lastMessage;
  if (!message) return 'Bắt đầu trò chuyện';
  const shared = sharedPostContent(message.text);
  const content =
    (shared ? shared.caption || 'Đã chia sẻ bài đăng' : message.text) ||
    (message.media[0]?.kind === 'image'
      ? 'Đã gửi ảnh'
      : message.media[0]?.kind === 'video'
        ? 'Đã gửi video'
        : 'Đã gửi tệp đính kèm');
  return `${message.userId === userId ? 'Bạn: ' : ''}${content}`;
}
function messageTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleDateString() === new Date().toLocaleDateString()
    ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export function MessagesScreen() {
  const { colors, user } = useApp();
  return (
    <Typography.Provider value="inter">
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <StatusSpace />
        <RequireAuth>
          <MessagesBody key={user?.id} />
        </RequireAuth>
      </View>
    </Typography.Provider>
  );
}

function MessagesBody() {
  const { user, colors, dark } = useApp();
  const local = useOptionalLocalProfile()?.profile;
  const { q = '', share_post } = useLocalSearchParams<{ q?: string; share_post?: string }>();
  const sharePost = validPostId(share_post);
  const shared = useResource<Schemas['Post']>(`/v1/posts/${sharePost ?? ''}`, false, !!sharePost);
  const insets = useSafeAreaInsets();
  const query = usePages<Conversation>('/v1/conversations?sort=recent', true);
  const friends = usePages<Schemas['CommunityMember']>('/v1/me/friends?state=friends', true);
  const search = useSearchTerm(q);
  const people = usePages<Schemas['PublicUser']>(
    `/v1/users?q=${encodeURIComponent(search)}`,
    true,
    search.length >= 2,
  );
  const [picker, setPicker] = useState(!!sharePost);
  useEffect(() => {
    if (sharePost) setPicker(true);
  }, [sharePost]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const recipientTerm = useSearchTerm(recipientSearch);
  const recipients = usePages<Schemas['PublicUser']>(
    `/v1/users?q=${encodeURIComponent(recipientTerm)}`,
    true,
    picker && recipientTerm.length >= 2,
  );
  const matchedPeople = [
    ...new Map(
      (people.data?.pages.flatMap((page) => page.items) ?? []).map((person) => [person.id, person]),
    ).values(),
  ];
  const matchedRecipients = [
    ...new Map(
      (recipients.data?.pages.flatMap((page) => page.items) ?? []).map((person) => [
        person.id,
        person,
      ]),
    ).values(),
  ];
  const command = useCommand<Schemas['Conversation']>();
  const [opening, setOpening] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const working = useRef(false);
  const active = useRef(true);
  const { refetch } = query;
  const { refetch: refreshFriends } = friends;
  useEffect(() => {
    if (picker) void refreshFriends();
  }, [picker, refreshFriends]);
  useFocusEffect(
    useCallback(() => {
      active.current = true;
      void refetch();
      void refreshFriends();
      const refresh = () => {
        if (
          AppState.currentState === 'active' &&
          (Platform.OS !== 'web' || document.visibilityState === 'visible')
        )
          void refetch();
      };
      const timer = setInterval(refresh, 10_000);
      const listener = AppState.addEventListener('change', (state) => {
        if (state === 'active') refresh();
      });
      return () => {
        active.current = false;
        clearInterval(timer);
        listener.remove();
      };
    }, [refetch, refreshFriends]),
  );
  const conversations = [
    ...new Map(
      (query.data?.pages.flatMap((page) => page.items) ?? []).map((conversation) => [
        conversation.id,
        conversation,
      ]),
    ).values(),
  ];
  const contacts = [
    ...new Map<string, Person>(
      [
        ...(friends.data?.pages.flatMap((page) => page.items) ?? []),
        ...conversations.flatMap((conversation) => conversation.members),
      ]
        .filter((person) => person.id !== user?.id)
        .map((person) => [person.id, person]),
    ).values(),
  ];
  async function start(person: Person) {
    if (working.current || (sharePost && !shared.data)) return;
    working.current = true;
    setOpening(person.id);
    try {
      const conversation = await command.mutateAsync({
        path: '/v1/conversations',
        body: { recipientId: person.id },
      });
      if (!active.current) return;
      Keyboard.dismiss();
      setPicker(false);
      if (sharePost) router.setParams({ share_post: undefined });
      router.push({
        pathname: '/conversation',
        params: { id: conversation.id, ...(sharePost ? { share_post: sharePost } : {}) },
      });
    } catch {
      // Keep the recipient selection and error available for retry.
    } finally {
      working.current = false;
      setOpening('');
    }
  }
  function closePicker() {
    if (!working.current) {
      setPicker(false);
      if (sharePost) router.setParams({ share_post: undefined });
    }
  }
  const personRow = (person: Person) => (
    <Pressable
      key={person.id}
      accessibilityRole="button"
      accessibilityLabel={`Nhắn tin ${person.displayName}`}
      accessibilityState={{
        disabled: command.isPending || (!!sharePost && !shared.data),
        busy: opening === person.id,
      }}
      disabled={command.isPending || (!!sharePost && !shared.data)}
      onPress={() => void start(person)}
      style={{
        minHeight: 86,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        opacity: opening && opening !== person.id ? 0.5 : 1,
      }}
    >
      <UserAvatar userId={person.id} name={person.displayName} size={70} />
      <View style={{ flex: 1, gap: 7 }}>
        <Label size={13} weight="semibold">
          {person.displayName}
        </Label>
        <Label size={11} color={colors.muted}>
          {opening === person.id
            ? 'Đang mở hội thoại…'
            : sharePost
              ? 'Nhấn để xem trước tin nhắn'
              : 'Nhấn để trò chuyện'}
        </Label>
      </View>
      <Icon name="chatbubble-outline" size={20} color={colors.brand} />
    </Pressable>
  );
  return (
    <>
      <Row style={{ paddingHorizontal: 20, minHeight: 58, alignItems: 'center', gap: 10 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/community'))}
          style={{ width: 28, minHeight: 44, justifyContent: 'center' }}
        >
          <Icon name="chevron-back" size={27} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Xem phần thưởng"
          onPress={() => router.push('/rewards')}
          style={{ flex: 1, gap: 3 }}
        >
          <Label size={30} bold heading numberOfLines={1}>
            {local?.displayName ?? user?.displayName ?? 'Tin nhắn'}
          </Label>
          <Label size={10} color={colors.muted}>
            Nhấn để đổi thưởng
          </Label>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tin nhắn mới"
          onPress={() => {
            command.reset();
            setRecipientSearch('');
            setPicker(true);
          }}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="create-outline" size={25} color={colors.brand} />
        </Pressable>
      </Row>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void Promise.all([query.refetch(), refreshFriends()]).finally(() =>
                setRefreshing(false),
              );
            }}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: Math.max(24, insets.bottom),
          gap: 24,
        }}
      >
        <Row
          style={{
            minHeight: 48,
            borderRadius: 24,
            backgroundColor: colors.background,
            alignItems: 'center',
            paddingHorizontal: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Icon name="search-outline" size={21} color={colors.muted} />
          <TextInput
            accessibilityLabel="Tìm người dùng hoặc hỏi RecycleBot"
            value={q}
            onChangeText={(value) => router.setParams({ q: value })}
            maxLength={100}
            placeholder="Tìm người dùng hoặc hỏi RecycleBot"
            placeholderTextColor={colors.muted}
            style={{
              flex: 1,
              minHeight: 46,
              fontSize: 13,
              color: colors.text,
              fontFamily: 'Inter_400Regular',
            }}
          />
          {q ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xóa tìm kiếm"
              onPress={() => router.setParams({ q: '' })}
              style={{ width: 36, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="close" size={19} />
            </Pressable>
          ) : null}
        </Row>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            q.trim() ? `Hỏi RecycleBot về ${q.trim()}` : 'Trò chuyện với RecycleBot'
          }
          onPress={() => {
            Keyboard.dismiss();
            router.push({
              pathname: '/assistant',
              params: q.trim() ? { question: q.trim() } : {},
            });
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 12,
            borderRadius: 18,
            backgroundColor: colors.soft,
          }}
        >
          <Artwork source={require('../../../assets/images/assistant/avatar.png')} width={42} />
          <View style={{ flex: 1, gap: 4 }}>
            <Label size={14} bold>
              RecycleBot
            </Label>
            <Label size={12} color={colors.muted} numberOfLines={2}>
              {q.trim() ? `Hỏi về “${q.trim()}”` : 'Hỏi về phân loại và điểm thu gom'}
            </Label>
          </View>
          <Icon name="chevron-forward" size={20} color={colors.brand} />
        </Pressable>
        <CommandError error={command.error} />
        {q.trim() ? (
          <View style={{ gap: 10 }}>
            <Label size={16} bold>
              Kết quả tìm kiếm
            </Label>
            {q.trim().length < 2 ? (
              <Label size={13} color={colors.muted}>
                Nhập ít nhất 2 ký tự để tìm người nhận.
              </Label>
            ) : search !== q.trim() ? (
              <Label size={13} color={colors.muted}>
                Đang tìm…
              </Label>
            ) : (
              <QueryState
                query={people}
                empty={!matchedPeople.length}
                emptyText="Chưa tìm thấy người dùng"
              >
                {matchedPeople.map(personRow)}
                <More query={people} />
              </QueryState>
            )}
          </View>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 0, paddingVertical: 10 }}
            >
              <ChatNote />
              {contacts.slice(0, 12).map((person) => (
                <Pressable
                  key={person.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Nhắn tin ${person.displayName}`}
                  disabled={command.isPending}
                  onPress={() => void start(person)}
                  style={{ width: 110, height: 136, alignItems: 'center', gap: 4, paddingTop: 31 }}
                >
                  <UserAvatar userId={person.id} name={person.displayName} size={80} />
                  <Label size={10} numberOfLines={1}>
                    {person.displayName}
                  </Label>
                </Pressable>
              ))}
            </ScrollView>
            <Row style={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Label size={15} bold heading>
                Tin nhắn
              </Label>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/game')}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Label size={14} bold color={colors.brand}>
                  Trò chơi
                </Label>
              </Pressable>
            </Row>
            <QueryState query={query}>
              {conversations.length === 0 ? (
                <View style={{ gap: 12 }}>
                  <Label size={14} color={colors.muted}>
                    Chưa có hội thoại. Chọn một người để bắt đầu trò chuyện.
                  </Label>
                  <Button
                    title="Tin nhắn mới"
                    onPress={() => {
                      command.reset();
                      setPicker(true);
                    }}
                  />
                </View>
              ) : null}
              {conversations.map((conversation) => {
                const members = conversation.members.filter((member) => member.id !== user?.id);
                const name = members.map((member) => member.displayName).join(', ') || 'Hội thoại';
                return (
                  <Pressable
                    key={conversation.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${name}, ${conversation.unreadCount} tin nhắn chưa đọc`}
                    onPress={() =>
                      router.push({ pathname: '/conversation', params: { id: conversation.id } })
                    }
                    style={{ minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: 14 }}
                  >
                    <UserAvatar userId={members[0]?.id} name={name} size={70} />
                    <View style={{ flex: 1, gap: 7 }}>
                      <Row style={{ alignItems: 'center' }}>
                        <Label
                          size={13}
                          weight={conversation.unreadCount ? 'bold' : 'semibold'}
                          numberOfLines={1}
                          style={{ flex: 1 }}
                        >
                          {name}
                        </Label>
                        <Label size={10} color={colors.muted}>
                          {messageTime(conversation.lastMessage?.createdAt)}
                        </Label>
                      </Row>
                      <Label
                        size={12}
                        color={conversation.unreadCount ? colors.text : colors.muted}
                        numberOfLines={2}
                      >
                        {messagePreview(conversation, user?.id)}
                      </Label>
                    </View>
                    {conversation.unreadCount ? (
                      <View
                        style={{
                          minWidth: 22,
                          height: 22,
                          paddingHorizontal: 5,
                          borderRadius: 11,
                          backgroundColor: colors.brand,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Label size={10} bold color={colors.heroText}>
                          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                        </Label>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
              <More query={query} />
            </QueryState>
          </>
        )}
      </ScrollView>
      <PrivateModal visible={picker} transparent animationType="fade" onRequestClose={closePicker}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,.08)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <View
            accessibilityViewIsModal
            style={{
              width: '100%',
              maxWidth: 380,
              maxHeight: '85%',
              borderRadius: 20,
              backgroundColor: dark ? colors.surface : '#A8D5ED',
              padding: 20,
              gap: 14,
            }}
          >
            <Row style={{ alignItems: 'center' }}>
              <Label
                size={30}
                bold
                heading
                color={dark ? colors.text : '#FFFFFF'}
                style={{ flex: 1, textAlign: 'center' }}
              >
                Gửi đến
              </Label>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng chọn người nhận"
                disabled={command.isPending}
                onPress={closePicker}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="close-circle-outline" size={27} />
              </Pressable>
            </Row>
            <TextInput
              accessibilityLabel="Tìm người nhận"
              value={recipientSearch}
              onChangeText={setRecipientSearch}
              maxLength={100}
              placeholder="Tìm người nhận"
              placeholderTextColor={colors.muted}
              style={{
                minHeight: 48,
                borderRadius: 24,
                backgroundColor: colors.surface,
                paddingHorizontal: 16,
                color: colors.text,
                fontSize: 14,
              }}
            />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 12, gap: 8 }}
            >
              {sharePost ? (
                <QueryState query={shared}>
                  {shared.data ? (
                    <View
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        backgroundColor: colors.surface,
                        gap: 7,
                      }}
                    >
                      <Label size={12} bold>
                        Bài đăng muốn chia sẻ
                      </Label>
                      <Label size={12} numberOfLines={3}>
                        {shared.data.body}
                      </Label>
                      {shared.data.visibility !== 'public' ? (
                        <Label size={11} color={colors.muted}>
                          Người nhận chỉ xem được bài khi có quyền truy cập.
                        </Label>
                      ) : null}
                    </View>
                  ) : null}
                </QueryState>
              ) : null}
              <CommandError error={command.error} />
              {recipientSearch.trim() ? (
                recipientSearch.trim().length < 2 ? (
                  <Label size={13}>Nhập ít nhất 2 ký tự để tìm người nhận.</Label>
                ) : recipientTerm !== recipientSearch.trim() ? (
                  <Label size={13}>Đang tìm…</Label>
                ) : (
                  <QueryState
                    query={recipients}
                    empty={!matchedRecipients.length}
                    emptyText="Chưa tìm thấy người nhận"
                  >
                    {matchedRecipients.map(personRow)}
                    <More query={recipients} />
                  </QueryState>
                )
              ) : (
                <>
                  {contacts.map(personRow)}
                  {contacts.length === 0 ? (
                    <Label size={13}>Tìm tên người nhận để bắt đầu hội thoại mới.</Label>
                  ) : null}
                  <More query={friends} />
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </PrivateModal>
    </>
  );
}
