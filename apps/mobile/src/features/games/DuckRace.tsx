import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, Label, Notice } from '../../design-system/ui';

const finish = 40;
const rivals = [
  { name: 'Vịt xanh', color: '#168575', seconds: 12 },
  { name: 'Vịt hồng', color: '#C84981', seconds: 15 },
];
type Race = { startedAt: number; elapsed: number; moves: number; finishedAt: number | null };

export function DuckRace({ onRunningChange }: { onRunningChange?: (running: boolean) => void }) {
  const [race, setRace] = useState<Race | null>(null);
  const running = !!race && race.finishedAt === null;
  useEffect(() => {
    onRunningChange?.(running);
  }, [running, onRunningChange]);
  useEffect(() => () => onRunningChange?.(false), [onRunningChange]);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setRace((current) => {
        if (!current || current.finishedAt !== null) return current;
        const elapsed = Math.min(15, (now - current.startedAt) / 1000);
        return { ...current, elapsed, finishedAt: elapsed >= 15 ? 15 : null };
      });
    }, 100);
    return () => clearInterval(timer);
  }, [running]);
  const elapsed = race?.elapsed ?? 0;
  const finishedAt = race?.finishedAt;
  const rank =
    finishedAt != null && race?.moves === finish
      ? 1 + rivals.filter((rival) => rival.seconds <= finishedAt).length
      : null;
  const lanes = [
    { name: 'Vịt của bạn', color: '#B77900', progress: (race?.moves ?? 0) / finish },
    ...rivals.map((rival) => ({ ...rival, progress: Math.min(1, elapsed / rival.seconds) })),
  ];
  function paddle() {
    const now = Date.now();
    setRace((current) => {
      if (!current || current.finishedAt !== null) return current;
      const elapsed = Math.min(15, (now - current.startedAt) / 1000);
      if (elapsed >= 15) return { ...current, elapsed, finishedAt: 15 };
      const moves = current.moves + 1;
      return { ...current, elapsed, moves, finishedAt: moves === finish ? elapsed : null };
    });
  }
  return (
    <View style={{ padding: 20, gap: 16 }}>
      <Label bold size={19} color="#172B3D">
        Đường đua
      </Label>
      <Label size={14} color="#456476">
        Nhấn Bơi để tiến về đích. Bạn có 15 giây để đua với hai vịt máy.
      </Label>
      {lanes.map((lane) => (
        <View key={lane.name} style={{ gap: 6 }}>
          <Label size={13} bold color="#172B3D">
            {lane.name} · {Math.floor(lane.progress * 100)}%
          </Label>
          <View
            style={{
              height: 36,
              borderRadius: 10,
              backgroundColor: '#D3F4FC',
              overflow: 'hidden',
              paddingRight: 28,
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                position: 'absolute',
                right: 7,
                top: 0,
                bottom: 0,
                borderRightWidth: 3,
                borderStyle: 'dashed',
                borderColor: '#456476',
              }}
            />
            <View
              style={{ width: `${lane.progress * 100}%`, height: 4, backgroundColor: lane.color }}
            />
            <Label size={22} style={{ position: 'absolute', left: `${lane.progress * 90}%` }}>
              🦆
            </Label>
          </View>
        </View>
      ))}
      <Label size={13} color="#456476">
        Còn {Math.max(0, Math.ceil(15 - elapsed))} giây
      </Label>
      {finishedAt != null ? (
        <Notice tone={rank === 1 ? 'success' : 'info'}>
          {rank
            ? `Về đích hạng ${rank} · ${finishedAt.toFixed(1)} giây`
            : 'Hết giờ. Thử lại để về đích.'}
        </Notice>
      ) : null}
      {running ? (
        <Button title="Bơi" onPress={paddle} />
      ) : (
        <Button
          title={race ? 'Đua lại' : 'Bắt đầu đua'}
          onPress={() => setRace({ startedAt: Date.now(), elapsed: 0, moves: 0, finishedAt: null })}
        />
      )}
    </View>
  );
}
