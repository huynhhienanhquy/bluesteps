# Đối chiếu lại 211 frame với frontend hiện tại

Mỗi dòng được đối chiếu route/source. Các trạng thái dưới đây không phải tỷ lệ giống ảnh. Chưa có frame được nghiệm thu toàn bộ các state/pixel/native.

PARTIAL_LAYOUT: có thay đổi bố cục, còn cần nghiệm thu. NEEDS_WORK_OR_VERIFICATION: chưa hoàn thiện hoặc chưa có bằng chứng nghiệm thu riêng; phần lý do mô tả chênh lệch cấp nhóm, không phải phép so ảnh cho từng frame. NO_RUNTIME_ROUTE: không có route khung phụ.

## Hoạt động (18)

Đã có khám phá, lịch tháng/tuần, một bố cục chi tiết và form đăng ký. Các biến thể chi tiết/đã lưu, bộ sưu tập, nhắc lịch, vé/check-in và tổng kết chưa đủ bố cục/state Figma; đăng ký thực tế vẫn bị cổng dịch vụ chặn.

| Frame | Route hiện tại | Component / source | Kết quả |
| --- | --- | --- | --- |
| [534:49968 · Cài đặt nhắc lịch hoạt động đã lưu](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=534-49968) | /event-reminders | [EventRemindersScreen](../../apps/mobile/src/features/live/EventScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [534:49845 · Quản lý bộ sưu tập yêu thích](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=534-49845) | /event-collections | [EventCollectionsScreen](../../apps/mobile/src/features/live/EventScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [534:49760 · Tổng kết sau hoạt động](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=534-49760) | /event-summary | [EventSummaryScreen](../../apps/mobile/src/features/live/EventScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [534:49416 · Vé tham gia & check-in](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=534-49416) | /event-ticket | [TicketScreen](../../apps/mobile/src/features/live/EventScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [534:49326 · Đăng ký tham gia hoạt động](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=534-49326) | /registration | [RegistrationScreen](../../apps/mobile/src/features/live/EventRegistration.tsx) | PARTIAL_LAYOUT |
| [534:49166 · Lịch hoạt động môi trường](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=534-49166) | /calendar | [CalendarScreen](../../apps/mobile/src/features/live/EventCalendar.tsx) | PARTIAL_LAYOUT |
| [534:49034 · Khám phá hoạt động](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=534-49034) | /events | [EventsScreen](../../apps/mobile/src/features/live/EventScreens.tsx) | PARTIAL_LAYOUT |
| [386:7054 · hoạt động](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7054) | /events/[id] | [EventDetailScreen](../../apps/mobile/src/features/live/EventDetail.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:9376 · hoạt động](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-9376) | /events/[id] | [EventDetailScreen](../../apps/mobile/src/features/live/EventDetail.tsx) | PARTIAL_LAYOUT |
| [386:9470 · hoạt động 2](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-9470) | /events/[id] | [EventDetailScreen](../../apps/mobile/src/features/live/EventDetail.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:9575 · hoạt động 3](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-9575) | /events/[id] | [EventDetailScreen](../../apps/mobile/src/features/live/EventDetail.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:9681 · hoạt động 5](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-9681) | /events/[id] | [EventDetailScreen](../../apps/mobile/src/features/live/EventDetail.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:10026 · hoạt động 1](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-10026) | /events/[id] | [EventDetailScreen](../../apps/mobile/src/features/live/EventDetail.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:10122 · yêu thích](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-10122) | /saved | [EventsScreen](../../apps/mobile/src/features/live/EventScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:10131 · xóa hoạt động](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-10131) | /saved | [EventsScreen](../../apps/mobile/src/features/live/EventScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:17299 · hoạt động 6](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-17299) | /events/[id] | [EventDetailScreen](../../apps/mobile/src/features/live/EventDetail.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:17397 · hoạt động 4](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-17397) | /events/[id] | [EventDetailScreen](../../apps/mobile/src/features/live/EventDetail.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:18069 · hoạt động yêu thích](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-18069) | /saved | [EventsScreen](../../apps/mobile/src/features/live/EventScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |

## Thu gom / hành trình (13)

Khám phá có bản đồ OSM và tọa độ thật. Bộ lọc, chi tiết, so sánh, hành trình, báo cáo/đề xuất vẫn dùng form/Card chung; directions/navigation/route chung RouteScreen, chưa có điều hướng/ETA theo frame.

| Frame | Route hiện tại | Component / source | Kết quả |
| --- | --- | --- | --- |
| [534:48955 · Đã đến nơi & hướng dẫn bàn giao](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=534-48955) | /collection-arrival | [ArrivalScreen](../../apps/mobile/src/features/live/CollectionScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [534:48869 · Chọn điểm thay thế trên hành trình](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=534-48869) | /collection-replacement | [RouteEditorScreen](../../apps/mobile/src/features/live/CollectionScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [534:48774 · Lập hành trình thu gom nhiều điểm](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=534-48774) | /journey | [JourneyScreen](../../apps/mobile/src/features/live/CollectionScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [534:48690 · Báo cáo vấn đề tại điểm thu gom](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=534-48690) | /point-report | [PointReportScreen](../../apps/mobile/src/features/live/CollectionScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [534:48595 · Đề xuất điểm thu gom mới](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=534-48595) | /point-proposal | [PointProposalScreen](../../apps/mobile/src/features/live/CollectionScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [534:48505 · So sánh điểm thu gom](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=534-48505) | /collection-compare | [CollectionCompareScreen](../../apps/mobile/src/features/live/CollectionScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [534:48401 · Bộ lọc điểm thu gom](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=534-48401) | /collection-filters | [CollectionFiltersScreen](../../apps/mobile/src/features/live/CollectionScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:8569 · map](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-8569) | /collection | [CollectionScreen](../../apps/mobile/src/features/live/CollectionScreens.tsx) | PARTIAL_LAYOUT |
| [386:8633 · map](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-8633) | /collection-explore | [CollectionScreen](../../apps/mobile/src/features/live/CollectionScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:10136 · map](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-10136) | /collection-navigation | [RouteScreen](../../apps/mobile/src/features/live/CollectionScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:10186 · map](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-10186) | /points/[id] | [PointDetailScreen](../../apps/mobile/src/features/live/CollectionScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:10279 · map](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-10279) | /collection-directions | [RouteScreen](../../apps/mobile/src/features/live/CollectionScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:10351 · map](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-10351) | /collection-route | [RouteScreen](../../apps/mobile/src/features/live/CollectionScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |

## Đăng nhập / đăng ký (2)

Còn bố cục AuthForm và asset gốc; Ghi nhớ tôi đã đổi thành trạng thái phiên, social sign-in chưa hỗ trợ. Chưa nghiệm thu đầy đủ trạng thái và native.

| Frame | Route hiện tại | Component / source | Kết quả |
| --- | --- | --- | --- |
| [386:7184 · 11 · Đăng nhập](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7184) | /login | [AuthScreen](../../apps/mobile/src/features/auth/AuthForm.tsx) | PARTIAL_LAYOUT |
| [386:7390 · 12 · Đăng ký tài khoản](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7390) | /register | [AuthScreen](../../apps/mobile/src/features/auth/AuthForm.tsx) | PARTIAL_LAYOUT |

## Khôi phục / bảo mật tài khoản (5)

Đã chỉnh quên mật khẩu, OTP, đặt/đổi mật khẩu. Kết nối Google/Facebook hiện mở danh sách phiên; khác mục đích frame. OTP/error/loading và keyboard cần nghiệm thu từng trạng thái.

| Frame | Route hiện tại | Component / source | Kết quả |
| --- | --- | --- | --- |
| [386:7225 · 13 · Quên mật khẩu](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7225) | /forgot-password | [ForgotPasswordScreen](../../apps/mobile/src/features/live/AuthScreens.tsx) | PARTIAL_LAYOUT |
| [386:7266 · 14 · Xác thực OTP](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7266) | /verify-email | [VerifyEmailScreen](../../apps/mobile/src/features/live/AuthScreens.tsx) | PARTIAL_LAYOUT |
| [386:7307 · 15 · Đặt mật khẩu mới](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7307) | /reset-password | [ResetPasswordScreen](../../apps/mobile/src/features/live/AuthScreens.tsx) | PARTIAL_LAYOUT |
| [386:7348 · 16 · Kết nối Google / Facebook](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7348) | /connected-account | [SessionsScreen](../../apps/mobile/src/features/live/SettingsScreen.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [521:4735 · 21 · Thay đổi mật khẩu](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=521-4735) | /change-password | [ChangePasswordScreen](../../apps/mobile/src/features/live/AuthScreens.tsx) | PARTIAL_LAYOUT |

## Cá nhân / cài đặt / thành tích (8)

Đã chỉnh tổng quan cá nhân, hồ sơ, cài đặt và các overlay. PIN chưa hỗ trợ, thành tích chỉ có trạng thái chưa cấp huy hiệu. Dữ liệu/API và một số trường hồ sơ khác mẫu.

| Frame | Route hiện tại | Component / source | Kết quả |
| --- | --- | --- | --- |
| [386:7420 · 18 · Profile — Cá nhân](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7420) | /profile | [ProfileOverview](../../apps/mobile/src/features/live/ProfileOverview.tsx) | PARTIAL_LAYOUT |
| [386:7550 · Thành tích](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7550) | /achievements | [AchievementsScreen](../../apps/mobile/src/features/live/ProfileScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:8451 · 23 Cài đặt](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-8451) | /settings | [SettingsScreen](../../apps/mobile/src/features/live/SettingsScreen.tsx) | PARTIAL_LAYOUT |
| [386:8516 · 24 Chỉnh sửa](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-8516) | /edit-profile | [EditProfileScreen](../../apps/mobile/src/features/live/EditProfileScreen.tsx) | PARTIAL_LAYOUT |
| [514:5093 · 19 Cài đặt · Overlay · Tìm kiếm](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=514-5093) | /settings | [SettingsScreen](../../apps/mobile/src/features/live/SettingsScreen.tsx) | PARTIAL_LAYOUT |
| [514:5096 · 20 Cài đặt · Overlay · Âm thanh và rung](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=514-5096) | /settings | [SettingsScreen](../../apps/mobile/src/features/live/SettingsScreen.tsx) | PARTIAL_LAYOUT |
| [514:5099 · 21 Cài đặt · Overlay · Lịch sử đăng nhập](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=514-5099) | /settings | [SettingsScreen](../../apps/mobile/src/features/live/SettingsScreen.tsx) | PARTIAL_LAYOUT |
| [514:5102 · 22 Cài đặt · Overlay · Thiết lập PIN](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=514-5102) | /settings | [SettingsScreen](../../apps/mobile/src/features/live/SettingsScreen.tsx) | PARTIAL_LAYOUT |

## Cộng đồng / soạn bài (30)

Feed dùng MenuItem; không đọc frame để dựng member, filter và overlay. Composer có chữ/quyền public-private nhưng thiếu bố cục ảnh, vị trí, cảm xúc, xem trước và camera theo các frame.

| Frame | Route hiện tại | Component / source | Kết quả |
| --- | --- | --- | --- |
| [386:7647 · 38. Cộng đồng](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7647) | /community | [CommunityScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:7813 · 38. Cộng đồng](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7813) | /community | [CommunityScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:15047 · 54. Đăng bài viết](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-15047) | /compose | [ComposerScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:15090 · 59. Đăng bài viết](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-15090) | /compose | [ComposerScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:15150 · 60. Đăng bài viết](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-15150) | /compose | [ComposerScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:15209 · 62. Đăng bài viết](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-15209) | /compose | [ComposerScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:15270 · 55. Đăng bài viết](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-15270) | /compose | [ComposerScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:15419 · 57. Đăng bài viết](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-15419) | /compose | [ComposerScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:15552 · 56. Đăng bài viết](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-15552) | /compose | [ComposerScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:15972 · 58. Đăng bài viết](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-15972) | /compose | [ComposerScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:16071 · 58. Đăng bài viết](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-16071) | /compose | [ComposerScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:16188 · 61. Đăng bài / Đang tải lên](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-16188) | /compose | [ComposerScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [722:5570 · 40. Cộng đồng / Khám phá](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=722-5570) | /community | [CommunityScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [722:5635 · 40. Cộng đồng / Chi tiết bài đăng](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=722-5635) | /community | [CommunityScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [722:5699 · 41. Cộng đồng / Trang thành viên](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=722-5699) | /community | [CommunityScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [722:5749 · 42. Cộng đồng / Bài đã lưu](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=722-5749) | /community | [CommunityScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [723:5646 · 43. Cộng đồng / Viết bình luận](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=723-5646) | /community | [CommunityScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [723:5722 · 44. Cộng đồng / Đã gửi bình luận](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=723-5722) | /community | [CommunityScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [723:5809 · 45. Cộng đồng / Tùy chọn bài đăng](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=723-5809) | /community | [CommunityScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [723:5892 · 46. Cộng đồng / Đang theo dõi thành viên](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=723-5892) | /community | [CommunityScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [733:5722 · 47. Cộng đồng / Lọc thành viên](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=733-5722) | /community | [CommunityScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [733:5787 · 47. Cộng đồng / Lọc chủ đề](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=733-5787) | /community | [CommunityScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [734:5760 · 45. Cộng đồng / Bài đăng đã thích](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=734-5760) | /community | [CommunityScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [741:5779 · 63. Đăng bài / Bản nháp có ảnh](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=741-5779) | /compose | [ComposerScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [741:5846 · 64. Đăng bài / Đã gắn vị trí](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=741-5846) | /compose | [ComposerScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [741:5913 · 64. Đăng bài / Đã thêm cảm xúc](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=741-5913) | /compose | [ComposerScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [741:5980 · 64. Đăng bài / Người xem: Bạn bè](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=741-5980) | /compose | [ComposerScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [741:6047 · 64. Đăng bài / Người xem: Chỉ mình tôi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=741-6047) | /compose | [ComposerScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [741:6114 · 65. Đăng bài / Xem trước bài viết](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=741-6114) | /compose | [ComposerScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [743:6023 · 66. Đăng bài / Chụp ảnh](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=743-6023) | /compose | [ComposerScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |

## Thông báo (14)

Một danh sách Card và thao tác đánh dấu đã đọc; không có selector frame, bộ lọc và màn cài đặt theo nhóm như thiết kế.

| Frame | Route hiện tại | Component / source | Kết quả |
| --- | --- | --- | --- |
| [386:7913 · 48. Thông báo](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7913) | /notifications | [NotificationsScreen](../../apps/mobile/src/features/live/ProfileScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:8003 · 39. Thống báo cộng đồng](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-8003) | /notifications | [NotificationsScreen](../../apps/mobile/src/features/live/ProfileScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:8228 · 48. Thông báo](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-8228) | /notifications | [NotificationsScreen](../../apps/mobile/src/features/live/ProfileScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:8311 · 48.Thông báo](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-8311) | /notifications | [NotificationsScreen](../../apps/mobile/src/features/live/ProfileScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:8380 · 48. Thông báo](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-8380) | /notifications | [NotificationsScreen](../../apps/mobile/src/features/live/ProfileScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [703:5399 · 49. Thông báo / Bộ lọc](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=703-5399) | /notifications | [NotificationsScreen](../../apps/mobile/src/features/live/ProfileScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [703:5468 · 50. Thông báo / Chi tiết phân loại](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=703-5468) | /notifications | [NotificationsScreen](../../apps/mobile/src/features/live/ProfileScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [703:5524 · 51. Thông báo / Cài đặt](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=703-5524) | /notifications | [NotificationsScreen](../../apps/mobile/src/features/live/ProfileScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [703:5589 · 52. Thông báo / Đã xem hết](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=703-5589) | /notifications | [NotificationsScreen](../../apps/mobile/src/features/live/ProfileScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [712:5475 · 53. Thông báo / Hoạt động](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=712-5475) | /notifications | [NotificationsScreen](../../apps/mobile/src/features/live/ProfileScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [712:5578 · 51. Thông báo / Cài đặt · Hoạt động đã đổi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=712-5578) | /notifications | [NotificationsScreen](../../apps/mobile/src/features/live/ProfileScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [712:5667 · 51. Thông báo / Cài đặt · Ưu đãi đã đổi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=712-5667) | /notifications | [NotificationsScreen](../../apps/mobile/src/features/live/ProfileScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [712:5756 · 51.  Thông báo / Cài đặt · Cộng đồng đã đổi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=712-5756) | /notifications | [NotificationsScreen](../../apps/mobile/src/features/live/ProfileScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [712:5845 · 51. Thông báo / Cài đặt · Tin tức đã đổi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=712-5845) | /notifications | [NotificationsScreen](../../apps/mobile/src/features/live/ProfileScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |

## Tin nhắn (16)

Danh sách và hội thoại chữ có API thật; không có các panel emoji, ảnh, tệp và ghi âm tương ứng 16 frame.

| Frame | Route hiện tại | Component / source | Kết quả |
| --- | --- | --- | --- |
| [386:8086 · 68. Chat](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-8086) | /messages | [MessagesScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:8151 · 69. Chat](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-8151) | /messages | [MessagesScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:8179 · 70. Chat](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-8179) | /messages | [MessagesScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:17262 · 67. iPhone 14 Plus - 2](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-17262) | /messages | [MessagesScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [771:6023 · 71. Chat / Chọn emoji](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=771-6023) | /messages | [MessagesScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [771:6077 · 71. Chat / Đã gửi emoji](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=771-6077) | /messages | [MessagesScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [771:6108 · 72. Chat / Đính kèm](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=771-6108) | /messages | [MessagesScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [771:6144 · 73. Chat / Xem trước ảnh](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=771-6144) | /messages | [MessagesScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [771:6180 · 74. Chat / Đã gửi ảnh](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=771-6180) | /messages | [MessagesScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [771:6480 · 71. Chat / Đã gửi tệp](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=771-6480) | /messages | [MessagesScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [771:6514 · 71. Chat / Đang ghi âm](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=771-6514) | /messages | [MessagesScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [771:6565 · 71. Chat / Đã gửi ghi âm](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=771-6565) | /messages | [MessagesScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [772:6456 · 71. Chat / Đang soạn tin](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=772-6456) | /messages | [MessagesScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [772:6544 · 71. Chat / Đã gửi tin](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=772-6544) | /messages | [MessagesScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [773:6563 · 75. Chat / Chọn ảnh](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=773-6563) | /messages | [MessagesScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [773:6609 · 76. Chat / Chọn tệp](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=773-6609) | /messages | [MessagesScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |

## Khung phụ (3)

Ba frame phụ vẫn không có route /design-preview. Chúng là khung phụ trong Figma, không tự suy ra phải đưa công cụ preview vào sản phẩm.

| Frame | Route hiện tại | Component / source | Kết quả |
| --- | --- | --- | --- |
| [386:8558 · navigation](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-8558) | — | — | NO_RUNTIME_ROUTE |
| [386:17297 · Frame 36707](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-17297) | — | — | NO_RUNTIME_ROUTE |
| [386:18473 · iPhone 14 Plus - 157](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-18473) | — | — | NO_RUNTIME_ROUTE |

## Trợ lý (11)

Form câu hỏi sau xác thực, chưa có giao diện chat/giọng nói của 11 frame. Dịch vụ AI chưa mở.

| Frame | Route hiện tại | Component / source | Kết quả |
| --- | --- | --- | --- |
| [386:8930 · Chat](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-8930) | /assistant | [AssistantScreen](../../apps/mobile/src/features/live/ServiceScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:8977 · chat2](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-8977) | /assistant | [AssistantScreen](../../apps/mobile/src/features/live/ServiceScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:9071 · Frame 36844](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-9071) | /assistant | [AssistantScreen](../../apps/mobile/src/features/live/ServiceScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:9115 · Frame 36836](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-9115) | /assistant | [AssistantScreen](../../apps/mobile/src/features/live/ServiceScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:9152 · Frame 36843](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-9152) | /assistant | [AssistantScreen](../../apps/mobile/src/features/live/ServiceScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:9191 · Frame 36838](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-9191) | /assistant | [AssistantScreen](../../apps/mobile/src/features/live/ServiceScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:9228 · Frame 36837](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-9228) | /assistant | [AssistantScreen](../../apps/mobile/src/features/live/ServiceScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:9265 · Frame 36840](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-9265) | /assistant | [AssistantScreen](../../apps/mobile/src/features/live/ServiceScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:9302 · Frame 36841](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-9302) | /assistant | [AssistantScreen](../../apps/mobile/src/features/live/ServiceScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:9339 · Frame 36842](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-9339) | /assistant | [AssistantScreen](../../apps/mobile/src/features/live/ServiceScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:17222 · Frame 36839](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-17222) | /assistant | [AssistantScreen](../../apps/mobile/src/features/live/ServiceScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |

## Tin tức (22)

Đã chỉnh landing/hero/grid và có các tab dữ liệu. Chi tiết render text block; briefs, reading-list, tìm kiếm/chủ đề và sự kiện chưa có đủ các bố cục riêng/modal theo 22 frame.

| Frame | Route hiện tại | Component / source | Kết quả |
| --- | --- | --- | --- |
| [386:9787 · 27. tin tức mới nhất ](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-9787) | /articles | [NewsScreen](../../apps/mobile/src/features/live/NewsScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:9901 · 28. sự kiện sắp tới](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-9901) | /articles | [NewsScreen](../../apps/mobile/src/features/live/NewsScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:10644 · 29. tin tức chi tiết 2](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-10644) | /articles/[id] | [ArticleScreen](../../apps/mobile/src/features/live/NewsScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:10737 · 29. tin tức chi tiết 4](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-10737) | /articles/[id] | [ArticleScreen](../../apps/mobile/src/features/live/NewsScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:10828 · 29. tin tức chi tiết 6](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-10828) | /articles/[id] | [ArticleScreen](../../apps/mobile/src/features/live/NewsScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:10919 · 29. tin tức chi tiết 8](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-10919) | /articles/[id] | [ArticleScreen](../../apps/mobile/src/features/live/NewsScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:17608 · 29. tin tức chi tiết](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-17608) | /articles/[id] | [ArticleScreen](../../apps/mobile/src/features/live/NewsScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:17701 · 29. tin tức chi tiết](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-17701) | /articles/[id] | [ArticleScreen](../../apps/mobile/src/features/live/NewsScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:17794 · 29. tin tức chi tiết 3](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-17794) | /articles/[id] | [ArticleScreen](../../apps/mobile/src/features/live/NewsScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:17887 · 29. tin tức chi tiết 5](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-17887) | /articles/[id] | [ArticleScreen](../../apps/mobile/src/features/live/NewsScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:17978 · 29. tin tức chi tiết 7](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-17978) | /articles/[id] | [ArticleScreen](../../apps/mobile/src/features/live/NewsScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [391:24796 · 26. tin tức](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=391-24796) | /articles | [NewsScreen](../../apps/mobile/src/features/live/NewsScreens.tsx) | PARTIAL_LAYOUT |
| [609:5165 · 30. Tin tức · Tìm kiếm và lọc](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=609-5165) | /articles | [NewsScreen](../../apps/mobile/src/features/live/NewsScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [609:5266 · 31. Tin tức · Bài viết đã lưu](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=609-5266) | /articles/saved | [NewsScreen](../../apps/mobile/src/features/live/NewsScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [609:5361 · 32. Tin tức · Thảo luận bài viết](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=609-5361) | /articles/discussion | [DiscussionScreen](../../apps/mobile/src/features/live/SocialScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [612:5286 · 33. Tin tức · Khám phá chủ đề](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=612-5286) | /articles/topics | [TopicsScreen](../../apps/mobile/src/features/live/NewsScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [612:5362 · 34. Tin tức · Lịch sự kiện xanh](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=612-5362) | /articles/calendar | [EventsScreen](../../apps/mobile/src/features/live/EventScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [612:5441 · 34. Tin tức · Bản tin nhanh](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=612-5441) | /articles/briefs | [NewsScreen](../../apps/mobile/src/features/live/NewsScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [680:5343 · 35. Tin tức / Tìm kiếm và kết quả](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=680-5343) | /articles/search | [NewsScreen](../../apps/mobile/src/features/live/NewsScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [680:5406 · 36. Tin tức / Danh sách đọc](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=680-5406) | /articles/reading-list | [NewsScreen](../../apps/mobile/src/features/live/NewsScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [680:5461 · 37. Tin tức / Chi tiết sự kiện xanh](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=680-5461) | /articles/events/[id] | [EventDetailScreen](../../apps/mobile/src/features/live/EventDetail.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [695:5419 · 37. Tin tức / Xác nhận quan tâm sự kiện](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=695-5419) | /articles/events/[id] | [EventDetailScreen](../../apps/mobile/src/features/live/EventDetail.tsx) | NEEDS_WORK_OR_VERIFICATION |

## Điểm / đổi quà (17)

Đã chỉnh hành trình, catalog, lịch sử và hướng dẫn. Các modal/biến thể nhận điểm, lời nhắc, xác nhận và thành công chưa đủ; chương trình cấp/đổi điểm chưa mở.

| Frame | Route hiện tại | Component / source | Kết quả |
| --- | --- | --- | --- |
| [386:11010 · Tích điểm và phần thưởng](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-11010) | /rewards | [RewardsScreen](../../apps/mobile/src/features/live/RewardScreens.tsx) | PARTIAL_LAYOUT |
| [386:11320 · Cách quy đổi điểm](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-11320) | /rewards/guide | [RewardsGuideScreen](../../apps/mobile/src/features/live/RewardGuide.tsx) | PARTIAL_LAYOUT |
| [386:11451 · Phần thưởng](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-11451) | /rewards/catalog | [RewardsScreen](../../apps/mobile/src/features/live/RewardScreens.tsx) | PARTIAL_LAYOUT |
| [386:11652 · Sau khi nhận điểm mỗi ngày](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-11652) | /rewards/catalog | [RewardsScreen](../../apps/mobile/src/features/live/RewardScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:11858 · Nhắc tôi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-11858) | /rewards/catalog | [RewardsScreen](../../apps/mobile/src/features/live/RewardScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:12064 · Thông báo nhắc](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-12064) | /rewards/catalog | [RewardsScreen](../../apps/mobile/src/features/live/RewardScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:12071 · Lịch sử](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-12071) | /history | [HistoryScreen](../../apps/mobile/src/features/live/RewardHistory.tsx) | PARTIAL_LAYOUT |
| [386:12194 · Lịch sử](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-12194) | /history | [HistoryScreen](../../apps/mobile/src/features/live/RewardHistory.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:12284 · Lịch sử](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-12284) | /history | [HistoryScreen](../../apps/mobile/src/features/live/RewardHistory.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:12362 · Sau khi xác nhận đổi quà](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-12362) | /rewards/catalog | [RewardsScreen](../../apps/mobile/src/features/live/RewardScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:12517 · xác nhận đổi quà](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-12517) | /rewards/catalog | [RewardsScreen](../../apps/mobile/src/features/live/RewardScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:12671 · Nhận thưởng ngày](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-12671) | /rewards/catalog | [RewardsScreen](../../apps/mobile/src/features/live/RewardScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:12823 · Phần thưởng giải trí](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-12823) | /rewards/catalog | [RewardsScreen](../../apps/mobile/src/features/live/RewardScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:12956 · Phần thưởng khác](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-12956) | /rewards/catalog | [RewardsScreen](../../apps/mobile/src/features/live/RewardScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:13109 · Phần thưởng voucher](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-13109) | /rewards/catalog | [RewardsScreen](../../apps/mobile/src/features/live/RewardScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:16253 · Tích điểm và phần thưởng](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-16253) | /rewards | [RewardsScreen](../../apps/mobile/src/features/live/RewardScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:16592 · Tích điểm và phần thưởng](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-16592) | /rewards | [RewardsScreen](../../apps/mobile/src/features/live/RewardScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |

## Sổ tay rác (20)

Đã chỉnh landing/header/grid, đọc kind và category thật. Các biến thể mở rộng và chi tiết từng vật phẩm vẫn dùng template chung, chưa nghiệm thu đầy đủ 20 frame.

| Frame | Route hiện tại | Component / source | Kết quả |
| --- | --- | --- | --- |
| [386:13263 · SoTayRac](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-13263) | /handbook | [HandbookScreen](../../apps/mobile/src/features/live/HandbookScreens.tsx) | PARTIAL_LAYOUT |
| [386:13313 · SoTayRac1](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-13313) | /handbook | [HandbookScreen](../../apps/mobile/src/features/live/HandbookScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:13364 · AllSoTayRac](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-13364) | /handbook/list | [HandbookScreen](../../apps/mobile/src/features/live/HandbookScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:13593 · RacVoCo](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-13593) | /handbook/category/[category] | [HandbookScreen](../../apps/mobile/src/features/live/HandbookScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:13685 · RacVoCo1](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-13685) | /handbook/category/[category] | [HandbookScreen](../../apps/mobile/src/features/live/HandbookScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:13782 · RacHuuCo](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-13782) | /handbook/category/[category] | [HandbookScreen](../../apps/mobile/src/features/live/HandbookScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:13838 · RacHuuCo1](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-13838) | /handbook/category/[category] | [HandbookScreen](../../apps/mobile/src/features/live/HandbookScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:13929 · RacTaiChe](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-13929) | /handbook/category/[category] | [HandbookScreen](../../apps/mobile/src/features/live/HandbookScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:14037 · RacTaiChe1](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14037) | /handbook/category/[category] | [HandbookScreen](../../apps/mobile/src/features/live/HandbookScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:14521 · Sổ tay_Nhựa](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14521) | /handbook/[id] | [WasteDetailScreen](../../apps/mobile/src/features/live/HandbookScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:14595 · Sổ tay_Hộp carton](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14595) | /handbook/[id] | [WasteDetailScreen](../../apps/mobile/src/features/live/HandbookScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:14670 · Sổ tay_Áo quần](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14670) | /handbook/[id] | [WasteDetailScreen](../../apps/mobile/src/features/live/HandbookScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:14745 · Sổ tay_Pin](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14745) | /handbook/[id] | [WasteDetailScreen](../../apps/mobile/src/features/live/HandbookScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:14820 · Sổ tay_Rác hữu cơ](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14820) | /handbook/[id] | [WasteDetailScreen](../../apps/mobile/src/features/live/HandbookScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:14895 · Sổ tay_Thủy tinh](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14895) | /handbook/[id] | [WasteDetailScreen](../../apps/mobile/src/features/live/HandbookScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:14970 · Sổ tay_Giấy](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14970) | /handbook/[id] | [WasteDetailScreen](../../apps/mobile/src/features/live/HandbookScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:16931 · Phân loại rác - nhựa](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-16931) | /handbook/types/[kind] | [HandbookScreen](../../apps/mobile/src/features/live/HandbookScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:17005 · Phân loại rác - dụng cụ y tế](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-17005) | /handbook/types/[kind] | [HandbookScreen](../../apps/mobile/src/features/live/HandbookScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:17077 · Phân loại rác - nilong](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-17077) | /handbook/types/[kind] | [HandbookScreen](../../apps/mobile/src/features/live/HandbookScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:17145 · Phân loại rác - pin](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-17145) | /handbook/types/[kind] | [HandbookScreen](../../apps/mobile/src/features/live/HandbookScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |

## Quét / kết quả phân loại (10)

Có camera/chọn ảnh thật và tra cứu thủ công; không có đủ scene scan/loading/kết quả/điểm theo 10 frame. Nhận diện ảnh chưa mở.

| Frame | Route hiện tại | Component / source | Kết quả |
| --- | --- | --- | --- |
| [386:14194 · Scan](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14194) | /scan | [ScanScreen](../../apps/mobile/src/features/live/ScanScreen.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:14221 · Scan1](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14221) | /scan | [ScanScreen](../../apps/mobile/src/features/live/ScanScreen.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:14241 · Loading](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14241) | /scan | [ScanScreen](../../apps/mobile/src/features/live/ScanScreen.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:14264 · Kqua_Scan2](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14264) | /scan | [ScanScreen](../../apps/mobile/src/features/live/ScanScreen.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:14309 · Kqu_Scan2](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14309) | /scan | [ScanScreen](../../apps/mobile/src/features/live/ScanScreen.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:14346 · Ttin rác](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14346) | /scan | [ScanScreen](../../apps/mobile/src/features/live/ScanScreen.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:14379 · TBáo_tích điểm](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14379) | /scan | [ScanScreen](../../apps/mobile/src/features/live/ScanScreen.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:14454 · Sổ tay rác_Scan](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-14454) | /scan | [ScanScreen](../../apps/mobile/src/features/live/ScanScreen.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:16189 · Kqu_Scan1](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-16189) | /scan | [ScanScreen](../../apps/mobile/src/features/live/ScanScreen.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:16218 · Kqu_Scan1](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-16218) | /scan | [ScanScreen](../../apps/mobile/src/features/live/ScanScreen.tsx) | NEEDS_WORK_OR_VERIFICATION |

## Trò chơi (10)

GamesScreen chỉ truy vấn dịch vụ và thông báo chưa có trò chơi; thiếu danh sách, phòng chờ, gameplay và kết quả trong 10 frame.

| Frame | Route hiện tại | Component / source | Kết quả |
| --- | --- | --- | --- |
| [386:18241 · Trò chơi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-18241) | /game | [GamesScreen](../../apps/mobile/src/features/live/ServiceScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:18285 · Trò chơi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-18285) | /game | [GamesScreen](../../apps/mobile/src/features/live/ServiceScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:18308 · Trò chơi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-18308) | /game | [GamesScreen](../../apps/mobile/src/features/live/ServiceScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:18336 · Trò chơi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-18336) | /game | [GamesScreen](../../apps/mobile/src/features/live/ServiceScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:18364 · Trò chơi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-18364) | /game | [GamesScreen](../../apps/mobile/src/features/live/ServiceScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [427:19392 · Trò chơi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=427-19392) | /game | [GamesScreen](../../apps/mobile/src/features/live/ServiceScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:18396 · Trò chơi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-18396) | /game | [GamesScreen](../../apps/mobile/src/features/live/ServiceScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [427:19460 · Trò chơi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=427-19460) | /game | [GamesScreen](../../apps/mobile/src/features/live/ServiceScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [386:18428 · Trò chơi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-18428) | /game | [GamesScreen](../../apps/mobile/src/features/live/ServiceScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |
| [487:19805 · Trò chơi](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=487-19805) | /game | [GamesScreen](../../apps/mobile/src/features/live/ServiceScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |

## Thống kê (1)

Chỉ có ba Card số liệu, chưa có đồ thị/lưới và bố cục dài của frame.

| Frame | Route hiện tại | Component / source | Kết quả |
| --- | --- | --- | --- |
| [391:25009 · thống kê](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=391-25009) | /statistics | [StatisticsScreen](../../apps/mobile/src/features/live/ProfileScreens.tsx) | NEEDS_WORK_OR_VERIFICATION |

## Trang chủ (1)

Đã phục hồi bố cục hero, lối tắt, ví và phần nội dung. Dữ liệu/ảnh động lấy từ API; cần nghiệm thu geometry, font và các trạng thái.

| Frame | Route hiện tại | Component / source | Kết quả |
| --- | --- | --- | --- |
| [391:25197 · 17 · Home — Trang chủ](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=391-25197) | / | [HomeScreen](../../apps/mobile/src/features/live/HomeScreen.tsx) | PARTIAL_LAYOUT |

## Onboarding (10)

Đã có 10 bước và minh họa riêng, đọc step. Chủ đề theo enum API, không giả cấp quyền vị trí hoặc nhắc lịch; chưa nghiệm thu đầy đủ từng bước trên native.

| Frame | Route hiện tại | Component / source | Kết quả |
| --- | --- | --- | --- |
| [386:7148 · 01 · Khởi động GreenSteps](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7148) | /onboarding | [OnboardingScreen](../../apps/mobile/src/features/live/OnboardingScreen.tsx) | PARTIAL_LAYOUT |
| [386:7418 · 02 · Chào mừng](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7418) | /onboarding | [OnboardingScreen](../../apps/mobile/src/features/live/OnboardingScreen.tsx) | PARTIAL_LAYOUT |
| [386:7154 · 03 · REDUCE — Giảm rác](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7154) | /onboarding | [OnboardingScreen](../../apps/mobile/src/features/live/OnboardingScreen.tsx) | PARTIAL_LAYOUT |
| [386:7158 · 04 · REUSE — Tái sử dụng](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7158) | /onboarding | [OnboardingScreen](../../apps/mobile/src/features/live/OnboardingScreen.tsx) | PARTIAL_LAYOUT |
| [386:7149 · 05 · RECYCLE — Phân loại đúng](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7149) | /onboarding | [OnboardingScreen](../../apps/mobile/src/features/live/OnboardingScreen.tsx) | PARTIAL_LAYOUT |
| [386:7151 · 06 · Chọn điều bạn quan tâm](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7151) | /onboarding | [OnboardingScreen](../../apps/mobile/src/features/live/OnboardingScreen.tsx) | PARTIAL_LAYOUT |
| [386:7156 · 07 · Mục tiêu khởi đầu](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7156) | /onboarding | [OnboardingScreen](../../apps/mobile/src/features/live/OnboardingScreen.tsx) | PARTIAL_LAYOUT |
| [386:7160 · 08 · Điểm thu gom gần bạn](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7160) | /onboarding | [OnboardingScreen](../../apps/mobile/src/features/live/OnboardingScreen.tsx) | PARTIAL_LAYOUT |
| [386:7168 · 09 · Lời nhắc sống xanh](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7168) | /onboarding | [OnboardingScreen](../../apps/mobile/src/features/live/OnboardingScreen.tsx) | PARTIAL_LAYOUT |
| [386:7176 · 10 · Sẵn sàng bắt đầu](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7176) | /onboarding | [OnboardingScreen](../../apps/mobile/src/features/live/OnboardingScreen.tsx) | PARTIAL_LAYOUT |
