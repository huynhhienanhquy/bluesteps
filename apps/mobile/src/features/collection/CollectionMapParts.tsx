import { Platform, View } from 'react-native';
import { Artwork } from '../../design-system/DesignScreen';
import { collectionFlowAssets } from '../../design-system/collection-flow-assets';
const a = collectionFlowAssets['534:48401'];
export function CollectionMapStatus() {
  if (Platform.OS !== 'web') return null;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, top: 0, width: 428, height: 49 }}
    >
      <Artwork
        source={a.imgTime}
        width={52}
        height={21}
        style={{ position: 'absolute', left: 12, top: 12 }}
      />
      <Artwork
        source={a.imgMobileSignal}
        width={17}
        height={10.666}
        style={{ position: 'absolute', right: 74.33, top: 17.667 }}
      />
      <Artwork
        source={a.imgWifi}
        width={15.272}
        height={10.966}
        style={{ position: 'absolute', right: 54.03, top: 17.333 }}
      />
      <Artwork
        source={a.imgRectangle}
        width={22}
        height={11.333}
        style={{ position: 'absolute', right: 27, top: 17.333 }}
      />
      <Artwork
        source={a.imgRectangle1}
        width={18}
        height={7.333}
        style={{ position: 'absolute', right: 29, top: 19.333 }}
      />
      <Artwork
        source={a.imgCombinedShape}
        width={1.328}
        height={4}
        style={{ position: 'absolute', right: 24.67, top: 21 }}
      />
    </View>
  );
}
