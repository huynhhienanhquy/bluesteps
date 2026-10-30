import { fireEvent, screen } from '@testing-library/react-native';
import { renderApp } from '../../test/render';
import { HistoryScreen } from './RewardScreens';
test('renders seeded point history and the linked demo redemption', async () => {
  await renderApp(<HistoryScreen />);
  await screen.findByText('Ghi nhận hoạt động mẫu cuối tháng');
  expect(screen.getAllByText('Số dư sau giao dịch mẫu: 180')).toHaveLength(2);
  await fireEvent.press(screen.getByRole('button', { name: 'Quà đã đổi' }));
  await screen.findByText('Túi vải mỗi ngày xanh');
  expect(screen.getByText(/Đã giao · minh họa/)).toBeTruthy();
});
