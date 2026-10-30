import { useState } from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderApp } from '../../test/render';
import { Button } from '../../design-system/ui';
import { ConversationScreen, MessagesScreen } from './MessageScreens';

function ThreadNavigation() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button title="Đổi màn demo" onPress={() => setOpen(!open)} />
      {open ? <ConversationScreen /> : <MessagesScreen />}
    </>
  );
}
test('seeded messages and newly composed text survive navigating between demo screens', async () => {
  await renderApp(<ThreadNavigation />);
  expect(screen.getByText('Hay quá, cùng bắt đầu thói quen xanh nhé!')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Nội dung tin nhắn demo'), 'Tin nhắn demo mới');
  await fireEvent.press(screen.getByRole('button', { name: 'Thêm tin nhắn vào demo' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Đổi màn demo' }));
  await screen.findByText('Tin nhắn demo mới');
  await fireEvent.press(screen.getByRole('button', { name: 'Đổi màn demo' }));
  expect(screen.getByText('Tin nhắn demo mới')).toBeTruthy();
});
