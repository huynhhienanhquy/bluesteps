import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Platform, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { DesignFrameCanvas, DesignFrameAction as Hit } from '../../design-system/DesignFrameCanvas';
import type {
  DesignLayer,
  FrameData,
  ImageReplacement,
} from '../../design-system/DesignFrameLayers';
import { composerAssets } from '../../design-system/composer-assets';
import { Artwork } from '../../design-system/DesignScreen';
import { Button, Label } from '../../design-system/ui';
import { useApp } from '../../providers';
import {
  emptyComposer,
  useCommunityUi,
  type ComposerDraft,
  type ComposerMedia,
} from './CommunityUiProvider';
import source from './composer-design-data.json';

type Frame = keyof typeof composerAssets;
type Panel =
  | 'main'
  | 'editor'
  | 'audience'
  | 'location'
  | 'feeling'
  | 'gallery'
  | 'multiple'
  | 'camera'
  | 'preview'
  | 'loading'
  | 'upload'
  | 'success';
const frames: Record<Panel, Frame> = {
  main: '386:15047',
  editor: '386:15090',
  audience: '386:15270',
  location: '386:15419',
  feeling: '386:15552',
  gallery: '386:15972',
  multiple: '386:16071',
  camera: '743:6023',
  preview: '741:6114',
  loading: '386:15150',
  upload: '386:16188',
  success: '386:15209',
};
const data = source as unknown as Record<Frame, FrameData & { navigationTop: number | null }>;
const image = (frame: Frame, key: string) =>
  (composerAssets[frame] as Record<string, number>)[key]!;
const sampleText = 'Tham gia chủ nhật xanh, cùng thu gom và phân loại rác nhé! 🌱';
const sampleMedia: ComposerMedia[] = ['imgNhDaChn1', 'imgNhDaChn2'].map((key, i) => ({
  id: 'activity-' + i,
  source: image('741:5779', key),
}));
const gallery = data['386:15972'].layers
  .filter(
    (l) => l.kind === 'image' && l.key?.startsWith('imgRectangle88') && l.y >= 327 && l.y < 708,
  )
  .sort((a, b) => a.y - b.y || a.x - b.x)
  .map((l, i) => ({ id: 'gallery-' + i, source: image('386:15972', l.key!), crop: l.crop }));
const locations = [
  'Đà Nẵng · Hải Châu',
  'Đà Nẵng · Thanh Khê',
  'Bãi biển Mỹ Khê',
  'Cầu Rồng',
  'Nhà hát Trưng Vương',
  'Bãi rêu Nam Ô',
  'Phố cổ Hội An',
  'Bãi biển Cảnh Dương',
  'Aeon Mall',
];
const feelingArt = data['386:15552'].layers
  .filter(
    (l) =>
      l.kind === 'image' &&
      !l.navigation &&
      /^imgGroup\d+$/.test(l.key ?? '') &&
      l.y >= 360 &&
      l.y < 950 &&
      l.x < 280,
  )
  .sort(
    (a, b) =>
      Math.round((a.y - 374) / 75) * 2 +
      (a.x > 150 ? 1 : 0) -
      (Math.round((b.y - 374) / 75) * 2 + (b.x > 150 ? 1 : 0)),
  );
const feelings = [
  'Hạnh phúc',
  'Bất ngờ',
  'Vui vẻ',
  'Yêu thương',
  'Đáng yêu',
  'Lo lắng',
  'Bối rối',
  'Vui vẻ',
  'Chill',
  'Ngầu',
  'Thú vị',
  'Tuyệt vời',
  'Đau buồn',
  'Mỉa mai',
  'Đau khổ',
  'Hài hước',
];
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('đ', 'd')
    .toLowerCase();
const panelFor = (frame: Frame): Panel =>
  (Object.keys(frames) as Panel[]).find((p) => frames[p] === frame) ?? 'main';
const draftFor = (frame: Frame): ComposerDraft => ({
  ...emptyComposer(),
  text:
    frame === '386:15047' ||
    ['386:15270', '386:15419', '386:15552', '386:15972', '386:16071'].includes(frame)
      ? ''
      : sampleText,
  media: ['741:5779', '741:6114', '386:15090', '386:15150', '386:15209'].includes(frame)
    ? sampleMedia
    : [],
  audience: frame === '741:5980' ? 'Bạn bè' : frame === '741:6047' ? 'Chỉ mình tôi' : 'Công khai',
  location: frame === '741:5846' ? locations[0]! : '',
  feeling: frame === '741:5913' ? feelings[0]! : '',
});

export function ComposerDesignScreen() {
  const params = useLocalSearchParams<{ frame?: string; preview?: string; view?: string }>();
  const explicit = params.frame && params.frame in composerAssets ? (params.frame as Frame) : null;
  const ui = useCommunityUi(),
    app = useApp();
  const [panel, setPanel] = useState<Panel>(() =>
    explicit ? panelFor(explicit) : params.view === 'gallery' ? 'gallery' : 'main',
  );
  const [reference, setReference] = useState(explicit);
  const [localSample, setLocalSample] = useState(() => (explicit ? draftFor(explicit) : null));
  const draft = localSample ?? ui.state.composer;
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [flash, setFlash] = useState(true);
  const [shift, setShift] = useState(false);
  const [symbols, setSymbols] = useState(false);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const sample = reference !== null;
  const modal = ['audience', 'location', 'feeling', 'gallery', 'multiple'].includes(panel);
  const fixed = modal || ['editor', 'loading', 'success'].includes(panel);
  const update = (patch: Partial<ComposerDraft>) => {
    const next = { ...draft, ...patch };
    ui.setComposer(next);
    setLocalSample(null);
    setReference(null);
  };
  const open = (next: Panel) => {
    if (localSample) {
      ui.setComposer(localSample);
      setLocalSample(null);
    }
    setReference(null);
    setPanel(next);
    setQuery('');
  };
  const close = () => open('main');
  useEffect(() => {
    if (panel === 'editor' && Platform.OS !== 'web') input.current?.focus();
  }, [panel]);
  useEffect(() => {
    if (sample) return;
    if (panel === 'loading' || panel === 'upload') {
      const timer = setTimeout(() => setPanel(panel === 'loading' ? 'upload' : 'success'), 650);
      return () => clearTimeout(timer);
    }
  }, [panel, sample]);
  const submit = () => {
    if (!draft.text.trim() && !draft.media.length) return;
    app.addPost(draft.text.trim());
    ui.publishComposer(`draft-${app.posts.length + 1}`, draft);
    setLocalSample({ ...draft });
    setReference(null);
    setPanel('loading');
  };
  let frame: Frame = reference ?? frames[panel];
  if (!reference && panel === 'main')
    frame = draft.media.length
      ? '741:5779'
      : draft.location
        ? '741:5846'
        : draft.feeling
          ? '741:5913'
          : draft.audience === 'Bạn bè'
            ? '741:5980'
            : draft.audience === 'Chỉ mình tôi'
              ? '741:6047'
              : '386:15047';
  let layout = data[frame];
  const body = layout.layers.find(
    (l) =>
      l.kind === 'text' &&
      (l.text?.startsWith('Tham gia chủ nhật xanh') || l.text === 'Bạn đang nghĩ gì?'),
  );
  const canPost = !!draft.text.trim() || !!draft.media.length;
  const editable = panel === 'main' || panel === 'editor';
  const mediaSlots = layout.layers.filter(
    (l) =>
      l.kind === 'image' &&
      (l.key?.startsWith('imgNhDaChn') ||
        l.key?.startsWith('imgNhHotDng') ||
        ['imgRectangle791', 'imgRectangle793'].includes(l.key ?? '')),
  );
  if (!sample) {
    layout = {
      ...layout,
      layers: layout.layers.flatMap((l) => {
        if (panel === 'main' && l.kind === 'shape' && l.y === 60 && l.w === 99)
          return [{ ...l, color: canPost ? '#147CC1' : '#C6CCCF' }];
        if (panel === 'preview' && !draft.media.length && mediaSlots.includes(l)) return [];
        if (mediaSlots.includes(l) && mediaSlots.indexOf(l) >= draft.media.length) return [];
        if (
          panel === 'audience' &&
          l.kind === 'image' &&
          l.key?.startsWith('imgEllipse') &&
          l.x >= 340 &&
          l.y > 280 &&
          l.y < 510
        )
          return [];
        return [l];
      }),
    };
  }
  const replaceText = (l: DesignLayer) => {
    if (sample) return undefined;
    if (l === body || (l.text?.startsWith('Tham gia chủ nhật xanh') && !editable))
      return draft.text || 'Bạn đang nghĩ gì?';
    if ((l.text === 'Công khai' || l.text === 'Bạn bè' || l.text === 'Chỉ mình tôi') && l.y < 180)
      return draft.audience;
    if (panel === 'preview' && l.text?.includes('· Vừa xong'))
      return `${draft.audience} · Vừa xong`;
    if (l.text?.startsWith('📍 Đã gắn vị trí')) return `📍 ${draft.location}`;
    if (l.text?.includes('Đã thêm cảm xúc')) return `😊 ${draft.feeling}`;
    if (l.text?.includes('Chỉ bạn bè xem bài')) return '👥 Chỉ bạn bè xem bài';
    if (l.text === 'Chọn nhiều file' && panel === 'multiple' && selected.length)
      return `Dùng ${selected.length} ảnh`;
    if (panel === 'camera' && l.text === '⚡') return flash ? '⚡' : '⚡ Tắt';
    if (
      panel === 'editor' &&
      l.keyboard &&
      l.kind === 'text' &&
      l.text?.length === 1 &&
      /[a-z]/.test(l.text)
    )
      return symbols ? String(l.text.charCodeAt(0) % 10) : shift ? l.text.toUpperCase() : l.text;
    return undefined;
  };
  const replaceImage = (l: DesignLayer): ImageReplacement | undefined => {
    if (sample) return undefined;
    const i = mediaSlots.indexOf(l);
    if (i >= 0 && draft.media[i])
      return { source: draft.media[i]!.source, crop: draft.media[i]!.crop };
    return undefined;
  };
  const shownLocations = locations
    .map((name, i) => ({ name, i }))
    .filter((v) => normalize(v.name).includes(normalize(query)));
  const shownFeelings = feelings
    .map((name, i) => ({ name, i }))
    .filter((v) => normalize(v.name).includes(normalize(query)));
  const hidden = (l: DesignLayer) =>
    (!!body && l.id === body.id && editable) ||
    ((panel === 'location' || panel === 'feeling') &&
      l.kind === 'text' &&
      l.y >= 300 &&
      l.y < 340) ||
    (!sample && panel === 'location' && l.y >= 410 && l.y < 1050 && l.x >= 50 && l.x < 370) ||
    (!sample && panel === 'feeling' && l.y >= 360 && l.y < 930 && l.x >= 45 && l.x < 380);
  const pick = (media: ComposerMedia[]) => {
    update({ media });
    setPanel('main');
  };
  const textBox = body ?? { x: 24, y: 206, w: 370, h: 68 };
  return (
    <DesignFrameCanvas
      frame={frame}
      data={layout}
      assets={composerAssets[frame]}
      fixed={fixed}
      replaceText={replaceText}
      replaceImage={replaceImage}
      hide={hidden}
    >
      {!modal && !['loading', 'upload', 'success'].includes(panel) ? (
        <Hit
          label="Quay lại"
          box={[16, 57, 42, 48]}
          onPress={() =>
            panel === 'main'
              ? router.canGoBack()
                ? router.back()
                : router.replace('/community')
              : close()
          }
        />
      ) : null}
      {editable ? (
        <>
          <TextInput
            ref={input}
            accessibilityLabel="Nội dung bài viết"
            value={
              sample && body ? (body.text === 'Bạn đang nghĩ gì?' ? '' : body.text) : draft.text
            }
            onChangeText={(text) => update({ text: text.slice(0, 2000) })}
            multiline
            maxLength={2000}
            placeholder="Bạn đang nghĩ gì?"
            placeholderTextColor="#777777"
            style={{
              position: 'absolute',
              left: textBox.x,
              top: textBox.y - 2,
              width: Math.max(360, textBox.w),
              height: panel === 'editor' ? 78 : 68,
              padding: 0,
              fontFamily: 'BackupInter_400Regular',
              fontSize: 15,
              color: '#626262',
              textAlignVertical: 'top',
            }}
          />
          <Hit
            label="Đăng bài viết"
            disabled={!canPost}
            box={[300, 58, 105, 43]}
            onPress={submit}
          />
          <Hit
            label={`Quyền xem: ${draft.audience}`}
            box={[90, panel === 'editor' ? 151 : 140, 110, 35]}
            onPress={() => open('audience')}
          />
          {panel === 'main' ? (
            <>
              <Hit label="Ảnh/Video" box={[26, 558, 375, 52]} onPress={() => open('gallery')} />
              <Hit label="Check in" box={[26, 630, 375, 53]} onPress={() => open('location')} />
              <Hit label="Camera" box={[26, 702, 375, 52]} onPress={() => open('camera')} />
              <Hit label="Cảm xúc" box={[26, 774, 375, 52]} onPress={() => open('feeling')} />
              <Hit
                label="Mở bàn phím soạn bài"
                box={[82, 493, 259, 52]}
                onPress={() => open('editor')}
              />
              {draft.media.length ? (
                <Hit
                  label="Xem trước bài viết"
                  box={[284, 453, 119, 35]}
                  onPress={() => open('preview')}
                />
              ) : !sample && canPost ? (
                <View style={{ position: 'absolute', left: 284, top: 453, width: 119 }}>
                  <Button title="Xem trước" onPress={() => open('preview')} />
                </View>
              ) : null}
              {!sample && draft.media.length ? (
                <View
                  style={{ position: 'absolute', left: 24, top: 440, flexDirection: 'row', gap: 8 }}
                >
                  {draft.media.map((m, i) => (
                    <Button
                      key={m.id}
                      title={`Bỏ ảnh ${i + 1}`}
                      variant="quiet"
                      onPress={() => update({ media: draft.media.filter((_, j) => j !== i) })}
                    />
                  ))}
                </View>
              ) : null}
              {!sample && draft.location && frame !== '741:5846' ? (
                <View style={{ position: 'absolute', left: 24, top: 244 }}>
                  <Label size={12} color="#147CC1">
                    📍 {draft.location} {draft.feeling ? `· ${draft.feeling}` : ''}
                  </Label>
                </View>
              ) : null}
            </>
          ) : (
            <>
              <Hit label="Check in" box={[32, 560, 45, 39]} onPress={() => open('location')} />
              <Hit label="Cảm xúc" box={[140, 560, 44, 39]} onPress={() => open('feeling')} />
              <Hit label="Ảnh/Video" box={[250, 560, 44, 39]} onPress={() => open('gallery')} />
              <Hit label="Camera" box={[360, 560, 44, 39]} onPress={() => open('camera')} />
              <Hit label="Thêm ảnh" box={[31, 451, 160, 109]} onPress={() => open('gallery')} />
              {Platform.OS === 'web' ? (
                <>
                  {layout.layers
                    .filter(
                      (l) =>
                        l.keyboard &&
                        l.kind === 'text' &&
                        l.text?.length === 1 &&
                        /[a-z,.]/.test(l.text),
                    )
                    .map((l) => (
                      <Hit
                        key={l.id}
                        label={`Phím ${l.text}`}
                        box={[l.x - 7, l.y - 10, Math.max(32, l.w + 14), 46]}
                        onPress={() => {
                          const char = symbols
                            ? String(l.text!.charCodeAt(0) % 10)
                            : shift
                              ? l.text!.toUpperCase()
                              : l.text!;
                          update({ text: (draft.text + char).slice(0, 2000) });
                        }}
                      />
                    ))}
                  <Hit
                    label="Phím cách"
                    box={[154, 826, 161, 46]}
                    onPress={() => update({ text: (draft.text + ' ').slice(0, 2000) })}
                  />
                  <Hit
                    label="Xóa ký tự"
                    box={[367, 768, 49, 46]}
                    onPress={() => update({ text: Array.from(draft.text).slice(0, -1).join('') })}
                  />
                  <Hit
                    label="Viết hoa"
                    box={[8, 768, 57, 46]}
                    selected={shift}
                    onPress={() => setShift(!shift)}
                  />
                  <Hit
                    label="Ký tự và số"
                    box={[8, 826, 57, 46]}
                    selected={symbols}
                    onPress={() => setSymbols(!symbols)}
                  />
                  <Hit
                    label="Xuống dòng"
                    box={[367, 826, 49, 46]}
                    onPress={() => update({ text: (draft.text + '\n').slice(0, 2000) })}
                  />
                  <Hit label="Ẩn bàn phím" box={[18, 886, 32, 35]} onPress={close} />
                </>
              ) : null}
            </>
          )}
        </>
      ) : null}
      {modal ? <Hit label="Đóng bộ chọn" box={[345, 182, 39, 43]} onPress={close} /> : null}
      {panel === 'audience'
        ? (['Công khai', 'Bạn bè', 'Chỉ mình tôi'] as const).map((audience, i) => (
            <View key={audience}>
              {!sample ? (
                <View
                  style={{
                    position: 'absolute',
                    left: 347,
                    top: 298 + i * 91,
                    width: 25,
                    height: 25,
                    borderRadius: 13,
                    borderWidth: 1,
                    borderColor: '#9BA5AA',
                    backgroundColor: draft.audience === audience ? '#6DB3D6' : '#C8CCCC',
                  }}
                />
              ) : null}
              <Hit
                role="radio"
                label={audience}
                checked={draft.audience === audience}
                box={[43, 280 + i * 91, 335, 69]}
                onPress={() => {
                  update({ audience });
                  setPanel('main');
                }}
              />
            </View>
          ))
        : null}
      {panel === 'location' || panel === 'feeling' ? (
        <>
          <TextInput
            accessibilityLabel={panel === 'location' ? 'Tìm địa điểm' : 'Tìm cảm xúc'}
            value={query}
            onChangeText={setQuery}
            placeholder={panel === 'location' ? 'Bạn đang ở đâu?' : 'Tìm kiếm..'}
            placeholderTextColor="#8A8A8A"
            style={{
              position: 'absolute',
              left: 94,
              top: panel === 'location' ? 310 : 306,
              width: 260,
              height: 30,
              padding: 0,
              fontFamily: 'BackupInter_400Regular',
              fontSize: 14,
              color: '#172D3D',
            }}
          />
          {sample ? (
            (panel === 'location' ? locations.slice(0, 4) : feelings.slice(0, 10)).map(
              (name, i) => (
                <Hit
                  key={name + i}
                  label={`Chọn ${name}${panel === 'location' ? '' : ` ${i + 1}`}`}
                  box={
                    panel === 'location'
                      ? [52, 411 + i * 73, 316, 63]
                      : [47 + (i % 2) * 174, 363 + Math.floor(i / 2) * 75, 165, 56]
                  }
                  onPress={() => {
                    update(panel === 'location' ? { location: name } : { feeling: name });
                    setPanel('main');
                  }}
                />
              ),
            )
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={{
                position: 'absolute',
                left: 47,
                top: panel === 'location' ? 411 : 363,
                width: 333,
                height: panel === 'location' ? 264 : 333,
              }}
              contentContainerStyle={{ gap: 14, paddingBottom: 12 }}
            >
              {panel === 'location' ? (
                shownLocations.map(({ name, i }) => (
                  <View
                    key={name}
                    style={{ height: 59, flexDirection: 'row', alignItems: 'center', gap: 16 }}
                  >
                    <Artwork source={image('386:15419', 'imgGroup36828')} width={50} height={50} />
                    <Label bold>{name}</Label>
                    <Hit
                      label={`Chọn ${name}`}
                      box={[0, 0, 329, 59]}
                      onPress={() => {
                        update({ location: locations[i] });
                        setPanel('main');
                      }}
                    />
                  </View>
                ))
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                  {shownFeelings.map(({ name, i }) => (
                    <View
                      key={name + i}
                      style={{
                        width: 150,
                        height: 61,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <View
                        style={{
                          width: 50,
                          height: 50,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Artwork
                          source={image('386:15552', 'imgEllipse74')}
                          width={50}
                          height={50}
                        />
                        <View style={{ position: 'absolute' }}>
                          <Artwork
                            source={image('386:15552', feelingArt[i]!.key!)}
                            width={feelingArt[i]!.w}
                            height={feelingArt[i]!.h}
                          />
                        </View>
                      </View>
                      <Label bold>{name}</Label>
                      <Hit
                        label={`Chọn ${name} ${i + 1}`}
                        box={[0, 0, 150, 61]}
                        onPress={() => {
                          update({ feeling: feelings[i] });
                          setPanel('main');
                        }}
                      />
                    </View>
                  ))}
                </View>
              )}
              {!(panel === 'location' ? shownLocations : shownFeelings).length ? (
                <Label>Không có kết quả phù hợp</Label>
              ) : null}
            </ScrollView>
          )}
        </>
      ) : null}
      {panel === 'gallery' || panel === 'multiple' ? (
        <>
          <Hit
            label={
              panel === 'gallery'
                ? 'Chọn nhiều file'
                : selected.length
                  ? `Dùng ${selected.length} ảnh`
                  : 'Chọn một file'
            }
            box={[237, 280, 150, 38]}
            onPress={() =>
              panel === 'gallery'
                ? open('multiple')
                : selected.length
                  ? pick(gallery.filter((m) => selected.includes(m.id)))
                  : open('gallery')
            }
          />
          {gallery.map((m, i) => (
            <View key={m.id}>
              {!sample && selected.includes(m.id) ? (
                <View
                  style={{
                    position: 'absolute',
                    left: 24 + (i % 3) * 125,
                    top: 327 + Math.floor(i / 3) * 127,
                    width: 124,
                    height: 126,
                    borderColor: '#147CC1',
                    borderWidth: 4,
                    backgroundColor: 'rgba(20,124,193,.15)',
                  }}
                />
              ) : null}
              <Hit
                label={`Chọn ảnh ${i + 1}`}
                selected={selected.includes(m.id)}
                box={[24 + (i % 3) * 125, 327 + Math.floor(i / 3) * 127, 124, 126]}
                onPress={() =>
                  panel === 'multiple'
                    ? setSelected((s) =>
                        s.includes(m.id) ? s.filter((x) => x !== m.id) : [...s, m.id].slice(0, 2),
                      )
                    : pick([m])
                }
              />
            </View>
          ))}
        </>
      ) : null}
      {panel === 'camera' ? (
        <>
          <Hit label="Chụp ảnh" box={[169, 790, 91, 91]} onPress={() => pick([sampleMedia[0]!])} />
          <Hit label="Mở thư viện" box={[29, 801, 66, 67]} onPress={() => open('gallery')} />
          <Hit
            label="Bật/tắt đèn flash"
            selected={flash}
            box={[359, 793, 48, 62]}
            onPress={() => {
              setReference(null);
              setFlash(!flash);
            }}
          />
        </>
      ) : null}
      {panel === 'preview' ? (
        <Hit label="Đăng bài viết" box={[28, 764, 372, 52]} disabled={!canPost} onPress={submit} />
      ) : null}
      {panel === 'success' ? (
        <Hit
          label="Về cộng đồng"
          box={[118, 532, 200, 56]}
          onPress={() => router.replace('/community')}
        />
      ) : null}
    </DesignFrameCanvas>
  );
}
