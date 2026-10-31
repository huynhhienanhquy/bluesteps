import { createContext, useContext, useState, type PropsWithChildren } from 'react';

export type RewardChoice = { title: string; cost: number; frame: string; image: string };
type RewardUiState = {
  claimed: boolean;
  reminder: boolean;
  balance: number;
  redeemed: RewardChoice[];
};
const initial = (): RewardUiState => ({
  claimed: false,
  reminder: false,
  balance: 180,
  redeemed: [],
});
const RewardsUiContext = createContext<{
  state: RewardUiState;
  claim: () => void;
  toggleReminder: () => void;
  redeem: (choice: RewardChoice) => void;
  reset: () => void;
} | null>(null);

/** Presentation state only. No wallet, reward inventory or notification API is called. */
export function RewardsUiProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState(initial);
  return (
    <RewardsUiContext.Provider
      value={{
        state,
        claim: () =>
          setState((s) => (s.claimed ? s : { ...s, claimed: true, balance: s.balance + 2 })),
        toggleReminder: () => setState((s) => ({ ...s, reminder: !s.reminder })),
        redeem: (choice) =>
          setState((s) =>
            s.balance < choice.cost
              ? s
              : { ...s, balance: s.balance - choice.cost, redeemed: [...s.redeemed, choice] },
          ),
        reset: () => setState(initial()),
      }}
    >
      {children}
    </RewardsUiContext.Provider>
  );
}
export function useRewardsUi() {
  const context = useContext(RewardsUiContext);
  if (!context) throw new Error('RewardsUiProvider is required');
  return context;
}
