import { captureRef, releaseCapture } from 'react-native-view-shot';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Sharing from 'expo-sharing';

export type TicketImageTarget = Parameters<typeof captureRef>[0];
export type TicketImageResult =
  'saved' | 'downloaded' | 'permission-denied' | 'share-opened' | 'unavailable';

/** Only called after the user chooses a ticket image action. Never reads the photo library. */
export async function saveTicketImage(
  target: TicketImageTarget,
  eventId: string,
): Promise<TicketImageResult> {
  if (!target) throw new Error('Ticket is not ready');
  const permission = await requestPermissionsAsync(true, []);
  if (!permission.granted) return 'permission-denied';
  const uri = await captureRef(target, {
    format: 'png',
    result: 'tmpfile',
    fileName: `bluesteps-demo-${eventId}`,
  });
  try {
    await Asset.create(uri);
    return 'saved';
  } finally {
    releaseCapture(uri);
  }
}

/** Opens the OS chooser only; the user chooses any destination and confirms sharing there. */
export async function shareTicketImage(
  target: TicketImageTarget,
  eventId: string,
): Promise<TicketImageResult> {
  if (!target) throw new Error('Ticket is not ready');
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  const uri = await captureRef(target, {
    format: 'png',
    result: 'tmpfile',
    fileName: `bluesteps-demo-${eventId}`,
  });
  try {
    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      UTI: 'public.png',
      dialogTitle: 'Ảnh vé mẫu BlueSteps',
    });
    return 'share-opened';
  } finally {
    releaseCapture(uri);
  }
}
