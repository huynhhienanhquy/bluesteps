import { initialPosts } from './fixtures';
import { mockConversations, mockNotifications, type MockConversation } from './mock-session';

/** Fresh arrays/objects per app instance prevent one demo or test from mutating another. */
export function createDemoSession() {
  return {
    saved: ['workshop'],
    liked: ['post-2'],
    stops: ['green-hub', 'paper-house'],
    posts: initialPosts.map((post) => ({ ...post })),
    notifications: mockNotifications.map((notification) => ({
      ...notification,
      target: { ...notification.target },
    })),
    conversations: mockConversations.map((conversation) => ({
      ...conversation,
      messages: conversation.messages.map((message) => ({ ...message })),
    })),
  };
}
export type DemoSession = ReturnType<typeof createDemoSession>;

/** Local messages stay in the selected conversation, with IDs unique even for rapid sends. */
export function appendDemoMessage(
  conversations: MockConversation[],
  id: string,
  text: string,
): MockConversation[] {
  const content = text.trim();
  if (!content) return conversations;
  return conversations.map((conversation) => {
    if (conversation.id !== id) return conversation;
    const nextId = (conversation.messages.at(-1)?.id ?? 0) + 1;
    return {
      ...conversation,
      unreadCount: 0,
      messages: [
        ...conversation.messages,
        { id: nextId, mine: true, text: content, time: 'Vừa xong · cục bộ' },
        ...(id === 'recyclebot'
          ? [
              {
                id: nextId + 1,
                mine: false,
                text: 'Đây là phản hồi có sẵn của demo. Tra sổ tay và hỏi điểm thu gom tại địa phương để có hướng dẫn phù hợp. Chưa gọi mô hình AI.',
                time: 'Phản hồi mẫu',
              },
            ]
          : []),
      ],
    };
  });
}
