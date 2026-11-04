import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Artwork, StatusSpace } from '../../design-system/DesignScreen';
import { Button, Card, Chip, Field, Icon, Label, Notice, Typography } from '../../design-system/ui';
import { useApp } from '../../providers';
import { dateLabel, type Schemas } from '../../services/api';
import { useCommand, usePages, useResource } from '../../services/queries';
import { useForegroundLocation } from '../../services/foreground-location';
import { CommandError, More, QueryState, RequireAuth } from '../shared/common';
import { PointMap } from './PointMap';
import { CollectionPhotos } from './CollectionPhotos';
import { PostMedia } from '../community/PostMedia';

type Photo = Schemas['MediaAsset'];
type Proposal = Schemas['ProposalDetail'];
const art = {
  brand: require('../../../assets/icons/collection/forms/brand.png'),
  info: require('../../../assets/icons/collection/forms/info.svg'),
  check: require('../../../assets/icons/collection/forms/check.svg'),
  clock: require('../../../assets/icons/collection/forms/clock.svg'),
  pin: require('../../../assets/icons/collection/forms/pin.svg'),
};
const states = {
  draft: 'Bản nháp',
  submitted: 'Đang chờ xét duyệt',
  approved: 'Đã duyệt',
  rejected: 'Không được duyệt',
};
const reportIssues = {
  full: 'Thùng rác đã đầy',
  wrong_address: 'Vị trí trên bản đồ chưa đúng',
  unsupported_material: 'Không tiếp nhận loại rác đã công bố',
  closed: 'Điểm đóng cửa hoặc ngừng hoạt động',
  other: 'Vấn đề khác',
  unsafe: 'Điểm có vấn đề về an toàn',
};
type ReportIssue = keyof typeof reportIssues;

function FormPage({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <Typography.Provider value="inter">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      >
        <StatusSpace />
        <View
          style={{
            paddingHorizontal: 24,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/collection'))}
            style={{ width: 24, height: 36, justifyContent: 'center' }}
          >
            <Icon name="chevron-back" color="#172B3D" />
          </Pressable>
          <Label heading bold size={18} color="#172B3D" style={{ flex: 1 }}>
            {title}
          </Label>
          <Artwork source={art.brand} width={32} height={32} />
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 24, paddingTop: 18, paddingBottom: 40, gap: 20 }}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Typography.Provider>
  );
}
function Info({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View
      style={{
        backgroundColor: '#EDF7FC',
        borderRadius: 14,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      <Artwork source={art.info} width={20} height={20} />
      <View style={{ flex: 1, gap: 4 }}>
        <Label size={14} color="#147CC1">
          {title}
        </Label>
        <Label size={12} color="#677C8C">
          {children}
        </Label>
      </View>
    </View>
  );
}
function Check({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      aria-checked={selected}
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={{ flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 32 }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderWidth: 1.5,
          borderColor: selected ? '#147CC1' : '#DEEBF3',
          backgroundColor: selected ? '#147CC1' : '#FFFFFF',
          borderRadius: 6,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? <Artwork source={art.check} width={15} height={15} /> : null}
      </View>
      <Label size={14} color="#172B3D" style={{ flex: 1 }}>
        {label}
      </Label>
    </Pressable>
  );
}
function PinPicker({
  address,
  latitude,
  longitude,
  onChange,
}: {
  address: string;
  latitude: string;
  longitude: string;
  onChange: (lat: string, lng: string) => void;
}) {
  const geo = useForegroundLocation();
  const [editing, setEditing] = useState(false);
  const lat = Number(latitude),
    lng = Number(longitude);
  const valid =
    latitude.trim() !== '' &&
    longitude.trim() !== '' &&
    Number.isFinite(lat) &&
    Math.abs(lat) <= 85 &&
    Number.isFinite(lng) &&
    Math.abs(lng) <= 180;
  async function locate() {
    const point = await geo.locate();
    if (point) onChange(point.latitude.toFixed(6), point.longitude.toFixed(6));
  }
  function move(north: number, east: number) {
    if (!valid) return;
    const nextLat = Math.max(-85, Math.min(85, lat + north / 111320));
    const nextLng = ((lng + east / (111320 * Math.cos((lat * Math.PI) / 180)) + 540) % 360) - 180;
    onChange(nextLat.toFixed(6), nextLng.toFixed(6));
  }
  return (
    <View style={{ gap: 10 }}>
      <View style={{ height: 150, borderRadius: 14, overflow: 'hidden' }}>
        <PointMap
          coordinate={valid ? { latitude: lat, longitude: lng } : undefined}
          zoom={2}
          controls
          onPick={
            editing
              ? (point) => onChange(point.latitude.toFixed(6), point.longitude.toFixed(6))
              : undefined
          }
        />
        {valid && address.trim() ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: 26,
              alignSelf: 'center',
              maxWidth: '90%',
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 6,
              backgroundColor: '#FFFFFF',
            }}
          >
            <Label size={12} color="#075A9C">
              {address.trim()}
            </Label>
          </View>
        ) : null}
      </View>
      <Button
        title="Dùng vị trí hiện tại cho ghim"
        variant="secondary"
        pending={geo.busy}
        onPress={() => void locate()}
      />
      {geo.error ? <Notice tone="error">{geo.error}</Notice> : null}
      <Button
        title={editing ? 'Xong chỉnh ghim' : 'Chỉnh ghim'}
        variant="quiet"
        onPress={() => setEditing((v) => !v)}
      />
      {editing || !valid ? (
        <>
          <Label size={12}>
            Đặt ghim tại lối vào. Nhập tọa độ hoặc dịch ghim 10 m mỗi lần; kiểm tra lại trên bản đồ.
          </Label>
          <Field
            label="Vĩ độ"
            value={latitude}
            onChangeText={(value) => onChange(value, longitude)}
            keyboardType="numbers-and-punctuation"
          />
          <Field
            label="Kinh độ"
            value={longitude}
            onChangeText={(value) => onChange(latitude, value)}
            keyboardType="numbers-and-punctuation"
          />
          {valid ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                ['Bắc', 10, 0],
                ['Nam', -10, 0],
                ['Tây', 0, -10],
                ['Đông', 0, 10],
              ].map(([label, n, e]) => (
                <Chip
                  key={String(label)}
                  selected={false}
                  label={`Dịch ghim về ${label}`}
                  onPress={() => move(Number(n), Number(e))}
                />
              ))}
            </View>
          ) : null}
        </>
      ) : null}
      {valid ? (
        <Label size={12}>
          Ghim: {lat.toFixed(6)}, {lng.toFixed(6)}
        </Label>
      ) : null}
    </View>
  );
}

export function PointProposalScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useApp();
  const existing = useResource<Proposal>(`/v1/point-proposals/${id}`, true, !!id);
  return (
    <RequireAuth>
      {id && !existing.data ? (
        <FormPage title="Đề xuất điểm thu gom mới">
          <QueryState query={existing} />
        </FormPage>
      ) : (
        <ProposalForm key={`${user?.id}:${id ?? 'new'}`} id={id} initial={existing.data} />
      )}
    </RequireAuth>
  );
}
type Form = {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  materialIds: string[];
  hours: string;
  photos: Photo[];
  publishPhotos: boolean;
};
const empty: Form = {
  name: '',
  address: '',
  latitude: '',
  longitude: '',
  materialIds: [],
  hours: '',
  photos: [],
  publishPhotos: false,
};
function ProposalForm({ id, initial }: { id?: string; initial?: Proposal }) {
  const existing = useResource<Proposal>(`/v1/point-proposals/${id}`, true, !!id);
  const list = usePages<Proposal>('/v1/me/point-proposals', true, !id);
  const choices = usePages<{ id: string; name: string }>('/v1/waste-materials');
  const [form, setForm] = useState<Form>(() =>
    initial
      ? {
          name: initial.name,
          address: initial.address,
          latitude: String(initial.latitude),
          longitude: String(initial.longitude),
          materialIds: initial.materialIds,
          hours: initial.hours ?? '',
          photos: initial.media ?? [],
          publishPhotos: initial.publishPhotos ?? false,
        }
      : empty,
  );
  const [version, setVersion] = useState(initial?.version ?? 1),
    [ack, setAck] = useState(false),
    [busyPhotos, setBusyPhotos] = useState(false);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState<Proposal>();
  const alive = useRef(true);
  const saveInFlight = useRef(false);
  const savedId = useRef(id);
  const lastSaved = useRef<{ signature: string; proposal: Proposal } | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const command = useCommand<Proposal>();
  function change<K extends keyof Form>(key: K, value: Form[K]) {
    if (saveInFlight.current) return;
    setNotice('');
    setForm((v) => ({ ...v, [key]: value }));
  }
  const proposal =
    receipt && (!existing.data || receipt.version > existing.data.version)
      ? receipt
      : existing.data;
  const editable = !proposal || proposal.state === 'draft';
  const valid =
    !!form.name.trim() &&
    !!form.address.trim() &&
    !!form.latitude.trim() &&
    !!form.longitude.trim() &&
    Number.isFinite(Number(form.latitude)) &&
    Math.abs(Number(form.latitude)) <= 90 &&
    Number.isFinite(Number(form.longitude)) &&
    Math.abs(Number(form.longitude)) <= 180 &&
    form.materialIds.length > 0;
  async function save(submit = false) {
    if (saveInFlight.current || !editable || !valid || busyPhotos) return;
    if (submit && (!ack || !form.photos.length)) return;
    saveInFlight.current = true;
    setSaving(true);
    setNotice('');
    const body = {
      ...form,
      name: form.name.trim(),
      address: form.address.trim(),
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      mediaIds: form.photos.map((p) => p.id),
    };
    const { photos: _photos, ...data } = body;
    let draftSaved = false;
    try {
      const signature = JSON.stringify(data);
      const saved =
        lastSaved.current?.signature === signature
          ? lastSaved.current.proposal
          : await command.mutateAsync({
              path: savedId.current
                ? `/v1/point-proposals/${savedId.current}`
                : '/v1/point-proposals',
              method: savedId.current ? 'PUT' : 'POST',
              body: savedId.current ? { ...data, expectedVersion: version } : data,
            });
      if (!alive.current) return;
      savedId.current = saved.id;
      lastSaved.current = { signature, proposal: saved };
      setVersion(saved.version);
      draftSaved = true;
      if (submit) {
        const submitted = await command.mutateAsync({
          path: `/v1/point-proposals/${saved.id}/submit`,
          body: { expectedVersion: saved.version, acknowledged: true },
        });
        if (!alive.current) return;
        setReceipt(submitted);
      }
      if (!id) router.replace({ pathname: '/point-proposal', params: { id: saved.id } });
      else setNotice(submit ? 'Đã gửi đề xuất để xét duyệt.' : 'Đã lưu bản nháp.');
    } catch {
      if (alive.current && submit && draftSaved)
        setNotice('Bản nháp đã được lưu. Bạn có thể gửi lại để xét duyệt.');
    } finally {
      saveInFlight.current = false;
      if (alive.current) setSaving(false);
    }
  }
  return (
    <FormPage title="Đề xuất điểm thu gom mới">
      <Info title="Cùng mở rộng bản đồ xanh">
        Điểm bạn đề xuất chỉ xuất hiện công khai sau khi được đội ngũ xem xét.
      </Info>
      {id ? <QueryState query={existing} /> : null}
      {editable ? (
        <>
          <Label bold size={16}>
            Thông tin địa điểm
          </Label>
          <Field
            label="Tên điểm thu gom *"
            value={form.name}
            onChangeText={(v) => change('name', v)}
            maxLength={200}
            editable={!saving}
            style={{ backgroundColor: '#F5F9FC', borderColor: '#DEEBF3', borderRadius: 12 }}
          />
          <View>
            <Field
              label="Địa chỉ *"
              value={form.address}
              onChangeText={(v) => change('address', v)}
              maxLength={500}
              editable={!saving}
              style={{
                backgroundColor: '#F5F9FC',
                borderColor: '#DEEBF3',
                borderRadius: 12,
                paddingRight: 42,
              }}
            />
            <View pointerEvents="none" style={{ position: 'absolute', right: 14, bottom: 15 }}>
              <Artwork source={art.pin} width={18} height={18} />
            </View>
          </View>
          <PinPicker
            address={form.address}
            latitude={form.latitude}
            longitude={form.longitude}
            onChange={(latitude, longitude) => {
              if (saveInFlight.current) return;
              setNotice('');
              setForm((v) => ({ ...v, latitude, longitude }));
            }}
          />
          <CollectionPhotos
            photos={form.photos}
            onChange={(v) => change('photos', v)}
            onBusy={setBusyPhotos}
            disabled={saving}
          />
          <Label bold size={16}>
            Loại rác dự kiến tiếp nhận *
          </Label>
          <QueryState query={choices}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {choices.data?.pages
                .flatMap((p) => p.items)
                .map((p) => (
                  <Chip
                    key={p.id}
                    label={p.name}
                    selected={form.materialIds.includes(p.id)}
                    disabled={saving}
                    onPress={() =>
                      change(
                        'materialIds',
                        form.materialIds.includes(p.id)
                          ? form.materialIds.filter((i) => i !== p.id)
                          : [...form.materialIds, p.id].slice(0, 20),
                      )
                    }
                  />
                ))}
            </View>
            <More query={choices} />
          </QueryState>
          <View>
            <Field
              label="Giờ tiếp nhận (nếu biết)"
              value={form.hours}
              onChangeText={(v) => change('hours', v)}
              maxLength={500}
              editable={!saving}
              style={{
                backgroundColor: '#F5F9FC',
                borderColor: '#DEEBF3',
                borderRadius: 12,
                paddingRight: 42,
              }}
            />
            <View pointerEvents="none" style={{ position: 'absolute', right: 14, bottom: 15 }}>
              <Artwork source={art.clock} width={18} height={18} />
            </View>
          </View>
          <Check
            label="Cho phép hiển thị ảnh địa điểm công khai sau khi đề xuất được duyệt."
            selected={form.publishPhotos}
            onPress={() => change('publishPhotos', !form.publishPhotos)}
          />
          <Check
            label="Tôi xác nhận thông tin này là đề xuất từ cộng đồng, chưa được xác minh."
            selected={ack}
            onPress={() => {
              if (!saveInFlight.current) setAck((v) => !v);
            }}
          />
          <CommandError error={command.error} />
          {notice ? <Notice tone="success">{notice}</Notice> : null}
          <Button
            title="Gửi đề xuất để xét duyệt"
            pending={saving}
            disabled={!valid || !ack || !form.photos.length || busyPhotos}
            onPress={() => void save(true)}
          />
          <Button
            title="Lưu bản nháp"
            variant="quiet"
            pending={saving}
            disabled={!valid || busyPhotos}
            onPress={() => void save()}
          />
        </>
      ) : null}
      {proposal && !editable ? (
        <>
          <Notice tone={proposal.state === 'rejected' ? 'error' : 'success'}>
            {states[proposal.state]}
          </Notice>
          <Card>
            <Label bold size={16}>
              {proposal.name}
            </Label>
            <Label>{proposal.address}</Label>
            {proposal.hours ? <Label>{proposal.hours}</Label> : null}
            {proposal.submittedAt ? (
              <Label size={12}>Đã gửi lúc {dateLabel(proposal.submittedAt)}</Label>
            ) : null}
          </Card>
          <PostMedia assets={proposal.media ?? []} context="địa điểm" gallery />
          <Label size={12}>
            {proposal.publishPhotos
              ? 'Ảnh địa điểm được phép hiển thị công khai sau khi đề xuất được duyệt.'
              : 'Ảnh địa điểm chỉ phục vụ xét duyệt đề xuất.'}
          </Label>
          {proposal.reviewReason ? <Notice>{proposal.reviewReason}</Notice> : null}
          {proposal.publishedPointId ? (
            <Button
              title="Xem điểm được công bố"
              onPress={() =>
                router.push({
                  pathname: '/points/[id]',
                  params: { id: proposal.publishedPointId! },
                })
              }
            />
          ) : null}
          <Button
            title="Đề xuất khác"
            variant="secondary"
            onPress={() => router.replace('/point-proposal')}
          />
        </>
      ) : null}
      {!id ? (
        <>
          <Label bold>Đề xuất của tôi</Label>
          <QueryState query={list}>
            {list.data?.pages
              .flatMap((p) => p.items)
              .map((p) => (
                <Button
                  key={p.id}
                  title={`${p.name} · ${states[p.state]}`}
                  variant="secondary"
                  onPress={() => router.push({ pathname: '/point-proposal', params: { id: p.id } })}
                />
              ))}
            <More query={list} />
          </QueryState>
        </>
      ) : null}
    </FormPage>
  );
}

export function PointReportScreen() {
  const { id, report, routeId, stopId, materials, pointView } = useLocalSearchParams<{
    id?: string;
    report?: string;
    routeId?: string;
    stopId?: string;
    materials?: string;
    pointView?: string;
  }>();
  const { user } = useApp();
  return (
    <RequireAuth>
      <ReportForm
        key={`${user?.id}:${id}:${report}`}
        id={id}
        reportId={report}
        routeId={routeId}
        stopId={stopId}
        materials={materials}
        pointView={pointView}
      />
    </RequireAuth>
  );
}
function ReportForm({
  id,
  reportId,
  routeId,
  stopId,
  materials,
  pointView,
}: {
  id?: string;
  reportId?: string;
  routeId?: string;
  stopId?: string;
  materials?: string;
  pointView?: string;
}) {
  const report = useResource<Schemas['ReportDetail']>(
    `/v1/point-reports/${reportId}`,
    true,
    !!reportId,
  );
  const pointId = reportId ? report.data?.pointId : id;
  const journey = useResource<Schemas['RouteDetail']>(
    `/v1/routes/${routeId}`,
    true,
    !!reportId && !!routeId && !!stopId,
  );
  const route = journey.data;
  const canReplace =
    route?.status === 'active' &&
    route.stops.some(
      (stop) => stop.id === stopId && stop.pointId === pointId && stop.status === 'pending',
    );
  const replacementUseful = report.data?.issueTypes.some(
    (issue) =>
      issue === 'full' ||
      issue === 'closed' ||
      issue === 'unsupported_material' ||
      issue === 'unsafe',
  );
  const point = useResource<Schemas['CollectionPoint']>(
    `/v1/collection-points/${pointId}`,
    false,
    !!pointId,
  );
  const [issues, setIssues] = useState<ReportIssue[]>([]),
    [description, setDescription] = useState(''),
    [photos, setPhotos] = useState<Photo[]>([]),
    [busy, setBusy] = useState(false);
  const command = useCommand<Schemas['ReportDetail']>();
  const attempt = useRef<{ signature: string; observedAt: string } | null>(null);
  const sending = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  return (
    <FormPage title={reportId ? 'Chi tiết báo cáo' : 'Báo cáo vấn đề'}>
      {reportId ? (
        <QueryState query={report}>
          {report.data ? (
            <>
              <Notice tone={report.data.state === 'rejected' ? 'error' : 'success'}>
                {states[report.data.state]}
              </Notice>
              <Card>
                <Label bold size={16}>
                  {point.data?.name ?? 'Báo cáo tại điểm thu gom'}
                </Label>
                {point.data?.address ? <Label size={12}>{point.data.address}</Label> : null}
                <Label size={12}>Đã gửi lúc {dateLabel(report.data.createdAt)}</Label>
                {report.data.issueTypes.map((issue) => (
                  <Label key={issue} size={13}>
                    • {reportIssues[issue]}
                  </Label>
                ))}
                <Label>{report.data.description}</Label>
              </Card>
              <PostMedia assets={report.data.media ?? []} context="hiện trạng" />
              {report.data.reviewReason ? <Notice>{report.data.reviewReason}</Notice> : null}
              {canReplace && replacementUseful && routeId && stopId ? (
                <Button
                  title="Tìm điểm thay thế"
                  onPress={() =>
                    router.push({
                      pathname: '/collection-replacement',
                      params: { id: routeId, stopId },
                    })
                  }
                />
              ) : null}
              <Button
                title={routeId && stopId ? 'Quay lại hướng dẫn bàn giao' : 'Quay lại điểm thu gom'}
                onPress={() => {
                  if (routeId && stopId) {
                    router.dismissTo({
                      pathname: '/collection-arrival',
                      params: { id: routeId, stopId },
                    });
                  } else if (pointId) {
                    router.dismissTo({
                      pathname: '/points/[id]',
                      params: { id: pointId, materials, view: pointView },
                    });
                  }
                }}
              />
            </>
          ) : null}
        </QueryState>
      ) : id ? (
        <QueryState query={point}>
          {point.data ? (
            <>
              <Card
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  alignItems: 'flex-start',
                  padding: 16,
                  borderColor: '#DEEBF3',
                  borderRadius: 20,
                }}
              >
                <Artwork
                  source={require('../../../assets/images/collection/forms/point-illustration.png')}
                  width={80}
                  height={80}
                />
                <View style={{ flex: 1, gap: 6 }}>
                  <Label bold size={16}>
                    {point.data.name}
                  </Label>
                  <Label size={12}>{point.data.address}</Label>
                </View>
              </Card>
              <Label bold size={16}>
                Bạn gặp vấn đề gì?
              </Label>
              <Label size={12}>Chọn tất cả vấn đề phù hợp</Label>
              <Card>
                {(Object.keys(reportIssues) as ReportIssue[]).map((value) => (
                  <Check
                    key={value}
                    label={reportIssues[value]}
                    selected={issues.includes(value)}
                    onPress={() =>
                      setIssues((v) =>
                        command.isPending
                          ? v
                          : v.includes(value)
                            ? v.filter((i) => i !== value)
                            : [...v, value],
                      )
                    }
                  />
                ))}
              </Card>
              <CollectionPhotos
                photos={photos}
                onChange={setPhotos}
                onBusy={setBusy}
                disabled={command.isPending}
                context="report"
              />
              <Field
                label="Mô tả thêm"
                placeholder="Mô tả hiện trạng và vị trí cụ thể tại điểm"
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={2000}
                editable={!command.isPending}
                style={{
                  backgroundColor: '#F5F9FC',
                  borderColor: '#DEEBF3',
                  borderRadius: 12,
                  minHeight: 84,
                }}
              />
              <Info title="Cảm ơn bạn đã chia sẻ">
                Báo cáo sẽ được xem xét trước khi cập nhật. Không để lại rác bên ngoài thùng.
              </Info>
              <CommandError error={command.error} />
              <Button
                title="Gửi báo cáo"
                pending={command.isPending}
                disabled={busy || !issues.length || !description.trim()}
                onPress={() => {
                  if (sending.current || busy || !issues.length || !description.trim()) return;
                  sending.current = true;
                  const facts = {
                    issueTypes: issues,
                    description: description.trim(),
                    mediaIds: photos.map((p) => p.id),
                  };
                  const signature = JSON.stringify(facts);
                  if (attempt.current?.signature !== signature)
                    attempt.current = { signature, observedAt: new Date().toISOString() };
                  void command
                    .mutateAsync({
                      path: `/v1/collection-points/${id}/reports`,
                      body: {
                        ...facts,
                        observedAt: attempt.current.observedAt,
                      },
                    })
                    .then((result) => {
                      if (alive.current)
                        router.replace({
                          pathname: '/point-report',
                          params: { report: result.id, routeId, stopId, materials, pointView },
                        });
                    })
                    .catch(() => {})
                    .finally(() => {
                      sending.current = false;
                    });
                }}
              />
            </>
          ) : null}
        </QueryState>
      ) : (
        <Notice>Chọn điểm thu gom cần báo cáo từ trang chi tiết điểm.</Notice>
      )}
    </FormPage>
  );
}
