import { useState } from 'react';
import { Image, View } from 'react-native';
import { useApp } from '../../providers';
import { Label } from '../../design-system/ui';
import { useOptionalLocalProfile } from './LocalProfileProvider';
export function UserAvatar({
  userId,
  name,
  size = 56,
  foreground,
}: {
  userId?: string;
  name: string;
  size?: number;
  foreground?: string;
}) {
  const { colors } = useApp(),
    local = useOptionalLocalProfile()?.profile;
  const own = local?.id === userId,
    uri = own ? local?.avatarUri : null,
    display = own ? (local?.displayName ?? name) : name;
  const [failed, setFailed] = useState('');
  const initials =
    display
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toLocaleUpperCase() || '?';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        backgroundColor: colors.soft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {uri && failed !== uri ? (
        <Image
          accessibilityLabel={`Ảnh đại diện ${display}`}
          source={{ uri }}
          resizeMode="cover"
          style={{ width: size, height: size }}
          onError={() => setFailed(uri)}
        />
      ) : (
        <Label size={Math.round(size * 0.35)} bold color={foreground ?? colors.primary}>
          {initials}
        </Label>
      )}
    </View>
  );
}
