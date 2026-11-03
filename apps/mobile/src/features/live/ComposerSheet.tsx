import { useRef, type ComponentRef, type PropsWithChildren } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { PrivateModal as Modal } from './PrivateModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Label } from '../../design-system/ui';
import { useApp } from '../../providers';

export function ComposerSheet({
  title,
  visible,
  close,
  children,
}: PropsWithChildren<{ title: string; visible: boolean; close: () => void }>) {
  const { colors } = useApp();
  const insets = useSafeAreaInsets();
  const heading = useRef<ComponentRef<typeof View>>(null);
  if (!visible) return null;
  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={close}
      onShow={() => {
        if (Platform.OS === 'web') return;
        const target = findNodeHandle(heading.current);
        if (target) AccessibilityInfo.setAccessibilityFocus(target);
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={'Đóng ' + title}
          onPress={close}
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
        />
        <View
          accessibilityViewIsModal
          style={{
            maxHeight: '88%',
            flexGrow: 0,
            backgroundColor: colors.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              padding: 24,
              paddingBottom: Math.max(28, insets.bottom),
              gap: 16,
            }}
          >
            <View
              ref={heading}
              collapsable={false}
              accessible
              accessibilityRole="header"
              accessibilityLabel={title}
            >
              <Label bold size={21}>
                {title}
              </Label>
            </View>
            {children}
            <Button title="Đóng" variant="quiet" onPress={close} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
