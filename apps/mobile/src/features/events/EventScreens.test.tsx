import { fireEvent, screen } from '@testing-library/react-native';
import { renderApp } from '../../test/render';
import { EventListScreen } from './EventScreens';
import { EventRemindersScreen, EventCollectionsScreen } from './SavedEventScreens';
test('saving an event changes the action without claiming registration', async () => {
  await renderApp(<EventListScreen />);
  const save = await screen.findByLabelText('Lưu Một sáng sạch hơn cho biển');
  await fireEvent.press(save);
  expect(screen.getByLabelText('Bỏ lưu Một sáng sạch hơn cho biển')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Bỏ lưu Một sáng sạch hơn cho biển'));
  expect(screen.getByLabelText('Lưu Một sáng sạch hơn cho biển')).toBeTruthy();
});

test('discovery searches Vietnamese locations without accents and resets filters', async () => {
  await renderApp(<EventListScreen />);
  await screen.findByLabelText('Xem hoạt động Giờ học xanh');
  await fireEvent.changeText(screen.getByLabelText('Tìm hoạt động'), 'tuoi xanh');
  expect(screen.getByLabelText('Xem hoạt động Giờ học xanh')).toBeTruthy();
  expect(screen.queryByLabelText('Xem hoạt động Một sáng sạch hơn cho biển')).toBeNull();
  await fireEvent.press(screen.getByText('Tất cả', { exact: true }));
  expect(screen.getByLabelText('Xem hoạt động Một sáng sạch hơn cho biển')).toBeTruthy();
});

test('saved removal requires confirmation and can be cancelled', async () => {
  await renderApp(<EventListScreen savedOnly />);
  await fireEvent.press(await screen.findByLabelText('Xóa Đổi giấy cũ, gieo mầm xanh'));
  await fireEvent.press(screen.getByLabelText('Hủy xóa'));
  expect(screen.getByText('Đổi giấy cũ, gieo mầm xanh', { exact: true })).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Xóa Đổi giấy cũ, gieo mầm xanh'));
  await fireEvent.press(screen.getByLabelText('Xác nhận xóa'));
  expect(screen.getByText('Chưa có hoạt động yêu thích')).toBeTruthy();
});

test('collection creation rejects duplicates and assigns the saved event', async () => {
  await renderApp(<EventCollectionsScreen />);
  await fireEvent.changeText(screen.getByLabelText('Tên bộ sưu tập mới'), 'cuoi tuan');
  await fireEvent.press(screen.getByLabelText('Tạo bộ sưu tập'));
  expect(screen.getByText('Tên bộ sưu tập đã tồn tại.')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Tên bộ sưu tập mới'), 'Kế hoạch mới');
  await fireEvent.press(screen.getByLabelText('Tạo bộ sưu tập'));
  await fireEvent.press(screen.getByLabelText('Đổi giấy cũ, gieo mầm xanh'));
  await fireEvent.press(screen.getByLabelText('Thêm vào bộ sưu tập đang chọn'));
  expect(screen.getByText('Kế hoạch mới · 1')).toBeTruthy();
});

test('reminders validate targets and quiet hours before saving the local draft', async () => {
  await renderApp(<EventRemindersScreen />);
  await fireEvent(screen.getByLabelText('Bật nhắc lịch hoạt động'), 'valueChange', true);
  await fireEvent.press(screen.getByLabelText('Lưu cấu hình nhắc lịch'));
  expect(screen.getByText('Chọn ít nhất một hoạt động và một thời điểm nhắc.')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Đổi giấy cũ, gieo mầm xanh'));
  await fireEvent.changeText(screen.getByLabelText('Bắt đầu (HH:mm)'), '25:00');
  await fireEvent.press(screen.getByLabelText('Lưu cấu hình nhắc lịch'));
  expect(screen.getByText(/Nhập giờ yên lặng theo/)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Bắt đầu (HH:mm)'), '22:00');
  await fireEvent.press(screen.getByLabelText('Lưu cấu hình nhắc lịch'));
  expect(
    screen.getByText('Đã lưu cấu hình trong phiên demo. Chưa lên lịch hoặc gửi thông báo/email.'),
  ).toBeTruthy();
});
