import { Platform, View } from 'react-native';
import { Artwork } from '../../design-system/DesignScreen';

/** The expanded instruction frames contain a separately positioned navigation. */
export function HandbookExpandedNavigation({
  assets,
  inorganic,
}: {
  assets: Record<string, number>;
  inorganic: boolean;
}) {
  const layers = [
    ['imgRectangle87', 170, 859, 95, 67],
    ['imgGroup', 365.9828, 868.0324, 28.034, 27.9652],
    ['imgGroup1', 281.2578888, 867.28293264, 29.5366224, 29.46413472],
    ['imgGroup36732', 40.252, 867.2485684, 111.496, 32.0458086],
    ['imgGroup36731', 174.0025, 810, 82.995, 83.0025],
    [inorganic ? 'imgLine' : 'imgLine1', 144, 917.44, 141, 2.56],
  ] as const;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, top: 0, width: 428, height: 926 }}
    >
      <View
        style={{
          position: 'absolute',
          left: -7,
          top: 849,
          width: 185,
          height: 77,
          backgroundColor: '#147CC1',
          borderBottomLeftRadius: 25,
          borderTopRightRadius: 35,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 252,
          top: 851,
          width: 185,
          height: 75,
          backgroundColor: '#147CC1',
          borderBottomRightRadius: 25,
          borderTopLeftRadius: 35,
        }}
      />
      {layers
        .filter(([key]) => Platform.OS === 'web' || !key.startsWith('imgLine'))
        .map(([key, left, top, width, height]) => (
          <Artwork
            key={key}
            source={assets[key]}
            width={width}
            height={height}
            fit="fill"
            style={{ position: 'absolute', left, top }}
          />
        ))}
    </View>
  );
}
