import { useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { DesignFrameCanvas, DesignFrameAction as Hit } from '../../design-system/DesignFrameCanvas';
import { DesignFrameLayers, type DesignLayer } from '../../design-system/DesignFrameLayers';
import { finalAssets } from '../../design-system/final-assets';
import { Button, Label } from '../../design-system/ui';
import { finalData, type FinalFrame } from './BackupedParts';

const bins = ['Hữu cơ', 'Tái chế', 'Vô cơ'] as const;
type Bin = (typeof bins)[number];
type Item = { key: string; label: string };
const items: Item[] = [
  { key: 'imgRectangle214', label: 'Chai nhựa' },
  { key: 'imgDownload161', label: 'Pin đã qua sử dụng' },
  { key: 'imgDownload231', label: 'Giấy vệ sinh' },
  { key: 'imgDownload112', label: 'Túi nhựa tím' },
  { key: 'imgImage29', label: 'Mảnh vỡ' },
  { key: 'imgImage32', label: 'Thùng giấy' },
  { key: 'imgImage34', label: 'Vỏ chuối' },
  { key: 'imgImage33', label: 'Rau củ' },
];
const steps: FinalFrame[] = [
  '386:18308',
  '386:18336',
  '386:18364',
  '427:19392',
  '386:18396',
  '427:19460',
];
const results: FinalFrame[] = ['386:18428', '487:19805'];
const inputStyle = {
  borderWidth: 1,
  borderColor: '#B8D8EC',
  borderRadius: 12,
  padding: 12,
  fontFamily: 'BackupInter_400Regular',
  color: '#152C3A',
};

export function BackupedGameScreen() {
  const params = useLocalSearchParams<{ frame?: string; preview?: string }>();
  const explicit =
    params.frame && params.frame in finalAssets ? (params.frame as FinalFrame) : null;
  const [reference, setReference] = useState(explicit),
    [view, setView] = useState<'list' | 'lobby' | 'board' | 'checked' | 'result'>('list');
  const [assignments, setAssignments] = useState<Partial<Record<string, Bin>>>({}),
    [selected, setSelected] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'room' | 'schedule' | 'search' | 'XO' | 'Đua vịt' | null>(
    null,
  );
  const [title, setTitle] = useState(''),
    [date, setDate] = useState(''),
    [query, setQuery] = useState(''),
    [saved, setSaved] = useState<string[]>([]);
  const sample = reference !== null;
  const frame: FinalFrame =
    reference ??
    (view === 'list'
      ? '386:18241'
      : view === 'lobby'
        ? '386:18285'
        : view === 'result'
          ? '386:18428'
          : '386:18308');
  const list = frame === '386:18241',
    lobby = frame === '386:18285',
    result = results.includes(frame);
  const board = !list && !lobby && !result;
  const boardLayers = finalData['386:18308'].layers;
  const itemLayer = (item: Item) => boardLayers.find((l) => l.key === item.key)!;
  const assigned = Object.keys(assignments).length;
  const start = () => {
    setReference(null);
    setView('board');
    setAssignments({});
    setSelected(null);
  };
  const enter = () => {
    setReference(null);
    setView('lobby');
  };
  const back = () => {
    if (!sample && view !== 'list') {
      setView(view === 'lobby' ? 'list' : 'lobby');
      setAssignments({});
      setSelected(null);
    } else if (sample) {
      setReference(null);
      setView('list');
    } else if (router.canGoBack()) router.back();
    else router.replace('/profile');
  };
  const place = (bin: Bin) => {
    if (!selected || view === 'checked') return;
    setAssignments((current) => ({ ...current, [selected]: bin }));
    setSelected(null);
  };
  const check = () => {
    setSelected(null);
    setView('checked');
  };
  const moved = (item: Item): DesignLayer => {
    const layer = itemLayer(item),
      bin = assignments[item.key];
    if (!bin) return layer;
    const peers = items.filter((i) => assignments[i.key] === bin),
      index = peers.indexOf(item),
      column = bins.indexOf(bin);
    return {
      ...layer,
      x: 18 + column * 136 + (index % 2) * 44,
      y: 428 + Math.floor(index / 2) * 49,
      w: 48,
      h: 46,
      clip: undefined,
      crop: undefined,
    };
  };
  const runtimeBoard = board && !sample;
  const hide = (l: DesignLayer) => runtimeBoard && items.some((item) => l.key === item.key);
  const searchResults = ['Sứ mệnh xanh', 'XO', 'Đua vịt'].filter((name) =>
    name.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')),
  );
  return (
    <>
      <DesignFrameCanvas
        frame={frame}
        data={finalData[frame]}
        assets={finalAssets[frame]}
        fixed={params.preview === '1'}
        hide={hide}
      >
        <Hit label="Quay lại" box={[6, 62, 44, 44]} onPress={back} />
        {list ? (
          <>
            <Hit
              label="Tạo phòng"
              box={[18, 118, 139, 178]}
              onPress={() => {
                setTitle('');
                setSheet('room');
              }}
            />
            <Hit label="Chơi Sứ mệnh xanh" box={[172, 118, 139, 178]} onPress={enter} />
            <Hit label="Xem XO" box={[326, 118, 102, 178]} onPress={() => setSheet('XO')} />
            <Hit
              label="Tìm trò chơi"
              box={[18, 566, 146, 40]}
              onPress={() => {
                setQuery('');
                setSheet('search');
              }}
            />
            <Hit
              label="Tạo lịch chơi"
              box={[196, 566, 156, 40]}
              onPress={() => {
                setTitle('');
                setDate('');
                setSheet('schedule');
              }}
            />
            <Hit label="Chơi lại Sứ mệnh xanh" box={[24, 660, 171, 178]} onPress={enter} />
            <Hit
              label="Xem Đua vịt"
              box={[227, 660, 171, 178]}
              onPress={() => setSheet('Đua vịt')}
            />
            {!sample && saved.length ? (
              <View
                style={{
                  position: 'absolute',
                  left: 24,
                  top: 852,
                  width: 380,
                  padding: 10,
                  borderRadius: 12,
                  backgroundColor: '#EAF5FC',
                }}
              >
                <Label size={12}>{saved.at(-1)}</Label>
              </View>
            ) : null}
          </>
        ) : null}
        {lobby ? <Hit label="Bắt đầu" box={[148, 565, 137, 60]} onPress={start} /> : null}
        {runtimeBoard ? (
          <>
            <DesignFrameLayers
              frame={frame}
              layers={items.map(moved)}
              assets={finalAssets['386:18308']}
            />
            {bins.map((bin, index) => (
              <Hit
                key={bin}
                label={`Bỏ vào ${bin}`}
                disabled={!selected || view === 'checked'}
                box={[9 + index * 136, 399, 128, 267]}
                onPress={() => place(bin)}
              />
            ))}
            {items.map((item) => {
              const l = moved(item);
              return (
                <View key={item.key}>
                  {selected === item.key ? (
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        left: l.x - 4,
                        top: l.y - 4,
                        width: l.w + 8,
                        height: l.h + 8,
                        borderWidth: 3,
                        borderColor: '#147CC1',
                        borderRadius: 10,
                      }}
                    />
                  ) : null}
                  <Hit
                    label={`Chọn ${item.label}`}
                    selected={selected === item.key}
                    disabled={view === 'checked'}
                    box={[l.x, l.y, l.w, l.h]}
                    onPress={() => setSelected(item.key)}
                  />
                </View>
              );
            })}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 28,
                top: 774,
                width: 372,
                padding: 12,
                borderRadius: 12,
                backgroundColor: 'rgba(255,255,255,.95)',
              }}
            >
              <Label size={13} style={{ textAlign: 'center' }}>
                {view === 'checked'
                  ? `Đã xếp ${assigned}/${items.length} vật phẩm`
                  : selected
                    ? `${items.find((item) => item.key === selected)?.label}: chọn một thùng bên dưới`
                    : `Chọn vật phẩm rồi chọn thùng · ${assigned}/${items.length}`}
              </Label>
            </View>
            <View style={{ position: 'absolute', left: 126, top: 704, width: 176 }}>
              <Button
                title={view === 'checked' ? 'Xem kết quả' : 'Kiểm tra'}
                disabled={assigned !== items.length}
                onPress={() => (view === 'checked' ? setView('result') : check())}
              />
            </View>
          </>
        ) : null}
        {board && sample ? (
          <>
            <Hit
              label="Tiếp tục phân loại"
              box={[44, 144, 337, 213]}
              onPress={() => {
                const i = steps.indexOf(frame);
                setReference(steps[Math.min(i + 1, 3)]!);
              }}
            />
            {['386:18364', '427:19392'].includes(frame) ? (
              <Hit
                label="Kiểm tra"
                box={[139, 704, 142, 49]}
                onPress={() => setReference(frame === '386:18364' ? '386:18396' : '427:19460')}
              />
            ) : null}
            {['386:18396', '427:19460'].includes(frame) ? (
              <Hit
                label="Xem kết quả"
                box={[44, 647, 337, 83]}
                onPress={() => setReference(frame === '386:18396' ? '386:18428' : '487:19805')}
              />
            ) : null}
          </>
        ) : null}
        {result ? (
          <>
            <Hit label="Chơi lại" box={[154, 567, 120, 35]} onPress={start} />
            <Hit
              label="Đi đến tích điểm"
              box={[122, 608, 185, 38]}
              onPress={() => router.push('/rewards')}
            />
          </>
        ) : null}
      </DesignFrameCanvas>
      <Modal
        visible={sheet !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSheet(null)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
            backgroundColor: 'rgba(8,30,44,.35)',
          }}
        >
          <Pressable
            accessibilityLabel="Đóng bảng trò chơi"
            onPress={() => setSheet(null)}
            style={{ position: 'absolute', inset: 0 }}
          />
          <View
            style={{
              width: '100%',
              maxWidth: 380,
              maxHeight: '85%',
              padding: 24,
              backgroundColor: 'white',
              borderRadius: 22,
              gap: 18,
            }}
          >
            <Label size={22} bold heading>
              {sheet === 'room'
                ? 'Tạo phòng'
                : sheet === 'schedule'
                  ? 'Tạo lịch chơi'
                  : sheet === 'search'
                    ? 'Tìm trò chơi'
                    : sheet}
            </Label>
            {sheet === 'search' ? (
              <>
                <TextInput
                  accessibilityLabel="Tên trò chơi"
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Tìm kiếm"
                  style={inputStyle}
                />
                <ScrollView style={{ maxHeight: 250 }} contentContainerStyle={{ gap: 12 }}>
                  {searchResults.length ? (
                    searchResults.map((name) => (
                      <Button
                        key={name}
                        title={name}
                        onPress={() => {
                          setSheet(null);
                          if (name === 'Sứ mệnh xanh') enter();
                          else setSheet(name as 'XO' | 'Đua vịt');
                        }}
                      />
                    ))
                  ) : (
                    <Label>Không tìm thấy trò chơi.</Label>
                  )}
                </ScrollView>
              </>
            ) : sheet === 'room' || sheet === 'schedule' ? (
              <>
                <TextInput
                  accessibilityLabel="Tên phòng"
                  maxLength={60}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Tên phòng Sứ mệnh xanh"
                  style={inputStyle}
                />
                {sheet === 'schedule' ? (
                  <TextInput
                    accessibilityLabel="Thời gian chơi"
                    maxLength={60}
                    value={date}
                    onChangeText={setDate}
                    placeholder="Thời gian chơi"
                    style={inputStyle}
                  />
                ) : null}
                <Button
                  title={sheet === 'room' ? 'Tạo phòng' : 'Lưu lịch chơi'}
                  disabled={!title.trim() || (sheet === 'schedule' && !date.trim())}
                  onPress={() => {
                    setSaved((current) => [
                      ...current,
                      `${title.trim()}${date.trim() ? ` · ${date.trim()}` : ''}`,
                    ]);
                    setSheet(null);
                    if (sheet === 'room') enter();
                  }}
                />
              </>
            ) : (
              <>
                <Label>Chọn Sứ mệnh xanh để luyện phân loại rác.</Label>
                <Button
                  title="Chơi Sứ mệnh xanh"
                  onPress={() => {
                    setSheet(null);
                    enter();
                  }}
                />
              </>
            )}
            <Button title="Đóng" variant="secondary" onPress={() => setSheet(null)} />
          </View>
        </View>
      </Modal>
    </>
  );
}
