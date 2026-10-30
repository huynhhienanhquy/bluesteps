export type ExperiencePreferences = {
  interests: string[];
  goal: 'sorting' | 'reduce' | 'community';
  remindersEnabled: boolean;
  reminderTime: '08:00' | '12:00' | '20:00';
  soundEnabled: boolean;
  vibrationEnabled: boolean;
};
export const initialExperience = (): ExperiencePreferences => ({
  interests: ['sorting', 'activities'],
  goal: 'sorting',
  remindersEnabled: true,
  reminderTime: '20:00',
  soundEnabled: true,
  vibrationEnabled: true,
});
