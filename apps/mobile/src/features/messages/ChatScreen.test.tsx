import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { palettes } from '@bluesteps/design-tokens';
import { useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useApp } from '../../providers';
import { useCommand, useResource } from '../../services/queries';
import { uploadPostMedia } from '../../services/post-media';
import { useChatMessages } from './useChatMessages';
import { ConversationScreen } from './ChatScreen';
import type { Schemas } from '../../services/api';

const mockSend = jest.fn(),
  mockAppend = jest.fn();
const asset: Schemas['MediaAsset'] = {
  id: 'asset',
  kind: 'file',
  fileName: 'note.txt',
  mimeType: 'application/octet-stream',
  size: 100,
};
const message: Schemas['Message'] = {
  id: 'message',
  userId: 'alice',
  clientMessageId: 'client',
  sequence: 1,
  text: '💚',
  createdAt: '2026-11-02T00:00:00Z',
  media: [],
};
jest.mock('../../providers', () => ({ useApp: jest.fn() }));
jest.mock('../../services/queries', () => ({ useResource: jest.fn(), useCommand: jest.fn() }));
jest.mock('./useChatMessages', () => ({ useChatMessages: jest.fn() }));
jest.mock('../../services/post-media', () => ({ uploadPostMedia: jest.fn() }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { canGoBack: () => false, replace: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));
jest.mock('../scan/ScanCapture', () => ({ ScanCapture: () => null }));
jest.mock('../community/PostMedia', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    PostMedia: ({ assets }: { assets: Schemas['MediaAsset'][] }) =>
      assets.map((asset) => <Text key={asset.id}>{asset.fileName}</Text>),
  };
});
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useApp).mockReturnValue({
    colors: palettes.light,
    status: 'authenticated',
    user: { id: 'alice' },
    api: {},
  } as unknown as ReturnType<typeof useApp>);
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: 'conversation' });
  jest.mocked(useResource).mockReturnValue({
    isPending: false,
    isError: false,
    data: { members: [{ id: 'bob', displayName: 'Người nhận từ API' }] },
  } as unknown as ReturnType<typeof useResource>);
  jest.mocked(useChatMessages).mockReturnValue({
    items: [],
    history: { isPending: false, isError: false },
    append: mockAppend,
  } as unknown as ReturnType<typeof useChatMessages>);
  jest
    .mocked(useCommand)
    .mockReturnValue({ mutateAsync: mockSend, isPending: false } as unknown as ReturnType<
      typeof useCommand
    >);
  mockSend.mockResolvedValue(message);
  jest.mocked(uploadPostMedia).mockResolvedValue(asset);
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
    canceled: false,
    assets: [
      { uri: 'file:///note.txt', name: 'note.txt', mimeType: 'text/plain', lastModified: 1 },
    ],
  });
});
test('emoji picker inserts the selected value and sends a server-owned message', async () => {
  const user = userEvent.setup();
  await render(<ConversationScreen />);
  expect(screen.getByRole('button', { name: 'Gửi tin nhắn' })).toBeDisabled();
  await user.press(screen.getByRole('button', { name: 'Chọn emoji' }));
  await user.press(screen.getByRole('button', { name: 'Chèn emoji 💚' }));
  await user.press(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
  expect(mockSend).toHaveBeenCalledWith(
    expect.objectContaining({
      path: '/v1/conversations/conversation/messages',
      body: expect.objectContaining({ text: '💚', mediaIds: [] }),
    }),
  );
  await waitFor(() => expect(mockAppend).toHaveBeenCalledWith(message));
});
test('failed uploads retain the selection, retry, and send only completed asset IDs', async () => {
  const user = userEvent.setup();
  jest.mocked(uploadPostMedia).mockRejectedValueOnce(new Error('Mất kết nối'));
  await render(<ConversationScreen />);
  await user.press(screen.getByRole('button', { name: 'Đính kèm' }));
  await user.press(screen.getByRole('button', { name: 'Chọn tệp' }));
  await waitFor(() => expect(screen.getByText('Mất kết nối')).toBeVisible());
  expect(screen.getByRole('button', { name: 'Gửi tin nhắn từ xem trước' })).toBeDisabled();
  await user.press(screen.getByRole('button', { name: 'Thử tải lại note.txt' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Gửi tin nhắn từ xem trước' })).toBeEnabled(),
  );
  await user.press(screen.getByRole('button', { name: 'Gửi tin nhắn từ xem trước' }));
  expect(mockSend).toHaveBeenCalledWith(
    expect.objectContaining({ body: expect.objectContaining({ text: '', mediaIds: ['asset'] }) }),
  );
});
test('revoked membership hides messages and all sending controls', async () => {
  jest.mocked(useChatMessages).mockReturnValue({
    items: [message],
    denied: true,
    history: { isPending: false, isError: false },
  } as unknown as ReturnType<typeof useChatMessages>);
  await render(<ConversationScreen />);
  expect(screen.getByText('Bạn không còn quyền truy cập hội thoại này.')).toBeVisible();
  expect(screen.queryByText('💚')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Gửi tin nhắn' })).toBeNull();
});

test('recording remains a placeholder without creating an upload or a message', async () => {
  const user = userEvent.setup();
  await render(<ConversationScreen />);
  await user.press(screen.getByRole('button', { name: 'Ghi âm' }));
  expect(screen.getByText('Chức năng ghi âm hiện chưa được bật.')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Bắt đầu ghi âm' })).toBeNull();
  expect(uploadPostMedia).not.toHaveBeenCalled();
  expect(mockSend).not.toHaveBeenCalled();
});
test('a send completed after switching accounts cannot append to the new conversation', async () => {
  const user = userEvent.setup();
  let complete!: (value: Schemas['Message']) => void;
  mockSend.mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  await render(<ConversationScreen />);
  await user.type(screen.getByLabelText('Nội dung tin nhắn'), 'Tin đang gửi');
  await user.press(screen.getByRole('button', { name: 'Gửi tin nhắn' }));
  const account = jest.mocked(useApp)();
  jest.mocked(useApp).mockReturnValue({ ...account, user: { ...account.user!, id: 'bob' } });
  await screen.rerender(<ConversationScreen />);
  await act(async () => {
    complete(message);
  });
  expect(mockAppend).not.toHaveBeenCalled();
});
