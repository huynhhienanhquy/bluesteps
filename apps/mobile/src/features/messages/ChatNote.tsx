import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Artwork } from '../../design-system/DesignScreen';
import { Button, Field, Label, Notice, Row } from '../../design-system/ui';
import { useApp } from '../../providers';
import { errorMessage } from '../../services/api';
import { ComposerSheet } from '../community/ComposerSheet';
import { useLocalProfile } from '../profile/LocalProfileProvider';
import { UserAvatar } from '../profile/UserAvatar';

type Draft = { text: string; revision: number; previous: string };

export function ChatNote() {
  const { colors, dark, user } = useApp();
  const local = useLocalProfile();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const working = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  if (!user || !local.profile) return null;
  const profile = local.profile;
  const stale = !!draft && draft.revision !== profile.revision;
  const available = local.ready && !local.error;
  const open = () => {
    setError('');
    setDraft({ text: profile.chatNote, previous: profile.chatNote, revision: profile.revision });
  };
  const close = () => {
    if (!working.current) setDraft(null);
  };
  async function save(value: string) {
    if (!draft || working.current || !available || stale) return;
    working.current = true;
    setSaving(true);
    setError('');
    try {
      await local.saveChatNote(value, draft.revision);
      if (alive.current) setDraft(null);
    } catch (cause) {
      if (alive.current) {
        setError(errorMessage(cause));
        local.reload();
      }
    } finally {
      working.current = false;
      if (alive.current) setSaving(false);
    }
  }
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          profile.chatNote
            ? `Sửa ghi chú của bạn: ${profile.chatNote}`
            : 'Thêm ghi chú tâm trạng của bạn'
        }
        onPress={open}
        style={{ width: 110, height: 136, alignItems: 'center' }}
      >
        <View style={{ position: 'absolute', top: 31, left: 12 }}>
          <UserAvatar userId={user.id} name={profile.displayName} size={80} />
        </View>
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 5,
            width: 99,
            height: 50,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 20,
            backgroundColor: colors.surface,
            justifyContent: 'center',
            paddingHorizontal: 8,
            paddingVertical: 8,
            boxShadow: '0px 4px 4px rgba(0,0,0,0.25)',
          }}
        >
          <Label size={12} numberOfLines={2} style={{ textAlign: 'center', lineHeight: 14 }}>
            {profile.chatNote || 'Tâm trạng\nngày hôm nay?'}
          </Label>
        </View>
        {!dark ? (
          <>
            <View style={{ position: 'absolute', left: 25, top: 47 }}>
              <Artwork
                source={require('../../../assets/icons/chat/notes/ellipse29.svg')}
                width={11}
                height={6}
              />
            </View>
            <View style={{ position: 'absolute', left: 34, top: 53 }}>
              <Artwork
                source={require('../../../assets/icons/chat/notes/ellipse30.svg')}
                width={3}
                height={3}
              />
            </View>
          </>
        ) : null}
        <Label
          size={10}
          color={colors.muted}
          style={{ position: 'absolute', top: 115, textAlign: 'center' }}
        >
          Ghi chú của bạn
        </Label>
      </Pressable>
      <ComposerSheet title="Ghi chú của bạn" visible={!!draft} close={close}>
        <Label size={13} color={colors.muted}>
          Ghi chú được lưu trên thiết bị này và chỉ bạn nhìn thấy.
        </Label>
        {!local.ready ? <Notice>Đang mở ghi chú…</Notice> : null}
        {local.error ? <Notice tone="error">{local.error}</Notice> : null}
        {draft ? (
          <>
            <Field
              label="Tâm trạng ngày hôm nay?"
              value={draft.text}
              onChangeText={(text) => {
                setDraft((value) => (value ? { ...value, text } : value));
                setError('');
              }}
              maxLength={60}
              multiline
              editable={!saving && available && !stale}
            />
            <Label size={11} color={colors.muted}>
              {draft.text.length}/60 ký tự
            </Label>
            <Row style={{ flexWrap: 'wrap' }}>
              {['😊 Rất là vui', '🌱 Sống xanh mỗi ngày', '💚 Hôm nay phân loại rác'].map(
                (text) => (
                  <Button
                    key={text}
                    title={text}
                    variant="quiet"
                    disabled={saving || !available || stale}
                    onPress={() => {
                      setDraft((value) => (value ? { ...value, text } : value));
                      setError('');
                    }}
                  />
                ),
              )}
            </Row>
            {stale ? (
              <Notice>
                Hồ sơ trên thiết bị đã thay đổi. Đóng rồi mở lại ghi chú để dùng bản mới nhất; bản
                đang sửa chưa được lưu.
              </Notice>
            ) : null}
            {error ? <Notice tone="error">{error}</Notice> : null}
            {local.error ? (
              <Button
                title="Tải lại ghi chú"
                variant="quiet"
                disabled={saving}
                onPress={local.reload}
              />
            ) : null}
            <Button
              title="Lưu ghi chú"
              pending={saving}
              disabled={!available || stale || draft.text.trim() === draft.previous}
              onPress={() => void save(draft.text)}
            />
            {draft.previous ? (
              <Button
                title="Xóa ghi chú"
                variant="quiet"
                disabled={saving || !available || stale}
                onPress={() => void save('')}
              />
            ) : null}
          </>
        ) : null}
      </ComposerSheet>
    </>
  );
}
