import { fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { renderApp } from '../../test/render';
import { Button, Label } from '../../design-system/ui';
import { useApp } from '../../providers';
import { events } from '../../services/fixtures';
import { EventDetailScreen } from './EventScreens';
import { EventDetailDesignScreen } from './EventDetailDesignScreen';
import { SavedEventsScreen } from './SavedEventScreens';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false },
  useLocalSearchParams: jest.fn(() => ({})),
}));
afterEach(() => {
  jest.clearAllMocks();
  jest.mocked(useLocalSearchParams).mockReturnValue({});
});

function Session({ sample = false }: { sample?: boolean }) {
  const { saved, eventPlanning } = useApp();
  return (
    <>
      <Label>{`Phiên: ${saved.join(',')} / ${eventPlanning.interested.join(',')} / ${Object.keys(eventPlanning.registrations).length} vé`}</Label>
      <EventDetailDesignScreen event={events[0]!} sample={sample} />
    </>
  );
}

test.each([
  ['green-class', '386:9376', '386:7054'],
  ['beach', '386:9470', '386:17397'],
  ['school-class', '386:9575', '386:9681'],
  ['garden', '386:10026', '386:17299'],
])(
  'activity %s toggles interest both ways and keeps its registration route',
  async (id, before, after) => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id });
    await renderApp(<EventDetailScreen />);
    expect(screen.getByTestId(`event-detail-${before}`)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Quan tâm hoạt động'));
    expect(screen.getByTestId(`event-detail-${after}`)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Bỏ quan tâm hoạt động'));
    expect(screen.getByTestId(`event-detail-${before}`)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Xem biểu mẫu đăng ký'));
    expect(router.push).toHaveBeenLastCalledWith(`/registration?id=${id}`);
  },
);

test('interest, saving and registration are independent; removing a save preserves interest', async () => {
  await renderApp(<Session />);
  await fireEvent.press(screen.getByLabelText('Quan tâm hoạt động'));
  expect(screen.getByText('Phiên: workshop / green-class / 0 vé')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Lưu hoạt động'));
  expect(screen.getByText('Phiên: workshop,green-class / green-class / 0 vé')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Đóng thông báo yêu thích'));
  await fireEvent.press(screen.getByLabelText('Bỏ lưu hoạt động'));
  expect(screen.getByText('Phiên: workshop / green-class / 0 vé')).toBeTruthy();
  expect(screen.getByText('Hoạt động yêu thích đã xóa')).toBeTruthy();
});

test('preview changes stay isolated and the saved shortcut preserves preview mode', async () => {
  await renderApp(<Session sample />);
  await fireEvent.press(screen.getByLabelText('Quan tâm hoạt động'));
  await fireEvent.press(screen.getByLabelText('Lưu hoạt động'));
  expect(screen.getByText('Phiên: workshop /  / 0 vé')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Đi đến mục yêu thích'));
  expect(router.push).toHaveBeenLastCalledWith({ pathname: '/saved', params: { preview: '1' } });
});

test('interested preview deep link opens its state and the original thumbnail opens a dismissible gallery', async () => {
  jest
    .mocked(useLocalSearchParams)
    .mockReturnValue({ id: 'garden', preview: '1', interested: '1' });
  await renderApp(<EventDetailScreen />);
  expect(screen.getByTestId('event-detail-386:17299')).toBeTruthy();
  expect(screen.getByText('CÙNG NHAU LÀM VƯỜN SẠCH')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Xem ảnh hoạt động 3'));
  await fireEvent.press(screen.getByLabelText('Đóng ảnh hoạt động'));
  expect(screen.queryByLabelText('Đóng ảnh hoạt động')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Xem hoạt động Trải nghiệm phân loại rác thực tế'));
  expect(router.push).toHaveBeenLastCalledWith({
    pathname: '/events/[id]',
    params: { id: 'school-class', preview: '1' },
  });
});

test('saved list keeps accent-insensitive search and its collection/reminder entry points', async () => {
  await renderApp(<SavedEventsScreen />);
  await screen.findByLabelText('Xóa Đổi giấy cũ, gieo mầm xanh');
  await fireEvent.changeText(screen.getByLabelText('Tìm hoạt động đã lưu'), 'khong co');
  expect(screen.getByText('Không tìm thấy hoạt động đã lưu')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Tìm hoạt động đã lưu'), 'giay cu');
  expect(screen.getByLabelText('Xóa Đổi giấy cũ, gieo mầm xanh')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Bộ sưu tập'));
  expect(router.push).toHaveBeenLastCalledWith({ pathname: '/event-collections', params: {} });
  await fireEvent.press(screen.getByLabelText('Nhắc lịch'));
  expect(router.push).toHaveBeenLastCalledWith({ pathname: '/event-reminders', params: {} });
});

test('switching from a preview deep link clears its feedback and keeps the actual saved session', async () => {
  function PreviewSwitch() {
    const [sample, setSample] = useState(true);
    jest
      .mocked(useLocalSearchParams)
      .mockReturnValue(sample ? { preview: '1', feedback: 'removed' } : {});
    return (
      <>
        <Button title="Mở liên kết danh sách thường" onPress={() => setSample(false)} />
        <SavedEventsScreen />
      </>
    );
  }
  await renderApp(<PreviewSwitch />);
  expect(screen.getByText('Hoạt động yêu thích đã xóa')).toBeTruthy();
  // A deep link can change route params while a native modal is open.
  await fireEvent.press(
    screen.getByLabelText('Mở liên kết danh sách thường', { includeHiddenElements: true }),
  );
  expect(screen.queryByText('Hoạt động yêu thích đã xóa')).toBeNull();
  expect(await screen.findByLabelText('Xóa Đổi giấy cũ, gieo mầm xanh')).toBeTruthy();
});
