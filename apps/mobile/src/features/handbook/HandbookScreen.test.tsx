import { fireEvent, screen } from '@testing-library/react-native';
import { renderApp } from '../../test/render';
import { HandbookList } from './HandbookList';
test('filters materials and shows an empty state for an unmatched query', async () => {
  await renderApp(<HandbookList />);
  expect(screen.getAllByText('Chai nhựa').length).toBeGreaterThan(0);
  await fireEvent.changeText(screen.getByLabelText('Tìm kiếm trong sổ tay rác'), 'pin');
  expect(screen.getByText('Pin - Ắc quy')).toBeTruthy();
  expect(screen.queryByText('Chai nhựa')).toBeNull();
  await fireEvent.changeText(screen.getByLabelText('Tìm kiếm trong sổ tay rác'), 'không tồn tại');
  expect(screen.getByText('Không tìm thấy vật liệu phù hợp.')).toBeTruthy();
});
