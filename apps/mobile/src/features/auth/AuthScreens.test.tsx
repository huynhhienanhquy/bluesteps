import { fireEvent, screen } from '@testing-library/react-native';
import { renderApp } from '../../test/render';
import { AuthScreen } from './AuthScreens';
test('shows email and password errors and does not create a session', async () => {
  await renderApp(<AuthScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  await screen.findByText('Nhập email hợp lệ.');
  expect(screen.getByText('Nhập mật khẩu.')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Email'), 'demo@example.test');
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu'), 'example-password');
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  await screen.findByText(/Chưa có tài khoản hoặc phiên đăng nhập được tạo/);
});
