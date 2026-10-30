import { collectionPoints, events, wasteItems, rewards, articles } from './fixtures';
import {
  pointHistory,
  redemptionHistory,
  weeklyStatistics,
  mockNotifications,
  mockConversations,
  mockComments,
} from './mock-session';

export type DemoState = 'content' | 'loading' | 'empty' | 'error';
export class DemoError extends Error {}

/** Local, synthetic read adapter. It never sends user data or simulates a committed transaction. */
export async function readDemo<T>(
  data: T[],
  signal?: AbortSignal,
  state: DemoState = 'content',
): Promise<T[]> {
  await new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error('Request cancelled'));
    };
    const timer = setTimeout(
      () => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      },
      state === 'loading' ? 1800 : 120,
    );
    if (signal?.aborted) onAbort();
    else signal?.addEventListener('abort', onAbort, { once: true });
  });
  if (state === 'error') throw new DemoError('Không tải được dữ liệu minh họa.');
  return state === 'empty' ? [] : data;
}
export const demoData = {
  points: collectionPoints,
  events,
  handbook: wasteItems,
  rewards,
  articles,
  pointHistory,
  redemptionHistory,
  weeklyStatistics,
  notifications: mockNotifications,
  conversations: mockConversations,
  comments: mockComments,
};
export type Dataset = keyof typeof demoData;
