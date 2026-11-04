import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Chip, Field, Label, Notice, Screen } from '../../design-system/ui';
import { useApp } from '../../providers';
import { ApiError, dateLabel, type Page, type Schemas } from '../../services/api';
import { useCommand, usePages, useResource } from '../../services/queries';
import { CommandError, More, QueryState, RequireAuth } from '../shared/common';
import { PostMedia } from '../community/PostMedia';
import { PointMap } from './PointMap';
import { CollectionGuidanceEditor } from './CollectionGuidanceEditor';

type Proposal = Schemas['ProposalDetail'];
type Report = Schemas['ReportDetail'];
type Submission = Proposal | Report;
type Kind = 'proposals' | 'reports';
type Decision = Schemas['ReviewDecision']['decision'];
const issues: Record<Report['issueTypes'][number], string> = {
  closed: 'Điểm đóng cửa',
  full: 'Điểm đã đầy',
  wrong_address: 'Sai địa chỉ',
  unsupported_material: 'Không nhận vật liệu đã công bố',
  unsafe: 'Không an toàn',
  other: 'Vấn đề khác',
};

export function CollectionModerationScreen() {
  const { user } = useApp();
  return (
    <Screen title="Xét duyệt điểm thu gom" back>
      <RequireAuth>
        <ModerationAccess key={user?.id} />
      </RequireAuth>
    </Screen>
  );
}

function ModerationAccess() {
  const access = useResource<{ allowed: boolean }>('/v1/me/collection-moderation', true);
  const [guidance, setGuidance] = useState(false);
  return (
    <QueryState query={access}>
      {access.data?.allowed ? (
        guidance ? (
          <>
            <Button
              title="Về hàng chờ xét duyệt"
              variant="quiet"
              onPress={() => setGuidance(false)}
            />
            <CollectionGuidanceEditor />
          </>
        ) : (
          <ModerationQueue openGuidance={() => setGuidance(true)} />
        )
      ) : (
        <Notice>Tài khoản này chưa có quyền xét duyệt.</Notice>
      )}
    </QueryState>
  );
}

function ModerationQueue({ openGuidance }: { openGuidance: () => void }) {
  const [kind, setKind] = useState<Kind>('proposals');
  const [selected, setSelected] = useState<Submission | null>(null);
  const [result, setResult] = useState('');
  const query = usePages<Submission>(`/v1/admin/collection-submissions/${kind}`, true);
  return (
    <>
      {!selected ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip
            label="Đề xuất điểm"
            selected={kind === 'proposals'}
            onPress={() => {
              setKind('proposals');
              setSelected(null);
              setResult('');
            }}
          />
          <Chip
            label="Báo cáo sự cố"
            selected={kind === 'reports'}
            onPress={() => {
              setKind('reports');
              setSelected(null);
              setResult('');
            }}
          />
          <Chip label="Hướng dẫn bàn giao" selected={false} onPress={openGuidance} />
        </View>
      ) : null}
      {result ? <Notice tone="success">{result}</Notice> : null}
      {selected ? (
        <ReviewSubmission
          key={selected.id}
          item={selected}
          close={() => {
            setSelected(null);
            void query.refetch();
          }}
          onDecision={(decision) => {
            setSelected(null);
            setResult(
              decision === 'reject'
                ? 'Đã từ chối hồ sơ.'
                : kind === 'proposals'
                  ? 'Đã duyệt và công bố điểm thu gom.'
                  : 'Đã chấp nhận báo cáo.',
            );
          }}
        />
      ) : (
        <QueryState
          query={query}
          empty={query.data?.pages.every((page) => !page.items.length)}
          emptyText="Không có hồ sơ chờ duyệt."
        >
          {query.data?.pages
            .flatMap((page) => page.items)
            .map((item) => (
              <Card key={item.id}>
                <Label bold>
                  {'name' in item
                    ? item.name
                    : item.issueTypes.map((issue) => issues[issue]).join(', ')}
                </Label>
                <Label size={13}>{'address' in item ? item.address : item.description}</Label>
                <Label size={12}>
                  {dateLabel(
                    'submittedAt' in item && item.submittedAt ? item.submittedAt : item.createdAt,
                  )}{' '}
                  · {item.media?.length ?? 0} ảnh
                </Label>
                <Button
                  title="Xem hồ sơ"
                  accessibilityLabel={`Xem hồ sơ ${item.id}`}
                  variant="secondary"
                  onPress={() => {
                    setSelected(item);
                    setResult('');
                  }}
                />
              </Card>
            ))}
          <More query={query} />
        </QueryState>
      )}
    </>
  );
}

function ReviewSubmission({
  item,
  close,
  onDecision,
}: {
  item: Submission;
  close: () => void;
  onDecision: (decision: Decision) => void;
}) {
  const [reason, setReason] = useState(''),
    [decision, setDecision] = useState<Decision | null>(null);
  const command = useCommand<Schemas['ReviewResult']>();
  const isProposal = 'name' in item;
  const pointId = 'pointId' in item ? item.pointId : undefined;
  const point = useResource<Schemas['CollectionPoint']>(
    `/v1/collection-points/${pointId}`,
    false,
    !!pointId,
  );
  const materials = useResource<Page<Schemas['MaterialRef']>>(
    '/v1/waste-materials?limit=100',
    false,
    isProposal,
  );
  const stale = command.error instanceof ApiError && command.error.status === 409;
  function submit() {
    if (!decision || !reason.trim() || stale || command.isPending) return;
    const target = isProposal ? 'point-proposals' : 'point-reports';
    void command
      .mutateAsync({
        path: `/v1/admin/${target}/${item.id}/decision`,
        body: { decision, reason: reason.trim(), expectedVersion: item.version },
      })
      .then(() => onDecision(decision))
      .catch(() => {});
  }
  return (
    <>
      <Button
        title="Về danh sách chờ duyệt"
        variant="quiet"
        disabled={command.isPending}
        onPress={close}
      />
      {isProposal ? (
        <>
          <Label bold size={18}>
            {item.name}
          </Label>
          <Label>{item.address}</Label>
          {item.hours ? <Label size={13}>Giờ tiếp nhận · {item.hours}</Label> : null}
          <Label size={13}>
            Vật liệu ·{' '}
            {item.materialIds
              .map((id) => materials.data?.items.find((material) => material.id === id)?.name ?? id)
              .join(', ')}
          </Label>
          <View style={{ height: 180, borderRadius: 16, overflow: 'hidden' }}>
            <PointMap coordinate={item} controls />
          </View>
          <Notice>Duyệt hồ sơ sẽ công bố một điểm thu gom mới từ thông tin đã gửi.</Notice>
          <Label size={12}>
            {item.publishPhotos
              ? 'Người đề xuất cho phép công bố ảnh địa điểm sau khi duyệt.'
              : 'Người đề xuất chỉ gửi ảnh để xét duyệt.'}
          </Label>
        </>
      ) : (
        <>
          <Label bold size={18}>
            {item.issueTypes.map((issue) => issues[issue]).join(', ')}
          </Label>
          <Label>{item.description}</Label>
          <Label size={13}>Ghi nhận lúc {dateLabel(item.observedAt)}</Label>
          {point.data ? (
            <Button
              title={`Xem điểm ${point.data.name}`}
              variant="quiet"
              onPress={() =>
                router.push({ pathname: '/points/[id]', params: { id: item.pointId } })
              }
            />
          ) : null}
          <Notice>
            Chấp nhận báo cáo ghi nhận kết quả xét duyệt. Trạng thái vận hành của điểm được cập nhật
            riêng.
          </Notice>
        </>
      )}
      <Label bold>Ảnh bằng chứng</Label>
      {item.media?.length ? (
        <PostMedia assets={item.media} gallery context="bằng chứng thu gom" />
      ) : (
        <Label size={13}>Hồ sơ không có ảnh đính kèm.</Label>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip
          label={isProposal ? 'Duyệt và công bố' : 'Chấp nhận báo cáo'}
          selected={decision === 'approve'}
          disabled={command.isPending || stale}
          onPress={() => setDecision('approve')}
        />
        <Chip
          label="Từ chối"
          selected={decision === 'reject'}
          disabled={command.isPending || stale}
          onPress={() => setDecision('reject')}
        />
      </View>
      <Field
        label="Lý do xét duyệt"
        value={reason}
        onChangeText={setReason}
        maxLength={2000}
        multiline
        editable={!command.isPending && !stale}
      />
      <CommandError error={command.error} />
      {stale ? (
        <Notice>Hồ sơ đã thay đổi. Về danh sách để mở lại phiên bản hiện tại.</Notice>
      ) : null}
      <Button
        title="Xác nhận quyết định"
        variant={decision === 'reject' ? 'danger' : 'primary'}
        pending={command.isPending}
        disabled={!decision || !reason.trim() || stale}
        onPress={submit}
      />
    </>
  );
}
