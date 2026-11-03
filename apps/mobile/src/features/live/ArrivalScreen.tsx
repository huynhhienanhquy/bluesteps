import { useRef, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Artwork, DesignLink, DesignScreen } from '../../design-system/DesignScreen';
import { Button, Card, Icon, Label, Notice } from '../../design-system/ui';
import { useApp } from '../../providers';
import { ApiError, errorMessage, type Schemas } from '../../services/api';
import { useCommand, useResource } from '../../services/queries';
import { CommandError, QueryState, RequireAuth } from './common';
import { PointMap } from './PointMap';
import { handoverMaterials } from './journey-materials';

const art = {
  brand: require('../../../assets/figma/534-48955/imgNhDiDin.png'),
  arrived: require('../../../assets/figma/534-48955/imgMapPinCheck.svg'),
  door: require('../../../assets/figma/534-48955/imgDoorOpen.svg'),
  check: require('../../../assets/figma/534-48955/imgCheck.svg'),
};
const checklist = [
  'Tách riêng nhựa, giấy và các loại khác',
  'Đổ hết chất lỏng, làm sạch bao bì',
  'Bỏ đúng ngăn theo nhãn tại điểm',
];

export function ArrivalScreen() {
  const { user } = useApp();
  const { id, stopId } = useLocalSearchParams<{ id?: string; stopId?: string }>();
  function back() {
    if (router.canGoBack()) router.back();
    else router.replace('/collection');
  }
  return (
    <DesignScreen
      family="inter"
      background="#FFFFFF"
      contentStyle={{ gap: 18, paddingTop: 14 }}
      headerStyle={{ minHeight: 52, paddingTop: 0, paddingBottom: 6 }}
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            hitSlop={8}
            onPress={back}
          >
            <Icon name="chevron-back" size={24} color="#172B3D" />
          </Pressable>
          <Label heading bold size={18} color="#172B3D" style={{ flex: 1 }}>
            Hướng dẫn bàn giao
          </Label>
          <Artwork source={art.brand} width={32} />
        </View>
      }
    >
      <RequireAuth>
        {id && stopId ? (
          <ArrivalContent key={`${user?.id}:${id}:${stopId}`} id={id} stopId={stopId} />
        ) : (
          <Notice>Chọn điểm dừng trong hành trình để xem hướng dẫn.</Notice>
        )}
      </RequireAuth>
    </DesignScreen>
  );
}

function ArrivalContent({ id, stopId }: { id: string; stopId: string }) {
  const query = useResource<Schemas['RouteDetail']>(`/v1/routes/${id}`, true);
  const command = useCommand<Schemas['RouteDetail'] | Schemas['HandoverReceipt']>();
  const nextPlan = useCommand<Schemas['RouteDetail']>();
  const submitting = useRef(false);
  const [checked, setChecked] = useState<number[]>([]),
    [callError, setCallError] = useState('');
  const route = query.data,
    stop = route?.stops.find((item) => item.id === stopId);
  const next = route?.stops.find((item) => item.id !== stopId && item.status !== 'self_reported');
  const active = route?.status === 'active';
  const complete = stop?.status === 'self_reported';
  const atPoint = stop?.status === 'arrived' || complete;
  const phone = stop?.contactPhone;
  const materials = handoverMaterials(stop?.materials ?? [], route?.materialIds);
  async function updateStop(action: 'arrive' | 'handover') {
    if (
      submitting.current ||
      !active ||
      stop?.status !== (action === 'arrive' ? 'pending' : 'arrived')
    )
      return;
    submitting.current = true;
    try {
      await command.mutateAsync({ path: `/v1/routes/${id}/stops/${stopId}/${action}` });
    } catch (cause) {
      if (
        !(cause instanceof ApiError) ||
        cause.status >= 500 ||
        cause.status === 409 ||
        cause.status === 404
      )
        await query.refetch();
    } finally {
      submitting.current = false;
    }
  }
  return (
    <QueryState query={query}>
      {!stop ? (
        <Notice>Điểm dừng này không còn trong hành trình.</Notice>
      ) : (
        <>
          <View style={{ alignItems: 'center', gap: 8 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: '#DCEEF9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Artwork source={art.arrived} width={32} />
            </View>
            <Label bold size={23} color="#147CC1">
              {complete ? 'Đã lưu bàn giao' : atPoint ? 'Bạn đã đến nơi!' : 'Điểm bàn giao'}
            </Label>
          </View>
          <View style={{ gap: 6 }}>
            <Label bold size={16} color="#172B3D">
              {stop.name}
            </Label>
            <Label size={14} color="#677C8C">
              {stop.address}
            </Label>
            {stop.hours ? (
              <Label size={13} color="#677C8C">
                {stop.hours}
              </Label>
            ) : null}
          </View>
          <View style={{ height: 160, borderRadius: 16, overflow: 'hidden' }}>
            <PointMap
              coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
              controls
            />
            {stop.entranceLabel ? (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  bottom: 24,
                  alignSelf: 'center',
                  maxWidth: '90%',
                  padding: 7,
                  borderRadius: 10,
                  backgroundColor: '#FFFFFF',
                }}
              >
                <Label size={12} color="#075A9C">
                  {stop.entranceLabel}
                </Label>
              </View>
            ) : null}
          </View>
          <Card
            style={{
              backgroundColor: '#EDF7FC',
              borderColor: '#DEEBF3',
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <Artwork source={art.door} width={22} />
            <View style={{ flex: 1, gap: 5 }}>
              <Label bold size={16} color="#172B3D">
                {stop.entranceLabel || 'Lối vào điểm thu gom'}
              </Label>
              <Label size={14} color="#172B3D">
                {stop.handoverInstructions ||
                  'Chưa có hướng dẫn bàn giao riêng. Hãy kiểm tra biển chỉ dẫn tại địa chỉ của điểm.'}
              </Label>
            </View>
          </Card>
          <Label bold size={16} color="#172B3D">
            Trước khi bàn giao
          </Label>
          {materials.length ? (
            <Label size={13} color="#677C8C">
              {route?.materialIds?.length ? 'Dự kiến bàn giao' : 'Vật liệu điểm tiếp nhận'} ·{' '}
              {materials.map((material) => material.name).join(', ')}
            </Label>
          ) : null}
          <Card style={{ backgroundColor: '#FFFFFF', borderColor: '#DEEBF3', gap: 10 }}>
            {checklist.map((item, index) => {
              const selected = checked.includes(index);
              return (
                <Pressable
                  key={item}
                  accessibilityRole="checkbox"
                  aria-checked={selected}
                  accessibilityState={{ checked: selected, disabled: complete }}
                  disabled={complete}
                  onPress={() =>
                    setChecked((values) =>
                      values.includes(index)
                        ? values.filter((i) => i !== index)
                        : [...values, index],
                    )
                  }
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 26 }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: selected ? '#147CC1' : '#CFE4F1',
                      backgroundColor: selected ? '#147CC1' : '#FFFFFF',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {selected ? <Artwork source={art.check} width={15} /> : null}
                  </View>
                  <Label size={14} color="#172B3D" style={{ flex: 1 }}>
                    {item}
                  </Label>
                </Pressable>
              );
            })}
          </Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="call-outline" size={22} color="#172B3D" />
            <View style={{ flex: 1, gap: 3 }}>
              <Label bold size={15} color="#172B3D">
                Cần người hướng dẫn?
              </Label>
              <Label size={12} color="#677C8C">
                {phone ? 'Liên hệ quản lý điểm thu gom' : 'Điểm chưa công bố số liên hệ.'}
              </Label>
            </View>
            {phone ? (
              <DesignLink
                onPress={() => {
                  setCallError('');
                  void Linking.openURL(`tel:${phone}`).catch((cause) =>
                    setCallError(errorMessage(cause)),
                  );
                }}
              >
                Gọi
              </DesignLink>
            ) : null}
          </View>
          {callError ? <Notice tone="error">{callError}</Notice> : null}
          <Label size={12} color="#677C8C">
            Chỉ xác nhận sau khi bạn đã bàn giao rác đúng nơi quy định. Bàn giao do bạn tự khai.
          </Label>
          <CommandError error={complete ? null : command.error} />
          {!active && !complete ? (
            <Notice>Hành trình cần đang hoạt động để xác nhận bàn giao.</Notice>
          ) : null}
          {active && stop.status === 'pending' ? (
            <Button
              title="Tôi đã đến điểm"
              pending={command.isPending}
              onPress={() => void updateStop('arrive')}
            />
          ) : null}
          {active && stop.status === 'arrived' ? (
            <Button
              title="Tôi đã bàn giao xong"
              accessibilityLabel="Xác nhận đã bàn giao"
              pending={command.isPending}
              onPress={() => void updateStop('handover')}
            />
          ) : null}
          {complete ? (
            <>
              <Notice tone="success">Đã lưu bàn giao tự khai. Chưa có điểm thưởng được cấp.</Notice>
              {next && active && !route?.plan ? (
                <Label size={12} color="#677C8C">
                  Tọa độ điểm vừa bàn giao và các điểm còn lại sẽ được gửi tới Valhalla để tính
                  tuyến.
                </Label>
              ) : null}
              <CommandError error={nextPlan.error} />
              <Button
                title={
                  next && active
                    ? 'Tiếp tục đến điểm kế tiếp'
                    : route?.status === 'completed'
                      ? 'Xem hành trình đã hoàn tất'
                      : 'Xem hành trình'
                }
                variant="secondary"
                pending={nextPlan.isPending}
                onPress={() => {
                  if (!next || !route || !active) {
                    router.replace({ pathname: '/collection-route', params: { id } });
                    return;
                  }
                  const resume = () =>
                    router.replace({ pathname: '/collection-navigation', params: { id } });
                  if (route.plan) {
                    resume();
                    return;
                  }
                  nextPlan.mutate(
                    {
                      path: `/v1/routes/${id}/plan`,
                      body: {
                        origin: { latitude: stop.latitude, longitude: stop.longitude },
                        expectedVersion: route.version,
                        preferNoTolls: route.preferNoTolls ?? false,
                      },
                    },
                    {
                      onSuccess: resume,
                      onError: (cause) => {
                        if (cause instanceof ApiError && cause.code === 'VERSION_CONFLICT')
                          void query.refetch();
                      },
                    },
                  );
                }}
              />
              {nextPlan.isError ? (
                <DesignLink
                  onPress={() =>
                    router.replace({ pathname: '/collection-directions', params: { routeId: id } })
                  }
                >
                  Mở tùy chọn tính tuyến
                </DesignLink>
              ) : null}
            </>
          ) : null}
          <DesignLink
            style={{ alignItems: 'center' }}
            onPress={() =>
              router.push({
                pathname: '/point-report',
                params: { id: stop.pointId, routeId: id, stopId },
              })
            }
          >
            Báo cáo vấn đề tại điểm này
          </DesignLink>
          <DesignLink
            style={{ alignItems: 'center' }}
            onPress={() => router.replace('/collection')}
          >
            Về bản đồ
          </DesignLink>
        </>
      )}
    </QueryState>
  );
}
