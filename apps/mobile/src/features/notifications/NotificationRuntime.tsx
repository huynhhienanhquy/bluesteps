import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { router, useRootNavigationState, type Href } from 'expo-router';
import { useApp } from '../../providers';
import { useResource } from '../../services/queries';
import {
  subscribeNotificationOpen,
  syncDeviceReminders,
  type DeviceReminder,
} from '../../services/device-notifications';

export function NotificationRuntime() {
  const { status, user } = useApp();
  const navigation = useRootNavigationState();
  const query = useResource<DeviceReminder[]>(
    '/v1/me/device-reminders',
    true,
    Platform.OS !== 'web',
  );
  const { refetch } = query;
  useEffect(() => {
    if (Platform.OS === 'web' || status === 'loading') return;
    if (status === 'guest') void syncDeviceReminders(null).catch(() => {});
    else if (status === 'authenticated' && query.data && user)
      void syncDeviceReminders(user.id, query.data).catch(() => {});
  }, [status, user, query.data]);
  useEffect(() => {
    if (Platform.OS === 'web' || status !== 'authenticated') return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refetch();
    });
    return () => subscription.remove();
  }, [status, refetch]);
  useEffect(() => {
    if (Platform.OS === 'web' || !navigation?.key || status !== 'authenticated' || !user) return;
    return subscribeNotificationOpen(user.id, (path) => router.push(path as Href));
  }, [navigation?.key, status, user]);
  return null;
}
