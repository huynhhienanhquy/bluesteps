import { useEffect, useState } from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DesignFrameCanvas, DesignFrameAction as Hit } from '../../design-system/DesignFrameCanvas';
import {
  DesignFrameLayers,
  type DesignLayer,
  type FrameData,
} from '../../design-system/DesignFrameLayers';
import { botAssets } from '../../design-system/bot-assets';
import { Button, Label } from '../../design-system/ui';
import { useBotUi, type BotMessage } from './BotUiProvider';
import source from './bot-design-data.json';
type Frame = keyof typeof botAssets;
const data = source as unknown as Record<Frame, FrameData & { navigationTop: number | null }>;
const phases: Frame[] = [
  '386:9115',
  '386:9152',
  '386:9191',
  '386:9228',
  '386:9265',
  '386:9302',
  '386:9339',
];
const close = () => (router.canGoBack() ? router.back() : router.replace('/messages'));
const duration = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
const voiceHeight = 65;
const guess = (m: BotMessage) =>
  m.kind === 'voice'
    ? voiceHeight
    : Math.ceil(m.text.length / 37) * 24 + 26 + (m.kind === 'answer' ? 49 : 0);

function VoiceMessage({
  seconds,
  onPlay,
  playing,
}: {
  seconds: number;
  onPlay: () => void;
  playing: boolean;
}) {
  return (
    <View style={{ width: 428, height: voiceHeight }}>
      {playing ? (
        <View style={{ position: 'absolute', left: 111, top: 0, width: 289, height: 45 }}>
          <DesignFrameLayers
            frame="386:9071"
            layers={data['386:9071'].layers}
            assets={botAssets['386:9071']}
          />
        </View>
      ) : (
        <DesignFrameLayers
          frame="386:8977"
          layers={data['386:8977'].layers.filter((l) => l.y >= 608 && l.y < 656)}
          assets={botAssets['386:8977']}
          offsetY={608}
        />
      )}
      <Hit
        label={playing ? 'Tạm dừng giọng nói' : 'Phát giọng nói'}
        box={[356, 0, 44, 45]}
        onPress={onPlay}
      />
      <View style={{ position: 'absolute', left: 325, top: 46 }}>
        <Label size={11} color="#667D8D">
          {duration(seconds)}
        </Label>
      </View>
    </View>
  );
}

function VoicePanel({
  frame,
  onClose,
  onStart,
  onStop,
  active,
}: {
  frame: Frame;
  onClose: () => void;
  onStart: () => void;
  onStop: () => void;
  active: boolean;
}) {
  const d = data[frame];
  const start = d.layers.find((l) => l.text === 'Start')!,
    stop = d.layers.find((l) => l.text === 'Stop')!;
  return (
    <>
      <DesignFrameLayers frame={frame} layers={d.layers} assets={botAssets[frame]} />
      <Hit label="Đóng ghi âm" box={[369, 10, 47, 45]} onPress={onClose} />
      <Hit
        label="Bắt đầu nghe"
        disabled={active}
        box={[37, start.y - 15, 162, 58]}
        onPress={onStart}
      />
      <Hit
        label="Dừng nghe"
        disabled={!active}
        box={[231, stop.y - 15, 162, 58]}
        onPress={onStop}
      />
    </>
  );
}

export function BotDesignScreen() {
  const params = useLocalSearchParams<{ frame?: string; preview?: string }>();
  const explicit = params.frame && params.frame in botAssets ? (params.frame as Frame) : null;
  const [reference, setReference] = useState(explicit),
    [voiceOpen, setVoiceOpen] = useState(false),
    [active, setActive] = useState(false),
    [phase, setPhase] = useState(0),
    [seconds, setSeconds] = useState(0);
  const [playing, setPlaying] = useState<number | null>(null),
    [sizes, setSizes] = useState<Record<number, number>>({}),
    [width, setWidth] = useState(428);
  const ui = useBotUi(),
    insets = useSafeAreaInsets();
  const sample = reference !== null,
    partial = reference !== null && reference !== '386:8930' && reference !== '386:8977';
  useEffect(() => {
    if (!active || !voiceOpen) return;
    const timer = setInterval(() => setPhase((p) => (p + 1) % phases.length), 240),
      clock = setInterval(() => setSeconds((n) => Math.min(120, n + 1)), 1000);
    return () => {
      clearInterval(timer);
      clearInterval(clock);
    };
  }, [active, voiceOpen]);
  useEffect(() => {
    if (playing === null) return;
    const message = ui.state.messages.find((m) => m.id === playing);
    const t = setTimeout(() => setPlaying(null), Math.max(1, message?.seconds ?? 2) * 1000);
    return () => clearTimeout(t);
  }, [playing, ui.state.messages]);
  const openVoice = () => {
    setReference(null);
    setActive(false);
    setSeconds(0);
    setPhase(0);
    setVoiceOpen(true);
  };
  const cancel = () => {
    setActive(false);
    setVoiceOpen(false);
  };
  const stop = () => {
    ui.sendVoice(seconds);
    setActive(false);
    setVoiceOpen(false);
    setReference(null);
  };
  const start = () => {
    setActive(true);
    setSeconds(0);
    setPhase(0);
  };
  const send = () => {
    if (ui.send(ui.state.draft)) setReference(null);
  };
  const frame: Frame =
    reference ?? (ui.state.messages.some((m) => m.kind === 'voice') ? '386:8977' : '386:8930');
  const original = data[frame];
  const panelFrame: Frame = active ? phases[phase]! : '386:17222';
  const partialPanel = partial && frame !== '386:9071';
  const activate = () => {
    setReference(null);
  };
  const startPreview = () => {
    setReference(null);
    setVoiceOpen(true);
    start();
  };
  const previewStop = () => {
    setReference(null);
    ui.sendVoice(2);
  };
  const footerTop = 800;
  const placeholder = original.layers.find((l) => l.text?.startsWith('Tôi có thể giúp gì'));
  const layout = {
    ...original,
    layers: original.layers.flatMap((l) => {
      if (l.text === 'RecycleBot') return [{ ...l, heading: true }];
      if (sample) return [l];
      if (l.key === 'imgChat') return [{ ...l, wallpaper: true }];
      if (frame === '386:8977' && l.y >= 600 && l.y < 800) return [];
      return [l];
    }),
  };
  const hide = (l: DesignLayer) => !sample && l.id === placeholder?.id;
  const controls = (
    <>
      {!sample ? (
        <TextInput
          accessibilityLabel="Câu hỏi cho RecycleBot"
          value={ui.state.draft}
          onChangeText={ui.setDraft}
          maxLength={1000}
          placeholder="Tôi có thể giúp gì cho bạn"
          placeholderTextColor="#7C7C7C"
          returnKeyType="send"
          onSubmitEditing={send}
          style={{
            position: 'absolute',
            left: 29,
            top: 872 - footerTop,
            width: 254,
            height: 30,
            padding: 0,
            fontFamily: 'BackupInter_400Regular',
            fontSize: 14,
            color: '#1F2B36',
          }}
        />
      ) : (
        <Hit label="Nhập câu hỏi" box={[16, 866, 286, 45]} onPress={activate} />
      )}
      <Hit
        label="Gửi câu hỏi"
        disabled={!sample && !ui.state.draft.trim()}
        box={[365, 862 - (sample ? 0 : footerTop), 50, 50]}
        onPress={send}
      />
      <Hit
        label="Mở bảng nghe"
        box={[312, 862 - (sample ? 0 : footerTop), 46, 50]}
        onPress={openVoice}
      />
      {['phân loại rác nhựa', 'xử lý pin củ', 'rác nguy hại'].map((text, i) => (
        <Hit
          key={text}
          label={`Hỏi về ${text}`}
          box={[
            [19, 805, 156, 48],
            [180, 805, 112, 48],
            [304, 805, 113, 48],
          ][i]!.map((n, j) => (j === 1 ? n - (sample ? 0 : footerTop) : n))}
          onPress={() => {
            ui.send(text);
            setReference(null);
          }}
        />
      ))}
    </>
  );
  const historyHeight = ui.state.messages.reduce((h, m) => h + (sizes[m.id] ?? guess(m)) + 14, 0);
  const exit = <Hit label="Đóng RecycleBot" box={[350, 60, 42, 45]} onPress={close} />;
  if (partial)
    return (
      <DesignFrameCanvas
        frame={frame}
        data={original}
        assets={botAssets[frame]}
        fixed
        nativeStatusHeight={0}
        backdrop="#F5F5F5"
      >
        {partialPanel ? (
          <>
            <Hit label="Đóng ghi âm" box={[369, 10, 47, 45]} onPress={() => setReference(null)} />
            <Hit
              label="Bắt đầu nghe"
              box={[37, frame === '386:17222' ? 338 : 358, 162, 58]}
              onPress={startPreview}
            />
            <Hit
              label="Dừng nghe"
              box={[231, frame === '386:17222' ? 338 : 358, 162, 58]}
              onPress={previewStop}
            />
          </>
        ) : (
          <Hit
            label="Tạm dừng giọng nói"
            box={[250, 0, 39, 45]}
            onPress={() => setReference(null)}
          />
        )}
      </DesignFrameCanvas>
    );
  return (
    <>
      <DesignFrameCanvas
        frame={frame}
        data={layout}
        assets={botAssets[frame]}
        hide={hide}
        fixed={sample}
        backdrop="#F5F5F5"
        header={!sample ? { height: 123, children: exit } : undefined}
        dock={!sample ? { top: footerTop, children: controls } : undefined}
        contentHeight={!sample ? Math.max(926, 608 + historyHeight + 150) : undefined}
        scrollToEnd={!sample && ui.state.messages.length > 0}
      >
        {sample ? (
          <>
            {exit}
            {controls}
            {frame === '386:8977' ? (
              <Hit
                label="Phát giọng nói"
                box={[365, 608, 35, 45]}
                onPress={() => {
                  ui.sendVoice(2);
                  setReference(null);
                  setPlaying(1);
                }}
              />
            ) : null}
          </>
        ) : null}
        {!sample
          ? ui.state.messages.map((m, i) => {
              const top =
                608 +
                ui.state.messages
                  .slice(0, i)
                  .reduce((h, p) => h + (sizes[p.id] ?? guess(p)) + 14, 0);
              return (
                <View
                  key={m.id}
                  testID={`bot-message-${m.id}`}
                  style={{ position: 'absolute', left: 0, top, width: 428 }}
                  onLayout={(e) => {
                    const h = e.nativeEvent.layout.height;
                    if (Math.abs(h - (sizes[m.id] ?? guess(m))) > 1)
                      setSizes((s) => ({ ...s, [m.id]: h }));
                  }}
                >
                  {m.kind === 'voice' ? (
                    <VoiceMessage
                      seconds={m.seconds ?? 1}
                      playing={playing === m.id}
                      onPlay={() => setPlaying(playing === m.id ? null : m.id)}
                    />
                  ) : (
                    <View
                      style={{
                        left: m.kind === 'question' ? 94 : 19,
                        width: 306,
                        backgroundColor: m.kind === 'question' ? '#97BCE6' : '#CFE5F1',
                        borderRadius: 22,
                        paddingHorizontal: 13,
                        paddingVertical: 10,
                        gap: 8,
                      }}
                    >
                      <Label size={15} color="#233340">
                        {m.text}
                      </Label>
                      {m.kind === 'answer' ? (
                        <Button
                          title="Mở Sổ tay"
                          variant="quiet"
                          onPress={() => router.push('/handbook')}
                        />
                      ) : null}
                    </View>
                  )}
                </View>
              );
            })
          : null}
      </DesignFrameCanvas>
      {voiceOpen ? (
        <Modal visible transparent animationType="fade" onRequestClose={cancel}>
          <View
            style={{
              flex: 1,
              justifyContent: 'flex-end',
              alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,.16)',
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng nền ghi âm"
              onPress={cancel}
              style={{ position: 'absolute', inset: 0 }}
            />
            <View
              onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
              style={{
                width: '100%',
                maxWidth: 428,
                height: data[panelFrame].height * (width / 428) + insets.bottom,
                backgroundColor: '#FFFFFF',
                borderTopLeftRadius: 25,
                borderTopRightRadius: 25,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: 428,
                  height: data[panelFrame].height,
                  transformOrigin: 'top left',
                  transform: [{ scale: width / 428 }],
                }}
              >
                <VoicePanel
                  frame={panelFrame}
                  active={active}
                  onClose={cancel}
                  onStart={start}
                  onStop={stop}
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}
