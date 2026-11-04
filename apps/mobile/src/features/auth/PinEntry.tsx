import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Label, Notice } from '../../design-system/ui';
import { useApp } from '../../providers';
import { AccountButton } from '../onboarding/OnboardingParts';
export function PinEntry({
  value,
  onChange,
  onSubmit,
  title,
  description,
  error,
  busy,
  blockedUntil = 0,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  title: string;
  description?: string;
  error?: string;
  busy?: boolean;
  blockedUntil?: number;
}) {
  const { colors } = useApp(),
    [now, setNow] = useState(Date.now),
    [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!blockedUntil) return;
    const started = Date.now();
    setNow(started);
    if (blockedUntil <= started) return;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= blockedUntil) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [blockedUntil]);
  const waiting = Math.max(0, Math.ceil((blockedUntil - now) / 1000)),
    disabled = busy || waiting > 0;
  return (
    <View style={{ gap: 12 }}>
      <Label size={13} color={colors.muted} style={{ lineHeight: 18 }}>
        {description ?? 'Thêm một lớp bảo vệ khi mở ứng dụng.'}
      </Label>
      <View
        style={{
          alignSelf: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 24,
          marginTop: 22,
          borderRadius: 12,
          backgroundColor: focused ? colors.soft : 'transparent',
        }}
      >
        {Array.from({ length: 6 }, (_, i) => (
          <View
            key={i}
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: i < value.length ? colors.brand : colors.surface,
            }}
          />
        ))}
        <TextInput
          accessibilityLabel="Mã PIN 6 chữ số"
          secureTextEntry
          value={value}
          editable={!disabled}
          maxLength={6}
          keyboardType="number-pad"
          autoComplete="off"
          caretHidden
          onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, 6))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={() => {
            if (value.length === 6 && !disabled) onSubmit();
          }}
          style={{ position: 'absolute', inset: 0, opacity: 0.01, color: 'transparent' }}
        />
      </View>
      <View style={{ gap: 12, marginTop: 38, width: '100%', maxWidth: 320, alignSelf: 'center' }}>
        {[
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9],
          [null, 0, '⌫'],
        ].map((row, index) => (
          <View key={index} style={{ flexDirection: 'row', gap: 22 }}>
            {row.map((digit, column) =>
              digit === null ? (
                <View key={column} style={{ flex: 1 }} />
              ) : (
                <Pressable
                  key={column}
                  accessibilityRole="button"
                  accessibilityLabel={digit === '⌫' ? 'Xóa chữ số PIN' : `Phím ${digit}`}
                  disabled={disabled}
                  onPress={() =>
                    onChange(digit === '⌫' ? value.slice(0, -1) : (value + digit).slice(0, 6))
                  }
                  style={({ pressed }) => ({
                    flex: 1,
                    height: 60,
                    borderRadius: 18,
                    backgroundColor: colors.background,
                    opacity: disabled ? 0.45 : pressed ? 0.65 : 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                  })}
                >
                  <Label size={25} weight="medium">
                    {digit}
                  </Label>
                </Pressable>
              ),
            )}
          </View>
        ))}
      </View>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {waiting > 0 ? (
        <Label size={12} color={colors.muted}>
          Có thể thử lại sau {waiting} giây.
        </Label>
      ) : null}
      <View style={{ marginTop: 36 }}>
        <AccountButton
          title={title}
          pending={busy}
          disabled={value.length !== 6 || disabled}
          onPress={onSubmit}
        />
      </View>
    </View>
  );
}
