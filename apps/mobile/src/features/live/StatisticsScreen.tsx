import { Fragment, useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import { PrivateModal as Modal } from './PrivateModal';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Artwork, DesignScreen } from '../../design-system/DesignScreen';
import { Button, Card, Chip, Field, Label, Notice } from '../../design-system/ui';
import { useApp } from '../../providers';
import { ApiError, errorMessage, type Schemas } from '../../services/api';
import { useCommand, useResource } from '../../services/queries';
import { CommandError, QueryState, RequireAuth } from './common';
import { CurvedNavigation } from './DesignParts';
import { calendarDateKey, isCalendarDate, shiftCalendarDate } from './calendar-model';

const art = {
  back: require('../../../assets/figma/final/391-25009/imgGroup36750.svg'),
  check: require('../../../assets/figma/final/391-25009/imgCheckContained.svg'),
  add: require('../../../assets/figma/final/391-25009/imgAddSquare02.svg'),
};
const palette = ['#0EA5E9', '#FBC900', '#F9373B', '#7DAFCA', '#F97316'];
const color = (code: string) =>
  palette[
    Array.from(code).reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % palette.length
  ]!;
const number = (value: number | string) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(Number(value));
const metricLabels = {
  sorting_actions: 'Lượt phân loại',
  reported_weight_kg: 'Khối lượng tự ghi nhận (kg)',
  event_checkins: 'Sự kiện đã check-in',
};
type Target = Schemas['PersonalTarget'];

function targetPhase(target: Target): 'completed' | 'upcoming' | 'expired' | 'active' {
  if (target.completed) return 'completed';
  const today = calendarDateKey(new Date(), target.timezone);
  return target.startsOn > today ? 'upcoming' : target.endsOn < today ? 'expired' : 'active';
}
const targetPhaseLabels = {
  completed: 'Hoàn thành',
  upcoming: 'Chưa bắt đầu',
  expired: 'Đã hết hạn',
  active: 'Đang thực hiện',
};

function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  const { colors } = useApp();
  return (
    <Card
      style={{
        padding: 16,
        borderRadius: 24,
        borderWidth: 0,
        gap: 14,
        backgroundColor: colors.surface,
        boxShadow: '0px 6px 9px rgba(15,23,42,0.07)',
      }}
    >
      <Label family="inter" size={18} bold heading>
        {title}
      </Label>
      {children}
    </Card>
  );
}

export function StatisticsScreen() {
  const { user } = useApp();
  return <StatisticsBody key={user?.id ?? 'guest'} />;
}
function StatisticsBody() {
  const params = useLocalSearchParams<{
    days?: string;
    end?: string;
    unit?: string;
    group?: string;
    day?: string;
  }>();
  const days = params.days === '30' ? 30 : 7;
  const end = isCalendarDate(params.end) ? params.end : null;
  const group = params.group ?? null;
  const [editing, setEditing] = useState<Target | 'new' | null>(null);
  const [archiving, setArchiving] = useState<string | null>(null);
  const query = useResource<Schemas['Insights']>(
    `/v1/me/insights?days=${days}${end ? '&end=' + end : ''}`,
    true,
  );
  const badges = useResource<Schemas['Milestone'][]>('/v1/me/badges', true);
  const command = useCommand({ feedback: true });
  const archivingRef = useRef(false);
  const { colors, dark, status } = useApp();
  const screenWidth = Math.min(428, useWindowDimensions().width);
  const data = query.data;
  const unit = params.unit === 'kg' && data?.weighedActions ? 'kg' : 'actions';
  const { refetch: refreshInsights } = query;
  const { refetch: refreshBadges } = badges;
  useFocusEffect(
    useCallback(() => {
      if (status !== 'authenticated') return;
      void refreshInsights();
      void refreshBadges();
    }, [status, refreshInsights, refreshBadges]),
  );
  const total = data
    ? unit === 'actions'
      ? data.periodActions
      : Number(data.reportedWeightKg ?? 0)
    : 0;
  const pieSize = Math.min(220, screenWidth - 196);
  const selected = data?.categories.find((item) => item.code === group);
  const value = (item: Schemas['Breakdown']) =>
    unit === 'actions' ? item.actions : Number(item.reportedWeightKg ?? 0);
  const today = calendarDateKey(new Date(), data?.timezone ?? 'Asia/Ho_Chi_Minh');
  return (
    <DesignScreen
      title="Thống kê"
      family="inter"
      background={dark ? colors.background : '#F8FBFF'}
      headerStyle={{ minHeight: 56, paddingHorizontal: 16, paddingBottom: 8 }}
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}
            style={{
              width: 40,
              height: 40,
              backgroundColor: colors.surface,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0px 4px 6px rgba(15,23,42,0.08)',
            }}
          >
            <Artwork source={art.back} width={24} />
          </Pressable>
          <Label size={28} bold heading>
            Thống kê
          </Label>
        </View>
      }
      contentStyle={{ paddingHorizontal: 16, paddingTop: 8, gap: 16 }}
      footer={<CurvedNavigation selected="profile" />}
    >
      <RequireAuth>
        {end || params.end ? (
          <Button
            title="Về kỳ hiện tại"
            variant="quiet"
            onPress={() => router.setParams({ end: undefined, day: undefined, group: undefined })}
          />
        ) : null}
        <QueryState query={query}>
          {data ? (
            <>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {[7, 30].map((period) => (
                  <Chip
                    key={period}
                    label={`${period} ngày`}
                    selected={days === period}
                    onPress={() => {
                      router.setParams({ days: String(period), group: undefined, day: undefined });
                    }}
                  />
                ))}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Button
                  title="‹"
                  accessibilityLabel="Kỳ trước"
                  variant="quiet"
                  onPress={() =>
                    router.setParams({
                      end: shiftCalendarDate(data.endsOn, -days),
                      day: undefined,
                      group: undefined,
                    })
                  }
                />
                <Label size={12} style={{ flex: 1, textAlign: 'center' }}>
                  {data.startsOn} → {data.endsOn}
                </Label>
                <Button
                  title="›"
                  accessibilityLabel="Kỳ sau"
                  variant="quiet"
                  disabled={data.endsOn >= today}
                  onPress={() =>
                    router.setParams({
                      end:
                        shiftCalendarDate(data.endsOn, days) > today
                          ? today
                          : shiftCalendarDate(data.endsOn, days),
                      day: undefined,
                      group: undefined,
                    })
                  }
                />
              </View>
              <Section title="Thống kê loại rác">
                <Label size={18} bold>
                  {data.periodActions} lượt phân loại
                </Label>
                <Label size={12} color={colors.muted}>
                  Hành động phân loại đã tự ghi nhận · Tổng cộng {data.sortingActions} lượt
                </Label>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Chip
                    label="Theo lượt"
                    selected={unit === 'actions'}
                    onPress={() => router.setParams({ unit: 'actions' })}
                  />
                  <Chip
                    label="Theo kg tự khai"
                    selected={unit === 'kg'}
                    disabled={!data.weighedActions}
                    onPress={() => router.setParams({ unit: 'kg' })}
                  />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    accessibilityLabel="Biểu đồ phân bố loại rác"
                    style={{ width: pieSize, height: pieSize }}
                  >
                    <Svg width={pieSize} height={pieSize} viewBox="0 0 220 220">
                      <Circle
                        cx={110}
                        cy={110}
                        r={94}
                        stroke={colors.soft}
                        strokeWidth={32}
                        fill="none"
                      />
                      {data.categories.map((item, index) => {
                        const part = total > 0 ? value(item) / total : 0;
                        const offset = total
                          ? data.categories
                              .slice(0, index)
                              .reduce((sum, previous) => sum + value(previous), 0) / total
                          : 0;
                        return (
                          <Circle
                            key={item.id}
                            cx={110}
                            cy={110}
                            r={94}
                            fill="none"
                            stroke={color(item.code)}
                            strokeWidth={32}
                            strokeDasharray={`${2 * Math.PI * 94 * part} ${2 * Math.PI * 94 * (1 - part)}`}
                            strokeDashoffset={-2 * Math.PI * 94 * offset}
                            rotation={-90}
                            origin="110,110"
                          />
                        );
                      })}
                      <SvgText
                        x={110}
                        y={111}
                        textAnchor="middle"
                        fontFamily="Inter_700Bold"
                        fontSize={30}
                        fill={colors.text}
                      >
                        {selected && total
                          ? `${Math.round((value(selected) / total) * 100)}%`
                          : number(total)}
                      </SvgText>
                      <SvgText
                        x={110}
                        y={137}
                        textAnchor="middle"
                        fontFamily="Inter_400Regular"
                        fontSize={13}
                        fill={colors.muted}
                      >
                        {selected
                          ? selected.name
                          : unit === 'actions'
                            ? 'lượt phân loại'
                            : 'kg tự ghi nhận'}
                      </SvgText>
                    </Svg>
                  </View>
                  <View style={{ flex: 1, gap: 12 }}>
                    {data.categories.map((item) => (
                      <Pressable
                        key={item.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Xem tỷ lệ ${item.name}`}
                        accessibilityState={{ selected: group === item.code }}
                        onPress={() =>
                          router.setParams({ group: group === item.code ? undefined : item.code })
                        }
                        style={{
                          flexDirection: 'row',
                          gap: 8,
                          minHeight: 40,
                          alignItems: 'center',
                        }}
                      >
                        <View
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 4,
                            backgroundColor: color(item.code),
                          }}
                        />
                        <View style={{ flex: 1 }}>
                          <Label size={12} bold>
                            {item.name}
                          </Label>
                          <Label size={11} color={colors.muted}>
                            {total ? Math.round((value(item) / total) * 100) : 0}% ·{' '}
                            {number(value(item))}
                            {unit === 'kg' ? ' kg' : ' lượt'}
                          </Label>
                        </View>
                      </Pressable>
                    ))}
                    {!data.categories.length ? (
                      <Label size={12} color={colors.muted}>
                        Chưa có lượt phân loại trong kỳ
                      </Label>
                    ) : null}
                  </View>
                </View>
                <Label size={22} bold color="#164561">
                  {data.reportedWeightKg === null
                    ? 'Chưa có khối lượng'
                    : `${number(data.reportedWeightKg)} kg tự ghi nhận`}
                </Label>
                <Label size={12} color={colors.muted}>
                  {data.weighedActions}/{data.periodActions} lượt có khối lượng đã nhập. Khối lượng
                  xác minh: chưa có dữ liệu.
                </Label>
              </Section>
              <Section title="Tần suất phân loại">
                <Frequency
                  data={data}
                  selected={params.day}
                  onSelect={(day) =>
                    router.setParams({ day: params.day === day ? undefined : day })
                  }
                />
              </Section>
              <Section title="Mục tiêu & Thành tựu">
                {data.targets.map((target) => (
                  <View
                    key={target.id}
                    style={{ backgroundColor: colors.soft, padding: 12, borderRadius: 16, gap: 10 }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: '#0EA5E9',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Artwork source={target.completed ? art.check : art.add} width={24} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Label size={14} bold>
                          {target.title}
                        </Label>
                        <Label size={11} color={colors.muted}>
                          {metricLabels[target.metric]} · {target.startsOn} → {target.endsOn}
                        </Label>
                      </View>
                    </View>
                    <Label size={13}>
                      {number(target.progress)}/{number(target.target)}{' '}
                      {target.metric === 'reported_weight_kg' ? 'kg' : 'lượt'} ·{' '}
                      {targetPhaseLabels[targetPhase(target)]}
                    </Label>
                    <View
                      accessibilityLabel={`Tiến độ mục tiêu ${Math.min(100, Math.round((Number(target.progress) / Number(target.target)) * 100))}%`}
                      style={{ height: 8, backgroundColor: colors.border, borderRadius: 4 }}
                    >
                      <View
                        style={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: '#0EA5E9',
                          width: `${Math.min(100, (Number(target.progress) / Number(target.target)) * 100)}%`,
                        }}
                      />
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {targetPhase(target) === 'active' ? (
                        <Button
                          title={
                            target.metric === 'event_checkins'
                              ? 'Tìm hoạt động để tham gia'
                              : 'Ghi nhận lượt phân loại'
                          }
                          variant="quiet"
                          onPress={() =>
                            router.push(target.metric === 'event_checkins' ? '/events' : '/scan')
                          }
                        />
                      ) : null}
                      <Button
                        title="Sửa mục tiêu"
                        variant="quiet"
                        onPress={() => setEditing(target)}
                      />
                      <Button
                        title="Lưu trữ mục tiêu"
                        variant="quiet"
                        onPress={() => setArchiving(target.id)}
                      />
                    </View>
                    {archiving === target.id ? (
                      <>
                        <Notice>Lưu trữ mục tiêu này khỏi danh sách đang theo dõi?</Notice>
                        <Button
                          title="Xác nhận lưu trữ"
                          pending={command.isPending}
                          onPress={() => {
                            if (archivingRef.current) return;
                            archivingRef.current = true;
                            void command
                              .mutateAsync({
                                path: `/v1/me/targets/${target.id}`,
                                method: 'DELETE',
                              })
                              .then(() => setArchiving(null))
                              .catch(() => {})
                              .finally(() => {
                                archivingRef.current = false;
                              });
                          }}
                        />
                        <Button
                          title="Giữ mục tiêu"
                          variant="quiet"
                          disabled={command.isPending}
                          onPress={() => setArchiving(null)}
                        />
                      </>
                    ) : null}
                  </View>
                ))}
                {!data.targets.length ? (
                  <Label size={13} color={colors.muted}>
                    Tạo mục tiêu đầu tiên và theo dõi tiến độ từ các thao tác đã ghi nhận.
                  </Label>
                ) : null}
                <Button
                  title="Thêm mục tiêu"
                  icon="add-circle-outline"
                  onPress={() => setEditing('new')}
                />
                <QueryState query={badges}>
                  {badges.data?.map((badge) => (
                    <View
                      key={badge.code}
                      style={{
                        flexDirection: 'row',
                        padding: 12,
                        backgroundColor: colors.soft,
                        borderRadius: 16,
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: '#0EA5E9',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Artwork source={badge.earned ? art.check : art.add} width={24} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Label size={14} bold>
                          {badge.title}
                        </Label>
                        <Label size={12} color={colors.muted}>
                          {badge.progress}/{badge.target} ·{' '}
                          {badge.earned ? 'Đã đạt' : 'Đang tích lũy'}
                        </Label>
                      </View>
                    </View>
                  ))}
                </QueryState>
                <Button
                  title="Xem thành tích và bảng xếp hạng"
                  variant="quiet"
                  onPress={() => router.push('/achievements')}
                />
                <CommandError error={command.error} />
              </Section>
              <Section title="Thống kê chi tiết">
                <Label size={14} bold color="#164561">
                  Theo vật liệu
                </Label>
                {!data.materials.length ? (
                  <Label size={12} color={colors.muted}>
                    Chưa có vật liệu được ghi nhận trong kỳ này.
                  </Label>
                ) : null}
                {data.materials.map((item, index) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Xem sổ tay ${item.name}`}
                    onPress={() =>
                      router.push({ pathname: '/handbook/list', params: { query: item.name } })
                    }
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 12,
                      borderRadius: 16,
                      backgroundColor: colors.soft,
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: palette[index % palette.length],
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <Label size={14} bold>
                        {item.name}
                      </Label>
                      <Label size={12} color={colors.muted}>
                        {item.reportedWeightKg
                          ? `${number(item.reportedWeightKg)} kg tự ghi nhận`
                          : 'Chưa nhập khối lượng'}
                      </Label>
                    </View>
                    <Label size={12}>{item.actions} lượt</Label>
                  </Pressable>
                ))}
                <Label size={12} color={colors.muted}>
                  Số dư: {data.wallet.balance} điểm · Tổng tích lũy: {data.wallet.lifetimeEarned}{' '}
                  điểm
                </Label>
              </Section>
            </>
          ) : null}
        </QueryState>
      </RequireAuth>
      {editing && data ? (
        <TargetEditor
          key={editing === 'new' ? 'new' : editing.id}
          target={editing === 'new' ? null : editing}
          timezone={data.timezone}
          close={() => setEditing(null)}
        />
      ) : null}
    </DesignScreen>
  );
}

function Frequency({
  data,
  selected,
  onSelect,
}: {
  data: Schemas['Insights'];
  selected?: string;
  onSelect: (day: string) => void;
}) {
  const { colors } = useApp();
  const maximum = Math.max(
    4,
    Math.ceil(Math.max(...data.frequency.map((day) => day.actions)) / 4) * 4,
  );
  const column = 300 / data.frequency.length;
  const keys = data.categories.map((category) => category.code);
  const barWidth = Math.max(2, Math.min(12, (column - 6) / Math.max(1, keys.length)));
  const day = data.frequency.find((item) => item.date === selected);
  return (
    <View style={{ backgroundColor: colors.soft, padding: 16, borderRadius: 20, gap: 12 }}>
      <Label size={14} bold>
        {data.periodActions} lần/{data.frequency.length} ngày
      </Label>
      <View accessibilityLabel="Biểu đồ tần suất phân loại theo ngày">
        <Svg width="100%" height={200} viewBox="0 0 340 195">
          {[0, 1, 2, 3, 4].map((tick) => (
            <Fragment key={tick}>
              <Line
                key={`line-${tick}`}
                x1={30}
                y1={160 - tick * 35}
                x2={335}
                y2={160 - tick * 35}
                stroke="#DCE8F0"
                strokeWidth={0.5}
              />
              <SvgText
                key={`text-${tick}`}
                x={24}
                y={164 - tick * 35}
                textAnchor="end"
                fontSize={9}
                fill={colors.muted}
              >
                {(maximum * tick) / 4}
              </SvgText>
            </Fragment>
          ))}
          {data.frequency.map((item, index) => (
            <Fragment key={item.date}>
              {keys.map((key, categoryIndex) => (
                <Rect
                  key={`${item.date}-${key}`}
                  x={32 + index * column + categoryIndex * barWidth}
                  y={160 - ((item.categories[key] ?? 0) / maximum) * 140}
                  width={Math.max(1, barWidth - 1)}
                  height={((item.categories[key] ?? 0) / maximum) * 140}
                  fill={color(key)}
                  onPress={() => onSelect(item.date)}
                />
              ))}
              {index % (data.frequency.length > 10 ? 5 : 1) === 0 ? (
                <SvgText
                  key={item.date}
                  x={32 + index * column + column / 2}
                  y={182}
                  textAnchor="middle"
                  fontSize={8}
                  fill={colors.muted}
                >
                  {Number(item.date.slice(8))}/{Number(item.date.slice(5, 7))}
                </SvgText>
              ) : null}
            </Fragment>
          ))}
          <Polyline
            points={data.frequency
              .map(
                (item, index) =>
                  `${32 + index * column + column / 2},${160 - (item.actions / maximum) * 140}`,
              )
              .join(' ')}
            fill="none"
            stroke="#164561"
            strokeWidth={1.5}
          />
        </Svg>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {data.frequency.map((entry) => (
          <Pressable
            key={entry.date}
            accessibilityRole="button"
            accessibilityLabel={`${entry.date}, ${entry.actions} lượt phân loại`}
            accessibilityState={{ selected: entry.date === selected }}
            onPress={() => onSelect(entry.date)}
            style={{
              minWidth: 62,
              minHeight: 48,
              padding: 8,
              gap: 3,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              backgroundColor: entry.date === selected ? colors.brand : colors.surface,
            }}
          >
            <Label size={11} bold color={entry.date === selected ? colors.heroText : colors.text}>
              {Number(entry.date.slice(8))}/{Number(entry.date.slice(5, 7))}
            </Label>
            <Label size={10} color={entry.date === selected ? colors.heroText : colors.muted}>
              {entry.actions} lượt
            </Label>
          </Pressable>
        ))}
      </ScrollView>
      <Label size={11} color={colors.muted}>
        {day
          ? `${day.date}: ${day.actions} lượt`
          : 'Chọn cột hoặc ngày để xem chi tiết, kể cả ngày chưa có lượt ghi nhận.'}
      </Label>
      {day ? (
        <View style={{ gap: 6 }}>
          {day.actions === 0 ? (
            <Label size={12} color={colors.muted}>
              Không có lượt phân loại được ghi nhận trong ngày này.
            </Label>
          ) : (
            data.categories
              .filter((category) => (day.categories[category.code] ?? 0) > 0)
              .map((category) => (
                <Label key={category.id} size={12}>
                  {category.name}: {day.categories[category.code]} lượt
                </Label>
              ))
          )}
        </View>
      ) : null}
    </View>
  );
}

function TargetEditor({
  target,
  timezone,
  close,
}: {
  target: Target | null;
  timezone: string;
  close: () => void;
}) {
  const today = calendarDateKey(new Date(), timezone);
  const [title, setTitle] = useState(target?.title ?? '');
  const [metric, setMetric] = useState<Target['metric']>(target?.metric ?? 'sorting_actions');
  const [amount, setAmount] = useState(target?.target ?? '10');
  const [start, setStart] = useState(target?.startsOn ?? today);
  const [end, setEnd] = useState(target?.endsOn ?? shiftCalendarDate(today, 29));
  const [version, setVersion] = useState(target?.version);
  const [zone, setZone] = useState(target?.timezone ?? timezone);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const { colors } = useApp();
  const command = useCommand<Target>({ feedback: true });
  const latest = useResource<Target[]>('/v1/me/targets', true, false);
  const working = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const busy = command.isPending || refreshing;
  const conflict = target && command.error instanceof ApiError && command.error.status === 409;
  function dismiss() {
    if (!working.current) close();
  }
  function validate() {
    if (!title.trim()) return 'Nhập tên mục tiêu.';
    const value = amount.trim().replace(',', '.');
    if (
      !/^\d+(?:\.\d{1,3})?$/.test(value) ||
      !Number.isFinite(Number(value)) ||
      Number(value) <= 0 ||
      Number(value) > 1_000_000
    )
      return 'Mục tiêu cần lớn hơn 0, tối đa 1.000.000 và có tối đa 3 chữ số thập phân.';
    if (metric !== 'reported_weight_kg' && !Number.isInteger(Number(value)))
      return 'Mục tiêu số lượt cần là số nguyên.';
    if (!isCalendarDate(start) || !isCalendarDate(end))
      return 'Nhập ngày có thật theo định dạng YYYY-MM-DD.';
    const duration =
      (new Date(end + 'T12:00:00Z').getTime() - new Date(start + 'T12:00:00Z').getTime()) /
      86_400_000;
    if (duration < 0 || duration > 365)
      return 'Ngày kết thúc cần từ ngày bắt đầu đến tối đa 365 ngày sau đó.';
    return '';
  }
  async function save() {
    if (working.current || unavailable) return;
    const issue = validate();
    setError(issue);
    if (issue) return;
    working.current = true;
    try {
      await command.mutateAsync({
        path: target ? `/v1/me/targets/${target.id}` : '/v1/me/targets',
        method: target ? 'PUT' : 'POST',
        body: {
          title: title.trim(),
          metric,
          target: amount.trim().replace(',', '.'),
          startsOn: start,
          endsOn: end,
          timezone: zone,
          ...(target ? { expectedVersion: version } : {}),
        },
      });
      if (alive.current) close();
    } catch {
      // Keep the user's changes and the original version when saving fails.
    } finally {
      working.current = false;
    }
  }
  async function reload() {
    if (!target || working.current) return;
    working.current = true;
    setRefreshing(true);
    setError('');
    try {
      const result = await latest.refetch();
      if (!alive.current) return;
      if (result.error) throw result.error;
      const value = result.data?.find((item) => item.id === target.id);
      if (!value) {
        setUnavailable(true);
        return;
      }
      setTitle(value.title);
      setMetric(value.metric);
      setAmount(value.target);
      setStart(value.startsOn);
      setEnd(value.endsOn);
      setVersion(value.version);
      setZone(value.timezone);
      command.reset();
    } catch (cause) {
      if (alive.current) setError(errorMessage(cause));
    } finally {
      working.current = false;
      if (alive.current) setRefreshing(false);
    }
  }
  return (
    <Modal transparent animationType="none" visible onRequestClose={dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          backgroundColor: '#0F172A66',
          padding: 24,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ScrollView
          style={{
            maxHeight: '90%',
            width: '100%',
            maxWidth: 380,
            borderRadius: 24,
            backgroundColor: colors.surface,
          }}
          contentContainerStyle={{ padding: 20, gap: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <Label size={22} bold heading>
            {target ? 'Sửa mục tiêu' : 'Mục tiêu mới'}
          </Label>
          <Field
            label="Tên mục tiêu"
            value={title}
            onChangeText={setTitle}
            maxLength={80}
            editable={!busy && !unavailable}
          />
          <View style={{ gap: 8 }}>
            {(Object.entries(metricLabels) as [Target['metric'], string][]).map(([key, label]) => (
              <Chip
                key={key}
                label={label}
                selected={metric === key}
                disabled={busy || unavailable}
                onPress={() => setMetric(key)}
              />
            ))}
          </View>
          <Field
            label={
              metric === 'reported_weight_kg' ? 'Mục tiêu (kg tự ghi nhận)' : 'Mục tiêu (số lượt)'
            }
            value={amount}
            onChangeText={setAmount}
            keyboardType={metric === 'reported_weight_kg' ? 'decimal-pad' : 'number-pad'}
            maxLength={16}
            editable={!busy && !unavailable}
          />
          <Field
            label="Ngày bắt đầu (YYYY-MM-DD)"
            value={start}
            onChangeText={setStart}
            maxLength={10}
            autoCapitalize="none"
            editable={!busy && !unavailable}
          />
          <Field
            label="Ngày kết thúc (YYYY-MM-DD)"
            value={end}
            onChangeText={setEnd}
            maxLength={10}
            autoCapitalize="none"
            editable={!busy && !unavailable}
          />
          <Label size={11} color={colors.muted}>
            Múi giờ: {zone}. Tiến độ tính từ thao tác đã lưu trong thời gian này.
          </Label>
          {error ? <Notice tone="error">{error}</Notice> : null}
          <CommandError error={command.error} />
          {unavailable ? (
            <Notice>
              Mục tiêu này đã được lưu trữ hoặc không còn tồn tại. Đóng cửa sổ để xem lại danh sách.
            </Notice>
          ) : conflict ? (
            <View style={{ gap: 10 }}>
              <Notice tone="warning">
                Mục tiêu đã thay đổi ở nơi khác. Dùng bản mới nhất để chỉnh tiếp sẽ thay các nội
                dung đang nhập.
              </Notice>
              <Button
                title="Dùng bản mới nhất"
                variant="secondary"
                pending={refreshing}
                onPress={() => void reload()}
              />
            </View>
          ) : null}
          <Button
            title="Lưu mục tiêu"
            pending={command.isPending}
            disabled={refreshing || unavailable || !!conflict}
            onPress={() => void save()}
          />
          <Button title="Hủy" variant="quiet" disabled={busy} onPress={dismiss} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
