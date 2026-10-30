import { router } from 'expo-router';
import { Empty, Screen } from '../src/design-system/ui';
export default function Page() {
  return (
    <Screen title="Không tìm thấy trang" back>
      <Empty
        title="Đường dẫn không tồn tại"
        detail="Quay về để tiếp tục hành trình xanh."
        action="Về trang chủ"
        onPress={() => router.replace('/')}
      />
    </Screen>
  );
}
