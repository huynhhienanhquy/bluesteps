import type { PropsWithChildren } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { Artwork } from '../../design-system/DesignScreen';
import { eventDesignAssets } from '../../design-system/event-design-assets';
import { collectionColors as c } from '../collection/CollectionPage';
import { EventText as T } from './EventFormParts';

const a = eventDesignAssets['534:49968'];

export function EventPanel({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  return (
    <View
      style={[
        { borderWidth: 1, borderColor: c.border, borderRadius: 20, padding: 16, gap: 10 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function EventSwitch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      aria-checked={value}
      hitSlop={8}
      onPress={() => onChange(!value)}
    >
      <Artwork source={value ? a.imgCongTc : a.imgCongTc1} width={46} height={28} />
    </Pressable>
  );
}

export function EventSavedCheck({
  label,
  subtitle,
  selected,
  onPress,
}: {
  label: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: subtitle ? 39 : 28 }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 1.5,
          borderColor: selected ? c.brand : c.border,
          backgroundColor: selected ? c.brand : '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? <Artwork source={a.imgCheck} width={15} /> : null}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <T>{label}</T>
        {subtitle ? (
          <T size={12} color={c.muted}>
            {subtitle}
          </T>
        ) : null}
      </View>
    </Pressable>
  );
}

export function EventSavedPill({
  label,
  selected,
  onPress,
  checkSource = a.imgCheck1,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  checkSource?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: selected ? c.brand : c.border,
        borderRadius: 24,
        backgroundColor: selected ? c.soft : '#FFFFFF',
      }}
    >
      {selected ? <Artwork source={checkSource} width={14} /> : null}
      <T weight="medium" color={selected ? c.brand : c.muted}>
        {label}
      </T>
    </Pressable>
  );
}
