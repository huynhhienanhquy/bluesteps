import {
  forwardRef,
  useState,
  type ComponentProps,
  type ComponentRef,
  type PropsWithChildren,
} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useApp } from '../providers';

export type IconName = ComponentProps<typeof Ionicons>['name'];
export function Icon({ name, size = 24, color }: { name: string; size?: number; color?: string }) {
  const { colors } = useApp();
  return (
    <Ionicons
      name={name as IconName}
      size={size}
      color={color ?? colors.primary}
      accessible={false}
      aria-hidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
export function Label({
  children,
  size = 15,
  bold = false,
  color,
  style,
  heading = false,
  weight,
}: PropsWithChildren<{
  size?: number;
  bold?: boolean;
  color?: ComponentProps<typeof Ionicons>['color'];
  style?: ComponentProps<typeof Text>['style'];
  heading?: boolean;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
}>) {
  const { colors } = useApp();
  return (
    <Text
      accessibilityRole={heading ? 'header' : undefined}
      style={[
        {
          color: color ?? colors.text,
          fontSize: size,
          lineHeight: size * 1.5,
          fontWeight: '400',
          fontFamily: `Montserrat_${({ regular: '400Regular', medium: '500Medium', semibold: '600SemiBold', bold: '700Bold' } as const)[weight ?? (bold ? 'bold' : 'regular')]}`,
          includeFontPadding: false,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Row({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[styles.row, style]}>{children}</View>;
}
export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  const { colors } = useApp();
  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}
    >
      {children}
    </View>
  );
}
export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  pending = false,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  icon?: string;
  disabled?: boolean;
  pending?: boolean;
  accessibilityLabel?: string;
}) {
  const { colors } = useApp();
  const foreground =
    variant === 'primary'
      ? colors.heroText
      : variant === 'danger'
        ? colors.danger
        : colors.primaryDark;
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: disabled || pending, busy: pending }}
      disabled={disabled || pending}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.button,
        {
          borderWidth: 2,
          borderColor: focused ? colors.text : 'transparent',
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
          backgroundColor:
            variant === 'primary'
              ? colors.primary
              : variant === 'danger'
                ? colors.dangerSoft
                : variant === 'secondary'
                  ? colors.soft
                  : 'transparent',
        },
      ]}
    >
      {pending ? (
        <ActivityIndicator color={foreground} />
      ) : icon ? (
        <Icon name={icon} size={19} color={foreground} />
      ) : null}
      <Label bold color={foreground} style={{ flexShrink: 1 }}>
        {title}
      </Label>
    </Pressable>
  );
}
export function IconButton({
  name,
  label,
  onPress,
  selected,
}: {
  name: string;
  label: string;
  onPress: () => void;
  selected?: boolean;
}) {
  const { colors } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={onPress}
      style={({ pressed }) => ({
        minWidth: 48,
        minHeight: 48,
        borderRadius: 16,
        backgroundColor: pressed ? colors.soft : colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
      })}
    >
      <Icon name={name} />
    </Pressable>
  );
}
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <Label size={13} bold color={selected ? colors.heroText : colors.text}>
        {label}
      </Label>
    </Pressable>
  );
}
export function Notice({
  children,
  tone = 'info',
}: PropsWithChildren<{ tone?: 'info' | 'warning' | 'error' | 'success' }>) {
  const { colors } = useApp();
  const color =
    tone === 'error'
      ? colors.danger
      : tone === 'warning'
        ? colors.warning
        : tone === 'success'
          ? colors.success
          : colors.muted;
  const bg =
    tone === 'error'
      ? colors.dangerSoft
      : tone === 'warning'
        ? colors.warningSoft
        : tone === 'success'
          ? colors.successSoft
          : colors.soft;
  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      style={{ padding: 14, borderRadius: 14, backgroundColor: bg }}
    >
      <Label size={13} color={color}>
        {children}
      </Label>
    </View>
  );
}
export const Field = forwardRef<
  ComponentRef<typeof TextInput>,
  TextInputProps & { label: string; error?: string }
>(function Field({ label, error, ...props }, ref) {
  const { colors } = useApp();
  return (
    <View style={{ gap: 6 }}>
      <Label size={13} bold>
        {label}
      </Label>
      <TextInput
        ref={ref}
        {...props}
        accessibilityLabel={label}
        aria-invalid={!!error}
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
          },
          props.style,
        ]}
      />
      {error ? (
        <Label size={13} color={colors.danger}>
          {error}
        </Label>
      ) : null}
    </View>
  );
});
export function Search({
  value,
  onChangeText,
  placeholder = 'Tìm kiếm',
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) {
  const { colors } = useApp();
  return (
    <Row
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 14,
      }}
    >
      <Icon name="search-outline" size={20} />
      <TextInput
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={onChangeText}
        style={{ flex: 1, minHeight: 50, fontSize: 15, color: colors.text, padding: 10 }}
      />
      {value ? (
        <IconButton name="close-outline" label="Xóa tìm kiếm" onPress={() => onChangeText('')} />
      ) : null}
    </Row>
  );
}
export function Section({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <Row style={{ justifyContent: 'space-between', gap: 8 }}>
      <Label size={20} bold heading style={{ flex: 1 }}>
        {title}
      </Label>
      {action && onPress ? <Button title={action} variant="quiet" onPress={onPress} /> : null}
    </Row>
  );
}
export function Empty({
  title = 'Chưa có nội dung',
  detail = 'Thử thay đổi tìm kiếm hoặc bộ lọc.',
  action,
  onPress,
}: {
  title?: string;
  detail?: string;
  action?: string;
  onPress?: () => void;
}) {
  const { colors } = useApp();
  return (
    <Card style={{ alignItems: 'center', paddingVertical: 30 }}>
      <Icon name="leaf-outline" size={42} />
      <Label size={18} bold>
        {title}
      </Label>
      <Label color={colors.muted} style={{ textAlign: 'center' }}>
        {detail}
      </Label>
      {action && onPress ? <Button title={action} onPress={onPress} variant="secondary" /> : null}
    </Card>
  );
}
export function Loading() {
  return (
    <View style={{ padding: 40, gap: 12 }}>
      <ActivityIndicator accessibilityLabel="Đang tải" />
      <Label style={{ textAlign: 'center' }}>Đang tải dữ liệu…</Label>
    </View>
  );
}
export function Screen({
  children,
  title,
  subtitle,
  back = false,
  action,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  back?: boolean;
  action?: React.ReactNode;
}>) {
  const { colors } = useApp();
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.screen}>
          <Row style={{ alignItems: 'center', paddingBottom: 8 }}>
            {back ? (
              <IconButton
                name="chevron-back"
                label="Quay lại"
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              />
            ) : null}
            <View style={{ flex: 1 }}>
              <Label size={24} bold heading>
                {title}
              </Label>
              {subtitle ? (
                <Label size={13} color={colors.muted}>
                  {subtitle}
                </Label>
              ) : null}
            </View>
            {action}
          </Row>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function MenuItem({
  title,
  detail,
  icon,
  onPress,
}: {
  title: string;
  detail?: string;
  icon: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
    >
      <Card>
        <Row>
          <Icon name={icon} />
          <View style={{ flex: 1 }}>
            <Label bold>{title}</Label>
            {detail ? <Label size={13}>{detail}</Label> : null}
          </View>
          <Icon name="chevron-forward" size={18} />
        </Row>
      </Card>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  screen: {
    width: '100%',
    maxWidth: 428,
    alignSelf: 'center',
    padding: 24,
    paddingBottom: 40,
    gap: 20,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  card: { padding: 18, borderRadius: 22, borderWidth: 1, gap: 12 },
  button: {
    minHeight: 48,
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chip: {
    minHeight: 44,
    borderRadius: 99,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    justifyContent: 'center',
  },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 16 },
});
