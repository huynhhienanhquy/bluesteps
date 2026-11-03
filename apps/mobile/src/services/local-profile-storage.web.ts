export type AvatarSource = { uri: string; file?: Blob; mime?: string };
export async function readLocalProfile(key: string) {
  return localStorage.getItem(key);
}
export async function writeLocalProfile(key: string, value: string) {
  localStorage.setItem(key, value);
}
export async function removeLocalProfile(key: string) {
  localStorage.removeItem(key);
}
export function isLocalAvatar(_key: string, uri: string) {
  return /^data:image\/(jpeg|png|webp);base64,/.test(uri);
}
export async function releaseLocalAvatar(_key: string, _uri: string | null | undefined) {}
export async function persistLocalAvatar(_key: string, source: AvatarSource) {
  if (!source.file && !/^(blob:|data:image\/)/.test(source.uri))
    throw new Error('Chọn ảnh từ thiết bị của bạn.');
  const blob = source.file ?? (await (await fetch(source.uri)).blob());
  if (blob.size > 20 * 1024 * 1024 || blob.type === 'image/svg+xml')
    throw new Error('Chọn ảnh JPEG, PNG hoặc WebP nhỏ hơn 20 MB.');
  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const item = new globalThis.Image();
      item.onload = () => resolve(item);
      item.onerror = () => reject(new Error('Không đọc được ảnh đã chọn.'));
      item.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Trình duyệt chưa hỗ trợ chỉnh ảnh.');
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    if (!side) throw new Error('Ảnh đã chọn không hợp lệ.');
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, 512, 512);
    context.drawImage(
      image,
      (image.naturalWidth - side) / 2,
      (image.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      512,
      512,
    );
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}
