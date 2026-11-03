export type { DeviceReminder } from './device-notifications';
export async function notificationPermission(_request = false) {
  return false;
}
export async function syncDeviceReminders(
  _userId: string | null,
  _reminders: import('./device-notifications').DeviceReminder[] = [],
) {}
export function subscribeNotificationOpen(_userId: string, _open: (path: string) => void) {
  return () => {};
}
