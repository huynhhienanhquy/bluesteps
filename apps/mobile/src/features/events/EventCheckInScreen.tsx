import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Button, Notice } from '../../design-system/ui';
import { useApp } from '../../providers';
import { ApiError, errorMessage, type Schemas } from '../../services/api';
import { useCommand, useResource } from '../../services/queries';
import { CommandError, QueryState, RequireAuth } from '../shared/common';
import { EventFlowHeading, EventFlowPage, EventFlowText as Text } from './EventFlowParts';
import { eventTimeRange } from './event-time';
import { useEventPhase } from './useEventPhase';

export function EventCheckInScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useApp();
  return (
    <EventFlowPage title="Check-in hoạt động">
      <RequireAuth>
        {id ? (
          <CheckInScanner key={`${user?.id}:${id}`} id={id} />
        ) : (
          <>
            <Notice>Chọn hoạt động từ trang chi tiết để mở check-in.</Notice>
            <Button title="Khám phá hoạt động" onPress={() => router.replace('/events')} />
          </>
        )}
      </RequireAuth>
    </EventFlowPage>
  );
}

function CheckInScanner({ id }: { id: string }) {
  const access = useResource<{ allowed: boolean }>(`/v1/events/${id}/check-in-access`, true);
  const event = useResource<Schemas['GreenEvent']>(`/v1/events/${id}`);
  const { started: opened, ended } = useEventPhase(event.data, 120);
  const [permission, requestPermission] = useCameraPermissions();
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(
    () => !AppState.currentState || AppState.currentState === 'active',
  );
  const [scanning, setScanning] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');
  const scanningRef = useRef(false);
  const working = useRef(false);
  const active = useRef(false);
  const foregroundRef = useRef(foreground);
  const command = useCommand<Schemas['EventRegistration']>();
  const { refetch: refreshAccess } = access;
  const { refetch: refreshEvent } = event;
  useFocusEffect(
    useCallback(() => {
      active.current = true;
      setFocused(true);
      void refreshAccess();
      void refreshEvent();
      return () => {
        active.current = false;
        scanningRef.current = false;
        setScanning(false);
        setFocused(false);
      };
    }, [refreshAccess, refreshEvent]),
  );
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      foregroundRef.current = state === 'active';
      setForeground(state === 'active');
      if (state !== 'active') {
        scanningRef.current = false;
        setScanning(false);
      } else if (active.current) {
        void refreshAccess();
        void refreshEvent();
      }
    });
    return () => listener.remove();
  }, [refreshAccess, refreshEvent]);
  const allowed =
    !!access.data?.allowed && !access.isError && !!event.data && !event.isError && opened && !ended;
  const busy = requesting || command.isPending;
  const verifying = access.isFetching || event.isFetching;
  useEffect(() => {
    if (!allowed || !permission?.granted) {
      scanningRef.current = false;
      setScanning(false);
    }
  }, [allowed, permission?.granted]);

  async function start() {
    if (scanningRef.current) {
      scanningRef.current = false;
      setScanning(false);
      return;
    }
    if (working.current || !allowed || verifying || !active.current || !foregroundRef.current)
      return;
    working.current = true;
    setRequesting(true);
    setError('');
    command.reset();
    try {
      const next = permission?.granted ? permission : await requestPermission();
      if (!active.current || !foregroundRef.current) return;
      if (next.granted) {
        scanningRef.current = true;
        setScanning(true);
      } else {
        setError('Cần quyền camera để quét mã vé.');
      }
    } catch (cause) {
      if (active.current) setError(errorMessage(cause));
    } finally {
      working.current = false;
      setRequesting(false);
    }
  }

  async function scan(ticket: string) {
    if (
      !scanningRef.current ||
      working.current ||
      !allowed ||
      !active.current ||
      !foregroundRef.current
    )
      return;
    // Camera callbacks can repeat before React applies setScanning(false).
    scanningRef.current = false;
    setScanning(false);
    if (!/^bs-ticket-v1\.[0-9a-f-]{36}\.\d+\.[0-9a-f]{64}$/i.test(ticket)) {
      setError('Mã QR này không phải vé tham gia BlueSteps. Hãy quét lại mã trên vé.');
      return;
    }
    working.current = true;
    setError('');
    try {
      const body: Schemas['CheckInRequest'] = { ticket, eventId: id };
      await command.mutateAsync({ path: '/v1/event-tickets/check-in', body });
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 403) void refreshAccess();
      if (cause instanceof ApiError && cause.code === 'CHECK_IN_CLOSED') void refreshEvent();
    } finally {
      working.current = false;
    }
  }

  return (
    <QueryState query={access}>
      {access.data?.allowed ? (
        <QueryState query={event}>
          <EventFlowHeading>{event.data?.title ?? 'Quét vé tham gia'}</EventFlowHeading>
          {event.data ? <Text>{eventTimeRange(event.data)}</Text> : null}
          <Text>Quét mã vé của người tham gia. Mỗi vé chỉ ghi nhận check-in một lần.</Text>
          {!opened || ended ? (
            <Notice>
              {ended
                ? 'Hoạt động đã kết thúc, không còn nhận check-in.'
                : 'Check-in mở từ 2 giờ trước khi hoạt động bắt đầu đến lúc kết thúc.'}
            </Notice>
          ) : null}
          {scanning && focused && foreground && allowed && permission?.granted ? (
            <View style={{ height: 350, overflow: 'hidden', borderRadius: 20 }}>
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={({ data }) => void scan(data)}
                onMountError={() => {
                  scanningRef.current = false;
                  setScanning(false);
                  setError('Không mở được camera. Đóng ứng dụng đang dùng camera rồi thử lại.');
                }}
              />
            </View>
          ) : null}
          <Button
            title={scanning ? 'Dừng quét' : command.data ? 'Quét vé tiếp theo' : 'Quét mã vé'}
            pending={busy}
            disabled={!scanning && (!allowed || verifying || !focused || !foreground)}
            onPress={() => void start()}
          />
          {permission && !permission.granted && !permission.canAskAgain ? (
            <>
              <Notice>Cho phép camera trong cài đặt hệ thống để quét vé.</Notice>
              {Platform.OS !== 'web' ? (
                <Button
                  title="Mở cài đặt camera"
                  variant="secondary"
                  onPress={() =>
                    void Linking.openSettings().catch((cause) => setError(errorMessage(cause)))
                  }
                />
              ) : (
                <Text>
                  Cho phép camera trong phần quyền truy cập của trang web rồi tải lại trang.
                </Text>
              )}
            </>
          ) : null}
          {command.data ? (
            <Notice tone="success">
              Đã xác nhận check-in: {command.data.fullName} · {command.data.attendeeCount} người.
            </Notice>
          ) : null}
          <CommandError error={command.error} />
          {error ? <Notice tone="error">{error}</Notice> : null}
          <Button
            title="Về chi tiết hoạt động"
            variant="quiet"
            disabled={busy}
            onPress={() => router.dismissTo({ pathname: '/events/[id]', params: { id } })}
          />
        </QueryState>
      ) : (
        <Notice>Bạn chưa được phân công xác nhận check-in cho hoạt động này.</Notice>
      )}
    </QueryState>
  );
}
