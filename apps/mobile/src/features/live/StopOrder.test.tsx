import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { palettes } from '@bluesteps/design-tokens';
import { useApp } from '../../providers';
import { StopOrder } from './StopOrder';
jest.mock('../../providers', () => ({ useApp: jest.fn() }));
beforeEach(() => {
  jest.mocked(useApp).mockReturnValue({ colors: palettes.light } as ReturnType<typeof useApp>);
});
const items = [
  { id: 'a', name: 'A', detail: 'First' },
  { id: 'b', name: 'B', detail: 'Second' },
];
test('native drag uses measured row centers and releases parent scroll on drop', async () => {
  const change = jest.fn(),
    dragging = jest.fn();
  await render(<StopOrder items={items} onChange={change} onDragging={dragging} />);
  const handle = screen.getByRole('adjustable', { name: 'Đổi thứ tự A' });
  // The row owning each handle receives its actual measured layout.
  const row = handle.parent!.parent!;
  await fireEvent(row, 'layout', { nativeEvent: { layout: { y: 0, height: 100 } } });
  await fireEvent(
    screen.getByRole('adjustable', { name: 'Đổi thứ tự B' }).parent!.parent!,
    'layout',
    {
      nativeEvent: { layout: { y: 112, height: 100 } },
    },
  );
  await fireEvent(handle, 'responderGrant', { nativeEvent: { pageY: 200 } });
  await fireEvent(handle, 'responderMove', { nativeEvent: { pageY: 320 } });
  await fireEvent(handle, 'responderRelease', { nativeEvent: { pageY: 320 } });
  expect(change).toHaveBeenCalledWith(['b', 'a']);
  expect(dragging).toHaveBeenLastCalledWith(false);
});
test('screen-reader reorder handles failure without announcing a saved order', async () => {
  const change = jest.fn().mockRejectedValue(new Error('Conflict'));
  await render(<StopOrder items={items} onChange={change} onDragging={jest.fn()} />);
  await fireEvent(screen.getByRole('adjustable', { name: 'Đổi thứ tự A' }), 'accessibilityAction', {
    nativeEvent: { actionName: 'increment' },
  });
  await waitFor(() =>
    expect(screen.getByText('Chưa lưu được thứ tự mới. Hãy thử lại.')).toBeTruthy(),
  );
  expect(screen.queryByText(/Đã chuyển/)).toBeNull();
});
