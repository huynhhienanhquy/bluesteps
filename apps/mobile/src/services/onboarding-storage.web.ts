const choicesKey = 'bluesteps.onboarding.choices.v1';

export async function readOnboardingChoices() {
  return localStorage.getItem(choicesKey);
}
export async function writeOnboardingChoices(value: string | null) {
  if (value === null) localStorage.removeItem(choicesKey);
  else localStorage.setItem(choicesKey, value);
}
