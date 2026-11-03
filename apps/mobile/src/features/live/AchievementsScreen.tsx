import { useRef } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Artwork, StatusSpace } from '../../design-system/DesignScreen';
import { Button, Card, Icon, Label, Notice, Typography } from '../../design-system/ui';
import { useApp } from '../../providers';
import { ApiError, dateLabel, type Schemas } from '../../services/api';
import { useCommand, usePages, useResource } from '../../services/queries';
import { CommandError, More, QueryState, RequireAuth } from './common';
import { CurvedNavigation } from './DesignParts';
import { FriendsList } from './FriendControls';
import { useOptionalLocalProfile } from './LocalProfileProvider';
import { UserAvatar } from './UserAvatar';

const art = {
  leaf: require('../../../assets/figma/386-7550/imgImage17.png'),
  crown: require('../../../assets/figma/386-7550/imgImage19.png'),
  notificationFrame: require('../../../assets/figma/386-7550/imgFrame36714.svg'),
  bell: require('../../../assets/figma/386-7550/imgIconlySharpLightNotification.svg'),
};

function Avatar({ userId, name, size }: { userId?: string; name: string; size: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#D9F0FC',
        borderWidth: 2,
        borderColor: '#5FB7E3',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <UserAvatar userId={userId} name={name} size={size - 4} foreground="#164561" />
    </View>
  );
}

export function AchievementsScreen() {
  const { user, colors, dark } = useApp();
  const profile = useOptionalLocalProfile()?.profile;
  const displayName = profile?.displayName ?? user?.displayName ?? 'Thành viên';
  const summary = useResource<Schemas['AchievementSummary']>('/v1/me/achievement-summary', true);
  const board = usePages<Schemas['LeaderboardEntry']>('/v1/me/leaderboard', true);
  const badges = useResource<Schemas['Milestone'][]>('/v1/me/badges', true);
  const notifications = useResource<{ unread: number }>('/v1/me/notifications/summary', true);
  const command = useCommand({ feedback: true });
  const changingParticipation = useRef(false);
  const people = board.data?.pages.flatMap((page) => page.items) ?? [];
  const first = people.slice(0, 3);
  const slots = [first[1], first[0], first[2]];
  const points = summary.data?.lifetimeEarned;
  const threshold = summary.data?.nextThreshold;
  const progress =
    points === undefined
      ? undefined
      : threshold
        ? Math.max(0, Math.min(100, (Number(points) / Number(threshold)) * 100))
        : 100;
  const optedIn = summary.data?.leaderboard.optedIn ?? false;
  return (
    <Typography.Provider value="inter">
      <View style={{ flex: 1, backgroundColor: dark ? colors.background : '#A8D5F0' }}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              backgroundColor: '#147CC1',
              borderBottomLeftRadius: 35,
              borderBottomRightRadius: 35,
              alignItems: 'center',
              paddingBottom: 20,
              gap: 8,
            }}
          >
            <View style={{ width: '100%' }}>
              <StatusSpace />
            </View>
            <View
              style={{
                width: '100%',
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Quay lại"
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}
                style={{ width: 44, height: 44, justifyContent: 'center' }}
              >
                <Icon name="chevron-back" color="#FFFFFF" size={26} />
              </Pressable>
              <Label
                size={32}
                bold
                heading
                color="#FFFFFF"
                style={{ flex: 1, textAlign: 'center', lineHeight: 40 }}
              >
                Thành tích
              </Label>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Thông báo"
                onPress={() => router.push('/notifications')}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Artwork
                  source={art.notificationFrame}
                  width={31}
                  height={31}
                  style={{ position: 'absolute' }}
                />
                <Artwork source={art.bell} width={25} height={25} />
                {notifications.data?.unread ? (
                  <View
                    style={{
                      position: 'absolute',
                      right: 6,
                      top: 5,
                      width: 7,
                      height: 7,
                      borderRadius: 4,
                      backgroundColor: '#F9373B',
                    }}
                  />
                ) : null}
              </Pressable>
            </View>
            <Avatar userId={user?.id} name={displayName} size={120} />
            <Label size={20} bold color="#0F172A">
              {displayName}
            </Label>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Label size={16} color="#0F172A">
                {points ?? '—'}
                {threshold ? `/${threshold}` : ''}
              </Label>
              <Artwork source={art.leaf} width={24} />
            </View>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="Tiến độ tích lũy"
              accessibilityValue={
                progress === undefined
                  ? { text: 'Chưa có dữ liệu' }
                  : { min: 0, max: 100, now: Math.round(progress) }
              }
              style={{
                height: 27,
                width: '60%',
                borderRadius: 14,
                backgroundColor: '#A8D5F0',
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: 27,
                  borderRadius: 14,
                  width: `${progress ?? 0}%`,
                  backgroundColor: '#5FB7E3',
                }}
              />
            </View>
          </View>
          <View style={{ padding: 22, gap: 20 }}>
            <RequireAuth>
              <QueryState query={summary}>
                <Label size={14} bold>
                  Cấp {summary.data?.level ?? '—'} ·{' '}
                  {summary.data?.rank ? `Hạng ${summary.data.rank}` : 'Chưa có thứ hạng công khai'}
                </Label>
                <Card style={{ borderRadius: 20, gap: 12 }}>
                  <Label size={15} bold>
                    Bảng xếp hạng người tham gia
                  </Label>
                  <Label size={12} color={colors.muted}>
                    Khi tham gia, tên hiển thị và tổng điểm tích lũy của bạn sẽ xuất hiện trong bảng
                    xếp hạng. Bạn có thể rời bảng bất kỳ lúc nào.
                  </Label>
                  <Button
                    title={optedIn ? 'Rời bảng xếp hạng' : 'Tham gia bảng xếp hạng'}
                    pending={command.isPending}
                    disabled={!summary.data || summary.isRefetching}
                    onPress={() => {
                      if (!summary.data || summary.isRefetching || changingParticipation.current)
                        return;
                      changingParticipation.current = true;
                      void command
                        .mutateAsync({
                          path: '/v1/me/leaderboard-preference',
                          method: 'PUT',
                          body: {
                            optedIn: !optedIn,
                            expectedVersion: summary.data.leaderboard.version,
                          },
                        })
                        .catch(async (cause) => {
                          if (cause instanceof ApiError && cause.status === 409) {
                            await Promise.all([summary.refetch(), board.refetch()]);
                          }
                        })
                        .finally(() => {
                          changingParticipation.current = false;
                        });
                    }}
                  />
                  <CommandError error={command.error} />
                </Card>
              </QueryState>
              <QueryState query={board}>
                {people.length ? (
                  <>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-end',
                        gap: 10,
                        paddingTop: 30,
                      }}
                    >
                      {slots.map((person, index) =>
                        person ? (
                          <View
                            key={person.id}
                            style={{
                              flex: 1,
                              minHeight: index === 1 ? 210 : 192,
                              borderRadius: 30,
                              borderWidth: 1,
                              borderColor: index === 1 ? '#309ED5' : '#164561',
                              alignItems: 'center',
                              padding: 12,
                              gap: 12,
                            }}
                          >
                            {index === 1 ? (
                              <Artwork
                                source={art.crown}
                                width={45}
                                height={45}
                                style={{ position: 'absolute', top: -36 }}
                              />
                            ) : null}
                            <Avatar
                              userId={person.id}
                              name={person.displayName}
                              size={index === 1 ? 80 : 64}
                            />
                            <Label size={14} style={{ textAlign: 'center' }}>
                              {person.id === user?.id ? displayName : person.displayName}
                            </Label>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Label size={14}>{person.points}</Label>
                              <Artwork source={art.leaf} width={24} />
                            </View>
                            <Label size={11} bold>
                              Hạng {person.rank}
                            </Label>
                          </View>
                        ) : (
                          <View key={`space-${index}`} style={{ flex: 1 }} />
                        ),
                      )}
                    </View>
                    {people.length > 3 ? (
                      <Card style={{ borderRadius: 20, gap: 18 }}>
                        {people.slice(3).map((person) => (
                          <View
                            key={person.id}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                          >
                            <Label size={16} bold>
                              {person.rank}
                            </Label>
                            <Avatar userId={person.id} name={person.displayName} size={42} />
                            <Label size={14} bold style={{ flex: 1 }}>
                              {person.id === user?.id ? displayName : person.displayName}
                            </Label>
                            <Label size={14}>{person.points}</Label>
                            <Artwork source={art.leaf} width={24} />
                          </View>
                        ))}
                      </Card>
                    ) : null}
                    <More query={board} />
                    <Label size={11} color={colors.muted}>
                      Thứ hạng theo tổng điểm đã tích lũy. Khi bằng điểm, tài khoản tạo trước xếp
                      trước. Những thành viên bị chặn được ẩn khỏi bảng của bạn.
                    </Label>
                  </>
                ) : (
                  <Notice>Chưa có thành viên hiển thị trong bảng xếp hạng này.</Notice>
                )}
              </QueryState>
              <Label size={20} bold heading>
                Bạn bè
              </Label>
              <FriendsList />
              <Label size={20} bold heading>
                Cột mốc hoạt động
              </Label>
              <QueryState
                query={badges}
                empty={!badges.data?.length}
                emptyText="Chưa có cột mốc hoạt động để hiển thị"
              >
                {badges.data?.map((badge) => (
                  <Card key={badge.code} style={{ borderRadius: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Icon
                        name={badge.earned ? 'checkmark-circle' : 'lock-closed-outline'}
                        color={badge.earned ? colors.brand : colors.muted}
                        size={28}
                      />
                      <Label size={15} bold style={{ flex: 1 }}>
                        {badge.title}
                      </Label>
                    </View>
                    <Label size={13}>
                      {badge.progress}/{badge.target} · {badge.earned ? 'Đã đạt' : 'Đang tích lũy'}
                    </Label>
                    {badge.earnedAt ? (
                      <Label size={11} color={colors.muted}>
                        Đạt ngày {dateLabel(badge.earnedAt)}
                      </Label>
                    ) : null}
                  </Card>
                ))}
              </QueryState>
              <Button
                title="Xem thống kê và mục tiêu"
                variant="quiet"
                onPress={() => router.push('/statistics')}
              />
            </RequireAuth>
          </View>
        </ScrollView>
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <CurvedNavigation selected="profile" />
        </View>
      </View>
    </Typography.Provider>
  );
}
