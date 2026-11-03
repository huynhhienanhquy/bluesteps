import { prepareMedia, readMediaPart } from './media-files';

const maxImageBytes = 8 * 1024 * 1024;

export async function scanImageBase64(uri: string, imageId: string): Promise<string> {
  const source = await prepareMedia({
    uri,
    name: 'scan-image',
    mime: 'image/jpeg',
    kind: 'image',
    clientUploadId: imageId,
  });
  if (!source.size || source.size > maxImageBytes)
    throw new Error('Vui lòng chọn ảnh có dung lượng tối đa 8 MB.');
  return readMediaPart(source, 0, source.size);
}
