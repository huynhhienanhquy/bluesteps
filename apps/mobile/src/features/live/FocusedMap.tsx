import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { VectorMap } from './VectorMap';
import type { PointMapProps } from './map-document';
export function FocusedMap(props: PointMapProps) {
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  return focused ? <VectorMap {...props} /> : <View style={{ flex: 1 }} />;
}
