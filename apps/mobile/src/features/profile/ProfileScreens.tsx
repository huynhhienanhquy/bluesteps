import { useState } from 'react';
import { router } from 'expo-router';
import { useApp } from '../../providers';
import { Button, Card, Chip, Label, MenuItem, Notice, Row, Screen } from '../../design-system/ui';
import type { DemoState } from '../../services/demo';
import { mockStatistics } from '../../services/mock-session';
import { QueryContent } from '../../design-system/QueryContent';
import { useDemoQuery } from '../../services/useDemoQuery';

export { ProfileOverview as ProfileScreen } from './ProfileOverview';
export function DemoToolsScreen() {
  const { theme, setTheme, state, setState, resetDemo } = useApp();
  const [resetDone, setResetDone] = useState(false);
  return (
    <Screen title="Công cụ bản mẫu" back>
      <Label size={20} bold>
        Giao diện
      </Label>
      <Row style={{ flexWrap: 'wrap' }}>
        {(
          [
            { value: 'system', label: 'Hệ thống' },
            { value: 'light', label: 'Sáng' },
            { value: 'dark', label: 'Tối' },
          ] as const
        ).map((item) => (
          <Chip
            key={item.value}
            label={item.label}
            selected={theme === item.value}
            onPress={() => setTheme(item.value)}
          />
        ))}
      </Row>
      <Notice>
        Thiết lập chỉ áp dụng cho phiên hiện tại. Demo không lưu dữ liệu tài khoản hoặc cài đặt lên
        server.
      </Notice>
      <Label size={20} bold>
        Kiểm tra trạng thái dữ liệu
      </Label>
      <Label size={13}>
        Áp dụng cho danh sách sổ tay, điểm thu gom, hoạt động, tin tức, quà, lịch sử, thống kê,
        thông báo và hội thoại.
      </Label>
      <Row style={{ flexWrap: 'wrap' }}>
        {(
          [
            { value: 'content', label: 'Có dữ liệu' },
            { value: 'loading', label: 'Tải chậm' },
            { value: 'empty', label: 'Trống' },
            { value: 'error', label: 'Lỗi' },
          ] satisfies { value: DemoState; label: string }[]
        ).map((item) => (
          <Chip
            key={item.value}
            label={item.label}
            selected={state === item.value}
            onPress={() => setState(item.value)}
          />
        ))}
      </Row>
      <Button
        title="Khôi phục dữ liệu demo"
        variant="secondary"
        onPress={() => {
          resetDemo();
          setResetDone(true);
        }}
      />
      <Label size={12}>
        Khôi phục sẽ nạp lại seed và xóa các bài viết, tin nhắn, lựa chọn lưu/thích và hành trình
        bạn vừa thử trong phiên.
      </Label>
      {resetDone ? <Notice tone="success">Đã nạp lại bộ dữ liệu demo ban đầu.</Notice> : null}
      <MenuItem
        title="Điều khoản & quyền riêng tư"
        icon="shield-checkmark-outline"
        onPress={() => router.push('/legal')}
      />
      <Notice>
        Quản lý thiết bị, app lock, thông báo đẩy và phiên đăng nhập sẽ được nối sau khi có backend
        và native integration.
      </Notice>
    </Screen>
  );
}
export { EditProfileScreen } from './EditProfileScreen';
export function StatisticsScreen() {
  const query = useDemoQuery('weeklyStatistics');
  return (
    <Screen title="Thống kê của tôi" back>
      <Notice>
        Số liệu tổng hợp giả lập cho {mockStatistics.period.toLocaleLowerCase('vi')}. Không phải
        khối lượng hoặc tác động được xác minh; thao tác demo không cộng thêm vào các số này.
      </Notice>
      <QueryContent
        loading={query.isPending}
        error={query.isError}
        empty={!query.data?.length}
        retry={() => {
          void query.refetch();
        }}
      >
        <Card>
          <Label size={20} bold>
            Tổng quan minh họa
          </Label>
          <Label bold size={32}>
            {mockStatistics.collectedKg.toLocaleString('vi-VN')} kg mẫu
          </Label>
          <Label>
            {mockStatistics.sortingCount} lượt phân loại mẫu · {mockStatistics.activities.length}{' '}
            hoạt động mẫu
          </Label>
        </Card>
        <Label size={18} bold>
          Bảng số liệu theo tuần · mẫu
        </Label>
        {query.data?.map((week) => (
          <Card key={week.id}>
            <Label bold>{week.label}/2026</Label>
            <Label>
              {week.sortingCount} lượt phân loại · {week.collectedKg.toLocaleString('vi-VN')} kg
              minh họa
            </Label>
          </Card>
        ))}
        <Label size={18} bold>
          Hoạt động trong bộ seed
        </Label>
        {mockStatistics.activities.map((activity) => (
          <Card key={activity.id}>
            <Label>{activity.title}</Label>
            <Label size={12}>{activity.date}</Label>
          </Card>
        ))}
      </QueryContent>
    </Screen>
  );
}
export function LegalScreen() {
  return (
    <Screen title="Điều khoản & quyền riêng tư" back>
      <Notice tone="warning">
        Nội dung sản phẩm đang chờ hoàn thiện, chưa phải điều khoản pháp lý đã công bố.
      </Notice>
      <Label>
        Phiên frontend này chỉ dùng dữ liệu tổng hợp. Không gửi mật khẩu, ảnh, vị trí, bài viết hoặc
        tin nhắn tới dịch vụ bên ngoài.
      </Label>
      <Label>
        Biểu mẫu và các tương tác được giữ trong bộ nhớ của phiên demo. Khi tải lại ứng dụng, các
        thay đổi demo sẽ mất.
      </Label>
      <Label>
        Các chính sách tài khoản, retention, consent và xóa dữ liệu phải được hoàn thiện trước khi
        bật đăng ký thật.
      </Label>
    </Screen>
  );
}
