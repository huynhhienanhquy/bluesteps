import type { ComponentProps } from 'react';
import { Tabs } from 'expo-router';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/providers';
import { Label } from '../../src/design-system/ui';
import { Artwork } from '../../src/design-system/DesignScreen';
import { homeAssets } from '../../src/design-system/figma-assets';

const items = [
  { name: 'index', title: 'Trang chủ', source: homeAssets.imgIconHome },
  { name: 'collection', title: 'Thu gom', source: homeAssets.imgIconMap1 },
  { name: 'scan', title: 'Quét rác', source: homeAssets.imgIconScan },
  { name: 'rewards', title: 'Đổi quà', source: homeAssets.imgIconGift1 },
  { name: 'profile', title: 'Cá nhân', source: homeAssets.imgIconUser },
];
const DesignTabBar: NonNullable<ComponentProps<typeof Tabs>['tabBar']> = ({
  state,
  emitter,
  navigateToTab,
}) => {
  const { colors } = useApp();
  const insets = useSafeAreaInsets();
  if (['scan', 'collection'].includes(state.routes[state.index]?.name ?? '')) return null;
  return (
    <View
      style={{
        height: 73 + Math.max(31, insets.bottom),
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingHorizontal: 24,
        paddingTop: 9,
      }}
    >
      <View style={{ flexDirection: 'row' }}>
        {items.map((item) => {
          const index = state.routes.findIndex((route) => route.name === item.name);
          const route = state.routes[index];
          if (!route) return null;
          const focused = state.index === index;
          return (
            <Pressable
              key={item.name}
              accessibilityRole="tab"
              accessibilityLabel={item.title}
              accessibilityState={{ selected: focused }}
              aria-selected={focused}
              onPress={() => {
                const event = emitter.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) navigateToTab(route.key);
              }}
              style={{ flex: 1, height: 64, alignItems: 'center' }}
            >
              {focused && item.name !== 'scan' ? (
                <View
                  style={{
                    position: 'absolute',
                    top: 2,
                    width: 46,
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: colors.brand,
                  }}
                />
              ) : null}
              {item.name === 'scan' ? (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    width: 52,
                    height: 44,
                    borderRadius: 16,
                    backgroundColor: colors.brand,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Artwork source={item.source} width={26} />
                </View>
              ) : (
                <Artwork source={item.source} width={25} style={{ marginTop: 9 }} />
              )}
              <Label
                size={9}
                weight="semibold"
                color={focused ? colors.brand : colors.muted}
                style={{ position: 'absolute', top: 48, lineHeight: 13 }}
              >
                {item.title}
              </Label>
            </Pressable>
          );
        })}
      </View>
      {Platform.OS === 'web' ? (
        <View
          style={{
            position: 'absolute',
            bottom: 16,
            height: 5,
            width: 128,
            borderRadius: 3,
            backgroundColor: colors.text,
            alignSelf: 'center',
          }}
        />
      ) : null}
    </View>
  );
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}
      tabBar={(props) => <DesignTabBar {...props} />}
    >
      {items.map((item) => (
        <Tabs.Screen key={item.name} name={item.name} options={{ title: item.title }} />
      ))}
    </Tabs>
  );
}
