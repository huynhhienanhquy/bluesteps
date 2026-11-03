import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { notificationAsync } from 'expo-haptics';
import { playFeedback } from '../feedback';

const mockPlayer = {
  isLoaded: true,
  volume: 1,
  seekTo: jest.fn().mockResolvedValue(undefined),
  play: jest.fn(),
};
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => mockPlayer),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success' },
}));
let currentTime = Date.now();
beforeEach(() => {
  currentTime += 1000;
  jest.spyOn(Date, 'now').mockReturnValue(currentTime);
  jest.clearAllMocks();
});
afterEach(() => jest.restoreAllMocks());

test('disabled feedback does not touch either device API', async () => {
  await playFeedback({ sound: false, haptics: false });
  expect(createAudioPlayer).not.toHaveBeenCalled();
  expect(notificationAsync).not.toHaveBeenCalled();
  expect(mockPlayer.play).not.toHaveBeenCalled();
});
test('sound-only preference plays the local clip without vibration or recording', async () => {
  await playFeedback({ sound: true, haptics: false });
  expect(mockPlayer.seekTo).toHaveBeenCalledWith(0);
  expect(mockPlayer.play).toHaveBeenCalledTimes(1);
  expect(notificationAsync).not.toHaveBeenCalled();
  expect(setAudioModeAsync).toHaveBeenCalledWith(
    expect.objectContaining({ allowsRecording: false, shouldPlayInBackground: false }),
  );
});
test('haptic-only preference does not play audio and close repeats are suppressed', async () => {
  await playFeedback({ sound: false, haptics: true });
  await playFeedback({ sound: false, haptics: true });
  expect(notificationAsync).toHaveBeenCalledTimes(1);
  expect(mockPlayer.play).not.toHaveBeenCalled();
});
