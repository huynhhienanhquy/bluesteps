import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Keyboard, Platform, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { DesignFrameCanvas, DesignFrameAction as Hit } from '../../design-system/DesignFrameCanvas';
import {
  DesignFrameLayers,
  type DesignLayer,
  type FrameData,
  type ImageReplacement,
} from '../../design-system/DesignFrameLayers';
import { Artwork } from '../../design-system/DesignScreen';
import { chatAssets } from '../../design-system/chat-assets';
import { Button, Label } from '../../design-system/ui';
import { CollectionSheet } from '../collection/CollectionPage';
import { chatContacts, useChatUi, type ChatMessage, type ChatPayload } from './ChatUiProvider';
import source from './chat-design-data.json';

type Frame = keyof typeof chatAssets;
type Panel =
  | 'list'
  | 'thread'
  | 'share'
  | 'emoji'
  | 'attachments'
  | 'photo'
  | 'photos'
  | 'files'
  | 'recording'
  | 'editing';
const frames: Record<Panel, Frame> = {
  list: '386:8086',
  thread: '386:8151',
  share: '386:17262',
  emoji: '771:6023',
  attachments: '771:6108',
  photo: '771:6144',
  photos: '773:6563',
  files: '773:6609',
  recording: '771:6514',
  editing: '772:6456',
};
const sentFrames: Record<ChatMessage['kind'], Frame> = {
  text: '772:6544',
  emoji: '771:6077',
  photo: '771:6180',
  file: '771:6480',
  voice: '771:6565',
  post: '386:8179',
};
const data = source as unknown as Record<Frame, FrameData & { navigationTop: number | null }>;
const image = (frame: Frame, key: string) => (chatAssets[frame] as Record<string, number>)[key]!;
const contactPictures = data['386:8086'].layers
  .filter((l) => l.kind === 'image' && l.w === 70 && l.y >= 410)
  .sort((a, b) => a.y - b.y);
const gallery = data['773:6563'].layers
  .filter((l) => l.kind === 'image' && l.key?.startsWith('imgGalleryPhoto'))
  .sort((a, b) => a.y - b.y || a.x - b.x);
const files = [
  { name: 'Huong-dan-phan-loai-rac.pdf', meta: 'PDF · 1,2 MB' },
  { name: 'Lich-thu-gom-thang-10.pdf', meta: 'PDF · 860 KB' },
  { name: 'Ghi-chu-tai-che.docx', meta: 'DOCX · 32 KB' },
];
const emojis = [
  '😀',
  '😊',
  '😂',
  '🥰',
  '😍',
  '😎',
  '😢',
  '👍',
  '❤️',
  '💚',
  '🎉',
  '🙏',
  '🌿',
  '♻️',
  '✨',
  '🔥',
  '🤝',
  '👏',
  '😮',
  '💪',
];
const noMessages: ChatMessage[] = [];
const emojiCategories = [
  { label: 'Gần đây', symbol: '', values: emojis },
  {
    label: 'Mặt cười',
    symbol: '😀',
    values: emojis.filter((e) => ['😀', '😊', '😂', '🥰', '😍', '😎', '😢', '😮'].includes(e)),
  },
  { label: 'Động vật', symbol: '🐻', values: ['🐻'] },
  { label: 'Thiên nhiên', symbol: '🍃', values: ['🍃', '🌿', '♻️'] },
  { label: 'Trái tim', symbol: '❤️', values: ['❤️', '💚'] },
  { label: 'Lễ hội', symbol: '🎉', values: ['🎉', '✨', '🔥', '👏', '🤝'] },
];
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('đ', 'd')
    .toLowerCase()
    .trim();
const panelFor = (frame: Frame): Panel =>
  (Object.keys(frames) as Panel[]).find((p) => frames[p] === frame) ?? 'thread';
const back = () => (router.canGoBack() ? router.back() : router.replace('/community'));
const goThread = (id: string) => router.push({ pathname: '/conversation', params: { id } });
const duration = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const summary = (m: ChatMessage) =>
  m.kind === 'photo'
    ? 'Đã gửi ảnh'
    : m.kind === 'file'
      ? files[m.fileIndex ?? 0]!.name
      : m.kind === 'voice'
        ? 'Đã gửi ghi âm'
        : m.kind === 'post'
          ? 'Đã chia sẻ bài viết'
          : (m.text ?? '');
const heights = (m: ChatMessage) =>
  m.kind === 'photo'
    ? 236 + (m.text ? 42 : 0)
    : m.kind === 'post'
      ? 264
      : m.kind === 'file'
        ? 132
        : m.kind === 'voice'
          ? 108
          : Math.max(76, 48 + Math.ceil((m.text?.length ?? 0) / 32) * 20);

function MessageBubble({
  message,
  playing,
  elapsed,
  onPlay,
  onPhoto,
  onFile,
}: {
  message: ChatMessage;
  playing: boolean;
  elapsed: number;
  onPlay: () => void;
  onPhoto: () => void;
  onFile: () => void;
}) {
  const file = files[message.fileIndex ?? 0]!;
  if (message.kind === 'post')
    return (
      <View style={{ height: 260, width: 428 }}>
        <DesignFrameLayers
          frame="386:8179"
          layers={data['386:8179'].layers.filter((l) => l.y >= 613 && l.y < 869)}
          assets={chatAssets['386:8179']}
          offsetY={613}
          replaceText={(l) =>
            l.text === 'Healing' && message.postId === 'save' ? 'Save' : undefined
          }
        />
        <Hit
          label="Mở bài viết đã chia sẻ"
          box={[87, 0, 224, 208]}
          onPress={() =>
            router.push({
              pathname: '/community',
              params: { view: 'post', postId: message.postId ?? 'healing' },
            })
          }
        />
      </View>
    );
  return (
    <View style={{ width: 428, alignItems: 'flex-end', paddingHorizontal: 25, gap: 8 }}>
      {message.kind === 'photo' ? (
        <View style={{ width: 220, borderRadius: 14, overflow: 'hidden' }}>
          <Artwork source={message.source!} width={220} height={190} fit="cover" />
          <Hit label="Mở ảnh đã gửi" box={[0, 0, 220, 190]} onPress={onPhoto} />
          {message.text ? (
            <View style={{ padding: 8, backgroundColor: '#F0F6FB' }}>
              <Label size={13}>{message.text}</Label>
            </View>
          ) : null}
        </View>
      ) : message.kind === 'file' ? (
        <View
          style={{
            width: 287,
            height: 103,
            padding: 14,
            borderRadius: 16,
            backgroundColor: '#F0F6FB',
            flexDirection: 'row',
            gap: 10,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              backgroundColor: '#147CC1',
              width: 56,
              height: 60,
              borderRadius: 12,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Label size={24}>📄</Label>
          </View>
          <View style={{ flex: 1, gap: 9 }}>
            <Label size={12} bold>
              {file.name}
            </Label>
            <Label size={12} color="#7A8791">
              {file.meta}
            </Label>
          </View>
          <Hit label={`Mở ${file.name}`} box={[0, 0, 287, 103]} onPress={onFile} />
        </View>
      ) : message.kind === 'voice' ? (
        <View
          style={{
            backgroundColor: '#147CC1',
            width: 287,
            height: 70,
            borderRadius: 16,
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            gap: 13,
          }}
        >
          <Label color="#FFFFFF" size={22}>
            {playing ? 'Ⅱ' : '▶'}
          </Label>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            {[12, 24, 18, 26, 20, 30, 14, 28, 20, 32, 18, 26, 16].map((h, i) => (
              <View
                key={i}
                style={{
                  width: 3,
                  height: h,
                  borderRadius: 2,
                  backgroundColor: playing && i < elapsed ? '#8DD4FF' : '#FFFFFF',
                }}
              />
            ))}
          </View>
          <Label color="#FFFFFF" size={12}>
            {duration(playing ? elapsed : (message.seconds ?? 1))}
          </Label>
          <Hit
            label={playing ? 'Tạm dừng ghi âm' : 'Phát ghi âm'}
            box={[0, 0, 287, 70]}
            onPress={onPlay}
          />
        </View>
      ) : (
        <View
          style={{
            maxWidth: 278,
            minWidth: 72,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 16,
            backgroundColor: '#147CC1',
          }}
        >
          <Label size={message.kind === 'emoji' ? 28 : 14} color="#FFFFFF">
            {message.text}
          </Label>
        </View>
      )}
      <Label size={11} color="#7A8791">
        Đã gửi · Vừa xong
      </Label>
    </View>
  );
}

export function MessagesDesignScreen() {
  return <ChatDesignScreen initialPanel="list" />;
}
export function ConversationDesignScreen() {
  return <ChatDesignScreen initialPanel="thread" />;
}
export function ChatDesignScreen({ initialPanel = 'list' }: { initialPanel?: Panel }) {
  const params = useLocalSearchParams<{
    id?: string;
    view?: string;
    frame?: string;
    preview?: string;
    postId?: string;
  }>();
  const explicit = params.frame && params.frame in chatAssets ? (params.frame as Frame) : null;
  const [reference, setReference] = useState(explicit);
  const [panel, setPanel] = useState<Panel>(() =>
    explicit ? panelFor(explicit) : params.view === 'share' ? 'share' : initialPanel,
  );
  const contact = chatContacts.find((c) => c.id === params.id) ?? chatContacts[0];
  const ui = useChatUi();
  const messages = ui.state.rooms[contact.id] ?? noMessages;
  const draft = ui.state.drafts[contact.id] ?? '';
  const [query, setQuery] = useState(''),
    [photo, setPhoto] = useState(() => image('771:6144', 'imgNhDcChn')),
    [caption, setCaption] = useState('');
  const [category, setCategory] = useState(0);
  const emojiChoices = emojiCategories[category]!.values;
  const [seconds, setSeconds] = useState(0),
    [playing, setPlaying] = useState<number | null>(null),
    [elapsed, setElapsed] = useState(0);
  const [sheet, setSheet] = useState<string | null>(null);
  const [returnPanel, setReturnPanel] = useState<Panel>('thread');
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const sample = reference !== null;
  const list = panel === 'list',
    share = panel === 'share';
  const immersive = ['photo', 'photos', 'files'].includes(panel);
  const isThread = !list && !share && !immersive;
  const open = (next: Panel) => {
    Keyboard.dismiss();
    setReference(null);
    setPanel(next);
  };
  const closePanel = () => open('thread');
  useEffect(() => {
    if (!sample && panel === 'recording') {
      const timer = setInterval(() => setSeconds((s) => Math.min(120, s + 1)), 1000);
      return () => clearInterval(timer);
    }
  }, [panel, sample]);
  useEffect(() => {
    if (!sample && panel === 'editing' && Platform.OS !== 'web') input.current?.focus();
  }, [panel, sample]);
  useEffect(() => {
    if (playing === null) return;
    const m = messages.find((m) => m.id === playing);
    const timer = setTimeout(() => {
      if (elapsed + 1 >= (m?.seconds ?? 1)) {
        setPlaying(null);
        setElapsed(0);
      } else setElapsed(elapsed + 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [playing, messages, elapsed]);
  const send = (payload: ChatPayload) => {
    if (ui.send(contact.id, payload)) {
      Keyboard.dismiss();
      setReference(null);
      setPanel('thread');
    }
  };
  const sendText = () =>
    send({
      kind: panel === 'emoji' ? 'emoji' : 'text',
      text: sample ? (panel === 'emoji' ? '😊' : 'Mình thấy rất hay và hữu ích 💚') : draft,
    });
  const latest = messages.at(-1);
  const frame: Frame =
    reference ?? (panel === 'thread' && latest ? sentFrames[latest.kind] : frames[panel]);
  const original = data[frame];
  const footerTop =
    panel === 'emoji'
      ? 606
      : panel === 'editing'
        ? 620
        : panel === 'recording'
          ? 757
          : panel === 'photo'
            ? 782
            : frame === '386:8179'
              ? 887
              : 852;
  const dock = !sample && ((isThread && panel !== 'attachments') || panel === 'photo');
  const contactIndex = chatContacts.indexOf(contact);
  const matching = chatContacts.filter((c) => normalize(c.name).includes(normalize(query)));
  const rows = sample ? chatContacts : matching;
  let layers = original.layers;
  if (!sample && list) {
    layers = layers.flatMap((l) => {
      const row = chatContacts.findIndex((_, i) => l.y >= 410 + i * 99 && l.y < 509 + i * 99);
      if (row < 0) return [l];
      const next = matching.indexOf(chatContacts[row]!);
      return next < 0 ? [] : [{ ...l, y: l.y + (next - row) * 99 }];
    });
  }
  if (!sample && isThread && panel !== 'attachments')
    layers = layers.filter((l) => !(l.y >= 610 && l.y < footerTop));
  if (frame === '772:6456') layers = layers.map((l) => (l.y >= 684 ? { ...l, keyboard: true } : l));
  const layout = { ...original, layers };
  const messageHeight = messages.reduce((h, m) => h + heights(m) + 14, 0);
  const footerOffset = dock ? footerTop : 0;
  const setDraft = (value: string) => ui.setDraft(contact.id, value);
  const replaceText = (l: DesignLayer) => {
    if (l.text === '☺') return '☺️';
    if (sample) return undefined;
    if (!list && !share && l.text === 'Nguyễn Thị Linh Chi') return contact.name;
    if (list && l.text?.startsWith('Hoạt động')) {
      const row = matching[Math.round((l.y - 452) / 99)];
      const message = row ? ui.state.rooms[row.id]?.at(-1) : undefined;
      return message ? summary(message).slice(0, 42) : undefined;
    }
    if (panel === 'recording' && l.text?.startsWith('Đang ghi âm'))
      return `Đang ghi âm  ${duration(seconds)}`;
    return undefined;
  };
  const replaceImage = (l: DesignLayer): ImageReplacement | undefined => {
    if (sample) return undefined;
    if (
      !list &&
      !share &&
      !immersive &&
      contactIndex > 0 &&
      l.kind === 'image' &&
      l.key?.startsWith('imgEllipse') &&
      [50, 51, 130].some((w) => Math.abs(l.w - w) < 0.1)
    )
      return image('386:8086', contactPictures[contactIndex]!.key!);
    if (panel === 'photo' && l.key === 'imgNhDcChn') return photo;
    return undefined;
  };
  const hide = (l: DesignLayer) =>
    (panel === 'emoji' && l.text?.startsWith('Gần đây')) ||
    (panel === 'emoji' &&
      category !== 0 &&
      l.kind === 'text' &&
      l.y >= 726 &&
      emojis.includes(l.text ?? '')) ||
    (!sample &&
      ((list && l.text === 'Hỏi Meta AI hoặc tìm kiếm') ||
        (isThread &&
          l.kind === 'text' &&
          (l.text === 'Nhắn tin...' ||
            (l.y >= 620 &&
              l.y < 675 &&
              (l.text === '😊' || l.text === 'Mình thấy rất hay và hữu ích 💚')))) ||
        (panel === 'photo' && l.text === 'Thêm chú thích...')));
  const record = () => {
    setSeconds(0);
    open('recording');
  };
  const picker = (kind: Panel) => {
    setReturnPanel('thread');
    open(kind);
  };
  const play = (m: ChatMessage) => {
    if (playing === m.id) setPlaying(null);
    else {
      setElapsed(0);
      setPlaying(m.id);
    }
  };
  const footer = (
    <>
      {(panel === 'thread' || panel === 'editing' || panel === 'emoji') &&
        (!sample ? (
          <TextInput
            ref={input}
            accessibilityLabel="Nội dung tin nhắn"
            value={draft}
            placeholder={panel === 'emoji' ? 'Chọn emoji' : 'Nhắn tin...'}
            placeholderTextColor="#7B7B7B"
            onChangeText={setDraft}
            maxLength={1000}
            onFocus={() => {
              if (panel === 'thread') {
                setReference(null);
                setPanel('editing');
              }
            }}
            onSubmitEditing={sendText}
            returnKeyType="send"
            style={{
              position: 'absolute',
              left: panel === 'emoji' ? 89 : 85,
              top:
                (panel === 'thread'
                  ? frame === '386:8179'
                    ? 907
                    : 872
                  : panel === 'editing'
                    ? 631
                    : 625) - footerOffset,
              width: panel === 'thread' ? 155 : 255,
              height: 30,
              padding: 0,
              fontFamily: 'BackupInter_400Regular',
              fontSize: panel === 'emoji' ? 20 : 14,
              color: '#1F2B36',
            }}
          />
        ) : (
          <Hit
            label="Chỉnh sửa tin nhắn"
            box={[
              80,
              (panel === 'editing' ? 620 : panel === 'emoji' ? 617 : 852) - footerOffset,
              260,
              49,
            ]}
            onPress={() => {
              setDraft(
                panel === 'editing'
                  ? 'Mình thấy rất hay và hữu ích 💚'
                  : panel === 'emoji'
                    ? '😊'
                    : '',
              );
              open(panel === 'thread' ? 'editing' : panel);
            }}
          />
        ))}
      {panel === 'thread' ? (
        <>
          <Hit
            label="Chụp ảnh gửi tin nhắn"
            box={[30, 858 - footerOffset + (frame === '386:8179' ? 35 : 0), 50, 48]}
            onPress={() => picker('photos')}
          />
          <Hit
            label="Chọn emoji"
            box={[250, 858 - footerOffset + (frame === '386:8179' ? 35 : 0), 35, 48]}
            onPress={() => {
              setDraft(draft || '😊');
              open('emoji');
            }}
          />
          <Hit
            label="Ghi âm"
            box={[287, 858 - footerOffset + (frame === '386:8179' ? 35 : 0), 29, 48]}
            onPress={record}
          />
          <Hit
            label="Chọn ảnh"
            box={[316, 858 - footerOffset + (frame === '386:8179' ? 35 : 0), 29, 48]}
            onPress={() => picker('photos')}
          />
          <Hit
            label="Chọn tệp"
            box={[345, 858 - footerOffset + (frame === '386:8179' ? 35 : 0), 28, 48]}
            onPress={() => open('attachments')}
          />
          <Hit
            label="Đính kèm"
            box={[374, 858 - footerOffset + (frame === '386:8179' ? 35 : 0), 30, 48]}
            onPress={() => open('attachments')}
          />
        </>
      ) : null}
      {panel === 'editing' || panel === 'emoji' ? (
        <Hit
          label="Gửi tin nhắn"
          disabled={!sample && !draft.trim()}
          box={[350, 620 - footerOffset, 55, 49]}
          onPress={sendText}
        />
      ) : null}
      {panel === 'editing' && Platform.OS === 'web' ? (
        <>
          {original.layers
            .filter((l) => l.kind === 'text' && /^[A-Z]$/.test(l.text ?? '') && l.y >= 700)
            .map((l) => (
              <Hit
                key={l.id}
                label={`Phím ${l.text}`}
                box={[l.x - 9, l.y - 9, 38, 42]}
                onPress={() => setDraft((draft + (l.text ?? '').toLowerCase()).slice(0, 1000))}
              />
            ))}
          <Hit
            label="Phím cách"
            box={[94, 859 - footerOffset, 215, 43]}
            onPress={() => setDraft((draft + ' ').slice(0, 1000))}
          />
          {!sample ? (
            <View style={{ position: 'absolute', left: 315, top: 859 - footerOffset, width: 102 }}>
              <Button
                title="Xóa"
                variant="quiet"
                onPress={() => setDraft(Array.from(draft).slice(0, -1).join(''))}
              />
            </View>
          ) : null}
        </>
      ) : null}
      {panel === 'emoji' ? (
        <>
          {emojiCategories.map((c, i) => (
            <View
              key={c.label}
              style={{
                position: 'absolute',
                left: i === 0 ? 20 : 125 + (i - 1) * 60,
                top: 678 - footerOffset,
                width: i === 0 ? 100 : 48,
                height: 40,
              }}
            >
              <Label size={20} color="#7A8791">
                {c.symbol || c.label}
              </Label>
              <Hit
                role="tab"
                label={c.label}
                selected={category === i}
                box={[0, 0, i === 0 ? 100 : 48, 40]}
                onPress={() => setCategory(i)}
              />
            </View>
          ))}
          {category !== 0
            ? emojiChoices.map((emoji, i) => (
                <View
                  key={emoji}
                  style={{
                    position: 'absolute',
                    left: 22 + (i % 5) * 79,
                    top: 726 + Math.floor(i / 5) * 44 - footerOffset,
                  }}
                >
                  <Label size={25}>{emoji}</Label>
                </View>
              ))
            : null}
          {emojiChoices.map((emoji, i) => (
            <Hit
              key={emoji}
              label={`Emoji ${emoji}`}
              box={[20 + (i % 5) * 79, 722 + Math.floor(i / 5) * 44 - footerOffset, 55, 44]}
              onPress={() => {
                setReference(null);
                setDraft((sample ? '' : draft) + emoji);
              }}
            />
          ))}
        </>
      ) : null}
      {panel === 'recording' ? (
        <>
          <Hit
            label="Hủy ghi âm"
            box={[25, 862 - footerOffset, 119, 54]}
            onPress={() => {
              setSeconds(0);
              closePanel();
            }}
          />
          <Hit
            label="Gửi ghi âm"
            box={[334, 864 - footerOffset, 74, 50]}
            onPress={() => send({ kind: 'voice', seconds: sample ? 12 : Math.max(1, seconds) })}
          />
        </>
      ) : null}
      {panel === 'photo' ? (
        <>
          {!sample ? (
            <TextInput
              accessibilityLabel="Chú thích ảnh"
              value={caption}
              onChangeText={setCaption}
              maxLength={300}
              placeholder="Thêm chú thích..."
              placeholderTextColor="#FFFFFF"
              style={{
                position: 'absolute',
                left: 44,
                top: 793 - footerOffset,
                width: 335,
                height: 32,
                padding: 0,
                fontFamily: 'BackupInter_400Regular',
                fontSize: 14,
                color: '#FFFFFF',
              }}
            />
          ) : null}
          <Hit
            label="Gửi ảnh"
            box={[346, 855 - footerOffset, 58, 57]}
            onPress={() => send({ kind: 'photo', source: photo, text: caption })}
          />
        </>
      ) : null}
    </>
  );
  return (
    <>
      <DesignFrameCanvas
        backdrop={share ? '#F5F5F5' : undefined}
        frame={frame}
        data={layout}
        assets={chatAssets[frame]}
        fixed={sample || share || panel === 'attachments'}
        replaceText={replaceText}
        replaceImage={replaceImage}
        hide={hide}
        contentHeight={
          !sample && isThread
            ? Math.max(original.height, 630 + messageHeight + original.height - footerTop + 24)
            : undefined
        }
        scrollToEnd={!sample && messages.length > 0}
        dock={
          dock
            ? {
                top: footerTop,
                nativeHeight: panel === 'editing' ? 64 : undefined,
                children: footer,
              }
            : undefined
        }
      >
        {!dock ? footer : null}
        {list ? (
          <>
            <Hit label="Quay lại" box={[15, 62, 40, 45]} onPress={back} />
            {!sample ? (
              <TextInput
                accessibilityLabel="Tìm hội thoại"
                value={query}
                onChangeText={setQuery}
                placeholder="Hỏi Meta AI hoặc tìm kiếm"
                placeholderTextColor="#7A7A7A"
                style={{
                  position: 'absolute',
                  left: 75,
                  top: 127,
                  width: 294,
                  height: 30,
                  padding: 0,
                  fontFamily: 'BackupInter_400Regular',
                  fontSize: 12,
                }}
              />
            ) : null}
            <Hit label="Trò chơi" box={[322, 345, 85, 41]} onPress={() => router.push('/game')} />
            <Hit
              label="Ghi chú của bạn"
              box={[24, 198, 105, 129]}
              onPress={() => setSheet('Ghi chú của bạn')}
            />
            <Hit
              label="Ghi chú Thu Phương"
              box={[140, 198, 100, 129]}
              onPress={() => goThread('thu-phuong')}
            />
            <Hit
              label="Ghi chú Mỹ Duyên"
              box={[252, 220, 100, 108]}
              onPress={() => goThread('my-duyen')}
            />
            {rows.map((c, i) => (
              <Hit
                key={c.id}
                label={`Hội thoại ${c.name}`}
                box={[20, 402 + i * 99, 385, 82]}
                onPress={() => goThread(c.id)}
              />
            ))}
            {!sample && !rows.length ? (
              <View style={{ position: 'absolute', left: 25, top: 420, right: 25 }}>
                <Label>Không có hội thoại phù hợp</Label>
              </View>
            ) : null}
          </>
        ) : share ? (
          <>
            <Hit label="Đóng chọn người nhận" box={[354, 220, 43, 43]} onPress={back} />
            {chatContacts.map((c, i) => (
              <Hit
                key={c.id}
                label={`Gửi đến ${c.name}`}
                box={[91, 265 + i * 93.5, 276, 82]}
                onPress={() => {
                  ui.send(c.id, { kind: 'post', postId: params.postId ?? 'healing' });
                  goThread(c.id);
                }}
              />
            ))}
          </>
        ) : (
          <>
            {panel !== 'attachments' ? (
              <Hit
                label="Quay lại"
                box={[10, 54, 45, 50]}
                onPress={() =>
                  panel === 'thread' ? router.replace('/messages') : open(returnPanel)
                }
              />
            ) : null}
            {isThread && panel !== 'attachments' ? (
              <>
                <Hit
                  label={`Trang cá nhân ${contact.name}`}
                  box={[133, 309, 151, 36]}
                  onPress={() =>
                    contact.id === 'linh-chi' || contact.id === 'my-duyen'
                      ? router.push({
                          pathname: '/community',
                          params: {
                            view: 'member',
                            member: contact.id === 'linh-chi' ? 'linh' : 'duyen',
                          },
                        })
                      : setSheet(`Trang cá nhân ${contact.name}`)
                  }
                />
                <Hit
                  label="Gọi thoại"
                  box={[335, 60, 37, 45]}
                  onPress={() => setSheet('Cuộc gọi thoại')}
                />
                <Hit
                  label="Gọi video"
                  box={[372, 60, 36, 45]}
                  onPress={() => setSheet('Cuộc gọi video')}
                />
                {!sample
                  ? messages.map((m, i) => (
                      <View
                        key={m.id}
                        testID={`chat-message-${m.id}`}
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 630 + messages.slice(0, i).reduce((h, v) => h + heights(v) + 14, 0),
                        }}
                      >
                        <MessageBubble
                          message={m}
                          playing={playing === m.id}
                          elapsed={elapsed}
                          onPlay={() => play(m)}
                          onFile={() => setSheet(files[m.fileIndex ?? 0]!.name)}
                          onPhoto={() => {
                            setPhoto(m.source!);
                            setCaption(m.text ?? '');
                            open('photo');
                          }}
                        />
                      </View>
                    ))
                  : null}
                {sample && frame === '386:8179' ? (
                  <Hit
                    label="Mở bài viết đã chia sẻ"
                    box={[88, 614, 220, 204]}
                    onPress={() => router.push('/community?view=post')}
                  />
                ) : null}
              </>
            ) : null}
            {panel === 'attachments' ? (
              <>
                <Hit label="Đóng đính kèm" box={[0, 0, 428, 600]} onPress={closePanel} />
                {(['photos', 'photos', 'files', 'recording'] as const).map((next, i) => (
                  <Hit
                    key={next + i}
                    label={['Ảnh và video', 'Chụp ảnh', 'Tệp tài liệu', 'Ghi âm'][i]!}
                    box={[24, 662 + i * 48, 380, 47]}
                    onPress={() => (next === 'recording' ? record() : picker(next))}
                  />
                ))}
                <Hit label="Hủy đính kèm" box={[143, 859, 140, 47]} onPress={closePanel} />
              </>
            ) : null}
            {panel === 'photos'
              ? gallery.map((l, i) => (
                  <Hit
                    key={l.id}
                    label={`Ảnh ${i + 1}`}
                    box={[l.x, l.y, l.w, l.h]}
                    onPress={() => {
                      setPhoto(image('773:6563', l.key!));
                      setCaption('');
                      open('photo');
                    }}
                  />
                ))
              : null}
            {panel === 'files'
              ? files.map((f, i) => (
                  <Hit
                    key={f.name}
                    label={`Gửi ${f.name}`}
                    box={[22, 170 + i * 104, 384, 83]}
                    onPress={() => send({ kind: 'file', fileIndex: i })}
                  />
                ))
              : null}
          </>
        )}
      </DesignFrameCanvas>
      {sheet ? (
        <CollectionSheet title={sheet} onClose={() => setSheet(null)}>
          <Label>
            {sheet?.includes('.pdf') || sheet?.includes('.docx')
              ? files.find((f) => f.name === sheet)?.meta
              : contact.name}
          </Label>
          {sheet?.startsWith('Cuộc gọi') ? (
            <Button title="Kết thúc cuộc gọi" onPress={() => setSheet(null)} />
          ) : (
            <Button title="Đóng" onPress={() => setSheet(null)} />
          )}
        </CollectionSheet>
      ) : null}
    </>
  );
}
