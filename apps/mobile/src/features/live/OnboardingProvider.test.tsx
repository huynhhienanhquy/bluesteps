import type { PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useApp } from '../../providers';
import { readOnboardingChoices } from '../../services/onboarding-storage';
import { OnboardingProvider, useOnboarding } from './OnboardingProvider';

jest.mock('../../providers', () => ({ useApp: jest.fn() }));
jest.mock('../../services/preferences', () => ({
  useSavePreferences: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock('../../services/onboarding-storage', () => ({
  readOnboardingChoices: jest.fn(),
  writeOnboardingChoices: jest.fn().mockResolvedValue(undefined),
}));

function session(authenticated: boolean) {
  jest.mocked(useApp).mockReturnValue({
    api: {},
    user: authenticated ? { id: 'member' } : null,
    status: authenticated ? 'authenticated' : 'guest',
  } as unknown as ReturnType<typeof useApp>);
}

function wrapper({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <OnboardingProvider>{children}</OnboardingProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  jest.mocked(readOnboardingChoices).mockResolvedValue(null);
  session(false);
});

test('completion unlocks the current guest session and resets on the next launch', async () => {
  const first = await renderHook(useOnboarding, { wrapper });
  await waitFor(() => expect(first.result.current.completed).toBe(false));
  await act(() => first.result.current.complete());
  expect(first.result.current.completed).toBe(true);
  await first.unmount();

  const next = await renderHook(useOnboarding, { wrapper });
  await waitFor(() => expect(next.result.current.completed).toBe(false));
});

test('signing in then signing out requires the introduction again', async () => {
  const { result, rerender } = await renderHook(useOnboarding, { wrapper });
  await waitFor(() => expect(result.current.completed).toBe(false));
  await act(() => result.current.complete());
  expect(result.current.completed).toBe(true);

  session(true);
  await rerender({});
  // Editing preferences while signed in must not unlock the next guest session.
  await act(() => result.current.complete());
  session(false);
  await rerender({});
  expect(result.current.completed).toBe(false);
});

test('unavailable choice storage still permits finishing the current introduction', async () => {
  jest.mocked(readOnboardingChoices).mockRejectedValue(new Error('Storage unavailable'));
  const { result } = await renderHook(useOnboarding, { wrapper });
  await waitFor(() => expect(result.current.completed).toBe(false));
  await act(() => result.current.complete());
  expect(result.current.completed).toBe(true);
});
