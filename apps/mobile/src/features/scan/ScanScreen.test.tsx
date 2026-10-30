import { fireEvent, screen } from '@testing-library/react-native';
import { renderApp } from '../../test/render';
import { ScanScreen } from './ScanScreen';
test('allows manual selection and never awards points in demo', async () => {
  await renderApp(<ScanScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Tùy chọn quét' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Chọn vật liệu thủ công' }));
  await fireEvent.press(screen.getByText('Pin đã qua sử dụng'));
  await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận lựa chọn trong demo' }));
  expect(screen.getByText(/POLICY_NOT_ENABLED/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Tìm điểm thu gom' })).toBeTruthy();
});
test('keeps manual entry available when camera permission is denied', async () => {
  await renderApp(<ScanScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Scan your waste' }));
  expect(screen.getByRole('button', { name: 'Mở cài đặt quyền camera' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Chọn vật liệu thay thế' }));
  expect(screen.getByText('Vật liệu của bạn là gì?')).toBeTruthy();
});
