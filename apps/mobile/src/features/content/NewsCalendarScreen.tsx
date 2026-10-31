import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useDemoQuery } from '../../services/useDemoQuery';
import { QueryContent } from '../../design-system/QueryContent';
import { calendarDays, shiftMonth } from '../../services/event-planning';
import type { GreenEvent } from '../../services/fixtures';
import { EventRoleOption, EventTextAction } from '../events/EventFormParts';
import { NewsAction, NewsDesignPage, NewsSheet, NewsText as T } from './NewsDesignParts';
import { calendarExamples, selectNewsEvents } from './news-digest-data';
import { newsEvents } from '../../services/news-events';
import { useApp } from '../../providers';

export function NewsCalendarScreen() {
  const { preview, interested } = useLocalSearchParams<{ preview?: string; interested?: string }>();
  const sample = preview === '1';
  const onlyInterested = interested === '1';
  const { news, eventPlanning } = useApp();
  const query = useDemoQuery('events');
  const [month, setMonth] = useState('2026-11');
  const [selected, setSelected] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [sheet, setSheet] = useState<'calendar' | 'example' | null>(null);
  const [example, setExample] = useState<GreenEvent>();
  const editorial = newsEvents.filter((event) =>
    sample ? onlyInterested : news.interestedEvents.includes(event.id),
  );
  const catalog = sample ? calendarExamples : (query.data ?? []);
  const source = onlyInterested
    ? [
        ...catalog.filter((event) => !sample && eventPlanning.interested.includes(event.id)),
        ...editorial,
      ]
    : [...catalog, ...editorial];
  const items = selectNewsEvents(source, month, selected, category);
  const monthItems = selectNewsEvents(source, month, '', category);
  const changeMonth = (delta: number) => {
    setMonth(shiftMonth(month, delta));
    setSelected('');
  };
  return (
    <NewsDesignPage
      title={onlyInterested ? 'Lịch quan tâm' : 'Lịch sự kiện'}
      frame="612:5362"
      journal
      journalBack
      journalLabel="CỘNG ĐỒNG XANH"
      journalSubtitle="Tham gia những hoạt động gần bạn."
      backTo="/articles"
    >
      <View style={{ height: 84, backgroundColor: '#FFFFFF', borderRadius: 20, marginTop: 20 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tháng trước"
          hitSlop={10}
          onPress={() => changeMonth(-1)}
          style={{ position: 'absolute', left: 18, top: 26, width: 30, height: 30 }}
        >
          <T size={25} color="#167EC1">
            ‹
          </T>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chọn ngày và lọc sự kiện"
          onPress={() => setSheet('calendar')}
          style={{ position: 'absolute', left: 89, right: 48, top: 18, gap: 6.22 }}
        >
          <T size={18} weight="bold" color="#163345">
            Tháng {Number(month.slice(5))}, {month.slice(0, 4)}
          </T>
          <T size={12} color="#5B7385">
            {monthItems.length} hoạt động {sample ? 'sắp tới' : 'trong tháng'}
          </T>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tháng sau"
          hitSlop={10}
          onPress={() => changeMonth(1)}
          style={{ position: 'absolute', right: 10, top: 26, width: 30, height: 30 }}
        >
          <T size={25} color="#167EC1">
            ›
          </T>
        </Pressable>
      </View>
      <View style={{ marginTop: 26, minHeight: 24 }}>
        <T accessibilityRole="header" size={18} weight="bold" color="#163345">
          {selected ? `Sự kiện ngày ${selected.split('-').reverse().join('/')}` : 'Sắp diễn ra'}
        </T>
      </View>
      {category !== 'Tất cả' ? (
        <T size={12} color="#167EC1" style={{ marginTop: 8 }}>
          Lọc: {category}
        </T>
      ) : null}
      <View style={{ marginTop: 18, gap: 15 }}>
        <QueryContent
          loading={!sample && query.isPending}
          error={!sample && query.isError}
          retry={() => {
            void query.refetch();
          }}
        >
          {items.length ? (
            items.map((event, index) => (
              <Pressable
                key={event.id}
                accessibilityRole="button"
                accessibilityLabel={`Xem sự kiện ${event.title}`}
                onPress={() => {
                  if (newsEvents.some((item) => item.id === event.id)) {
                    router.push({
                      pathname: '/articles/events/[id]',
                      params: { id: event.id, ...(sample ? { preview: '1' } : {}) },
                    });
                  } else if (sample) {
                    setExample(event);
                    setSheet('example');
                  } else router.push(`/events/${event.id}`);
                }}
                style={{
                  minHeight: 124,
                  borderRadius: 19,
                  backgroundColor: '#FFFFFF',
                  paddingLeft: 94,
                  paddingRight: 16,
                  paddingTop: 20,
                  paddingBottom: 23.69,
                }}
              >
                <View
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: 16,
                    width: 66,
                    height: 78,
                    borderRadius: 14,
                    backgroundColor: ['#DAF0FC', '#E0F6E8', '#FAF2DC'][index % 3],
                  }}
                >
                  <T
                    size={24}
                    weight="bold"
                    color="#167EC1"
                    style={{ position: 'absolute', left: 14, top: 9 }}
                  >
                    {event.date.slice(8)}
                  </T>
                  <T
                    size={11}
                    weight="semibold"
                    color="#5B7385"
                    style={{ position: 'absolute', left: 18, top: 45 }}
                  >
                    T{Number(event.date.slice(5, 7))}
                  </T>
                </View>
                <T size={15} weight="bold" color="#163345" style={{ minHeight: 18.15 }}>
                  {event.title}
                </T>
                <T size={11} color="#5B7385" style={{ marginTop: 11.85, minHeight: 13.31 }}>
                  {event.area} · {event.time.slice(0, 5)}
                </T>
                <T size={11} weight="semibold" color="#167EC1" style={{ marginTop: 23.69 }}>
                  {sample && index > 0 ? 'Sắp mở đăng ký' : 'Xem chi tiết   →'}
                </T>
              </Pressable>
            ))
          ) : (
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 19, padding: 20, gap: 16 }}>
              <T size={16} weight="semibold">
                Chưa có sự kiện phù hợp
              </T>
              <T size={12} color="#5B7385">
                Đổi ngày, tháng hoặc chủ đề để xem các hoạt động mẫu khác.
              </T>
              <NewsAction
                title="Xóa bộ lọc sự kiện"
                onPress={() => {
                  setSelected('');
                  setCategory('Tất cả');
                }}
              />
            </View>
          )}
        </QueryContent>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Xem tin sự kiện liên quan"
        onPress={() => router.push({ pathname: '/articles', params: { topic: 'Cộng đồng' } })}
        style={{
          marginTop: 21,
          minHeight: 52,
          borderRadius: 18,
          backgroundColor: '#167EC1',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <T size={14} weight="bold" color="#FFFFFF">
          Xem tin sự kiện liên quan →
        </T>
      </Pressable>
      {!sample ? (
        <View style={{ marginTop: 20, gap: 16 }}>
          <EventTextAction title="Chọn ngày và lọc sự kiện" onPress={() => setSheet('calendar')} />
          <T size={12} color="#5B7385">
            Múi giờ Việt Nam. Lịch, giờ và địa điểm là dữ liệu demo, chưa xác nhận tổ chức hoặc đăng
            ký tham gia.
          </T>
          <EventTextAction
            title="Khám phá toàn bộ hoạt động"
            onPress={() => router.push('/events')}
          />
          <EventTextAction
            title="Đọc trước khi tham gia"
            onPress={() => router.push('/articles/community-day')}
          />
          <EventTextAction title="Về tin tức" onPress={() => router.dismissTo('/articles')} />
          <EventTextAction
            title={onlyInterested ? 'Xem tất cả lịch xanh' : 'Xem lịch quan tâm'}
            onPress={() =>
              router.replace({
                pathname: '/articles/calendar',
                params: onlyInterested ? {} : { interested: '1' },
              })
            }
          />
        </View>
      ) : null}
      {sheet ? (
        <NewsSheet
          title={sheet === 'calendar' ? 'Chọn ngày và lọc sự kiện' : 'Chi tiết sự kiện mẫu'}
          onClose={() => setSheet(null)}
        >
          {sheet === 'example' && example ? (
            <>
              <T size={18} weight="bold">
                {example.title}
              </T>
              <T>
                {example.date.split('-').reverse().join('/')} · {example.time}
              </T>
              <T>{example.area}</T>
              <T size={12} color="#5B7385">
                {example.description}
              </T>
              <EventTextAction
                title="Khám phá hoạt động demo"
                onPress={() => {
                  setSheet(null);
                  router.push('/events');
                }}
              />
            </>
          ) : (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <EventTextAction title="Tháng trước trong bộ lọc" onPress={() => changeMonth(-1)} />
                <T weight="bold">
                  {month.slice(5)}/{month.slice(0, 4)}
                </T>
                <EventTextAction title="Tháng sau trong bộ lọc" onPress={() => changeMonth(1)} />
              </View>
              <View style={{ flexDirection: 'row' }}>
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
                  <View key={day} style={{ width: `${100 / 7}%`, alignItems: 'center' }}>
                    <T size={12} weight="bold">
                      {day}
                    </T>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {calendarDays(month).map((date) => {
                  const marked = selectNewsEvents(source, month, date, category).length > 0;
                  return (
                    <Pressable
                      key={date}
                      accessibilityRole="button"
                      accessibilityLabel={`Ngày ${Number(date.slice(8))} tháng ${Number(date.slice(5, 7))}${marked ? ', có sự kiện' : ''}`}
                      accessibilityState={{ selected: selected === date }}
                      onPress={() => {
                        setSelected(date);
                        setMonth(date.slice(0, 7));
                        setSheet(null);
                      }}
                      style={{
                        width: `${100 / 7}%`,
                        minHeight: 44,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        backgroundColor: selected === date ? '#167EC1' : 'transparent',
                      }}
                    >
                      <T
                        size={12}
                        weight={marked ? 'bold' : 'regular'}
                        color={
                          selected === date
                            ? '#FFFFFF'
                            : date.startsWith(month)
                              ? '#163345'
                              : '#708696'
                        }
                      >
                        {Number(date.slice(8))}
                      </T>
                      <View
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: marked ? '#167EC1' : 'transparent',
                        }}
                      />
                    </Pressable>
                  );
                })}
              </View>
              <EventTextAction
                title="Xem cả tháng"
                onPress={() => {
                  setSelected('');
                  setSheet(null);
                }}
              />
              {['Tất cả', ...new Set(source.map((event) => event.category))].map((value) => (
                <EventRoleOption
                  key={value}
                  value={value}
                  selected={category === value}
                  onPress={() => {
                    setCategory(value);
                    setSheet(null);
                  }}
                />
              ))}
            </>
          )}
          <EventTextAction title="Đóng tùy chọn lịch xanh" onPress={() => setSheet(null)} />
        </NewsSheet>
      ) : null}
    </NewsDesignPage>
  );
}
