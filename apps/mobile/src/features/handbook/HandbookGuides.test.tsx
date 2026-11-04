import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { palettes } from '@bluesteps/design-tokens';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../providers';
import { useCommand, usePages, useResource } from '../../services/queries';
import { HandbookCategoryScreen, MaterialTypesScreen } from './HandbookGuides';
import { HandbookScreen } from './HandbookScreens';
import { WasteDetailScreen } from './WasteGuideScreen';
import type { Schemas } from '../../services/api';

const references = require('../../../../api/content/handbook.json') as Schemas['HandbookGuide'][];
const mockMutate = jest.fn();
const item = {
  id: 'bottle',
  name: 'Chai của tài khoản',
  material: 'Nhựa',
  category: 'Tái chế',
  handbookKind: 'plastic',
  steps: ['Làm sạch.'],
  sources: [],
  hazardous: false,
};
jest.mock('../../providers', () => ({ useApp: jest.fn() }));
jest.mock('../auth/PinProvider', () => ({ useOptionalPin: () => null }));
jest.mock('../../services/queries', () => ({
  useResource: jest.fn(),
  usePages: jest.fn(),
  useCommand: jest.fn(),
}));
jest.mock('expo-router', () => ({
  router: { canGoBack: () => false, push: jest.fn(), replace: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: jest.fn(),
  usePathname: () => '/handbook/bottle',
}));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

function mockGuide(value: unknown) {
  jest
    .mocked(useResource)
    .mockImplementation(
      (path) =>
        (path === '/v1/waste-materials'
          ? { isPending: false, isError: false, isSuccess: true, data: { items: [] } }
          : value) as ReturnType<typeof useResource>,
    );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useApp).mockReturnValue({
    colors: palettes.light,
    status: 'authenticated',
    user: { id: 'alice' },
  } as ReturnType<typeof useApp>);
  jest
    .mocked(useCommand)
    .mockReturnValue({ mutate: mockMutate, isPending: false } as unknown as ReturnType<
      typeof useCommand
    >);
  jest.mocked(usePages).mockReturnValue({
    isPending: false,
    isError: false,
    data: { pages: [{ items: [item] }] },
  } as unknown as ReturnType<typeof usePages>);
  jest.mocked(useResource).mockImplementation(
    (path) =>
      ({
        isPending: false,
        isError: false,
        data: references.find((guide) => path.endsWith('/' + guide.code)),
      }) as ReturnType<typeof useResource>,
  );
});

test.each(['recycle', 'organic', 'inorganic'])(
  'category list %s loads items without waiting for a category lookup',
  async (category) => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ category });
    await render(<HandbookScreen />);
    expect(useResource).toHaveBeenCalledWith('/v1/waste-categories', false, false);
    expect(usePages).toHaveBeenLastCalledWith(
      `/v1/waste-items?q=&category_key=${category}`,
      false,
      true,
    );
    expect(screen.getByRole('button', { name: item.name })).toBeVisible();
  },
);

test.each(['recycle', 'organic', 'inorganic'])(
  'category %s has a reloadable handling overlay and links actual items',
  async (category) => {
    const user = userEvent.setup();
    jest.mocked(useLocalSearchParams).mockReturnValue({ category });
    await render(<HandbookCategoryScreen />);
    const guide = references.find((value) => value.code === category)!;
    await user.press(screen.getByRole('button', { name: 'Cách xử lý ' + guide.title }));
    expect(router.setParams).toHaveBeenCalledWith({ expanded: '1' });
    jest.mocked(useLocalSearchParams).mockReturnValue({ category, expanded: '1' });
    await screen.rerender(<HandbookCategoryScreen />);
    expect(screen.getByText('Cách xử lý:')).toBeVisible();
    expect(screen.getByText('• ' + guide.handling![0])).toBeVisible();
    await user.press(screen.getByRole('button', { name: 'Đóng cách xử lý' }));
    expect(router.setParams).toHaveBeenLastCalledWith({ expanded: undefined });
    jest.mocked(useLocalSearchParams).mockReturnValue({ category });
    await screen.rerender(<HandbookCategoryScreen />);
    await fireEvent.changeText(screen.getByLabelText('Tìm vật phẩm'), 'Chai');
    expect(router.setParams).toHaveBeenLastCalledWith({ query: 'Chai' });
    jest.mocked(useLocalSearchParams).mockReturnValue({ category, query: 'Chai' });
    await screen.rerender(<HandbookCategoryScreen />);
    expect(jest.mocked(usePages).mock.calls.at(-1)?.[0]).toBe(
      `/v1/waste-items?category_key=${category}&q=Chai`,
    );
    await user.press(screen.getByRole('button', { name: item.name }));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/handbook/[id]',
      params: { id: item.id },
    });
  },
);

test.each(['plastic', 'medical', 'bag', 'battery'])(
  'material %s expands composition and opens server filtered items',
  async (kind) => {
    const user = userEvent.setup();
    jest.mocked(useLocalSearchParams).mockReturnValue({ kind });
    await render(<MaterialTypesScreen />);
    const guide = references.find((value) => value.code === kind)!;
    const entry = guide.entries![0]!;
    await user.press(screen.getByRole('button', { name: 'Chi tiết ' + entry.title }));
    expect(router.setParams).toHaveBeenLastCalledWith({ entry: entry.code });
    jest.mocked(useLocalSearchParams).mockReturnValue({ kind, entry: entry.code });
    await screen.rerender(<MaterialTypesScreen />);
    expect(screen.getByText('Ví dụ: ' + entry.examples!.join(', '))).toBeVisible();
    await user.press(screen.getByRole('button', { name: 'Tra vật phẩm ' + entry.title }));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/handbook/list',
      params: { kind, query: entry.itemQuery ?? '' },
    });
    expect(screen.queryByText(/450.*500 năm/)).toBeNull();
  },
);

test('detail switches Dos and Donts through route state without recording activity', async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: item.id });
  mockGuide({
    isPending: false,
    isError: false,
    data: {
      item,
      details: {
        dos: ['Làm sạch.'],
        donts: ['Không trộn pin.'],
        tips: ['Kiểm tra nơi nhận.'],
        relatedKinds: ['plastic'],
        decomposition: null,
      },
    },
  });
  await render(<WasteDetailScreen />);
  expect(screen.getByText('1. Làm sạch.')).toBeVisible();
  await fireEvent(
    screen.getByRole('switch', { name: 'Xem điều không nên làm' }),
    'valueChange',
    true,
  );
  expect(router.setParams).toHaveBeenCalledWith({ mode: 'donts' });
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: item.id, mode: 'donts' });
  await screen.rerender(<WasteDetailScreen />);
  expect(screen.getByText('1. Không trộn pin.')).toBeVisible();
  expect(screen.queryByText('1. Làm sạch.')).toBeNull();
  expect(mockMutate).not.toHaveBeenCalled();
});

test('missing Donts stays explicit and a read error never displays fallback instructions', async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: item.id, mode: 'donts' });
  mockGuide({
    isPending: false,
    isError: false,
    data: { item, details: { dos: [], donts: [], tips: [], relatedKinds: [] } },
  });
  await render(<WasteDetailScreen />);
  expect(
    screen.getByText('Chưa có hướng dẫn “Không nên làm” được công bố cho vật phẩm này.'),
  ).toBeVisible();
  mockGuide({
    isPending: false,
    isError: true,
    error: new Error('Guide offline'),
  });
  await screen.rerender(<WasteDetailScreen />);
  expect(screen.getByText('Guide offline')).toBeVisible();
  expect(screen.queryByText(item.name)).toBeNull();
});
