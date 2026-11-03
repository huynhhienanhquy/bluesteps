import { ActivityIndicator, Pressable } from 'react-native';
import { Label } from '../../design-system/ui';
import { useApp } from '../../providers';

export function AccountButton({
  title,
  onPress,
  pending = false,
  disabled = false,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  pending?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const { colors } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: pending || disabled, busy: pending }}
      disabled={pending || disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 56,
        borderRadius: 18,
        backgroundColor: colors.brand,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
      })}
    >
      {pending ? (
        <ActivityIndicator color={colors.heroText} />
      ) : (
        <Label size={15} weight="semibold" color={colors.heroText} style={{ lineHeight: 22 }}>
          {title}
        </Label>
      )}
    </Pressable>
  );
}
