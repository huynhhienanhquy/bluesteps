import { palettes } from '@bluesteps/design-tokens';

function luminance(hex: string) {
  const linear = hex
    .slice(1)
    .match(/../g)!
    .map((value) => {
      const channel = parseInt(value, 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

test.each(['light', 'dark'] as const)('%s text and action pairs meet 4.5:1 contrast', (mode) => {
  const colors = palettes[mode];
  const pairs = [
    [colors.text, colors.background],
    [colors.text, colors.surface],
    [colors.muted, colors.background],
    [colors.heroText, colors.primary],
    [colors.primaryDark, colors.soft],
  ] as const;
  for (const [foreground, background] of pairs) {
    const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    expect((lighter! + 0.05) / (darker! + 0.05)).toBeGreaterThanOrEqual(4.5);
  }
});
