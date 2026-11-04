import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Icon, Label } from '../../design-system/ui';
import { createMemoryRound, flipMemoryCard, greenPairs, memoryScore } from './green-memory';

export function GreenMemoryGame({
  onRunningChange,
  onExit,
}: {
  onRunningChange: (running: boolean) => void;
  onExit: () => void;
}) {
  const [round, setRound] = useState<ReturnType<typeof createMemoryRound> | null>(null);
  const finished = round?.matched.length === greenPairs.length;
  const running = round !== null && !finished;
  const waiting = round?.open.length === 2;
  useEffect(() => {
    onRunningChange(running);
  }, [running, onRunningChange]);
  useEffect(() => () => onRunningChange(false), [onRunningChange]);
  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => {
      setRound((current) => (current ? { ...current, open: [] } : current));
    }, 1000);
    return () => clearTimeout(timer);
  }, [waiting]);

  if (!round)
    return (
      <View style={{ padding: 24, gap: 22 }}>
        <View
          style={{
            backgroundColor: '#E4F4EC',
            padding: 32,
            borderRadius: 24,
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Icon name="leaf-outline" size={64} color="#237B57" />
          <Label heading bold size={24} color="#164561">
            Một trí nhớ tốt. Một thói quen xanh.
          </Label>
          <Label size={14} color="#456476">
            12 thẻ · 6 cặp · Không giới hạn thời gian
          </Label>
        </View>
        <Label heading bold size={19} color="#164561">
          Cách chơi
        </Label>
        <Label color="#456476">
          Lật hai thẻ để tìm cặp giống nhau. Hai thẻ khác nhau sẽ úp lại sau một giây. Ghi nhớ vị
          trí và tìm đủ 6 cặp để hoàn thành.
        </Label>
        <Label size={13} color="#456476">
          Tối đa 600 điểm. Mỗi lượt vượt quá 6 lượt sẽ giảm 10 điểm.
        </Label>
        <Button title="Bắt đầu lật thẻ" onPress={() => setRound(createMemoryRound())} />
      </View>
    );

  if (finished)
    return (
      <View style={{ padding: 24, gap: 20 }}>
        <View
          style={{
            padding: 28,
            borderRadius: 24,
            backgroundColor: '#E4F4EC',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <Icon name="trophy-outline" size={64} color="#237B57" />
          <Label heading bold size={25} color="#164561" style={{ textAlign: 'center' }}>
            Bạn đã ghép đủ 6 cặp!
          </Label>
          <Label bold size={38} color="#237B57">
            {memoryScore(round.moves)} điểm
          </Label>
          <Label color="#456476">Hoàn thành sau {round.moves} lượt lật</Label>
        </View>
        <Label size={14} color="#456476">
          Mỗi cặp thẻ là một gợi ý sống xanh. Hãy chọn một hành động nhỏ để thử hôm nay.
        </Label>
        <Button title="Chơi lại" onPress={() => setRound(createMemoryRound())} />
        <Button title="Về danh sách trò chơi" variant="secondary" onPress={onExit} />
      </View>
    );

  const lastMatch = greenPairs.find((pair) => pair.id === round.matched.at(-1));
  return (
    <View style={{ padding: 20, gap: 16 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          padding: 16,
          borderRadius: 16,
          backgroundColor: '#EDF7FC',
        }}
      >
        <Label bold color="#164561">
          Đã ghép {round.matched.length}/6 cặp
        </Label>
        <Label color="#456476">Lượt lật: {round.moves}</Label>
      </View>
      <Label size={14} color="#456476">
        Chạm vào hai thẻ để tìm cặp giống nhau.
      </Label>
      <View style={{ gap: 10 }}>
        {[0, 3, 6, 9].map((start) => (
          <View key={start} style={{ flexDirection: 'row', gap: 10 }}>
            {[start, start + 1, start + 2].map((index) => {
              const pair = greenPairs.find((item) => item.id === round.deck[index])!;
              const matched = round.matched.includes(pair.id);
              const revealed = matched || round.open.includes(index);
              return (
                <Pressable
                  key={index}
                  accessibilityRole="button"
                  accessibilityLabel={`Thẻ ${index + 1}, ${matched ? `đã ghép, ${pair.name}` : revealed ? pair.name : 'chưa lật'}`}
                  disabled={matched || revealed || waiting}
                  onPress={() => setRound((current) => current && flipMemoryCard(current, index))}
                  style={({ pressed }) => ({
                    flex: 1,
                    minHeight: 106,
                    padding: 8,
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: matched ? '#237B57' : revealed ? '#147CC1' : '#D2E7F4',
                    backgroundColor: matched ? '#E4F4EC' : revealed ? '#FFFFFF' : '#DCEEF9',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Icon
                    name={revealed ? pair.icon : 'leaf'}
                    size={32}
                    color={matched ? '#237B57' : '#147CC1'}
                  />
                  <Label size={12} bold color="#164561" style={{ textAlign: 'center' }}>
                    {revealed ? pair.name : '?'}
                  </Label>
                  {matched ? (
                    <Label size={10} color="#237B57">
                      ✓ Đã ghép
                    </Label>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <View
        accessibilityLiveRegion="polite"
        style={{
          minHeight: 70,
          padding: 14,
          borderRadius: 14,
          backgroundColor: waiting ? '#FFF3D9' : '#E4F4EC',
        }}
      >
        <Label size={13} color="#164561">
          {waiting
            ? 'Chưa trùng cặp. Ghi nhớ vị trí rồi thử lại nhé!'
            : lastMatch
              ? lastMatch.tip
              : 'Tìm cặp đầu tiên để khám phá gợi ý sống xanh.'}
        </Label>
      </View>
    </View>
  );
}
