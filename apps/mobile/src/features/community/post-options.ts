export const audiences = {
  public: 'Công khai',
  friends: 'Bạn bè',
  private: 'Chỉ mình tôi',
} as const;
export const emotions = [
  ['happy', 'Hạnh phúc', '😊'],
  ['surprised', 'Bất ngờ', '😮'],
  ['joyful', 'Vui vẻ', '😄'],
  ['loving', 'Yêu thương', '🥰'],
  ['worried', 'Lo lắng', '😟'],
  ['cute', 'Đáng yêu', '☺️'],
  ['confused', 'Bối rối', '😕'],
  ['chill', 'Chill', '😌'],
  ['cool', 'Ngầu', '😎'],
  ['great', 'Tuyệt vời', '🤩'],
  ['interested', 'Thú vị', '🤔'],
  ['sarcastic', 'Mỉa mai', '😏'],
  ['sad', 'Đau buồn', '😢'],
  ['funny', 'Hài hước', '😂'],
  ['hurt', 'Đau khổ', '😣'],
] as const;
export function emotionLabel(code?: string | null) {
  const entry = emotions.find(([value]) => value === code);
  return entry ? `${entry[2]} ${entry[1]}` : '';
}
