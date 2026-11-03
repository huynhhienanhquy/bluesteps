import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { View } from 'react-native';
import { DesignScreen } from '../../design-system/DesignScreen';
import { Button, Icon, Label, MenuItem, Notice, Search } from '../../design-system/ui';
import { useApp } from '../../providers';
import { errorMessage, operationKey, type Schemas } from '../../services/api';
import { useCommand, usePages, useResource } from '../../services/queries';
import { More, QueryState, RequireAuth } from './common';
import { CurvedNavigation } from './DesignParts';
import { ScanCapture } from './ScanCapture';
import { ScanDetails, ScanPhotoResult, type SelectedPhoto } from './ScanViews';
import { parseSortingWeight, sortingWeightError } from './sorting-weight';

function scanDraft(imageId?: string, inputKind?: string) {
  return imageId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(imageId) &&
    (inputKind === 'camera' || inputKind === 'library')
    ? { imageId, inputKind }
    : null;
}

export function ScanScreen() {
  const { user } = useApp();
  const { scanId, reviewFrom, pendingImageId, pendingInput } = useLocalSearchParams<{
    scanId?: string;
    reviewFrom?: string;
    pendingImageId?: string;
    pendingInput?: string;
  }>();
  const returnTo =
    reviewFrom === 'history'
      ? '/history'
      : reviewFrom === 'notifications'
        ? '/notifications'
        : undefined;
  // Discard local receipts and photos when the account changes on a shared device.
  return (
    <ScanFlow
      key={`${user?.id ?? 'guest'}:${returnTo ?? ''}:${returnTo ? (scanId ?? '') : ''}:${scanDraft(pendingImageId, pendingInput)?.imageId ?? ''}`}
      returnTo={returnTo}
    />
  );
}

function ScanFlow({ returnTo }: { returnTo?: '/history' | '/notifications' }) {
  const { api } = useApp();
  const { scanId, pendingImageId, pendingInput } = useLocalSearchParams<{
    scanId?: string;
    pendingImageId?: string;
    pendingInput?: string;
  }>();
  const resumed = scanDraft(pendingImageId, pendingInput);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photo, setPhoto] = useState<SelectedPhoto | null>(null);
  const [details, setDetails] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);
  const [saved, setSaved] = useState<Schemas['ScanResult'] | null>(null);
  const [receipt, setReceipt] = useState<Schemas['SortingResponse'] | null>(null);
  const [weight, setWeight] = useState('');
  const [confirming, setConfirming] = useState(false);
  const active = useRef(true);
  const focused = useRef(false);
  const pickerGeneration = useRef(0);
  const confirmingRef = useRef(false);
  const pickingRef = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      return () => {
        focused.current = false;
        pickerGeneration.current += 1;
      };
    }, []),
  );
  const create = useCommand<Schemas['ScanResult']>();
  const confirm = useCommand<Schemas['SortingResponse']>({ feedback: true });
  const query = usePages<Schemas['WasteItem']>(`/v1/waste-items?q=${encodeURIComponent(search)}`);
  const remote = useResource<Schemas['ScanResult']>(
    `/v1/scans/${encodeURIComponent(scanId ?? '')}`,
    true,
    !!scanId,
  );
  const scan = remote.data?.confirmation ? remote.data : (saved ?? remote.data);
  const pending = picking || confirming || create.isPending || confirm.isPending;

  function reset() {
    if (pending || confirmingRef.current || pickingRef.current) return;
    clearSelection();
  }
  function clearSelection() {
    setPhoto(null);
    setDetails(false);
    setCameraOpen(false);
    setSaved(null);
    setReceipt(null);
    setError('');
    setWeight('');
    create.reset();
    confirm.reset();
    router.setParams({
      scanId: undefined,
      reviewFrom: undefined,
      pendingImageId: undefined,
      pendingInput: undefined,
    });
  }
  function showResult(uri: string, inputKind: SelectedPhoto['inputKind']) {
    if (!uri) {
      setError('Không mở được ảnh. Vui lòng chọn hoặc chụp lại.');
      return;
    }
    clearSelection();
    setPhoto({ uri, inputKind, imageId: operationKey() });
  }
  async function pick() {
    if (pending || pickingRef.current || confirmingRef.current) return;
    pickingRef.current = true;
    const generation = pickerGeneration.current;
    setError('');
    setPicking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!active.current || !focused.current || generation !== pickerGeneration.current) return;
      if (!permission.granted) {
        setError('Chưa được phép đọc ảnh. Bạn vẫn có thể chọn vật phẩm thủ công.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
      if (
        active.current &&
        focused.current &&
        generation === pickerGeneration.current &&
        !result.canceled &&
        result.assets[0]
      )
        showResult(result.assets[0].uri, 'library');
    } catch (cause) {
      if (active.current && focused.current && generation === pickerGeneration.current)
        setError(errorMessage(cause));
    } finally {
      pickingRef.current = false;
      if (active.current) setPicking(false);
    }
  }
  async function confirmSorting() {
    if (pending || confirmingRef.current || pickingRef.current) return;
    const reportedWeight = parseSortingWeight(weight);
    if (reportedWeight === null) {
      setError(sortingWeightError);
      return;
    }
    confirmingRef.current = true;
    setConfirming(true);
    setError('');
    let current = scan;
    try {
      if (!current) {
        const input = photo ?? resumed;
        if (!input) return;
        current = await create.mutateAsync({
          path: '/v1/scans',
          key: input.imageId,
          body: { inputKind: input.inputKind, clientImageId: input.imageId },
        });
        if (!active.current) return;
        setSaved(current);
        if (focused.current) router.setParams({ scanId: current.id });
      }
      if (current.confirmation) {
        setReceipt(current.confirmation);
        return;
      }
      if (!current.resultItem) {
        setError(
          'Chưa có mục sổ tay được công bố cho kết quả này. Bạn có thể tra cứu thủ công; chưa ghi nhận điểm.',
        );
        return;
      }
      const result = await confirm.mutateAsync({
        path: '/v1/sorting-actions',
        key: `scan-confirm:${current.id}`,
        body: {
          source: 'scan',
          scanId: current.id,
          itemId: current.resultItem.id,
          ...(reportedWeight ? { reportedWeightKg: reportedWeight } : {}),
        },
      });
      if (!active.current) return;
      setSaved({ ...current, confirmation: result });
      setReceipt(result);
    } catch (cause) {
      // A lost response can leave a completed confirmation on the server.
      // Read its receipt before offering another submission of the same scan.
      if (active.current && current?.id) {
        try {
          const latest = await api.request<Schemas['ScanResult']>(`/v1/scans/${current.id}`);
          if (!active.current) return;
          if (latest.confirmation) {
            setSaved(latest);
            setReceipt(latest.confirmation);
            setError('');
            return;
          }
        } catch {
          // Keep the original failure and the selection available for a retry.
        }
      }
      if (active.current) setError(errorMessage(cause));
    } finally {
      confirmingRef.current = false;
      if (active.current) setConfirming(false);
    }
  }

  if (scanId && !photo && !scan)
    return (
      <DesignScreen title="Kết quả quét rác">
        <RequireAuth>
          <QueryState query={remote} />
        </RequireAuth>
        <Button title="Quét lại" onPress={reset} />
      </DesignScreen>
    );
  if (details || resumed || (scanId && !photo))
    return (
      <ScanDetails
        scan={scan}
        pending={pending}
        error={error}
        weight={weight}
        setWeight={setWeight}
        login={() => {
          const input = photo ?? resumed;
          const params = new URLSearchParams();
          if (scan?.id) params.set('scanId', scan.id);
          else if (input) {
            params.set('pendingImageId', input.imageId);
            params.set('pendingInput', input.inputKind);
          }
          const query = params.toString();
          router.push({
            pathname: '/login',
            params: { returnTo: '/scan' + (query ? '?' + query : '') },
          });
        }}
        confirm={() => void confirmSorting()}
        reset={reset}
        back={() => {
          if (returnTo) {
            if (router.canGoBack()) router.back();
            else router.replace(returnTo);
          } else if (photo) {
            setDetails(false);
          } else {
            reset();
          }
        }}
        receipt={receipt}
        closeReceipt={() => setReceipt(null)}
        openReceipt={() => scan?.confirmation && setReceipt(scan.confirmation)}
      />
    );
  if (photo)
    return (
      <ScanPhotoResult
        key={photo.imageId}
        photo={photo}
        error={error}
        pending={pending}
        back={reset}
        details={() => setDetails(true)}
        pick={() => void pick()}
        retry={() => {
          reset();
          setCameraOpen(true);
        }}
      />
    );
  if (cameraOpen)
    return (
      <ScanCapture
        onImage={(uri) => {
          if (!pickingRef.current) showResult(uri, 'camera');
        }}
        onClose={() => setCameraOpen(false)}
        onPick={() => void pick()}
      />
    );
  return (
    <DesignScreen
      title="Phân loại rác"
      family="inter"
      footer={<CurvedNavigation selected="scan" />}
    >
      {
        <>
          <View
            style={{
              minHeight: 330,
              borderRadius: 24,
              backgroundColor: '#DCEFF9',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              gap: 12,
            }}
          >
            <Icon name="scan-outline" size={136} color="#000000" />
            <Label size={20} bold heading>
              Quét và phân loại
            </Label>
            <Label style={{ textAlign: 'center' }}>
              Chụp hoặc chọn ảnh vật phẩm để xem hướng dẫn.
            </Label>
            <View style={{ width: '100%', paddingTop: 20 }}>
              <Button title="Mở camera" disabled={picking} onPress={() => setCameraOpen(true)} />
            </View>
          </View>
          <Button
            title="Chọn ảnh từ thư viện"
            variant="secondary"
            pending={picking}
            onPress={() => void pick()}
          />
        </>
      }
      {!!error && <Notice tone="error">{error}</Notice>}
      <Label bold>Chọn vật phẩm để xem hướng dẫn và ghi nhận phân loại</Label>
      <Search value={search} onChangeText={setSearch} placeholder="Tìm vật phẩm" maxLength={200} />
      <QueryState
        query={query}
        empty={!query.data?.pages[0]?.items.length}
        emptyText="Chưa có vật phẩm trong sổ tay"
      >
        {query.data?.pages
          .flatMap((page) => page.items)
          .map((item) => (
            <MenuItem
              key={item.id}
              title={item.name}
              detail={item.material}
              icon={item.icon}
              onPress={() =>
                router.push({
                  pathname: '/handbook/[id]',
                  params: { id: item.id, fromScan: 'manual' },
                })
              }
            />
          ))}
        <More query={query} />
      </QueryState>
    </DesignScreen>
  );
}
