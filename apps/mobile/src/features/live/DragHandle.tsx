import { View } from 'react-native';
import { Artwork } from '../../design-system/DesignScreen';
export type DragHandleProps = {
  name: string;
  disabled?: boolean;
  onStart: (y: number) => void;
  onMove: (y: number) => void;
  onEnd: (y: number) => void;
  onCancel: () => void;
  onStep: (direction: number) => void;
  onActivate: () => void;
};
export function DragHandle(p: DragHandleProps) {
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`Đổi thứ tự ${p.name}`}
      accessibilityHint="Kéo để đổi thứ tự hoặc chạm để hiện nút di chuyển."
      accessibilityState={{ disabled: p.disabled }}
      accessibilityActions={[
        { name: 'increment', label: 'Đưa xuống' },
        { name: 'decrement', label: 'Đưa lên' },
        { name: 'activate', label: 'Tùy chọn thứ tự' },
      ]}
      onAccessibilityAction={(e) =>
        e.nativeEvent.actionName === 'activate'
          ? p.onActivate()
          : p.onStep(e.nativeEvent.actionName === 'increment' ? 1 : -1)
      }
      onStartShouldSetResponder={() => !p.disabled}
      onResponderGrant={(e) => p.onStart(e.nativeEvent.pageY)}
      onResponderMove={(e) => p.onMove(e.nativeEvent.pageY)}
      onResponderRelease={(e) => p.onEnd(e.nativeEvent.pageY)}
      onResponderTerminate={p.onCancel}
      onResponderTerminationRequest={() => false}
      style={{ padding: 8, opacity: p.disabled ? 0.4 : 1 }}
    >
      <Artwork
        source={require('../../../assets/figma/534-48774/imgGripVertical.svg')}
        width={18}
        height={18}
      />
    </View>
  );
}
