import { useRef, useState, type PropsWithChildren } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DesignLink } from '../../design-system/DesignScreen';
import { Button, Label, Loading, Notice, Typography } from '../../design-system/ui';
import { useApp } from '../../providers';
import { errorMessage } from '../../services/api';
import { usePin } from './PinProvider';
import { PinEntry } from './PinEntry';
export function PinGate({ children }: PropsWithChildren) {
  const pin = usePin(),
    { colors } = useApp();
  const hidden = pin.locked || !pin.ready;
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{ flex: 1, opacity: hidden ? 0 : 1 }}
        pointerEvents={hidden ? 'none' : 'auto'}
        accessibilityElementsHidden={hidden}
        importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      >
        {children}
      </View>
      <Modal
        visible={hidden}
        animationType="none"
        presentationStyle="fullScreen"
        onRequestClose={() => {}}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
          <Typography.Provider value="montserrat">
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
            >
              {!pin.ready ? <Loading /> : <Unlock />}
            </ScrollView>
          </Typography.Provider>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
function Unlock() {
  const pin = usePin();
  const [value, setValue] = useState(''),
    [error, setError] = useState(''),
    [recovering, setRecovering] = useState(false);
  const working = useRef(false);
  async function unlock() {
    if (working.current || pin.busy || pin.blockedUntil > Date.now() || value.length !== 6) return;
    working.current = true;
    try {
      setError('');
      await pin.unlock(value);
      setValue('');
    } catch (cause) {
      setValue('');
      setError(errorMessage(cause));
    } finally {
      working.current = false;
    }
  }
  async function recover() {
    if (working.current || pin.busy) return;
    working.current = true;
    setError('');
    setRecovering(true);
    try {
      await pin.recover();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      working.current = false;
      setRecovering(false);
    }
  }
  return (
    <View style={{ gap: 18, width: '100%', maxWidth: 380, alignSelf: 'center' }}>
      <Label heading bold size={23}>
        Mở khóa BlueSteps
      </Label>
      {pin.error ? (
        <>
          <Notice tone="error">{pin.error}</Notice>
          <Button title="Đọc lại cấu hình PIN" variant="secondary" onPress={pin.reload} />
        </>
      ) : (
        <PinEntry
          value={value}
          onChange={setValue}
          onSubmit={() => void unlock()}
          title="Mở khóa"
          description="Nhập mã PIN của bạn trên thiết bị này."
          busy={pin.busy || recovering}
          blockedUntil={pin.blockedUntil}
          error={error}
        />
      )}
      <DesignLink
        onPress={() => {
          if (!pin.busy && !recovering) void recover();
        }}
        style={{ alignItems: 'center' }}
      >
        Quên PIN? Đăng nhập lại
      </DesignLink>
      <Label size={12}>
        Đăng nhập lại sẽ kết thúc phiên hiện tại và cho phép đặt PIN mới bằng tài khoản của bạn.
      </Label>
    </View>
  );
}
