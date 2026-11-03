# Ma trận 211 frame — 01/11/2026

Nguồn: kiểm kê Figma live trang backuped và route/source hiện tại. Đây là đối chiếu cấu trúc và tính sẵn có của state; không phải điểm số pixel similarity.

AUTH_PARTIAL: còn form gần thiết kế, cần nghiệm thu ảnh; UI_CHANGED: bố cục/state thay đổi; ROUTE_REMOVED: không còn route.

## Hoạt động (18)

Danh sách và chi tiết dùng MenuItem/Card chữ; không có hero/ảnh và các biến thể quan tâm như Figma. Calendar dùng nhập YYYY-MM thay lưới lịch. Vé/nhắc/tổng kết hiển thị thông báo giới hạn; đăng ký không còn form thiết kế.

| Figma frame | Route cũ | Màn hiện tại | Kết quả | Tham số cũ không phục hồi state thiết kế |
| --- | --- | --- | --- | --- |
| [534:49968 · Cài đặt nhắc lịch hoạt động đã lưu](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=534-49968) | /event-reminders?preview=1 | EventRemindersScreen | UI_CHANGED | preview |
| [534:49845 · Quản lý bộ sưu tập yêu thích](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=534-49845) | /event-collections?preview=1 | EventCollectionsScreen | UI_CHANGED | preview |
| [534:49760 · Tổng kết sau hoạt động](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=534-49760) | /event-summary?id=green-class&preview=1 | EventSummaryScreen | UI_CHANGED | preview |
| [534:49416 · Vé tham gia & check-in](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=534-49416) | /event-ticket?id=green-class&preview=1 | TicketScreen | UI_CHANGED | preview |
| [534:49326 · Đăng ký tham gia hoạt động](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=534-49326) | /registration?id=green-class&preview=1 | RegistrationScreen | UI_CHANGED | preview |
| [534:49166 · Lịch hoạt động môi trường](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=534-49166) | /calendar?preview=1 | CalendarScreen | UI_CHANGED | preview |
| [534:49034 · Khám phá hoạt động](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=534-49034) | /events?preview=1 | EventsScreen | UI_CHANGED | preview |
| [386:7054 · hoạt động](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7054) | /events/green-class?preview=1&interested=1 | EventDetailScreen | UI_CHANGED | preview, interested |
| [386:9376 · hoạt động](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-9376) | /events/green-class?preview=1 | EventDetailScreen | UI_CHANGED | preview |
| [386:9470 · hoạt động 2](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-9470) | /events/beach?preview=1 | EventDetailScreen | UI_CHANGED | preview |
| [386:9575 · hoạt động 3](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-9575) | /events/school-class?preview=1 | EventDetailScreen | UI_CHANGED | preview |
| [386:9681 · hoạt động 5](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-9681) | /events/school-class?preview=1&interested=1 | EventDetailScreen | UI_CHANGED | preview, interested |
| [386:10026 · hoạt động 1](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-10026) | /events/garden?preview=1 | EventDetailScreen | UI_CHANGED | preview |
| [386:10122 · yêu thích](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-10122) | /saved?preview=1&feedback=saved | EventsScreen | UI_CHANGED | preview, feedback |
| [386:10131 · xóa hoạt động](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-10131) | /saved?preview=1&feedback=removed | EventsScreen | UI_CHANGED | preview, feedback |
| [386:17299 · hoạt động 6](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-17299) | /events/garden?preview=1&interested=1 | EventDetailScreen | UI_CHANGED | preview, interested |
| [386:17397 · hoạt động 4](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-17397) | /events/beach?preview=1&interested=1 | EventDetailScreen | UI_CHANGED | preview, interested |
| [386:18069 · hoạt động yêu thích](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-18069) | /saved?preview=1 | EventsScreen | UI_CHANGED | preview |

## Thu gom / hành trình (13)

Màn live dùng form, MenuItem và Card; không render bản đồ/pin/lớp điều hướng theo frame. Directions/navigation/route gộp RouteScreen; provider đường đi/ETA chưa mở.

| Figma frame | Route cũ | Màn hiện tại | Kết quả | Tham số cũ không phục hồi state thiết kế |
| --- | --- | --- | --- | --- |
| [534:48955 · Đã đến nơi & hướng dẫn bàn giao](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=534-48955) | /collection-arrival | ArrivalScreen | UI_CHANGED |  |
| [534:48869 · Chọn điểm thay thế trên hành trình](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=534-48869) | /collection-replacement | RouteEditorScreen | UI_CHANGED |  |
| [534:48774 · Lập hành trình thu gom nhiều điểm](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=534-48774) | /journey | JourneyScreen | UI_CHANGED |  |
| [534:48690 · Báo cáo vấn đề tại điểm thu gom](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=534-48690) | /point-report | PointReportScreen | UI_CHANGED |  |
| [534:48595 · Đề xuất điểm thu gom mới](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=534-48595) | /point-proposal | PointProposalScreen | UI_CHANGED |  |
| [534:48505 · So sánh điểm thu gom](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=534-48505) | /collection-compare | CollectionCompareScreen | UI_CHANGED |  |
| [534:48401 · Bộ lọc điểm thu gom](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=534-48401) | /collection-filters | CollectionFiltersScreen | UI_CHANGED |  |
| [386:8569 · map](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-8569) | /collection | CollectionScreen | UI_CHANGED |  |
| [386:8633 · map](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-8633) | /collection-explore | CollectionScreen | UI_CHANGED |  |
| [386:10136 · map](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-10136) | /collection-navigation | RouteScreen | UI_CHANGED |  |
| [386:10186 · map](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-10186) | /points/green-hub | PointDetailScreen | UI_CHANGED |  |
| [386:10279 · map](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-10279) | /collection-directions | RouteScreen | UI_CHANGED |  |
| [386:10351 · map](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-10351) | /collection-route | RouteScreen | UI_CHANGED |  |

## Đăng nhập / đăng ký (2)

Còn AuthForm và asset gốc; giao diện gần thiết kế hơn nhóm khác nhưng nội dung phiên/validation/provider đã đổi. Cần so full-frame từng trạng thái; chưa nghiệm thu khớp hoàn toàn.

| Figma frame | Route cũ | Màn hiện tại | Kết quả | Tham số cũ không phục hồi state thiết kế |
| --- | --- | --- | --- | --- |
| [386:7184 · 11 · Đăng nhập](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7184) | /login | AuthScreen | AUTH_PARTIAL |  |
| [386:7390 · 12 · Đăng ký tài khoản](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7390) | /register | AuthScreen | AUTH_PARTIAL |  |

## Khôi phục / bảo mật tài khoản (5)

Form dùng Screen/Field chung thay layout riêng của thiết kế. OTP một ô thay trạng thái thiết kế; connected-account hiện là danh sách phiên đăng nhập, khác màn liên kết Google/Facebook.

| Figma frame | Route cũ | Màn hiện tại | Kết quả | Tham số cũ không phục hồi state thiết kế |
| --- | --- | --- | --- | --- |
| [386:7225 · 13 · Quên mật khẩu](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7225) | /forgot-password | ForgotPasswordScreen | UI_CHANGED |  |
| [386:7266 · 14 · Xác thực OTP](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7266) | /verify-email | VerifyEmailScreen | UI_CHANGED |  |
| [386:7307 · 15 · Đặt mật khẩu mới](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7307) | /reset-password | ResetPasswordScreen | UI_CHANGED |  |
| [386:7348 · 16 · Kết nối Google / Facebook](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7348) | /connected-account | SessionsScreen | UI_CHANGED |  |
| [521:4735 · 21 · Thay đổi mật khẩu](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=521-4735) | /change-password | ChangePasswordScreen | UI_CHANGED |  |

## Cá nhân / cài đặt / thành tích (8)

Dùng Screen/Card/MenuItem/form chung; không còn profile có avatar/progress/cards hay các SettingsOverlay; overlay bị bỏ qua. Thành tích chưa có hệ thống huy hiệu mở.

| Figma frame | Route cũ | Màn hiện tại | Kết quả | Tham số cũ không phục hồi state thiết kế |
| --- | --- | --- | --- | --- |
| [386:7420 · 18 · Profile — Cá nhân](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7420) | /profile | ProfileScreen | UI_CHANGED |  |
| [386:7550 · Thành tích](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7550) | /achievements | AchievementsScreen | UI_CHANGED |  |
| [386:8451 · 23 Cài đặt](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-8451) | /settings | SettingsScreen | UI_CHANGED |  |
| [386:8516 · 24 Chỉnh sửa](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-8516) | /edit-profile | EditProfileScreen | UI_CHANGED |  |
| [514:5093 · 19 Cài đặt · Overlay · Tìm kiếm](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=514-5093) | /settings?overlay=search | SettingsScreen | UI_CHANGED | overlay |
| [514:5096 · 20 Cài đặt · Overlay · Âm thanh và rung](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=514-5096) | /settings?overlay=sound | SettingsScreen | UI_CHANGED | overlay |
| [514:5099 · 21 Cài đặt · Overlay · Lịch sử đăng nhập](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=514-5099) | /settings?overlay=history | SettingsScreen | UI_CHANGED | overlay |
| [514:5102 · 22 Cài đặt · Overlay · Thiết lập PIN](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=514-5102) | /settings?overlay=pin | SettingsScreen | UI_CHANGED | overlay |

## Cộng đồng / soạn bài (30)

Feed dùng MenuItem; frame không được đọc nên không mở các biến thể thành viên/lọc/chi tiết/overlay theo link cũ. Composer hiện là text + public/private, thiếu các bố cục ảnh/vị trí/cảm xúc/camera/preview.

| Figma frame | Route cũ | Màn hiện tại | Kết quả | Tham số cũ không phục hồi state thiết kế |
| --- | --- | --- | --- | --- |
| [386:7647 · 38. Cộng đồng](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7647) | /community?preview=1&frame=386:7647 | CommunityScreen | UI_CHANGED | preview, frame |
| [386:7813 · 38. Cộng đồng](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7813) | /community?preview=1&frame=386:7813 | CommunityScreen | UI_CHANGED | preview, frame |
| [386:15047 · 54. Đăng bài viết](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-15047) | /compose?preview=1&frame=386:15047 | ComposerScreen | UI_CHANGED | preview, frame |
| [386:15090 · 59. Đăng bài viết](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-15090) | /compose?preview=1&frame=386:15090 | ComposerScreen | UI_CHANGED | preview, frame |
| [386:15150 · 60. Đăng bài viết](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-15150) | /compose?preview=1&frame=386:15150 | ComposerScreen | UI_CHANGED | preview, frame |
| [386:15209 · 62. Đăng bài viết](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-15209) | /compose?preview=1&frame=386:15209 | ComposerScreen | UI_CHANGED | preview, frame |
| [386:15270 · 55. Đăng bài viết](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-15270) | /compose?preview=1&frame=386:15270 | ComposerScreen | UI_CHANGED | preview, frame |
| [386:15419 · 57. Đăng bài viết](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-15419) | /compose?preview=1&frame=386:15419 | ComposerScreen | UI_CHANGED | preview, frame |
| [386:15552 · 56. Đăng bài viết](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-15552) | /compose?preview=1&frame=386:15552 | ComposerScreen | UI_CHANGED | preview, frame |
| [386:15972 · 58. Đăng bài viết](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-15972) | /compose?preview=1&frame=386:15972 | ComposerScreen | UI_CHANGED | preview, frame |
| [386:16071 · 58. Đăng bài viết](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-16071) | /compose?preview=1&frame=386:16071 | ComposerScreen | UI_CHANGED | preview, frame |
| [386:16188 · 61. Đăng bài / Đang tải lên](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-16188) | /compose?preview=1&frame=386:16188 | ComposerScreen | UI_CHANGED | preview, frame |
| [722:5570 · 40. Cộng đồng / Khám phá](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=722-5570) | /community?preview=1&frame=722:5570 | CommunityScreen | UI_CHANGED | preview, frame |
| [722:5635 · 40. Cộng đồng / Chi tiết bài đăng](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=722-5635) | /community?preview=1&frame=722:5635 | CommunityScreen | UI_CHANGED | preview, frame |
| [722:5699 · 41. Cộng đồng / Trang thành viên](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=722-5699) | /community?preview=1&frame=722:5699 | CommunityScreen | UI_CHANGED | preview, frame |
| [722:5749 · 42. Cộng đồng / Bài đã lưu](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=722-5749) | /community?preview=1&frame=722:5749 | CommunityScreen | UI_CHANGED | preview, frame |
| [723:5646 · 43. Cộng đồng / Viết bình luận](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=723-5646) | /community?preview=1&frame=723:5646 | CommunityScreen | UI_CHANGED | preview, frame |
| [723:5722 · 44. Cộng đồng / Đã gửi bình luận](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=723-5722) | /community?preview=1&frame=723:5722 | CommunityScreen | UI_CHANGED | preview, frame |
| [723:5809 · 45. Cộng đồng / Tùy chọn bài đăng](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=723-5809) | /community?preview=1&frame=723:5809 | CommunityScreen | UI_CHANGED | preview, frame |
| [723:5892 · 46. Cộng đồng / Đang theo dõi thành viên](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=723-5892) | /community?preview=1&frame=723:5892 | CommunityScreen | UI_CHANGED | preview, frame |
| [733:5722 · 47. Cộng đồng / Lọc thành viên](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=733-5722) | /community?preview=1&frame=733:5722 | CommunityScreen | UI_CHANGED | preview, frame |
| [733:5787 · 47. Cộng đồng / Lọc chủ đề](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=733-5787) | /community?preview=1&frame=733:5787 | CommunityScreen | UI_CHANGED | preview, frame |
| [734:5760 · 45. Cộng đồng / Bài đăng đã thích](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=734-5760) | /community?preview=1&frame=734:5760 | CommunityScreen | UI_CHANGED | preview, frame |
| [741:5779 · 63. Đăng bài / Bản nháp có ảnh](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=741-5779) | /compose?preview=1&frame=741:5779 | ComposerScreen | UI_CHANGED | preview, frame |
| [741:5846 · 64. Đăng bài / Đã gắn vị trí](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=741-5846) | /compose?preview=1&frame=741:5846 | ComposerScreen | UI_CHANGED | preview, frame |
| [741:5913 · 64. Đăng bài / Đã thêm cảm xúc](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=741-5913) | /compose?preview=1&frame=741:5913 | ComposerScreen | UI_CHANGED | preview, frame |
| [741:5980 · 64. Đăng bài / Người xem: Bạn bè](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=741-5980) | /compose?preview=1&frame=741:5980 | ComposerScreen | UI_CHANGED | preview, frame |
| [741:6047 · 64. Đăng bài / Người xem: Chỉ mình tôi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=741-6047) | /compose?preview=1&frame=741:6047 | ComposerScreen | UI_CHANGED | preview, frame |
| [741:6114 · 65. Đăng bài / Xem trước bài viết](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=741-6114) | /compose?preview=1&frame=741:6114 | ComposerScreen | UI_CHANGED | preview, frame |
| [743:6023 · 66. Đăng bài / Chụp ảnh](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=743-6023) | /compose?preview=1&frame=743:6023 | ComposerScreen | UI_CHANGED | preview, frame |

## Thông báo (14)

Một NotificationsScreen danh sách Card và nút đã đọc; không đọc frame; thiếu bộ lọc, màn cài đặt theo nhóm và các biến thể như thiết kế.

| Figma frame | Route cũ | Màn hiện tại | Kết quả | Tham số cũ không phục hồi state thiết kế |
| --- | --- | --- | --- | --- |
| [386:7913 · 48. Thông báo](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7913) | /notifications?preview=1&frame=386:7913 | NotificationsScreen | UI_CHANGED | preview, frame |
| [386:8003 · 39. Thống báo cộng đồng](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-8003) | /notifications?preview=1&frame=386:8003 | NotificationsScreen | UI_CHANGED | preview, frame |
| [386:8228 · 48. Thông báo](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-8228) | /notifications?preview=1&frame=386:8228 | NotificationsScreen | UI_CHANGED | preview, frame |
| [386:8311 · 48.Thông báo](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-8311) | /notifications?preview=1&frame=386:8311 | NotificationsScreen | UI_CHANGED | preview, frame |
| [386:8380 · 48. Thông báo](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-8380) | /notifications?preview=1&frame=386:8380 | NotificationsScreen | UI_CHANGED | preview, frame |
| [703:5399 · 49. Thông báo / Bộ lọc](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=703-5399) | /notifications?preview=1&frame=703:5399 | NotificationsScreen | UI_CHANGED | preview, frame |
| [703:5468 · 50. Thông báo / Chi tiết phân loại](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=703-5468) | /notifications?preview=1&frame=703:5468 | NotificationsScreen | UI_CHANGED | preview, frame |
| [703:5524 · 51. Thông báo / Cài đặt](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=703-5524) | /notifications?preview=1&frame=703:5524 | NotificationsScreen | UI_CHANGED | preview, frame |
| [703:5589 · 52. Thông báo / Đã xem hết](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=703-5589) | /notifications?preview=1&frame=703:5589 | NotificationsScreen | UI_CHANGED | preview, frame |
| [712:5475 · 53. Thông báo / Hoạt động](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=712-5475) | /notifications?preview=1&frame=712:5475 | NotificationsScreen | UI_CHANGED | preview, frame |
| [712:5578 · 51. Thông báo / Cài đặt · Hoạt động đã đổi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=712-5578) | /notifications?preview=1&frame=712:5578 | NotificationsScreen | UI_CHANGED | preview, frame |
| [712:5667 · 51. Thông báo / Cài đặt · Ưu đãi đã đổi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=712-5667) | /notifications?preview=1&frame=712:5667 | NotificationsScreen | UI_CHANGED | preview, frame |
| [712:5756 · 51.  Thông báo / Cài đặt · Cộng đồng đã đổi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=712-5756) | /notifications?preview=1&frame=712:5756 | NotificationsScreen | UI_CHANGED | preview, frame |
| [712:5845 · 51. Thông báo / Cài đặt · Tin tức đã đổi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=712-5845) | /notifications?preview=1&frame=712:5845 | NotificationsScreen | UI_CHANGED | preview, frame |

## Tin nhắn (16)

Link /messages mở danh sách hội thoại, không đọc frame để mở chat/emoji/tệp/ảnh/ghi âm. Conversation hiện riêng ở /conversation bằng Card chữ; không có các panel đính kèm thiết kế.

| Figma frame | Route cũ | Màn hiện tại | Kết quả | Tham số cũ không phục hồi state thiết kế |
| --- | --- | --- | --- | --- |
| [386:8086 · 68. Chat](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-8086) | /messages?preview=1&frame=386:8086 | MessagesScreen | UI_CHANGED | preview, frame |
| [386:8151 · 69. Chat](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-8151) | /messages?preview=1&frame=386:8151 | MessagesScreen | UI_CHANGED | preview, frame |
| [386:8179 · 70. Chat](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-8179) | /messages?preview=1&frame=386:8179 | MessagesScreen | UI_CHANGED | preview, frame |
| [386:17262 · 67. iPhone 14 Plus - 2](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-17262) | /messages?preview=1&frame=386:17262 | MessagesScreen | UI_CHANGED | preview, frame |
| [771:6023 · 71. Chat / Chọn emoji](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=771-6023) | /messages?preview=1&frame=771:6023 | MessagesScreen | UI_CHANGED | preview, frame |
| [771:6077 · 71. Chat / Đã gửi emoji](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=771-6077) | /messages?preview=1&frame=771:6077 | MessagesScreen | UI_CHANGED | preview, frame |
| [771:6108 · 72. Chat / Đính kèm](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=771-6108) | /messages?preview=1&frame=771:6108 | MessagesScreen | UI_CHANGED | preview, frame |
| [771:6144 · 73. Chat / Xem trước ảnh](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=771-6144) | /messages?preview=1&frame=771:6144 | MessagesScreen | UI_CHANGED | preview, frame |
| [771:6180 · 74. Chat / Đã gửi ảnh](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=771-6180) | /messages?preview=1&frame=771:6180 | MessagesScreen | UI_CHANGED | preview, frame |
| [771:6480 · 71. Chat / Đã gửi tệp](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=771-6480) | /messages?preview=1&frame=771:6480 | MessagesScreen | UI_CHANGED | preview, frame |
| [771:6514 · 71. Chat / Đang ghi âm](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=771-6514) | /messages?preview=1&frame=771:6514 | MessagesScreen | UI_CHANGED | preview, frame |
| [771:6565 · 71. Chat / Đã gửi ghi âm](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=771-6565) | /messages?preview=1&frame=771:6565 | MessagesScreen | UI_CHANGED | preview, frame |
| [772:6456 · 71. Chat / Đang soạn tin](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=772-6456) | /messages?preview=1&frame=772:6456 | MessagesScreen | UI_CHANGED | preview, frame |
| [772:6544 · 71. Chat / Đã gửi tin](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=772-6544) | /messages?preview=1&frame=772:6544 | MessagesScreen | UI_CHANGED | preview, frame |
| [773:6563 · 75. Chat / Chọn ảnh](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=773-6563) | /messages?preview=1&frame=773:6563 | MessagesScreen | UI_CHANGED | preview, frame |
| [773:6609 · 76. Chat / Chọn tệp](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=773-6609) | /messages?preview=1&frame=773:6609 | MessagesScreen | UI_CHANGED | preview, frame |

## Khung phụ (3)

Route /design-preview đã bị gỡ; khung phụ này không còn đường dẫn runtime theo mapping cũ.

| Figma frame | Route cũ | Màn hiện tại | Kết quả | Tham số cũ không phục hồi state thiết kế |
| --- | --- | --- | --- | --- |
| [386:8558 · navigation](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-8558) | /design-preview?frame=386:8558 | — | ROUTE_REMOVED | frame |
| [386:17297 · Frame 36707](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-17297) | /design-preview?frame=386:17297 | — | ROUTE_REMOVED | frame |
| [386:18473 · iPhone 14 Plus - 157](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-18473) | /design-preview?frame=386:18473 | — | ROUTE_REMOVED | frame |

## Trợ lý (11)

AssistantScreen là form câu hỏi sau RequireAuth; không có chat bubble và panel giọng nói theo 11 frame. Dịch vụ AI chưa mở.

| Figma frame | Route cũ | Màn hiện tại | Kết quả | Tham số cũ không phục hồi state thiết kế |
| --- | --- | --- | --- | --- |
| [386:8930 · Chat](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-8930) | /assistant?preview=1&frame=386:8930 | AssistantScreen | UI_CHANGED | preview, frame |
| [386:8977 · chat2](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-8977) | /assistant?preview=1&frame=386:8977 | AssistantScreen | UI_CHANGED | preview, frame |
| [386:9071 · Frame 36844](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-9071) | /assistant?preview=1&frame=386:9071 | AssistantScreen | UI_CHANGED | preview, frame |
| [386:9115 · Frame 36836](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-9115) | /assistant?preview=1&frame=386:9115 | AssistantScreen | UI_CHANGED | preview, frame |
| [386:9152 · Frame 36843](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-9152) | /assistant?preview=1&frame=386:9152 | AssistantScreen | UI_CHANGED | preview, frame |
| [386:9191 · Frame 36838](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-9191) | /assistant?preview=1&frame=386:9191 | AssistantScreen | UI_CHANGED | preview, frame |
| [386:9228 · Frame 36837](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-9228) | /assistant?preview=1&frame=386:9228 | AssistantScreen | UI_CHANGED | preview, frame |
| [386:9265 · Frame 36840](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-9265) | /assistant?preview=1&frame=386:9265 | AssistantScreen | UI_CHANGED | preview, frame |
| [386:9302 · Frame 36841](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-9302) | /assistant?preview=1&frame=386:9302 | AssistantScreen | UI_CHANGED | preview, frame |
| [386:9339 · Frame 36842](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-9339) | /assistant?preview=1&frame=386:9339 | AssistantScreen | UI_CHANGED | preview, frame |
| [386:17222 · Frame 36839](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-17222) | /assistant?preview=1&frame=386:17222 | AssistantScreen | UI_CHANGED | preview, frame |

## Tin tức (22)

Landing/search/briefs dùng NewsScreen chung; không có hero/grid. ArticleScreen render block.text, không dựng ảnh/bố cục riêng. Lịch xanh nối EventsScreen; reading-list trùng saved; modal quan tâm không còn.

| Figma frame | Route cũ | Màn hiện tại | Kết quả | Tham số cũ không phục hồi state thiết kế |
| --- | --- | --- | --- | --- |
| [386:9787 · 27. tin tức mới nhất ](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-9787) | /articles?view=latest&preview=1 | NewsScreen | UI_CHANGED | view, preview |
| [386:9901 · 28. sự kiện sắp tới](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-9901) | /articles?view=events&preview=1 | NewsScreen | UI_CHANGED | view, preview |
| [386:10644 · 29. tin tức chi tiết 2](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-10644) | /articles/youth-ideas?preview=1 | ArticleScreen | UI_CHANGED | preview |
| [386:10737 · 29. tin tức chi tiết 4](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-10737) | /articles/green-sunday?preview=1 | ArticleScreen | UI_CHANGED | preview |
| [386:10828 · 29. tin tức chi tiết 6](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-10828) | /articles/saigon-cleanup?preview=1 | ArticleScreen | UI_CHANGED | preview |
| [386:10919 · 29. tin tức chi tiết 8](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-10919) | /articles/tourism-cleanup?preview=1 | ArticleScreen | UI_CHANGED | preview |
| [386:17608 · 29. tin tức chi tiết](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-17608) | /articles/daily-waste?preview=1 | ArticleScreen | UI_CHANGED | preview |
| [386:17701 · 29. tin tức chi tiết](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-17701) | /articles/daily-waste?preview=1&expanded=1 | ArticleScreen | UI_CHANGED | preview, expanded |
| [386:17794 · 29. tin tức chi tiết 3](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-17794) | /articles/local-cleanup?preview=1 | ArticleScreen | UI_CHANGED | preview |
| [386:17887 · 29. tin tức chi tiết 5](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-17887) | /articles/storm-cleanup?preview=1 | ArticleScreen | UI_CHANGED | preview |
| [386:17978 · 29. tin tức chi tiết 7](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-17978) | /articles/ha-long?preview=1 | ArticleScreen | UI_CHANGED | preview |
| [391:24796 · 26. tin tức](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=391-24796) | /articles?preview=1 | NewsScreen | UI_CHANGED | preview |
| [609:5165 · 30. Tin tức · Tìm kiếm và lọc](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=609-5165) | /articles?view=search&preview=1 | NewsScreen | UI_CHANGED | view, preview |
| [609:5266 · 31. Tin tức · Bài viết đã lưu](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=609-5266) | /articles/saved?preview=1 | NewsScreen | UI_CHANGED | preview |
| [609:5361 · 32. Tin tức · Thảo luận bài viết](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=609-5361) | /articles/discussion?id=daily-waste&preview=1 | DiscussionScreen | UI_CHANGED | preview |
| [612:5286 · 33. Tin tức · Khám phá chủ đề](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=612-5286) | /articles/topics?preview=1 | TopicsScreen | UI_CHANGED | preview |
| [612:5362 · 34. Tin tức · Lịch sự kiện xanh](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=612-5362) | /articles/calendar?preview=1 | EventsScreen | UI_CHANGED | preview |
| [612:5441 · 34. Tin tức · Bản tin nhanh](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=612-5441) | /articles/briefs?preview=1 | NewsScreen | UI_CHANGED | preview |
| [680:5343 · 35. Tin tức / Tìm kiếm và kết quả](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=680-5343) | /articles/search?preview=1 | NewsScreen | UI_CHANGED | preview |
| [680:5406 · 36. Tin tức / Danh sách đọc](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=680-5406) | /articles/reading-list?preview=1 | NewsScreen | UI_CHANGED | preview |
| [680:5461 · 37. Tin tức / Chi tiết sự kiện xanh](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=680-5461) | /articles/events/nhieu-loc?preview=1 | EventDetailScreen | UI_CHANGED | preview |
| [695:5419 · 37. Tin tức / Xác nhận quan tâm sự kiện](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=695-5419) | /articles/events/nhieu-loc?preview=1&confirm=1 | EventDetailScreen | UI_CHANGED | preview |

## Điểm / đổi quà (17)

Dùng ví/catalog/history dạng Card/MenuItem chung; không đọc frame để hiện các biến thể điểm danh, nhắc, modal xác nhận/success; chương trình thưởng/đổi thưởng chưa mở.

| Figma frame | Route cũ | Màn hiện tại | Kết quả | Tham số cũ không phục hồi state thiết kế |
| --- | --- | --- | --- | --- |
| [386:11010 · Tích điểm và phần thưởng](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-11010) | /rewards?preview=1&frame=386:11010 | RewardsScreen | UI_CHANGED | preview, frame |
| [386:11320 · Cách quy đổi điểm](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-11320) | /rewards/guide?preview=1&frame=386:11320 | RewardsGuideScreen | UI_CHANGED | preview, frame |
| [386:11451 · Phần thưởng](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-11451) | /rewards/catalog?preview=1&frame=386:11451 | RewardsScreen | UI_CHANGED | preview, frame |
| [386:11652 · Sau khi nhận điểm mỗi ngày](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-11652) | /rewards/catalog?preview=1&frame=386:11652 | RewardsScreen | UI_CHANGED | preview, frame |
| [386:11858 · Nhắc tôi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-11858) | /rewards/catalog?preview=1&frame=386:11858 | RewardsScreen | UI_CHANGED | preview, frame |
| [386:12064 · Thông báo nhắc](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-12064) | /rewards/catalog?preview=1&frame=386:12064 | RewardsScreen | UI_CHANGED | preview, frame |
| [386:12071 · Lịch sử](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-12071) | /history?preview=1&frame=386:12071 | HistoryScreen | UI_CHANGED | preview, frame |
| [386:12194 · Lịch sử](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-12194) | /history?preview=1&frame=386:12194 | HistoryScreen | UI_CHANGED | preview, frame |
| [386:12284 · Lịch sử](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-12284) | /history?preview=1&frame=386:12284 | HistoryScreen | UI_CHANGED | preview, frame |
| [386:12362 · Sau khi xác nhận đổi quà](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-12362) | /rewards/catalog?preview=1&frame=386:12362 | RewardsScreen | UI_CHANGED | preview, frame |
| [386:12517 · xác nhận đổi quà](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-12517) | /rewards/catalog?preview=1&frame=386:12517 | RewardsScreen | UI_CHANGED | preview, frame |
| [386:12671 · Nhận thưởng ngày](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-12671) | /rewards/catalog?preview=1&frame=386:12671 | RewardsScreen | UI_CHANGED | preview, frame |
| [386:12823 · Phần thưởng giải trí](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-12823) | /rewards/catalog?preview=1&frame=386:12823 | RewardsScreen | UI_CHANGED | preview, frame |
| [386:12956 · Phần thưởng khác](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-12956) | /rewards/catalog?preview=1&frame=386:12956 | RewardsScreen | UI_CHANGED | preview, frame |
| [386:13109 · Phần thưởng voucher](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-13109) | /rewards/catalog?preview=1&frame=386:13109 | RewardsScreen | UI_CHANGED | preview, frame |
| [386:16253 · Tích điểm và phần thưởng](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-16253) | /rewards?preview=1&frame=386:16253 | RewardsScreen | UI_CHANGED | preview, frame |
| [386:16592 · Tích điểm và phần thưởng](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-16592) | /rewards?preview=1&frame=386:16592 | RewardsScreen | UI_CHANGED | preview, frame |

## Sổ tay rác (20)

Landing/list/category/types dùng chung HandbookScreen, không còn lưới minh họa hay layout phân loại riêng; kind bị bỏ qua. Chi tiết dùng chữ hướng dẫn trong Card.

| Figma frame | Route cũ | Màn hiện tại | Kết quả | Tham số cũ không phục hồi state thiết kế |
| --- | --- | --- | --- | --- |
| [386:13263 · SoTayRac](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-13263) | /handbook | HandbookScreen | UI_CHANGED |  |
| [386:13313 · SoTayRac1](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-13313) | /handbook?variant=active | HandbookScreen | UI_CHANGED |  |
| [386:13364 · AllSoTayRac](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-13364) | /handbook/list | HandbookScreen | UI_CHANGED |  |
| [386:13593 · RacVoCo](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-13593) | /handbook/category/inorganic | HandbookScreen | UI_CHANGED |  |
| [386:13685 · RacVoCo1](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-13685) | /handbook/category/inorganic?expanded=1 | HandbookScreen | UI_CHANGED | expanded |
| [386:13782 · RacHuuCo](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-13782) | /handbook/category/organic | HandbookScreen | UI_CHANGED |  |
| [386:13838 · RacHuuCo1](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-13838) | /handbook/category/organic?expanded=1 | HandbookScreen | UI_CHANGED | expanded |
| [386:13929 · RacTaiChe](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-13929) | /handbook/category/recycle | HandbookScreen | UI_CHANGED |  |
| [386:14037 · RacTaiChe1](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14037) | /handbook/category/recycle?expanded=1 | HandbookScreen | UI_CHANGED | expanded |
| [386:14521 · Sổ tay_Nhựa](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14521) | /handbook/plastic | WasteDetailScreen | UI_CHANGED |  |
| [386:14595 · Sổ tay_Hộp carton](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14595) | /handbook/carton | WasteDetailScreen | UI_CHANGED |  |
| [386:14670 · Sổ tay_Áo quần](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14670) | /handbook/textiles | WasteDetailScreen | UI_CHANGED |  |
| [386:14745 · Sổ tay_Pin](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14745) | /handbook/battery | WasteDetailScreen | UI_CHANGED |  |
| [386:14820 · Sổ tay_Rác hữu cơ](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14820) | /handbook/organic | WasteDetailScreen | UI_CHANGED |  |
| [386:14895 · Sổ tay_Thủy tinh](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14895) | /handbook/glass | WasteDetailScreen | UI_CHANGED |  |
| [386:14970 · Sổ tay_Giấy](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14970) | /handbook/paper | WasteDetailScreen | UI_CHANGED |  |
| [386:16931 · Phân loại rác - nhựa](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-16931) | /handbook/types/plastic | HandbookScreen | UI_CHANGED |  |
| [386:17005 · Phân loại rác - dụng cụ y tế](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-17005) | /handbook/types/medical | HandbookScreen | UI_CHANGED |  |
| [386:17077 · Phân loại rác - nilong](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-17077) | /handbook/types/bag | HandbookScreen | UI_CHANGED |  |
| [386:17145 · Phân loại rác - pin](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-17145) | /handbook/types/battery | HandbookScreen | UI_CHANGED |  |

## Quét / kết quả phân loại (10)

Màn scan là nút camera/chọn ảnh, preview thiết bị và tra cứu tay; không còn các scene kết quả/loading/chi tiết thiết kế. Nhận diện AI chưa mở.

| Figma frame | Route cũ | Màn hiện tại | Kết quả | Tham số cũ không phục hồi state thiết kế |
| --- | --- | --- | --- | --- |
| [386:14194 · Scan](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14194) | /scan?state=start&preview=1 | ScanScreen | UI_CHANGED | state, preview |
| [386:14221 · Scan1](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14221) | /scan?state=camera&preview=1 | ScanScreen | UI_CHANGED | state, preview |
| [386:14241 · Loading](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14241) | /scan?state=loading&preview=1 | ScanScreen | UI_CHANGED | state, preview |
| [386:14264 · Kqua_Scan2](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14264) | /scan?state=unrecognized&preview=1 | ScanScreen | UI_CHANGED | state, preview |
| [386:14309 · Kqu_Scan2](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14309) | /scan?state=result&preview=1 | ScanScreen | UI_CHANGED | state, preview |
| [386:14346 · Ttin rác](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14346) | /scan?state=detail&preview=1 | ScanScreen | UI_CHANGED | state, preview |
| [386:14379 · TBáo_tích điểm](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14379) | /scan?state=award&preview=1 | ScanScreen | UI_CHANGED | state, preview |
| [386:14454 · Sổ tay rác_Scan](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14454) | /scan?state=handbook&preview=1 | ScanScreen | UI_CHANGED | state, preview |
| [386:16189 · Kqu_Scan1](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-16189) | /scan?state=focused&preview=1 | ScanScreen | UI_CHANGED | state, preview |
| [386:16218 · Kqu_Scan1](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-16218) | /scan?state=success&preview=1 | ScanScreen | UI_CHANGED | state, preview |

## Trò chơi (10)

GamesScreen chỉ tải /v1/games và thông báo chưa mở; không có danh sách game, tạo phòng, phòng chờ, gameplay hay kết quả theo 10 frame.

| Figma frame | Route cũ | Màn hiện tại | Kết quả | Tham số cũ không phục hồi state thiết kế |
| --- | --- | --- | --- | --- |
| [386:18241 · Trò chơi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-18241) | /game?preview=1&frame=386:18241 | GamesScreen | UI_CHANGED | preview, frame |
| [386:18285 · Trò chơi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-18285) | /game?preview=1&frame=386:18285 | GamesScreen | UI_CHANGED | preview, frame |
| [386:18308 · Trò chơi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-18308) | /game?preview=1&frame=386:18308 | GamesScreen | UI_CHANGED | preview, frame |
| [386:18336 · Trò chơi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-18336) | /game?preview=1&frame=386:18336 | GamesScreen | UI_CHANGED | preview, frame |
| [386:18364 · Trò chơi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-18364) | /game?preview=1&frame=386:18364 | GamesScreen | UI_CHANGED | preview, frame |
| [427:19392 · Trò chơi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=427-19392) | /game?preview=1&frame=427:19392 | GamesScreen | UI_CHANGED | preview, frame |
| [386:18396 · Trò chơi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-18396) | /game?preview=1&frame=386:18396 | GamesScreen | UI_CHANGED | preview, frame |
| [427:19460 · Trò chơi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=427-19460) | /game?preview=1&frame=427:19460 | GamesScreen | UI_CHANGED | preview, frame |
| [386:18428 · Trò chơi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-18428) | /game?preview=1&frame=386:18428 | GamesScreen | UI_CHANGED | preview, frame |
| [487:19805 · Trò chơi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=487-19805) | /game?preview=1&frame=487:19805 | GamesScreen | UI_CHANGED | preview, frame |

## Thống kê (1)

StatisticsScreen chỉ có ba Card số liệu; không có đồ thị/lưới thống kê và bố cục dài như frame.

| Figma frame | Route cũ | Màn hiện tại | Kết quả | Tham số cũ không phục hồi state thiết kế |
| --- | --- | --- | --- | --- |
| [391:25009 · thống kê](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=391-25009) | /statistics?preview=1 | StatisticsScreen | UI_CHANGED | preview |

## Trang chủ (1)

Hero dùng icon lá và thẻ chữ; thiếu bố cục banner minh họa, avatar, lưới 4 lối tắt, thẻ ví và thẻ hoạt động theo Figma. Sáu MenuItem xếp dọc thay lối tắt.

| Figma frame | Route cũ | Màn hiện tại | Kết quả | Tham số cũ không phục hồi state thiết kế |
| --- | --- | --- | --- | --- |
| [391:25197 · 17 · Home — Trang chủ](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=391-25197) | / | HomeScreen | UI_CHANGED |  |

## Onboarding (10)

10 frame step trước đây bị gộp vào một OnboardingScreen; không đọc step; không còn các màn REDUCE/REUSE/RECYCLE và hình minh họa theo từng bước.

| Figma frame | Route cũ | Màn hiện tại | Kết quả | Tham số cũ không phục hồi state thiết kế |
| --- | --- | --- | --- | --- |
| [386:7148 · 01 · Khởi động GreenSteps](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7148) | /onboarding?step=0&preview=1 | OnboardingScreen | UI_CHANGED | step, preview |
| [386:7418 · 02 · Chào mừng](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7418) | /onboarding?step=1&preview=1 | OnboardingScreen | UI_CHANGED | step, preview |
| [386:7154 · 03 · REDUCE — Giảm rác](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7154) | /onboarding?step=2&preview=1 | OnboardingScreen | UI_CHANGED | step, preview |
| [386:7158 · 04 · REUSE — Tái sử dụng](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7158) | /onboarding?step=3&preview=1 | OnboardingScreen | UI_CHANGED | step, preview |
| [386:7149 · 05 · RECYCLE — Phân loại đúng](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7149) | /onboarding?step=4&preview=1 | OnboardingScreen | UI_CHANGED | step, preview |
| [386:7151 · 06 · Chọn điều bạn quan tâm](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7151) | /onboarding?step=5&preview=1 | OnboardingScreen | UI_CHANGED | step, preview |
| [386:7156 · 07 · Mục tiêu khởi đầu](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7156) | /onboarding?step=6&preview=1 | OnboardingScreen | UI_CHANGED | step, preview |
| [386:7160 · 08 · Điểm thu gom gần bạn](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7160) | /onboarding?step=7&preview=1 | OnboardingScreen | UI_CHANGED | step, preview |
| [386:7168 · 09 · Lời nhắc sống xanh](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7168) | /onboarding?step=8&preview=1 | OnboardingScreen | UI_CHANGED | step, preview |
| [386:7176 · 10 · Sẵn sàng bắt đầu](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7176) | /onboarding?step=9&preview=1 | OnboardingScreen | UI_CHANGED | step, preview |

