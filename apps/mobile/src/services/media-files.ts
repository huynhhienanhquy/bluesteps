import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { randomUUID } from 'expo-crypto';

export type MediaSource = {
  uri: string;
  name: string;
  mime: string;
  kind: 'image' | 'video' | 'audio' | 'file';
  size?: number;
  file?: Blob;
  clientUploadId: string;
};
export async function prepareMedia(source: MediaSource): Promise<MediaSource & { size: number }> {
  const info = await FileSystem.getInfoAsync(source.uri);
  if (!info.exists || info.isDirectory)
    throw new Error('Không đọc được tệp đã chọn. Hãy chọn lại.');
  return { ...source, size: info.size };
}
export async function readMediaPart(source: MediaSource, offset: number, length: number) {
  return FileSystem.readAsStringAsync(source.uri, {
    encoding: FileSystem.EncodingType.Base64,
    position: offset,
    length,
  });
}
export async function mediaBlobUri(blob: Blob, key: string, extension: string) {
  if (!FileSystem.cacheDirectory) throw new Error('Không mở được thư mục tạm.');
  const encoded = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không đọc được tệp.'));
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.readAsDataURL(blob);
  });
  const uri = `${FileSystem.cacheDirectory}bluesteps-media-${key.replace(/[^a-z0-9-]/gi, '')}-${randomUUID()}.${extension}`;
  await FileSystem.writeAsStringAsync(uri, encoded, { encoding: FileSystem.EncodingType.Base64 });
  return {
    uri,
    release: () => {
      void FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    },
  };
}
export async function saveMediaBlob(blob: Blob, name: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Thiết bị chưa hỗ trợ mở tệp.');
  const result = await mediaBlobUri(
    blob,
    Date.now().toString(),
    name
      .split('.')
      .at(-1)
      ?.replace(/[^a-z0-9]/gi, '') || 'bin',
  );
  try {
    await Sharing.shareAsync(result.uri, {
      mimeType: blob.type || 'application/octet-stream',
      dialogTitle: name,
    });
  } finally {
    result.release();
  }
}
