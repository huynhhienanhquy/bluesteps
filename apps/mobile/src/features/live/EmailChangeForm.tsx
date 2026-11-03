import { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { PrivateModal } from './PrivateModal';
import { Button, Field, Label, Notice, Typography } from '../../design-system/ui';
import { useApp } from '../../providers';
import { errorMessage } from '../../services/api';
import { useLocalProfile, type LocalProfile } from './LocalProfileProvider';
export function EmailChangeForm({
  profile,
  onClose,
  onSaved,
}: {
  profile: LocalProfile;
  onClose: () => void;
  onSaved: (profile: LocalProfile) => void;
}) {
  const { user, colors } = useApp(),
    local = useLocalProfile();
  const [email, setEmail] = useState(profile.email),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const working = useRef(false);
  const revision = useRef(profile.revision);
  const stale = revision.current !== local.profile?.revision;
  const normalizedEmail = email.trim();
  const canSave = !stale && normalizedEmail !== profile.email && /^\S+@\S+\.\S+$/.test(normalizedEmail);
  async function save() {
    if (working.current || !canSave) return;
    working.current = true;
    setBusy(true);
    setError('');
    try {
      const next = await local.save({ email: normalizedEmail }, revision.current);
      onSaved(next);
      onClose();
    } catch (cause) {
      setError(errorMessage(cause));
      local.reload();
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  return (
    <PrivateModal
      visible
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!working.current) onClose();
      }}
    >
      <Typography.Provider value="inter">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(22,69,97,.35)',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: '90%', borderRadius: 24, backgroundColor: colors.surface }}
            contentContainerStyle={{ padding: 24, gap: 16 }}
          >
            <Label heading bold size={22}>
              Đổi email hiển thị
            </Label>
            <Field
              label="Email hiển thị"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setError('');
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!busy}
              maxLength={254}
            />
            <Label size={13}>
              Thông tin này chỉ lưu trên thiết bị. Email đăng nhập vẫn là {user?.email}.
            </Label>
            {stale ? (
              <Notice tone="warning">Hồ sơ đã thay đổi. Hãy đóng và mở lại mục đổi email.</Notice>
            ) : error ? (
              <Notice tone="error">{error}</Notice>
            ) : null}
            <Button
              title="Lưu email hiển thị"
              pending={busy}
              disabled={!canSave}
              onPress={() => void save()}
            />
            <Button title="Hủy" variant="quiet" disabled={busy} onPress={onClose} />
          </ScrollView>
        </View>
      </Typography.Provider>
    </PrivateModal>
  );
}
