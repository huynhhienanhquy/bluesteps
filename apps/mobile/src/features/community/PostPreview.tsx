import { Pressable, ScrollView, View } from 'react-native';
import { PrivateModal as Modal } from '../shared/PrivateModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Icon, Label, Notice, Row, Typography } from '../../design-system/ui';
import { useApp } from '../../providers';
import type { Schemas } from '../../services/api';
import { CommandError } from '../shared/common';
import { audiences, emotionLabel } from './post-options';
import { PostMedia } from './PostMedia';

export function PostPreview({
  visible,
  content,
  assets,
  close,
  publish,
  pending,
  disabled,
  error,
}: {
  visible: boolean;
  content: Schemas['PostDraft']['content'];
  assets: Schemas['MediaAsset'][];
  close: () => void;
  publish: () => void;
  pending: boolean;
  disabled: boolean;
  error: unknown;
}) {
  const { user, colors } = useApp();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <Typography.Provider value="inter">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
          <Row style={{ alignItems: 'center', paddingHorizontal: 18, paddingVertical: 18 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng xem trước bài viết"
              disabled={pending}
              onPress={close}
              style={{ width: 32, height: 40, justifyContent: 'center' }}
            >
              <Icon name="chevron-back" size={24} />
            </Pressable>
            <Label heading bold size={22} style={{ flex: 1 }}>
              Xem trước bài viết
            </Label>
          </Row>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 18, gap: 28, paddingBottom: 36 }}
          >
            <Card style={{ borderRadius: 20, padding: 16, gap: 24 }}>
              <Row style={{ alignItems: 'center' }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.soft,
                  }}
                >
                  <Label bold color={colors.primary}>
                    {user?.displayName
                      ?.trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join('')
                      .toUpperCase()}
                  </Label>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Label bold>{user?.displayName}</Label>
                  <Label size={12} color={colors.muted}>
                    {audiences[content.visibility]} · Xem trước
                  </Label>
                </View>
              </Row>
              {content.emotion ? <Label>{emotionLabel(content.emotion)}</Label> : null}
              {content.place ? <Label>📍 {content.place.name}</Label> : null}
              {content.body ? <Label>{content.body}</Label> : null}
              <PostMedia assets={assets} gallery />
              <Notice>Kiểm tra lại nội dung và quyền xem trước khi đăng.</Notice>
            </Card>
            <CommandError error={error} />
            <Button
              title="Đăng bài viết"
              accessibilityLabel="Đăng bài viết từ xem trước"
              disabled={disabled}
              pending={pending}
              onPress={publish}
            />
          </ScrollView>
        </SafeAreaView>
      </Typography.Provider>
    </Modal>
  );
}
