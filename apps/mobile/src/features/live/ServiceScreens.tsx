import { router } from 'expo-router';
import { Button, Notice, Screen } from '../../design-system/ui';

export function RemovedPreviewScreen() {
  return (
    <Screen title="Trang không còn khả dụng" back>
      <Notice>Các công cụ xem trước và tạo dữ liệu cục bộ đã được gỡ khỏi ứng dụng.</Notice>
      <Button title="Trang chủ" onPress={() => router.replace('/')} />
    </Screen>
  );
}
