import { render, screen, userEvent } from '@testing-library/react-native';
import { palettes } from '@bluesteps/design-tokens';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../providers';
import { usePages } from '../../services/queries';
import { useForegroundLocation } from '../../services/foreground-location';
import { CollectionFiltersScreen, collectionFilterQuery } from './CollectionFilters';
jest.mock('../../providers', () => ({ useApp: jest.fn() }));
jest.mock('../../services/queries', () => ({ usePages: jest.fn() }));
jest.mock('../../services/foreground-location', () => ({ useForegroundLocation: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { canGoBack: () => false, replace: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));
const locate = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(useApp)
    .mockReturnValue({ colors: palettes.light } as unknown as ReturnType<typeof useApp>);
  jest.mocked(useLocalSearchParams).mockReturnValue({});
  jest.mocked(useForegroundLocation).mockReturnValue({
    location: undefined,
    busy: false,
    error: '',
    locate,
  } as unknown as ReturnType<typeof useForegroundLocation>);
  jest.mocked(usePages).mockReturnValue({
    isPending: false,
    isError: false,
    data: { pages: [{ items: [] }] },
  } as unknown as ReturnType<typeof usePages>);
});
test('radius requires an explicit location fix, then applies all operational filters', async () => {
  const user = userEvent.setup();
  await render(<CollectionFiltersScreen />);
  await user.press(screen.getByRole('button', { name: '3 km' }));
  expect(screen.getByRole('button', { name: 'Áp dụng bộ lọc' })).toBeDisabled();
  await user.press(screen.getByRole('button', { name: 'Dùng vị trí hiện tại' }));
  expect(locate).toHaveBeenCalledTimes(1);
  jest.mocked(useForegroundLocation).mockReturnValue({
    location: { latitude: 16.07, longitude: 108.22, accuracy: 10, timestamp: 1 },
    busy: false,
    error: '',
    locate,
  } as unknown as ReturnType<typeof useForegroundLocation>);
  await screen.rerender(<CollectionFiltersScreen />);
  for (const name of ['Đang mở cửa', 'Mở 24 giờ', 'Chỉ hiện điểm còn chỗ', 'Có nhân viên hỗ trợ'])
    await user.press(screen.getByRole('button', { name }));
  await user.press(screen.getByRole('button', { name: 'Áp dụng bộ lọc' }));
  expect(router.replace).toHaveBeenCalledWith({
    pathname: '/collection',
    params: expect.objectContaining({
      radius: '3',
      onlyOpen: '1',
      open24h: '1',
      available: '1',
      staffed: '1',
    }),
  });
});
test('filter query preserves material matching and zero coordinates without inventing GPS', () => {
  const raw = collectionFilterQuery(
    { materials: 'one,two', matchMode: 'any', radius: '3', onlyOpen: '1' },
    { latitude: 0, longitude: 0 },
  );
  const params = new URLSearchParams(raw);
  expect(params.getAll('material_ids')).toEqual(['one', 'two']);
  expect(params.get('match_mode')).toBe('any');
  expect(params.get('radius_m')).toBe('3000');
  expect(params.get('lat')).toBe('0');
  expect(params.get('lng')).toBe('0');
  expect(new URLSearchParams(collectionFilterQuery({ radius: '3' })).has('lat')).toBe(false);
});
