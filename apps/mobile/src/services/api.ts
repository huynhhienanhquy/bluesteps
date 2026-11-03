import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { randomUUID } from 'expo-crypto';
import type { components } from '@bluesteps/api-client';

export { ApiError } from '@bluesteps/api-client';
export type Schemas = components['schemas'];
export type Page<T> = { items: T[]; nextCursor: string | null; totalCount?: number };

export function apiBaseUrl(): string {
  if (__DEV__ && Platform.OS !== 'web' && Constants.expoConfig?.extra?.devApiProxy === true) {
    const host = Constants.expoGoConfig?.debuggerHost ?? Constants.expoConfig?.hostUri;
    if (!host) throw new Error('Chưa xác định được địa chỉ Expo tunnel.');
    const origin = new URL(host.includes('://') ? host : `https://${host}`);
    origin.protocol = 'https:';
    return `${origin.origin}/__bluesteps_api`;
  }
  const configured = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  if (configured) {
    const parsed = new URL(configured);
    if (
      parsed.protocol !== 'https:' &&
      !__DEV__ &&
      parsed.hostname !== 'localhost' &&
      parsed.hostname !== '127.0.0.1'
    ) {
      throw new Error('API cần sử dụng HTTPS.');
    }
    return configured;
  }
  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ) {
    return `http://${window.location.hostname}:8000`;
  }
  if (__DEV__) {
    const host = Constants.expoConfig?.hostUri?.split(':')[0];
    if (host) return `http://${host}:8000`;
  }
  throw new Error('Chưa cấu hình EXPO_PUBLIC_API_URL.');
}

export const operationKey = () => randomUUID();
export const dateLabel = (value: string) => new Date(value).toLocaleString('vi-VN');
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Không thể kết nối dịch vụ. Vui lòng thử lại.';
}
