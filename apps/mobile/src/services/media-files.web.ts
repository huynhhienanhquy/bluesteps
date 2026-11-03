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
  const file = source.file ?? (await (await fetch(source.uri)).blob());
  return { ...source, file, size: file.size };
}
export async function readMediaPart(source: MediaSource, offset: number, length: number) {
  if (!source.file) throw new Error('Không đọc được tệp đã chọn.');
  const bytes = new Uint8Array(await source.file.slice(offset, offset + length).arrayBuffer());
  let value = '';
  for (let start = 0; start < bytes.length; start += 8192)
    value += String.fromCharCode(...bytes.subarray(start, start + 8192));
  return btoa(value);
}
export async function mediaBlobUri(blob: Blob, _key: string, _extension: string) {
  const uri = URL.createObjectURL(blob);
  return { uri, release: () => URL.revokeObjectURL(uri) };
}
export async function saveMediaBlob(blob: Blob, name: string) {
  const { uri, release } = await mediaBlobUri(blob, '', '');
  const link = document.createElement('a');
  link.href = uri;
  link.download = name;
  link.click();
  setTimeout(release, 1000);
}
