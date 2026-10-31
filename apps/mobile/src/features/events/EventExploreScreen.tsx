import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Artwork } from '../../design-system/DesignScreen';
import { LegacyNavigation } from '../../design-system/LegacyNavigation';
import { QueryContent } from '../../design-system/QueryContent';
import { eventDesignAssets } from '../../design-system/event-design-assets';
import { useApp } from '../../providers';
import { normalizeEventSearch } from '../../services/event-planning';
import { events, type GreenEvent } from '../../services/fixtures';
import { useDemoQuery } from '../../services/useDemoQuery';
import { CollectionPage, collectionColors as c } from '../collection/CollectionPage';
import { EventSheet, EventText as T, EventTextAction } from './EventFormParts';
import { EventSavedPill } from './EventSavedParts';
import { EventCover } from './EventParts';

const a = eventDesignAssets['534:49034'];
const categories = [
  ['Thu gom', 'Dọn rác', a.imgTrash2],
  ['Trồng cây', 'Trồng cây', a.imgSprout],
  ['Giáo dục', 'Phân loại', a.imgRecycle],
] as const;

export function EventExploreScreen() {
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const sample = preview === '1';
  const { saved, toggleSaved } = useApp();
  const [exampleSaved, setExampleSaved] = useState(['green-class', 'tree-day']);
  const savedIds = sample ? exampleSaved : saved;
  const query = useDemoQuery('events');
  const [search, setSearch] = useState('');
  const [city, setCity] = useState(sample);
  const [week, setWeek] = useState(false);
  const [category, setCategory] = useState('Tất cả');
  const [topics, setTopics] = useState(false);
  const [filtered, setFiltered] = useState(false);
  const items = (sample ? events.slice(0, 2) : (query.data ?? [])).filter((event) => {
    // The sample calendar is the week containing the two design activities.
    const inWeek = event.date >= '2026-10-19' && event.date <= '2026-10-25';
    return (
      (!city || normalizeEventSearch(event.area).includes('tp hcm')) &&
      (!week || inWeek) &&
      (category === 'Tất cả' ||
        event.category === category ||
        (category === 'Trồng cây' && event.id === 'garden')) &&
      normalizeEventSearch(`${event.title} ${event.area}`).includes(normalizeEventSearch(search))
    );
  });
  const reset = () => {
    setSearch('');
    setCity(false);
    setWeek(false);
    setCategory('Tất cả');
    setFiltered(false);
  };
  const toggle = (id: string) => {
    if (sample)
      setExampleSaved((ids) =>
        ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id],
      );
    else toggleSaved(id);
  };
  return (
    <CollectionPage
      title="Khám phá hoạt động"
      source={a}
      backTo="/"
      backSource={require('../../../assets/figma/common/collection-chevron.svg')}
      footer={null}
      bottom={<LegacyNavigation selected="home" frameAssets={a} />}
    >
      <View style={{ gap: 7 }}>
        <T size={27} weight="bold" lineHeight={33} color="#075A9C">
          {'Một việc nhỏ,\nmột thay đổi xanh.'}
        </T>
        <T size={14} color={c.muted}>
          Tìm hoạt động ý nghĩa, cùng cộng đồng.
        </T>
      </View>
      <View style={{ gap: 8 }}>
        <T weight="medium">Tìm hoạt động</T>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            minHeight: 48,
            paddingHorizontal: 14,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 12,
            backgroundColor: '#F5F9FC',
          }}
        >
          <TextInput
            accessibilityLabel="Tìm hoạt động"
            placeholder="Tên hoạt động hoặc địa điểm"
            placeholderTextColor={c.ink}
            value={search}
            onChangeText={(value) => {
              setSearch(value);
              setFiltered(true);
            }}
            style={{
              flex: 1,
              minWidth: 0,
              paddingVertical: 12,
              fontFamily: 'BackupInter_400Regular',
              fontSize: 14,
              color: c.ink,
            }}
          />
          <Artwork source={a.imgSearch} width={18} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <EventSavedPill
          label="TP HCM"
          selected={city}
          checkSource={a.imgCheck}
          onPress={() => {
            setCity(!city);
            setFiltered(true);
          }}
        />
        <EventSavedPill
          label="Tuần này"
          selected={week}
          checkSource={a.imgCheck}
          onPress={() => {
            setWeek(!week);
            setFiltered(true);
          }}
        />
        <EventSavedPill
          label="Chủ đề"
          selected={category !== 'Tất cả'}
          checkSource={a.imgCheck}
          onPress={() => setTopics(true)}
        />
        {filtered ? <EventSavedPill label="Tất cả" selected={false} onPress={reset} /> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {categories.map(([value, label, icon]) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: category === value }}
            onPress={() => {
              setCategory(category === value ? 'Tất cả' : value);
              setFiltered(true);
            }}
            style={{
              flex: 1,
              minHeight: 78,
              borderRadius: 16,
              backgroundColor: category === value ? c.soft : c.mint,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 12,
            }}
          >
            <Artwork source={icon} width={26} />
            <T weight="medium" color={c.brand}>
              {label}
            </T>
          </Pressable>
        ))}
      </View>
      <View style={{ gap: 12 }}>
        <T size={16} weight="semibold" accessibilityRole="header">
          {filtered ? `Hoạt động phù hợp · ${items.length}` : 'Dành cho cuối tuần của bạn'}
        </T>
        <QueryContent
          loading={!sample && query.isPending}
          error={!sample && query.isError}
          retry={() => {
            void query.refetch();
          }}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {items.map((event) => (
              <ExploreCard
                key={event.id}
                event={event}
                saved={savedIds.includes(event.id)}
                onSave={() => toggle(event.id)}
              />
            ))}
          </View>
          {!items.length ? (
            <View style={{ gap: 12 }}>
              <T>Không tìm thấy hoạt động phù hợp.</T>
              <EventTextAction title="Xóa bộ lọc" onPress={reset} />
            </View>
          ) : null}
        </QueryContent>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mở lịch hoạt động"
        onPress={() => router.push('/calendar')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 16,
          backgroundColor: c.mint,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 20,
        }}
      >
        <Artwork source={a.imgCalendarDays} width={28} />
        <View style={{ flex: 1, gap: 4 }}>
          <T size={16} weight="semibold">
            Lên lịch cho một tuần xanh
          </T>
          <T size={12} color={c.muted}>
            Xem hoạt động theo ngày, tránh trùng lịch.
          </T>
        </View>
        <Artwork source={a.imgArrowRight} width={22} />
      </Pressable>
      {!sample ? (
        <View style={{ gap: 12 }}>
          <EventTextAction title="Đã lưu" onPress={() => router.push('/saved')} />
          <T size={12} color={c.muted}>
            Lịch mẫu: 19–25/10/2026. Lưu hoạt động trong phiên; chưa đăng ký tham gia.
          </T>
        </View>
      ) : null}
      {topics ? (
        <EventSheet title="Chủ đề hoạt động" onClose={() => setTopics(false)}>
          {[['Tất cả', 'Tất cả'], ...categories.map(([value, label]) => [value, label])].map(
            ([value, label]) => (
              <EventSavedPill
                key={value}
                label={label!}
                selected={category === value}
                checkSource={a.imgCheck}
                onPress={() => {
                  setCategory(value!);
                  setFiltered(true);
                  setTopics(false);
                }}
              />
            ),
          )}
        </EventSheet>
      ) : null}
    </CollectionPage>
  );
}

function ExploreCard({
  event,
  saved,
  onSave,
}: {
  event: GreenEvent;
  saved: boolean;
  onSave: () => void;
}) {
  const designCover =
    event.id === 'green-class'
      ? a.imgRectangle737
      : event.id === 'tree-day'
        ? a.imgRectangle738
        : undefined;
  const designTitle = event.id === 'green-class' || event.id === 'tree-day';
  return (
    <View style={{ flexBasis: '45%', flexGrow: 1, minWidth: 0, gap: 10 }}>
      <View
        style={{
          borderRadius: 15,
          backgroundColor: '#FFFFFF',
          boxShadow: '0px 4px 4px rgba(0,0,0,0.25)',
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Xem hoạt động ${event.title}`}
          onPress={() => router.push(`/events/${event.id}`)}
        >
          <View style={{ borderTopLeftRadius: 15, borderTopRightRadius: 15, overflow: 'hidden' }}>
            {designCover ? (
              <Artwork
                source={designCover}
                width={182}
                height={164}
                style={{ width: '100%' }}
                fit="cover"
              />
            ) : (
              <EventCover event={event} height={164} />
            )}
          </View>
          <View
            style={{
              minHeight: 106,
              paddingHorizontal: 11,
              paddingTop: 10,
              paddingBottom: 16,
              gap: 22,
            }}
          >
            <T size={14} lineHeight={17} weight="semibold" color="#2D528B">
              {event.title}
            </T>
            <T size={10} lineHeight={12} color="#2D528B" style={{ marginLeft: 10 }}>
              {event.id === 'green-class' ? 'Mầm non Tuổi Xanh, TP HCM' : event.area}
            </T>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${saved ? 'Bỏ lưu' : 'Lưu'} ${event.title}`}
          accessibilityState={{ selected: saved }}
          hitSlop={10}
          onPress={onSave}
          style={{
            position: 'absolute',
            right: 7,
            top: 9,
            width: 22,
            height: 22,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Artwork source={a.imgEllipse67} width={22} />
          {saved ? (
            <Artwork
              source={a.imgImage26}
              width={13}
              style={{ position: 'absolute' }}
              fit="cover"
            />
          ) : (
            <T size={18} lineHeight={22} color="#147CC1" style={{ position: 'absolute' }}>
              ♡
            </T>
          )}
        </Pressable>
      </View>
      <T
        size={12}
        color={c.brand}
      >{`${event.date.slice(8)}/${event.date.slice(5, 7)} • ${event.time.split(' · ')[0]?.replaceAll(' ', '')}`}</T>
      <T size={12} color={c.muted}>
        {designTitle
          ? `${event.id === 'green-class' ? 24 : 40} tình nguyện viên • Miễn phí`
          : 'Miễn phí · Hoạt động mẫu'}
      </T>
    </View>
  );
}
