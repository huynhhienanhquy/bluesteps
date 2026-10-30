import { readDemo } from '../demo';
test('returns synthetic reads, empty data and a recoverable failure', async () => {
  expect(await readDemo([1])).toEqual([1]);
  expect(await readDemo([1], undefined, 'empty')).toEqual([]);
  await expect(readDemo([1], undefined, 'error')).rejects.toThrow('Không tải được');
  expect(await readDemo([1])).toEqual([1]);
});
test('cancels pending work when the caller aborts', async () => {
  const controller = new AbortController();
  const request = readDemo([1], controller.signal, 'loading');
  controller.abort();
  await expect(request).rejects.toThrow('Request cancelled');
});
