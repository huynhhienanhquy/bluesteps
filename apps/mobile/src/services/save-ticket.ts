import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export async function saveTicket(image: string, code: string) {
  const encoded = image.split(',')[1];
  if (!image.startsWith('data:image/png;base64,') || !encoded)
    throw new Error('Ảnh vé không hợp lệ.');
  if (!(await Sharing.isAvailableAsync())) throw new Error('Thiết bị chưa hỗ trợ lưu/chia sẻ tệp.');
  if (!FileSystem.cacheDirectory)
    throw new Error('Không truy cập được thư mục lưu tạm của ứng dụng.');
  const uri = `${FileSystem.cacheDirectory}${code.replace(/[^a-z0-9-]/gi, '')}.png`;
  await FileSystem.writeAsStringAsync(uri, encoded, { encoding: FileSystem.EncodingType.Base64 });
  await Sharing.shareAsync(uri, {
    mimeType: 'image/png',
    dialogTitle: 'Lưu mã vé BlueSteps',
    UTI: 'public.png',
  });
}
