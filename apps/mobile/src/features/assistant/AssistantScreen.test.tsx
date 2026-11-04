import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';
import { palettes } from '@bluesteps/design-tokens';
import { useApp } from '../../providers';
import { AssistantScreen } from './AssistantScreen';

jest.mock('../../providers', () => ({ useApp: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { canGoBack: () => false },
  useLocalSearchParams: () => ({}),
  usePathname: () => '/assistant',
}));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

const assistant = jest.fn();
const request = jest.fn();

beforeEach(() => {
  assistant.mockReset();
  request.mockReset();
  jest.mocked(useApp).mockReturnValue({
    colors: palettes.light,
    status: 'authenticated',
    user: { id: 'alice' },
    api: { assistant, request },
  } as unknown as ReturnType<typeof useApp>);
});

function renderAssistant() {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  return render(
    <QueryClientProvider client={client}>
      <AssistantScreen />
    </QueryClientProvider>,
  );
}

test('renders the provider answer and sends it as context for a follow-up', async () => {
  const user = userEvent.setup();
  assistant
    .mockResolvedValueOnce({ answer: 'Rửa sạch chai trước khi tái chế.' })
    .mockResolvedValueOnce({ answer: 'Giữ riêng nắp chai.' });
  await renderAssistant();
  await user.press(screen.getByRole('button', { name: 'Phân loại rác nhựa' }));
  expect(await screen.findByText('Rửa sạch chai trước khi tái chế.')).toBeVisible();
  await user.type(screen.getByLabelText('Câu hỏi của bạn'), 'Còn nắp chai?');
  await user.press(screen.getByRole('button', { name: 'Gửi câu hỏi' }));
  expect(await screen.findByText('Giữ riêng nắp chai.')).toBeVisible();
  expect(assistant).toHaveBeenLastCalledWith(
    {
      messages: [
        { role: 'user', content: 'Phân loại rác nhựa' },
        { role: 'assistant', content: 'Rửa sạch chai trước khi tái chế.' },
        { role: 'user', content: 'Còn nắp chai?' },
      ],
    },
    expect.anything(),
  );
  expect(request).not.toHaveBeenCalled();
});

test('renders the handbook guide when the provider fails', async () => {
  const user = userEvent.setup();
  assistant.mockRejectedValueOnce(new Error('Provider unavailable'));
  request.mockResolvedValueOnce({ items: [], nextCursor: null }).mockResolvedValueOnce({
    section: 'material',
    code: 'plastic',
    title: 'Hướng dẫn nhựa',
    summary: 'Đọc hướng dẫn tái chế nhựa.',
    sources: [],
  });
  await renderAssistant();
  await user.press(screen.getByRole('button', { name: 'Phân loại rác nhựa' }));
  expect(await screen.findByText('Đọc hướng dẫn tái chế nhựa.')).toBeVisible();
  expect(request).toHaveBeenCalledWith(
    '/v1/handbook/materials/plastic',
    expect.objectContaining({ signal: expect.anything() }),
  );
});
