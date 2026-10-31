import { useRef, useState, type ReactNode, type ComponentRef } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DesignFrameLayers,
  type FrameData,
  type DesignLayer,
  type ImageReplacement,
} from './DesignFrameLayers';

export function DesignFrameAction({
  label,
  box,
  onPress,
  role = 'button',
  selected,
  checked,
  disabled,
}: {
  label: string;
  box: readonly number[];
  onPress: () => void;
  role?: 'button' | 'tab' | 'radio' | 'switch';
  selected?: boolean;
  checked?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={{ selected, checked, disabled }}
      aria-checked={checked}
      aria-selected={selected}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        position: 'absolute',
        left: box[0],
        top: box[1],
        width: box[2],
        height: box[3],
        borderRadius: 10,
        backgroundColor: pressed ? 'rgba(20,124,193,.12)' : 'transparent',
      })}
    />
  );
}
export function DesignFrameCanvas({
  frame,
  data,
  assets,
  children,
  contentHeight,
  replaceText,
  hide,
  selectedTab = 'Cá nhân',
  fixed = false,
  replaceImage,
  dock,
  scrollToEnd = false,
  backdrop,
  nativeStatusHeight = 54,
  header,
}: {
  frame: string;
  data: FrameData & { navigationTop?: number | null };
  assets: Record<string, number>;
  children?: ReactNode;
  contentHeight?: number;
  replaceText?: (l: DesignLayer) => string | undefined;
  hide?: (l: DesignLayer) => boolean;
  selectedTab?: string;
  fixed?: boolean;
  replaceImage?: (layer: DesignLayer) => ImageReplacement | undefined;
  dock?: { top: number; nativeHeight?: number; children: ReactNode };
  scrollToEnd?: boolean;
  backdrop?: string;
  nativeStatusHeight?: number;
  header?: { height: number; children: ReactNode };
}) {
  const [width, setWidth] = useState(data.width),
    s = width / data.width,
    insets = useSafeAreaInsets();
  const status = Platform.OS === 'web' ? 0 : nativeStatusHeight,
    navTop = data.navigationTop ?? null;
  const layers = data.layers.filter((l) => !hide?.(l));
  const wallpaper = layers.filter((l) => l.wallpaper);
  const background = backdrop ?? data.layers[0]?.color ?? '#147CC1';
  const height = Math.max(data.height, contentHeight ?? data.height);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const dockHeight = dock
    ? Platform.OS !== 'web' && dock.nativeHeight
      ? dock.nativeHeight
      : data.height - dock.top
    : 0;
  return (
    <View
      testID={`design-frame-${frame}`}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        flex: 1,
        backgroundColor: background,
        paddingTop: Platform.OS === 'web' ? 0 : insets.top,
      }}
    >
      {wallpaper.length ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: Platform.OS === 'web' ? 0 : insets.top,
            width: data.width,
            height: data.height,
            transformOrigin: 'top left',
            transform: [{ scale: s }],
          }}
        >
          <DesignFrameLayers frame={frame} layers={wallpaper} offsetY={status} assets={assets} />
        </View>
      ) : null}
      <ScrollView
        ref={scroll}
        key={frame}
        scrollEnabled={!fixed}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ minHeight: '100%' }}
        onContentSizeChange={() => {
          if (scrollToEnd) scroll.current?.scrollToEnd({ animated: false });
        }}
      >
        <View
          style={{
            width,
            height: (height - status) * s,
            overflow: 'hidden',
            backgroundColor: wallpaper.length ? 'transparent' : (backdrop ?? '#FFFFFF'),
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: -status * s,
              width: data.width,
              height,
              transformOrigin: 'top left',
              transform: [{ scale: s }],
            }}
          >
            <DesignFrameLayers
              frame={frame}
              layers={layers.filter(
                (l) =>
                  !l.wallpaper &&
                  (fixed || !l.navigation) &&
                  (!dock || l.y < dock.top) &&
                  (!header || l.y >= header.height),
              )}
              assets={assets}
              replaceText={replaceText}
              replaceImage={replaceImage}
            />
            {children}
          </View>
        </View>
      </ScrollView>
      {header ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: Platform.OS === 'web' ? 0 : insets.top,
            height: (header.height - status) * s,
            width,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: data.width,
              height: header.height,
              top: -status * s,
              transformOrigin: 'top left',
              transform: [{ scale: s }],
            }}
          >
            <DesignFrameLayers
              frame={frame}
              layers={layers.filter((l) => !l.wallpaper && l.y < header.height)}
              assets={assets}
              replaceText={replaceText}
              replaceImage={replaceImage}
            />
            {header.children}
          </View>
        </View>
      ) : null}
      {dock ? (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: dockHeight * s + insets.bottom,
            backgroundColor: wallpaper.length ? 'transparent' : '#FFFFFF',
          }}
        >
          <View
            style={{
              width: data.width,
              height: dockHeight,
              overflow: 'hidden',
              transformOrigin: 'top left',
              transform: [{ scale: s }],
            }}
          >
            <DesignFrameLayers
              frame={frame}
              layers={layers.filter((l) => l.y >= dock.top)}
              assets={assets}
              offsetY={dock.top}
              replaceText={replaceText}
              replaceImage={replaceImage}
            />
            {dock.children}
          </View>
        </View>
      ) : null}
      {navTop !== null && !fixed ? (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: (data.height - navTop) * s + insets.bottom,
          }}
        >
          <View
            pointerEvents="box-none"
            style={{
              width: data.width,
              height: data.height - navTop,
              transformOrigin: 'top left',
              transform: [{ scale: s }],
            }}
          >
            <DesignFrameLayers
              frame={frame}
              layers={layers.filter((l) => l.navigation)}
              assets={assets}
              offsetY={navTop}
            />
            {(
              [
                ['Trang chủ', '/', 24, 56, 60, 50],
                ['Thu gom', '/collection', 105, 56, 60, 50],
                ['Đổi quà', '/rewards', 264, 50, 64, 56],
                ['Cá nhân', '/profile', 350, 56, 60, 50],
                ['Quét rác', '/scan', 174, 0, 77, 78],
              ] as const
            ).map(([label, path, x, y, w, h]) => (
              <DesignFrameAction
                key={label}
                label={label}
                role="tab"
                selected={selectedTab === label}
                box={[x, y, w, h]}
                onPress={() => router.replace(path as Href)}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
