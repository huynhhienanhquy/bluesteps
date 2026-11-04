import { Modal, type ModalProps } from 'react-native';
import { useOptionalPin } from '../auth/PinProvider';
/** Keep dialog state while preventing a native portal from appearing above the PIN gate. */
export function PrivateModal(props: ModalProps) {
  const pin = useOptionalPin();
  return <Modal {...props} visible={props.visible !== false && !pin?.locked} />;
}
