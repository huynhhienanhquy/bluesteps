import { Platform, Pressable, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Artwork } from './DesignScreen';
import { achievementAssets as assets } from './achievement-assets';
import { useState } from 'react';

/** The 428 × 112 variant uses the frame's own SVGs and their original nested bounds. */
function FrameNavigation({ source }: { source: Record<string, number> }) {
  const [width, setWidth] = useState(428);
  const scale = width / 428;
  const rect = (left: number, top: number, right: number, bottom: number) => ({
    left: left * 4.28,
    top: top * 1.12,
    width: (100 - left - right) * 4.28,
    height: (100 - top - bottom) * 1.12,
  });
  const expand = (r: ReturnType<typeof rect>, horizontal: number, vertical: number) => ({
    left: r.left - (r.width * horizontal) / 100,
    top: r.top - (r.height * vertical) / 100,
    width: r.width * (1 + (2 * horizontal) / 100),
    height: r.height * (1 + (2 * vertical) / 100),
  });
  const layers = [
    ['imgRectangle87', rect(39.86, 42.24, 38.74, 0)],
    ['imgVector', rect(85.9, 54.83, 11.58, 35.52)],
    ['imgVector1', rect(84.01, 50, 9.68, 25.86)],
    ['imgVector2', expand(rect(65.37, 60.86, 28.88, 25.86), 2.94, 4.87)],
    ['imgVector3', expand(rect(65.09, 50, 28.6, 26.47), 2.68, 2.75)],
    ['imgVector4', expand(rect(29.28, 55.92, 64.41, 23.67), 2.68, 3.17)],
    ['imgVector5', expand(rect(29.48, 50, 64.61, 27.62), 2.86, 2.89)],
    [
      'imgVector6',
      expand(
        {
          left: 428 * 0.1081,
          top: 58,
          width: 428 * (1 - 0.1081 - 0.8288),
          height: 428 * (1 - 0.1081 - 0.8288),
        },
        2.78,
        2.78,
      ),
    ],
    [
      'imgEllipse9',
      (() => {
        const r = rect(41.67, 0, 41.44, 35.34);
        return {
          left: r.left - r.width * 0.0533,
          top: r.top,
          width: r.width * 1.1066,
          height: r.height * 1.1067,
        };
      })(),
    ],
    ['imgVector7', expand(rect(46.85, 19.83, 46.4, 54.31), 3.33, 3.33)],
    [
      'imgLine1',
      {
        left: 428 * 0.3626,
        top: 112 * 0.9483 - 2.56,
        width: 428 * (1 - 0.3626 - 0.3198),
        height: 2.56,
      },
    ],
  ] as const;
  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ width: '100%', height: 112 * scale }}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 112 * 0.3362 * scale,
          width: 428 * 0.4167 * scale,
          height: 112 * 0.6638 * scale,
          backgroundColor: '#147CC1',
          borderBottomLeftRadius: 25,
          borderTopRightRadius: 35,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: 0,
          top: 112 * 0.3534 * scale,
          width: 428 * 0.4167 * scale,
          height: 112 * 0.6466 * scale,
          backgroundColor: '#147CC1',
          borderBottomRightRadius: 25,
          borderTopLeftRadius: 35,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 428 * 0.045 * scale,
          top: 112 * 0.4397 * scale,
          width: 428 * 0.196 * scale,
          height: 112 * 0.4051 * scale,
          backgroundColor: '#147CC1',
          borderRadius: 25,
          borderBottomLeftRadius: 70,
        }}
      />
      {layers
        .filter(([key]) => Platform.OS === 'web' || key !== 'imgLine1')
        .map(([key, r]) => (
          <Artwork
            key={key}
            source={source[key]}
            width={r.width * scale}
            height={r.height * scale}
            fit="fill"
            style={{ position: 'absolute', left: r.left * scale, top: r.top * scale }}
          />
        ))}
      {(
        [
          ['Trang chủ', '/', 0.045, 0.196],
          ['Thu gom', '/collection', 0.25, 0.18],
          ['Đổi quà', '/rewards', 0.63, 0.18],
          ['Cá nhân', '/profile', 0.82, 0.18],
        ] as const
      ).map(([label, path, left, buttonWidth]) => (
        <Pressable
          key={label}
          accessibilityRole="tab"
          accessibilityLabel={label}
          accessibilityState={{ selected: label === 'Trang chủ' }}
          onPress={() => router.replace(path)}
          style={{
            position: 'absolute',
            left: width * left,
            top: 45 * scale,
            width: width * buttonWidth,
            height: 55 * scale,
          }}
        />
      ))}
      <Pressable
        accessibilityRole="tab"
        accessibilityLabel="Quét rác"
        onPress={() => router.push('/scan')}
        style={{
          position: 'absolute',
          left: width * 0.4,
          top: 0,
          width: width * 0.2,
          height: 83 * scale,
        }}
      />
    </View>
  );
}

/** Original curved navigation used by the older frames on backuped. */
export function LegacyNavigation({
  selected = 'profile',
  handbook = false,
  brand = '#147CC1',
  centerSource,
  gestureColor = '#000000',
  handbookAssets,
  frameAssets,
}: {
  selected?: 'home' | 'collection' | 'rewards' | 'profile' | 'scan' | null;
  handbook?: boolean;
  brand?: string;
  centerSource?: number;
  gestureColor?: string;
  handbookAssets?: Record<string, number>;
  frameAssets?: Record<string, number>;
}) {
  if (frameAssets) return <FrameNavigation source={frameAssets} />;
  const links: {
    name: typeof selected;
    title: string;
    path: Href;
    source: number;
    left: number;
    width: number;
  }[] = [
    { name: 'home', title: 'Trang chủ', path: '/', source: assets.imgVector, left: 36, width: 28 },
    {
      name: 'collection',
      title: 'Thu gom',
      path: '/collection',
      source: assets.imgGroup2,
      left: 118,
      width: 28,
    },
    {
      name: 'rewards',
      title: 'Đổi quà',
      path: '/rewards',
      source: assets.imgGroup1,
      left: 277,
      width: 28,
    },
    {
      name: 'profile',
      title: 'Cá nhân',
      path: '/profile',
      source: assets.imgGroup,
      left: 361,
      width: 28,
    },
  ];
  if (handbookAssets) {
    // The original guide component is 444 × 116, centered in its 428 px frame.
    // These are the individual SVG bounds, including their exported strokes.
    const layers = [
      ['imgRectangle87', 177, 49, 95, 67],
      ['imgVector', 381.4, 63.6, 11.2, 11.2],
      ['imgVector1', 373, 58, 28, 28],
      ['imgVector2', 289.49, 69.85, 27.0035, 16.9],
      ['imgVector3', 288.25, 57.25, 29.5, 28.8],
      ['imgVector4', 129.25, 64.12, 29.5002, 25.1742],
      ['imgVector5', 130.14, 57.25, 27.7512, 27.4645],
      ['imgVector6', 47.25, 57.25, 29.5, 29.5],
      ['imgEllipse9', 181, 0, 83, 83],
      ['imgVector7', 207, 22, 32, 32],
      ['imgLine1', 161, 107.44, 141, 2.56],
    ] as const;
    return (
      <View style={{ position: 'absolute', left: -8, bottom: 0, width: 444, height: 116 }}>
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 39,
            width: 185,
            height: 77,
            backgroundColor: brand,
            borderTopRightRadius: 35,
            borderBottomLeftRadius: 25,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: 259,
            top: 41,
            width: 185,
            height: 75,
            backgroundColor: brand,
            borderTopLeftRadius: 35,
            borderBottomRightRadius: 25,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: 20,
            top: 51,
            width: 87,
            height: 47,
            backgroundColor: brand,
            borderRadius: 25,
            borderBottomLeftRadius: 70,
          }}
        />
        {layers
          .filter(([key]) => Platform.OS === 'web' || key !== 'imgLine1')
          .map(([key, left, top, width, height]) => (
            <Artwork
              key={key}
              source={handbookAssets[key]}
              width={width}
              height={height}
              fit="fill"
              style={{ position: 'absolute', left, top }}
            />
          ))}
        {links.map((link, index) => (
          <Pressable
            key={link.name}
            accessibilityRole="tab"
            accessibilityLabel={link.title}
            accessibilityState={{ selected: selected === link.name }}
            aria-selected={selected === link.name}
            onPress={() => router.replace(link.path)}
            style={{
              position: 'absolute',
              left: [20, 102, 264, 348][index],
              top: 51,
              width: 83,
              height: 47,
            }}
          />
        ))}
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="Quét rác"
          accessibilityState={{ selected: selected === 'scan' }}
          aria-selected={selected === 'scan'}
          onPress={() => router.push('/scan')}
          style={{ position: 'absolute', left: 181, top: 0, width: 83, height: 83 }}
        />
      </View>
    );
  }
  return (
    <View
      style={{
        position: 'absolute',
        left: handbook ? 4 : 0,
        bottom: handbook ? -2 : 0,
        width: 428,
        height: 118,
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: -12,
          top: 39,
          width: 185,
          height: 77,
          backgroundColor: brand,
          borderTopRightRadius: 35,
          borderBottomLeftRadius: 25,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 247,
          top: 41,
          width: 185,
          height: 75,
          backgroundColor: brand,
          borderTopLeftRadius: 35,
          borderBottomRightRadius: 25,
        }}
      />
      <Artwork
        source={centerSource ?? assets.imgRectangle87}
        width={95}
        height={68}
        style={{ position: 'absolute', top: 49, left: 165 }}
      />
      {links.map((link) => (
        <Pressable
          key={link.name}
          accessibilityRole="tab"
          accessibilityLabel={link.title}
          accessibilityState={{ selected: selected === link.name }}
          aria-selected={selected === link.name}
          onPress={() => router.replace(link.path)}
          style={{
            position: 'absolute',
            top: 49,
            left: link.left - (selected === 'collection' && link.name === 'collection' ? 29 : 27),
            height: 47,
            width: selected === 'collection' && link.name === 'collection' ? 87 : 83,
            borderRadius: 25,
            borderTopRightRadius: selected === 'collection' && link.name === 'collection' ? 80 : 25,
            backgroundColor: selected === link.name ? '#075A9C' : 'transparent',
            alignItems: 'center',
            paddingTop: 9,
          }}
        >
          <Artwork
            source={link.source}
            width={link.width}
            height={link.name === 'collection' ? 31 : 28}
          />
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="tab"
        accessibilityLabel="Quét rác"
        accessibilityState={{ selected: selected === 'scan' }}
        aria-selected={selected === 'scan'}
        onPress={() => router.push('/scan')}
        style={{ position: 'absolute', top: 0, left: 169, width: 83, height: 83 }}
      >
        <Artwork source={assets.imgGroup36731} width={83} height={83} />
      </Pressable>
      <View
        style={{
          position: 'absolute',
          display: Platform.OS === 'web' ? 'flex' : 'none',
          bottom: handbook ? 8.56 : 7,
          left: 149,
          height: handbook ? 2.56 : 2,
          width: handbook ? 141 : 128,
          backgroundColor: gestureColor,
          borderRadius: 2,
        }}
      />
    </View>
  );
}
