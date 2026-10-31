import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { Artwork } from '../../design-system/DesignScreen';
import { eventDesignAssets } from '../../design-system/event-design-assets';
import type { Href } from 'expo-router';
import {
  CollectionAction,
  CollectionPage,
  CollectionSheet,
  CollectionText,
  collectionColors as c,
} from '../collection/CollectionPage';

export {
  CollectionAction as EventAction,
  CollectionSheet as EventSheet,
  CollectionText as EventText,
};

export function EventFormPage({
  title,
  children,
  footer,
  frame = '534:49326',
  brandHeader = false,
  backTo = '/events',
  bottom,
}: PropsWithChildren<{
  title: string;
  footer: ReactNode;
  frame?: keyof typeof eventDesignAssets;
  brandHeader?: boolean;
  backTo?: Href;
  bottom?: ReactNode;
}>) {
  return (
    <CollectionPage
      title={title}
      source={eventDesignAssets[frame]}
      backTo={backTo}
      backSource={require('../../../assets/figma/534-49326/imgBack.svg')}
      backSize={{ width: 8.5, height: 14.5 }}
      footer={footer}
      titleColor={brandHeader ? c.brand : c.ink}
      homeBarColor={brandHeader ? c.brand : c.ink}
      bottom={bottom}
    >
      {children}
    </CollectionPage>
  );
}

export function EventField({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ gap: 8 }}>
      <CollectionText weight="medium">{label}</CollectionText>
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        aria-invalid={Boolean(error)}
        placeholderTextColor={c.muted}
        style={[
          {
            minHeight: 48,
            padding: 13,
            backgroundColor: '#F5F9FC',
            borderColor: error ? '#B3303F' : c.border,
            borderWidth: 1,
            borderRadius: 12,
            fontFamily: 'BackupInter_400Regular',
            fontSize: 14,
            lineHeight: 20,
            color: c.ink,
            includeFontPadding: false,
          },
          props.style,
        ]}
      />
      {error ? (
        <CollectionText accessibilityRole="alert" size={12} color="#B3303F">
          {error}
        </CollectionText>
      ) : null}
    </View>
  );
}

export function EventCheck({
  label,
  accessibilityLabel = label,
  selected,
  onPress,
}: {
  label: string;
  accessibilityLabel?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      hitSlop={2}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40 }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 1.5,
          borderColor: c.brand,
          backgroundColor: selected ? c.brand : '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? <Artwork source={eventDesignAssets['534:49326'].imgCheck} width={15} /> : null}
      </View>
      <CollectionText style={{ flex: 1 }}>{label}</CollectionText>
    </Pressable>
  );
}

export function EventRoleOption({
  value,
  selected,
  onPress,
}: {
  value: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={value}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      style={{
        minHeight: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: selected ? c.brand : c.border,
        backgroundColor: selected ? c.mint : '#FFFFFF',
        padding: 14,
      }}
    >
      <CollectionText color={selected ? c.brand : c.ink}>{value}</CollectionText>
    </Pressable>
  );
}

export function EventOutlineAction({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={{
        minHeight: 50,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: c.brand,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0px 4px 4px rgba(0,0,0,0.25), 0px 5px 2px rgba(89,183,96,0.25)',
      }}
    >
      <CollectionText
        size={15}
        lineHeight={21.4286}
        weight="semibold"
        color={c.brand}
        style={{
          maxWidth: '90%',
          textAlign: 'center',
          transform: [{ translateX: 2.26 }, { translateY: -1.4286 }],
        }}
      >
        {title}
      </CollectionText>
    </Pressable>
  );
}

export function EventTextAction({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      hitSlop={12}
      style={{ minHeight: 20, alignItems: 'center', justifyContent: 'center' }}
    >
      <CollectionText weight="semibold" color={c.brand}>
        {title}
      </CollectionText>
    </Pressable>
  );
}
