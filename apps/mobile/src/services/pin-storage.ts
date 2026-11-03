import * as SecureStore from 'expo-secure-store';
export const readPinStorage = (key: string) => SecureStore.getItemAsync(key);
export const writePinStorage = (key: string, value: string) =>
  SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
export const removePinStorage = (key: string) => SecureStore.deleteItemAsync(key);
