import { fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { palettes } from '@bluesteps/design-tokens';
import { useApp } from '../../providers';
import { useCommand, usePages, useResource } from '../../services/queries';
import { router, useLocalSearchParams } from 'expo-router';
import { operationKey } from '../../services/api';
import { ScanScreen } from './ScanScreen';
import { scanImageBase64 } from '../../services/scan-image';

const mockTakePicture = jest.fn();
const mockCreate = { mutateAsync: jest.fn(), reset: jest.fn(), isPending: false };
const mockConfirm = { mutateAsync: jest.fn(), reset: jest.fn(), isPending: false };
const mockScan = {
  id: 'scan-id',
  status: 'completed',
  resultMode: 'model',
  predictedClass: 'plastic',
  confidence: 0.93,
  resultLabel: 'Nhựa',
  resultItem: {
    id: 'bottle-id',
    name: 'Chai nhựa PET',
    material: 'Nhựa',
    category: 'Tái chế',
    steps: ['Làm sạch chai.'],
  },
  confirmation: null,
};
const mockPrediction = { ...mockScan, predictionToken: 'signed-prediction' };
const mockRequest = jest.fn();
const mockReceipt = {
  actionId: 'action-id',
  itemId: 'bottle-id',
  evidenceStatus: 'user_confirmed',
  award: { points: '5', status: 'awarded', reason: null },
  walletBalance: '7',
};

jest.mock('../../services/scan-image', () => ({ scanImageBase64: jest.fn() }));
jest.mock('./PrivateModal', () => ({
  PrivateModal: jest.requireActual<typeof import('react-native')>('react-native').Modal,
}));
jest.mock('../../providers', () => ({ useApp: jest.fn() }));
jest.mock('../../services/queries', () => ({
  usePages: jest.fn(),
  useCommand: jest.fn(),
  useResource: jest.fn(),
}));
jest.mock('../../services/api', () => ({
  ...jest.requireActual('../../services/api'),
  operationKey: jest.fn(),
}));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('expo-router', () => ({
  router: { canGoBack: () => false, push: jest.fn(), replace: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: jest.fn(),
  usePathname: () => '/scan',
  useFocusEffect: (callback: () => () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(callback, [callback]);
  },
}));
jest.mock('expo-camera', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    useCameraPermissions: () => [{ granted: true }, jest.fn()],
    CameraView: React.forwardRef(function MockCameraView(
      { onCameraReady }: { onCameraReady: () => void },
      ref,
    ) {
      React.useImperativeHandle(ref, () => ({ takePictureAsync: mockTakePicture }));
      return React.createElement(View, { testID: 'camera-preview', onLayout: onCameraReady });
    }),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockTakePicture.mockReset();
  mockRequest.mockReset().mockResolvedValue(mockPrediction);
  jest.mocked(scanImageBase64).mockResolvedValue('encoded-photo');
  let selection = 0;
  jest
    .mocked(operationKey)
    .mockImplementation(() =>
      ++selection === 1 ? 'selected-image-id' : `selected-image-${selection}`,
    );
  jest.mocked(useLocalSearchParams).mockReturnValue({});
  jest
    .mocked(useCommand)
    .mockImplementation(
      (options) =>
        (options?.feedback ? mockConfirm : mockCreate) as unknown as ReturnType<typeof useCommand>,
    );
  jest
    .mocked(useResource)
    .mockReturnValue({ isPending: false, isError: false, data: undefined } as ReturnType<
      typeof useResource
    >);
  mockCreate.mutateAsync.mockReset().mockResolvedValue(mockScan);
  mockConfirm.mutateAsync.mockReset().mockResolvedValue(mockReceipt);
  jest.mocked(useApp).mockReturnValue({
    colors: palettes.light,
    api: { request: mockRequest },
  } as ReturnType<typeof useApp>);
  jest.mocked(usePages).mockReturnValue({
    isPending: false,
    isError: false,
    data: { pages: [{ items: [] }] },
  } as unknown as ReturnType<typeof usePages>);
  jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValue({
    granted: true,
  } as ImagePicker.MediaLibraryPermissionResponse);
});

function selectedImage(uri: string): ImagePicker.ImagePickerResult {
  return { canceled: false, assets: [{ uri, width: 100, height: 100 }] };
}

async function imageLoaded() {
  await fireEvent(screen.getByLabelText('Ảnh đã chọn'), 'load');
  await waitFor(() => expect(screen.getByText('Quét thành công!')).toBeVisible());
  await userEvent.setup().press(screen.getByRole('button', { name: 'Xem kết quả' }));
}
test('each selected image uploads its bytes and displays its own prediction', async () => {
  const user = userEvent.setup();
  await render(<ScanScreen />);
  expect(screen.queryByText('Nhựa')).toBeNull();
  for (const uri of ['file:///paper.jpg', 'file:///food.jpg']) {
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce(selectedImage(uri));
    await user.press(
      screen.getByRole('button', {
        name: uri.includes('paper') ? 'Chọn ảnh từ thư viện' : 'Chọn ảnh khác',
      }),
    );
    mockRequest.mockResolvedValueOnce({
      ...mockPrediction,
      resultLabel: uri.includes('paper') ? 'Giấy' : 'Rác hữu cơ',
    });
    await imageLoaded();
    expect(screen.getByText(uri.includes('paper') ? 'Giấy' : 'Rác hữu cơ')).toBeVisible();
    expect(scanImageBase64).toHaveBeenLastCalledWith(uri, expect.any(String));
    expect(screen.getByLabelText('Ảnh đã chọn')).toHaveProp('source', { uri });
  }
  await user.press(screen.getByRole('button', { name: 'Quay lại' }));
  expect(screen.queryByText('Nhựa')).toBeNull();
  expect(screen.queryByLabelText('Ảnh đã chọn')).toBeNull();
});

test('taking a photo closes the camera and displays the model prediction', async () => {
  const user = userEvent.setup();
  mockTakePicture.mockResolvedValue({ uri: 'file:///camera.jpg' });
  await render(<ScanScreen />);
  await user.press(screen.getByRole('button', { name: 'Mở camera' }));
  await fireEvent(screen.getByTestId('camera-preview'), 'layout');
  await user.press(screen.getByRole('button', { name: 'Chụp ảnh' }));
  await imageLoaded();
  expect(mockTakePicture).toHaveBeenCalledWith({ quality: 0.7 });
  expect(screen.queryByTestId('camera-preview')).toBeNull();
  expect(screen.getByText('Nhựa')).toBeVisible();
  expect(screen.getByLabelText('Ảnh đã chọn')).toHaveProp('source', { uri: 'file:///camera.jpg' });
});

test('camera switching waits for readiness and a failed capture does not invent an image', async () => {
  const user = userEvent.setup();
  mockTakePicture.mockRejectedValue(new Error('Camera busy'));
  await render(<ScanScreen />);
  await user.press(screen.getByRole('button', { name: 'Mở camera' }));
  expect(screen.getByRole('button', { name: 'Chụp ảnh' })).toBeDisabled();
  await fireEvent(screen.getByTestId('camera-preview'), 'layout');
  await user.press(screen.getByRole('button', { name: 'Đổi camera' }));
  expect(screen.getByRole('button', { name: 'Chụp ảnh' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Bật đèn' })).toBeDisabled();
  await fireEvent(screen.getByTestId('camera-preview'), 'layout');
  await user.press(screen.getByRole('button', { name: 'Chụp ảnh' }));
  expect(screen.getByText('Camera busy')).toBeVisible();
  expect(screen.queryByLabelText('Ảnh đã chọn')).toBeNull();
  expect(mockCreate.mutateAsync).not.toHaveBeenCalled();
  await user.press(screen.getByRole('button', { name: 'Đóng camera' }));
  expect(screen.getByText('Phân loại rác')).toBeVisible();
});

test('canceling the picker or denying permission does not create a classification', async () => {
  const user = userEvent.setup();
  jest
    .mocked(ImagePicker.launchImageLibraryAsync)
    .mockResolvedValue({ canceled: true, assets: null });
  await render(<ScanScreen />);
  await user.press(screen.getByRole('button', { name: 'Chọn ảnh từ thư viện' }));
  expect(screen.queryByText('Nhựa')).toBeNull();
  jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValue({
    granted: false,
  } as ImagePicker.MediaLibraryPermissionResponse);
  await user.press(screen.getByRole('button', { name: 'Chọn ảnh từ thư viện' }));
  expect(screen.queryByText('Nhựa')).toBeNull();
  expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledTimes(1);
});

test('catalog list failure does not prevent image inference', async () => {
  const user = userEvent.setup();
  jest.mocked(usePages).mockReturnValue({
    isPending: false,
    isError: true,
    error: new Error('Network unavailable'),
  } as unknown as ReturnType<typeof usePages>);
  jest
    .mocked(ImagePicker.launchImageLibraryAsync)
    .mockResolvedValue(selectedImage('file:///offline.jpg'));
  await render(<ScanScreen />);
  await user.press(screen.getByRole('button', { name: 'Chọn ảnh từ thư viện' }));
  await imageLoaded();
  expect(screen.getByText('Nhựa')).toBeVisible();
});

async function details() {
  const user = userEvent.setup();
  jest.mocked(useApp).mockReturnValue({
    colors: palettes.light,
    api: { request: mockRequest },
    status: 'authenticated',
    user: { id: 'alice' },
  } as ReturnType<typeof useApp>);
  jest
    .mocked(ImagePicker.launchImageLibraryAsync)
    .mockResolvedValue(selectedImage('file:///chosen.jpg'));
  await render(<ScanScreen />);
  await user.press(screen.getByRole('button', { name: 'Chọn ảnh từ thư viện' }));
  await imageLoaded();
  await user.press(screen.getByRole('button', { name: 'Chi tiết' }));
  return user;
}

test('actual image loading and unreadable file have distinct states without creating a scan', async () => {
  const user = userEvent.setup();
  jest
    .mocked(ImagePicker.launchImageLibraryAsync)
    .mockResolvedValue(selectedImage('file:///broken.jpg'));
  await render(<ScanScreen />);
  await user.press(screen.getByRole('button', { name: 'Chọn ảnh từ thư viện' }));
  expect(screen.getByText('Đang mở ảnh…')).toBeVisible();
  expect(screen.queryByText('Nhựa')).toBeNull();
  await fireEvent(screen.getByLabelText('Ảnh đã chọn'), 'error');
  expect(screen.getByText('Không mở được ảnh')).toBeVisible();
  expect(screen.queryByText('Nhựa')).toBeNull();
  expect(mockCreate.mutateAsync).not.toHaveBeenCalled();
  await user.press(screen.getByRole('button', { name: 'Sổ tay rác' }));
  expect(router.push).toHaveBeenCalledWith('/handbook');
});

test('details and cancel do not award, explicit confirmation uses only the server receipt', async () => {
  const user = await details();
  expect(screen.getByText('Kết quả quét rác')).toBeVisible();
  await user.press(screen.getByRole('button', { name: 'Tích điểm xanh' }));
  await user.press(screen.getByRole('button', { name: 'Để sau' }));
  expect(mockCreate.mutateAsync).not.toHaveBeenCalled();
  await user.press(screen.getByRole('button', { name: 'Tích điểm xanh' }));
  await user.type(screen.getByLabelText('Khối lượng đã cân (kg, không bắt buộc)'), '1,25');
  await user.press(screen.getByRole('button', { name: 'Xác nhận đã phân loại' }));
  expect(mockCreate.mutateAsync).toHaveBeenCalledWith({
    path: '/v1/scans',
    key: 'selected-image-id',
    body: {
      inputKind: 'library',
      clientImageId: 'selected-image-id',
      predictionToken: 'signed-prediction',
    },
  });
  expect(mockConfirm.mutateAsync).toHaveBeenCalledWith({
    path: '/v1/sorting-actions',
    key: 'scan-confirm:scan-id',
    body: { source: 'scan', scanId: 'scan-id', itemId: 'bottle-id', reportedWeightKg: '1.25' },
  });
  expect(screen.getByText('Bạn nhận được 5 điểm')).toBeVisible();
  await user.press(screen.getByRole('button', { name: 'Đóng kết quả nhận điểm' }));
  await user.press(screen.getByRole('button', { name: 'Xem kết quả nhận điểm' }));
  expect(mockConfirm.mutateAsync).toHaveBeenCalledTimes(1);
});

test('a failed save cannot show a reward and retry keeps the same image key', async () => {
  const user = await details();
  mockCreate.mutateAsync.mockRejectedValueOnce(new Error('Network unavailable'));
  mockConfirm.mutateAsync.mockResolvedValue({
    ...mockReceipt,
    award: { points: '0', status: 'not_awarded', reason: 'DAILY_LIMIT_REACHED' },
  });
  await user.press(screen.getByRole('button', { name: 'Tích điểm xanh' }));
  await user.press(screen.getByRole('button', { name: 'Xác nhận đã phân loại' }));
  expect(screen.queryByText('CHÚC MỪNG')).toBeNull();
  expect(mockConfirm.mutateAsync).not.toHaveBeenCalled();
  await user.press(screen.getByRole('button', { name: 'Xác nhận đã phân loại' }));
  expect(mockCreate.mutateAsync.mock.calls[0][0].key).toBe(
    mockCreate.mutateAsync.mock.calls[1][0].key,
  );
  expect(screen.getByText('Bạn nhận được 0 điểm')).toBeVisible();
  expect(screen.getByText('Đã đạt giới hạn nhận điểm hôm nay.')).toBeVisible();
});

test('missing published catalog item never creates a sorting action or reward', async () => {
  const user = await details();
  mockCreate.mutateAsync.mockResolvedValue({ ...mockScan, resultItem: null });
  await user.press(screen.getByRole('button', { name: 'Tích điểm xanh' }));
  await user.press(screen.getByRole('button', { name: 'Xác nhận đã phân loại' }));
  expect(mockConfirm.mutateAsync).not.toHaveBeenCalled();
  expect(screen.queryByText('CHÚC MỪNG')).toBeNull();
  expect(screen.getAllByText(/Chưa có mục sổ tay được công bố/).length).toBeGreaterThan(0);
});

test('saved scan reload opens the receipt without confirming again', async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ scanId: 'scan-id' });
  jest.mocked(useResource).mockImplementation(
    (path) =>
      ({
        isPending: false,
        isError: false,
        data: path.includes('waste-materials')
          ? { items: [] }
          : { ...mockScan, confirmation: mockReceipt },
      }) as ReturnType<typeof useResource>,
  );
  jest.mocked(useApp).mockReturnValue({
    colors: palettes.light,
    api: { request: mockRequest },
    status: 'authenticated',
    user: { id: 'alice' },
  } as ReturnType<typeof useApp>);
  const user = userEvent.setup();
  await render(<ScanScreen />);
  await user.press(screen.getByRole('button', { name: 'Xem kết quả nhận điểm' }));
  expect(screen.getByText('Bạn nhận được 5 điểm')).toBeVisible();
  expect(mockConfirm.mutateAsync).not.toHaveBeenCalled();
});

test('switching accounts discards the previous selected photo and local receipt state', async () => {
  await details();
  jest.mocked(useApp).mockReturnValue({
    colors: palettes.light,
    api: { request: mockRequest },
    status: 'authenticated',
    user: { id: 'bob' },
  } as ReturnType<typeof useApp>);
  await screen.rerender(<ScanScreen />);
  expect(screen.getByText('Phân loại rác')).toBeVisible();
  expect(screen.queryByText('Nhựa')).toBeNull();
  expect(screen.queryByLabelText('Ảnh đã chọn')).toBeNull();
});

test('recognition waits for the API and never creates a reward from image loading', async () => {
  let resolve!: (value: typeof mockPrediction) => void;
  mockRequest.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  jest
    .mocked(ImagePicker.launchImageLibraryAsync)
    .mockResolvedValue(selectedImage('file:///slow.jpg'));
  const user = userEvent.setup();
  await render(<ScanScreen />);
  await user.press(screen.getByRole('button', { name: 'Chọn ảnh từ thư viện' }));
  await fireEvent(screen.getByLabelText('Ảnh đã chọn'), 'load');
  await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
  expect(screen.getByText('Đang nhận diện rác…')).toBeVisible();
  expect(screen.queryByText('Quét thành công!')).toBeNull();
  expect(mockCreate.mutateAsync).not.toHaveBeenCalled();
  resolve(mockPrediction);
  await waitFor(() => expect(screen.getByText('Quét thành công!')).toBeVisible());
  expect(mockRequest).toHaveBeenCalledWith(
    '/v1/scans/recognize',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        inputKind: 'library',
        clientImageId: 'selected-image-id',
        imageBase64: 'encoded-photo',
      }),
    }),
    false,
  );
});

test('a recognition failure can retry the same photo without showing a fixed label', async () => {
  mockRequest.mockRejectedValueOnce(new Error('Mô hình chưa sẵn sàng'));
  jest
    .mocked(ImagePicker.launchImageLibraryAsync)
    .mockResolvedValue(selectedImage('file:///retry.jpg'));
  const user = userEvent.setup();
  await render(<ScanScreen />);
  await user.press(screen.getByRole('button', { name: 'Chọn ảnh từ thư viện' }));
  await fireEvent(screen.getByLabelText('Ảnh đã chọn'), 'load');
  await waitFor(() => expect(screen.getByText('Mô hình chưa sẵn sàng')).toBeVisible());
  expect(screen.queryByText('Nhựa')).toBeNull();
  expect(screen.queryByText('Quét thành công!')).toBeNull();
  await user.press(screen.getByRole('button', { name: 'Thử nhận diện lại' }));
  await waitFor(() => expect(screen.getByText('Quét thành công!')).toBeVisible());
  expect(mockRequest.mock.calls[0][1].body).toBe(mockRequest.mock.calls[1][1].body);
});

test('low confidence offers a retake or handbook without a reward action', async () => {
  mockRequest.mockResolvedValueOnce({
    ...mockPrediction,
    status: 'unrecognized',
    confidence: 0.3,
    resultItem: null,
  });
  jest
    .mocked(ImagePicker.launchImageLibraryAsync)
    .mockResolvedValue(selectedImage('file:///unclear.jpg'));
  const user = userEvent.setup();
  await render(<ScanScreen />);
  await user.press(screen.getByRole('button', { name: 'Chọn ảnh từ thư viện' }));
  await fireEvent(screen.getByLabelText('Ảnh đã chọn'), 'load');
  await waitFor(() => expect(screen.getByText('Chưa đủ độ tin cậy')).toBeVisible());
  expect(screen.queryByText('Quét thành công!')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Tích điểm xanh' })).toBeNull();
  expect(mockCreate.mutateAsync).not.toHaveBeenCalled();
  expect(mockConfirm.mutateAsync).not.toHaveBeenCalled();
});

test('guest login preserves the server prediction without uploading the image again', async () => {
  jest.mocked(useApp).mockReturnValue({
    colors: palettes.light,
    api: { request: mockRequest },
    status: 'guest',
  } as unknown as ReturnType<typeof useApp>);
  jest
    .mocked(ImagePicker.launchImageLibraryAsync)
    .mockResolvedValue(selectedImage('file:///guest.jpg'));
  const user = userEvent.setup();
  await render(<ScanScreen />);
  await user.press(screen.getByRole('button', { name: 'Chọn ảnh từ thư viện' }));
  await imageLoaded();
  await user.press(screen.getByRole('button', { name: 'Chi tiết' }));
  await user.press(screen.getByRole('button', { name: 'Đăng nhập để ghi nhận phân loại' }));
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/login',
    params: {
      returnTo:
        '/scan?pendingImageId=selected-image-id&pendingInput=library&pendingToken=signed-prediction',
    },
  });
  expect(mockCreate.mutateAsync).not.toHaveBeenCalled();
});

test('returning from login restores the signed prediction and its material guidance', async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({
    pendingImageId: '12345678-1234-1234-1234-123456789abc',
    pendingInput: 'library',
    pendingToken: 'signed-prediction',
  });
  jest.mocked(useApp).mockReturnValue({
    colors: palettes.light,
    api: { request: mockRequest },
    status: 'authenticated',
    user: { id: 'alice' },
  } as unknown as ReturnType<typeof useApp>);
  await render(<ScanScreen />);
  await waitFor(() => expect(screen.getByText('Nhựa')).toBeVisible());
  expect(mockRequest).toHaveBeenCalledWith(
    '/v1/scans/prediction',
    expect.objectContaining({ method: 'POST' }),
    false,
  );
  expect(scanImageBase64).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Tích điểm xanh' })).toBeEnabled();
});
