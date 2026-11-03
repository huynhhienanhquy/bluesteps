import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { palettes } from '@bluesteps/design-tokens';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../../providers';
import { useCommand, usePages, useResource } from '../../services/queries';
import { uploadPostMedia } from '../../services/post-media';
import { ComposerScreen } from './ComposerScreen';
import type { Schemas } from '../../services/api';

const mockMutate = jest.fn();
const mockAsync = jest.fn();
const asset: Schemas['MediaAsset'] = {
  id: 'image',
  kind: 'image',
  fileName: 'picked.jpg',
  mimeType: 'image/jpeg',
  size: 100,
  width: 16,
  height: 12,
};
const empty: Schemas['PostDraft'] = {
  content: {
    body: '',
    visibility: 'public',
    mediaIds: [],
    topic: null,
    place: null,
    emotion: null,
  },
  media: [],
  version: 0,
  updatedAt: null,
};
jest.mock('../../providers', () => ({ useApp: jest.fn() }));
jest.mock('../../services/queries', () => ({
  useResource: jest.fn(),
  usePages: jest.fn(),
  useCommand: jest.fn(),
}));
jest.mock('../../services/post-media', () => ({ uploadPostMedia: jest.fn() }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { canGoBack: () => false, push: jest.fn(), replace: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock('./PostMedia', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    PostMedia: ({ assets }: { assets: Schemas['MediaAsset'][] }) =>
      assets.map((asset) => <Text key={asset.id}>{asset.fileName}</Text>),
  };
});
jest.mock('./ScanCapture', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return { ScanCapture: () => <Text>Post camera</Text> };
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
    user: { id: 'alice', displayName: 'Tên thật từ API' },
    api: {},
  } as unknown as ReturnType<typeof useApp>);
  jest.mocked(useLocalSearchParams).mockReturnValue({});
  jest.mocked(useCommand).mockReturnValue({
    mutate: mockMutate,
    mutateAsync: mockAsync,
    isPending: false,
  } as unknown as ReturnType<typeof useCommand>);
  mockAsync.mockImplementation(async (command) =>
    command.path === '/v1/me/post-draft'
      ? { ...empty, content: command.body.content, version: 1 }
      : { id: 'created' },
  );
  jest
    .mocked(useResource)
    .mockReturnValue({ isPending: false, isError: false, data: empty } as unknown as ReturnType<
      typeof useResource
    >);
  jest.mocked(usePages).mockReturnValue({
    isPending: false,
    isError: false,
    data: { pages: [{ items: [] }] },
  } as unknown as ReturnType<typeof usePages>);
  jest
    .mocked(ImagePicker.launchImageLibraryAsync)
    .mockResolvedValue({ canceled: true, assets: null });
  jest.mocked(uploadPostMedia).mockResolvedValue(asset);
});

test('new form cannot post empty content and saves actual audience and emotion in its draft', async () => {
  const user = userEvent.setup();
  await render(<ComposerScreen />);
  expect(screen.getByRole('button', { name: 'Đăng bài viết' })).toBeDisabled();
  await user.type(screen.getByLabelText('Nội dung bài viết'), 'Nội dung đang soạn');
  jest.mocked(useLocalSearchParams).mockReturnValue({ sheet: 'audience' });
  await screen.rerender(<ComposerScreen />);
  await user.press(screen.getByRole('button', { name: 'Bạn bè' }));
  expect(router.setParams).toHaveBeenLastCalledWith({ sheet: undefined });
  jest.mocked(useLocalSearchParams).mockReturnValue({ sheet: 'emotion' });
  await screen.rerender(<ComposerScreen />);
  await user.press(screen.getByRole('button', { name: '😊 Hạnh phúc' }));
  jest.mocked(useLocalSearchParams).mockReturnValue({});
  await screen.rerender(<ComposerScreen />);
  await user.press(screen.getByRole('button', { name: 'Lưu bản nháp' }));
  expect(mockAsync).toHaveBeenLastCalledWith(
    expect.objectContaining({
      path: '/v1/me/post-draft',
      method: 'PUT',
      body: {
        expectedVersion: 0,
        content: expect.objectContaining({
          body: 'Nội dung đang soạn',
          visibility: 'friends',
          emotion: 'happy',
        }),
      },
    }),
  );
  await waitFor(() => expect(screen.getByText('Đã lưu bản nháp trong tài khoản')).toBeVisible());
});

test('a saved image draft restores from API and preview posts its saved version', async () => {
  const user = userEvent.setup();
  jest.mocked(useResource).mockReturnValue({
    isPending: false,
    isError: false,
    data: {
      ...empty,
      content: { ...empty.content, body: 'Đã lưu', mediaIds: [asset.id] },
      media: [asset],
      version: 3,
    },
  } as unknown as ReturnType<typeof useResource>);
  jest.mocked(useLocalSearchParams).mockReturnValue({ sheet: 'preview' });
  await render(<ComposerScreen />);
  expect(screen.getByText('Xem trước bài viết')).toBeVisible();
  expect(screen.getByText('Đã lưu')).toBeVisible();
  await user.press(screen.getByRole('button', { name: 'Đăng bài viết từ xem trước' }));
  expect(mockAsync).toHaveBeenLastCalledWith(
    expect.objectContaining({
      path: '/v1/posts',
      body: expect.objectContaining({ draftVersion: 3, mediaIds: [asset.id] }),
    }),
  );
  await waitFor(() =>
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/compose',
      params: { posted: 'created' },
    }),
  );
});

test('canceling a picker does not upload or publish anything', async () => {
  const user = userEvent.setup();
  await render(<ComposerScreen />);
  await user.press(screen.getByRole('button', { name: 'Ảnh/Video' }));
  expect(uploadPostMedia).not.toHaveBeenCalled();
  expect(mockAsync).not.toHaveBeenCalled();
});

test('chosen media uploads before joining the draft, and failures can be retried', async () => {
  const user = userEvent.setup();
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: 'file:///picked.jpg',
        fileName: 'picked.jpg',
        mimeType: 'image/jpeg',
        width: 16,
        height: 12,
        type: 'image',
      },
    ],
  });
  jest.mocked(uploadPostMedia).mockRejectedValueOnce(new Error('Mất kết nối tải tệp'));
  await render(<ComposerScreen />);
  await user.press(screen.getByRole('button', { name: 'Ảnh/Video' }));
  await waitFor(() => expect(screen.getByText('Mất kết nối tải tệp')).toBeVisible());
  expect(screen.getByRole('button', { name: 'Đăng bài viết' })).toBeDisabled();
  expect(mockAsync).not.toHaveBeenCalled();
  await user.press(screen.getByRole('button', { name: 'Thử tải lại picked.jpg' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Gỡ tệp picked.jpg' })).toBeVisible(),
  );
  expect(screen.getByRole('button', { name: 'Đăng bài viết' })).toBeEnabled();
  await user.press(screen.getByRole('button', { name: 'Lưu bản nháp' }));
  expect(mockAsync).toHaveBeenLastCalledWith(
    expect.objectContaining({
      body: expect.objectContaining({ content: expect.objectContaining({ mediaIds: [asset.id] }) }),
    }),
  );
});

test('the place chooser records explicit user input without inventing GPS', async () => {
  const user = userEvent.setup();
  jest.mocked(useLocalSearchParams).mockReturnValue({ sheet: 'place' });
  await render(<ComposerScreen />);
  await user.type(screen.getByLabelText('Tên địa điểm'), 'Địa điểm tự nhập');
  await user.type(screen.getByLabelText('Địa chỉ địa điểm'), 'Địa chỉ của tôi');
  await user.press(screen.getByRole('button', { name: 'Chọn địa điểm này' }));
  jest.mocked(useLocalSearchParams).mockReturnValue({});
  await screen.rerender(<ComposerScreen />);
  await user.press(screen.getByRole('button', { name: 'Lưu bản nháp' }));
  expect(mockAsync).toHaveBeenLastCalledWith(
    expect.objectContaining({
      body: expect.objectContaining({
        content: expect.objectContaining({
          place: { name: 'Địa điểm tự nhập', address: 'Địa chỉ của tôi', pointId: null },
        }),
      }),
    }),
  );
});

test('success is shown for an existing owned post, with a real detail route', async () => {
  const user = userEvent.setup();
  jest.mocked(useLocalSearchParams).mockReturnValue({ posted: 'created' });
  jest.mocked(useResource).mockReturnValue({
    isPending: false,
    isError: false,
    data: { id: 'created', userId: 'alice', visibility: 'friends' },
  } as unknown as ReturnType<typeof useResource>);
  await render(<ComposerScreen />);
  await user.press(screen.getByRole('button', { name: 'Xem bài viết' }));
  expect(router.replace).toHaveBeenLastCalledWith({
    pathname: '/discussion',
    params: { id: 'created' },
  });
  jest.mocked(useResource).mockReturnValue({
    isPending: false,
    isError: false,
    data: { userId: 'bob' },
  } as unknown as ReturnType<typeof useResource>);
  await screen.rerender(<ComposerScreen />);
  expect(screen.queryByRole('button', { name: 'Xem bài viết' })).toBeNull();
});

test('deleting an unused library asset also removes its unsaved selection', async () => {
  const user = userEvent.setup();
  jest.mocked(useLocalSearchParams).mockReturnValue({ sheet: 'library' });
  jest.mocked(usePages).mockReturnValue({
    isPending: false,
    isError: false,
    data: { pages: [{ items: [{ ...asset, completed: true, inUse: false }] }] },
  } as unknown as ReturnType<typeof usePages>);
  await render(<ComposerScreen />);
  await user.press(screen.getByRole('button', { name: 'Chọn tệp picked.jpg' }));
  expect(screen.getByRole('button', { name: 'Đăng bài viết' })).toBeEnabled();
  await user.press(screen.getByRole('button', { name: 'Xóa tệp picked.jpg' }));
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Gỡ tệp picked.jpg' })).toBeNull(),
  );
  expect(screen.getByRole('button', { name: 'Đăng bài viết' })).toBeDisabled();
  expect(mockAsync).toHaveBeenCalledWith({ path: '/v1/media-assets/image', method: 'DELETE' });
});

test('a completed publish cannot navigate after the account changes', async () => {
  const user = userEvent.setup();
  let complete!: (post: { id: string }) => void;
  mockAsync.mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  await render(<ComposerScreen />);
  await user.type(screen.getByLabelText('Nội dung bài viết'), 'Bài đang đăng');
  await user.press(screen.getByRole('button', { name: 'Đăng bài viết' }));
  const account = jest.mocked(useApp)();
  jest.mocked(useApp).mockReturnValue({ ...account, user: { ...account.user!, id: 'bob' } });
  await screen.rerender(<ComposerScreen />);
  await act(async () => {
    complete({ id: 'created' });
  });
  expect(router.replace).not.toHaveBeenCalled();
});
