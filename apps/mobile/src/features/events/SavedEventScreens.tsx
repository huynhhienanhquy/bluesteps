import { useState } from 'react';
import { Switch } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../../providers';
import {
  Button,
  Card,
  Chip,
  Empty,
  Field,
  Label,
  Notice,
  Row,
  Search,
} from '../../design-system/ui';
import { QueryContent } from '../../design-system/QueryContent';
import { useDemoQuery } from '../../services/useDemoQuery';
import { events } from '../../services/fixtures';
import { normalizeEventSearch } from '../../services/event-planning';
import { CheckOption, EventCard, EventPage } from './EventParts';

export function SavedEventsScreen() {
  const { saved, toggleSaved } = useApp();
  const query = useDemoQuery('events');
  const [search, setSearch] = useState('');
  const [removing, setRemoving] = useState<string>();
  const [removed, setRemoved] = useState(false);
  const items =
    query.data?.filter(
      (event) =>
        saved.includes(event.id) &&
        normalizeEventSearch(`${event.title} ${event.area}`).includes(normalizeEventSearch(search)),
    ) ?? [];
  return (
    <EventPage title="Hoạt động đã lưu">
      <Row style={{ flexWrap: 'wrap' }}>
        <Button
          title="Bộ sưu tập"
          variant="secondary"
          onPress={() => router.push('/event-collections')}
        />
        <Button
          title="Nhắc lịch"
          variant="secondary"
          onPress={() => router.push('/event-reminders')}
        />
      </Row>
      <Search value={search} onChangeText={setSearch} placeholder="Tìm hoạt động đã lưu" />
      <Notice>
        Lưu hoạt động giúp bạn tìm lại trong phiên demo. Lưu không đồng nghĩa đã đăng ký hay đặt
        nhắc lịch.
      </Notice>
      {removing ? (
        <Card>
          <Label bold>Xóa hoạt động yêu thích?</Label>
          <Label size={13}>{events.find((event) => event.id === removing)?.title}</Label>
          <Label size={12}>
            Hoạt động sẽ được bỏ khỏi bộ sưu tập và nhắc lịch. Vé mẫu đã tạo vẫn được giữ.
          </Label>
          <Button
            title="Xác nhận xóa"
            variant="danger"
            onPress={() => {
              toggleSaved(removing);
              setRemoving(undefined);
              setRemoved(true);
            }}
          />
          <Button title="Hủy xóa" variant="quiet" onPress={() => setRemoving(undefined)} />
        </Card>
      ) : null}
      {removed ? <Notice tone="success">Hoạt động yêu thích đã xóa.</Notice> : null}
      <QueryContent
        loading={query.isPending}
        error={query.isError}
        retry={() => {
          void query.refetch();
        }}
      >
        {items.length ? (
          items.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onRemove={() => {
                setRemoving(event.id);
                setRemoved(false);
              }}
            />
          ))
        ) : (
          <Empty
            title={search ? 'Không tìm thấy hoạt động đã lưu' : 'Chưa có hoạt động yêu thích'}
            detail="Khám phá và chạm trái tim để lưu hoạt động bạn quan tâm."
            action="Khám phá hoạt động"
            onPress={() => router.push('/events')}
          />
        )}
      </QueryContent>
    </EventPage>
  );
}

export function EventCollectionsScreen() {
  const { saved, eventPlanning, setEventPlanning } = useApp();
  const [active, setActive] = useState('weekend');
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [target, setTarget] = useState('nearby');
  const [message, setMessage] = useState('');
  const [deleting, setDeleting] = useState(false);
  const collections = eventPlanning.collections;
  const current = collections.find((item) => item.id === active);
  const savedItems = events.filter((event) => saved.includes(event.id));
  const selectedIds = selected.filter((id) => saved.includes(id));
  const create = () => {
    const value = name.trim();
    if (!value || value.length > 40) {
      setMessage('Nhập tên bộ sưu tập từ 1 đến 40 ký tự.');
      return;
    }
    if (
      collections.some((item) => normalizeEventSearch(item.name) === normalizeEventSearch(value))
    ) {
      setMessage('Tên bộ sưu tập đã tồn tại.');
      return;
    }
    const id = `collection-${Date.now()}`;
    setEventPlanning((state) => ({
      ...state,
      collections: [...state.collections, { id, name: value, eventIds: [] }],
    }));
    setActive(id);
    setSelected([]);
    setDeleting(false);
    setName('');
    setMessage('Đã tạo bộ sưu tập trong phiên demo.');
  };
  const assign = (move: boolean) => {
    const destination = move ? target : active;
    if (
      !collections.some((item) => item.id === destination) ||
      (move && destination === active) ||
      !selectedIds.length
    ) {
      setMessage('Chọn hoạt động và bộ sưu tập đích khác bộ sưu tập hiện tại.');
      return;
    }
    setEventPlanning((state) => ({
      ...state,
      collections: state.collections.map((item) => {
        if (item.id === destination)
          return { ...item, eventIds: [...new Set([...item.eventIds, ...selectedIds])] };
        if (move && item.id === active)
          return { ...item, eventIds: item.eventIds.filter((id) => !selectedIds.includes(id)) };
        return item;
      }),
    }));
    setSelected([]);
    setMessage(
      move ? 'Đã chuyển hoạt động; vé mẫu được giữ nguyên.' : 'Đã thêm hoạt động vào bộ sưu tập.',
    );
  };
  return (
    <EventPage title="Bộ sưu tập yêu thích">
      <Label size={25} bold heading>
        Những kế hoạch xanh của bạn
      </Label>
      <Label size={13}>
        {saved.length} hoạt động đã lưu · {collections.length} bộ sưu tập
      </Label>
      <Row style={{ flexWrap: 'wrap' }}>
        {collections.map((item) => (
          <Chip
            key={item.id}
            label={`${item.name} · ${item.eventIds.filter((id) => saved.includes(id)).length}`}
            selected={active === item.id}
            onPress={() => {
              setActive(item.id);
              setSelected([]);
              setDeleting(false);
              setMessage('');
            }}
          />
        ))}
      </Row>
      <Card>
        <Field label="Tên bộ sưu tập mới" value={name} onChangeText={setName} maxLength={40} />
        <Button title="Tạo bộ sưu tập" variant="secondary" onPress={create} />
      </Card>
      {message ? <Notice>{message}</Notice> : null}
      {current ? (
        <>
          <Label size={17} bold heading>
            {current.name} · Đang chọn {selectedIds.length} hoạt động
          </Label>
          <Label size={12}>Chọn từ các hoạt động đã lưu để thêm hoặc chuyển vào bộ sưu tập.</Label>
          {savedItems.length ? (
            savedItems.map((event) => (
              <Card key={event.id}>
                <CheckOption
                  label={event.title}
                  selected={selectedIds.includes(event.id)}
                  onPress={() =>
                    setSelected(
                      selectedIds.includes(event.id)
                        ? selectedIds.filter((id) => id !== event.id)
                        : [...selectedIds, event.id],
                    )
                  }
                />
                <Label size={12}>{event.time}</Label>
                <Label size={12}>
                  {current.eventIds.includes(event.id)
                    ? `Đã có trong ${current.name}`
                    : 'Chưa có trong bộ sưu tập này'}
                </Label>
              </Card>
            ))
          ) : (
            <Empty
              title="Chưa có hoạt động để sắp xếp"
              action="Khám phá hoạt động"
              onPress={() => router.push('/events')}
            />
          )}
          <Button
            title="Thêm vào bộ sưu tập đang chọn"
            disabled={!selectedIds.length}
            onPress={() => assign(false)}
          />
          <Label size={14} bold>
            Chuyển hoạt động sang
          </Label>
          <Row style={{ flexWrap: 'wrap' }}>
            {collections
              .filter((item) => item.id !== active)
              .map((item) => (
                <Chip
                  key={item.id}
                  label={item.name}
                  selected={target === item.id}
                  onPress={() => setTarget(item.id)}
                />
              ))}
          </Row>
          <Button
            title="Chuyển hoạt động đã chọn"
            variant="secondary"
            disabled={
              !selectedIds.length ||
              target === active ||
              !collections.some((item) => item.id === target)
            }
            onPress={() => assign(true)}
          />
          <Button
            title="Bỏ khỏi bộ sưu tập"
            variant="quiet"
            disabled={!selectedIds.length}
            onPress={() => {
              setEventPlanning((state) => ({
                ...state,
                collections: state.collections.map((item) =>
                  item.id === active
                    ? { ...item, eventIds: item.eventIds.filter((id) => !selectedIds.includes(id)) }
                    : item,
                ),
              }));
              setSelected([]);
              setMessage('Đã bỏ khỏi bộ sưu tập. Hoạt động vẫn nằm trong danh sách đã lưu.');
            }}
          />
          <Button title="Xóa bộ sưu tập" variant="danger" onPress={() => setDeleting(true)} />
          {deleting ? (
            <Card>
              <Label bold>Xóa bộ sưu tập “{current.name}”?</Label>
              <Label size={13}>Hoạt động đã lưu, nhắc lịch và vé mẫu vẫn được giữ.</Label>
              <Button
                title="Xác nhận xóa bộ sưu tập"
                variant="danger"
                onPress={() => {
                  const remaining = collections.filter((item) => item.id !== active);
                  setEventPlanning((state) => ({
                    ...state,
                    collections: state.collections.filter((item) => item.id !== active),
                  }));
                  setActive(remaining[0]?.id ?? '');
                  setSelected([]);
                  setDeleting(false);
                  setMessage('Đã xóa bộ sưu tập trong phiên demo.');
                }}
              />
              <Button title="Giữ bộ sưu tập" variant="quiet" onPress={() => setDeleting(false)} />
            </Card>
          ) : null}
        </>
      ) : (
        <Notice>Tạo một bộ sưu tập để bắt đầu sắp xếp hoạt động.</Notice>
      )}
      <Button
        title="Về hoạt động đã lưu"
        variant="quiet"
        onPress={() => router.dismissTo('/saved')}
      />
    </EventPage>
  );
}

export function EventRemindersScreen() {
  const { saved, colors, eventPlanning, setEventPlanning } = useApp();
  const [draft, setDraft] = useState(() => ({
    ...eventPlanning.reminders,
    eventIds: [...eventPlanning.reminders.eventIds],
    leadHours: [...eventPlanning.reminders.leadHours],
  }));
  const [custom, setCustom] = useState('6');
  const [message, setMessage] = useState('');
  const savedItems = events.filter((event) => saved.includes(event.id));
  const save = () => {
    const eventIds = draft.eventIds.filter((id) => saved.includes(id));
    if (draft.enabled && (!eventIds.length || !draft.leadHours.length)) {
      setMessage('Chọn ít nhất một hoạt động và một thời điểm nhắc.');
      return;
    }
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (
      !timePattern.test(draft.quietStart) ||
      !timePattern.test(draft.quietEnd) ||
      draft.quietStart === draft.quietEnd
    ) {
      setMessage('Nhập giờ yên lặng theo HH:mm; giờ bắt đầu và kết thúc phải khác nhau.');
      return;
    }
    setEventPlanning((state) => ({ ...state, reminders: { ...draft, eventIds } }));
    setMessage('Đã lưu cấu hình trong phiên demo. Chưa lên lịch hoặc gửi thông báo/email.');
  };
  return (
    <EventPage title="Cài đặt nhắc lịch">
      <Label size={25} bold heading>
        Đừng bỏ lỡ hẹn xanh
      </Label>
      <Label size={13}>Nhắc bạn về những hoạt động đã lưu.</Label>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Label style={{ flex: 1 }} bold>
            Bật nhắc lịch hoạt động
          </Label>
          <Switch
            accessibilityLabel="Bật nhắc lịch hoạt động"
            value={draft.enabled}
            onValueChange={(enabled) => {
              setDraft({ ...draft, enabled });
              setMessage('');
            }}
            trackColor={{ true: colors.brand }}
          />
        </Row>
      </Card>
      <Label size={17} bold heading>
        Áp dụng cho hoạt động
      </Label>
      {savedItems.length ? (
        savedItems.map((event) => (
          <Card key={event.id}>
            <CheckOption
              label={event.title}
              selected={draft.eventIds.includes(event.id)}
              onPress={() => {
                setDraft({
                  ...draft,
                  eventIds: draft.eventIds.includes(event.id)
                    ? draft.eventIds.filter((id) => id !== event.id)
                    : [...draft.eventIds, event.id],
                });
                setMessage('');
              }}
            />
            <Label size={12}>{event.time}</Label>
          </Card>
        ))
      ) : (
        <Empty
          title="Chưa có hoạt động đã lưu"
          action="Khám phá hoạt động"
          onPress={() => router.push('/events')}
        />
      )}
      <Label size={17} bold heading>
        Nhắc trước khi bắt đầu
      </Label>
      <Row style={{ flexWrap: 'wrap' }}>
        {[1, 3, 24].map((hours) => (
          <Chip
            key={hours}
            label={hours === 24 ? '1 ngày' : `${hours} giờ`}
            selected={draft.leadHours.includes(hours)}
            onPress={() => {
              setDraft({
                ...draft,
                leadHours: draft.leadHours.includes(hours)
                  ? draft.leadHours.filter((value) => value !== hours)
                  : [...draft.leadHours, hours],
              });
              setMessage('');
            }}
          />
        ))}
      </Row>
      <Field
        label="Tùy chỉnh số giờ (1–168)"
        value={custom}
        onChangeText={setCustom}
        keyboardType="number-pad"
        maxLength={3}
      />
      <Button
        title="Thêm thời điểm tùy chỉnh"
        variant="secondary"
        onPress={() => {
          const value = Number(custom);
          if (!/^\d+$/.test(custom) || !Number.isInteger(value) || value < 1 || value > 168) {
            setMessage('Số giờ tùy chỉnh phải từ 1 đến 168.');
            return;
          }
          setDraft({ ...draft, leadHours: [...new Set([...draft.leadHours, value])] });
          setMessage('');
        }}
      />
      <Row style={{ flexWrap: 'wrap' }}>
        {draft.leadHours
          .filter((hours) => ![1, 3, 24].includes(hours))
          .map((hours) => (
            <Chip
              key={hours}
              label={`Bỏ nhắc trước ${hours} giờ`}
              selected
              onPress={() => {
                setDraft({
                  ...draft,
                  leadHours: draft.leadHours.filter((value) => value !== hours),
                });
                setMessage('');
              }}
            />
          ))}
      </Row>
      <Label size={12}>Đã chọn {draft.leadHours.length} thời điểm nhắc cho mỗi hoạt động.</Label>
      <Label size={17} bold heading>
        Kênh nhận lời nhắc
      </Label>
      <Row>
        <Chip
          label="Thông báo ứng dụng"
          selected={draft.channel === 'push'}
          onPress={() => {
            setDraft({ ...draft, channel: 'push' });
            setMessage('');
          }}
        />
        <Chip
          label="Email"
          selected={draft.channel === 'email'}
          onPress={() => {
            setDraft({ ...draft, channel: 'email' });
            setMessage('');
          }}
        />
      </Row>
      <Label size={17} bold heading>
        Giờ yên lặng
      </Label>
      <Field
        label="Bắt đầu (HH:mm)"
        value={draft.quietStart}
        onChangeText={(value) => {
          setDraft({ ...draft, quietStart: value });
          setMessage('');
        }}
        maxLength={5}
      />
      <Field
        label="Kết thúc (HH:mm)"
        value={draft.quietEnd}
        onChangeText={(value) => {
          setDraft({ ...draft, quietEnd: value });
          setMessage('');
        }}
        maxLength={5}
      />
      <Notice>
        Múi giờ Việt Nam · Asia/Ho_Chi_Minh. Đây là cấu hình xem trước; chưa có thông báo được hẹn
        hoặc gửi, chưa áp dụng quy tắc dời lời nhắc trong giờ yên lặng.
      </Notice>
      {message ? <Notice>{message}</Notice> : null}
      <Button title="Lưu cấu hình nhắc lịch" onPress={save} />
      <Button
        title="Về hoạt động đã lưu"
        variant="quiet"
        onPress={() => router.dismissTo('/saved')}
      />
    </EventPage>
  );
}
