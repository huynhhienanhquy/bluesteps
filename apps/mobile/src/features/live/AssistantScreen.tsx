import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Artwork, StatusSpace } from '../../design-system/DesignScreen';
import { Button, Label, Notice, Typography } from '../../design-system/ui';
import { useApp } from '../../providers';
import { errorMessage } from '../../services/api';
import { RequireAuth } from './common';
import {
  asksForCollectionPoint,
  findAssistantGuides,
  refersToPreviousItem,
  type AssistantGuides,
} from './assistant-guides';
import { AssistantAnswer } from './AssistantAnswer';

const art = {
  background: require('../../../assets/images/assistant/background.png'),
  avatar: require('../../../assets/images/assistant/avatar.png'),
  close: require('../../../assets/icons/assistant/close.svg'),
  send: require('../../../assets/icons/assistant/send.svg'),
  microphone: require('../../../assets/icons/assistant/microphone.svg'),
};
type Turn = { question: string; answer?: AssistantGuides; error?: string; cancelled?: boolean };
type AssistantHistory = { question: string; turns: Turn[]; scrollOffset: number | null };
const suggestions = ['Phân loại rác nhựa', 'Xử lý pin cũ', 'Rác nguy hại'];

export function AssistantScreen() {
  const { user } = useApp();
  const { question } = useLocalSearchParams<{ question?: string }>();
  const initialQuestion = question?.trim().slice(0, 300);
  return (
    <RequireAuth>
      {user ? (
        <Conversation
          key={`${user.id}:${initialQuestion ?? ''}`}
          userId={user.id}
          initialQuestion={initialQuestion}
        />
      ) : null}
    </RequireAuth>
  );
}

function Conversation({ userId, initialQuestion }: { userId: string; initialQuestion?: string }) {
  const cache = useQueryClient();
  const [restored] = useState(() =>
    cache.getQueryData<AssistantHistory>(['assistant-history', userId]),
  );
  const { api } = useApp(),
    { bottom } = useSafeAreaInsets(),
    { width, height } = useWindowDimensions();
  const [question, setQuestion] = useState(initialQuestion ?? restored?.question ?? ''),
    [turns, setTurns] = useState<Turn[]>(restored?.turns ?? []),
    [voiceHint, setVoiceHint] = useState(false);
  const request = useRef<AbortController | null>(null),
    list = useRef<ComponentRef<typeof ScrollView>>(null);
  const scrollOffset = useRef(initialQuestion ? null : (restored?.scrollOffset ?? null));
  const restoreOffset = useRef(scrollOffset.current);
  const followLatest = useRef(scrollOffset.current == null);
  const pending = !!turns.length && !turns.at(-1)?.answer && !turns.at(-1)?.error;
  useEffect(() => {
    cache.setQueryData(['assistant-history', userId], {
      question,
      scrollOffset: scrollOffset.current,
      turns: turns.map((turn) =>
        turn.answer || turn.error
          ? turn
          : { ...turn, error: 'Tra cứu đã dừng. Bạn có thể thử lại.', cancelled: true },
      ),
    });
  }, [cache, userId, question, turns]);
  useEffect(
    () => () => {
      request.current?.abort();
      request.current = null;
      cache.setQueryData<AssistantHistory>(['assistant-history', userId], (current) =>
        current ? { ...current, scrollOffset: scrollOffset.current } : undefined,
      );
    },
    [cache, userId],
  );
  async function send(value: string, retry = false) {
    const text = value.trim().slice(0, 300);
    if (!text || request.current) return;
    const history = retry ? turns.slice(0, -1) : turns;
    const previous = history.at(-1)?.answer;
    const contextItem =
      refersToPreviousItem(text) && previous?.items.length === 1 ? previous.items[0] : undefined;
    const controller = new AbortController();
    request.current = controller;
    setVoiceHint(false);
    if (!retry) setQuestion((current) => (current.trim() === text ? '' : current));
    followLatest.current = true;
    scrollOffset.current = null;
    restoreOffset.current = null;
    setTurns((history) => [
      ...(retry ? history.slice(0, -1) : history).slice(-29),
      { question: text },
    ]);
    const timer = setTimeout(() => {
      if (request.current !== controller) return;
      controller.abort();
      request.current = null;
      setTurns((history) => [
        ...history.slice(0, -1),
        { question: text, error: 'Tra cứu mất nhiều thời gian. Thử lại khi kết nối ổn định hơn.' },
      ]);
    }, 30_000);
    try {
      let answer = await findAssistantGuides(api, text, controller.signal);
      if (!answer.items.length && !answer.guides.length && contextItem)
        answer = { ...answer, items: [contextItem] };
      if (!controller.signal.aborted)
        setTurns((history) => [...history.slice(0, -1), { question: text, answer }]);
    } catch (cause) {
      if (!controller.signal.aborted)
        setTurns((history) => [
          ...history.slice(0, -1),
          { question: text, error: errorMessage(cause) },
        ]);
    } finally {
      clearTimeout(timer);
      if (request.current === controller) request.current = null;
    }
  }
  function cancel() {
    const controller = request.current;
    if (!controller) return;
    request.current = null;
    controller.abort();
    setTurns((history) => {
      const last = history.at(-1);
      return last
        ? [
            ...history.slice(0, -1),
            { question: last.question, error: 'Đã dừng tra cứu.', cancelled: true },
          ]
        : history;
    });
  }
  const bubble = (own: boolean) => ({
    alignSelf: own ? ('flex-end' as const) : ('flex-start' as const),
    maxWidth: '80%' as const,
    backgroundColor: own ? '#99BEE3' : '#CDE2EB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 7,
  });
  return (
    <Typography.Provider value="inter">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: '#EDF3F5' }}
      >
        <StatusSpace />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 19,
            paddingBottom: 14,
            gap: 13,
          }}
        >
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: '#AED1DF',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Artwork source={art.avatar} width={44} />
          </View>
          <Label heading bold size={20} color="#111111" style={{ flex: 1 }}>
            RecycleBot
          </Label>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng trợ lý"
            hitSlop={8}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          >
            <Artwork source={art.close} width={32} />
          </Pressable>
        </View>
        <View style={{ flex: 1, overflow: 'hidden', backgroundColor: '#E9EDF0' }}>
          <Artwork
            source={art.background}
            width={Math.min(width, 428)}
            height={height}
            fit="cover"
            style={{ position: 'absolute', top: 0, left: 0 }}
          />
          <ScrollView
            ref={list}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => {
              const y = restoreOffset.current;
              if (y != null) {
                restoreOffset.current = null;
                list.current?.scrollTo({ y, animated: false });
              } else if (followLatest.current) {
                list.current?.scrollToEnd({ animated: false });
              }
            }}
            scrollEventThrottle={100}
            onScroll={({ nativeEvent: event }) => {
              if (restoreOffset.current != null) return;
              followLatest.current =
                event.contentSize.height - event.contentOffset.y - event.layoutMeasurement.height <
                120;
              scrollOffset.current = followLatest.current
                ? null
                : Math.max(0, event.contentOffset.y);
            }}
            contentContainerStyle={{ padding: 19, paddingTop: 26, gap: 18 }}
          >
            <View style={bubble(false)}>
              <Label size={15} color="#172B3D">
                Chào bạn! Mình là RecycleBot. Bạn muốn tra cách phân loại món gì?
              </Label>
              <Label size={12} color="#456476">
                Mình tra cứu hướng dẫn từ Sổ tay BlueSteps.
              </Label>
            </View>
            {turns.map((turn, index) => (
              <View key={index} style={{ gap: 18 }}>
                <View style={bubble(true)}>
                  <Label size={15} color="#172B3D">
                    {turn.question}
                  </Label>
                </View>
                <View style={bubble(false)} accessibilityLiveRegion="polite">
                  {turn.error ? (
                    <>
                      <Label size={14} color="#172B3D">
                        {turn.cancelled ? turn.error : `Không mở được sổ tay. ${turn.error}`}
                      </Label>
                      {index === turns.length - 1 ? (
                        <Button
                          title="Thử lại"
                          variant="quiet"
                          onPress={() => void send(turn.question, true)}
                        />
                      ) : null}
                    </>
                  ) : !turn.answer ? (
                    <>
                      <Label size={14} color="#456476">
                        Đang tra sổ tay…
                      </Label>
                      <Button title="Dừng tra cứu" variant="quiet" onPress={cancel} />
                    </>
                  ) : (
                    <>
                      <AssistantAnswer
                        answer={turn.answer}
                        showCollection={asksForCollectionPoint(turn.question)}
                      />
                      {turn.answer.incomplete && index === turns.length - 1 ? (
                        <Button
                          title="Thử tải đủ hướng dẫn"
                          variant="quiet"
                          onPress={() => void send(turn.question, true)}
                        />
                      ) : null}
                    </>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
          {voiceHint ? (
            <View style={{ paddingHorizontal: 16 }}>
              <Notice>Chức năng ghi âm hiện chưa được bật.</Notice>
            </View>
          ) : null}
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: Math.max(bottom, 14),
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              {suggestions.map((text) => (
                <Pressable
                  key={text}
                  accessibilityRole="button"
                  disabled={pending}
                  onPress={() => void send(text)}
                  style={{
                    backgroundColor: '#CDE2EB',
                    borderRadius: 18,
                    paddingHorizontal: 11,
                    paddingVertical: 9,
                    opacity: pending ? 0.5 : 1,
                  }}
                >
                  <Label size={12} color="#456476">
                    {text}
                  </Label>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <TextInput
                accessibilityLabel="Câu hỏi của bạn"
                placeholder="Tôi có thể giúp gì cho bạn"
                placeholderTextColor="#626E75"
                value={question}
                maxLength={300}
                onChangeText={setQuestion}
                onSubmitEditing={() => void send(question)}
                returnKeyType="send"
                style={{
                  flex: 1,
                  minHeight: 44,
                  backgroundColor: '#FFFFFF',
                  borderColor: '#B5BEC2',
                  borderWidth: 1,
                  borderRadius: 22,
                  paddingHorizontal: 12,
                  color: '#172B3D',
                  fontSize: 14,
                }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ghi âm"
                onPress={() => setVoiceHint((value) => !value)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#65B3D7',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Artwork source={art.microphone} width={15} height={23} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Gửi câu hỏi"
                disabled={!question.trim() || pending}
                onPress={() => void send(question)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#65B3D7',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: !question.trim() || pending ? 0.5 : 1,
                }}
              >
                <Artwork source={art.send} width={45.16} height={43} />
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Typography.Provider>
  );
}
