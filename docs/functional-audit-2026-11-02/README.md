# Rà soát chức năng và luồng BlueSteps — 02/11/2026

**Kết luận: các trang còn lại chưa đủ chức năng và luồng như Figma.** Nhiều thao tác cơ bản đã nối API và lưu dữ liệu thật; một số nhóm mới có bố cục, đang bị khóa ở backend, hoặc mở một màn khác mục đích thiết kế.

Đã đọc lại trực tiếp [trang backuped trong Figma](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7053): **211 frame**, gồm **10 frame onboarding của yêu cầu trước**, **198 frame chức năng/trạng thái còn lại** và **3 khung phụ**. Frame bao gồm overlay và biến thể, không phải 211 trang độc lập. Danh mục và nội dung hiện hành được lưu mới; báo cáo cũ chỉ cung cấp gợi ý tên nhóm, sau đó đối chiếu lại route/source hiện tại.

Đã lập [ma trận từng frame](frame-matrix.md), [nội dung/điều khiển Figma](figma-requirements.json), [đích prototype](prototype-transitions.json), [66 route hiện tại](current-routes.json) và [băm mã nguồn](source-fingerprints.json). Việc thiếu một route riêng không tự chứng minh thiếu chức năng: đã kiểm tra component dùng chung, state và handler trước khi đánh dấu khoảng trống. Ví dụ các frame hội thoại được ánh xạ lại sang `/conversation`, thay vì giữ mapping `/messages` của báo cáo cũ.

**Kiểm chứng thực tế:** 15/15 bài browser→API→worker→PostgreSQL đạt; Python harness và đối chiếu SQL sau các thao tác cùng đạt. Mở/chụp đủ **66/66 route ở 390×844**, thêm **52 lượt xem bố cục ở 390×844 và 428×926**, không lỗi JavaScript làm hỏng bài kiểm tra và không tràn ngang trong các lượt đo. **Đạt test không có nghĩa đã đủ Figma:** nhiều bài chủ động xác minh endpoint trả 503 hoặc nút chưa khả dụng.

| Nhóm | Đang hoạt động | Phần còn thiếu/khác Figma |
|---|---|---|
| Trang chủ | Profile, ví/danh mục API, lối tắt và mở nội dung | Các luồng đích chưa hoàn tất vẫn tồn tại; chưa nghiệm thu mọi tương tác trên điện thoại |
| Đăng nhập/đăng ký | Email/mật khẩu, OTP, cookie HttpOnly, khôi phục phiên | OAuth Google/Facebook; trang kết nối tài khoản hiện mở sai chức năng |
| Khôi phục/bảo mật | OTP, đặt lại/đổi mật khẩu, danh sách phiên | Email gửi ra ngoài và toàn bộ native chưa được chứng minh trong lượt này |
| Cá nhân/cài đặt/thành tích | Xem/sửa hồ sơ, theme, múi giờ, preferences, lịch sử phiên | Avatar, thay email, PIN, huy hiệu/xếp hạng; hiệu ứng âm thanh/rung |
| Hoạt động | Tìm/lọc, detail, lưu/quan tâm, bộ sưu tập, lịch tháng/tuần/trùng giờ | Đăng ký, vé/QR/check-in, nhắc lịch, kết quả và đánh giá sau hoạt động |
| Thu gom/hành trình | Tìm/lọc vật liệu, thông tin điểm, route/start/cancel, bàn giao tự khai | GPS/chỉ đường/ETA, thay điểm khi đầy, lọc nâng cao, ảnh và gửi đề xuất xét duyệt |
| Tin tức | Tìm/đọc/lưu/thích, bình luận/trả lời, theo dõi chủ đề | Lịch mở danh sách; bản tin nhanh/danh sách đọc còn dùng màn chung; tìm kiếm nâng cao và một số trạng thái |
| Sổ tay | Tìm/lọc nhóm-vật liệu, detail/hướng dẫn/cảnh báo, ghi nhận thủ công | Mở rộng cách xử lý, loại con/chất liệu/thời gian phân hủy theo các frame |
| Quét | Camera/picker và kết quả Chai nhựa; tra cứu thủ công | Chưa đủ loading/không nhận diện/chi tiết/thưởng. Kết quả cố định là yêu cầu trước, cần giữ |
| Điểm/quà | Ví, ledger/lịch sử, catalog/detail/filter | Điểm danh, đổi/nhận quà, nhắc lịch và cấp bậc thật |
| Cộng đồng/soạn bài | Bài chữ public/private, sửa/xóa, thích/lưu/chặn, bình luận | Khám phá/member/follow/filter; ảnh-video/vị trí/cảm xúc/camera/preview; friends-only và chia sẻ |
| Thông báo | Inbox và đánh dấu đã đọc, worker giao thông báo | Bộ lọc, mở chi tiết/đi tới đối tượng, preferences theo nhóm và push |
| Tin nhắn | Chọn người nhận, hội thoại chữ, lưu server, đọc lại/phân trang/read marker | Emoji picker, ảnh/video/tệp/ghi âm, preview và nhận tin tự động |
| Trợ lý | Form câu hỏi và gọi API | API 503; chưa có trả lời/hội thoại/gợi ý/lịch sử/giọng nói |
| Trò chơi | Trang trạng thái chưa mở | Toàn bộ danh sách/phòng chờ/gameplay/kết quả/chơi lại |
| Thống kê | Ba nhóm số liệu đọc từ API | Biểu đồ loại rác/tần suất, mục tiêu/thành tựu và thống kê chi tiết |

Các phát hiện dưới đây có mã để nối với từng dòng trong ma trận. **P1** là luồng chính không thể hoàn tất; **P2** là phần chức năng/trạng thái còn thiếu hoặc khác luồng. Không suy diễn dữ liệu minh họa trong Figma thành chính sách thưởng, số kg đã xác minh hoặc vé có hiệu lực.

**F01 — P1: Luồng đăng ký hoạt động chưa đi đến vé, check-in và tổng kết.**

Figma `534:49326 → 534:49416 → 534:49760` có form, vé/QR, check-in và đánh giá. [RegistrationForm](../../apps/mobile/src/features/live/EventRegistration.tsx#L33) giữ các ô form ở state nhưng nút “Kiểm tra đăng ký” chỉ gọi endpoint, không gửi body họ tên/số người/vai trò/điện thoại/email/consent. [Backend](../../apps/api/src/bluesteps_api/member.py#L494) luôn trả 503. [Vé và tổng kết](../../apps/mobile/src/features/live/EventSupportScreens.tsx) không sinh vé/check-in; lưu vé/gửi đánh giá bị tắt. Chưa có quy trình nhận kết quả được xác minh. Browser đã xác nhận service gate và trạng thái disabled; không có đăng ký/vé thành công được tính là hoàn tất.

**F02 — P1: Chuỗi nhận điểm→đổi quà→thành công chưa hoạt động.**

Figma `386:12671`, `386:12517`, `386:12362`, `386:11652` có nhận thưởng/xác nhận/thành công. [Daily claim và redemption](../../apps/api/src/bluesteps_api/member.py#L470) trả 503; [chi tiết quà](../../apps/mobile/src/features/live/RewardScreens.tsx#L20) khóa nút khi `redemptionEnabled=false`. Các mốc cấp bậc chỉ minh họa. Kiểm tra hiện tại chứng minh ví/ledger và khóa dịch vụ, không chứng minh giao dịch đổi quà. Cần nghiệp vụ/policy và tính nguyên tử điểm-kho trước khi có thể hoàn tất các state này.

**F03 — P1: Chỉ đường và thay điểm trên hành trình chưa đúng luồng.**

Figma `386:10279`, `386:10351`, `386:10136`, `534:48869` cần tuyến đi, khoảng cách/thời gian, rẽ từng chặng và thay điểm đầy. [RouteScreen/RouteEditorScreen](../../apps/mobile/src/features/live/CollectionScreens.tsx#L671) chỉ quản lý danh sách/trạng thái route. Route replacement dùng editor dành cho route nháp, không thay điểm của hành trình đang chạy. [Provider bản đồ](../../apps/api/src/bluesteps_api/collection.py#L317) chưa cấu hình. Đã kiểm start/arrive/handover tự khai; chưa có điều hướng GPS/ETA hoặc xác minh bàn giao. Mở vị trí trên ứng dụng bản đồ ngoài không thay thế được toàn bộ luồng này.

**F04 — P2, khác theo yêu cầu trước: Quét chưa có mọi state của Figma.**

Figma `386:14241/14264/14309/14346/14379` có nhận diện đang chạy, không nhận diện, kết quả, chi tiết và tích điểm. [ScanScreen](../../apps/mobile/src/features/live/ScanScreen.tsx#L20) luôn hiện “Chai nhựa” sau chọn/chụp ảnh. Đây là hành vi đã được chủ dự án yêu cầu trước, được ghi nhận trong [tài liệu dữ liệu](../display-data.md), không phải lỗi cần tự đổi thành AI. Các nhánh loading/unknown và thưởng vẫn chưa có như Figma. Browser không chứng minh camera/picker trên phần cứng.

**F05 — P1: Trợ lý và trò chơi chưa có vòng hoạt động.**

Toàn bộ 11 frame trợ lý và 10 frame trò chơi chưa có luồng hoàn chỉnh. [ServiceScreens](../../apps/mobile/src/features/live/ServiceScreens.tsx#L7) có form câu hỏi và trạng thái game; [assistant API](../../apps/api/src/bluesteps_api/collection.py#L326) và [game API](../../apps/api/src/bluesteps_api/mobile.py#L295) trả 503. Chưa có câu trả lời/lịch sử/Listening–Start–Stop; chưa có chọn game, gameplay hoặc kết quả. Đã kiểm lỗi thật trên browser.

**F06 — P2: Kết nối Google/Facebook mở khác chức năng thiết kế.**

Figma `386:7348` xác nhận thông tin tài khoản Google/Facebook. [Route connected-account](../../apps/mobile/app/connected-account.tsx#L1) re-export SessionsScreen, runtime hiện tiêu đề “Lịch sử đăng nhập”. Nút social trong [AuthForm](../../apps/mobile/src/features/auth/AuthForm.tsx#L447) chỉ hiện thông báo chưa hỗ trợ. Đây là thiếu OAuth và sai luồng màn kết nối, không phải thiếu dữ liệu người dùng.

**F07 — P2: PIN, avatar và thành tích chưa đủ.**

Figma `514:5102`, `386:8516`, `386:7550` cần PIN, chỉnh ảnh và thành tích/tiến độ/xếp hạng. [PinUnavailable](../../apps/mobile/src/features/live/SettingsScreen.tsx#L858) không đặt PIN; avatar upload/thay email chưa có. [AchievementsScreen](../../apps/mobile/src/features/live/ProfileScreens.tsx#L49) gọi `/v1/me/badges`; runtime nhận 503. Xem/sửa các trường profile và lưu qua reload đã được kiểm, nhưng không đại diện các nhánh còn thiếu.

**F08 — P2: Cài đặt âm thanh/rung mới lưu lựa chọn.**

Figma `514:5096` mô tả âm báo và phản hồi thao tác. [SettingsScreen](../../apps/mobile/src/features/live/SettingsScreen.tsx#L564) đọc/lưu `sound` và `haptics`; test reload giữ giá trị đạt. Rà toàn bộ source mobile cho `sound/haptics/Vibration/Haptics/Audio` chưa tìm thấy mã phát âm thanh/rung theo hai lựa chọn này ngoài phần settings/preferences. Vì vậy chưa đủ bằng chứng về hiệu ứng người dùng mong đợi; cần nối runtime effect và kiểm trên thiết bị.

**F09 — P2: Lọc/so sánh/báo cáo/đề xuất điểm thu gom còn thiếu bước.**

Figma `534:48401` có radius, đang mở/24h, còn chỗ và nhân viên; [bộ lọc hiện tại](../../apps/mobile/src/features/live/CollectionScreens.tsx#L401) chỉ có vật liệu và all/any. [So sánh](../../apps/mobile/src/features/live/CollectionScreens.tsx#L573) chỉ là các card thông tin, chưa có chọn/gợi ý/chỉ đường theo frame `534:48505`. [Báo cáo và đề xuất](../../apps/mobile/src/features/live/CollectionScreens.tsx#L916) chưa thêm ảnh; đề xuất mới lưu draft, thiếu chỉnh ghim/giờ nhận/gửi duyệt. Các form được mở trong lượt 66 route; gửi báo cáo/đề xuất/review và so sánh hai điểm chưa được thao tác trong suite browser này, không ghi là đã nghiệm thu.

**F10 — P1: Các lựa chọn nhắc lịch chưa tạo lời nhắc.**

Figma `534:49968`, `386:11858`, `386:12064` có thời điểm/kênh nhận/giờ yên lặng và lưu/hủy. [EventRemindersScreen](../../apps/mobile/src/features/live/EventSupportScreens.tsx#L43) khóa các điều khiển và nút lưu; [reminder API](../../apps/api/src/bluesteps_api/mobile.py#L300) luôn 503. Catalog quà chỉ báo nhắc điểm danh chưa hỗ trợ. Bộ sưu tập đã lưu không đồng nghĩa đã lập lịch hoặc gửi push/email.

**F11 — P2: Một số trang tin tức dùng lại màn khác mục đích.**

Figma `612:5362`: [articles/calendar](../../apps/mobile/app/articles/calendar.tsx#L1) mở EventsScreen; ảnh/runtime xác nhận là “Khám phá hoạt động”, không phải lịch. `612:5441`: Bản tin nhanh vẫn là NewsScreen với tiêu đề khác, chưa có tóm tắt theo ngày. `680:5406`: Danh sách đọc dùng cùng grid bài đã lưu, chưa có đọc tiếp/tiến độ đọc. Tìm kiếm thiếu từ khóa gần đây và các state lọc/list-grid. Thảo luận đã gửi/trả lời/xóa qua API được kiểm; thích bình luận và modal xác nhận quan tâm riêng chưa có. Nguồn: [NewsScreens](../../apps/mobile/src/features/live/NewsScreens.tsx#L31).

**F12 — P2: Các biến thể sổ tay chưa đủ nội dung/chuyển trạng thái.**

20 frame sổ tay được gom vào [HandbookScreen và WasteDetailScreen](../../apps/mobile/src/features/live/HandbookScreens.tsx#L69). Tìm/nhóm/vật liệu/steps/cảnh báo/ghi nhận thủ công có thật. Các frame mở rộng `386:13685/13838/14037` và loại vật liệu `386:16931/17005/17077/17145` có xử lý mở rộng, loại con/thành phần/thời gian phân hủy; hiện chưa có toàn bộ các khối và tương tác đó. Không yêu cầu sao chép nguyên nội dung minh họa hoặc số liệu chưa xác minh từ Figma vào API.

**F13 — P2: Cộng đồng thiếu các màn khám phá và quan hệ thành viên.**

Các frame `722:5570/5699`, `723:5892`, `733:5722/5787` cần tìm/lọc/thành viên/theo dõi. [CommunityScreen](../../apps/mobile/src/features/live/SocialScreens.tsx#L20) chỉ có feed và đã lưu; chưa có trang thành viên khác/follow hoặc lọc tương ứng. Detail hỗ trợ reaction/save/block/comment, nhưng thiếu share/copy link/hide và thích bình luận. Bài chữ riêng tư/reload/chặn đọc sau đổi tài khoản được kiểm; không suy ra các thao tác xã hội còn lại đã đủ.

**F14 — P2: Composer chỉ hỗ trợ bài chữ và public/private.**

Các frame `386:15419/15552/15972/16071`, `741:5779/5846/5913/5980/6114`, `743:6023` yêu cầu vị trí, cảm xúc, nhiều ảnh/video/tệp, camera, friends-only và preview. [ComposerForm](../../apps/mobile/src/features/live/SocialScreens.tsx#L65) chỉ gửi body/visibility/version. Không có media pipeline, lưu draft ảnh, upload progress hoặc preview. Đây là thiếu chức năng; không phải các overlay đã có nhưng chỉ chưa được route riêng.

**F15 — P2: Thông báo chưa có lọc/detail/settings theo nhóm.**

Các frame `703:5399/5468/5524/5589` và `712:*` yêu cầu bộ lọc, chi tiết, màn xem hết và cấu hình riêng. [NotificationsScreen](../../apps/mobile/src/features/live/ProfileScreens.tsx#L62) chỉ hiện title/body/time và mark-read/all. Notification không có handler mở đối tượng liên quan. Worker tạo thông báo và read-all đã kiểm; chưa có push hoặc cờ theo nhóm được lưu như Figma.

**F16 — P2: Chat chỉ có chữ và làm mới thủ công.**

Các frame `771:*`, `772:*`, `773:*` có emoji, attachment, ảnh/tệp/ghi âm và preview. [ConversationBody](../../apps/mobile/src/features/live/SocialScreens.tsx#L397) gửi text/clientMessageId và nút làm mới; chưa có attachment/picker/recorder/playback hoặc nhận tin tự động. Nhập một ký tự emoji bằng bàn phím không chứng minh picker đã có. Gửi/đọc lại chữ, membership, read marker và thông báo worker đã kiểm với hai tài khoản.

**F17 — P2: Thống kê chỉ có các card tổng số.**

Figma `391:25009` có tỷ lệ loại rác, tổng lượng, tần suất theo ngày, mục tiêu/thành tựu và danh sách chi tiết. [StatisticsScreen](../../apps/mobile/src/features/live/ProfileScreens.tsx#L11) chỉ hiện số action, verifiedKg và wallet. Runtime sau một hành động thủ công có số 1 đúng database, nhưng không có các biểu đồ/phân bố/tiến độ như thiết kế. Không dựng kg hoặc thưởng giả để lấp phần thiếu.

**Bằng chứng và giới hạn kiểm tra**

- [Tổng hợp có thể đọc bằng máy](summary.json), [log harness](live-suite.log), [kết quả từng test và HTTP method/path/status](runtime/tests), [66 route/heading/button/disabled/alert](runtime/runtime-routes.json), [52 lượt bố cục](runtime/checks.json).
- 995 phản hồi API được ghi metadata, không ghi body hoặc credential: 941×200, 9×201, 2×202, 16×204, 18×401, 3×404, 6×503. 401 thuộc chưa đăng nhập/kiểm phiên; 404 gồm chặn đọc bài riêng tư bằng tài khoản khác và refetch bộ sưu tập vừa xóa. Hai route `/game` và `/achievements` hiện alert service gate trong lượt duyệt.
- Suite dùng database/login PostgreSQL **local tạm riêng**, API/worker cổng tạm và tên/UUID ngẫu nhiên; không ghi vào Supabase/người dùng thật. Harness kiểm SQL sau browser và tự xóa database/login của nó. Bản web đã export lại với cấu hình phát triển bình thường sau suite: [log](build-normal.log).
- TypeScript, ESLint và Prettier cho test cập nhật đạt. Không sửa logic sản phẩm hoặc tự mở các policy/provider trong lượt rà soát; chỉ cập nhật công cụ kiểm thử và báo cáo.
- Figma Plugin API đã đọc lại đủ nội dung và prototype của 211/211 frame. Lệnh render screenshot trực tiếp Figma bị timeout; vì vậy không tuyên bố nghiệm thu hình ảnh/pixel toàn bộ. Đây là kiểm chức năng/luồng, có kiểm tra ảnh runtime đại diện, không phải pixel diff.
- Browser không thay thế camera/picker/microphone/GPS/notification, secure storage, âm thanh/rung hoặc bàn phím/safe-area trên điện thoại thật. Các luồng chưa có implementation được kết luận từ source/gate; các state có chung route chưa được bấm riêng đều ghi `NOT_INDIVIDUALLY_ACCEPTED` trong JSON.
- Giữ các chỉ đạo trước: onboarding tuần tự tới đăng nhập và kết quả ảnh cố định Chai nhựa. Không đánh dấu khác biệt này là yêu cầu tự sửa để giống prototype cũ.

**Thứ tự xử lý đề xuất:** sửa các trang mở sai chức năng và các trạng thái thiếu ở Tin tức/Thu gom trước; hoàn tất quy trình Hoạt động/Điểm-quà với contract/policy; bổ sung Thông báo/Cộng đồng/Chat; sau đó nghiệm thu Trợ lý/Game, thống kê và các biến thể nội dung. Mỗi nhóm cần test thành công, lỗi, hủy/quay lại, reload và quyền truy cập; một test mở trang hoặc một ảnh bố cục không đủ để đóng nhóm.

Tái lập rà soát nguồn: `node docs/functional-audit-2026-11-02/audit.cjs`. Để chạy lại harness, xem [hướng dẫn tích hợp](../live-integration.md); đặt `BLUESTEPS_AUDIT_OUTPUT` vào thư mục bằng chứng mới và chỉ dùng `BLUESTEPS_TEST_ADMIN_URL` localhost. Suite live coi onboarding đã hoàn tất; luồng mở đầu được kiểm riêng trong `e2e/onboarding.spec.ts`.
