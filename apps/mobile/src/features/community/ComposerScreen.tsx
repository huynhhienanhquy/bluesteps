import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, View } from 'react-native';
import { PrivateModal as Modal } from '../shared/PrivateModal';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Card, Field, Label, Notice, Row, Search } from '../../design-system/ui';
import { useApp } from '../../providers';
import { errorMessage, operationKey, type Schemas } from '../../services/api';
import { useCommand, usePages, useResource } from '../../services/queries';
import type { MediaSource } from '../../services/media-files';
import { uploadPostMedia } from '../../services/post-media';
import { CommunityPage } from './CommunityScreens';
import { CommandError, More, QueryState, RequireAuth } from '../shared/common';
import { ComposerSheet } from './ComposerSheet';
import { PostMedia } from './PostMedia';
import { PostPreview } from './PostPreview';
import { ScanCapture } from '../scan/ScanCapture';
import { audiences, emotionLabel, emotions } from './post-options';

type Form = Omit<Schemas['PostDraft']['content'], 'mediaIds'> & { mediaIds: string[] };
type Asset = Schemas['MediaAsset'];
type Upload = { source: MediaSource; progress: number; error?: string };

export function ComposerScreen() {
  const { id, posted, edited } = useLocalSearchParams<{
    id?: string;
    posted?: string;
    edited?: string;
  }>();
  const { user } = useApp();
  return (
    <RequireAuth>
      {posted ? (
        <Posted id={posted} edited={edited === '1'} />
      ) : (
        <ComposerForm key={`${user?.id}:${id ?? 'new'}`} id={id} />
      )}
    </RequireAuth>
  );
}

function Posted({ id, edited }: { id: string; edited: boolean }) {
  const query = useResource<Schemas['Post']>(`/v1/posts/${id}`, true);
  const { user } = useApp();
  return (
    <CommunityPage
      title={
        query.data && query.data.userId === user?.id
          ? edited
            ? 'Đã lưu bài viết'
            : 'Đăng bài thành công'
          : 'Bài viết'
      }
      light
    >
      <QueryState query={query}>
        {query.data && query.data.userId === user?.id ? (
          <Card>
            <Label bold size={24}>
              {edited ? 'Đã lưu bài viết' : 'Đăng bài thành công'}
            </Label>
            <Label>{audiences[query.data.visibility]}</Label>
            <Button
              title="Xem bài viết"
              onPress={() => router.replace({ pathname: '/discussion', params: { id } })}
            />
            <Button
              title="Về cộng đồng"
              variant="secondary"
              onPress={() => router.replace('/community')}
            />
          </Card>
        ) : (
          <Notice tone="error">Không tìm thấy bài viết của bạn.</Notice>
        )}
      </QueryState>
    </CommunityPage>
  );
}

function ComposerForm({ id }: { id?: string }) {
  const { sheet } = useLocalSearchParams<{ sheet?: string }>();
  const { api, user } = useApp();
  const client = useQueryClient();
  const existing = useResource<Schemas['Post']>(`/v1/posts/${id}`, true, !!id);
  const draft = useResource<Schemas['PostDraft']>('/v1/me/post-draft', true, !id);
  const [model, setModel] = useState<Form | null>(null);
  const [assets, setAssets] = useState<Record<string, Asset>>({});
  const [version, setVersion] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [uploads, setUploads] = useState<Upload[]>([]);
  const controllers = useRef(new Map<string, AbortController>());
  const sourcePositions = useRef(new Map<string, number>());
  const assetPositions = useRef(new Map<string, number>());
  const nextPosition = useRef(0);
  const alive = useRef(true),
    revision = useRef(0),
    initialized = useRef(false);
  const command = useCommand<Schemas['Post']>();
  const save = useCommand<Schemas['PostDraft']>();
  const discard = useCommand();
  const [emotionSearch, setEmotionSearch] = useState('');
  const [placeSearch, setPlaceSearch] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [placeAddress, setPlaceAddress] = useState('');
  const points = usePages<Schemas['CollectionPoint']>(
    `/v1/collection-points?q=${encodeURIComponent(placeSearch)}`,
    false,
    sheet === 'place',
  );
  const library = usePages<Schemas['MediaLibraryItem']>(
    '/v1/me/media-assets',
    true,
    sheet === 'library',
  );
  useEffect(() => {
    alive.current = true;
    const current = controllers.current;
    return () => {
      alive.current = false;
      for (const controller of current.values()) controller.abort();
    };
  }, []);
  useEffect(() => {
    if (initialized.current) return;
    const source = id ? existing.data : draft.data;
    if (!source) return;
    if (id) {
      const post = source as Schemas['Post'];
      setModel({
        body: post.body,
        visibility: post.visibility,
        topic: post.topic ?? null,
        emotion: post.emotion ?? null,
        place: post.place ?? null,
        mediaIds: post.media.map((asset) => asset.id),
      });
    } else {
      const content = (source as Schemas['PostDraft']).content;
      setModel({ ...content, mediaIds: content.mediaIds ?? [] });
    }
    setVersion(source.version);
    setAssets(Object.fromEntries(source.media.map((asset) => [asset.id, asset])));
    source.media.forEach((asset, index) => assetPositions.current.set(asset.id, index));
    nextPosition.current = source.media.length;
    initialized.current = true;
  }, [id, existing.data, draft.data]);
  function change<K extends keyof Form>(field: K, value: Form[K]) {
    revision.current++;
    setDirty(true);
    setNotice('');
    setModel((current) => (current ? { ...current, [field]: value } : current));
  }
  function removeMedia(id: string) {
    revision.current++;
    setDirty(true);
    setNotice('');
    setModel((current) =>
      current
        ? { ...current, mediaIds: current.mediaIds.filter((value) => value !== id) }
        : current,
    );
  }
  const close = () => router.setParams({ sheet: undefined });
  const open = (sheet: string) => {
    Keyboard.dismiss();
    setError('');
    router.setParams({ sheet });
  };
  const busy = uploads.some((upload) => !upload.error) || command.isPending || save.isPending;
  const failed = uploads.some((upload) => !!upload.error);
  const canPost = !!model && (!!model.body.trim() || !!model.mediaIds.length) && !busy && !failed;
  async function runUpload(source: MediaSource) {
    const controller = new AbortController();
    controllers.current.set(source.clientUploadId, controller);
    setUploads((values) =>
      values.map((value) =>
        value.source.clientUploadId === source.clientUploadId ? { source, progress: 0 } : value,
      ),
    );
    try {
      const asset = await uploadPostMedia(api, source, controller.signal, (loaded, total) => {
        if (alive.current && !controller.signal.aborted)
          setUploads((values) =>
            values.map((value) =>
              value.source.clientUploadId === source.clientUploadId
                ? { source, progress: Math.round((loaded / total) * 100) }
                : value,
            ),
          );
      });
      if (alive.current && !controller.signal.aborted) {
        assetPositions.current.set(
          asset.id,
          sourcePositions.current.get(source.clientUploadId) ?? nextPosition.current++,
        );
        setAssets((values) => ({ ...values, [asset.id]: asset }));
        setModel((current) =>
          current
            ? {
                ...current,
                mediaIds: [...new Set([...current.mediaIds, asset.id])].sort(
                  (first, second) =>
                    (assetPositions.current.get(first) ?? 0) -
                    (assetPositions.current.get(second) ?? 0),
                ),
              }
            : current,
        );
        revision.current++;
        setDirty(true);
        setNotice('');
        setUploads((values) =>
          values.filter((value) => value.source.clientUploadId !== source.clientUploadId),
        );
        void client.invalidateQueries({
          queryKey: ['api', user?.id, 'pages', '/v1/me/media-assets'],
        });
      }
    } catch (cause) {
      if (alive.current && !controller.signal.aborted)
        setUploads((values) =>
          values.map((value) =>
            value.source.clientUploadId === source.clientUploadId
              ? { source, progress: value.progress, error: errorMessage(cause) }
              : value,
          ),
        );
    } finally {
      controllers.current.delete(source.clientUploadId);
    }
  }
  function addSources(sources: MediaSource[]) {
    if (!alive.current) return;
    if ((model?.mediaIds.length ?? 0) + uploads.length + sources.length > 10) {
      setError('Tối đa 10 tệp trong một bài viết.');
      return;
    }
    setUploads((values) => [...values, ...sources.map((source) => ({ source, progress: 0 }))]);
    for (const source of sources)
      sourcePositions.current.set(source.clientUploadId, nextPosition.current++);
    for (const source of sources) void runUpload(source);
  }
  async function pickMedia() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.8,
      });
      if (!result.canceled && alive.current) {
        close();
        addSources(
          result.assets.map((asset) => ({
            uri: asset.uri,
            name: asset.fileName ?? (asset.type === 'video' ? 'video.mp4' : 'photo.jpg'),
            mime: asset.mimeType ?? (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
            kind: asset.type === 'video' ? 'video' : 'image',
            size: asset.fileSize,
            file: asset.file,
            clientUploadId: operationKey(),
          })),
        );
      }
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }
  async function pickFiles() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (!result.canceled)
        addSources(
          result.assets.map((asset) => ({
            uri: asset.uri,
            name: asset.name,
            mime: asset.mimeType ?? 'application/octet-stream',
            kind: asset.mimeType?.startsWith('image/')
              ? 'image'
              : asset.mimeType?.startsWith('video/')
                ? 'video'
                : 'file',
            size: asset.size,
            file: asset.file,
            clientUploadId: operationKey(),
          })),
        );
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }
  function saveDraft() {
    if (!model) return;
    const currentRevision = revision.current;
    void save
      .mutateAsync({
        path: '/v1/me/post-draft',
        method: 'PUT',
        body: { content: model, expectedVersion: version },
      })
      .then((saved) => {
        if (alive.current) {
          setVersion(saved.version);
          if (currentRevision === revision.current) setDirty(false);
          setNotice('Đã lưu bản nháp trong tài khoản');
        }
      })
      .catch(() => {});
  }
  function publish() {
    if (!model || !canPost) return;
    void command
      .mutateAsync({
        path: id ? `/v1/posts/${id}` : '/v1/posts',
        method: id ? 'PATCH' : 'POST',
        body: {
          ...model,
          topic: model.topic?.trim() || null,
          ...(id ? { expectedVersion: version } : version > 0 ? { draftVersion: version } : {}),
        },
      })
      .then((post) => {
        if (!alive.current) return;
        router.replace({
          pathname: '/compose',
          params: { posted: post.id, ...(id ? { edited: '1' } : {}) },
        });
      })
      .catch(() => {});
  }
  const ordered =
    model?.mediaIds.map((id) => assets[id]).filter((asset): asset is Asset => !!asset) ?? [];
  const query = id ? existing : draft;
  return (
    <CommunityPage
      title={id ? 'Sửa bài viết' : 'Tạo bài viết'}
      light
      action={
        <Button
          title="ĐĂNG"
          variant="quiet"
          accessibilityLabel={id ? 'Lưu bài viết' : 'Đăng bài viết'}
          disabled={!canPost}
          pending={command.isPending}
          onPress={publish}
        />
      }
    >
      <QueryState query={query}>
        {model ? (
          <>
            <Row style={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Label bold size={18}>
                {user?.displayName}
              </Label>
              <Button
                title={audiences[model.visibility]}
                variant="secondary"
                onPress={() => open('audience')}
              />
            </Row>
            {model.emotion ? (
              <Row>
                <Label>{emotionLabel(model.emotion)}</Label>
                <Button
                  title="Gỡ cảm xúc"
                  variant="quiet"
                  onPress={() => change('emotion', null)}
                />
              </Row>
            ) : null}
            {model.place ? (
              <Card>
                <Label>📍 {model.place.name}</Label>
                <Label size={12}>{model.place.address}</Label>
                <Button title="Gỡ địa điểm" variant="quiet" onPress={() => change('place', null)} />
              </Card>
            ) : null}
            <Field
              label="Nội dung bài viết"
              value={model.body}
              onChangeText={(value) => change('body', value)}
              multiline
              maxLength={5000}
            />
            <Label size={12}>{model.body.length}/5000</Label>
            <Field
              label="Chủ đề bài viết (không bắt buộc)"
              value={model.topic ?? ''}
              onChangeText={(value) => change('topic', value || null)}
              maxLength={80}
            />
            <Label bold>Thêm vào bài đăng của bạn</Label>
            <Row style={{ flexWrap: 'wrap' }}>
              <Button
                title="Ảnh/Video"
                icon="images-outline"
                variant="secondary"
                disabled={command.isPending}
                onPress={() => void pickMedia()}
              />
              <Button
                title="Check in"
                icon="location-outline"
                variant="secondary"
                onPress={() => {
                  setPlaceName(model.place?.name ?? '');
                  setPlaceAddress(model.place?.address ?? '');
                  open('place');
                }}
              />
              <Button
                title="Camera"
                icon="camera-outline"
                variant="secondary"
                onPress={() => open('camera')}
              />
              <Button
                title="Cảm xúc"
                icon="happy-outline"
                variant="secondary"
                onPress={() => open('emotion')}
              />
              <Button
                title="Chọn nhiều file"
                icon="attach-outline"
                variant="secondary"
                onPress={() => void pickFiles()}
              />
            </Row>
            <Label size={12}>Tối đa 10 tệp, mỗi tệp 20 MB.</Label>
            {uploads.map((upload) => (
              <Card key={upload.source.clientUploadId}>
                <Label>{upload.source.name}</Label>
                {upload.source.kind === 'image' ? (
                  <Image
                    accessibilityLabel="Ảnh đang tải"
                    source={{ uri: upload.source.uri }}
                    resizeMode="contain"
                    style={{ height: 180, width: '100%' }}
                  />
                ) : null}
                <Label>
                  {upload.error
                    ? 'Tải tệp chưa hoàn tất'
                    : upload.progress === 100
                      ? 'Đang xử lý tệp…'
                      : `Đang tải ${upload.progress}%`}
                </Label>
                {upload.error ? (
                  <>
                    <Notice tone="error">{upload.error}</Notice>
                    <Button
                      title={'Thử tải lại ' + upload.source.name}
                      onPress={() => void runUpload(upload.source)}
                    />
                  </>
                ) : null}
                <Button
                  title={'Hủy tải ' + upload.source.name}
                  variant="quiet"
                  onPress={() => {
                    controllers.current.get(upload.source.clientUploadId)?.abort();
                    controllers.current.delete(upload.source.clientUploadId);
                    setUploads((values) =>
                      values.filter(
                        (value) => value.source.clientUploadId !== upload.source.clientUploadId,
                      ),
                    );
                  }}
                />
              </Card>
            ))}
            {ordered.map((asset, index) => (
              <Card key={asset.id}>
                <PostMedia assets={[asset]} />
                <Row style={{ flexWrap: 'wrap' }}>
                  <Button
                    title={'Gỡ tệp ' + asset.fileName}
                    variant="quiet"
                    onPress={() => removeMedia(asset.id)}
                  />
                  {index > 0 ? (
                    <Button
                      title={'Đưa tệp lên trước ' + asset.fileName}
                      variant="quiet"
                      disabled={busy}
                      onPress={() => {
                        const ids = [...model.mediaIds];
                        [ids[index - 1], ids[index]] = [ids[index]!, ids[index - 1]!];
                        ids.forEach((id, position) => assetPositions.current.set(id, position));
                        change('mediaIds', ids);
                      }}
                    />
                  ) : null}
                </Row>
              </Card>
            ))}
            <Button title="Tệp đã tải lên" variant="quiet" onPress={() => open('library')} />
            {!id ? (
              <>
                <Label size={12}>
                  {dirty
                    ? 'Bản nháp có thay đổi chưa lưu'
                    : version
                      ? 'Bản nháp đã lưu trong tài khoản'
                      : 'Bản nháp mới'}
                </Label>
                <Button
                  title="Lưu bản nháp"
                  variant="secondary"
                  disabled={busy}
                  pending={save.isPending}
                  onPress={saveDraft}
                />
                {version > 0 ? (
                  <Button
                    title="Xóa bản nháp đã lưu"
                    variant="quiet"
                    disabled={busy}
                    onPress={() => open('discard')}
                  />
                ) : null}
              </>
            ) : null}
            <Button
              title="Xem trước"
              variant="secondary"
              disabled={busy || failed || (!model.body.trim() && !model.mediaIds.length)}
              onPress={() => open('preview')}
            />
            {notice ? <Notice tone="success">{notice}</Notice> : null}
            {error ? <Notice tone="error">{error}</Notice> : null}
            <CommandError error={command.error} />
            <CommandError error={save.error} />
            <ComposerSheet
              title="Ai có thể xem bài viết của bạn"
              visible={sheet === 'audience'}
              close={close}
            >
              {Object.entries(audiences).map(([key, label]) => (
                <Button
                  key={key}
                  title={label}
                  variant={model.visibility === key ? 'primary' : 'quiet'}
                  onPress={() => {
                    change('visibility', key as Form['visibility']);
                    close();
                  }}
                />
              ))}
              <Label size={13}>
                Bạn bè là những người đã chấp nhận lời mời kết bạn. Theo dõi không tự cấp quyền xem.
              </Label>
            </ComposerSheet>
            <ComposerSheet
              title="Bạn đang cảm thấy thế nào?"
              visible={sheet === 'emotion'}
              close={close}
            >
              <Search
                placeholder="Tìm cảm xúc"
                value={emotionSearch}
                onChangeText={setEmotionSearch}
              />
              <Row style={{ flexWrap: 'wrap' }}>
                {emotions
                  .filter(([, label]) =>
                    label.toLocaleLowerCase().includes(emotionSearch.toLocaleLowerCase()),
                  )
                  .map(([code, label, emoji]) => (
                    <View key={code} style={{ width: '46%' }}>
                      <Button
                        title={`${emoji} ${label}`}
                        variant={model.emotion === code ? 'primary' : 'quiet'}
                        onPress={() => {
                          change('emotion', code);
                          close();
                        }}
                      />
                    </View>
                  ))}
              </Row>
            </ComposerSheet>
            <ComposerSheet title="Bạn đang ở đâu?" visible={sheet === 'place'} close={close}>
              <Search
                value={placeSearch}
                onChangeText={setPlaceSearch}
                placeholder="Tìm địa điểm"
              />
              <QueryState
                query={points}
                empty={!points.data?.pages[0]?.items.length}
                emptyText="Chưa tìm thấy địa điểm trong hệ thống"
              >
                {points.data?.pages
                  .flatMap((page) => page.items)
                  .map((point) => (
                    <Button
                      key={point.id}
                      title={point.name}
                      variant="quiet"
                      onPress={() => {
                        change('place', {
                          name: point.name,
                          address: point.address,
                          pointId: point.id,
                        });
                        close();
                      }}
                    />
                  ))}
                <More query={points} />
              </QueryState>
              <Label bold>Tự nhập địa điểm</Label>
              <Field
                label="Tên địa điểm"
                value={placeName}
                onChangeText={setPlaceName}
                maxLength={180}
              />
              <Field
                label="Địa chỉ địa điểm"
                value={placeAddress}
                onChangeText={setPlaceAddress}
                maxLength={300}
              />
              <Button
                title="Chọn địa điểm này"
                disabled={!placeName.trim()}
                onPress={() => {
                  change('place', {
                    name: placeName.trim(),
                    address: placeAddress.trim(),
                    pointId: null,
                  });
                  close();
                }}
              />
            </ComposerSheet>
            <ComposerSheet title="Tệp đã tải lên" visible={sheet === 'library'} close={close}>
              <Button title="Làm mới tệp" variant="quiet" onPress={() => void library.refetch()} />
              <QueryState
                query={library}
                empty={!library.data?.pages[0]?.items.length}
                emptyText="Chưa có tệp đã tải lên"
              >
                {library.data?.pages
                  .flatMap((page) => page.items)
                  .map((asset) => (
                    <Card key={asset.id}>
                      <Label>
                        {asset.fileName} · {(asset.size / 1024 / 1024).toFixed(2)} MB
                      </Label>
                      <Label>{asset.completed ? 'Đã tải xong' : 'Chưa tải xong'}</Label>
                      {asset.completed ? (
                        <Button
                          title={'Chọn tệp ' + asset.fileName}
                          disabled={
                            model.mediaIds.includes(asset.id) || model.mediaIds.length >= 10
                          }
                          onPress={() => {
                            setAssets((values) => ({ ...values, [asset.id]: asset }));
                            assetPositions.current.set(asset.id, nextPosition.current++);
                            change('mediaIds', [...model.mediaIds, asset.id]);
                            close();
                          }}
                        />
                      ) : null}
                      {!asset.inUse ? (
                        <Button
                          title={'Xóa tệp ' + asset.fileName}
                          variant="danger"
                          pending={discard.isPending}
                          onPress={() => {
                            void discard
                              .mutateAsync({
                                path: `/v1/media-assets/${asset.id}`,
                                method: 'DELETE',
                              })
                              .then(() => {
                                if (!alive.current) return;
                                removeMedia(asset.id);
                                setAssets((values) => {
                                  const remaining = { ...values };
                                  delete remaining[asset.id];
                                  return remaining;
                                });
                              })
                              .catch(() => {});
                          }}
                        />
                      ) : (
                        <Label size={12}>Đang dùng trong bài viết hoặc bản nháp</Label>
                      )}
                    </Card>
                  ))}
                <More query={library} />
              </QueryState>
              <CommandError error={discard.error} />
            </ComposerSheet>
            <ComposerSheet title="Xóa bản nháp đã lưu?" visible={sheet === 'discard'} close={close}>
              <Notice tone="warning">Nội dung đã lưu sẽ được gỡ khỏi tài khoản.</Notice>
              <Button
                title="Xác nhận xóa bản nháp"
                variant="danger"
                pending={discard.isPending}
                onPress={() => {
                  void discard
                    .mutateAsync({
                      path: `/v1/me/post-draft?expected_version=${version}`,
                      method: 'DELETE',
                    })
                    .then(() => {
                      if (!alive.current) return;
                      setVersion(0);
                      setDirty(true);
                      close();
                      setNotice('Đã xóa bản nháp đã lưu');
                    })
                    .catch(() => {});
                }}
              />
              <CommandError error={discard.error} />
            </ComposerSheet>
            <PostPreview
              visible={sheet === 'preview'}
              content={model}
              assets={ordered}
              close={close}
              publish={publish}
              pending={command.isPending}
              disabled={!canPost}
              error={command.error}
            />
            <Modal visible={sheet === 'camera'} animationType="slide" onRequestClose={close}>
              <ScanCapture
                mode="post"
                onImage={(uri) => {
                  close();
                  addSources([
                    {
                      uri,
                      kind: 'image',
                      mime: 'image/jpeg',
                      name: 'camera.jpg',
                      clientUploadId: operationKey(),
                    },
                  ]);
                }}
                onClose={close}
                onPick={() => void pickMedia()}
              />
            </Modal>
            <Modal visible={command.isPending} transparent animationType="fade">
              <View
                style={{
                  flex: 1,
                  backgroundColor: '#FFFFFFEE',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 24,
                  gap: 18,
                }}
              >
                <ActivityIndicator />
                <Label bold>Đang đăng bài viết…</Label>
                <Label>Vui lòng chờ trong giây lát</Label>
              </View>
            </Modal>
          </>
        ) : (
          <Label>Đang mở bản nháp…</Label>
        )}
      </QueryState>
    </CommunityPage>
  );
}
