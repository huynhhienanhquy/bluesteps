# Phân tích component và kiến trúc app

## Bằng chứng thiết kế

Trang chính dùng 752 instance của 131 main component. Nhiều phần nghiệp vụ vẫn là frame/nhóm chữ, vì vậy không thể dùng riêng số instance để ước tính mức tái sử dụng. [Danh mục đầy đủ](02a-figma-component-inventory.md).

Hai component set đã đọc định nghĩa trực tiếp:

| Set thực tế | Props/variants đã có | Kích thước mẫu | Phần cần bổ sung trong code |
|---|---|---|---|
| `GreenSteps / Button`, `439:4841` | `Label`; `Style=Primary/Secondary/Ghost` | 380 × 56, auto-layout ngang | pending, disabled, icon, destructive, accessibility label, chống bấm lặp |
| `GreenSteps / Auth Field`, `460:4840` | `Label`, `Value`; `State=Default/Focus/Error` | 380 × 84, auto-layout dọc, gap 8 | password visibility, helper/error message, keyboard, autofill, readOnly/disabled |

Instance trên trang: Primary 24, Secondary 3, Ghost 9; Auth Field Default 11, Focus 2. Biến thể Error tồn tại trong set dù không có instance được phân giải tới biến thể đó trên trang chính. Status bar 129 instance, chevron_backward 100, nhóm `Group 36934` có hai nguồn component mỗi nguồn 20 instance; cần kiểm tra chức năng trước khi hợp nhất vì tên giống không chứng minh component giống.

Chỉ thống kê typography/fill/layout của node trên trang backuped: 25 tổ hợp font family/style, gồm cả font trong asset/keyboard; Inter và Montserrat là hai nhóm chính. Tách typography hệ thống khỏi nội dung nhúng. Công tắc giao diện sáng/tối trên trang không đủ chứng minh dark theme đã hoàn chỉnh; cần thiết kế và kiểm tra riêng. Không dùng inventory variable/text style của toàn file làm bằng chứng cho riêng trang này.

Màu thường gặp ngoài đen/trắng: `#147CC1`, `#075A9C`, `#164561`, `#DADADA`; mẫu mới còn `#172B3D`, `#EDF7FC`, `#677C8C`. Đây là tần suất fill, không phải token semantic đã được chuẩn hóa. Có 1.783 frame layout NONE, 558 VERTICAL, 525 HORIZONTAL; các số này gồm container nội bộ và asset, không chỉ màn hình. Có chữ cỡ 6–10 trong mẫu/asset: phải xác định chữ sản phẩm cần đọc trước khi chọn type scale.

## Thư viện component đề xuất

Props dưới đây là contract code đề xuất. Dữ liệu nghiệp vụ lấy từ API; component nhận props và phát event, không tự gọi endpoint ở mỗi item.

| Component | Thành phần/props chính | State/interaction | Data và điểm cần kiểm tra |
|---|---|---|---|
| AppScreen | safeArea, background, scroll, footer, keyboardAvoiding | loading/content/error/offline | Footer không che nội dung; không vẽ status bar/keyboard mẫu Figma trong app thật |
| AppHeader | title, back, avatar, actions, badgeCount | back, notification, search | Nhãn accessibility; back/close rõ nghĩa; nội dung dài không đè action |
| MainTabBar | activeRoute, items, scanAction | 5 tab Home/Thu gom/Quét/Đổi quà/Cá nhân theo Home mới | Deep link không nhân đôi stack; nút scan nổi có vùng chạm đủ lớn |
| Button/IconButton | label, variant, icon, pending, disabled | pressed/focus/pending/error | Chặn double-submit ở command; icon trang trí không đọc lặp |
| TextField/PasswordField | label, value, error, helper, keyboardType, required | empty/focus/filled/error/disabled | Lỗi cạnh field và focus tới lỗi đầu; không dùng placeholder thay label |
| OTPInput | length=6, value, expiresAt, resendAt | paste/autofill/resend/expired/locked | Countdown theo server; không thể brute-force qua gửi lại |
| Checkbox/Radio/Chip | selected, label, description | chọn một/chọn nhiều, disabled | Phân biệt multi-select chủ đề/vật liệu với single-select mục tiêu |
| Toggle/ThemeSelector | value, onChange, saving | optimistic có rollback | Theme dùng enum system/light/dark; không có hai switch độc lập cùng bật |
| SearchBar/FilterSheet | query, filters, appliedCount, resultCount | debounce, apply/reset, empty | Draft filter tách applied filter; giữ lựa chọn khi mở lại |
| BottomSheet/Dialog | title, children, primaryAction, cancel | dismiss, submit, validation | Focus trap/restore; xác nhận destructive rõ ràng; back hoạt động đúng |
| Toast/InlineNotice | status, message, action | dismiss, retry, auto-timeout | Lỗi giao dịch không chỉ là toast biến mất; có màn trạng thái bền vững |
| Avatar/UserSummary | avatar, displayName, level, lastActive | online/offline, blocked | Chỉ hiện presence trong phạm vi quyền; không dùng email làm public name |
| OnboardingSlide | step, title, body, illustration, skip | next/back/skip, tutorial answer | Bảo toàn nháp sở thích/mục tiêu; quiz giới thiệu không phát điểm giao dịch |
| ConsentBlock | version, purpose, accepted | checked/error | Điều khoản, liên hệ sự kiện, marketing là mục đích khác nhau |
| HomeHero/QuickActionGrid | banner, action, cards | scan/navigate | Nội dung cấu hình; Home endpoint tổng hợp có lỗi từng phần |
| WasteCategoryCard/WasteItemCard | id, name, category, image, hazardous | list/search/detail | Category và material không đồng nghĩa; có nhãn nguy hại riêng |
| WasteInstruction | material, locality, steps, dos/donts, source, revision | expand, find point | Không hard-code màu thùng; hiển thị địa phương và ngày cập nhật |
| CameraScanner | permission, torch, cameraFacing, image, uploadProgress | denied/capture/review/upload/processing | Native camera/gallery; có nhánh nhập tay; chụp lại hủy job cũ ở UI |
| ScanResultCard | candidates, confidenceBand, status, instruction | recognized/uncertain/unrecognized/error | Cho xác nhận/đính chính; không gắn nhãn chắc chắn từ confidence tùy ý |
| ClassificationConfirmation | category, evidenceStatus, eligibleAward | confirm/pending/rejected | Server trả điểm; actionId gắn ledger; không cộng điểm khi chỉ mở popup |
| CollectionMap | camera, bounds, pins, selectedId, locationAccuracy | no-location/manual-area/search/select | Không tái tạo bản đồ bằng ảnh nền; debounce viewport và cluster pins |
| CollectionPointCard | address, materials, distanceM, ETA, opening, capacity, updatedAt | select/compare/route/report | Còn chỗ có thể cũ; distance đường chim bay tách route distance/ETA |
| MaterialFilter/CompareTable | selectedMaterials, matchMode, points | all/any, radius/open/capacity | So sánh cùng thời điểm/travel mode; unit chuẩn; giới hạn số điểm là config |
| PointProposalForm/ReportForm | fields, pin, mediaIds, issueTypes, draft | draft/uploading/submitting/pending-review | Tối đa 5 ảnh được ghi ở mẫu đề xuất; chưa có max kích thước file, cần chốt |
| RouteStopCard/RouteSummary | stopId, order, point, materialIds, distance, duration | reorder/remove/replace/start | Reorder phải accessible bằng nút lên/xuống ngoài drag; version kiểm tra stale |
| HandoverChecklist | steps, contact, selfReport, nextStop | arrived/self-reported/verified | Nút tự báo không phải bằng chứng cân rác hoặc xác minh quản lý |
| EventCard/EventDetail | id, title, venue, occurrence, roles, capacity, saved | interested/saved/registered/full/cancelled | Tách độ tuổi đối tượng nội dung (trẻ 3–5) với tình nguyện viên đăng ký (18+) |
| EventCalendar | month/week, timezone, dayEvents, selectedDay | navigate/filter/conflict | Trùng giờ là so sánh thời gian, có link xem hai hoạt động, không tự hủy lịch |
| RegistrationForm | name, participantCount, role, phone, email, consents | invalid/submitting/confirmed/full | Đếm chỗ bằng participantCount; cần định nghĩa thông tin người đi cùng |
| TicketCard/CheckInQR | ticketId, token, schedule, meetingPoint, status | valid/used/cancelled/expired | QR thực tế là token opaque; không nhét PII; server xác thực quyền check-in |
| EventFeedback/ImpactSummary | rating, tags, comment, participantMetrics, verification | submitted/editable/closed | Mẫu ghi rõ số liệu minh họa; không biến thành số liệu tác động đã xác minh |
| SavedCollection/ReminderEditor | collectionId, selectedIds, offsets, channels, quietHours | move/delete/save, nextScheduled | Lưu không đồng nghĩa đăng ký; hai offset tạo hai job phân biệt; hủy job khi sự kiện hủy |
| ArticleCard/RichContent | title, cover, author, blocks, readTime, sources | read/share/react/comment | Render block đã sanitize; nội dung có version và nguồn, không lấy số mẫu làm dữ kiện |
| PostCard/MediaGrid/CommentSheet | author, body, media, counts, visibility, viewerPermissions | like/save/comment/share/report | Optimistic phản ứng có rollback; private media không dùng URL public cố định |
| PostComposer | text, mediaIds, location, feeling, visibility, draftId | editing/uploading/posting/retry | Native gallery/camera/keyboard; quyền bạn bè chưa thống nhất với follow trong mẫu |
| ConversationRow/MessageBubble | participants, preview, unread, sender, seq, payload | sent/delivered/read/failed | Retry giữ client_message_id; share bài dùng post reference và kiểm tra quyền lại |
| UserStatusNote | owner, text, feeling, audience, expiresAt | create/edit/delete/expired | “Ghi chú của bạn/Tâm trạng ngày hôm nay” trong chat; TTL và audience cần chốt, server tự hết hạn và áp dụng block/privacy |
| MessageComposer/VoiceRecorder | text, attachments, recordingState, duration | permission/record/pause/preview/send | Call/video icons là tín hiệu scope, chưa có call screen hoàn chỉnh; cần đặc tả riêng |
| AssistantMessage/SuggestionChip | text, citations, taskState, suggestedPrompts | stream/cancel/retry/unsupported | Tách AI chat khỏi P2P; transcript có thể sửa; không tích hợp Meta AI vì placeholder copy |
| NotificationRow/Inbox | kind, entityRef, readAt, occurredAt, action | unread/read/group-date/empty | Server timezone và deeplink; thông báo cộng đồng dùng cùng envelope, khác kind |
| WalletSummary/LevelProgress | balance, lifetimeEarned, level, nextThreshold | stale/loading/synced | Không tính level từ balance; UI tiêu thụ server rule version |
| DailyRewardStrip | localDate, streakDay, claimed, rewardSchedule | claim/claimed/reset/reminder | Một claim/ngày theo policy timezone; ngày 5/7 trong thiết kế chưa đủ giá trị xác nhận |
| RewardCard/RedeemDialog | rewardId, cost, availability, walletVersion | preview/pending/confirmed/out-of-stock/insufficient | Popup hiển thị snapshot; server luôn kiểm tra lại giá/số dư/tồn kho |
| PointHistory/RewardHistory | entries, source, delta, balanceAfter, status | filter/cursor/empty/dispute | Sổ cái phân trang ổn định; hoàn điểm là entry bù; có trạng thái giao quà |
| Leaderboard/BadgeGrid | period, ranking, progress, awardedAt | public/private, no-rank | Ưu tiên điểm đã xác minh, có opt-out; xử lý đồng hạng cần chốt |
| StatisticsChart | metric, unit, period, denominator, series | no-data/partial/filtered | Chữ số thật, biểu đồ có bảng dữ liệu đọc được; % có mẫu số và cùng kỳ |
| GameLobby/QuestionBoard/Result | gameId, room, questions, assignments, result | join/ready/running/submitted/finished | Server đáp án/điểm; kéo thả có thao tác thay thế; không nhận score do client gửi |
| DeviceSessionRow/AppLock | device, lastSeen, current, revoked | revoke/confirm/re-auth/PIN lock | Không lưu password/PIN trong state log; thiết bị hiện tại có logout rõ ràng |

## Navigation và cấu trúc frontend đề xuất

`Root → Bootstrap → Onboarding/Auth hoặc MainTabs`. Guest được xem sổ tay, tin tức, địa điểm và khám phá hoạt động; command cần identity (điểm, đổi quà, đăng ký, bài viết, chat) mở đăng nhập và quay lại intent ban đầu. Đây là policy đề xuất vì Figma có “Khám phá trước”, chưa có ma trận guest đầy đủ.

Tách route group `auth`, `home`, `scan`, `handbook`, `collection`, `routes`, `events`, `rewards`, `community`, `messages`, `assistant`, `profile`, `settings`, `games`. Scanner là flow dùng camera, không giữ camera hoạt động khi tab mất focus. Các biến thể màn hình từ Figma trở thành state của cùng route khi hợp lý; không tạo một route cho mỗi ảnh mẫu.

```text
apps/mobile/src/
  app/                  bootstrap, navigation, providers, feature flags
  design-system/        tokens, primitives, feedback, layout
  features/<domain>/    screens, components, queries, commands, schemas
  services/             API transport, websocket, camera, location, media
  storage/              secure credentials, preferences, drafts, cache
  accessibility/        labels, focus, reduced motion
packages/contracts/     generated types from OpenAPI, error codes
packages/test-fixtures/  synthetic data, no production PII
```

Mobile dùng TypeScript/React Native; backend dùng **Python** theo lựa chọn của chủ dự án, với FastAPI là framework đề xuất. Chia sẻ OpenAPI và generated TypeScript client, không chia sẻ trực tiếp source business logic hoặc entity giữa hai ngôn ngữ. Database dùng Supabase PostgreSQL/PostGIS. Chọn phiên bản và native SDK sau spike tương thích; [tech stack](08-tech-stack.md) là tài liệu chuẩn cho lựa chọn kỹ thuật.

## State, dữ liệu và offline

- **Server state:** profile, wallet, event capacity, scans, posts, messages. Cache theo user/filters/cursor; xóa cache riêng tư khi logout; invalidate theo event nghiệp vụ.
- **Local UI state:** camera mode, sheet, filter draft, selected cards, form fields. Không persist OTP/password/QR token trong log hoặc local storage không bảo mật.
- **Local durable state:** onboarding draft, chưa gửi bài/báo cáo, vị trí thủ công, cài đặt thiết bị; schema có version để nâng cấp. Refresh token trong secure storage của OS.
- **Optimistic:** like/save/read có rollback. Đổi quà/đăng ký/cộng điểm phải đợi server xác nhận. Mất mạng sau submit → tra operation theo idempotency key, không tạo command mới.
- **Offline read:** sổ tay phiên bản gần nhất, dữ liệu đã cache có timestamp. Bản đồ/route và capacity cần mạng; không hiển thị chỉ dẫn trực tiếp như còn mới nếu không có dữ liệu cập nhật.
- **Media:** chọn/chụp → xem lại → lấy upload URL → upload → finalize → attach mediaId. Cho hủy, retry từng ảnh; giữ nháp khi một ảnh lỗi; xóa orphan qua job.
- **Realtime:** kết nối theo session, refresh auth và reconnect có backoff; HTTP/cursor replay bù message mất; presence không phải last-read.

## Các trạng thái cần thiết kế thêm

Camera/location/microphone bị từ chối hoặc chỉ có vị trí gần đúng; offline; upload lỗi; scan timeout/confidence thấp/nhiều vật thể; điểm thu gom đầy hoặc status cũ; route không tìm thấy; hoạt động hết chỗ/hủy/đổi giờ; QR hết hạn/đã dùng; đủ điểm nhưng quà hết kho; giao dịch đang xử lý; tài khoản bị khóa; nội dung bị xóa/riêng tư; tin nhắn bị chặn; AI không có nguồn; game mất kết nối; text phóng lớn; theme system/dark.

Thiết kế hiện chưa chứng minh các trạng thái này đầy đủ. Nghiệm thu từng flow phải có happy path, lỗi nghiệp vụ, quyền bị từ chối, mất mạng và retry.
