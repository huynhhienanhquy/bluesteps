import { useState } from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { renderApp } from '../../test/render';
import { useApp } from '../../providers';
import { Button, Label } from '../../design-system/ui';
import { NewsSearchScreen } from './NewsSearchScreen';
import { NewsReadingListScreen } from './NewsReadingListScreen';
import { NewsEventScreen } from './NewsEventScreen';
import { NewsCalendarScreen } from './NewsCalendarScreen';

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
afterEach(() => {
  jest.clearAllMocks();
  jest.mocked(useLocalSearchParams).mockReturnValue({});
});
function SessionProbe() {
  const { news, eventPlanning } = useApp();
  return (
    <Label>{`Phiên: ${news.recentSearches.join(',')} / ${news.saved.join(',')} / ${news.savedEvents.join(',')} / ${news.interestedEvents.join(',')} / ${Object.keys(eventPlanning.registrations).length} vé`}</Label>
  );
}
test('native list search matches accents, remembers submitted terms and keeps the grid query', async () => {
  await renderApp(
    <>
      <SessionProbe />
      <NewsSearchScreen />
    </>,
  );
  await screen.findByText('13 bài viết');
  const input = screen.getByLabelText('Tìm kiếm tin tức');
  await fireEvent.changeText(input, 'PIN CU');
  expect(screen.getByText('1 bài viết')).toBeTruthy();
  await fireEvent(input, 'submitEditing');
  expect(screen.getByText('Phiên: PIN CU /  /  /  / 0 vé')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Xem dạng lưới'));
  expect(router.push).toHaveBeenLastCalledWith({
    pathname: '/articles',
    params: { view: 'search', q: 'PIN CU' },
  });
  await fireEvent.changeText(input, 'khong co bai nay');
  expect(screen.getByText('Không tìm thấy bài viết')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Xóa từ khóa'));
  expect(screen.getByText('13 bài viết')).toBeTruthy();
});
test('search preview opens the right article and never writes primary search history', async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ preview: '1' });
  await renderApp(
    <>
      <SessionProbe />
      <NewsSearchScreen />
    </>,
  );
  expect(screen.getByText('3 bài viết')).toBeTruthy();
  await fireEvent.press(
    screen.getByLabelText('Đọc Mỗi ngày, thế giới thải ra khoảng 11 triệu tấn rác'),
  );
  expect(router.push).toHaveBeenLastCalledWith({
    pathname: '/articles/[id]',
    params: { id: 'daily-waste', preview: '1' },
  });
  expect(screen.getByText('Phiên:  /  /  /  / 0 vé')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Tìm tái chế'));
  expect(screen.getByLabelText('Tìm kiếm tin tức')).toHaveProp('value', 'tái chế');
});
test('reading list uses actual saved articles and cancellation preserves the saved state', async () => {
  function Flow() {
    const { setNews } = useApp();
    return (
      <>
        <SessionProbe />
        <Button
          title="Lưu hai bài mẫu"
          onPress={() => setNews((state) => ({ ...state, saved: ['ha-long', 'saigon-cleanup'] }))}
        />
        <NewsReadingListScreen />
      </>
    );
  }
  await renderApp(<Flow />);
  expect(screen.getByText('Chưa có bài viết đã lưu')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Lưu hai bài mẫu'));
  expect(screen.getByText('Bạn đã lưu 2 bài viết')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText(/^Bỏ lưu bài/));
  await fireEvent.press(screen.getByLabelText('Giữ bài đã lưu'));
  expect(screen.getByText('Bạn đã lưu 2 bài viết')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText(/^Bỏ lưu bài/));
  await fireEvent.press(screen.getByLabelText('Xác nhận bỏ lưu bài đọc'));
  expect(screen.getByText('Bạn đã lưu 1 bài viết')).toBeTruthy();
  expect(screen.getByText('Phiên:  / saigon-cleanup /  /  / 0 vé')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Xem lưới bài đã lưu'));
  expect(router.push).toHaveBeenLastCalledWith({ pathname: '/articles/saved', params: {} });
});
test('reading preview has four isolated saves and preserves its preview links', async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ preview: '1' });
  await renderApp(
    <>
      <SessionProbe />
      <NewsReadingListScreen />
    </>,
  );
  expect(screen.getByText('Bạn đã lưu 4 bài viết')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Đọc Tuổi trẻ chung tay làm sạch dòng kênh'));
  expect(router.push).toHaveBeenLastCalledWith({
    pathname: '/articles/[id]',
    params: { id: 'local-cleanup', preview: '1' },
  });
  expect(screen.getByText('Phiên:  /  /  /  / 0 vé')).toBeTruthy();
});
test('saving an editorial event, interest and registration remain independent', async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: 'nhieu-loc' });
  await renderApp(
    <>
      <SessionProbe />
      <NewsEventScreen />
    </>,
  );
  await fireEvent.press(screen.getByLabelText('Lưu sự kiện xanh'));
  expect(screen.getByText('Phiên:  /  / nhieu-loc /  / 0 vé')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Tham gia sự kiện'));
  expect(screen.getByText('Đã ghi nhận sự quan tâm')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Xong'));
  expect(screen.getByText('Phiên:  /  / nhieu-loc / nhieu-loc / 0 vé')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Xem lịch quan tâm'));
  expect(router.push).toHaveBeenLastCalledWith({
    pathname: '/articles/calendar',
    params: { interested: '1' },
  });
  await fireEvent.press(screen.getByLabelText('Bỏ quan tâm sự kiện xanh'));
  expect(screen.getByText('Phiên:  /  / nhieu-loc /  / 0 vé')).toBeTruthy();
});
test('the confirmation preview is isolated and can be dismissed', async () => {
  jest
    .mocked(useLocalSearchParams)
    .mockReturnValue({ id: 'nhieu-loc', preview: '1', confirm: '1' });
  await renderApp(
    <>
      <SessionProbe />
      <NewsEventScreen />
    </>,
  );
  expect(screen.getByTestId('news-extended-695:5419')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Xong'));
  expect(screen.queryByText('Đã ghi nhận sự quan tâm')).toBeNull();
  expect(screen.getByText('Phiên:  /  /  /  / 0 vé')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Xem lịch quan tâm'));
  expect(router.push).toHaveBeenLastCalledWith({
    pathname: '/articles/calendar',
    params: { interested: '1', preview: '1' },
  });
});
test('the interested calendar reads the editorial interest and opens its correct detail', async () => {
  function Flow() {
    const [calendar, setCalendar] = useState(false);
    jest
      .mocked(useLocalSearchParams)
      .mockReturnValue(calendar ? { interested: '1' } : { id: 'nhieu-loc' });
    return (
      <>
        <Button title="Mở lịch trong kiểm thử" onPress={() => setCalendar(true)} />
        {calendar ? <NewsCalendarScreen /> : <NewsEventScreen />}
      </>
    );
  }
  await renderApp(<Flow />);
  await fireEvent.press(screen.getByLabelText('Tham gia sự kiện'));
  await fireEvent.press(screen.getByLabelText('Xong'));
  await fireEvent.press(screen.getByLabelText('Mở lịch trong kiểm thử'));
  await fireEvent.press(
    await screen.findByLabelText('Xem sự kiện Dọn rác ven kênh Nhiêu Lộc cùng BlueSteps'),
  );
  expect(router.push).toHaveBeenLastCalledWith({
    pathname: '/articles/events/[id]',
    params: { id: 'nhieu-loc' },
  });
});
test('an unknown event preserves the recovery route', async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: 'missing' });
  await renderApp(<NewsEventScreen />);
  await fireEvent.press(screen.getByLabelText('Xem lịch xanh'));
  expect(router.replace).toHaveBeenLastCalledWith('/articles/calendar');
});
