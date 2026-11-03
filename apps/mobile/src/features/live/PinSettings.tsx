import { useRef, useState } from 'react';
import { View } from 'react-native';
import { DesignLink } from '../../design-system/DesignScreen';
import { Button, Label, Notice } from '../../design-system/ui';
import { errorMessage } from '../../services/api';
import { usePin } from './PinProvider';
import { PinEntry } from './PinEntry';
export function PinSettings({ close }: { close: () => void }) {
  const pin = usePin();
  const [step, setStep] = useState<'menu' | 'current' | 'disable' | 'new' | 'confirm'>(
      pin.enabled ? 'menu' : 'new',
    ),
    [value, setValue] = useState(''),
    [first, setFirst] = useState(''),
    [current, setCurrent] = useState(''),
    [error, setError] = useState(''),
    [saved, setSaved] = useState(false);
  const submitting = useRef(false);
  function go(next: typeof step) {
    setValue('');
    setError('');
    setStep(next);
  }
  async function submit() {
    if (submitting.current || pin.busy || !/^\d{6}$/.test(value)) return;
    submitting.current = true;
    setError('');
    try {
      if (step === 'current') {
        await pin.check(value);
        setCurrent(value);
        go('new');
      } else if (step === 'disable') {
        await pin.disable(value);
        setCurrent('');
        setSaved(true);
        go('new');
      } else if (step === 'new') {
        setFirst(value);
        go('confirm');
      } else if (step === 'confirm') {
        if (value !== first) {
          setError('Hai mã PIN chưa khớp. Hãy nhập lại mã xác nhận.');
          setValue('');
          return;
        }
        await pin.save(value, current || undefined);
        setFirst('');
        setCurrent('');
        setValue('');
        setSaved(true);
        go('menu');
      }
    } catch (cause) {
      setValue('');
      setError(errorMessage(cause));
    } finally {
      submitting.current = false;
    }
  }
  return (
    <View style={{ flex: 1, gap: 12 }}>
      {saved ? (
        <Notice tone="success">
          {pin.enabled ? 'Đã lưu PIN trên thiết bị này.' : 'Đã tắt PIN trên thiết bị này.'}
        </Notice>
      ) : null}
      {step === 'menu' ? (
        <>
          <Label size={13}>Mã PIN 6 số đang bảo vệ ứng dụng trên thiết bị này.</Label>
          <Button
            title="Đổi mã PIN"
            variant="secondary"
            onPress={() => {
              setSaved(false);
              go('current');
            }}
          />
          <Button title="Khóa ứng dụng ngay" onPress={pin.lock} />
          <Button
            title="Tắt mã PIN"
            variant="quiet"
            onPress={() => {
              setSaved(false);
              go('disable');
            }}
          />
        </>
      ) : (
        <PinEntry
          value={value}
          onChange={setValue}
          onSubmit={() => void submit()}
          busy={pin.busy}
          blockedUntil={pin.blockedUntil}
          error={error}
          title={
            step === 'new'
              ? 'Tiếp tục'
              : step === 'confirm'
                ? 'Lưu mã PIN'
                : step === 'disable'
                  ? 'Tắt mã PIN'
                  : 'Xác nhận PIN hiện tại'
          }
          description={
            step === 'confirm'
              ? 'Nhập lại mã PIN mới để xác nhận.'
              : step === 'current' || step === 'disable'
                ? 'Nhập mã PIN hiện tại của bạn.'
                : 'Chọn mã PIN gồm 6 chữ số để bảo vệ khi mở lại ứng dụng.'
          }
        />
      )}
      {step === 'confirm' ? (
        <DesignLink
          onPress={() => {
            if (!submitting.current && !pin.busy) {
              setFirst('');
              go('new');
            }
          }}
          style={{ alignItems: 'center' }}
        >
          Nhập lại PIN mới
        </DesignLink>
      ) : null}
      <View style={{ flex: 1, minHeight: 10 }} />
      <DesignLink
        onPress={() => {
          if (!submitting.current && !pin.busy) close();
        }}
        style={{ alignItems: 'center' }}
      >
        {saved || step === 'menu' ? 'Đóng' : 'Hủy'}
      </DesignLink>
    </View>
  );
}
