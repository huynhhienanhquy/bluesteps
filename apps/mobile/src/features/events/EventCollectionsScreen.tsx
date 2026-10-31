import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../providers';
import { Artwork } from '../../design-system/DesignScreen';
import { LegacyNavigation } from '../../design-system/LegacyNavigation';
import { eventDesignAssets } from '../../design-system/event-design-assets';
import { events, type GreenEvent } from '../../services/fixtures';
import { normalizeEventSearch, type EventPlanning } from '../../services/event-planning';
import { collectionColors as c } from '../collection/CollectionPage';
import {
  EventAction,
  EventField,
  EventFormPage,
  EventSheet,
  EventText as T,
  EventTextAction,
} from './EventFormParts';
import { EventCover } from './EventParts';
import { EventPanel, EventSavedCheck, EventSavedPill } from './EventSavedParts';

const a = eventDesignAssets['534:49845'];
type Collections = EventPlanning['collections'];
const sampleCollections: Collections = [
  { id: 'weekend', name: 'Cuối tuần', eventIds: ['green-class', 'tree-day', 'workshop', 'garden'] },
  { id: 'nearby', name: 'Gần nhà', eventIds: ['river', 'repair', 'swap'] },
  { id: 'friends', name: 'Đi cùng bạn bè', eventIds: ['beach', 'workshop'] },
];
const icon = (id: string) =>
  id === 'nearby' ? a.imgHouse : id === 'friends' ? a.imgUsers : a.imgSun;
const eventTime = (event: GreenEvent) =>
  `${event.date.slice(8)}/${event.date.slice(5, 7)} • ${event.time.split(' · ')[0]?.replaceAll(' ', '')}`;

export function EventCollectionsScreen() {
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const sample = preview === '1';
  const { saved, eventPlanning, setEventPlanning } = useApp();
  const [previewCollections, setPreviewCollections] = useState(sampleCollections);
  const savedIds = sample ? events.map((event) => event.id) : saved;
  const collections = sample ? previewCollections : eventPlanning.collections;
  const [active, setActive] = useState(collections[0]?.id ?? '');
  const [selected, setSelected] = useState<string[]>(sample ? ['green-class', 'tree-day'] : []);
  const [target, setTarget] = useState(collections[1]?.id ?? '');
  const [sheet, setSheet] = useState<'create' | 'select' | 'options' | 'rename' | 'delete' | null>(
    null,
  );
  const [optionsId, setOptionsId] = useState('');
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const current = collections.find((item) => item.id === active);
  const optionsCollection = collections.find((item) => item.id === optionsId);
  const selectedIds = selected.filter((id) => savedIds.includes(id));
  const members = events.filter(
    (event) => savedIds.includes(event.id) && current?.eventIds.includes(event.id),
  );
  const shownItems = selectedIds.length
    ? events.filter((event) => selectedIds.includes(event.id))
    : members;
  const movable = selectedIds.filter((id) => current?.eventIds.includes(id));
  const newIds = selectedIds.filter((id) => !current?.eventIds.includes(id));
  const destination = collections.find((item) => item.id === target && item.id !== active);
  const update = (change: (value: Collections) => Collections) => {
    if (sample) setPreviewCollections(change);
    else setEventPlanning((state) => ({ ...state, collections: change(state.collections) }));
  };
  const open = (value: typeof sheet) => {
    setSheet(value);
    setError('');
    setMessage('');
  };
  const toggle = (id: string) =>
    setSelected((value) =>
      value.includes(id) ? value.filter((item) => item !== id) : [...value, id],
    );
  const validateName = () => {
    const value = name.trim();
    if (!value || value.length > 40) {
      setError('Nhập tên bộ sưu tập từ 1 đến 40 ký tự.');
      return null;
    }
    if (
      collections.some(
        (item) =>
          item.id !== (sheet === 'rename' ? optionsId : '') &&
          normalizeEventSearch(item.name) === normalizeEventSearch(value),
      )
    ) {
      setError('Tên bộ sưu tập đã tồn tại.');
      return null;
    }
    return value;
  };
  const move = () => {
    if (!current || !destination || !movable.length) return;
    update((value) =>
      value.map((item) =>
        item.id === destination.id
          ? { ...item, eventIds: [...new Set([...item.eventIds, ...movable])] }
          : item.id === current.id
            ? { ...item, eventIds: item.eventIds.filter((id) => !movable.includes(id)) }
            : item,
      ),
    );
    setSelected([]);
    setMessage(
      `Đã chuyển ${movable.length} hoạt động vào ${destination.name}. Hoạt động đã lưu, nhắc lịch và vé mẫu được giữ.`,
    );
  };
  const selectedRow = (event: GreenEvent) => (
    <Pressable
      key={event.id}
      accessibilityRole="checkbox"
      accessibilityLabel={event.title}
      accessibilityState={{ checked: selectedIds.includes(event.id) }}
      aria-checked={selectedIds.includes(event.id)}
      onPress={() => toggle(event.id)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
    >
      {selectedIds.includes(event.id) ? (
        <Artwork source={a.imgSquareCheck} width={22} />
      ) : (
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            borderColor: c.border,
            borderWidth: 1.5,
          }}
        />
      )}
      <View style={{ width: 60, height: 60, borderRadius: 16, overflow: 'hidden' }}>
        {event.id === 'green-class' || event.id === 'tree-day' ? (
          <Artwork
            source={event.id === 'green-class' ? a.imgNhMinhHa : a.imgNhMinhHa1}
            width={60}
            height={60}
            fit="cover"
          />
        ) : (
          <EventCover event={event} height={60} />
        )}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <T size={16} weight="semibold">
          {event.title}
        </T>
        <T size={12} color={c.muted}>
          {eventTime(event)}
        </T>
      </View>
    </Pressable>
  );
  return (
    <EventFormPage
      title="Bộ sưu tập yêu thích"
      frame="534:49845"
      backTo="/saved"
      bottom={<LegacyNavigation selected="home" frameAssets={a} />}
      footer={
        <>
          <EventAction
            title={`Chuyển ${movable.length} hoạt động${destination ? ` vào ${destination.name}` : ''}`}
            label="Chuyển hoạt động đã chọn"
            disabled={!movable.length || !destination}
            onPress={move}
          />
          <EventTextAction
            title="Hủy chọn"
            onPress={() => {
              setSelected([]);
              setMessage('');
            }}
          />
        </>
      }
    >
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
          <Artwork source={a.imgHeart} width={24} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <T size={16} weight="semibold">
            Những kế hoạch xanh của bạn
          </T>
          <T size={12} color={c.muted}>
            {collections.reduce(
              (total, item) => total + item.eventIds.filter((id) => savedIds.includes(id)).length,
              0,
            )}{' '}
            hoạt động trong {collections.length} bộ sưu tập
          </T>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {collections.map((item) => (
          <View
            key={item.id}
            style={{
              width: '48%',
              flexGrow: 1,
              flexBasis: '45%',
              borderWidth: 1,
              borderColor: active === item.id ? c.brand : c.border,
              borderRadius: 18,
              backgroundColor: active === item.id ? c.soft : '#F5F9FC',
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.name} · ${item.eventIds.filter((id) => savedIds.includes(id)).length}`}
              accessibilityState={{ selected: active === item.id }}
              onPress={() => {
                setActive(item.id);
                setSelected([]);
                setTarget(collections.find((other) => other.id !== item.id)?.id ?? '');
                setMessage('');
              }}
              style={{ padding: 16, gap: 12 }}
            >
              <Artwork source={icon(item.id)} width={28} />
              <View style={{ gap: 5 }}>
                <T size={16} weight="semibold">
                  {item.name}
                </T>
                <T size={12} color={c.muted}>
                  {item.eventIds.filter((id) => savedIds.includes(id)).length} hoạt động
                </T>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Tùy chọn bộ sưu tập ${item.name}`}
              hitSlop={9}
              onPress={() => {
                setOptionsId(item.id);
                open('options');
              }}
              style={{ position: 'absolute', right: 16, top: 16 }}
            >
              <Artwork source={a.imgEllipsis} width={18} />
            </Pressable>
          </View>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tạo bộ sưu tập"
          onPress={() => {
            setName('');
            open('create');
          }}
          style={{
            flexGrow: 1,
            flexBasis: '45%',
            width: '48%',
            minHeight: 130,
            borderRadius: 18,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: c.brand,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
            <Artwork
              source={require('../../../assets/figma/common/event-collection-plus.svg')}
              width={24}
            />
          </View>
          <T weight="semibold" color={c.brand}>
            Tạo bộ sưu tập
          </T>
        </Pressable>
      </View>
      {current ? (
        <>
          <View style={{ gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chọn hoạt động trong bộ sưu tập"
              onPress={() => {
                setSearch('');
                open('select');
              }}
            >
              <T size={16} weight="semibold">
                {current.name} • Đang chọn {selectedIds.length} hoạt động
              </T>
            </Pressable>
            <EventPanel>
              {shownItems.map(selectedRow)}
              {!shownItems.length ? (
                <T size={12} color={c.muted}>
                  Bộ sưu tập chưa có hoạt động. Chọn từ danh sách đã lưu để thêm.
                </T>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Chọn hoạt động từ danh sách đã lưu"
                onPress={() => {
                  setSearch('');
                  open('select');
                }}
              >
                <T size={12} color={c.muted}>
                  {members.filter((event) => !selectedIds.includes(event.id)).length > 0
                    ? `Còn ${members.filter((event) => !selectedIds.includes(event.id)).length} hoạt động chưa chọn trong bộ sưu tập này.`
                    : 'Chọn thêm từ danh sách đã lưu'}
                </T>
              </Pressable>
            </EventPanel>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Nhắc lịch cho hoạt động đã chọn"
              onPress={() =>
                router.push({
                  pathname: '/event-reminders',
                  params: { ...(sample ? { preview: '1' } : {}), events: selectedIds.join(',') },
                })
              }
              style={{
                borderWidth: 1,
                borderColor: c.brand,
                backgroundColor: c.soft,
                borderRadius: 20,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Artwork source={a.imgBell} width={24} />
              <View style={{ flex: 1, gap: 5 }}>
                <T size={16} weight="semibold" color={c.brand}>
                  Nhắc lịch
                </T>
                <T size={12} color="#456476">
                  Cài đặt thời điểm và cách nhắc cho {selectedIds.length} hoạt động đã chọn.
                </T>
              </View>
            </Pressable>
            {newIds.length ? (
              <EventAction
                title="Thêm vào bộ sưu tập đang chọn"
                onPress={() => {
                  update((value) =>
                    value.map((item) =>
                      item.id === active
                        ? { ...item, eventIds: [...new Set([...item.eventIds, ...newIds])] }
                        : item,
                    ),
                  );
                  setSelected([]);
                  setMessage('Đã thêm hoạt động vào bộ sưu tập.');
                }}
              />
            ) : null}
          </View>
          <View style={{ gap: 12 }}>
            <T size={16} weight="semibold">
              Chuyển đến bộ sưu tập
            </T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {collections
                .filter((item) => item.id !== active)
                .map((item) => (
                  <EventSavedPill
                    key={item.id}
                    label={item.name}
                    selected={target === item.id}
                    checkSource={a.imgCheck}
                    onPress={() => setTarget(item.id)}
                  />
                ))}
            </View>
            <T size={12} color={c.muted}>
              {collections.length < 2
                ? 'Tạo thêm bộ sưu tập để chuyển hoạt động.'
                : 'Hoạt động vẫn được lưu, chỉ thay đổi bộ sưu tập.'}
            </T>
          </View>
        </>
      ) : (
        <T>Tạo một bộ sưu tập để bắt đầu sắp xếp hoạt động đã lưu.</T>
      )}
      {message ? (
        <T accessibilityRole="alert" color={c.brand}>
          {message}
        </T>
      ) : null}
      {!sample ? (
        <EventTextAction title="Về hoạt động đã lưu" onPress={() => router.dismissTo('/saved')} />
      ) : null}
      {sheet ? (
        <EventSheet
          title={
            sheet === 'create'
              ? 'Tạo bộ sưu tập'
              : sheet === 'rename'
                ? 'Đổi tên bộ sưu tập'
                : sheet === 'select'
                  ? 'Chọn hoạt động đã lưu'
                  : sheet === 'delete'
                    ? 'Xóa bộ sưu tập?'
                    : (optionsCollection?.name ?? 'Tùy chọn bộ sưu tập')
          }
          onClose={() => {
            setSheet(null);
            setError('');
          }}
        >
          {sheet === 'create' || sheet === 'rename' ? (
            <>
              <EventField
                label={sheet === 'create' ? 'Tên bộ sưu tập mới' : 'Tên bộ sưu tập'}
                value={name}
                onChangeText={(value) => {
                  setName(value);
                  setError('');
                }}
                maxLength={40}
              />
              <EventAction
                title={sheet === 'create' ? 'Tạo bộ sưu tập' : 'Lưu tên bộ sưu tập'}
                label={sheet === 'create' ? 'Xác nhận tạo bộ sưu tập' : 'Lưu tên bộ sưu tập'}
                onPress={() => {
                  const value = validateName();
                  if (!value) return;
                  if (sheet === 'create') {
                    const id = `collection-${Date.now()}`;
                    update((items) => [...items, { id, name: value, eventIds: [] }]);
                    setTarget(active);
                    setActive(id);
                    setSelected([]);
                    setMessage('Đã tạo bộ sưu tập trong phiên demo.');
                  } else {
                    update((items) =>
                      items.map((item) =>
                        item.id === optionsId ? { ...item, name: value } : item,
                      ),
                    );
                    setMessage('Đã đổi tên bộ sưu tập.');
                  }
                  setSheet(null);
                }}
              />
            </>
          ) : sheet === 'select' ? (
            <>
              <EventField label="Tìm hoạt động đã lưu" value={search} onChangeText={setSearch} />
              {events
                .filter(
                  (event) =>
                    savedIds.includes(event.id) &&
                    normalizeEventSearch(event.title).includes(normalizeEventSearch(search)),
                )
                .map((event) => (
                  <EventSavedCheck
                    key={event.id}
                    label={event.title}
                    subtitle={`${eventTime(event)}${current?.eventIds.includes(event.id) ? ' • Đã có trong bộ sưu tập' : ''}`}
                    selected={selectedIds.includes(event.id)}
                    onPress={() => toggle(event.id)}
                  />
                ))}
              {!savedIds.length ? (
                <T size={12} color={c.muted}>
                  Chưa có hoạt động đã lưu.
                </T>
              ) : null}
              <EventAction title="Xong" onPress={() => setSheet(null)} />
              <EventTextAction
                title="Khám phá hoạt động"
                onPress={() => {
                  setSheet(null);
                  router.push('/events');
                }}
              />
            </>
          ) : sheet === 'options' && optionsCollection ? (
            <>
              <EventTextAction
                title="Đổi tên bộ sưu tập"
                onPress={() => {
                  setName(optionsCollection.name);
                  open('rename');
                }}
              />
              <EventTextAction
                title="Bỏ hoạt động đã chọn khỏi bộ sưu tập"
                onPress={() => {
                  if (optionsId !== active || !movable.length) {
                    setError('Chọn hoạt động trong bộ sưu tập này trước khi bỏ.');
                    return;
                  }
                  update((items) =>
                    items.map((item) =>
                      item.id === active
                        ? { ...item, eventIds: item.eventIds.filter((id) => !movable.includes(id)) }
                        : item,
                    ),
                  );
                  setSelected([]);
                  setSheet(null);
                  setMessage('Đã bỏ khỏi bộ sưu tập. Hoạt động vẫn nằm trong danh sách đã lưu.');
                }}
              />
              <EventTextAction title="Xóa bộ sưu tập" onPress={() => open('delete')} />
            </>
          ) : sheet === 'delete' && optionsCollection ? (
            <>
              <T>Xóa bộ sưu tập “{optionsCollection.name}”?</T>
              <T size={12} color={c.muted}>
                Hoạt động đã lưu, nhắc lịch và vé mẫu vẫn được giữ.
              </T>
              <EventAction
                title="Xác nhận xóa bộ sưu tập"
                onPress={() => {
                  const remaining = collections.filter((item) => item.id !== optionsId);
                  update((items) => items.filter((item) => item.id !== optionsId));
                  if (active === optionsId) {
                    setActive(remaining[0]?.id ?? '');
                    setSelected([]);
                  }
                  if (target === optionsId)
                    setTarget(remaining.find((item) => item.id !== active)?.id ?? '');
                  setSheet(null);
                  setMessage('Đã xóa bộ sưu tập trong phiên demo.');
                }}
              />
              <EventTextAction title="Giữ bộ sưu tập" onPress={() => setSheet(null)} />
            </>
          ) : null}
          {error ? (
            <T accessibilityRole="alert" color="#B3303F">
              {error}
            </T>
          ) : null}
          <EventTextAction
            title="Đóng tùy chọn"
            onPress={() => {
              setSheet(null);
              setError('');
            }}
          />
        </EventSheet>
      ) : null}
    </EventFormPage>
  );
}
