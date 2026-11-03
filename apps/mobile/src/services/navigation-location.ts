import { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { errorMessage } from './api';
export function useNavigationLocation(enabled: boolean) {
  const [position, setPosition] = useState<Location.LocationObject>(),
    [error, setError] = useState('');
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      let generation = 0,
        subscription: Location.LocationSubscription | undefined,
        alive = true;
      async function start() {
        const request = ++generation;
        try {
          const permission = await Location.requestForegroundPermissionsAsync();
          if (!alive || request !== generation) return;
          if (!permission.granted)
            throw new Error('Chưa có quyền vị trí. Bạn vẫn có thể đọc các bước chỉ đường.');
          const watching = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 5 },
            (value) => {
              if (alive && request === generation) {
                setPosition(value);
                setError('');
              }
            },
          );
          if (!alive || request !== generation) watching.remove();
          else subscription = watching;
        } catch (cause) {
          if (alive && request === generation) setError(errorMessage(cause));
        }
      }
      function stop() {
        generation++;
        subscription?.remove();
        subscription = undefined;
      }
      if (AppState.currentState === 'active') void start();
      const state = AppState.addEventListener('change', (value) => {
        stop();
        if (value === 'active') void start();
      });
      return () => {
        alive = false;
        stop();
        state.remove();
      };
    }, [enabled]),
  );
  return { position, error };
}
