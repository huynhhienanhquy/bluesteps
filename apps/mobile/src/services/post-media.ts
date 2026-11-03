import type { ApiClient } from '../providers';
import type { Schemas } from './api';
import { prepareMedia, readMediaPart, type MediaSource } from './media-files';

export async function uploadPostMedia(
  api: ApiClient,
  input: MediaSource,
  signal: AbortSignal,
  progress: (bytes: number, total: number) => void,
): Promise<Schemas['MediaAsset']> {
  const source = await prepareMedia(input);
  if (source.size < 1 || source.size > 20971520)
    throw new Error('Mỗi tệp cần từ 1 byte đến 20 MB.');
  const state = await api.request<Schemas['UploadState']>('/v1/media-assets', {
    method: 'POST',
    signal,
    body: JSON.stringify({
      clientUploadId: source.clientUploadId,
      kind: source.kind,
      fileName: source.name.slice(0, 180),
      mimeType: source.mime.slice(0, 120),
      size: source.size,
    }),
  });
  if (state.completed && state.asset) return state.asset;
  let loaded = state.receivedParts.reduce(
    (sum, part) => sum + Math.min(state.partSize, source.size - part * state.partSize),
    0,
  );
  progress(loaded, source.size);
  for (let offset = 0, part = 0; offset < source.size; offset += state.partSize, part++) {
    if (state.receivedParts.includes(part)) continue;
    if (signal.aborted) throw new Error('Đã hủy tải tệp.');
    const length = Math.min(state.partSize, source.size - offset);
    const data = await readMediaPart(source, offset, length);
    await api.request(`/v1/media-assets/${state.id}/parts/${part}`, {
      method: 'PUT',
      signal,
      body: JSON.stringify({ data }),
    });
    loaded += length;
    progress(loaded, source.size);
  }
  return api.request<Schemas['MediaAsset']>(`/v1/media-assets/${state.id}/complete`, {
    method: 'POST',
    signal,
  });
}
