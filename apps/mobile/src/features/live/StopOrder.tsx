import { useRef, useState, useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { Artwork } from '../../design-system/DesignScreen';
import { Button, Label } from '../../design-system/ui';
import { DragHandle } from './DragHandle';
export type OrderedStop = { id: string; name: string; detail: string; handover?: string };
export function StopOrder({
  items,
  disabled,
  onChange,
  onRemove,
  onDragging,
}: {
  items: OrderedStop[];
  disabled?: boolean;
  onChange: (ids: string[]) => void | Promise<unknown>;
  onRemove?: (id: string) => void;
  onDragging: (active: boolean) => void;
}) {
  const layouts = useRef<Record<string, { y: number; height: number }>>({});
  const [drag, setDrag] = useState<{
    id: string;
    startY: number;
    delta: number;
    center: number;
    key: string;
  } | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  useEffect(() => () => onDragging(false), [onDragging]);
  async function change(id: string, to: number) {
    if (disabled) return;
    const ids = items.map((s) => s.id),
      from = ids.indexOf(id),
      target = Math.max(0, Math.min(ids.length - 1, to));
    if (from < 0 || from === target) return;
    ids.splice(from, 1);
    ids.splice(target, 0, id);
    try {
      await onChange(ids);
      setAnnouncement(`Đã chuyển ${items[from]!.name} đến vị trí ${target + 1}.`);
    } catch {
      setAnnouncement('Chưa lưu được thứ tự mới. Hãy thử lại.');
    }
  }
  function cancel() {
    setDrag(null);
    onDragging(false);
  }
  function end(y: number) {
    if (drag && drag.key === items.map((s) => s.id).join(',')) {
      const delta = y - drag.startY;
      if (Math.abs(delta) < 8) setMenu((v) => (v === drag.id ? null : drag.id));
      else {
        const center = drag.center + delta;
        let target = items.findIndex((s) => s.id === drag.id),
          closest = Infinity;
        items.forEach((s, index) => {
          const box = layouts.current[s.id];
          if (box) {
            const d = Math.abs(center - box.y - box.height / 2);
            if (d < closest) {
              closest = d;
              target = index;
            }
          }
        });
        change(drag.id, target);
      }
    }
    cancel();
  }
  return (
    <View style={{ gap: 12 }}>
      {items.map((s, index) => (
        <View
          key={s.id}
          onLayout={(e) => {
            layouts.current[s.id] = e.nativeEvent.layout;
          }}
          style={{
            borderRadius: 20,
            borderWidth: 1,
            borderColor: '#DEEBF3',
            backgroundColor: drag?.id === s.id ? '#EDF7FC' : '#FFFFFF',
            padding: 16,
            gap: 10,
            zIndex: drag?.id === s.id ? 2 : 0,
            transform: [{ translateY: drag?.id === s.id ? drag.delta : 0 }],
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 20,
                backgroundColor: '#147CC1',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Label size={14} weight="semibold" color="#FFFFFF">
                {index + 1}
              </Label>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Label size={16} weight="semibold" color="#172B3D">
                {s.name}
              </Label>
              <Label size={12} color="#677C8C">
                {s.detail}
              </Label>
            </View>
            <DragHandle
              name={s.name}
              disabled={disabled || items.length < 2}
              onStart={(y) => {
                const box = layouts.current[s.id];
                if (box) {
                  setDrag({
                    id: s.id,
                    startY: y,
                    delta: 0,
                    center: box.y + box.height / 2,
                    key: items.map((i) => i.id).join(','),
                  });
                  onDragging(true);
                }
              }}
              onMove={(y) => setDrag((v) => (v ? { ...v, delta: y - v.startY } : null))}
              onEnd={end}
              onCancel={cancel}
              onStep={(direction) => change(s.id, index + direction)}
              onActivate={() => setMenu((v) => (v === s.id ? null : s.id))}
            />
            {onRemove ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Bỏ điểm ${s.name}`}
                disabled={disabled}
                onPress={() => onRemove(s.id)}
                style={{ padding: 4 }}
              >
                <Artwork
                  source={require('../../../assets/figma/common/journey-close.svg')}
                  width={24}
                  height={24}
                />
              </Pressable>
            ) : null}
          </View>
          {s.handover ? (
            <Label size={14} color="#147CC1">
              {s.handover}
            </Label>
          ) : null}
          {menu === s.id ? (
            <View style={{ gap: 4 }}>
              <Button
                title={`Đưa ${s.name} lên`}
                disabled={disabled || index === 0}
                variant="quiet"
                onPress={() => change(s.id, index - 1)}
              />
              <Button
                title={`Đưa ${s.name} xuống`}
                disabled={disabled || index === items.length - 1}
                variant="quiet"
                onPress={() => change(s.id, index + 1)}
              />
            </View>
          ) : null}
        </View>
      ))}
      {announcement ? (
        <Label size={12} color="#677C8C">
          {announcement}
        </Label>
      ) : null}
    </View>
  );
}
