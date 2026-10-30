import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../providers';
import {
  Button,
  Card,
  Empty,
  Field,
  Label,
  MenuItem,
  Notice,
  Screen,
} from '../../design-system/ui';
import { QueryContent } from '../../design-system/QueryContent';
import { useDemoQuery } from '../../services/useDemoQuery';

export function MessagesScreen() {
  const { conversations, readConversation } = useApp();
  const query = useDemoQuery('conversations');
  const items =
    query.data?.flatMap((seed) =>
      conversations.filter((conversation) => conversation.id === seed.id),
    ) ?? [];
  return (
    <Screen title="Tin nhắn" back>
      <Notice>Tin nhắn và nhân vật đều là demo, không gửi tới người khác.</Notice>
      <QueryContent
        loading={query.isPending}
        error={query.isError}
        empty={!items.length}
        retry={() => {
          void query.refetch();
        }}
      >
        {items.map((conversation) => (
          <MenuItem
            key={conversation.id}
            title={`${conversation.name}${conversation.unreadCount ? ` · ${conversation.unreadCount} chưa đọc` : ''}`}
            detail={conversation.messages.at(-1)?.text}
            icon={conversation.icon}
            onPress={() => {
              readConversation(conversation.id);
              router.push(
                conversation.id === 'recyclebot'
                  ? '/assistant'
                  : `/conversation?id=${conversation.id}`,
              );
            }}
          />
        ))}
      </QueryContent>
    </Screen>
  );
}

export function ConversationScreen({ assistant = false }: { assistant?: boolean }) {
  const { colors, conversations, sendMessage } = useApp();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const conversationId = assistant ? 'recyclebot' : (id ?? 'minh-an');
  const conversation = conversations.find((item) => item.id === conversationId);
  const [text, setText] = useState('');
  function send() {
    if (!text.trim() || !conversation) return;
    sendMessage(conversationId, text);
    setText('');
  }
  if (!conversation)
    return (
      <Screen title="Hội thoại demo" back>
        <Empty title="Không tìm thấy hội thoại" />
      </Screen>
    );
  return (
    <Screen title={`${conversation.name} · Demo`} back>
      <Notice>
        {assistant
          ? 'Phản hồi có sẵn, không phải AI. Không có âm thanh được ghi lại.'
          : 'Lịch sử mẫu và tin nhắn bạn thêm chỉ ở phiên hiện tại. Chưa có WebSocket hoặc gửi thật.'}
      </Notice>
      {conversation.messages.map((message) => (
        <View
          key={message.id}
          style={{ alignSelf: message.mine ? 'flex-end' : 'flex-start', maxWidth: '90%' }}
        >
          <Card style={{ backgroundColor: message.mine ? colors.soft : colors.surface }}>
            <Label>{message.text}</Label>
            <Label size={10} color={colors.muted}>
              {message.time} · {message.mine ? 'Bạn' : conversation.name}
            </Label>
          </Card>
        </View>
      ))}
      {assistant ? (
        <Button
          title="Mở sổ tay rác"
          variant="secondary"
          onPress={() => router.push('/handbook')}
        />
      ) : null}
      <Field
        label="Nội dung tin nhắn demo"
        value={text}
        onChangeText={setText}
        multiline
        maxLength={1000}
      />
      <Button title="Thêm tin nhắn vào demo" onPress={send} disabled={!text.trim()} />
    </Screen>
  );
}
