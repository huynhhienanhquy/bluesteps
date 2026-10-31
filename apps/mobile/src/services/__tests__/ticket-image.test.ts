import { captureRef, releaseCapture } from 'react-native-view-shot';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { saveTicketImage, shareTicketImage } from '../ticket-image';

jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn(), releaseCapture: jest.fn() }));
jest.mock('expo-media-library', () => ({
  Asset: { create: jest.fn() },
  requestPermissionsAsync: jest.fn(),
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

const target = { nodeType: 1 };
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(captureRef).mockResolvedValue('file:///cache/ticket.png');
});

test('denied add-only permission leaves the ticket uncaptured and does not read or save media', async () => {
  jest
    .mocked(requestPermissionsAsync)
    .mockResolvedValue({ granted: false } as Awaited<ReturnType<typeof requestPermissionsAsync>>);
  await expect(saveTicketImage(target, 'green-class')).resolves.toBe('permission-denied');
  expect(requestPermissionsAsync).toHaveBeenCalledWith(true, []);
  expect(captureRef).not.toHaveBeenCalled();
  expect(Asset.create).not.toHaveBeenCalled();
});

test('successful save waits for the asset to be created and releases the temporary image', async () => {
  jest
    .mocked(requestPermissionsAsync)
    .mockResolvedValue({ granted: true } as Awaited<ReturnType<typeof requestPermissionsAsync>>);
  await expect(saveTicketImage(target, 'green-class')).resolves.toBe('saved');
  expect(Asset.create).toHaveBeenCalledWith('file:///cache/ticket.png');
  expect(releaseCapture).toHaveBeenCalledWith('file:///cache/ticket.png');
});

test('save failure propagates and cleans the temporary image instead of reporting success', async () => {
  jest
    .mocked(requestPermissionsAsync)
    .mockResolvedValue({ granted: true } as Awaited<ReturnType<typeof requestPermissionsAsync>>);
  jest.mocked(Asset.create).mockRejectedValueOnce(new Error('out of storage'));
  await expect(saveTicketImage(target, 'green-class')).rejects.toThrow('out of storage');
  expect(releaseCapture).toHaveBeenCalledWith('file:///cache/ticket.png');
});

test('share only captures after the user-selected action can open a chooser, without library permissions', async () => {
  jest.mocked(Sharing.isAvailableAsync).mockResolvedValueOnce(false);
  await expect(shareTicketImage(target, 'green-class')).resolves.toBe('unavailable');
  expect(captureRef).not.toHaveBeenCalled();
  jest.mocked(Sharing.isAvailableAsync).mockResolvedValueOnce(true);
  await expect(shareTicketImage(target, 'green-class')).resolves.toBe('share-opened');
  expect(Sharing.shareAsync).toHaveBeenCalledWith(
    'file:///cache/ticket.png',
    expect.objectContaining({ mimeType: 'image/png' }),
  );
  expect(requestPermissionsAsync).not.toHaveBeenCalled();
  expect(releaseCapture).toHaveBeenCalledWith('file:///cache/ticket.png');
});
