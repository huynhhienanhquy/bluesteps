import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  BackHandler,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useQueryClient } from '@tanstack/react-query';
import { Artwork, DesignScreen } from '../../design-system/DesignScreen';
import { Button, Field, Icon, Label, Notice } from '../../design-system/ui';
import { useApp } from '../../providers';
import { ApiError, errorMessage, type Schemas } from '../../services/api';
import { useCommand, useResource } from '../../services/queries';
import { CommandError, QueryState } from './common';
import { DuckRace } from './DuckRace';
import { GreenMemoryGame } from './GreenMemoryGame';
import { PrivateModal } from './PrivateModal';
import { isCalendarDate } from './calendar-model';
import { UserAvatar } from './UserAvatar';

const art = {
  mission: require('../../../assets/images/games/mission.png'),
  duck: require('../../../assets/images/games/duck.png'),
  xo: require('../../../assets/images/games/xo.png'),
  lobby: require('../../../assets/images/games/lobby.png'),
  park: require('../../../assets/images/games/sorting/park.png'),
  trophy: require('../../../assets/images/games/trophy.png'),
};
const bins = [
  { name: 'Hữu cơ', image: require('../../../assets/images/games/sorting/rectangle856.png') },
  { name: 'Tái chế', image: require('../../../assets/images/games/sorting/rectangle857.png') },
  { name: 'Vô cơ', image: require('../../../assets/images/games/sorting/rectangle858.png') },
] as const;
const items = [
  {
    name: 'Rau củ thừa',
    bin: 0,
    image: require('../../../assets/images/games/sorting/image-5.png'),
  },
  {
    name: 'Vỏ chuối',
    bin: 0,
    image: require('../../../assets/images/games/sorting/image-4.png'),
  },
  {
    name: 'Bìa carton sạch',
    bin: 1,
    image: require('../../../assets/images/games/sorting/image-3.png'),
  },
  {
    name: 'Chai nhựa sạch',
    bin: 1,
    image: require('../../../assets/images/games/sorting/image-6.png'),
  },
  {
    name: 'Giấy vệ sinh đã dùng',
    bin: 2,
    image: require('../../../assets/images/games/sorting/image-2.png'),
  },
  {
    name: 'Túi rác bẩn',
    bin: 2,
    image: require('../../../assets/images/games/sorting/image.png'),
  },
];
const games = [
  { id: 'memory', name: 'Lật thẻ xanh', image: art.mission, detail: 'Ghép cặp · Chơi một mình' },
  { id: 'mission', name: 'Sứ mệnh xanh', image: art.mission, detail: 'Phân loại rác' },
  { id: 'xo', name: 'XO', image: art.xo, detail: 'Hai người trên cùng thiết bị' },
  { id: 'duck', name: 'Đua vịt', image: art.duck, detail: 'Đua với vịt máy' },
] as const;
type Game = (typeof games)[number];
type Stage = 'catalog' | 'lobby' | 'sort' | 'result' | 'xo' | 'rooms' | 'duck' | 'memory';
type Room = Schemas['Room'];
type Mark = 'X' | 'O';
const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function GamesScreen() {
  const { user, status } = useApp();
  const { mode, room } = useLocalSearchParams<{ mode?: string; room?: string }>();
  return (
    <GameSession key={`${user?.id ?? status}:${mode ?? ''}:${room ?? ''}`} userId={user?.id} />
  );
}

function GameSession({ userId }: { userId?: string }) {
  const { mode, room: requestedRoom } = useLocalSearchParams<{ mode?: string; room?: string }>();
  const initialRoom =
    requestedRoom &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedRoom)
      ? requestedRoom
      : null;
  const [stage, setStage] = useState<Stage>(
    initialRoom
      ? 'rooms'
      : mode === 'memory'
        ? 'memory'
        : mode === 'mission'
          ? 'lobby'
          : mode === 'rooms' || mode === 'schedule'
            ? 'rooms'
            : 'catalog',
  );
  const [roomId, setRoomId] = useState<string | null>(initialRoom);
  const [roomCode, setRoomCode] = useState(''),
    [scheduled, setScheduled] = useState(mode === 'schedule'),
    [scheduledTime, setScheduledTime] = useState('');
  const roomQuery = useResource<Room>(`/v1/games/rooms/${roomId}`, true, !!roomId);
  const myRooms = useResource<Room[]>('/v1/games/rooms', true, stage === 'rooms' && !roomId);
  const room = roomQuery.data;
  const { refetch: refreshRoom } = roomQuery;
  const { refetch: refreshMyRooms } = myRooms;
  const command = useCommand<Room>();
  const cache = useQueryClient();
  const working = useRef(false);
  const prepared = useRef<Room | null>(null);
  const enteredRoom = useRef<string | null>(null);
  const copying = useRef(false);
  const alive = useRef(true);
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(
    !AppState.currentState || AppState.currentState === 'active',
  );
  const [roomClock, setRoomClock] = useState(Date.now);
  const [copiedCode, setCopiedCode] = useState('');
  const [copyError, setCopyError] = useState('');
  const [copyPending, setCopyPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [duckRunning, setDuckRunning] = useState(false);
  const [memoryRunning, setMemoryRunning] = useState(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [searching, setSearching] = useState(false),
    [query, setQuery] = useState('');
  const [recent, setRecent] = useState<Game['id'][]>([]),
    [best, setBest] = useState(0);
  const [assignments, setAssignments] = useState<Record<number, number>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState(0),
    [seconds, setSeconds] = useState(0);
  const [board, setBoard] = useState<(Mark | null)[]>(Array(9).fill(null));
  const { width } = useWindowDimensions();
  const scale = Math.min(428, width) / 428;
  const ownScore = room?.players.find((player) => player.id === userId)?.score;
  const score = roomId
    ? (ownScore ?? 0)
    : items.filter((item, index) => assignments[index] === item.bin).length;
  const assigned = Object.keys(assignments).length;
  const winner = winningLines.find(
    ([a, b, c]) => board[a!] && board[a!] === board[b!] && board[a!] === board[c!],
  );
  const mark: Mark = board.filter(Boolean).length % 2 ? 'O' : 'X';
  const draw = !winner && board.every(Boolean);
  const unfinished =
    stage === 'sort' ||
    (stage === 'xo' && board.some(Boolean) && !winner && !draw) ||
    (stage === 'duck' && duckRunning) ||
    (stage === 'memory' && memoryRunning);
  const remaining = room?.endsAt
    ? Math.max(0, Math.ceil((Date.parse(room.endsAt) - Date.now()) / 1000))
    : 0;
  const canAssign =
    stage === 'sort' && !busy && (!roomId || (room?.phase === 'playing' && remaining > 0));
  const shownGames = searching
    ? games.filter((game) =>
        game.name.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')),
      )
    : games;
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      setForeground(state === 'active');
      if (state === 'active') setRoomClock(Date.now());
    });
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (
      !focused ||
      !foreground ||
      stage !== 'rooms' ||
      room?.phase !== 'lobby' ||
      !room.scheduledAt
    )
      return;
    const delay = Date.parse(room.scheduledAt) - Date.now();
    if (delay <= 0) return;
    const timer = setTimeout(() => setRoomClock(Date.now()), Math.min(delay + 10, 60_000));
    return () => clearTimeout(timer);
  }, [focused, foreground, stage, room?.phase, room?.scheduledAt, roomClock]);
  useFocusEffect(
    useCallback(() => {
      const listener = BackHandler.addEventListener('hardwareBackPress', () => {
        if (working.current) return true;
        if (stage === 'catalog') return false;
        if (stage === 'rooms' && initialRoom) {
          if (router.canGoBack()) router.back();
          else router.replace('/history');
          return true;
        }
        if (unfinished) {
          setConfirmExit(true);
          return true;
        }
        setStage(stage === 'sort' || stage === 'result' ? (roomId ? 'rooms' : 'lobby') : 'catalog');
        return true;
      });
      return () => listener.remove();
    }, [stage, roomId, unfinished, initialRoom]),
  );
  useFocusEffect(
    useCallback(() => {
      if (!userId || !['rooms', 'sort', 'result'].includes(stage)) return;
      const refresh = roomId ? refreshRoom : stage === 'rooms' ? refreshMyRooms : null;
      if (!refresh) return;
      let timer: ReturnType<typeof setInterval> | undefined;
      const stop = () => {
        if (timer) clearInterval(timer);
        timer = undefined;
      };
      const update = () => {
        if (!working.current) void refresh();
      };
      const start = () => {
        stop();
        if (AppState.currentState && AppState.currentState !== 'active') return;
        update();
        if (!roomId || room?.phase !== 'finished')
          timer = setInterval(update, roomId ? 4000 : 10_000);
      };
      start();
      const listener = AppState.addEventListener('change', (state) =>
        state === 'active' ? start() : stop(),
      );
      return () => {
        stop();
        listener.remove();
      };
    }, [userId, roomId, stage, room?.phase, refreshRoom, refreshMyRooms]),
  );
  useEffect(() => {
    if (stage !== 'sort') return;
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, [stage, startedAt]);
  const remember = useCallback((id: Game['id']) => {
    setRecent((value) => [id, ...value.filter((game) => game !== id)]);
  }, []);
  function open(game: Game) {
    if (working.current) return;
    if (game.id === 'memory') {
      remember('memory');
      setStage('memory');
    }
    if (game.id === 'mission') setStage('lobby');
    if (game.id === 'duck') {
      remember('duck');
      setStage('duck');
    }
    if (game.id === 'xo') {
      setBoard(Array(9).fill(null));
      remember('xo');
      setStage('xo');
    }
  }
  const start = useCallback(
    (online?: Room) => {
      enteredRoom.current = online?.id ?? null;
      if (online) {
        cache.setQueryData(['api', userId, `/v1/games/rooms/${online.id}`], online);
        setRoomId(online.id);
      }
      setAssignments({});
      setSelected(null);
      setSeconds(0);
      setStartedAt(online?.startedAt ? Date.parse(online.startedAt) : Date.now());
      remember('mission');
      setStage('sort');
    },
    [cache, userId, remember],
  );
  useEffect(() => {
    if (!focused || !foreground || stage !== 'rooms' || busy || !room || roomQuery.isError) return;
    if (
      room.phase === 'playing' &&
      !room.ownAnswers &&
      room.endsAt &&
      Date.parse(room.endsAt) > Date.now() &&
      enteredRoom.current !== room.id
    )
      start(room);
  }, [focused, foreground, stage, busy, room, roomQuery.isError, start]);
  async function startRewardRound() {
    if (working.current) return;
    if (!userId) {
      setRoomId(null);
      start();
      return;
    }
    working.current = true;
    setBusy(true);
    try {
      const pending =
        prepared.current ??
        (await command.mutateAsync({ path: '/v1/games/rooms', body: { scheduledAt: null } }));
      prepared.current = pending;
      const online = await command.mutateAsync({ path: `/v1/games/rooms/${pending.id}/start` });
      if (!alive.current) return;
      prepared.current = null;
      cache.setQueryData(['api', userId, `/v1/games/rooms/${online.id}`], online);
      setRoomId(online.id);
      if (online.ownAnswers || online.phase === 'finished') showRoomResult(online);
      else start(online);
    } catch {
      // Retry the same created room if its start request failed.
    } finally {
      working.current = false;
      if (alive.current) setBusy(false);
    }
  }
  function check() {
    if (assigned !== items.length || working.current) return;
    if (roomId) {
      if (!canAssign) return;
      working.current = true;
      setBusy(true);
      void command
        .mutateAsync({
          path: `/v1/games/rooms/${roomId}/submit`,
          body: { answers: items.map((_, i) => assignments[i]) },
        })
        .then((result) => {
          if (!alive.current) return;
          cache.setQueryData(['api', userId, `/v1/games/rooms/${result.id}`], result);
          setAssignments(
            Object.fromEntries((result.ownAnswers ?? []).map((answer, index) => [index, answer])),
          );
          setSeconds(
            result.startedAt
              ? Math.max(
                  0,
                  Math.round(
                    (Date.parse(
                      result.players.find((p) => p.id === userId)?.submittedAt ?? result.startedAt,
                    ) -
                      Date.parse(result.startedAt)) /
                      1000,
                  ),
                )
              : 0,
          );
          setStage('result');
        })
        .catch((cause) => {
          if (cause instanceof ApiError && cause.code === 'GAME_ROUND_CLOSED') void refreshRoom();
        })
        .finally(() => {
          working.current = false;
          if (alive.current) setBusy(false);
        });
      return;
    }
    setSeconds(Math.floor((Date.now() - startedAt) / 1000));
    setBest((value) => Math.max(value, score));
    setStage('result');
  }
  function leaveStage() {
    setConfirmExit(false);
    if (stage === 'rooms' && initialRoom) {
      if (router.canGoBack()) router.back();
      else router.replace('/history');
      return;
    }
    if (stage === 'catalog') {
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } else
      setStage(stage === 'sort' || stage === 'result' ? (roomId ? 'rooms' : 'lobby') : 'catalog');
  }
  function back() {
    if (working.current) return;
    if (unfinished) setConfirmExit(true);
    else leaveStage();
  }
  function openRooms(schedule = false) {
    command.reset();
    setScheduled(schedule);
    setStage('rooms');
  }
  function enterRoom(path: string, body?: unknown) {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    void command
      .mutateAsync({ path, body })
      .then((result) => {
        if (!alive.current) return;
        cache.setQueryData(['api', userId, `/v1/games/rooms/${result.id}`], result);
        setRoomId(result.id);
        setStage('rooms');
      })
      .catch((cause) => {
        if (cause instanceof ApiError && cause.status === 409 && roomId) void refreshRoom();
      })
      .finally(() => {
        working.current = false;
        if (alive.current) setBusy(false);
      });
  }
  function showRoomResult(result = room) {
    if (!result) return;
    setAssignments(Object.fromEntries((result.ownAnswers ?? []).map((answer, i) => [i, answer])));
    const submitted = result.players.find((p) => p.id === userId)?.submittedAt;
    setSeconds(
      submitted && result.startedAt
        ? Math.max(0, Math.round((Date.parse(submitted) - Date.parse(result.startedAt)) / 1000))
        : 0,
    );
    setStage('result');
  }
  const scheduleDate = scheduledTime.trim()
    ? new Date(scheduledTime.trim().replace(' ', 'T'))
    : null;
  const scheduleValid =
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(scheduledTime.trim()) &&
    isCalendarDate(scheduledTime.trim().slice(0, 10)) &&
    !!scheduleDate &&
    Number.isFinite(scheduleDate.getTime()) &&
    scheduleDate.getHours() === Number(scheduledTime.trim().slice(11, 13)) &&
    scheduleDate.getMinutes() === Number(scheduledTime.trim().slice(14, 16)) &&
    scheduleDate.getTime() > Date.now() &&
    scheduleDate.getTime() <= Date.now() + 30 * 86_400_000;
  const title =
    stage === 'catalog'
      ? 'Trò chơi'
      : stage === 'memory'
        ? 'Lật thẻ xanh'
        : stage === 'xo'
          ? 'XO'
          : stage === 'duck'
            ? 'Đua vịt'
            : 'Sứ mệnh xanh';
  function card(game: Game, wide = false) {
    const cardWidth = (wide ? 171 : 139) * scale;
    return (
      <Pressable
        key={game.id}
        accessibilityRole="button"
        accessibilityLabel={game.name}
        onPress={() => open(game)}
        style={{
          width: cardWidth,
          borderRadius: 15,
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          elevation: 3,
          boxShadow: '0px 3px 5px #0003',
        }}
      >
        {game.id === 'memory' ? (
          <View
            style={{
              width: cardWidth,
              height: 130 * scale,
              backgroundColor: '#E4F4EC',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Icon name="leaf-outline" size={46 * scale} color="#237B57" />
            <Label bold size={11} color="#237B57">
              6 CẶP THẺ XANH
            </Label>
          </View>
        ) : (
          <Artwork source={game.image} width={cardWidth} height={130 * scale} fit="cover" />
        )}
        <View style={{ alignItems: 'center', padding: 7 }}>
          <Label size={14} color="#161616">
            {game.name}
          </Label>
          <Label size={10} color="#6D6D6D">
            {game.detail}
          </Label>
        </View>
      </Pressable>
    );
  }
  return (
    <DesignScreen
      family="inter"
      background="#FFFFFF"
      contentStyle={{ paddingHorizontal: 0, paddingTop: 0, gap: 0 }}
      headerStyle={{ minHeight: 72, paddingTop: 0, paddingBottom: 10, paddingHorizontal: 18 }}
      header={
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', minHeight: 54 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={back}
            hitSlop={10}
          >
            <Icon name="chevron-back" color="#171717" />
          </Pressable>
          <Label heading bold size={stage === 'catalog' ? 30 : 25} color="#111111">
            {title}
          </Label>
        </View>
      }
    >
      {stage === 'catalog' ? (
        <View style={{ gap: 22, paddingTop: 2 }}>
          {searching ? (
            <View style={{ paddingHorizontal: 20 }}>
              <Field label="Tìm trò chơi" value={query} onChangeText={setQuery} />
            </View>
          ) : null}
          {shownGames.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 8, gap: 15 }}
            >
              {shownGames.map((game) => card(game))}
            </ScrollView>
          ) : (
            <View style={{ paddingHorizontal: 20 }}>
              <Notice>Không tìm thấy trò chơi.</Notice>
            </View>
          )}
          <View style={{ gap: 14, paddingHorizontal: 20 }}>
            <View style={{ gap: 8 }}>
              <Button title="Tạo phòng" icon="add-outline" onPress={() => openRooms()} />
              <Button
                title="Tạo lịch chơi"
                variant="secondary"
                onPress={() => {
                  setRoomId(null);
                  openRooms(true);
                }}
              />
            </View>
            <Label bold color="#111111">
              Danh hiệu
            </Label>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              {[
                {
                  name: 'Cao nhân giải đố',
                  source: require('../../../assets/images/games/source.png'),
                },
                {
                  name: 'Chiến thần tốc độ',
                  source: require('../../../assets/images/games/source-2.png'),
                },
                {
                  name: 'Bậc thầy phân loại rác',
                  source: require('../../../assets/images/games/source-3.png'),
                },
              ].map((badge, index) => (
                <View key={badge.name} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                  <Artwork source={badge.source} width={(index === 1 ? 100 : 90) * scale} />
                  <Label size={13} color="#111111" style={{ textAlign: 'center' }}>
                    {badge.name}
                  </Label>
                </View>
              ))}
            </View>
            <Button
              title={searching ? 'Đóng tìm kiếm' : 'Tìm kiếm'}
              icon="search-outline"
              onPress={() => setSearching((value) => !value)}
            />
            <Label bold color="#111111">
              Chơi gần đây
            </Label>
            {recent.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {recent.map((id) =>
                  card(
                    games.find((game) => game.id === id)!,
                    true,
                  ),
                )}
              </View>
            ) : (
              <Label size={13} color="#6D6D6D">
                Chưa chơi trong phiên này.
              </Label>
            )}
          </View>
        </View>
      ) : null}
      {stage === 'rooms' ? (
        <View style={{ padding: 20, gap: 12 }}>
          {!userId ? (
            <>
              <Notice>Đăng nhập để tạo hoặc tham gia phòng Sứ mệnh xanh.</Notice>
              <Button
                title="Đăng nhập"
                onPress={() =>
                  router.push({
                    pathname: '/login',
                    params: {
                      returnTo: roomId
                        ? `/game?room=${roomId}`
                        : `/game?mode=${scheduled ? 'schedule' : 'rooms'}`,
                    },
                  })
                }
              />
            </>
          ) : roomId ? (
            <>
              <QueryState query={roomQuery}>
                {room ? (
                  <>
                    <Label bold size={20}>
                      Mã phòng {room.code}
                    </Label>
                    <Button
                      title={
                        copiedCode === room.code ? 'Đã sao chép mã phòng' : 'Sao chép mã phòng'
                      }
                      variant="secondary"
                      pending={copyPending}
                      onPress={() => {
                        if (copying.current) return;
                        copying.current = true;
                        setCopyPending(true);
                        setCopyError('');
                        const code = room.code;
                        void Clipboard.setStringAsync(code)
                          .then(() => {
                            if (alive.current) setCopiedCode(code);
                          })
                          .catch((cause) => {
                            if (alive.current) setCopyError(errorMessage(cause));
                          })
                          .finally(() => {
                            copying.current = false;
                            if (alive.current) setCopyPending(false);
                          });
                      }}
                    />
                    {copyError ? <Notice tone="error">{copyError}</Notice> : null}
                    <Label size={13}>{room.players.length}/5 đã tham gia</Label>
                    {room.scheduledAt ? (
                      <Label>Giờ chơi {new Date(room.scheduledAt).toLocaleString('vi-VN')}</Label>
                    ) : null}
                    {room.players.map((player) => (
                      <View
                        key={player.id}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                      >
                        <UserAvatar userId={player.id} name={player.name} size={34} />
                        <Label style={{ flex: 1 }}>
                          {player.id === userId ? 'Bạn' : player.name}
                          {player.id === room.hostId ? ' · Chủ phòng' : ''}
                          {player.submittedAt ? ` · ${player.score}/${items.length}` : ''}
                        </Label>
                      </View>
                    ))}
                    {room.phase === 'lobby' ? (
                      room.hostId === userId ? (
                        <Button
                          title="Bắt đầu lượt chơi"
                          pending={busy}
                          disabled={!!room.scheduledAt && Date.parse(room.scheduledAt) > Date.now()}
                          onPress={() => enterRoom(`/v1/games/rooms/${roomId}/start`)}
                        />
                      ) : (
                        <Notice>
                          Đang chờ chủ phòng bắt đầu. Bạn sẽ tự vào lượt khi phòng bắt đầu chơi.
                        </Notice>
                      )
                    ) : null}
                    {room.phase === 'playing' && !room.ownAnswers ? (
                      <Button
                        title={
                          enteredRoom.current === room.id ? 'Tiếp tục lượt chơi' : 'Vào lượt chơi'
                        }
                        disabled={busy || remaining <= 0}
                        onPress={() => start(room)}
                      />
                    ) : null}
                    {room.phase === 'finished' || room.ownAnswers ? (
                      <Button
                        title="Xem kết quả"
                        disabled={busy}
                        onPress={() => showRoomResult()}
                      />
                    ) : null}
                  </>
                ) : null}
              </QueryState>
              <Button
                title="Cập nhật phòng"
                variant="secondary"
                pending={roomQuery.isRefetching}
                disabled={busy}
                onPress={() => void refreshRoom()}
              />
              <Button
                title="Về danh sách phòng"
                variant="quiet"
                disabled={busy}
                onPress={() => {
                  setRoomId(null);
                  command.reset();
                }}
              />
            </>
          ) : (
            <>
              <Label bold size={18}>
                {scheduled ? 'Tạo lịch chơi' : 'Tạo phòng Sứ mệnh xanh'}
              </Label>
              {scheduled ? (
                <Field
                  label="Giờ trên thiết bị (YYYY-MM-DD HH:mm)"
                  value={scheduledTime}
                  onChangeText={setScheduledTime}
                  placeholder="2026-11-10 19:30"
                  maxLength={16}
                  editable={!busy}
                />
              ) : null}
              {scheduled ? (
                <Label size={12}>Chọn ngày và giờ có thật trên thiết bị, trong 30 ngày tới.</Label>
              ) : null}
              <Button
                title={scheduled ? 'Lưu lịch và tạo mã phòng' : 'Tạo phòng ngay'}
                disabled={scheduled && !scheduleValid}
                pending={busy}
                onPress={() =>
                  enterRoom('/v1/games/rooms', {
                    scheduledAt: scheduled && scheduleValid ? scheduleDate!.toISOString() : null,
                  })
                }
              />
              <Field
                label="Mã phòng được mời"
                editable={!busy}
                value={roomCode}
                onChangeText={(value) =>
                  setRoomCode(
                    value
                      .toUpperCase()
                      .replace(/[^A-F0-9]/g, '')
                      .slice(0, 12),
                  )
                }
                autoCapitalize="characters"
              />
              <Button
                title="Tham gia phòng"
                variant="secondary"
                disabled={roomCode.length !== 12}
                pending={busy}
                onPress={() => enterRoom('/v1/games/rooms/join', { code: roomCode })}
              />
              <Label bold>Phòng của bạn</Label>
              <Button
                title="Cập nhật danh sách phòng"
                variant="quiet"
                pending={myRooms.isRefetching}
                disabled={busy}
                onPress={() => void refreshMyRooms()}
              />
              <QueryState
                query={myRooms}
                empty={myRooms.data?.length === 0}
                emptyText="Bạn chưa tham gia phòng nào."
              >
                {myRooms.data?.map((entry) => (
                  <Button
                    key={entry.id}
                    title={`${entry.code} · ${entry.scheduledAt ? new Date(entry.scheduledAt).toLocaleString('vi-VN') : entry.phase === 'finished' ? 'Đã kết thúc' : entry.phase === 'playing' ? 'Đang chơi' : 'Đang chờ'}`}
                    variant="quiet"
                    disabled={busy}
                    onPress={() => {
                      setRoomId(entry.id);
                      command.reset();
                    }}
                  />
                ))}
              </QueryState>
            </>
          )}
          <CommandError error={command.error} />
        </View>
      ) : null}
      {stage === 'lobby' ? (
        <>
          <View
            style={{
              height: 516 * scale,
              justifyContent: 'flex-end',
              alignItems: 'center',
              paddingBottom: 24,
            }}
          >
            <Artwork
              source={art.lobby}
              width={428 * scale}
              height={516 * scale}
              fit="cover"
              style={{ position: 'absolute', top: 0, left: 0 }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Bắt đầu"
              accessibilityState={{ disabled: busy, busy }}
              disabled={busy}
              onPress={() => void startRewardRound()}
              style={{
                backgroundColor: '#E3CE33',
                borderRadius: 18,
                paddingHorizontal: 26,
                paddingVertical: 12,
              }}
            >
              <Label bold size={22} color="#111111">
                {busy ? 'Đang mở lượt…' : 'Bắt đầu'}
              </Label>
            </Pressable>
          </View>
          <View style={{ padding: 24, gap: 12 }}>
            <CommandError error={command.error} />
            <Notice>
              Chọn từng món rồi chọn thùng phù hợp. Bạn có thể sửa lựa chọn trước khi kiểm tra.
            </Notice>
            <Label size={13} color="#456476">
              {userId
                ? 'Hoàn thành đúng cả 6 món trong 3 phút để nhận điểm theo chương trình hiện tại.'
                : 'Lượt luyện tập không cộng điểm. Đăng nhập để chơi lượt nhận thưởng.'}
            </Label>
            {userId ? (
              <Button
                title="Luyện tập không tính điểm"
                variant="secondary"
                disabled={busy}
                onPress={() => {
                  setRoomId(null);
                  command.reset();
                  start();
                }}
              />
            ) : (
              <Button
                title="Đăng nhập để nhận thưởng"
                onPress={() =>
                  router.push({ pathname: '/login', params: { returnTo: '/game?mode=mission' } })
                }
              />
            )}
            <Label size={13} color="#456476">
              Kỷ lục phiên này {best}/{items.length}
            </Label>
          </View>
        </>
      ) : null}
      {stage === 'sort' || stage === 'result' ? (
        <View
          style={{
            minHeight: 800 * scale,
            paddingHorizontal: 10,
            paddingTop: 18,
            paddingBottom: 28,
            gap: 14,
          }}
        >
          <Artwork
            source={art.park}
            width={428 * scale}
            height={800 * scale}
            fit="cover"
            style={{ position: 'absolute', top: 0, left: 0, opacity: 0.7 }}
          />
          {stage === 'sort' ? (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                marginHorizontal: 28,
                padding: 12,
                minHeight: 213 * scale,
                gap: 8,
              }}
            >
              <Label size={13} bold color="#172B3D">
                {assigned}/{items.length} đã phân loại · {seconds} giây
              </Label>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {items.map((item, index) =>
                  assignments[index] === undefined ? (
                    <Pressable
                      key={item.name}
                      accessibilityRole="button"
                      accessibilityLabel={item.name}
                      accessibilityState={{ selected: selected === index }}
                      disabled={!canAssign}
                      onPress={() => setSelected(index)}
                      style={{
                        borderWidth: 2,
                        borderColor: selected === index ? '#147CC1' : 'transparent',
                        borderRadius: 10,
                        padding: 2,
                      }}
                    >
                      <Artwork source={item.image} width={58 * scale} height={49 * scale} />
                    </Pressable>
                  ) : null,
                )}
              </View>
              <Label size={12} color="#456476">
                {selected === null
                  ? 'Chọn món để phân loại hoặc chuyển món giữa các thùng.'
                  : `Đang chọn ${items[selected]?.name}. Chọn thùng.`}
              </Label>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 5, marginTop: 24 }}>
            {bins.map((bin, index) => (
              <View key={bin.name} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Bỏ vào thùng ${bin.name}`}
                  disabled={!canAssign || selected === null}
                  onPress={() => {
                    if (canAssign && selected !== null) {
                      setAssignments((value) => ({ ...value, [selected]: index }));
                      setSelected(null);
                    }
                  }}
                  style={{ width: '100%', alignItems: 'center' }}
                >
                  <Artwork source={bin.image} width={124 * scale} height={230 * scale} />
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 20,
                      backgroundColor: '#FFFFFF',
                      borderRadius: 20,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                    }}
                  >
                    <Label size={12} bold color="#111111">
                      {bin.name}
                    </Label>
                  </View>
                </Pressable>
                {items.map((item, itemIndex) =>
                  assignments[itemIndex] === index ? (
                    <Pressable
                      key={item.name}
                      accessibilityRole="button"
                      accessibilityLabel={`Chuyển ${item.name} khỏi thùng ${bin.name}`}
                      accessibilityState={{ selected: selected === itemIndex }}
                      disabled={!canAssign}
                      onPress={() => setSelected(itemIndex)}
                      style={{
                        backgroundColor: selected === itemIndex ? '#DCEEF9' : '#FFFFFF',
                        borderRadius: 8,
                        padding: 5,
                        width: '100%',
                      }}
                    >
                      <Label size={11} color="#172B3D">
                        {stage === 'result' ? (item.bin === index ? '✓ ' : '✕ ') : ''}
                        {item.name}
                      </Label>
                    </Pressable>
                  ) : null,
                )}
              </View>
            ))}
          </View>
          {stage === 'sort' ? (
            <View style={{ alignSelf: 'center', minWidth: 142 }}>
              {roomId ? <Label size={13}>Còn {remaining} giây</Label> : null}
              <Button
                title="Kiểm tra"
                pending={busy}
                disabled={assigned !== items.length || !canAssign}
                onPress={check}
              />
              {roomId && (room?.phase === 'finished' || remaining === 0) ? (
                <>
                  <Notice>Lượt chơi đã kết thúc. Các lựa chọn chưa nộp chưa được tính điểm.</Notice>
                  <Button
                    title="Xem kết quả phòng"
                    disabled={busy}
                    onPress={() => showRoomResult()}
                  />
                </>
              ) : null}
              {roomId ? <CommandError error={command.error} /> : null}
            </View>
          ) : (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                marginHorizontal: 25,
                padding: 18,
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Label heading bold size={24} color="#705B00">
                {score === items.length ? 'CHÚC MỪNG' : 'KẾT QUẢ'}
              </Label>
              <Artwork source={art.trophy} width={130} height={130} />
              <Label size={16} color="#111111">
                {roomId && ownScore == null
                  ? 'Chưa nộp bài'
                  : `${score}/${items.length} đúng · ${seconds} giây`}
              </Label>
              <Label size={12} color="#456476">
                {roomId ? 'Kết quả phòng Sứ mệnh xanh' : 'Điểm luyện tập của lượt chơi'}
              </Label>
              {roomId && ownScore != null ? (
                <Label size={14} bold color="#172B3D">
                  {room?.ownRewardPoints
                    ? `Bạn nhận được ${room.ownRewardPoints} điểm thưởng`
                    : 'Lượt này chưa nhận điểm thưởng'}
                </Label>
              ) : null}
              {roomId ? (
                <>
                  {room?.players.map((player) => (
                    <Label key={player.id} size={14} color="#172B3D">
                      {player.name} ·{' '}
                      {player.score === null ? 'Chưa nộp bài' : `${player.score}/${items.length}`}
                    </Label>
                  ))}
                  {room?.phase === 'playing' ? (
                    <Label size={12} color="#456476">
                      Đang chờ các lượt nộp còn lại.
                    </Label>
                  ) : null}
                  <Button title="Về phòng" onPress={() => setStage('rooms')} />
                  <Button title="Chơi lại" pending={busy} onPress={() => void startRewardRound()} />
                  <CommandError error={command.error} />
                </>
              ) : (
                <Button title="Chơi lại" onPress={() => start()} />
              )}
              <Button
                title="Đi đến tích điểm"
                variant="secondary"
                disabled={busy}
                onPress={() => router.push('/rewards')}
              />
            </View>
          )}
        </View>
      ) : null}
      {stage === 'duck' ? <DuckRace onRunningChange={setDuckRunning} /> : null}
      {stage === 'memory' ? (
        <GreenMemoryGame onRunningChange={setMemoryRunning} onExit={() => setStage('catalog')} />
      ) : null}
      {stage === 'xo' ? (
        <View style={{ padding: 24, gap: 16 }}>
          <Label bold color="#172B3D">
            {winner ? `${board[winner[0]!]} thắng!` : draw ? 'Hòa' : `Lượt của ${mark}`}
          </Label>
          {[0, 3, 6].map((startIndex) => (
            <View key={startIndex} style={{ flexDirection: 'row', gap: 8 }}>
              {[startIndex, startIndex + 1, startIndex + 2].map((index) => (
                <Pressable
                  key={index}
                  accessibilityRole="button"
                  accessibilityLabel={`Ô ${index + 1}${board[index] ? `, ${board[index]}` : ''}`}
                  disabled={!!winner || draw || !!board[index]}
                  onPress={() =>
                    setBoard((value) => {
                      if (
                        value[index] ||
                        winningLines.some(
                          ([a, b, c]) =>
                            value[a!] && value[a!] === value[b!] && value[a!] === value[c!],
                        )
                      )
                        return value;
                      const nextMark = value.filter(Boolean).length % 2 ? 'O' : 'X';
                      return value.map((cell, i) => (i === index ? nextMark : cell));
                    })
                  }
                  style={{
                    flex: 1,
                    aspectRatio: 1,
                    backgroundColor: winner?.includes(index) ? '#C5EAD6' : '#DCEEF9',
                    borderRadius: 12,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Label bold size={32} color="#147CC1">
                    {board[index]}
                  </Label>
                </Pressable>
              ))}
            </View>
          ))}
          <Button title="Chơi lại" onPress={() => setBoard(Array(9).fill(null))} />
        </View>
      ) : null}
      <PrivateModal
        visible={confirmExit}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmExit(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
            backgroundColor: '#00000066',
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 380,
              padding: 24,
              borderRadius: 24,
              backgroundColor: '#FFFFFF',
              gap: 16,
            }}
          >
            <Label size={21} bold color="#172B3D">
              Rời lượt chơi?
            </Label>
            <Label size={14} color="#456476">
              {roomId && stage === 'sort'
                ? 'Các lựa chọn chưa nộp sẽ không được lưu. Đồng hồ phòng vẫn tiếp tục chạy khi bạn rời màn hình.'
                : 'Lượt đang chơi sẽ kết thúc. Bạn có thể bắt đầu lại từ màn trò chơi.'}
            </Label>
            <Button title="Tiếp tục chơi" onPress={() => setConfirmExit(false)} />
            <Button title="Rời lượt chơi" variant="quiet" onPress={leaveStage} />
          </View>
        </View>
      </PrivateModal>
    </DesignScreen>
  );
}
