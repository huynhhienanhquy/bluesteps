import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { Platform } from 'react-native';
import { notificationTarget } from './notification-target';

export type DeviceReminder = {
  id: string;
  title: string;
  body: string;
  scheduledFor: string;
  targetPath: string;
  sound: boolean;
};

Notifications.setNotificationHandler({
  handleNotification: async (notification) => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: Boolean(notification.request.content.sound),
    shouldSetBadge: false,
  }),
});

export async function notificationPermission(request = false): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('bluesteps-reminders', {
      name: 'Nhắc lịch BlueSteps',
      importance: AndroidImportance.DEFAULT,
    });
    await Notifications.setNotificationChannelAsync('bluesteps-reminders-silent', {
      name: 'Nhắc lịch BlueSteps (im lặng)',
      importance: AndroidImportance.DEFAULT,
      sound: null,
      enableVibrate: false,
    });
  }
  let permission = await Notifications.getPermissionsAsync();
  if (request && !permission.granted && permission.canAskAgain)
    permission = await Notifications.requestPermissionsAsync();
  return permission.granted || permission.ios?.status === IosAuthorizationStatus.PROVISIONAL;
}

let queue: Promise<void> = Promise.resolve();
let revision = 0;
export function syncDeviceReminders(userId: string | null, reminders: DeviceReminder[] = []) {
  const requested = ++revision;
  queue = queue
    .catch(() => {})
    .then(async () => {
      if (requested !== revision) return;
      const existing = await Notifications.getAllScheduledNotificationsAsync();
      for (const item of existing) {
        if (item.identifier.startsWith('bluesteps:'))
          await Notifications.cancelScheduledNotificationAsync(item.identifier);
      }
      if (!userId || !(await notificationPermission()) || requested !== revision) return;
      for (const reminder of reminders.slice(0, 47)) {
        if (requested !== revision) break;
        const date = new Date(reminder.scheduledFor);
        if (date.getTime() <= Date.now()) continue;
        await Notifications.scheduleNotificationAsync({
          identifier: `bluesteps:${userId}:${reminder.id}`,
          content: {
            title: reminder.title,
            body: reminder.body,
            sound: reminder.sound ? 'default' : false,
            data: { url: reminder.targetPath, userId },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date,
            channelId: reminder.sound ? 'bluesteps-reminders' : 'bluesteps-reminders-silent',
          },
        });
      }
    });
  return queue;
}

const openedResponses = new Set<string>();
export function subscribeNotificationOpen(userId: string, open: (path: string) => void) {
  const handle = (response: Notifications.NotificationResponse | null) => {
    const data = response?.notification.request.content.data;
    const path = notificationTarget(data?.url);
    if (response && data?.userId === userId && path) {
      const key = `${userId}:${response.notification.request.identifier}:${response.notification.date}:${response.actionIdentifier}`;
      if (openedResponses.has(key)) return;
      openedResponses.add(key);
      if (openedResponses.size > 64) openedResponses.delete(openedResponses.values().next().value!);
      open(path);
      void Notifications.clearLastNotificationResponseAsync().catch(() => {});
    }
  };
  handle(Notifications.getLastNotificationResponse());
  const listener = Notifications.addNotificationResponseReceivedListener(handle);
  return () => listener.remove();
}
