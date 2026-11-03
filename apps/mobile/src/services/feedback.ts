import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

export type FeedbackPreferences = { sound: boolean; haptics: boolean };
let player: AudioPlayer | null = null;
let configured: Promise<void> | null = null;
let lastFeedback = 0;

/** Called only for a completed user action or an explicit preview. */
export async function playFeedback(preferences: FeedbackPreferences) {
  if ((!preferences.sound && !preferences.haptics) || Date.now() - lastFeedback < 250) return;
  lastFeedback = Date.now();
  const effects: Promise<unknown>[] = [];
  if (preferences.haptics)
    effects.push(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  if (preferences.sound)
    effects.push(
      (async () => {
        configured ??= setAudioModeAsync({
          playsInSilentMode: false,
          shouldPlayInBackground: false,
          interruptionMode: 'mixWithOthers',
          allowsRecording: false,
        });
        await configured;
        player ??= createAudioPlayer(require('../../assets/audio/success.wav'), {
          keepAudioSessionActive: false,
        });
        player.volume = 0.35;
        if (player.isLoaded) await player.seekTo(0);
        player.play();
      })(),
    );
  await Promise.allSettled(effects);
}
