import { Fragment } from 'react';
import { Text } from 'react-native';

// Poppins omits these Vietnamese characters. Figma uses a Noto font for them;
// an explicit family also keeps native and browser system fallbacks consistent.
const missing = new Set(
  'ƠơƯưẠạẢảẤấẦầẨẩẪẫẬậẮắẰằẲẳẴẵẶặẸẹẺẻẾếỀềỂểỄễỆệỈỉỊịỌọỎỏỐốỒồỔổỖỗỘộỚớỜờỞởỠỡỢợỤụỦủỨứỪừỬửỮữỰựỴỵỶỷ',
);

export function PoppinsGlyphs({
  text,
  medium,
  size,
  lineHeight,
  regular = false,
}: {
  text: string;
  medium: boolean;
  size: number;
  lineHeight: number;
  regular?: boolean;
}) {
  const runs: { fallback: boolean; text: string }[] = [];
  for (const character of text.normalize('NFC')) {
    const fallback = missing.has(character);
    const previous = runs[runs.length - 1];
    if (previous?.fallback === fallback) previous.text += character;
    else runs.push({ fallback, text: character });
  }
  return runs.map((run, index) =>
    run.fallback ? (
      <Text
        key={index}
        style={{
          fontFamily: regular
            ? 'BackupNotoSans_400Regular'
            : medium
              ? 'BackupNotoSans_500Medium'
              : 'BackupNotoSans_300Light',
          fontSize: size,
          lineHeight,
        }}
      >
        {run.text}
      </Text>
    ) : (
      <Fragment key={index}>{run.text}</Fragment>
    ),
  );
}
