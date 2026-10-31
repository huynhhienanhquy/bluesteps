import { fireEvent, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { renderApp } from '../../test/render';
import { Label } from '../../design-system/ui';
import { useApp } from '../../providers';
import { articles } from '../../services/fixtures';
import { NewsArticleScreen } from './NewsArticleScreen';
import { ArticleDetailScreen } from './NewsScreens';
import { NewsDiscussionScreen } from './NewsDiscussionView';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    dismissTo: jest.fn(),
    back: jest.fn(),
    canGoBack: () => false,
  },
  useLocalSearchParams: jest.fn(() => ({})),
}));

function ArticleFlow({ sample = false }: { sample?: boolean }) {
  const { news } = useApp();
  return (
    <>
      <Label>{`Phiên chính: ${news.saved.join(',')} / ${news.liked.join(',')}`}</Label>
      <NewsArticleScreen
        article={articles.find((article) => article.id === 'daily-waste')!}
        sample={sample}
      />
    </>
  );
}

afterEach(() => {
  jest.clearAllMocks();
  jest.mocked(useLocalSearchParams).mockReturnValue({});
});

test.each([
  ['daily-waste', '386:17608'],
  ['youth-ideas', '386:10644'],
  ['local-cleanup', '386:17794'],
  ['green-sunday', '386:10737'],
  ['storm-cleanup', '386:17887'],
  ['saigon-cleanup', '386:10828'],
  ['ha-long', '386:17978'],
  ['tourism-cleanup', '386:10919'],
])('article route %s opens its own design and discussion', async (id, frame) => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ id });
  await renderApp(<ArticleDetailScreen />);
  expect(screen.getByTestId(`news-article-${frame}`)).toBeTruthy();
  await fireEvent.press(screen.getByLabelText(/^Thảo luận bài viết/));
  expect(router.push).toHaveBeenLastCalledWith({
    pathname: '/articles/discussion',
    params: { id },
  });
  await fireEvent.press(screen.getByLabelText('Quay lại'));
  expect(router.replace).toHaveBeenLastCalledWith('/articles');
});

test('expanding the daily article keeps save and like state, and can collapse again', async () => {
  await renderApp(<ArticleFlow />);
  await fireEvent.press(screen.getByLabelText('Lưu bài viết'));
  await fireEvent.press(screen.getByLabelText(/^Thích ·/));
  await fireEvent.press(screen.getByLabelText('Xem thêm bài viết'));
  expect(screen.getByTestId('news-article-386:17701')).toBeTruthy();
  expect(screen.getByText('Phiên chính: daily-waste / daily-waste')).toBeTruthy();
  expect(screen.getByLabelText('Bỏ lưu bài viết')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Thu gọn bài viết'));
  expect(screen.getByTestId('news-article-386:17608')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Bỏ lưu bài viết'));
  expect(screen.getByText('Phiên chính:  / daily-waste')).toBeTruthy();
});

test('preview interactions and discussion never change the main news session', async () => {
  await renderApp(<ArticleFlow sample />);
  await fireEvent.press(screen.getByLabelText('Lưu bài viết'));
  await fireEvent.press(screen.getByLabelText(/^Thích ·/));
  expect(screen.getByLabelText('Bỏ lưu bài viết')).toBeTruthy();
  expect(screen.getByText('Phiên chính:  / ')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Bình luận bài viết'));
  expect(router.push).toHaveBeenLastCalledWith({
    pathname: '/articles/discussion',
    params: { id: 'daily-waste', preview: '1' },
  });
});

test('expanded deep link opens the expanded design immediately', async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: 'daily-waste', expanded: '1' });
  await renderApp(<ArticleDetailScreen />);
  expect(screen.getByTestId('news-article-386:17701')).toBeTruthy();
});

test('unknown article keeps the recovery route', async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: 'missing-article' });
  await renderApp(<ArticleDetailScreen />);
  expect(screen.getByText('Bài viết không tồn tại')).toBeTruthy();
});

test('returning from preview discussion preserves the isolated article route', async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: 'daily-waste', preview: '1' });
  await renderApp(<NewsDiscussionScreen />);
  await fireEvent.press(screen.getByLabelText('Về bài viết'));
  expect(router.dismissTo).toHaveBeenLastCalledWith('/articles/daily-waste?preview=1');
});
