import { fireEvent, screen } from '@testing-library/react-native';
import { renderApp } from '../../test/render';
import { EventListScreen } from './EventScreens';
test('saving an event changes the action without claiming registration', async () => {
  await renderApp(<EventListScreen />);
  const save = await screen.findByLabelText('Lưu Một sáng sạch hơn cho biển');
  await fireEvent.press(save);
  expect(screen.getByLabelText('Bỏ lưu Một sáng sạch hơn cho biển')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Bỏ lưu Một sáng sạch hơn cho biển'));
  expect(screen.getByLabelText('Lưu Một sáng sạch hơn cho biển')).toBeTruthy();
});
