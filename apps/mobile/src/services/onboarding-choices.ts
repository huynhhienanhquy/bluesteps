import type { Schemas } from './api';

export type OnboardingChoices = Pick<Schemas['Preferences'], 'interests' | 'goal'> & {
  remindersEnabled: boolean;
  reminderTime: string;
};
export type PendingOnboarding = {
  choices: OnboardingChoices;
  account?: string;
  preferencesSaved?: boolean;
  remindersSaved?: boolean;
};

export function readPendingChoices(raw: string | null): PendingOnboarding | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as PendingOnboarding;
    const choices = value.choices;
    if (
      !choices ||
      !Array.isArray(choices.interests) ||
      choices.interests.length > 4 ||
      !choices.interests.every((item) =>
        ['sorting', 'activities', 'collection', 'news'].includes(item),
      ) ||
      (choices.goal !== null && !['sorting', 'reduce', 'community'].includes(choices.goal)) ||
      typeof choices.remindersEnabled !== 'boolean' ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(choices.reminderTime) ||
      (value.preferencesSaved !== undefined && typeof value.preferencesSaved !== 'boolean') ||
      (value.remindersSaved !== undefined && typeof value.remindersSaved !== 'boolean') ||
      (value.account !== undefined && typeof value.account !== 'string')
    )
      return null;
    return value;
  } catch {
    return null;
  }
}
