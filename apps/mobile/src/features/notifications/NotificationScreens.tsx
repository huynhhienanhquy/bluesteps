import { useMemo, useState } from 'react';
import { PanResponder, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { DesignFrameCanvas, DesignFrameAction as Hit } from '../../design-system/DesignFrameCanvas';
import type { FrameData, DesignLayer } from '../../design-system/DesignFrameLayers';
import { notificationsAssets } from '../../design-system/notifications-assets';
import { Button, Chip } from '../../design-system/ui';
import { CollectionSheet } from '../collection/CollectionPage';
import { useApp } from '../../providers';
import { useNotificationUi, type NoticePreference } from './NotificationUiProvider';
import source from './notifications-design-data.json';

type Frame = keyof typeof notificationsAssets;
type ViewName =
  | 'all'
  | 'unread'
  | 'activity'
  | 'detail'
  | 'settings'
  | 'empty'
  | 'delete'
  | 'deleted'
  | 'compact'
  | 'community';
const frames: Record<ViewName, Frame> = {
  all: '386:7913',
  unread: '703:5399',
  activity: '712:5475',
  detail: '703:5468',
  settings: '703:5524',
  empty: '703:5589',
  delete: '386:8228',
  deleted: '386:8311',
  compact: '386:8380',
  community: '386:8003',
};
const data = source as unknown as Record<Frame, FrameData & { navigationTop: number | null }>;
const settingsFrames: Record<string, Partial<Record<NoticePreference, boolean>>> = {
  '703:5524': {},
  '712:5578': { activity: false },
  '712:5667': { offers: false },
  '712:5756': { community: true },
  '712:5845': { news: true },
};
const preferenceNames: Record<NoticePreference, string> = {
  activity: 'Hoạt động',
  offers: 'Ưu đãi',
  community: 'Cộng đồng',
  news: 'Tin tức',
};
const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
const openView = (view: ViewName) => router.push({ pathname: '/notifications', params: { view } });

function viewOf(frame: Frame): ViewName {
  if (frame in settingsFrames) return 'settings';
  return (Object.keys(frames) as ViewName[]).find((view) => frames[view] === frame) ?? 'all';
}
function rowId(y: number, view: ViewName) {
  if (view === 'unread')
    return ['scan-today', 'voucher-yesterday', 'scan-failed'][Math.floor((y - 292) / 129)];
  if (view === 'activity') return ['scan-today', 'camera-today'][Math.floor((y - 292) / 129)];
  return undefined;
}

export function NotificationsDesignScreen() {
  const params = useLocalSearchParams<{ view?: string; frame?: string; preview?: string }>();
  const ui = useNotificationUi();
  const { markNotificationRead } = useApp();
  const sample = params.preview === '1';
  const requested =
    params.frame && params.frame in notificationsAssets ? (params.frame as Frame) : undefined;
  const view: ViewName = requested
    ? viewOf(requested)
    : params.view && params.view in frames
      ? (params.view as ViewName)
      : 'all';
  const frame = requested ?? frames[view];
  const [sheet, setSheet] = useState<'filter' | 'options' | null>(null);
  const [changed, setChanged] = useState(false);
  const seededPreferences = {
    activity: true,
    offers: true,
    community: false,
    news: false,
    ...settingsFrames[frame],
  };
  const preferences = sample && !changed ? seededPreferences : ui.state.preferences;
  const clear = () => {
    ui.markRead();
    markNotificationRead();
    setSheet(null);
    router.replace({ pathname: '/notifications', params: { view: 'empty' } });
  };
  const changeView = (value: ViewName) => {
    setSheet(null);
    openView(value);
  };
  const openNotice = (id: string, target: 'detail' | 'scan' | 'rewards') => {
    ui.markRead(id);
    if (target === 'detail') openView('detail');
    else router.push(target === 'scan' ? '/scan' : '/rewards/catalog');
  };
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dx < -24 && Math.abs(g.dy) < 30,
        onPanResponderRelease: (_, g) => {
          if (g.dx < -40) openView('delete');
        },
      }),
    [],
  );
  const unreadIds = ['scan-today', 'voucher-yesterday', 'scan-failed'].filter(
    (id) => !ui.state.read.includes(id) && !ui.state.removed.includes(id),
  );
  const actualView =
    view === 'unread' && !sample && !unreadIds.length
      ? 'empty'
      : view === 'all' && !sample && ui.state.removed.includes('voucher-yesterday')
        ? 'deleted'
        : view;
  const actualFrame = actualView !== view ? frames[actualView] : frame;
  let layout = data[actualFrame];
  if (view === 'unread' && !sample && actualView !== 'empty') {
    const adjusted = layout.layers.flatMap((l) => {
      if (l.y >= 292 && l.y < 666 && !l.navigation) {
        const id = rowId(l.y, view);
        if (!id) return [l];
        const index = unreadIds.indexOf(id);
        if (index < 0) return [];
        const originalIndex = ['scan-today', 'voucher-yesterday', 'scan-failed'].indexOf(id);
        return [{ ...l, y: l.y + (index - originalIndex) * 129 }];
      }
      return [l];
    });
    layout = { ...layout, layers: adjusted };
  }
  const hide = (l: DesignLayer) => {
    if (
      view === 'settings' &&
      (!sample || changed) &&
      l.kind === 'shape' &&
      l.x >= 329 &&
      l.x < 378 &&
      l.y >= 233 &&
      l.y < 504
    )
      return true;
    return false;
  };
  const replaceText = (l: DesignLayer) => {
    if (sample) return undefined;
    if (view === 'unread' && l.text === '3 thông báo chưa đọc')
      return `${unreadIds.length} thông báo chưa đọc`;
    if (view === 'community' && l.text === 'Theo dõi') {
      const id = l.y < 650 ? 'bng_836' : 'my_linh';
      return ui.state.following.includes(id) ? 'Đã theo' : undefined;
    }
    return undefined;
  };
  const longContent =
    view === 'community'
      ? 1050
      : Math.max(
          926,
          ...layout.layers
            .filter((l) => l.kind === 'text' && !l.navigation)
            .map((l) => l.y + l.h + 24),
        );
  return (
    <>
      <DesignFrameCanvas
        frame={actualFrame}
        data={layout}
        assets={notificationsAssets[actualFrame]}
        contentHeight={longContent}
        replaceText={replaceText}
        hide={hide}
      >
        <Hit label="Quay lại" box={[22, 58, 42, 48]} onPress={back} />
        {actualView === 'settings' ? (
          <>
            {(Object.keys(preferenceNames) as NoticePreference[]).map((key, index) => {
              const top = 233 + index * 81;
              return (
                <View key={key}>
                  {!sample || changed ? (
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        left: 329,
                        top,
                        width: 48,
                        height: 27,
                        borderRadius: 14,
                        backgroundColor: preferences[key] ? '#147CC1' : '#D1E3ED',
                      }}
                    >
                      <View
                        style={{
                          position: 'absolute',
                          left: preferences[key] ? 24 : 3,
                          top: 3,
                          width: 21,
                          height: 21,
                          borderRadius: 11,
                          backgroundColor: '#FFFFFF',
                        }}
                      />
                    </View>
                  ) : null}
                  <Hit
                    role="switch"
                    label={preferenceNames[key]}
                    checked={preferences[key]}
                    box={[318, top - 8, 72, 43]}
                    onPress={() => {
                      setChanged(true);
                      ui.updatePreferences({ ...preferences, [key]: !preferences[key] });
                    }}
                  />
                </View>
              );
            })}
            <Hit label="Đánh dấu tất cả đã đọc" box={[30, 616, 368, 63]} onPress={clear} />
            <Hit
              label="Xem tất cả thông báo"
              box={[30, 679, 368, 63]}
              onPress={() => openView('all')}
            />
          </>
        ) : actualView === 'detail' ? (
          <>
            <Hit
              label="Tùy chọn thông báo"
              box={[365, 60, 44, 45]}
              onPress={() => setSheet('options')}
            />
            <Hit
              label="Dùng điểm để đổi quà"
              box={[30, 717, 368, 50]}
              onPress={() => router.push('/rewards/catalog')}
            />
          </>
        ) : actualView === 'empty' ? (
          <>
            <Hit
              label="Cài đặt thông báo"
              box={[365, 60, 44, 45]}
              onPress={() => openView('settings')}
            />
            <Hit
              label="Khám phá hoạt động"
              box={[74, 631, 280, 48]}
              onPress={() => router.push('/events')}
            />
          </>
        ) : actualView === 'community' ? (
          <>
            <Hit
              label="Cài đặt thông báo"
              box={[379, 51, 47, 57]}
              onPress={() => openView('settings')}
            />
            {[177, 283, 389, 787, 893].map((y, index) => (
              <Hit
                key={y}
                label={`Mở thông báo cộng đồng ${index + 1}`}
                box={[36, y, 357, 85]}
                onPress={() => router.push('/community')}
              />
            ))}
            {(['bng_836', 'my_linh'] as const).map((id, i) => (
              <Hit
                key={id}
                label={`${ui.state.following.includes(id) ? 'Bỏ theo dõi' : 'Theo dõi'} ${id}`}
                box={[307, 563 + i * 146, 80, 29]}
                onPress={() => ui.toggleFollow(id)}
              />
            ))}
          </>
        ) : (
          <>
            {actualView === 'unread' || actualView === 'activity' ? (
              <Hit
                label="Cài đặt thông báo"
                box={[373, 60, 40, 45]}
                onPress={() => openView('settings')}
              />
            ) : (
              <Hit
                label="Tùy chọn thông báo"
                box={[373, 60, 40, 45]}
                onPress={() => setSheet('options')}
              />
            )}
            {actualView === 'unread' || actualView === 'activity' ? (
              <>
                {(['all', 'unread', 'activity'] as const).map((v, i) => (
                  <Hit
                    key={v}
                    label={['Tất cả', 'Chưa đọc', 'Hoạt động'][i]!}
                    role="tab"
                    selected={view === v}
                    box={
                      [
                        [30, 158, 91, 38],
                        [128, 158, 102, 38],
                        [237, 158, 105, 38],
                      ][i]!
                    }
                    onPress={() => openView(v)}
                  />
                ))}
                {(actualView === 'unread'
                  ? sample
                    ? ['scan-today', 'voucher-yesterday', 'scan-failed']
                    : unreadIds
                  : ['scan-today', 'camera-today']
                ).map((id, index) => (
                  <Hit
                    key={id}
                    label={
                      id === 'scan-today'
                        ? 'Phân loại thành công'
                        : id === 'voucher-yesterday'
                          ? 'Voucher mới cho bạn'
                          : id === 'camera-today'
                            ? 'Hãy chụp ảnh rác'
                            : 'Cần thử lại'
                    }
                    box={[31, 292 + index * 129, 366, 116]}
                    onPress={() =>
                      openNotice(
                        id,
                        id === 'scan-today'
                          ? 'detail'
                          : id === 'voucher-yesterday'
                            ? 'rewards'
                            : 'scan',
                      )
                    }
                  />
                ))}
                <Hit label="Đánh dấu tất cả đã đọc" box={[31, 698, 366, 47]} onPress={clear} />
              </>
            ) : (
              <>
                <Hit
                  label="Lọc thông báo"
                  box={[322, 118, 80, 30]}
                  onPress={() => setSheet('filter')}
                />
                <Hit
                  label="Phân loại thành công hôm nay"
                  box={[34, 161, 357, 85]}
                  onPress={() => openNotice('scan-today', 'detail')}
                />
                <Hit
                  label="Hãy chụp ảnh rác"
                  box={[34, 271, 357, 85]}
                  onPress={() => openNotice('camera-today', 'scan')}
                />
                {actualView === 'all' ? (
                  <View
                    {...swipe.panHandlers}
                    style={{ position: 'absolute', left: 34, top: 421, width: 357, height: 85 }}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Voucher tặng 10%"
                      onPress={() => openNotice('voucher-yesterday', 'rewards')}
                      onLongPress={() => openView('delete')}
                      style={{ flex: 1 }}
                    />
                  </View>
                ) : null}
                {actualView === 'delete' ? (
                  <Hit
                    label="Xóa thông báo ưu đãi"
                    box={[320, 423, 64, 64]}
                    onPress={() => {
                      ui.remove('voucher-yesterday');
                      router.replace({ pathname: '/notifications', params: { view: 'deleted' } });
                    }}
                  />
                ) : null}
                {actualView === 'all' || actualView === 'delete' || actualView === 'deleted' ? (
                  <>
                    <Hit
                      label="Phân loại thành công trước đó"
                      box={[38, actualView === 'all' ? 569 : 553, 357, 85]}
                      onPress={() => openNotice('scan-before', 'detail')}
                    />
                    <Hit
                      label="Chụp lại ảnh rác"
                      box={[38, actualView === 'all' ? 676 : 665, 357, 85]}
                      onPress={() => openNotice('scan-failed', 'scan')}
                    />
                    <Hit
                      label="Ưu đãi trước đó"
                      box={[38, actualView === 'all' ? 783 : 775, 357, 38]}
                      onPress={() => openNotice('voucher-before', 'rewards')}
                    />
                  </>
                ) : null}
                {actualView === 'compact' ? (
                  <>
                    <Hit
                      label="Phân loại thành công trước đó"
                      box={[38, 417, 357, 85]}
                      onPress={() => openNotice('scan-before', 'detail')}
                    />
                    <Hit
                      label="Chụp lại ảnh rác"
                      box={[38, 527, 357, 85]}
                      onPress={() => openNotice('scan-failed', 'scan')}
                    />
                    <Hit
                      label="Ưu đãi trước đó"
                      box={[38, 637, 357, 85]}
                      onPress={() => openNotice('voucher-before', 'rewards')}
                    />
                    <Hit
                      label="Kết quả phân loại cũ hơn"
                      box={[38, 739, 357, 85]}
                      onPress={() => openNotice('scan-earlier', 'detail')}
                    />
                  </>
                ) : null}
              </>
            )}
          </>
        )}
      </DesignFrameCanvas>
      {sheet ? (
        <CollectionSheet
          title={sheet === 'filter' ? 'Lọc thông báo' : 'Thông báo'}
          onClose={() => setSheet(null)}
        >
          {sheet === 'filter' ? (
            <>
              {(['all', 'unread', 'activity'] as const).map((v) => (
                <Chip
                  key={v}
                  label={{ all: 'Tất cả', unread: 'Chưa đọc', activity: 'Hoạt động' }[v]}
                  selected={view === v}
                  onPress={() => changeView(v)}
                />
              ))}
              <Button
                title="Thông báo trước đó"
                variant="quiet"
                onPress={() => changeView('compact')}
              />
            </>
          ) : (
            <>
              <Button title="Cài đặt thông báo" onPress={() => changeView('settings')} />
              <Button
                title="Thông báo cộng đồng"
                variant="secondary"
                onPress={() => changeView('community')}
              />
              <Button title="Chưa đọc" variant="secondary" onPress={() => changeView('unread')} />
              <Button
                title="Xóa một thông báo ưu đãi"
                variant="quiet"
                onPress={() => changeView('delete')}
              />
              <Button title="Đánh dấu tất cả đã đọc" variant="quiet" onPress={clear} />
            </>
          )}
        </CollectionSheet>
      ) : null}
    </>
  );
}
