import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../providers';
import {
  Button,
  Card,
  Chip,
  Empty,
  Icon,
  Label,
  Notice,
  Row,
  Screen,
  Section,
} from '../../design-system/ui';
import { QueryContent } from '../../design-system/QueryContent';
import { useDemoQuery } from '../../services/useDemoQuery';
import { rewards } from '../../services/fixtures';
import { mockWallet, formatDemoDate } from '../../services/mock-session';

export function RewardsScreen() {
  const { colors } = useApp();
  const [category, setCategory] = useState('Tất cả');
  const query = useDemoQuery('rewards');
  const items =
    query.data?.filter((reward) => category === 'Tất cả' || reward.category === category) ?? [];
  return (
    <Screen title="Điểm xanh & đổi quà" subtitle="Những lựa chọn nhỏ, niềm vui lớn.">
      <Card style={{ backgroundColor: colors.primary, borderWidth: 0 }}>
        <Label size={12} bold color={colors.heroText}>
          VÍ ĐIỂM MINH HỌA
        </Label>
        <Row>
          <Icon name="leaf-outline" size={36} color={colors.heroText} />
          <Label size={42} bold color={colors.heroText}>
            {mockWallet.balance}
          </Label>
          <Label color={colors.heroText}>điểm xanh</Label>
        </Row>
        <Label size={12} color={colors.heroText}>
          Số dư demo · Chưa kết nối sổ cái
        </Label>
      </Card>
      <Notice>
        Điểm và giá quà là fixture. Chưa bật tích điểm hằng ngày, cấp độ hoặc giao dịch đổi quà.
      </Notice>
      <Section title="Góc quà xanh" action="Lịch sử" onPress={() => router.push('/history')} />
      <Row style={{ flexWrap: 'wrap' }}>
        {['Tất cả', 'Sống xanh', 'Voucher'].map((value) => (
          <Chip
            key={value}
            label={value}
            selected={category === value}
            onPress={() => setCategory(value)}
          />
        ))}
      </Row>
      <QueryContent
        loading={query.isPending}
        error={query.isError}
        empty={!items.length}
        retry={() => {
          void query.refetch();
        }}
      >
        {items.map((reward) => (
          <Card key={reward.id}>
            <Row>
              <View style={{ backgroundColor: colors.soft, borderRadius: 20, padding: 20 }}>
                <Icon name={reward.icon} size={42} />
              </View>
              <View style={{ flex: 1 }}>
                <Label bold size={18}>
                  {reward.title}
                </Label>
                <Label bold color={colors.primary}>
                  {reward.cost} điểm · mẫu
                </Label>
                <Label size={12}>{reward.category}</Label>
              </View>
            </Row>
            <Button
              title="Xem phần thưởng"
              variant="secondary"
              onPress={() => router.push(`/rewards/${reward.id}`)}
            />
          </Card>
        ))}
      </QueryContent>
    </Screen>
  );
}
export function RewardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reward = rewards.find((item) => item.id === id);
  const [preview, setPreview] = useState(false);
  return (
    <Screen title="Phần thưởng" back>
      {!reward ? (
        <Empty title="Không tìm thấy phần thưởng" />
      ) : (
        <>
          <Card style={{ alignItems: 'center', padding: 36 }}>
            <Icon name={reward.icon} size={90} />
            <Label size={24} bold>
              {reward.title}
            </Label>
            <Label size={20} bold>
              {reward.cost} điểm minh họa
            </Label>
          </Card>
          <Label>{reward.description}</Label>
          <Notice tone="warning">
            Chưa có dữ liệu kho, chính sách giao quà hoặc ví thật. Không có điểm nào bị trừ.
          </Notice>
          <Button title="Xem trước đổi quà" onPress={() => setPreview(true)} />
          {preview ? (
            <Card>
              <Label size={20} bold>
                Kiểm tra trước khi đổi
              </Label>
              <Label>Ví mẫu: {mockWallet.balance} điểm</Label>
              <Label>Giá mẫu: {reward.cost} điểm</Label>
              <Notice tone={reward.cost > mockWallet.balance ? 'warning' : 'info'}>
                {reward.cost > mockWallet.balance
                  ? 'Số dư mẫu chưa đủ cho quà này.'
                  : 'Số dư mẫu đủ. Giao dịch thật vẫn cần server xác nhận giá, kho và số dư.'}
              </Notice>
              <Button title="Đổi quà chưa được kích hoạt" onPress={() => {}} disabled />
              <Button title="Đóng xem trước" variant="quiet" onPress={() => setPreview(false)} />
            </Card>
          ) : null}
        </>
      )}
    </Screen>
  );
}
export function HistoryScreen() {
  const [tab, setTab] = useState<'points' | 'rewards'>('points');
  const points = useDemoQuery('pointHistory');
  const redemptions = useDemoQuery('redemptionHistory');
  const { colors } = useApp();
  const query = tab === 'points' ? points : redemptions;
  return (
    <Screen title="Lịch sử điểm & quà" back>
      <Notice>
        Lịch sử được tạo sẵn để trình diễn. Các con số không phải quy tắc tích điểm hoặc giao dịch
        thật; thao tác thử không làm thay đổi số dư.
      </Notice>
      <Card>
        <Label size={13}>Số dư demo</Label>
        <Label bold size={32}>
          {mockWallet.balance} điểm
        </Label>
        <Label size={13}>
          Tổng nhận mẫu: {mockWallet.lifetimeEarned} · Đã dùng mẫu: {mockWallet.spent}
        </Label>
      </Card>
      <Row>
        <Chip label="Điểm xanh" selected={tab === 'points'} onPress={() => setTab('points')} />
        <Chip label="Quà đã đổi" selected={tab === 'rewards'} onPress={() => setTab('rewards')} />
      </Row>
      <QueryContent
        loading={query.isPending}
        error={query.isError}
        empty={!query.data?.length}
        retry={() => {
          void query.refetch();
        }}
      >
        {tab === 'points'
          ? [...(points.data ?? [])].reverse().map((entry) => (
              <Card key={entry.id}>
                <Row>
                  <View style={{ flex: 1 }}>
                    <Label bold>{entry.title}</Label>
                    <Label size={12}>{formatDemoDate(entry.occurredAt)} · Minh họa</Label>
                  </View>
                  <Label bold size={20} color={entry.delta > 0 ? colors.success : colors.danger}>
                    {entry.delta > 0 ? '+' : ''}
                    {entry.delta}
                  </Label>
                </Row>
                <Label size={13}>Số dư sau giao dịch mẫu: {entry.balanceAfter}</Label>
              </Card>
            ))
          : redemptions.data?.map((entry) => (
              <Card key={entry.id}>
                <Label bold>{rewards.find((reward) => reward.id === entry.rewardId)?.title}</Label>
                <Label>
                  {entry.cost} điểm mẫu · {entry.status}
                </Label>
                <Label size={12}>{formatDemoDate(entry.occurredAt)} · Không có đơn hàng thật</Label>
              </Card>
            ))}
      </QueryContent>
    </Screen>
  );
}
