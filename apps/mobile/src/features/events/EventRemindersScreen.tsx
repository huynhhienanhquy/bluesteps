import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../providers';
import { Artwork } from '../../design-system/DesignScreen';
import { eventDesignAssets } from '../../design-system/event-design-assets';
import { events } from '../../services/fixtures';
import {
  normalizeEventSearch,
  createEventPlanning,
  reminderPreview,
  reminderValidation,
  type EventPlanning,
} from '../../services/event-planning';
import { collectionColors as c } from '../collection/CollectionPage';
import {
  EventAction,
  EventField,
  EventFormPage,
  EventOutlineAction,
  EventSheet,
  EventText as T,
  EventTextAction,
} from './EventFormParts';
import { EventPanel, EventSavedCheck, EventSavedPill, EventSwitch } from './EventSavedParts';

const a = eventDesignAssets['534:49968'];
const dateLabel = (date: string) => `${date.slice(8)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
const subtitle = (event: (typeof events)[number]) =>
  `${dateLabel(event.date)} • ${event.time.split(' · ')[0]?.replaceAll(' ', '')}`;

export function EventRemindersScreen() {
  const params = useLocalSearchParams<{ preview?: string; events?: string }>();
  const sample = params.preview === '1';
  const { saved, eventPlanning, setEventPlanning } = useApp();
  const savedIds = sample ? ['green-class', 'tree-day', 'workshop', 'garden'] : saved;
  const requested =
    typeof params.events === 'string'
      ? params.events.split(',').filter((id) => savedIds.includes(id))
      : undefined;
  const [draft, setDraft] = useState<EventPlanning['reminders']>(() => {
    const initial = sample ? createEventPlanning().reminders : eventPlanning.reminders;
    return {
      ...initial,
      enabled: sample || initial.enabled,
      eventIds: requested ?? (sample ? ['green-class', 'tree-day'] : [...initial.eventIds]),
      leadHours: [...initial.leadHours],
    };
  });
  const [sheet, setSheet] = useState<'events' | 'custom' | 'quiet' | null>(null);
  const [custom, setCustom] = useState('6');
  const [quiet, setQuiet] = useState({ start: draft.quietStart, end: draft.quietEnd });
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const savedItems = events.filter((event) => savedIds.includes(event.id));
  const selectedItems = savedItems.filter((event) => draft.eventIds.includes(event.id));
  const visibleItems = selectedItems.length ? selectedItems : savedItems;
  const previews = reminderPreview(savedItems, draft);
  const next = previews[0];
  const update = (change: Partial<typeof draft>) => {
    setDraft((value) => ({ ...value, ...change }));
    setMessage('');
    setError('');
  };
  const toggle = (id: string) =>
    update({
      eventIds: draft.eventIds.includes(id)
        ? draft.eventIds.filter((item) => item !== id)
        : [...draft.eventIds, id],
    });
  const save = () => {
    const clean = { ...draft, eventIds: draft.eventIds.filter((id) => savedIds.includes(id)) };
    const invalid = reminderValidation(clean);
    if (invalid) {
      setMessage('');
      setError(invalid);
      return;
    }
    if (!sample) setEventPlanning((state) => ({ ...state, reminders: clean }));
    setMessage(
      sample
        ? 'Đã cập nhật bản xem trước. Cấu hình trong phiên không thay đổi.'
        : 'Đã lưu cấu hình trong phiên demo. Chưa lên lịch hoặc gửi thông báo/email.',
    );
    setError('');
  };
  return (
    <EventFormPage
      title="Cài đặt nhắc lịch"
      frame="534:49968"
      backTo="/saved"
      footer={
        <>
          <EventAction
            title="Lưu cài đặt nhắc lịch"
            label="Lưu cấu hình nhắc lịch"
            onPress={save}
          />
          <EventOutlineAction
            title="Về hoạt động yêu thích"
            onPress={() => router.dismissTo('/saved')}
          />
        </>
      }
    >
      <EventPanel style={{ backgroundColor: c.mint }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Artwork source={a.imgBellRing} width={30} />
          <View style={{ flex: 1, gap: 5 }}>
            <T size={16} weight="semibold">
              Đừng bỏ lỡ hẹn xanh
            </T>
            <T size={12} color={c.muted}>
              Nhắc bạn về những hoạt động đã lưu.
            </T>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <T style={{ flex: 1 }}>Bật nhắc lịch hoạt động</T>
          <EventSwitch
            label="Bật nhắc lịch hoạt động"
            value={draft.enabled}
            onChange={(enabled) => update({ enabled })}
          />
        </View>
      </EventPanel>
      <View style={{ gap: 12 }}>
        <T size={16} weight="semibold">
          Áp dụng cho hoạt động
        </T>
        <EventPanel>
          {visibleItems.length ? (
            visibleItems.map((event) => (
              <EventSavedCheck
                key={event.id}
                label={event.title}
                subtitle={subtitle(event)}
                selected={draft.eventIds.includes(event.id)}
                onPress={() => toggle(event.id)}
              />
            ))
          ) : (
            <T size={12} color={c.muted}>
              Chưa có hoạt động đã lưu. Khám phá và lưu hoạt động bạn quan tâm.
            </T>
          )}
        </EventPanel>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chọn thêm từ bộ sưu tập"
          hitSlop={6}
          onPress={() => {
            setSheet('events');
            setSearch('');
          }}
        >
          <T weight="semibold" color={c.brand}>
            Chọn thêm từ bộ sưu tập
          </T>
        </Pressable>
      </View>
      <View style={{ gap: 12 }}>
        <T size={16} weight="semibold">
          Nhắc trước khi bắt đầu
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[1, 3, 24].map((hours) => (
            <EventSavedPill
              key={hours}
              label={hours === 24 ? '1 ngày' : `${hours} giờ`}
              selected={draft.leadHours.includes(hours)}
              onPress={() =>
                update({
                  leadHours: draft.leadHours.includes(hours)
                    ? draft.leadHours.filter((value) => value !== hours)
                    : [...draft.leadHours, hours],
                })
              }
            />
          ))}
          <EventSavedPill
            label="Tùy chỉnh"
            selected={false}
            onPress={() => {
              setSheet('custom');
              setError('');
            }}
          />
          {draft.leadHours
            .filter((hours) => ![1, 3, 24].includes(hours))
            .map((hours) => (
              <EventSavedPill
                key={hours}
                label={`Bỏ nhắc trước ${hours} giờ`}
                selected
                onPress={() =>
                  update({ leadHours: draft.leadHours.filter((value) => value !== hours) })
                }
              />
            ))}
        </View>
        <T size={12} color={c.muted}>
          Bạn sẽ nhận {draft.leadHours.length} lời nhắc cho mỗi hoạt động.
        </T>
      </View>
      <View style={{ gap: 12 }}>
        <T size={16} weight="semibold">
          Cách nhận thông báo
        </T>
        <EventPanel>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <T>Thông báo trên điện thoại</T>
              <T size={12} color={c.muted}>
                Hiện trên màn hình khóa
              </T>
            </View>
            <EventSwitch
              label="Thông báo trên điện thoại"
              value={draft.push}
              onChange={(push) => update({ push })}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <T>Email nhắc lịch</T>
              <T size={12} color={c.muted}>
                Địa chỉ email của tài khoản demo
              </T>
            </View>
            <EventSwitch
              label="Email nhắc lịch"
              value={draft.email}
              onChange={(email) => update({ email })}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <T style={{ flex: 1 }}>Âm thanh và rung</T>
            <EventSwitch
              label="Âm thanh và rung"
              value={draft.soundAndVibration}
              onChange={(soundAndVibration) => update({ soundAndVibration })}
            />
          </View>
        </EventPanel>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Chỉnh giờ yên lặng"
        onPress={() => {
          setQuiet({ start: draft.quietStart, end: draft.quietEnd });
          setError('');
          setSheet('quiet');
        }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <Artwork source={a.imgMoon} width={22} />
        <View style={{ flex: 1, gap: 4 }}>
          <T size={16} weight="semibold">
            Giờ yên lặng
          </T>
          <T size={12} color={c.muted}>
            {draft.quietStart}–{draft.quietEnd} • Nhắc lại sau {draft.quietEnd}
          </T>
        </View>
        <Artwork source={a.imgChevronRight} width={18} />
      </Pressable>
      <View
        style={{
          backgroundColor: c.mint,
          borderRadius: 14,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <Artwork source={a.imgInfo} width={20} />
        <View style={{ flex: 1, gap: 4 }}>
          <T weight="medium" color={c.brand}>
            Xem trước lời nhắc
          </T>
          <T size={12} color={c.muted}>
            {next
              ? `${next.event.title} • ${new Date(next.at).toISOString().slice(11, 16)} ngày ${dateLabel(new Date(next.at).toISOString().slice(0, 10))}, trước hoạt động ${next.hours === 24 ? '1 ngày' : `${next.hours} giờ`}${next.delayed ? ' (đã dời qua giờ yên lặng)' : ''}.`
              : !draft.enabled
                ? 'Nhắc lịch đang tắt.'
                : 'Chọn hoạt động, thời điểm và kênh nhận hợp lệ để xem minh họa.'}{' '}
            Lưu hoạt động không đồng nghĩa với đăng ký tham gia.
          </T>
          {!sample ? (
            <T size={12} color={c.muted}>
              Múi giờ Việt Nam. Chỉ lưu cấu hình demo; chưa hẹn hoặc gửi thông báo/email.
            </T>
          ) : null}
        </View>
      </View>
      {message ? (
        <T accessibilityRole="alert" color={c.brand}>
          {message}
        </T>
      ) : null}
      {error && !sheet ? (
        <T accessibilityRole="alert" color="#B3303F">
          {error}
        </T>
      ) : null}
      {sheet ? (
        <EventSheet
          title={
            sheet === 'quiet'
              ? 'Giờ yên lặng'
              : sheet === 'custom'
                ? 'Thời điểm tùy chỉnh'
                : 'Chọn hoạt động đã lưu'
          }
          onClose={() => {
            setSheet(null);
            setError('');
          }}
        >
          {sheet === 'events' ? (
            <>
              <EventField label="Tìm hoạt động đã lưu" value={search} onChangeText={setSearch} />
              {savedItems
                .filter((event) =>
                  normalizeEventSearch(event.title).includes(normalizeEventSearch(search)),
                )
                .map((event) => (
                  <EventSavedCheck
                    key={event.id}
                    label={event.title}
                    subtitle={subtitle(event)}
                    selected={draft.eventIds.includes(event.id)}
                    onPress={() => toggle(event.id)}
                  />
                ))}
              {!savedItems.length ? (
                <EventTextAction
                  title="Khám phá hoạt động"
                  onPress={() => {
                    setSheet(null);
                    router.push('/events');
                  }}
                />
              ) : null}
              <EventAction title="Xong" onPress={() => setSheet(null)} />
            </>
          ) : sheet === 'custom' ? (
            <>
              <EventField
                label="Tùy chỉnh số giờ (1–168)"
                value={custom}
                onChangeText={(value) => {
                  setCustom(value);
                  setError('');
                }}
                keyboardType="number-pad"
                maxLength={3}
              />
              <EventAction
                title="Thêm thời điểm tùy chỉnh"
                onPress={() => {
                  const value = Number(custom);
                  if (
                    !/^\d+$/.test(custom) ||
                    !Number.isInteger(value) ||
                    value < 1 ||
                    value > 168
                  ) {
                    setError('Số giờ tùy chỉnh phải từ 1 đến 168.');
                    return;
                  }
                  update({ leadHours: [...new Set([...draft.leadHours, value])] });
                  setSheet(null);
                }}
              />
            </>
          ) : (
            <>
              <T size={12} color={c.muted}>
                Múi giờ Việt Nam. Minh họa dời qua giờ kết thúc; không gợi ý gửi sau khi hoạt động
                bắt đầu.
              </T>
              <EventField
                label="Bắt đầu (HH:mm)"
                value={quiet.start}
                onChangeText={(start) => {
                  setQuiet({ ...quiet, start });
                  setError('');
                }}
                maxLength={5}
                keyboardType="numbers-and-punctuation"
              />
              <EventField
                label="Kết thúc (HH:mm)"
                value={quiet.end}
                onChangeText={(end) => {
                  setQuiet({ ...quiet, end });
                  setError('');
                }}
                maxLength={5}
                keyboardType="numbers-and-punctuation"
              />
              <EventAction
                title="Áp dụng giờ yên lặng"
                onPress={() => {
                  const invalid = reminderValidation({
                    ...draft,
                    enabled: false,
                    quietStart: quiet.start,
                    quietEnd: quiet.end,
                  });
                  if (invalid) {
                    setError(invalid);
                    return;
                  }
                  update({ quietStart: quiet.start, quietEnd: quiet.end });
                  setSheet(null);
                }}
              />
            </>
          )}
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
