import { Label, Notice, Screen } from '../../design-system/ui';

export { ProfileOverview as ProfileScreen } from './ProfileOverview';

export { EditProfileScreen } from './EditProfileScreen';
export { SettingsScreen, SessionsScreen } from './SettingsScreen';

export { StatisticsScreen } from './StatisticsScreen';
export { AchievementsScreen } from './AchievementsScreen';

export { NotificationsScreen } from './NotificationsScreen';

export { OnboardingScreen } from './OnboardingScreen';

export function LegalScreen() {
  return (
    <Screen title="Điều khoản và bảo mật" back>
      <Label>
        Ứng dụng lưu thông tin tài khoản và các thao tác bạn gửi đến hệ thống. Không công khai
        email, ngày sinh hoặc nội dung hội thoại cho người ngoài.
      </Label>
      <Notice>
        Điều khoản pháp lý đầy đủ sẽ được đơn vị vận hành công bố trước khi mở dịch vụ cho người
        dùng thật.
      </Notice>
    </Screen>
  );
}
