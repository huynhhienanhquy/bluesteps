import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Button, Card, Chip, Label, Notice, Row } from '../../design-system/ui';
import { useApp } from '../../providers';
import type { Schemas } from '../../services/api';
import { useCommand, usePages } from '../../services/queries';
import { CommandError, More, QueryState } from './common';
import { UserAvatar } from './UserAvatar';

export function FriendButtons({ member }: { member: Schemas['CommunityMember'] }) {
  const { user, status } = useApp();
  const command = useCommand();
  const [confirm, setConfirm] = useState(false);
  const working = useRef(false);
  useEffect(() => {
    setConfirm(false);
  }, [member.friendship]);
  function send(path: string, method: 'PUT' | 'DELETE') {
    if (working.current) return;
    working.current = true;
    void command
      .mutateAsync({ path, method })
      .catch(() => {})
      .finally(() => {
        working.current = false;
      });
  }
  if (user?.id === member.id) return null;
  const remove = () => send(`/v1/me/friends/${member.id}`, 'DELETE');
  return (
    <>
      {member.friendship === 'friends' ? (
        <>
          <Label>👥 Bạn bè</Label>
          <Button
            title="Hủy kết bạn"
            variant="quiet"
            disabled={command.isPending}
            onPress={() => setConfirm(true)}
          />
          {confirm ? (
            <>
              <Notice tone="warning">
                Hủy kết bạn sẽ ngừng quyền xem bài dành cho bạn bè giữa hai tài khoản.
              </Notice>
              <Button
                title="Giữ quan hệ bạn bè"
                variant="quiet"
                disabled={command.isPending}
                onPress={() => setConfirm(false)}
              />
              <Button
                title="Xác nhận hủy kết bạn"
                variant="danger"
                pending={command.isPending}
                onPress={remove}
              />
            </>
          ) : null}
        </>
      ) : member.friendship === 'incoming' ? (
        <>
          <Label>Đã gửi cho bạn lời mời kết bạn</Label>
          <Button
            title="Chấp nhận kết bạn"
            pending={command.isPending}
            onPress={() => send(`/v1/me/friends/${member.id}`, 'PUT')}
          />
          <Button
            title="Từ chối lời mời"
            variant="quiet"
            pending={command.isPending}
            onPress={remove}
          />
        </>
      ) : member.friendship === 'outgoing' ? (
        <>
          <Notice>Đã gửi lời mời kết bạn</Notice>
          <Button
            title="Hủy lời mời kết bạn"
            variant="quiet"
            pending={command.isPending}
            onPress={remove}
          />
        </>
      ) : (
        <Button
          title="Kết bạn"
          variant="secondary"
          pending={command.isPending}
          onPress={() =>
            status === 'authenticated'
              ? send(`/v1/me/friend-requests/${member.id}`, 'PUT')
              : router.push({
                  pathname: '/login',
                  params: { returnTo: `/community?member=${encodeURIComponent(member.id)}` },
                })
          }
        />
      )}
      <CommandError error={command.error} />
    </>
  );
}

export function FriendsList() {
  const { status } = useApp();
  const { friend_state = 'friends' } = useLocalSearchParams<{ friend_state?: string }>();
  const state = ['friends', 'incoming', 'outgoing'].includes(friend_state)
    ? friend_state
    : 'friends';
  const query = usePages<Schemas['CommunityMember']>(`/v1/me/friends?state=${state}`, true);
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      if (status === 'authenticated') void refetch();
    }, [status, refetch]),
  );
  return (
    <>
      <Row style={{ flexWrap: 'wrap' }}>
        {[
          ['friends', 'Danh sách bạn bè'],
          ['incoming', 'Lời mời nhận được'],
          ['outgoing', 'Lời mời đã gửi'],
        ].map(([value, label]) => (
          <Chip
            key={value}
            label={label!}
            selected={state === value}
            onPress={() => router.setParams({ friend_state: value })}
          />
        ))}
      </Row>
      <QueryState
        query={query}
        empty={!query.data?.pages[0]?.items.length}
        emptyText="Chưa có thành viên trong danh sách này"
      >
        {query.data?.pages
          .flatMap((page) => page.items)
          .map((member) => (
            <Card key={member.id}>
              <Row>
                <UserAvatar userId={member.id} name={member.displayName} size={42} />
                <Button
                  title={member.displayName}
                  accessibilityLabel={`Xem hồ sơ ${member.displayName}`}
                  variant="quiet"
                  onPress={() =>
                    router.push({ pathname: '/community', params: { member: member.id } })
                  }
                />
              </Row>
              <FriendButtons member={member} />
            </Card>
          ))}
        <More query={query} />
      </QueryState>
    </>
  );
}
