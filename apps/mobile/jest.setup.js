jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false },
  useLocalSearchParams: () => ({}),
  useFocusEffect: jest.fn(),
}));
// Fonts and device permissions are native boundaries; their lifecycle is checked on a device separately.
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: () => [{ granted: false, canAskAgain: false }, jest.fn()],
}));
