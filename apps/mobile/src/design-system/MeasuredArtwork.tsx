import { View } from 'react-native';
import { Artwork } from './DesignScreen';

export type MeasuredImage = {
  id: string;
  source: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  flipY?: boolean;
  opacity?: number;
  ancestorOpacity?: number;
  crop?: readonly (readonly number[])[] | null;
  radius?: number;
  svg?: boolean;
  fit?: 'fill' | 'cover' | 'contain';
  shadow?: string;
  render?: { x: number; y: number; w: number; h: number } | null;
};

/** Keeps the original image transform, clipping and SVG stroke bounds from Figma. */
export function MeasuredArtwork({
  image,
  source,
  useRenderBounds = false,
}: {
  image: MeasuredImage;
  source: number;
  useRenderBounds?: boolean;
}) {
  const box = useRenderBounds && image.svg && image.render ? image.render : image;
  const sx = image.crop?.[0]?.[0] ?? 0;
  const sy = image.crop?.[1]?.[1] ?? 0;
  const cropped = sx > 0 && sy > 0;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.h,
        opacity: image.svg ? (image.ancestorOpacity ?? 1) : (image.opacity ?? 1),
        borderRadius: image.radius ?? 0,
        boxShadow: image.shadow,
        overflow: cropped ? 'hidden' : 'visible',
        transform: [{ rotate: `${image.rotation ?? 0}deg` }, { scaleY: image.flipY ? -1 : 1 }],
      }}
    >
      {cropped ? (
        <Artwork
          source={source}
          width={box.w / sx}
          height={box.h / sy}
          fit="fill"
          style={{
            position: 'absolute',
            left: (-(image.crop?.[0]?.[2] ?? 0) / sx) * box.w,
            top: (-(image.crop?.[1]?.[2] ?? 0) / sy) * box.h,
          }}
        />
      ) : (
        <Artwork
          source={source}
          width={box.w}
          height={box.h}
          fit={image.fit ?? 'fill'}
          style={{ borderRadius: image.radius ?? 0 }}
        />
      )}
    </View>
  );
}
