import { useState } from 'react';
import { palettes } from '@bluesteps/design-tokens';
import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../../providers';
import { uploadPostMedia } from '../../services/post-media';
import type { Schemas } from '../../services/api';
import { CollectionPhotos } from './CollectionPhotos';

jest.mock('../../providers', () => ({ useApp: jest.fn() }));
jest.mock('../../services/post-media', () => ({ uploadPostMedia: jest.fn() }));
jest.mock('../../services/api', () => ({
  operationKey: () => 'upload-key',
  errorMessage: (error: Error) => error.message,
}));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('./PostMedia', () => ({ PostMedia: () => null }));
jest.mock('./ScanCapture', () => ({ ScanCapture: () => null }));
const asset: Schemas['MediaAsset'] = {
  id: 'photo',
  kind: 'image',
  fileName: 'photo.jpg',
  mimeType: 'image/jpeg',
  size: 120,
  width: 16,
  height: 12,
};
const busy = jest.fn();
function Form({ initial = [] }: { initial?: Schemas['MediaAsset'][] }) {
  const [photos, setPhotos] = useState(initial);
  return <CollectionPhotos photos={photos} onChange={setPhotos} onBusy={busy} />;
}
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(useApp)
    .mockReturnValue({ api: {}, colors: palettes.light } as unknown as ReturnType<typeof useApp>);
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: 'file:///photo.jpg',
        width: 16,
        height: 12,
        type: 'image',
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
      },
    ],
  });
  jest.mocked(uploadPostMedia).mockResolvedValue(asset);
});
test('five-photo limit blocks additional picks and can be reopened by removing a photo', async () => {
  const user = userEvent.setup();
  await render(
    <Form initial={Array.from({ length: 5 }, (_, i) => ({ ...asset, id: String(i) }))} />,
  );
  expect(screen.getByRole('button', { name: 'Thêm ảnh địa điểm' })).toBeDisabled();
  await user.press(screen.getByRole('button', { name: 'Bỏ ảnh 1' }));
  expect(screen.getByRole('button', { name: 'Thêm ảnh địa điểm' })).toBeEnabled();
  expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
});
test('failed upload can be retried with the same identity without selecting the file again', async () => {
  jest.mocked(uploadPostMedia).mockRejectedValueOnce(new Error('Mất kết nối'));
  const user = userEvent.setup();
  await render(<Form />);
  await user.press(screen.getByRole('button', { name: 'Thêm ảnh địa điểm' }));
  await waitFor(() => expect(screen.getByText('Mất kết nối')).toBeVisible());
  expect(screen.queryByRole('button', { name: 'Bỏ ảnh 1' })).toBeNull();
  await user.press(screen.getByRole('button', { name: 'Thử tải ảnh lại' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Bỏ ảnh 1' })).toBeVisible());
  expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledTimes(1);
  expect(jest.mocked(uploadPostMedia).mock.calls.map((call) => call[1].clientUploadId)).toEqual([
    'upload-key',
    'upload-key',
  ]);
  expect(busy).toHaveBeenLastCalledWith(false);
});
test('leaving a form aborts upload and ignores a result delivered after unmount', async () => {
  let finish!: (asset: Schemas['MediaAsset']) => void;
  jest.mocked(uploadPostMedia).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const change = jest.fn(),
    user = userEvent.setup();
  const { unmount } = await render(
    <CollectionPhotos photos={[]} onChange={change} onBusy={busy} />,
  );
  await user.press(screen.getByRole('button', { name: 'Thêm ảnh địa điểm' }));
  await waitFor(() => expect(uploadPostMedia).toHaveBeenCalledTimes(1));
  const signal = jest.mocked(uploadPostMedia).mock.calls[0]![2];
  await unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => finish(asset));
  expect(change).not.toHaveBeenCalled();
});
