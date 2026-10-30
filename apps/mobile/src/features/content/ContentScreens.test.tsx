import { fireEvent, screen } from '@testing-library/react-native';
import { renderApp } from '../../test/render';
import { NotificationsScreen } from './ContentScreens';
test('renders synthetic notifications and lets the user mark all as read', async () => {
  await renderApp(<NotificationsScreen />);
  await screen.findByText('3 chưa đọc · dữ liệu demo');
  await fireEvent.press(screen.getByRole('button', { name: 'Đánh dấu đã đọc' }));
  expect(screen.getByText('0 chưa đọc · dữ liệu demo')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Đã đọc tất cả trong demo' })).toBeDisabled();
});
