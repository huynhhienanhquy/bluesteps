import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Button, Label, Notice } from '../../design-system/ui';
import { useApp } from '../../providers';
import { type Schemas, errorMessage } from '../../services/api';
import { mediaBlobUri, saveMediaBlob } from '../../services/media-files';
import { useResource } from '../../services/queries';
import { QueryState } from './common';

export function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (player) => {
    player.loop = false;
    player.muted = true;
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  return (
    <>
      {status === 'error' ? (
        <Notice tone="error">Video không phát được trên thiết bị này.</Notice>
      ) : null}
      <VideoView
        accessibilityLabel="Video bài viết"
        player={player}
        nativeControls
        contentFit="contain"
        style={{ width: '100%', height: 220, borderRadius: 16 }}
      />
    </>
  );
}

export function AudioPreview({ uri }: { uri: string }) {
  const player = useAudioPlayer(uri);
  const state = useAudioPlayerStatus(player);
  return (
    <View style={{ gap: 8 }}>
      <Label>
        {Math.floor(state.currentTime ?? 0)} / {Math.ceil(state.duration ?? 0)} giây
      </Label>
      <Button
        title={state.playing ? 'Tạm dừng ghi âm' : 'Phát ghi âm'}
        variant="secondary"
        disabled={!state.isLoaded}
        onPress={() => {
          if (state.playing) player.pause();
          else {
            if (state.didJustFinish) void player.seekTo(0);
            player.play();
          }
        }}
      />
    </View>
  );
}

function MediaContent({
  asset,
  compact = false,
  context,
  imageHeight = 220,
  imageFit = 'contain',
}: {
  asset: Schemas['MediaAsset'];
  compact?: boolean;
  context: string;
  imageHeight?: number;
  imageFit?: 'contain' | 'cover';
}) {
  const { api, user, status } = useApp();
  const viewer = user?.id ?? 'guest';
  const query = useQuery({
    queryKey: ['private-media', viewer, asset.id],
    enabled: status !== 'loading',
    queryFn: ({ signal }) =>
      api.download(`/v1/media-assets/${asset.id}/content`, { signal }, status === 'authenticated'),
    gcTime: 0,
  });
  const [local, setLocal] = useState<{ viewer: string; uri: string } | null>(null);
  const [failure, setFailure] = useState('');
  useEffect(() => {
    if (!query.data || asset.kind === 'file') return;
    let active = true;
    let release: (() => void) | undefined;
    void mediaBlobUri(
      query.data,
      viewer + '-' + asset.id,
      asset.kind === 'audio'
        ? 'wav'
        : asset.kind === 'video'
          ? asset.mimeType === 'video/quicktime'
            ? 'mov'
            : asset.mimeType === 'video/webm'
              ? 'webm'
              : 'mp4'
          : 'jpg',
    )
      .then((result) => {
        release = result.release;
        if (active) setLocal({ viewer, uri: result.uri });
        else release();
      })
      .catch((error: unknown) => {
        if (active) setFailure(errorMessage(error));
      });
    return () => {
      active = false;
      release?.();
    };
  }, [query.data, viewer, asset.id, asset.kind, asset.mimeType]);
  return (
    <View style={{ gap: 8 }}>
      {!compact ? (
        <Label size={12}>
          {asset.fileName} · {(asset.size / 1024 / 1024).toFixed(2)} MB
        </Label>
      ) : null}
      <QueryState query={query}>
        {failure ? (
          <Notice tone="error">{failure}</Notice>
        ) : asset.kind === 'file' ? (
          <Button
            title={`Tải tệp ${asset.fileName}`}
            variant="secondary"
            onPress={() => {
              if (query.data)
                void saveMediaBlob(query.data, asset.fileName).catch((error: unknown) =>
                  setFailure(errorMessage(error)),
                );
            }}
          />
        ) : local?.viewer === viewer ? (
          asset.kind === 'audio' ? (
            <AudioPreview uri={local.uri} />
          ) : asset.kind === 'video' ? (
            <VideoPreview uri={local.uri} />
          ) : (
            <Image
              accessibilityLabel={`Ảnh ${context} ${asset.fileName}`}
              source={{ uri: local.uri }}
              resizeMode={imageFit}
              resizeMethod="resize"
              style={{
                width: '100%',
                height: imageHeight,
                borderRadius: imageHeight < 100 ? 8 : 16,
              }}
            />
          )
        ) : (
          <Label>Đang mở tệp…</Label>
        )}
      </QueryState>
    </View>
  );
}

export function AssetView({
  asset,
  compact = false,
  context,
  imageHeight,
  imageFit,
}: {
  asset: Schemas['MediaAsset'];
  compact?: boolean;
  context: string;
  imageHeight?: number;
  imageFit?: 'contain' | 'cover';
}) {
  const permission = useResource<Schemas['MediaAsset']>(`/v1/media-assets/${asset.id}`);
  // Recheck permissions on API invalidation; immutable bytes keep playing without a second download.
  return (
    <QueryState query={permission}>
      {permission.data ? (
        <MediaContent
          asset={permission.data}
          compact={compact}
          context={context}
          imageHeight={imageHeight}
          imageFit={imageFit}
        />
      ) : null}
    </QueryState>
  );
}

export function PostMedia({
  assets,
  gallery = false,
  context = 'bài viết',
}: {
  assets: Schemas['MediaAsset'][];
  gallery?: boolean;
  context?: string;
}) {
  const { user } = useApp();
  return (
    <View style={gallery ? { flexDirection: 'row', flexWrap: 'wrap', gap: 10 } : { gap: 16 }}>
      {assets.map((asset) => (
        <View
          key={`${user?.id ?? 'guest'}:${asset.id}`}
          style={{
            width:
              gallery &&
              asset.kind === 'image' &&
              assets.filter((item) => item.kind === 'image').length > 1
                ? '48%'
                : '100%',
          }}
        >
          <AssetView asset={asset} compact={gallery} context={context} />
        </View>
      ))}
    </View>
  );
}
