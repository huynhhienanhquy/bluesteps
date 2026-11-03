export const greenPairs = [
  {
    id: 'leaf',
    name: 'Lá xanh',
    icon: 'leaf-outline',
    tip: 'Chăm cây xanh để góc sống thêm trong lành.',
  },
  {
    id: 'water',
    name: 'Bình nước',
    icon: 'water-outline',
    tip: 'Mang bình cá nhân để giảm chai nhựa dùng một lần.',
  },
  {
    id: 'bag',
    name: 'Túi vải',
    icon: 'bag-handle-outline',
    tip: 'Dùng lại túi vải trong những lần đi chợ tiếp theo.',
  },
  {
    id: 'sun',
    name: 'Mặt trời',
    icon: 'sunny-outline',
    tip: 'Tận dụng ánh sáng tự nhiên khi có thể.',
  },
  {
    id: 'plant',
    name: 'Vườn hoa',
    icon: 'flower-outline',
    tip: 'Trồng hoa phù hợp với khí hậu và không gian quanh bạn.',
  },
  {
    id: 'bike',
    name: 'Xe đạp',
    icon: 'bicycle-outline',
    tip: 'Chọn xe đạp cho quãng đường ngắn khi điều kiện an toàn.',
  },
] as const;

export type MemoryRound = {
  deck: string[];
  open: number[];
  matched: string[];
  moves: number;
};

export function createMemoryRound(random = Math.random): MemoryRound {
  const deck = greenPairs.flatMap((pair) => [pair.id, pair.id]);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  return { deck, open: [], matched: [], moves: 0 };
}

export function flipMemoryCard(round: MemoryRound, index: number): MemoryRound {
  const pair = round.deck[index];
  if (
    !pair ||
    round.open.length === 2 ||
    round.open.includes(index) ||
    round.matched.includes(pair)
  )
    return round;
  if (round.open.length === 0) return { ...round, open: [index] };
  const matched = round.deck[round.open[0]!] === pair;
  return {
    ...round,
    open: matched ? [] : [...round.open, index],
    matched: matched ? [...round.matched, pair] : round.matched,
    moves: round.moves + 1,
  };
}

export function memoryScore(moves: number) {
  return Math.max(0, 600 - Math.max(0, moves - greenPairs.length) * 10);
}
