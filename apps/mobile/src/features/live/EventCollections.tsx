import { useCallback, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { PrivateModal as Modal } from './PrivateModal';
import { router, useFocusEffect } from 'expo-router';
import { Artwork } from '../../design-system/DesignScreen';
import { eventCollectionsArtwork as a } from '../../design-system/event-flow-artwork';
import { Icon, Notice } from '../../design-system/ui';
import { useApp } from '../../providers';
import { ApiError, type Page, type Schemas } from '../../services/api';
import { useCommand, usePages, useResource } from '../../services/queries';
import { CommandError, More, QueryState, RequireAuth } from './common';
import { CatalogChip, MediaSlot } from './DesignParts';
import { EventCollectionNavigation } from './EventCollectionNavigation';
import {
  EventFlowButton,
  EventFlowHeading,
  EventFlowPage,
  EventFlowText as Text,
  eventFlowStyles as s,
} from './EventFlowParts';
import { eventTimeRange } from './event-time';

type Collection = Schemas['EventCollection'];
type Event = Schemas['GreenEvent'];
type Sheet =
  | { kind: 'create' }
  | { kind: 'edit'; collection: Collection }
  | { kind: 'add'; collection: Collection };

export function EventCollectionsScreen() {
  const { user } = useApp();
  return <CollectionManager key={user?.id ?? 'guest'} />;
}

function CollectionManager() {
  const { colors, status } = useApp();
  const tileWidth = (Math.min(428, useWindowDimensions().width) - 60) / 2;
  const collections = useResource<Page<Collection>>('/v1/me/event-collections', true);
  const saved = usePages<Event>('/v1/me/saved-events', true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ collectionId: string; ids: string[] }>({
    collectionId: '',
    ids: [],
  });
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const moving = useRef(false);
  const command = useCommand();
  const all = collections.data?.items ?? [];
  const active = all.find((item) => item.id === activeId) ?? all[0];
  const events = usePages<Event>(`/v1/me/event-collections/${active?.id}/events`, true, !!active);
  const items = events.data?.pages.flatMap((page) => page.items) ?? [];
  const selected =
    selection.collectionId === active?.id
      ? selection.ids.filter((id) => items.some((item) => item.id === id))
      : [];
  const others = all.filter((item) => item.id !== active?.id);
  const target = others.find((item) => item.id === targetId) ?? others[0];
  const savedCount = saved.data?.pages.reduce((total, page) => total + page.items.length, 0);
  const pending = busy || command.isPending;
  const { refetch: refreshCollections } = collections;
  const { refetch: refreshSaved } = saved;
  const { refetch: refreshEvents } = events;
  const collectionId = active?.id;
  useFocusEffect(
    useCallback(() => {
      if (status !== 'authenticated') return;
      void refreshCollections();
      void refreshSaved();
      if (collectionId) void refreshEvents();
    }, [status, collectionId, refreshCollections, refreshSaved, refreshEvents]),
  );
  function toggle(id: string) {
    if (!active || pending) return;
    setSelection({
      collectionId: active.id,
      ids: selected.includes(id)
        ? selected.filter((value) => value !== id)
        : [...selected, id].slice(0, 100),
    });
    setMessage('');
  }
  async function move(destination: Collection | null) {
    if (moving.current || pending || !active || !selected.length) return;
    moving.current = true;
    setBusy(true);
    setMessage('');
    try {
      await command.mutateAsync({
        path: `/v1/me/event-collections/${active.id}/move`,
        body: { eventIds: selected, targetCollectionId: destination?.id ?? null },
      });
      setSelection({ collectionId: active.id, ids: [] });
      setMessage(
        destination
          ? `Đã chuyển ${selected.length} hoạt động vào ${destination.name}.`
          : `Đã bỏ ${selected.length} hoạt động khỏi bộ sưu tập. Hoạt động vẫn được lưu.`,
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setMessage(
          'Bộ sưu tập hoặc danh sách hoạt động đã thay đổi. Kiểm tra lại các mục đang chọn.',
        );
        void events.refetch();
        void collections.refetch();
      }
    } finally {
      moving.current = false;
      setBusy(false);
    }
  }
  return (
    <EventFlowPage
      title="Bộ sưu tập yêu thích"
      navigation={<EventCollectionNavigation />}
      footer={
        status === 'authenticated' && active ? (
          <>
            <EventFlowButton
              title={
                target
                  ? `Chuyển ${selected.length} hoạt động vào ${target.name}`
                  : 'Chọn bộ sưu tập đích để chuyển'
              }
              disabled={!selected.length || !target}
              pending={pending}
              onPress={() => {
                if (target) void move(target);
              }}
            />
            <EventFlowButton
              title="Hủy chọn"
              tone="quiet"
              disabled={!selected.length || pending}
              onPress={() => setSelection({ collectionId: active.id, ids: [] })}
            />
          </>
        ) : undefined
      }
    >
      <RequireAuth>
        <View style={s.row}>
          <Artwork source={a.heart} width={24} />
          <View style={{ flex: 1, gap: 4 }}>
            <EventFlowHeading>Những kế hoạch xanh của bạn</EventFlowHeading>
            <Text size={12} color="#677C8C">
              {savedCount === undefined
                ? 'Đang tải hoạt động đã lưu…'
                : `${savedCount}${saved.hasNextPage ? '+' : ''} hoạt động đã lưu • ${all.length} bộ sưu tập`}
            </Text>
          </View>
        </View>
        <QueryState query={collections}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {all.map((collection, index) => (
              <CollectionTile
                key={collection.id}
                collection={collection}
                index={index}
                width={tileWidth}
                selected={active?.id === collection.id}
                disabled={pending}
                onPress={() => {
                  setActiveId(collection.id);
                  setMessage('');
                }}
                onOptions={() => setSheet({ kind: 'edit', collection })}
              />
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mở tạo bộ sưu tập"
              disabled={pending}
              onPress={() => setSheet({ kind: 'create' })}
              style={{
                width: tileWidth,
                minWidth: 0,
                minHeight: 130,
                borderWidth: 1,
                borderColor: '#147CC1',
                borderStyle: 'dashed',
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: 16,
              }}
            >
              <Icon name="add" color="#172B3D" size={24} />
              <Text weight="semibold" color="#147CC1" style={{ textAlign: 'center' }}>
                Tạo bộ sưu tập
              </Text>
            </Pressable>
          </View>
          {active ? (
            <>
              <View style={s.section}>
                <EventFlowHeading>
                  {active.name} • Đang chọn {selected.length} hoạt động
                </EventFlowHeading>
                <View style={[s.card, { backgroundColor: colors.surface }]}>
                  <QueryState
                    query={events}
                    empty={!items.length}
                    emptyText="Bộ sưu tập chưa có hoạt động"
                  >
                    {items.map((event) => (
                      <Pressable
                        key={event.id}
                        accessibilityRole="checkbox"
                        accessibilityLabel={event.title}
                        accessibilityState={{
                          checked: selected.includes(event.id),
                          disabled:
                            pending || (!selected.includes(event.id) && selected.length >= 100),
                        }}
                        aria-checked={selected.includes(event.id)}
                        aria-disabled={pending}
                        disabled={
                          pending || (!selected.includes(event.id) && selected.length >= 100)
                        }
                        onPress={() => toggle(event.id)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          paddingVertical: 2,
                        }}
                      >
                        {selected.includes(event.id) ? (
                          <Artwork source={a.selected} width={22} />
                        ) : (
                          <View
                            style={{
                              width: 22,
                              height: 22,
                              borderWidth: 1.5,
                              borderColor: '#147CC1',
                              borderRadius: 3,
                            }}
                          />
                        )}
                        <MediaSlot
                          uri={
                            typeof event.details.imageUrl === 'string'
                              ? event.details.imageUrl
                              : undefined
                          }
                          style={{ width: 60, height: 60, borderRadius: 16 }}
                        />
                        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                          <Text size={16} weight="semibold" style={{ lineHeight: 22 }}>
                            {event.title}
                          </Text>
                          <Text size={12} color="#677C8C">
                            {eventTimeRange(event)}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                    <More query={events} />
                    <Text size={12} color="#677C8C">
                      Còn {items.length - selected.length}
                      {events.hasNextPage ? '+' : ''} hoạt động chưa chọn trong bộ sưu tập này.
                    </Text>
                  </QueryState>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Nhắc lịch"
                accessibilityState={{ disabled: pending }}
                disabled={pending}
                onPress={() =>
                  router.push({
                    pathname: '/event-reminders',
                    params: { events: selected.join(','), from: 'collections' },
                  })
                }
                style={[
                  s.card,
                  s.row,
                  { backgroundColor: colors.soft, borderColor: '#147CC1', borderRadius: 18 },
                ]}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Artwork source={a.bell} width={20} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text size={16} weight="semibold" color="#147CC1">
                    Nhắc lịch
                  </Text>
                  <Text size={12} color="#456476">
                    {selected.length ? `${selected.length} hoạt động được chọn. ` : ''}Chọn thời
                    điểm và cách nhận lời nhắc trước khi bắt đầu.
                  </Text>
                </View>
              </Pressable>
              <View style={s.section}>
                <EventFlowHeading>Chuyển đến bộ sưu tập</EventFlowHeading>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {others.map((collection) => (
                    <CatalogChip
                      key={collection.id}
                      label={collection.name}
                      selected={target?.id === collection.id}
                      disabled={pending}
                      onPress={() => {
                        if (!pending) setTargetId(collection.id);
                      }}
                      icon={
                        target?.id === collection.id ? (
                          <Artwork source={a.check} width={14} />
                        ) : undefined
                      }
                    />
                  ))}
                </View>
                <Text size={12} color="#677C8C">
                  {others.length
                    ? 'Hoạt động vẫn được lưu, chỉ thay đổi bộ sưu tập.'
                    : 'Tạo thêm bộ sưu tập để chuyển hoạt động.'}
                </Text>
              </View>
            </>
          ) : (
            <Text color="#677C8C">Tạo bộ sưu tập đầu tiên để sắp xếp hoạt động đã lưu.</Text>
          )}
        </QueryState>
        {message ? <Notice>{message}</Notice> : null}
        <CommandError error={command.error} />
        {sheet ? (
          <CollectionSheet
            key={sheet.kind + ('collection' in sheet ? sheet.collection.id : '')}
            sheet={sheet}
            onClose={() => setSheet(null)}
            onCreated={(id) => {
              setActiveId(id);
              setMessage('Đã tạo bộ sưu tập.');
            }}
            onAdd={(collection) => setSheet({ kind: 'add', collection })}
            onRemove={
              sheet.kind === 'edit' && sheet.collection.id === active?.id && selected.length
                ? () => {
                    setSheet(null);
                    void move(null);
                  }
                : undefined
            }
          />
        ) : null}
      </RequireAuth>
    </EventFlowPage>
  );
}

function CollectionTile({
  collection,
  index,
  width,
  selected,
  disabled,
  onPress,
  onOptions,
}: {
  collection: Collection;
  index: number;
  width: number;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  onOptions: () => void;
}) {
  const query = usePages<Event>(`/v1/me/event-collections/${collection.id}/events`, true);
  const count = query.data?.pages.reduce((total, page) => total + page.items.length, 0);
  const { colors } = useApp();
  return (
    <View
      style={{
        width,
        minWidth: 0,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: selected ? '#147CC1' : '#DEEBF3',
        backgroundColor: selected ? colors.soft : '#F5F9FC',
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Artwork source={[a.sun, a.house, a.users][index % 3]} width={28} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Tùy chọn ${collection.name}`}
          disabled={disabled}
          onPress={onOptions}
          hitSlop={8}
          style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
        >
          <Artwork source={a.more} width={18} />
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Chọn ${collection.name}`}
        accessibilityState={{ selected, disabled }}
        aria-pressed={selected}
        aria-disabled={disabled}
        disabled={disabled}
        onPress={onPress}
        style={{ gap: 5, minHeight: 46 }}
      >
        <Text size={16} weight="semibold" style={{ lineHeight: 22 }}>
          {collection.name}
        </Text>
        <Text size={12} color="#677C8C">
          {query.isError
            ? 'Chưa tải được số lượng'
            : count === undefined
              ? 'Đang tải…'
              : `${count}${query.hasNextPage ? '+' : ''} hoạt động`}
        </Text>
      </Pressable>
    </View>
  );
}

function CollectionSheet({
  sheet,
  onClose,
  onCreated,
  onAdd,
  onRemove,
}: {
  sheet: Sheet;
  onClose: () => void;
  onCreated: (id: string) => void;
  onAdd: (collection: Collection) => void;
  onRemove?: () => void;
}) {
  const [name, setName] = useState(sheet.kind === 'edit' ? sheet.collection.name : '');
  const [eventId, setEventId] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [version, setVersion] = useState(sheet.kind === 'edit' ? sheet.collection.version : 1);
  const [conflict, setConflict] = useState<Collection | null>(null);
  const [versionConflict, setVersionConflict] = useState(false);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const command = useCommand<Collection>();
  const saved = usePages<Event>('/v1/me/saved-events', true, sheet.kind === 'add');
  const latest = useResource<Page<Collection>>('/v1/me/event-collections', true);
  const { colors } = useApp();
  const pending = busy || command.isPending;
  function close() {
    if (!working.current) onClose();
  }
  async function readLatest() {
    if (sheet.kind !== 'edit') return;
    const result = await latest.refetch();
    if (result.isError) return;
    const current = result.data?.items.find((item) => item.id === sheet.collection.id);
    if (current) setConflict(current);
    else setMissing(true);
  }
  async function submit() {
    if (working.current || missing || versionConflict) return;
    if (sheet.kind === 'add' ? !eventId : !name.trim()) return;
    working.current = true;
    setBusy(true);
    try {
      if (sheet.kind === 'create') {
        const result = await command.mutateAsync({
          path: '/v1/me/event-collections',
          body: { name: name.trim() },
        });
        onCreated(result.id);
      } else if (sheet.kind === 'edit') {
        await command.mutateAsync({
          path: `/v1/me/event-collections/${sheet.collection.id}`,
          method: 'PATCH',
          body: { name: name.trim(), expectedVersion: version },
        });
      } else {
        await command.mutateAsync({
          path: `/v1/me/saved-events/${eventId}`,
          method: 'PUT',
          body: { collectionId: sheet.collection.id },
        });
      }
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'VERSION_CONFLICT') {
        setVersionConflict(true);
        await readLatest();
      } else if (error instanceof ApiError && error.status === 404) {
        setMissing(true);
        void latest.refetch();
      }
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: '#00000055', justifyContent: 'center', padding: 24 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: '90%', backgroundColor: colors.surface, borderRadius: 24 }}
          contentContainerStyle={{ padding: 20, gap: 16 }}
        >
          <EventFlowHeading>
            {sheet.kind === 'create'
              ? 'Tạo bộ sưu tập'
              : sheet.kind === 'add'
                ? 'Thêm hoạt động đã lưu'
                : 'Quản lý bộ sưu tập'}
          </EventFlowHeading>
          {sheet.kind === 'add' ? (
            <QueryState
              query={saved}
              empty={!saved.data?.pages[0]?.items.length}
              emptyText="Chưa có hoạt động đã lưu"
            >
              {saved.data?.pages
                .flatMap((page) => page.items)
                .map((event) => (
                  <EventFlowButton
                    key={event.id}
                    title={event.title}
                    tone={eventId === event.id ? 'primary' : 'outline'}
                    disabled={pending}
                    onPress={() => setEventId(event.id)}
                  />
                ))}
              <More query={saved} />
            </QueryState>
          ) : (
            <View style={{ gap: 8 }}>
              <Text weight="medium">
                {sheet.kind === 'edit' ? 'Đổi tên bộ sưu tập' : 'Tên bộ sưu tập'}
              </Text>
              <TextInput
                accessibilityLabel={sheet.kind === 'edit' ? 'Đổi tên bộ sưu tập' : 'Tên bộ sưu tập'}
                value={name}
                onChangeText={setName}
                maxLength={100}
                editable={!pending && !missing}
                autoFocus={sheet.kind === 'create'}
                style={{
                  minHeight: 48,
                  borderRadius: 14,
                  padding: 13,
                  backgroundColor: colors.mint,
                  color: colors.text,
                  fontFamily: 'Inter_400Regular',
                  fontSize: 14,
                }}
              />
            </View>
          )}
          <CommandError error={command.error} />
          {missing ? (
            <Notice>Bộ sưu tập hoặc hoạt động không còn trong danh sách. Đóng để chọn lại.</Notice>
          ) : versionConflict ? (
            <View style={{ gap: 10 }}>
              <Notice>
                Bộ sưu tập đã đổi tên trên thiết bị khác. Tên bạn đang nhập vẫn được giữ.
              </Notice>
              {conflict ? (
                <>
                  <Text>Tên đã lưu hiện tại: {conflict.name}</Text>
                  <EventFlowButton
                    title="Giữ tên đang nhập"
                    tone="outline"
                    disabled={pending}
                    onPress={() => {
                      setVersion(conflict.version);
                      setConflict(null);
                      setVersionConflict(false);
                      command.reset();
                    }}
                  />
                  <EventFlowButton
                    title="Dùng tên đã lưu"
                    tone="quiet"
                    disabled={pending}
                    onPress={() => {
                      setName(conflict.name);
                      setVersion(conflict.version);
                      setConflict(null);
                      setVersionConflict(false);
                      command.reset();
                    }}
                  />
                </>
              ) : (
                <EventFlowButton
                  title="Tải lại tên mới nhất"
                  tone="outline"
                  pending={latest.isFetching}
                  disabled={pending}
                  onPress={() => void readLatest()}
                />
              )}
            </View>
          ) : null}
          <EventFlowButton
            title={
              sheet.kind === 'create'
                ? 'Tạo bộ sưu tập'
                : sheet.kind === 'edit'
                  ? 'Lưu tên bộ sưu tập'
                  : 'Thêm hoạt động vào bộ sưu tập'
            }
            disabled={
              missing || versionConflict || (sheet.kind === 'add' ? !eventId : !name.trim())
            }
            pending={pending}
            onPress={() => void submit()}
          />
          {sheet.kind === 'edit' ? (
            <>
              <EventFlowButton
                title="Thêm hoạt động"
                tone="outline"
                disabled={pending || missing}
                onPress={() => onAdd(sheet.collection)}
              />
              <EventFlowButton
                title="Bỏ khỏi bộ sưu tập"
                tone="outline"
                disabled={!onRemove || pending || missing}
                onPress={() => onRemove?.()}
              />
              {confirmDelete ? (
                <>
                  <Text>
                    Xóa bộ sưu tập này? Các hoạt động vẫn được giữ trong danh sách đã lưu.
                  </Text>
                  <EventFlowButton
                    title="Xác nhận xóa bộ sưu tập"
                    disabled={pending || missing}
                    tone="outline"
                    onPress={() => {
                      if (working.current || missing) return;
                      working.current = true;
                      setBusy(true);
                      void command
                        .mutateAsync({
                          path: `/v1/me/event-collections/${sheet.collection.id}`,
                          method: 'DELETE',
                        })
                        .then(onClose)
                        .catch((error) => {
                          if (error instanceof ApiError && error.status === 404) {
                            void latest.refetch();
                            onClose();
                          }
                        })
                        .finally(() => {
                          working.current = false;
                          setBusy(false);
                        });
                    }}
                  />
                </>
              ) : (
                <EventFlowButton
                  title={`Xóa ${sheet.collection.name}`}
                  tone="outline"
                  disabled={pending || missing}
                  onPress={() => setConfirmDelete(true)}
                />
              )}
            </>
          ) : null}
          <EventFlowButton title="Đóng" tone="quiet" disabled={pending} onPress={close} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
