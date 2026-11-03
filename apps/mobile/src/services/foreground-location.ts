import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useApp } from '../providers';
import { errorMessage } from './api';

export type ForegroundLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
};
export function useForegroundLocation() {
  const { user } = useApp();
  const client = useQueryClient();
  const key = ['foreground-location', user?.id ?? 'guest'];
  const query = useQuery<ForegroundLocation>({
    queryKey: key,
    enabled: false,
    queryFn: () => {
      throw new Error('Explicit location request required');
    },
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const account = user?.id ?? 'guest';
  const [requestAccount, setRequestAccount] = useState(account);
  const alive = useRef(true);
  const generation = useRef(0);
  useEffect(() => {
    alive.current = true;
    const current = generation.current + 1;
    generation.current = current;
    return () => {
      alive.current = false;
      generation.current = current + 1;
    };
  }, [user?.id]);
  async function locate() {
    setRequestAccount(account);
    const current = generation.current;
    setBusy(true);
    setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!alive.current || generation.current !== current) return;
      if (!permission.granted)
        throw new Error('Chưa có quyền vị trí. Bạn vẫn có thể tìm điểm bằng tên hoặc địa chỉ.');
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error('Chưa lấy được vị trí. Hãy thử lại ở nơi có tín hiệu GPS.')),
            20000,
          );
        }),
      ]).finally(() => clearTimeout(timeout));
      if (alive.current && generation.current === current) {
        client.setQueryData(key, { ...position.coords, timestamp: position.timestamp });
        return { ...position.coords, timestamp: position.timestamp };
      }
    } catch (cause) {
      if (alive.current && generation.current === current) setError(errorMessage(cause));
    } finally {
      if (alive.current && generation.current === current) setBusy(false);
    }
  }
  return {
    location: query.data,
    busy: requestAccount === account && busy,
    error: requestAccount === account ? error : '',
    locate,
    clear: () => client.removeQueries({ queryKey: key, exact: true }),
  };
}
