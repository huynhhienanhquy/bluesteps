import { useRef, useState } from 'react';
import { Platform, Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { router } from 'expo-router';
import { Artwork, DesignLink, DesignScreen } from '../../design-system/DesignScreen';
import { profileArtwork } from '../../design-system/catalog-artwork';
import { Label, Notice } from '../../design-system/ui';
import { useApp } from '../../providers';
import { errorMessage } from '../../services/api';
import { useDraft } from '../../services/queries';
import { RequireAuth } from '../shared/common';
import { useLocalProfile } from './LocalProfileProvider';
import { AvatarEditor } from './AvatarEditor';
import { EmailChangeForm } from './EmailChangeForm';

export function EditProfileScreen() {
  const { colors, user } = useApp();
  return (
    <DesignScreen
      family="inter"
      background={colors.surface}
      headerStyle={{ minHeight: 64, paddingTop: 3, paddingBottom: 13 }}
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}
            style={{ width: 44, height: 48, justifyContent: 'center' }}
          >
            <Artwork source={profileArtwork.back} width={24} />
          </Pressable>
          <Label
            family="inter"
            size={32}
            bold
            heading
            style={{ flex: 1, textAlign: 'center', lineHeight: 39 }}
          >
            Chỉnh sửa
          </Label>
          <View style={{ width: 44 }} />
        </View>
      }
      contentStyle={{ paddingTop: 0, paddingHorizontal: 24, gap: 0 }}
    >
      <RequireAuth>
        <EditProfileForm key={user?.id} />
      </RequireAuth>
    </DesignScreen>
  );
}

function EditProfileForm() {
  const { colors } = useApp();
  const local = useLocalProfile();
  const draft = useDraft(local.profile ?? undefined, local.profile?.id);
  const [pending, setPending] = useState(false);
  const saving = useRef(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [bioOpen, setBioOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const value = draft.value;
  const stale = value?.revision !== local.profile?.revision;
  const saveDisabled = pending || avatarBusy || stale || !value?.displayName.trim();
  if (!local.ready) return <Notice>Đang mở hồ sơ…</Notice>;
  if (local.error)
    return (
      <View style={{ gap: 12 }}>
        <Notice tone="error">{local.error}</Notice>
        <DesignLink
          onPress={() => {
            void local
              .reset()
              .then(draft.reset)
              .catch((cause) => setError(errorMessage(cause)));
          }}
        >
          Khôi phục hồ sơ ban đầu
        </DesignLink>
        {error ? <Notice tone="error">{error}</Notice> : null}
      </View>
    );
  return (
    <>
      <Label size={12} style={{ textAlign: 'center', marginBottom: 12 }}>
        Thay đổi hồ sơ được lưu trên thiết bị này.
      </Label>
      {value ? (
        <AvatarEditor
          profile={value}
          disabled={pending || stale}
          onBusy={setAvatarBusy}
          onSaved={(next) => {
            draft.change('revision', next.revision);
            draft.change('avatarUri', next.avatarUri);
          }}
        />
      ) : null}
      <View style={{ width: '100%', maxWidth: 317, alignSelf: 'center', marginTop: 25, gap: 40 }}>
        <ProfileField
          label="Tên"
          accessibilityLabel="Họ và tên"
          value={value?.displayName ?? ''}
          editable={!pending}
          onChangeText={(next) => draft.change('displayName', next)}
          maxLength={100}
        />
        <ProfileField
          label="Email"
          value={value?.email ?? ''}
          editable={false}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <DesignLink
          onPress={() => {
            if (!pending && !avatarBusy && !stale) setEmailOpen(true);
          }}
        >
          Đổi email
        </DesignLink>
        <ProfileField
          label="Ngày sinh"
          accessibilityLabel="Ngày sinh (YYYY-MM-DD)"
          placeholder="YYYY-MM-DD"
          value={value?.birthDate ?? ''}
          editable={!pending}
          onChangeText={(next) => draft.change('birthDate', next || null)}
          maxLength={10}
          autoCapitalize="none"
        />
        <ProfileField
          label="Quốc gia"
          accessibilityLabel="Mã quốc gia (2 chữ cái)"
          placeholder="VN"
          value={value?.countryCode ?? ''}
          editable={!pending}
          onChangeText={(next) => draft.change('countryCode', next.toUpperCase() || null)}
          maxLength={2}
          autoCapitalize="characters"
        />
      </View>
      <DesignLink
        onPress={() => setBioOpen((current) => !current)}
        style={{ alignSelf: 'center', marginTop: 8 }}
      >
        {bioOpen ? 'Thu gọn giới thiệu' : 'Chỉnh sửa giới thiệu'}
      </DesignLink>
      {bioOpen ? (
        <View style={{ width: '100%', maxWidth: 317, alignSelf: 'center', marginTop: 10 }}>
          <ProfileField
            label="Giới thiệu"
            value={value?.bio ?? ''}
            editable={!pending}
            onChangeText={(next) => draft.change('bio', next)}
            maxLength={500}
            multiline
          />
        </View>
      ) : null}
      <View style={{ marginTop: 8, gap: 12 }}>
        {error ? <Notice tone="error">{error}</Notice> : null}
        {stale ? (
          <>
            <Notice tone="warning">
              Hồ sơ đã thay đổi ở tab khác. Dùng bản mới nhất sẽ bỏ các chỉnh sửa chưa lưu tại đây.
            </Notice>
            <DesignLink
              onPress={() => {
                if (saving.current || avatarBusy) return;
                draft.reset();
                setError('');
                setSaved(false);
              }}
            >
              Dùng bản hồ sơ mới nhất
            </DesignLink>
          </>
        ) : saved ? (
          <Notice tone="success">Đã lưu hồ sơ.</Notice>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Lưu hồ sơ"
        accessibilityState={{
          disabled: saveDisabled,
          busy: pending,
        }}
        disabled={saveDisabled}
        onPress={() => {
          if (!value || saving.current || saveDisabled) return;
          saving.current = true;
          setPending(true);
          setSaved(false);
          setError('');
          void local
            .save(
              {
                displayName: value.displayName,
                birthDate: value.birthDate,
                countryCode: value.countryCode,
                bio: value.bio,
              },
              value.revision,
            )
            .then(() => {
              draft.reset();
              setSaved(true);
            })
            .catch((cause) => {
              setError(errorMessage(cause));
              local.reload();
            })
            .finally(() => {
              saving.current = false;
              setPending(false);
            });
        }}
        style={{
          width: '100%',
          maxWidth: 271,
          minHeight: 44,
          alignSelf: 'center',
          backgroundColor: colors.brand,
          borderRadius: 10,
          paddingVertical: 12,
          marginTop: 10,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pending ? 0.5 : 1,
        }}
      >
        <Label family="inter" size={16} bold color={colors.heroText} style={{ lineHeight: 20 }}>
          {pending ? 'Đang lưu…' : 'Lưu thay đổi'}
        </Label>
      </Pressable>
      {emailOpen && value ? (
        <EmailChangeForm
          profile={value}
          onClose={() => setEmailOpen(false)}
          onSaved={(next) => {
            draft.change('revision', next.revision);
            draft.change('email', next.email);
            setError('');
            setSaved(true);
          }}
        />
      ) : null}
    </>
  );
}

function ProfileField({ label, ...props }: TextInputProps & { label: string }) {
  const { colors } = useApp();
  return (
    <View style={{ gap: 7 }}>
      <Label family="inter" size={14} weight="medium" style={{ lineHeight: 16 }}>
        {label}
      </Label>
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        placeholderTextColor={colors.muted}
        style={{
          minHeight: props.multiline ? 84 : 42,
          paddingVertical: 10,
          paddingHorizontal: 13,
          borderWidth: 1,
          borderColor: colors.text,
          borderRadius: 10,
          color: colors.text,
          backgroundColor: colors.surface,
          fontFamily: Platform.OS === 'ios' ? 'System' : undefined,
          fontSize: 14,
          lineHeight: 20,
          boxShadow: '0px 4px 2px rgba(0,0,0,0.15)',
        }}
      />
    </View>
  );
}
