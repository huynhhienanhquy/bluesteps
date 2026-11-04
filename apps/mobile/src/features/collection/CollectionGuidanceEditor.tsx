import { useRef, useState } from 'react';
import { Button, Card, Field, Label, Notice } from '../../design-system/ui';
import { ApiError, type Schemas } from '../../services/api';
import { useCommand, usePages, useResource } from '../../services/queries';
import { CommandError, More, QueryState } from '../shared/common';
import { pointWebsite } from './point-website';

type Point = Schemas['CollectionPoint'];

export function CollectionGuidanceEditor() {
  const [search, setSearch] = useState(''),
    [id, setId] = useState<string | null>(null),
    [notice, setNotice] = useState('');
  const points = usePages<Point>(
    `/v1/collection-points?q=${encodeURIComponent(search.trim())}`,
    false,
    !id,
  );
  const point = useResource<Point>(`/v1/collection-points/${id}`, false, !!id);
  if (id)
    return (
      <QueryState query={point}>
        {point.data ? (
          <GuidanceForm
            key={id}
            point={point.data}
            reload={async () => {
              const refreshed = await point.refetch();
              if (refreshed.error || !refreshed.data)
                throw new Error('Chưa tải lại được thông tin điểm.');
              return refreshed.data;
            }}
            close={() => setId(null)}
            onSaved={() => {
              setId(null);
              setNotice('Đã cập nhật hướng dẫn bàn giao.');
            }}
          />
        ) : null}
      </QueryState>
    );
  return (
    <>
      {notice ? <Notice tone="success">{notice}</Notice> : null}
      <Field label="Tìm điểm thu gom" value={search} onChangeText={setSearch} maxLength={100} />
      <QueryState
        query={points}
        empty={points.data?.pages.every((page) => !page.items.length)}
        emptyText="Không tìm thấy điểm thu gom."
      >
        {points.data?.pages
          .flatMap((page) => page.items)
          .map((item) => (
            <Card key={item.id}>
              <Label bold>{item.name}</Label>
              <Label size={13}>{item.address}</Label>
              <Button
                title="Sửa hướng dẫn bàn giao"
                accessibilityLabel={`Sửa hướng dẫn ${item.name}`}
                variant="secondary"
                onPress={() => {
                  setNotice('');
                  setId(item.id);
                }}
              />
            </Card>
          ))}
        <More query={points} />
      </QueryState>
    </>
  );
}

function values(point: Point) {
  return {
    version: point.version,
    entrance: point.entranceLabel ?? '',
    instructions: point.handoverInstructions ?? '',
    phone: point.contactPhone ?? '',
    website: point.websiteUrl ?? '',
  };
}

function GuidanceForm({
  point,
  reload,
  close,
  onSaved,
}: {
  point: Point;
  reload: () => Promise<Point>;
  close: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState(() => values(point)),
    [reason, setReason] = useState('');
  const [refreshing, setRefreshing] = useState(false),
    [refreshError, setRefreshError] = useState('');
  const command = useCommand<Point>();
  const saving = useRef(false);
  const stale = command.error instanceof ApiError && command.error.status === 409;
  const busy = command.isPending || refreshing;
  const phone = draft.phone.trim(),
    validPhone = !phone || /^\+?[0-9]{7,15}$/.test(phone);
  const website = pointWebsite(draft.website);
  const validWebsite = !draft.website.trim() || !!website;
  async function refresh() {
    setRefreshing(true);
    setRefreshError('');
    try {
      setDraft(values(await reload()));
      setReason('');
      command.reset();
    } catch (cause) {
      setRefreshError(cause instanceof Error ? cause.message : 'Chưa tải lại được thông tin điểm.');
    } finally {
      setRefreshing(false);
    }
  }
  return (
    <>
      <Button title="Về danh sách điểm" variant="quiet" disabled={busy} onPress={close} />
      <Label bold size={18}>
        {point.name}
      </Label>
      <Label size={13}>{point.address}</Label>
      <Field
        label="Lối vào"
        maxLength={120}
        value={draft.entrance}
        editable={!busy}
        onChangeText={(entrance) => setDraft((value) => ({ ...value, entrance }))}
      />
      <Field
        label="Hướng dẫn bàn giao"
        maxLength={600}
        multiline
        value={draft.instructions}
        editable={!busy}
        onChangeText={(instructions) => setDraft((value) => ({ ...value, instructions }))}
      />
      <Field
        label="Số liên hệ công khai"
        maxLength={16}
        keyboardType="phone-pad"
        value={draft.phone}
        editable={!busy}
        onChangeText={(phone) => setDraft((value) => ({ ...value, phone }))}
        error={!validPhone ? 'Nhập 7 đến 15 chữ số, có thể bắt đầu bằng dấu +.' : undefined}
      />
      <Label size={12}>Để trống một mục để gỡ mục đó khỏi hướng dẫn công khai.</Label>
      <Field
        label="Website công khai của điểm"
        value={draft.website}
        editable={!busy}
        onChangeText={(website) => setDraft((value) => ({ ...value, website }))}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={2048}
        placeholder="https://"
        error={
          !validWebsite ? 'Nhập địa chỉ website bắt đầu bằng https:// hoặc http://.' : undefined
        }
      />
      <Field
        label="Lý do cập nhật"
        maxLength={1000}
        multiline
        value={reason}
        editable={!busy}
        onChangeText={setReason}
      />
      <CommandError error={command.error} />
      {refreshError ? <Notice tone="error">{refreshError}</Notice> : null}
      {stale ? (
        <>
          <Notice>Thông tin đã đổi. Tải lại để thay bản đang sửa bằng dữ liệu mới nhất.</Notice>
          <Button
            title="Tải lại thông tin điểm"
            variant="secondary"
            pending={refreshing}
            onPress={() => void refresh()}
          />
        </>
      ) : null}
      <Button
        title="Lưu hướng dẫn bàn giao"
        pending={command.isPending}
        disabled={busy || stale || !validPhone || !validWebsite || !reason.trim()}
        onPress={() => {
          if (saving.current || busy || stale || !validPhone || !validWebsite || !reason.trim())
            return;
          saving.current = true;
          void command
            .mutateAsync({
              path: `/v1/admin/collection-points/${point.id}/handover-guidance`,
              method: 'PATCH',
              body: {
                expectedVersion: draft.version,
                entranceLabel: draft.entrance.trim() || null,
                handoverInstructions: draft.instructions.trim() || null,
                contactPhone: phone || null,
                websiteUrl: website,
                reason: reason.trim(),
              },
            })
            .then(onSaved)
            .catch(() => {})
            .finally(() => {
              saving.current = false;
            });
        }}
      />
    </>
  );
}
