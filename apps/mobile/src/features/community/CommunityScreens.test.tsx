import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { Keyboard, Share } from 'react-native';
import { palettes } from '@bluesteps/design-tokens';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useApp } from '../../providers';
import { useCommand, usePages, useResource } from '../../services/queries';
import { CommunityScreen, PostOptions } from './CommunityScreens';
import type { Schemas } from '../../services/api';
jest.mock('expo-audio', () => ({ useAudioPlayer: jest.fn(), useAudioPlayerStatus: jest.fn() }));

const mockMutate = jest.fn();
const mockAsync = jest.fn();
const post: Schemas['Post'] = {
  id: 'post',
  userId: 'bob',
  body: 'Bài thật từ API',
  authorName: 'Tên thành viên',
  visibility: 'public',
  version: 1,
  createdAt: '2026-11-02T00:00:00Z',
  likes: 2,
  liked: false,
  comments: 1,
  topic: 'Phân loại',
  saved: false,
  hidden: false,
  media: [],
};
const member: Schemas['CommunityMember'] = {
  id: 'bob',
  displayName: 'Tên thành viên',
  bio: 'Giới thiệu từ API',
  createdAt: post.createdAt,
  postCount: 1,
  followerCount: 3,
  followingCount: 0,
  following: false,
  friendship: 'none',
};
jest.mock('../../providers', () => ({ useApp: jest.fn() }));
jest.mock('../../services/queries', () => ({
  useResource: jest.fn(),
  usePages: jest.fn(),
  useCommand: jest.fn(),
}));
jest.mock('expo-router', () => ({
  router: { canGoBack: () => false, push: jest.fn(), replace: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('expo-linking', () => ({ createURL: () => 'bluesteps://discussion?id=post' }));
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
  } as ReturnType<typeof useApp>);
  jest.mocked(useLocalSearchParams).mockReturnValue({});
  jest.mocked(useCommand).mockReturnValue({
    mutate: mockMutate,
    mutateAsync: mockAsync,
    isPending: false,
  } as unknown as ReturnType<typeof useCommand>);
  mockAsync.mockResolvedValue({});
  jest.mocked(Clipboard.setStringAsync).mockResolvedValue(true);
  jest
    .mocked(useResource)
    .mockReturnValue({ isPending: false, isError: false, data: member } as unknown as ReturnType<
      typeof useResource
    >);
  jest.mocked(usePages).mockImplementation(
    (path) =>
      ({
        isPending: false,
        isError: false,
        data: {
          pages: [
            {
              items: path.includes('/community/members')
                ? [member]
                : path.includes('/topics')
                  ? [{ id: 'topic', name: 'Phân loại', postCount: 1 }]
                  : [post],
            },
          ],
        },
      }) as unknown as ReturnType<typeof usePages>,
  );
});

test('discovery filters and search go into reloadable URL and server queries', async () => {
  const user = userEvent.setup();
  await render(<CommunityScreen />);
  await user.press(screen.getByRole('button', { name: 'Thành viên' }));
  expect(router.setParams).toHaveBeenLastCalledWith({ view: 'members', topic: undefined });
  jest.mocked(useLocalSearchParams).mockReturnValue({ view: 'members', q: 'Tên' });
  await screen.rerender(<CommunityScreen />);
  expect(usePages).toHaveBeenCalledWith('/v1/community/members?q=T%C3%AAn', false, true);
  await user.press(screen.getByRole('button', { name: member.displayName }));
  expect(router.push).toHaveBeenLastCalledWith({
    pathname: '/community',
    params: { member: member.id },
  });
  jest.mocked(useLocalSearchParams).mockReturnValue({ view: 'topics' });
  await screen.rerender(<CommunityScreen />);
  await user.press(screen.getByRole('button', { name: 'Phân loại' }));
  expect(router.setParams).toHaveBeenLastCalledWith({ view: 'posts', topic: 'Phân loại', q: '' });
});

test('member uses server identity and follows without fabricating counts', async () => {
  const user = userEvent.setup();
  jest.mocked(useLocalSearchParams).mockReturnValue({ member: member.id });
  await render(<CommunityScreen />);
  expect(screen.getByText('3 người theo dõi')).toBeVisible();
  expect(screen.getByText(member.bio)).toBeVisible();
  await user.press(screen.getByRole('button', { name: '+ Theo dõi' }));
  expect(mockMutate).toHaveBeenLastCalledWith({
    path: '/v1/me/followed-members/bob',
    method: 'PUT',
  });
  jest.mocked(useResource).mockReturnValue({
    isPending: false,
    isError: false,
    data: { ...member, following: true, followerCount: 4 },
  } as unknown as ReturnType<typeof useResource>);
  await screen.rerender(<CommunityScreen />);
  expect(screen.getByText('4 người theo dõi')).toBeVisible();
  await user.press(screen.getByRole('button', { name: '✓ Đang theo dõi' }));
  expect(mockMutate).toHaveBeenLastCalledWith({
    path: '/v1/me/followed-members/bob',
    method: 'DELETE',
  });
});

test('personal feeds require authentication and cannot display disabled query data', async () => {
  jest
    .mocked(useApp)
    .mockReturnValue({ colors: palettes.light, status: 'guest' } as unknown as ReturnType<
      typeof useApp
    >);
  jest.mocked(useLocalSearchParams).mockReturnValue({ view: 'following' });
  await render(<CommunityScreen />);
  expect(screen.queryByText(post.body)).toBeNull();
  expect(screen.getByText('Đăng nhập để tiếp tục')).toBeVisible();
  expect(usePages).toHaveBeenCalledWith('/v1/posts?q=&feed=following', true, true);
});

test.each(['saved', 'hidden'] as const)('options persist %s and can restore it', async (kind) => {
  const user = userEvent.setup();
  await render(<PostOptions post={post} />);
  await user.press(screen.getByRole('button', { name: 'Tùy chọn bài đăng' }));
  await user.press(
    screen.getByRole('button', { name: kind === 'saved' ? 'Lưu bài đăng' : 'Ẩn bài đăng' }),
  );
  expect(mockAsync).toHaveBeenLastCalledWith({ path: `/v1/me/${kind}-posts/post`, method: 'PUT' });
  await screen.rerender(<PostOptions post={{ ...post, [kind]: true }} />);
  await user.press(screen.getByRole('button', { name: 'Tùy chọn bài đăng' }));
  await user.press(
    screen.getByRole('button', {
      name: kind === 'saved' ? 'Bỏ lưu bài đăng' : 'Hiện lại bài đăng',
    }),
  );
  expect(mockAsync).toHaveBeenLastCalledWith({
    path: `/v1/me/${kind}-posts/post`,
    method: 'DELETE',
  });
});

test('clipboard reports success only when the platform actually copied the link', async () => {
  const user = userEvent.setup();
  await render(<PostOptions post={post} />);
  await user.press(screen.getByRole('button', { name: 'Tùy chọn bài đăng' }));
  jest.mocked(Clipboard.setStringAsync).mockResolvedValueOnce(false);
  await user.press(screen.getByRole('button', { name: 'Sao chép liên kết' }));
  expect(screen.queryByText('Đã sao chép liên kết')).toBeNull();
  await waitFor(() =>
    expect(screen.getAllByText('Không thể sao chép liên kết.').length).toBeGreaterThan(0),
  );
  await user.press(screen.getByRole('button', { name: 'Sao chép liên kết' }));
  expect(Clipboard.setStringAsync).toHaveBeenLastCalledWith('bluesteps://discussion?id=post');
  await waitFor(() => expect(screen.getByText('Đã sao chép liên kết')).toBeVisible());
});

test('sharing invokes platform share without awarding points or claiming delivery', async () => {
  const user = userEvent.setup();
  const share = jest
    .spyOn(Share, 'share')
    .mockResolvedValue({ action: Share.dismissedAction, activityType: undefined });
  await render(<PostOptions post={post} />);
  await user.press(screen.getByRole('button', { name: 'Chia sẻ' }));
  expect(share).toHaveBeenCalledWith({
    message: `${post.authorName}: ${post.body}\nbluesteps://discussion?id=post`,
  });
  expect(mockMutate).not.toHaveBeenCalled();
  expect(mockAsync).not.toHaveBeenCalled();
  share.mockRestore();
});

test('hidden list uses the personal endpoint and has an unhide action', async () => {
  const user = userEvent.setup();
  jest.mocked(useLocalSearchParams).mockReturnValue({ view: 'hidden' });
  jest.mocked(usePages).mockReturnValue({
    isPending: false,
    isError: false,
    data: { pages: [{ items: [{ ...post, hidden: true }] }] },
  } as unknown as ReturnType<typeof usePages>);
  await render(<CommunityScreen />);
  expect(usePages).toHaveBeenCalledWith('/v1/me/hidden-posts', true, true);
  await user.press(screen.getByRole('button', { name: 'Tùy chọn bài đăng' }));
  expect(screen.getByRole('button', { name: 'Hiện lại bài đăng' })).toBeVisible();
});

test('the navigation cannot cover composer controls while the keyboard is visible', async () => {
  const listeners = new Map<string, () => void>();
  const listener = jest.spyOn(Keyboard, 'addListener').mockImplementation((event, callback) => {
    listeners.set(event, callback as () => void);
    return { remove: jest.fn() };
  });
  await render(<CommunityScreen />);
  expect(screen.getByRole('tab', { name: 'Quét rác' })).toBeVisible();
  await act(() => {
    listeners.get('keyboardDidShow')?.();
  });
  expect(screen.queryByRole('tab', { name: 'Quét rác' })).toBeNull();
  await act(() => {
    listeners.get('keyboardDidHide')?.();
  });
  expect(screen.getByRole('tab', { name: 'Quét rác' })).toBeVisible();
  listener.mockRestore();
});
