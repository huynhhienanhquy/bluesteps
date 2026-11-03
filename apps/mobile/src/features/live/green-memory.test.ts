import { createMemoryRound, flipMemoryCard, greenPairs, memoryScore } from './green-memory';

test('each shuffled round contains exactly two cards for each of the six pairs', () => {
  for (const random of [() => 0, () => 0.5, () => 0.999]) {
    const round = createMemoryRound(random);
    expect(round.deck).toHaveLength(12);
    for (const pair of greenPairs)
      expect(round.deck.filter((id) => id === pair.id)).toHaveLength(2);
  }
});

test('a mismatch locks further flips, and flipping the same card never counts as a pair', () => {
  const round = createMemoryRound();
  const first = flipMemoryCard(round, 0);
  expect(flipMemoryCard(first, 0)).toBe(first);
  const other = round.deck.findIndex((id) => id !== round.deck[0]);
  const mismatch = flipMemoryCard(first, other);
  expect(mismatch.moves).toBe(1);
  expect(mismatch.matched).toEqual([]);
  expect(mismatch.open).toEqual([0, other]);
  expect(flipMemoryCard(mismatch, 5)).toBe(mismatch);
});

test('matching all pairs finishes in six moves and matched cards cannot be reused', () => {
  let round = createMemoryRound();
  for (const pair of greenPairs) {
    const first = round.deck.indexOf(pair.id);
    const second = round.deck.lastIndexOf(pair.id);
    round = flipMemoryCard(flipMemoryCard(round, first), second);
    expect(flipMemoryCard(round, first)).toBe(round);
  }
  expect(round.matched).toHaveLength(6);
  expect(round.moves).toBe(6);
  expect(round.open).toEqual([]);
  expect(memoryScore(round.moves)).toBe(600);
  expect(memoryScore(7)).toBe(590);
  expect(memoryScore(100)).toBe(0);
});
