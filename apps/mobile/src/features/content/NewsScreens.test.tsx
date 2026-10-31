import { useState } from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderApp } from '../../test/render';
import { Button, Label } from '../../design-system/ui';
import { useApp } from '../../providers';
import { ArticlesScreen } from './NewsFeedScreen';
import { NewsTopicsScreen } from './NewsExploreScreens';

function LocalNewsFlow() {
  const [savedOnly, setSavedOnly] = useState(false);
  const { saved, news, resetDemo } = useApp();
  return (
    <>
      <Button title="Chuyển danh sách bài đọc" onPress={() => setSavedOnly(!savedOnly)} />
      <Button title="Reset phiên kiểm tra" onPress={resetDemo} />
      <Label>Hoạt động lưu: {saved.join(',')}</Label>
      <Label>Bài đọc lưu: {news.saved.length}</Label>
      <ArticlesScreen key={String(savedOnly)} savedOnly={savedOnly} />
    </>
  );
}

test('news save and removal survive screen changes while event saves remain separate, and reset clears news', async () => {
  await renderApp(<LocalNewsFlow />);
  await fireEvent.press(await screen.findByLabelText('Lưu bài Làm sạch trước khi gửi tái chế'));
  await fireEvent.press(screen.getByLabelText('Chuyển danh sách bài đọc'));
  expect(await screen.findByLabelText('Đọc Làm sạch trước khi gửi tái chế')).toBeTruthy();
  expect(screen.getByText('Hoạt động lưu: workshop')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Bỏ lưu bài Làm sạch trước khi gửi tái chế'));
  await fireEvent.press(screen.getByLabelText('Giữ bài đã lưu'));
  expect(screen.getByText('Bài đọc lưu: 1')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Reset phiên kiểm tra'));
  expect(screen.getByText('Bài đọc lưu: 0')).toBeTruthy();
  expect(screen.getByText('Chưa có bài viết đã lưu')).toBeTruthy();
});

test('article search and empty recovery apply to titles and body without accents', async () => {
  await renderApp(<ArticlesScreen />);
  await screen.findByLabelText('Đọc Gom pin cũ thành một thói quen riêng');
  await fireEvent.changeText(screen.getByLabelText('Tìm bài viết'), 'PIN CU');
  expect(screen.getByText('1 kết quả phù hợp')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Tìm bài viết'), 'khong co bai nay');
  await fireEvent.press(screen.getByLabelText('Xóa bộ lọc'));
  expect(screen.getByText('13 kết quả phù hợp')).toBeTruthy();
});

test('following a topic changes its action and count without subscribing to notifications', async () => {
  await renderApp(<NewsTopicsScreen />);
  await fireEvent.press(screen.getByLabelText('Theo dõi Lối sống'));
  expect(screen.getByLabelText('Bỏ theo dõi Lối sống')).toBeTruthy();
  expect(screen.getByText('Đang theo dõi 1 chủ đề trong phiên demo')).toBeTruthy();
});
