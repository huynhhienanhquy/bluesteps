import * as SecureStore from 'expo-secure-store';

const choicesKey = 'bluesteps.onboarding.choices.v1';

let choicesWrites: Promise<void> = Promise.resolve();
export async function readOnboardingChoices() {
  await choicesWrites.catch(() => {});
  return SecureStore.getItemAsync(choicesKey);
}
export function writeOnboardingChoices(value: string | null) {
  choicesWrites = choicesWrites
    .catch(() => {})
    .then(() =>
      value === null
        ? SecureStore.deleteItemAsync(choicesKey)
        : SecureStore.setItemAsync(choicesKey, value),
    );
  return choicesWrites;
}
