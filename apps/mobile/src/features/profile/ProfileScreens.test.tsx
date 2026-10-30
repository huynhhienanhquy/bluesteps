import { fireEvent, screen } from '@testing-library/react-native';
import { renderApp } from '../../test/render';
import { DemoToolsScreen, StatisticsScreen } from './ProfileScreens';
import { useApp } from '../../providers';
import { Button, Label } from '../../design-system/ui';

test('statistics display a populated synthetic weekly breakdown', async () => {
  await renderApp(<StatisticsScreen />);
  await screen.findByText('8,4 kg mẫu');
  expect(screen.getByText('12 lượt phân loại mẫu · 2 hoạt động mẫu')).toBeTruthy();
  expect(screen.getByText('01–07/10/2026')).toBeTruthy();
});

function DemoChanges() {
  const { posts, stops, notifications, addPost, setStops, markNotificationRead } = useApp();
  return (
    <>
      <Label>{`${posts.length} bài; ${stops.length} điểm dừng; ${notifications.filter((item) => !item.read).length} chưa đọc`}</Label>
      <Button
        title="Thử thay đổi dữ liệu"
        onPress={() => {
          addPost('Bài viết thử');
          setStops([]);
          markNotificationRead();
        }}
      />
    </>
  );
}
test('reset restores posts, journey stops and unread notifications together', async () => {
  await renderApp(
    <>
      <DemoToolsScreen />
      <DemoChanges />
    </>,
  );
  expect(screen.getByText('5 bài; 2 điểm dừng; 3 chưa đọc')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Thử thay đổi dữ liệu' }));
  expect(screen.getByText('6 bài; 0 điểm dừng; 0 chưa đọc')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Khôi phục dữ liệu demo' }));
  expect(screen.getByText('5 bài; 2 điểm dừng; 3 chưa đọc')).toBeTruthy();
});
