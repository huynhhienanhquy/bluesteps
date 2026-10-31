# Báo cáo tiến độ UI BlueSteps — 30/10/2026

> Báo cáo mới nhất: [31/10/2026](ui-progress-2026-10-31.md). Nội dung bên dưới giữ làm mốc lịch sử ngày 30/10; kết quả kiểm tra chạy lại và phần chuẩn bị chi tiết Tin tức được ghi ở báo cáo mới.

## Kết luận kiểm tra code mới nhất

**Cập nhật:** 23:16 ngày 30/10/2026 (UTC+7), sau triển khai ba trang Tin tức.

**Phạm vi:** code local trên nhánh `codex/initial-upload`, gồm các thay đổi chưa commit trên nền `8fce4f0`. Lượt rà soát 22:32 đã xác minh nhánh GitHub cùng tên ở `8fce4f02a7bf86aaffd368379f31ae5208d3596c`; chưa commit/push các thay đổi UI mới. Lượt triển khai tiếp theo đã hoàn thiện ba trang danh sách Tin tức, kiểm thử và đối chiếu asset theo Figma. Mục tiêu hoàn thiện các nhóm đang trong tiến trình vẫn đang thực hiện.

| Trạng thái | Số mục trong bảng chức năng | Phạm vi chính |
|---|---:|---|
| **Đã làm xong UI demo** | **25** | Thêm nhóm trang chính/Tin mới nhất/Sự kiện sắp tới; cùng sáu màn con Tin tức, cấu hình nhắc lịch, đăng ký, vé/check-in, lịch, tổng kết hoạt động; Home, onboarding, tài khoản, hồ sơ, cài đặt, sổ tay, quét mẫu và form đề xuất/báo cáo điểm thu gom |
| **Đang trong tiến trình** | **13** | Thu gom/hành trình, khám phá/chi tiết/lưu/bộ sưu tập hoạt động, điểm/quà, cộng đồng, thông báo, chat, bot chữ, chi tiết bài đọc Tin tức, game và thống kê |
| **Chưa làm UI** | **5** | Thưởng ngày/nhắc thưởng, hướng dẫn quy đổi, xác nhận/kết quả đổi quà theo thiết kế, ảnh/quyền riêng tư/trạng thái tải khi đăng bài, RecycleBot giọng nói |

Các mục có phạm vi giao nhau; phần chưa làm có thể thuộc nhóm đang làm. **Không cộng số mục để tính phần trăm hoàn thành sản phẩm.** Bảng chi tiết bên dưới ghi rõ phần đã có, phần còn thiếu và source từng chức năng.

Độ phủ hiện có **84/175 frame Figma (48%)**, còn **91 frame chưa ánh xạ riêng**. Đây là độ phủ mapping theo inventory đã lưu, không phải tỷ lệ UI hoàn tất hoặc độ giống Figma. Cả 84 mapping có source tồn tại; hiện có **63 file route** ngoài `_layout`. Trang chính và chi tiết Tin tức được ghi thành hai phạm vi để thể hiện chính xác phần đã hoàn thành; tổng số dòng không phải số tính năng độc lập.

**Thay đổi tiến độ:** thêm nhóm trang chính Tin tức vào phần đã hoàn thành, nâng lên **25 mục xong UI demo / 13 mục đang làm / 5 mục chưa làm**. Nhóm Tin tức có 9/18 frame ánh xạ; chín biến thể chi tiết vẫn chưa triển khai riêng. Trong inventory có 89 frame có file context; có tài liệu thiết kế không đồng nghĩa đã code xong.

## Thay đổi mới đã xác minh trong code local

| Chức năng | Trạng thái | Nội dung mới |
|---|---|---|
| Trang chính/Tin mới nhất/Sự kiện sắp tới — `391:24796`, `386:9787`, `386:9901` | **Đã làm xong UI demo** | Hero, bài nổi bật, lưới ảnh, lối tắt lưu, menu, ba tab và điều hướng gốc. Tin mới nhất phân trang đủ 13 bài theo ngày; danh sách sự kiện cuộn tới bài thứ năm. Thêm bài `youth-ideas` với đúng ảnh/ID riêng, font Inknut Antiqua và hai icon chuyển trang xuất nguyên gốc |
| Đăng ký hoạt động — `534:49326` | **Đã làm xong UI demo** | Form/font Inter/asset gốc, bảng chọn vai trò, số người 1–5, kiểm dữ liệu/đồng ý và mở vé đúng hoạt động. Link thường bắt đầu bằng form trống |
| Tổng kết — `534:49760` | **Đã làm xong UI demo** | Ảnh gốc, kết quả chung/dấu ấn cá nhân mẫu, chọn sao/nhãn, nhận xét, album cục bộ và lưu phản hồi trong phiên |
| Vé/check-in — `534:49416` | **Đã làm xong UI demo** | Thẻ vé, mô-típ QR gốc 196 × 196, thông tin người tham gia/lịch/điểm hẹn; tải PNG web; luồng lưu/chia sẻ ảnh native có xử lý quyền/lỗi; sao chép, liên hệ mẫu và check-in cục bộ |
| Lịch hoạt động — `534:49166` | **Đã làm xong UI demo** | Tháng/tuần, chuyển năm/tháng, chọn ngày, lọc đã lưu/đăng ký, timeline, vé/lịch sử và cảnh báo trùng giờ tính từ fixture |
| Khám phá hoạt động | **Đang trong tiến trình** | Thêm hoạt động Trồng cây `tree-day`, bộ lọc/tìm địa điểm không dấu và ảnh Figma gốc cho thẻ mới; các biến thể khác còn thiếu fidelity |
| Bộ sưu tập — `534:49845` | **Đang trong tiến trình** | Đã dựng lưới thẻ, ảnh hoạt động, chọn/chuyển/thêm/bỏ, tạo/đổi tên/xóa có xác nhận, nhắc lịch cho đúng lựa chọn và navigation dùng asset gốc; còn xác minh glyph Plus và chênh 9px chiều cao toàn frame |
| Nhắc lịch — `534:49968` | **Đã làm xong UI demo** | Công tắc gốc cho bật/tắt, push/email độc lập, âm thanh/rung; chọn hoạt động, mốc tùy chỉnh, giờ yên lặng và preview giờ Việt Nam; chỉ lưu khi xác nhận |
| Tin tức — tìm kiếm/lọc `609:5165` | **Đã làm xong UI demo** | Nền/header/Inter/thẻ ảnh/icon/điều hướng gốc; tìm không dấu, xóa từ khóa, chọn chủ đề, sắp xếp và phân trang 4 bài/trang; đủ 13 fixture có ảnh minh họa |
| Bài viết đã lưu — `609:5266` | **Đã làm xong UI demo** | Thẻ thống kê và ảnh gốc, lưu/bỏ lưu có xác nhận/hủy, sắp theo lúc lưu/mới/phổ biến, tìm/lọc trong bảng tùy chọn và phục hồi khi không có kết quả; preview cách ly state |
| Thảo luận — `609:5361` | **Đã làm xong UI demo** | Thẻ bài/ảnh gốc, bình luận có avatar chữ, ô soạn gọn và mở rộng ổn định, trả lời/thích/sắp xếp/xóa có xác nhận; bình luận dài tự tăng chiều cao, giữ phản hồi khi xóa cha; preview không sửa phiên thật |
| Khám phá chủ đề — `612:5286` | **Đã làm xong UI demo** | Nền/header journal, thẻ nổi bật, ảnh gốc và bốn thẻ màu/icon, số bài đúng fixture; mở đúng feed, theo dõi/bỏ theo dõi trong phiên; alias Tái chế/Phân loại và Sống xanh/Lối sống |
| Lịch xanh — `612:5362` | **Đã làm xong UI demo** | Header/thẻ tháng/ngày và CTA theo Figma vừa đọc lại, đổi tháng/năm, bảng chọn ngày/danh mục và empty; mẫu Figma có hai mục “Sắp mở đăng ký”, CTA dẫn tới tin sự kiện liên quan |
| Bản tin — `612:5441` | **Đã làm xong UI demo** | Header/ngày và ba kiểu thẻ số gốc, chọn ngày hợp lệ, đánh dấu đã đọc/chưa đọc trong màn, khôi phục empty; mẫu thứ ba mở chủ đề theo Figma mới |
| Đối chiếu thiết kế | **Đã bổ sung bằng chứng** | Context/asset của 14 frame Hoạt động/Tin tức đã xử lý trước đó; thêm context 12 frame Tin tức chưa triển khai. Bốn màn Hoạt động có 8 capture ở 390/428 px; audit vị trí asset đăng ký/tổng kết đạt 31/31, vé/lịch đạt 33/33 |

Ba trang Tin tức mới có [sáu capture 390/428 px](figma-fidelity/rendered/capture-report-news-landing-.json), không lỗi JS/ảnh chưa tải/tràn ngang. [Audit 306/306 vị trí asset](figma-fidelity/news-landing-asset-audit.json) đạt: file gốc/MD5, bố cục, opacity và fit, sai lệch lớn nhất 0,03418 CSS px. Hai icon chuyển trang xuất nguyên gốc từ Figma vì component Code Connect không có trong repo; không tự vẽ hoặc thay bằng glyph gần giống. [Nguồn và khác biệt demo](figma-fidelity/news-landing-source-map.json).

Bộ Tin tức hiện có [18 capture cho chín màn](figma-fidelity/rendered/capture-report-news-.json). Ba audit của sáu màn con vẫn đạt: [58 vị trí tìm kiếm/lưu](figma-fidelity/news-feed-asset-audit.json), [32 vị trí thảo luận/chủ đề](figma-fidelity/news-social-asset-audit.json), [29 vị trí lịch/bản tin](figma-fidelity/news-digest-asset-audit.json). [Diff toàn frame](figma-fidelity/diff/report-news-.json) vẫn khác 0; chưa nghiệm thu khớp 100% hoặc QA điện thoại thật.

Đăng ký/tổng kết/vé/lịch Hoạt động giữ bằng chứng trước: audit 31/31 và 33/33 vị trí. Bộ sưu tập/nhắc lịch có [bốn capture](figma-fidelity/rendered/capture-report-event-saved-.json) và [audit 53/53](figma-fidelity/saved-event-asset-audit.json); bộ sưu tập vẫn đang làm vì chưa chốt glyph Plus và chênh 9px chiều cao. [Nguồn/giới hạn](figma-fidelity/saved-event-source-map.json).

Danh sách bài đọc thường có 13 fixture. Tìm kiếm preview “rác thải” vẫn có sáu kết quả thực, bài lưu preview có sáu ví dụ và thảo luận preview có ba bình luận. Trang chính giữ hai vị trí thẻ Sài Gòn Xanh cùng mở một ID; bài thanh niên có ID riêng `youth-ideas`. Preview không sửa phiên thật. Tin mới nhất thường sắp theo ngày, còn preview dùng bốn bài/counter nguyên gốc; tất cả nội dung và chỉ số là mẫu.

QR không có payload; vé/check-in/số liệu tác động là demo. `preview=1` không tạo đăng ký. Lưu PNG đã kiểm tra trên web; quyền ảnh, capture và bảng chia sẻ native còn cần thử trên điện thoại thật.

Ảnh UI mới: [trang chính](figma-fidelity/rendered/news-landing-all-428.png), [tin mới nhất](figma-fidelity/rendered/news-landing-latest-428.png), [sự kiện sắp tới](figma-fidelity/rendered/news-landing-events-428.png), [lịch xanh](figma-fidelity/rendered/news-calendar-428.png), [bản tin](figma-fidelity/rendered/news-briefs-428.png), [thảo luận](figma-fidelity/rendered/news-discussion-428.png), [chủ đề](figma-fidelity/rendered/news-topics-428.png), [tìm kiếm Tin tức](figma-fidelity/rendered/news-search-428.png), [bài viết đã lưu](figma-fidelity/rendered/news-saved-428.png), [bộ sưu tập](figma-fidelity/rendered/event-saved-collections-428.png), [nhắc lịch](figma-fidelity/rendered/event-saved-reminders-428.png), [đăng ký](figma-fidelity/rendered/event-registration-428.png), [tổng kết](figma-fidelity/rendered/event-summary-428.png), [vé](figma-fidelity/rendered/event-ticket-428.png), [lịch](figma-fidelity/rendered/event-calendar-428.png), [PNG vé tải xuống](ui-progress-evidence-2026-10-30/event-ticket-downloaded.png).

## Trạng thái UI theo chức năng

Quy ước áp dụng cho các bảng bên dưới:

- **Đã làm xong UI:** đã dựng đủ màn, nội dung và tương tác cục bộ cho phạm vi demo nêu trong dòng đó; không còn thiếu màn chính trong phạm vi này. Việc nghiệm thu độ khớp Figma và thiết bị vẫn có thể đang chờ.
- **Đang trong tiến trình:** đã có UI hoặc tương tác nhưng còn thiếu màn, trạng thái, bố cục theo Figma hoặc còn lỗi điều hướng. Đây là trạng thái triển khai dở dang, không khẳng định có người đang code chức năng đó ngay lúc đọc báo cáo.
- **Chưa làm:** chưa thấy màn/overlay hoặc luồng UI tương ứng trong code đã kiểm tra. Nút liên kết, thông báo “chưa bật” hoặc một màn demo gần giống không được tính là đã làm chức năng đó.

Các trạng thái này chỉ nói về UI. Backend, xác thực thật, phát điểm, giao dịch, push và realtime được ghi riêng, không dùng việc chưa nối backend để tự động đổi một UI đã dựng đủ thành “chưa làm”.

### UI đã làm xong trong phạm vi demo

| Chức năng | Trạng thái | UI đã hoàn thành | Màn/code đối chiếu và giới hạn |
|---|---|---|---|
| Tin tức — trang chính và các danh sách | **Đã làm xong UI** | Ba frame `391:24796`, `386:9787`, `386:9901`: hero/cộng đồng, tìm kiếm/menu, tab, bài nổi bật, lưới ảnh; phân trang Tin mới nhất đủ 13 bài, cuộn bài thứ năm ở Sự kiện sắp tới, mở đúng ID, lưu/thích trong phiên và preview cách ly | `/articles`, `?view=latest`, `?view=events` — [NewsLandingScreen.tsx](../apps/mobile/src/features/content/NewsLandingScreen.tsx). Trang mới dùng flow native, hai thiết kế cũ dùng LegacyCanvas. Danh sách và chỉ số là mẫu; chi tiết bài đọc ghi riêng ở phần đang làm; chưa QA điện thoại thật |
| Tin tức — lịch sự kiện xanh | **Đã làm xong UI** | Frame 612:5362 vừa đọc lại, thẻ tháng/ngày/danh sách, chuyển năm/tháng, chọn ngày và lọc danh mục trong sheet, empty và lối vào đúng event/related-news; preview ba ví dụ riêng, hai mục có trạng thái sắp mở | `/articles/calendar` — [NewsCalendarScreen.tsx](../apps/mobile/src/features/content/NewsCalendarScreen.tsx); normal dùng tám event fixture, không tạo thêm sự kiện/đăng ký từ preview; lịch và địa điểm chưa xác minh |
| Tin tức — bản tin nhanh | **Đã làm xong UI** | Frame 612:5441 mới, thẻ ngày/tóm tắt/số thứ tự gốc; chọn ngày thực, leap date, lọc chưa đọc, đánh dấu/khôi phục và mở đúng bài; mẫu thứ ba vào chủ đề | `/articles/briefs` — [NewsBriefsScreen.tsx](../apps/mobile/src/features/content/NewsBriefsScreen.tsx); trạng thái đọc trong màn; hai bản tin Figma đầu mở sheet ghi rõ chưa có toàn văn xác minh và link bài demo liên quan, chưa có bản tin biên tập/API |
| Tin tức — thảo luận bài viết | **Đã làm xong UI** | Frame 609:5361, thẻ bài/ảnh gốc, avatar chữ, soạn 1–500 ký tự, trả lời/thích, sắp mới/cũ/nổi bật, xác nhận/hủy xóa của mình và giữ phản hồi độc lập; empty/missing, comment dài 500 ký tự ở 320 px đã kiểm | `/articles/discussion?id=...` — [NewsDiscussionView.tsx](../apps/mobile/src/features/content/NewsDiscussionView.tsx); preview có ba comment riêng, không sửa provider; chưa gửi/kiểm duyệt thật, QA keyboard/native còn mở |
| Tin tức — khám phá chủ đề | **Đã làm xong UI** | Frame 612:5286, thẻ nổi bật và bốn nhóm với nền/ảnh/icon gốc, count đúng dữ liệu, mở đúng feed, theo dõi/bỏ theo dõi; journal header/nền và navigation theo thiết kế | `/articles/topics` — [NewsTopicsScreen.tsx](../apps/mobile/src/features/content/NewsTopicsScreen.tsx); normal có thêm back/follow controls, preview giữ composition; chưa cá nhân hóa hoặc đăng ký nhận tin thật |
| Tin tức — tìm kiếm và lọc | **Đã làm xong UI** | Frame 609:5165, ảnh/icon/điều hướng gốc, tìm tiếng Việt không dấu, xóa từ khóa, chủ đề/alias, sắp xếp, phân trang và trạng thái trống/lỗi/tải | `/articles?view=search` — [NewsFeedScreen.tsx](../apps/mobile/src/features/content/NewsFeedScreen.tsx), [NewsDesignParts.tsx](../apps/mobile/src/features/content/NewsDesignParts.tsx); số kết quả theo dữ liệu, ảnh/nội dung minh họa; trang chính đã hoàn thành và ghi riêng; các frame chi tiết còn thiếu |
| Tin tức — bài viết đã lưu | **Đã làm xong UI** | Frame 609:5266, thẻ tổng số và ảnh gốc; lưu/bỏ lưu có xác nhận/hủy, tìm/lọc, sắp xếp theo lúc lưu/mới/phổ biến, phân trang, phục hồi empty và state tách hoạt động | `/articles/saved` — [NewsFeedScreen.tsx](../apps/mobile/src/features/content/NewsFeedScreen.tsx); `preview=1` dùng danh sách mẫu riêng, không sửa state thật; chưa lưu lên server, QA native còn mở |
| Cấu hình nhắc lịch hoạt động đã lưu | **Đã làm xong UI** | Bố cục/font/công tắc gốc, chọn hoạt động, mốc 1h/3h/1 ngày/tùy chỉnh 1–168h; push/email độc lập và âm thanh/rung; sửa giờ yên lặng có kiểm HH:mm, preview dời giờ/loại trùng và lưu nháp khi xác nhận | `/event-reminders` — [EventRemindersScreen.tsx](../apps/mobile/src/features/events/EventRemindersScreen.tsx); preview riêng không sửa cấu hình phiên; chưa hẹn/gửi thông báo, chưa QA keyboard/native trên thiết bị |
| Vé tham gia và check-in hoạt động | **Đã làm xong UI** | Thẻ vé theo Figma, mô-típ QR gốc, tên/số người/vai trò, lịch/điểm hẹn; lưu PNG web, luồng thêm ảnh native có xử lý lỗi/quyền, sao chép, các lối điều hướng và check-in mẫu | `/event-ticket` — [EventTicketScreen.tsx](../apps/mobile/src/features/events/EventTicketScreen.tsx); không phát vé/check-in thật. Tải PNG đã test trên web; quyền/lưu/share native cần QA thiết bị |
| Lịch hoạt động | **Đã làm xong UI** | Lịch tháng/tuần, chuyển năm/tháng, chọn ngày ISO, lọc đã lưu/đăng ký, timeline, trùng giờ tính từ fixture, lối vào vé/tổng kết/nhắc lịch và trạng thái trống | `/calendar` — [EventCalendarScreen.tsx](../apps/mobile/src/features/events/EventCalendarScreen.tsx); lịch giả lập Việt Nam; chưa kết nối lịch tổ chức. Đối chiếu ảnh gốc hiện chỉ có context thu nhỏ |
| Đăng ký tham gia hoạt động | **Đã làm xong UI** | Form theo frame 534:49326, dropdown vai trò, tăng/giảm số người 1–5, kiểm dữ liệu và hai mục đồng ý, mở vé mẫu đúng hoạt động | `/registration` — [EventParticipationScreens.tsx](../apps/mobile/src/features/events/EventParticipationScreens.tsx), [EventFormParts.tsx](../apps/mobile/src/features/events/EventFormParts.tsx); chưa đăng ký/giữ chỗ thật; đối chiếu chữ toàn frame/native còn mở |
| Tổng kết sau hoạt động | **Đã làm xong UI** | Ảnh gốc và phần đóng góp cá nhân, số liệu mẫu, chọn sao/nhãn, nhận xét, album cục bộ và lưu phản hồi đăng ký mẫu | `/event-summary` — [EventSummaryScreen.tsx](../apps/mobile/src/features/events/EventSummaryScreen.tsx); số liệu/ảnh minh họa, chưa gửi phản hồi hoặc xác nhận tác động thật |
| Trang chủ | **Đã làm xong UI** | Header, banner, lối tắt, ví điểm, thẻ hoạt động/sổ tay/tin tức và năm tab; thẻ lớp học/biển mở đúng ID, thẻ tin tức mở `daily-waste` khớp tiêu đề và ảnh | `/` — [HomeScreen.tsx](../apps/mobile/src/features/home/HomeScreen.tsx); hai lỗi nối nội dung đã sửa; hoàn tất UI demo, vẫn chờ nghiệm thu hình ảnh/native như các màn khác trong bảng |
| Onboarding và cá nhân hóa ban đầu | **Đã làm xong UI** | 10 bước: khởi động, chào mừng, Reduce/Reuse/Recycle, sở thích, mục tiêu, giới thiệu vị trí, nhắc nhở, sẵn sàng | `/onboarding` — [OnboardingScreen.tsx](../apps/mobile/src/features/auth/OnboardingScreen.tsx); lựa chọn trong phiên demo |
| Đăng nhập và đăng ký tài khoản | **Đã làm xong UI** | Hai form, kiểm tra dữ liệu, hiện/ẩn mật khẩu, thông báo và điều hướng | `/login`, `/register` — [AuthForm.tsx](../apps/mobile/src/features/auth/AuthForm.tsx); chưa cấp tài khoản/session thật |
| Khôi phục mật khẩu | **Đã làm xong UI** | Nhập email, xác thực OTP sáu số, đặt mật khẩu mới và kiểm tra xác nhận mật khẩu | `/forgot-password`, `/verify-email`, `/reset-password` — [RecoveryScreens.tsx](../apps/mobile/src/features/auth/RecoveryScreens.tsx); chưa gửi OTP/reset thật |
| Hoàn tất tài khoản Google/Facebook | **Đã làm xong UI** | Màn thông tin nhà cung cấp, tên, đồng ý và xác nhận mẫu | `/connected-account` — [ConnectedAccountScreen.tsx](../apps/mobile/src/features/auth/ConnectedAccountScreen.tsx); chưa có luồng OAuth thật |
| Hồ sơ cá nhân và chỉnh sửa hồ sơ | **Đã làm xong UI** | Tổng quan hồ sơ, các lối tắt, form chỉnh sửa và kiểm tra dữ liệu | `/profile`, `/edit-profile` — [ProfileOverview.tsx](../apps/mobile/src/features/profile/ProfileOverview.tsx), [EditProfileScreen.tsx](../apps/mobile/src/features/profile/EditProfileScreen.tsx); chưa lưu hồ sơ lên server |
| Thành tích | **Đã làm xong UI** | Màn thành tích/huy hiệu và dữ liệu trình diễn | `/achievements` — [AchievementsScreen.tsx](../apps/mobile/src/features/profile/AchievementsScreen.tsx); thành tích mẫu |
| Cài đặt và các bảng tùy chọn | **Đã làm xong UI** | Trang cài đặt, tìm kiếm, âm thanh/rung, lịch sử đăng nhập và bàn phím PIN sáu số | `/settings` và bốn overlay — [SettingsScreen.tsx](../apps/mobile/src/features/profile/SettingsScreen.tsx), [SettingsOverlay.tsx](../apps/mobile/src/features/profile/SettingsOverlay.tsx); PIN và lịch sử là bản xem trước |
| Đổi mật khẩu | **Đã làm xong UI** | Form, hiện/ẩn mật khẩu, kiểm tra và phản hồi mẫu | `/change-password` — [ChangePasswordScreen.tsx](../apps/mobile/src/features/auth/ChangePasswordScreen.tsx); chưa thay đổi thông tin đăng nhập thật |
| Tra cứu sổ tay và danh mục rác | **Đã làm xong UI** | Trang đầu, biến thể chọn, danh sách/tìm kiếm, ba danh mục và ba hướng dẫn mở rộng | `/handbook`, `/handbook/list`, `/handbook/category/...` — [thư mục handbook](../apps/mobile/src/features/handbook); hỗ trợ tìm tiếng Việt không dấu và đóng overlay |
| Hướng dẫn vật liệu và bảng phân loại | **Đã làm xong UI** | Bảy hướng dẫn vật liệu; bốn bảng nhựa, y tế, túi nilon, pin; CTA và điều hướng liên quan | `/handbook/[id]`, `/handbook/types/[kind]` — [HandbookGuide.tsx](../apps/mobile/src/features/handbook/HandbookGuide.tsx), [HandbookTypesScreen.tsx](../apps/mobile/src/features/handbook/HandbookTypesScreen.tsx); typography/emoji còn chờ nghiệm thu hình ảnh |
| Quét rác — camera/chọn ảnh và các trạng thái demo | **Đã làm xong UI** | Xin quyền, chụp/chọn ảnh, nhập tay; 10 trạng thái mẫu gồm loading, không nhận diện, kết quả, chi tiết, thành công/điểm mẫu và sổ tay từ quét | `/scan` — [thư mục scan](../apps/mobile/src/features/scan); chưa nhận diện ảnh thật, chưa phát điểm; camera/picker trên thiết bị cần QA chi tiết |
| Đề xuất điểm thu gom và báo cáo vấn đề | **Đã làm xong UI** | Hai form, chọn ảnh cục bộ, kiểm tra trường, chọn loại vấn đề và lưu nháp trong phiên | `/point-proposal`, `/point-report` — [CollectionProposalScreen.tsx](../apps/mobile/src/features/collection/CollectionProposalScreen.tsx), [CollectionReportScreen.tsx](../apps/mobile/src/features/collection/CollectionReportScreen.tsx); chưa gửi tới đơn vị thu gom |

### UI đang trong tiến trình

| Chức năng | Trạng thái | Phần UI đã có | Phần UI còn phải làm/sửa |
|---|---|---|---|
| Tìm và xem điểm thu gom | **Đang trong tiến trình** | Bản đồ mẫu, khám phá, tìm kiếm/lọc, so sánh và chi tiết điểm; nhóm có 7/10 frame ánh xạ | Bổ sung/đối chiếu ba biến thể điểm thu gom còn lại; kiểm tra bản đồ và các trạng thái trên thiết bị. [Thư mục collection](../apps/mobile/src/features/collection) |
| Lập hành trình và bàn giao | **Đang trong tiến trình** | Thêm/bỏ/đổi thứ tự điểm, chọn tuyến/chặng, chỉ đường mẫu, thay điểm, hướng dẫn bàn giao; 6/9 frame ánh xạ | Ba biến thể hành trình còn lại và đối chiếu đầy đủ UI; chưa có map/GPS thật |
| Khám phá và xem chi tiết hoạt động | **Đang trong tiến trình** | Ảnh gốc cho lớp học/biển và hoạt động Trồng cây `tree-day`; tìm tên và địa điểm không dấu; lọc TP HCM/cuối tuần/Dọn rác/Trồng cây/Phân loại; chi tiết, lưu và lối vào đăng ký/vé/tổng kết | Còn ảnh gốc cho các hoạt động khác (đang dùng icon), thanh điều hướng và biến thể chi tiết theo Figma. [EventScreens.tsx](../apps/mobile/src/features/events/EventScreens.tsx) |
| Hoạt động đã lưu | **Đang trong tiến trình** | Tìm kiếm, lưu/bỏ lưu; xác nhận/hủy xóa, phản hồi sau xóa; lối vào bộ sưu tập/nhắc lịch; xóa đồng bộ khỏi bộ sưu tập và lời nhắc nhưng giữ vé mẫu | Còn đối chiếu các biến thể yêu thích theo Figma. [SavedEventScreens.tsx](../apps/mobile/src/features/events/SavedEventScreens.tsx) |
| Quản lý bộ sưu tập hoạt động yêu thích | **Đang trong tiến trình** | `/event-collections`: lưới thẻ theo JSX Figma, tạo/đổi tên/chọn/thêm/chuyển/bỏ/xóa; số đếm đúng dữ liệu, xác nhận/hủy xóa; nhắc lịch nhận đúng lựa chọn; navigation gốc; preview cách ly state thật | [EventCollectionsScreen.tsx](../apps/mobile/src/features/events/EventCollectionsScreen.tsx); còn xác minh glyph Plus so với Code Connect và flow dài 1153px trong frame 1144px (cuộn thêm 9px), chưa có ảnh gốc mới để chốt; dữ liệu trong RAM |
| Ví điểm, danh mục/chi tiết quà và lịch sử | **Đang trong tiến trình** | Ví điểm mẫu, danh mục có lọc, chi tiết, kiểm số dư minh họa và lịch sử seed | Bố cục/biến thể từng loại quà, UI xác nhận/kết quả đổi quà, nhận thưởng ngày và nhắc thưởng; nhóm 17 frame mới ánh xạ màn Thành tích. [RewardScreens.tsx](../apps/mobile/src/features/rewards/RewardScreens.tsx) |
| Cộng đồng và soạn bài | **Đang trong tiến trình** | Feed, thích/bỏ thích, bài viết văn bản cục bộ và danh sách bình luận mẫu | UI ảnh/quyền riêng tư, các biến thể composer, trạng thái đăng bài và tương tác bình luận đầy đủ. [CommunityScreens.tsx](../apps/mobile/src/features/community/CommunityScreens.tsx) |
| Thông báo | **Đang trong tiến trình** | Danh sách seed, chưa đọc/đã đọc, đánh dấu và mở nội dung | Các loại/tab/biến thể thông báo theo bảy frame Figma. [ContentScreens.tsx](../apps/mobile/src/features/content/ContentScreens.tsx) |
| Tin nhắn cá nhân | **Đang trong tiến trình** | Danh sách hội thoại, xem/gửi chữ trong phiên | Bố cục và trạng thái chat theo bốn frame; chưa có trao đổi tin thật. [MessageScreens.tsx](../apps/mobile/src/features/messages/MessageScreens.tsx) |
| RecycleBot — hội thoại chữ | **Đang trong tiến trình** | Màn chat với câu trả lời cố định có nhãn demo | Các biến thể màn bot, trạng thái phản hồi và giọng nói theo Figma; chưa có AI thật |
| Tin tức — chi tiết bài đọc | **Đang trong tiến trình** | `/articles/[id]` có metadata, ảnh, lưu/thích, thảo luận và bài liên quan; Home vẫn mở đúng `daily-waste`. Đã lưu context chín biến thể chi tiết; ba trang danh sách đã hoàn thành và ghi riêng | Chi tiết vẫn dùng bố cục chung, chưa dựng chín biến thể theo Figma, gồm phần đọc mở rộng và từng bố cục nội dung. [NewsScreens.tsx](../apps/mobile/src/features/content/NewsScreens.tsx) |
| Trò chơi phân loại | **Đang trong tiến trình** | Bài luyện chạm ba câu, phản hồi và chơi lại | Các màn/luồng trò chơi theo 10 frame Figma. [GameScreen.tsx](../apps/mobile/src/features/games/GameScreen.tsx) |
| Thống kê cá nhân | **Đang trong tiến trình** | Tổng quan và bảng số liệu tuần giả lập | Bố cục/biểu diễn thống kê theo frame 391:25009 và nghiệm thu UI. [ProfileScreens.tsx](../apps/mobile/src/features/profile/ProfileScreens.tsx) |

### UI chưa làm

| Chức năng cụ thể | Trạng thái | Phạm vi UI chưa có | Tham chiếu Figma |
|---|---|---|---|
| Nhận thưởng ngày và nhắc thưởng | **Chưa làm UI** | Các màn nhận thưởng ngày, sau nhận thưởng và đặt nhắc thưởng; ví hiện tại chỉ ghi chức năng chưa bật | 386:12671, 386:11652, 386:11858 |
| Hướng dẫn quy đổi điểm | **Chưa làm UI** | Màn hướng dẫn/cách quy đổi riêng | 386:11320 |
| Xác nhận và kết quả đổi quà theo thiết kế | **Chưa làm UI** | Hai màn/biến thể xác nhận và sau xác nhận; nút kiểm số dư và nút đổi quà bị khóa hiện tại chưa phải luồng này | 386:12517, 386:12362 |
| Đính kèm ảnh, chọn quyền riêng tư và trạng thái tải khi đăng bài | **Chưa làm UI** | Các bước UI tương ứng trong bộ composer; hiện mới nhập và thêm văn bản cục bộ | Bộ 386:15047–386:16071 và 386:16188 |
| RecycleBot — giọng nói | **Chưa làm UI** | Màn/trạng thái ghi âm, nghe và xử lý giọng nói theo bộ frame bot | Nhóm RecycleBot & giọng nói trong catalog |

Các dòng “chưa làm” là phần con của một số nhóm đang trong tiến trình, vì vậy không cộng số dòng các bảng thành số tính năng hoặc số frame. Hai frame tư liệu/khung phụ và frame navigation rời cần xác định vai trò trước khi quy thành chức năng sản phẩm.

**Nghiệm thu UI:** các màn ghi “đã làm xong UI” mới hoàn tất triển khai demo; toàn bộ nhóm vẫn cần chốt độ khớp Figma và QA thiết bị. Sai khác typography/emoji đã biết được giữ ở mục lỗi bên dưới, không bị bỏ qua khi đổi cách ghi trạng thái.

## Kết quả kiểm chứng mới nhất

Các lệnh dùng `corepack pnpm --filter @bluesteps/mobile <script>` trên worktree có ba trang Tin tức mới. Bộ capture fidelity dùng Chrome cài sẵn. Các bằng chứng của lượt rà soát 22:32 giữ ở `code-review-validation.json`; kết quả sau triển khai được ghi riêng bên dưới.

| Kiểm tra | Kết quả | Bằng chứng / giới hạn |
|---|---|---|
| TypeScript | **Đạt** | [Log](ui-progress-evidence-2026-10-30/news-landing-typecheck.log) |
| ESLint toàn app | **0 lỗi, 3 cảnh báo cũ** | [Log](ui-progress-evidence-2026-10-30/news-landing-lint.log); import trùng và `require()` trong test Hoạt động |
| Unit/component | **45/45 đạt, 17 suite** | [Log](ui-progress-evidence-2026-10-30/news-landing-unit.log), 14,14 giây |
| E2E hồi quy toàn app | **64/64 đạt, 3,9 phút** | [Log](ui-progress-evidence-2026-10-30/news-landing-e2e-full.log); 64 ca, gồm ba ca mới cho trang chính/phân trang/cuộn/preview |
| E2E phụ thuộc lịch/bản tin/chủ đề | **6/6 đạt, 15,3 giây** | [Log](ui-progress-evidence-2026-10-30/news-landing-e2e-dependent.log), sau cập nhật catalog và đường vào |
| Build web và bundle iOS/Android | **Đạt** | [Web](ui-progress-evidence-2026-10-30/news-landing-build.log), [native](ui-progress-evidence-2026-10-30/news-landing-native.log); không phải APK/IPA hoặc chạy điện thoại thật |
| Capture Tin tức | **18 ảnh, 0 lỗi JS/ảnh chưa tải/tràn ngang** | [Chín màn](figma-fidelity/rendered/capture-report-news-.json); cả sáu ảnh của ba trang mới đã xem trực tiếp |
| Audit asset ba trang mới | **306/306 đạt** | [Audit](figma-fidelity/news-landing-asset-audit.json), 153 slot ở mỗi chiều rộng; file/MD5/geometry/opacity/fit, sai lệch lớn nhất 0,03418 CSS px |
| Hồi quy asset sáu màn con | **58/58 + 32/32 + 29/29 đạt** | [Tìm kiếm/lưu](figma-fidelity/news-feed-asset-audit.json), [thảo luận/chủ đề](figma-fidelity/news-social-asset-audit.json), [lịch/bản tin](figma-fidelity/news-digest-asset-audit.json) |
| Định dạng phạm vi thay đổi | **Đạt, 19 file** | [Log](ui-progress-evidence-2026-10-30/news-landing-format-check.log); không chạy lại toàn repo |
| Nghiệm thu toàn frame và thiết bị | **Còn mở** | [Diff](figma-fidelity/diff/report-news-landing-.json) còn khác 0; native safe area/cỡ chữ/thao tác trên máy thật chưa QA. Chín biến thể chi tiết và các nhóm đang làm vẫn còn |

Lượt E2E riêng đầu có một test cũ chờ nút “Quay lại” trên trang tổng hợp mới, trong khi frame này dùng điều hướng gốc; đã đổi điểm chờ sang bài nổi bật. Lượt toàn app đầu đạt 61/64: ba kỳ vọng cũ còn dùng tổng 12 bài, bốn bài Cộng đồng và lối vào Tin nhanh trực tiếp. Sau khi thêm đúng bài `youth-ideas`, catalog là 13 bài/năm bài Cộng đồng và Tin nhanh nằm trong menu. Đã cập nhật kỳ vọng/đường thao tác, giữ kiểm tra chính xác và không đổi dữ liệu để làm test qua. Giữ [log riêng đầu](ui-progress-evidence-2026-10-30/news-landing-e2e-first.log) và [log toàn app đầu](ui-progress-evidence-2026-10-30/news-landing-e2e-full-first.log) để truy vết.

Tổng hợp hiện tại: [news-landing-validation.json](ui-progress-evidence-2026-10-30/news-landing-validation.json). Các mốc [code-review](ui-progress-evidence-2026-10-30/code-review-validation.json), [news-digest](ui-progress-evidence-2026-10-30/news-digest-validation.json), [news-social](ui-progress-evidence-2026-10-30/news-social-validation.json), [news-feed](ui-progress-evidence-2026-10-30/news-feed-validation.json) và [saved-ui](ui-progress-evidence-2026-10-30/saved-ui-validation.json) giữ làm lịch sử.

Lượt toàn app thứ hai đạt 63/64; ca còn lại đọc URL ngay sau thao tác, trước khi Expo hoàn tất điều hướng. Đã thay các kiểm tra URL tức thời của nhóm lịch/chủ đề bằng matcher chờ đúng pathname và topic, giữ nguyên điều kiện cần đạt, không tăng timeout hoặc bỏ kiểm tra. [Log lượt hai](ui-progress-evidence-2026-10-30/news-landing-e2e-full-second.log). Bản cuối cũng đã khớp bo góc 20/50px của trang tổng hợp và được chụp/audit lại.

## Nguồn Figma và giới hạn

- Thiết kế: [page backuped, 386:7053](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7053); inventory đã lưu gồm 186 đối tượng cấp cao/175 frame. Không kiểm kê các page khác hoặc xác nhận Figma chưa đổi thêm trong lần rà soát code này.
- Ba trang Tin tức mới dùng context đầy đủ đã lưu; lần này đọc trực tiếp screenshot gốc 428 × 1686/926 và hình học của cả ba frame thành công. Hai icon chuyển trang được xuất từ node gốc; ảnh/font đã bundle cục bộ, không dùng URL tạm ở runtime. Chín biến thể chi tiết có context nhưng chưa triển khai riêng. Chưa kiểm kê lại toàn page; tổng 175 vẫn theo inventory đã lưu. [Nguồn triển khai](figma-fidelity/news-landing-source-map.json).
- Các lần đọc bộ sưu tập/nhắc lịch trước bị từ chối, đã ghi trong [source map](figma-fidelity/saved-event-source-map.json); không xác minh lại quyền truy cập trong lượt rà soát code này. Glyph Plus và chênh 9px của bộ sưu tập vẫn chưa chốt. Lịch hoạt động dùng context đã lưu và [ảnh 312 × 1024](figma-fidelity/reference/534-49166-context.png); vé có ảnh gốc 428 × 1139. Audit vé/lịch dựa trên JSX Figma đã lưu, không phải phép đo hình học trực tiếp mới. Xem [nguồn và giới hạn](figma-fidelity/ticket-calendar-source-map.json).
- Coverage đã cập nhật từ snapshot cũ lên 175 frame. Không dùng số 69/169 hoặc 69/175 làm kết luận hiện tại.

Bằng chứng: [inventory](ui-progress-evidence-2026-10-30/figma-live-inventory.json), [audit 175 frame](ui-progress-evidence-2026-10-30/frame-audit.json), [CSV](ui-progress-evidence-2026-10-30/frame-audit.csv), [coverage](figma-fidelity/coverage.json).

## Phụ lục độ phủ frame theo nhóm UI

“Đã ánh xạ” là có frame Figma, route và source triển khai riêng trong bộ fidelity; chưa bao hàm nghiệm thu hình ảnh. “Còn lại” có thể đã có trang demo chức năng nhưng chưa được ghi nhận là triển khai theo frame tương ứng.

| Nhóm theo catalog | Frame trong snapshot | Đã ánh xạ hiện tại | Chưa ánh xạ | Nhận xét |
|---|---:|---:|---:|---|
| Onboarding & cá nhân hóa | 10 | 10 | 0 | Đủ các bước giới thiệu/chọn sở thích/mục tiêu ở mức UI |
| Tài khoản & xác thực | 6 | 6 | 0 | Đăng nhập, đăng ký, khôi phục, OTP, mật khẩu mới, kết nối tài khoản; xác thực còn demo |
| Hồ sơ | 2 | 2 | 0 | Cá nhân và chỉnh sửa hồ sơ đã dựng |
| Cài đặt & bảo mật | 6 | 6 | 0 | Trang cài đặt, bốn overlay và đổi mật khẩu; chưa có bảo mật tài khoản thật |
| Sổ tay & kiến thức rác | 21 | 21 | 0 | Landing, danh sách, danh mục/overlay, bảy hướng dẫn và bốn bảng phân loại |
| Camera & nhận diện | 9 | 9 | 0 | Đã dựng các trạng thái Figma; chưa có API nhận diện |
| Điều hướng dùng chung | 2 | 1 | 1 | Catalog xếp Home ở nhóm này; các thanh điều hướng lồng trong màn không đếm riêng |
| Điểm thu gom | 10 | 7 | 3 | Bản đồ mẫu, khám phá, lọc, so sánh, chi tiết, đề xuất, báo cáo |
| Hành trình & bàn giao | 9 | 6 | 3 | Hành trình, tuyến/chặng, chỉ đường mẫu, thay điểm, bàn giao |
| Hoạt động & tham gia | 13 | 4 | 9 | Form, tổng kết, vé và lịch đã có mapping/capture; khám phá, chi tiết và các biến thể khác còn chờ hoàn thiện |
| Hoạt động đã lưu & nhắc lịch | 5 | 2 | 3 | Bộ sưu tập/nhắc lịch đã có mapping, capture và audit asset; bộ sưu tập còn chốt Plus/chiều cao; danh sách yêu thích và biến thể xóa chưa ánh xạ |
| Điểm, đổi quà & thành tích | 17 | 1 | 16 | Thành tích đã ánh xạ; ví, quà và lịch sử còn giao diện demo |
| Cộng đồng & tạo bài | 12 | 0 | 12 | Có feed, thích và composer cục bộ; thiếu các biến thể theo Figma |
| Thông báo | 7 | 0 | 7 | Có inbox/đã đọc demo; chưa dựng từng frame thông báo |
| Tin nhắn cá nhân | 4 | 0 | 4 | Danh sách hội thoại và gửi tin cục bộ; chưa đối chiếu frame |
| RecycleBot & giọng nói | 11 | 0 | 11 | Bot trả lời cố định; thiếu UI đầy đủ và các trạng thái giọng nói |
| Tin tức | 18 | 9 | 9 | Ba trang danh sách và sáu màn con có mapping/capture/audit; chín biến thể chi tiết còn đang làm |
| Trò chơi | 10 | 0 | 10 | Mới có bài luyện phân loại ba câu, chưa tương đương luồng Figma |
| Thống kê | 1 | 0 | 1 | Có số liệu tuần giả lập; chưa đối chiếu frame |
| Tư liệu/khung phụ | 2 | 0 | 2 | Cần phân loại có thuộc đầu ra sản phẩm hay chỉ là tư liệu |
| **Tổng** | **175** | **84** | **91** | **48% có ánh xạ, chưa nghiệm thu toàn bộ** |

Luồng quét thực tế có 10 frame đã ánh xạ; frame “Sổ tay rác_Scan” (386:14454) nằm ở nhóm “Sổ tay & kiến thức rác” của catalog gốc. Bảng giữ nguyên cách nhóm của catalog để truy vết, tránh đếm hai lần.

## Phần còn thiếu và thứ tự thực hiện

| Thứ tự | Công việc | Điều kiện hoàn thành |
|---|---|---|
| 1 | Khám phá/chi tiết và danh sách hoạt động đã lưu; chốt bộ sưu tập | Hoàn thiện 12 frame chưa ánh xạ trong hai nhóm Hoạt động, asset/bố cục gốc, biến thể và capture; xác minh Plus/chiều cao bộ sưu tập. Nhắc lịch đã hoàn tất UI demo, còn nghiệm thu thiết bị |
| 2 | Tin tức — chín frame chi tiết chưa ánh xạ | Dựng từng biến thể bài đọc, mở rộng nội dung và điều hướng tương ứng. Ba trang danh sách và sáu màn con đã hoàn thiện UI demo, còn nghiệm thu hình ảnh/native |
| 3 | Thu gom/hành trình và điểm/quà | Sáu frame thu gom/hành trình chưa ánh xạ; 16 frame điểm/quà chưa ánh xạ, gồm UI thưởng ngày, hướng dẫn quy đổi và xác nhận/kết quả đổi quà còn thiếu |
| 4 | Cộng đồng, thông báo, chat, bot, game, thống kê | Dựng từng màn/trạng thái; ưu tiên ảnh/quyền riêng tư/trạng thái đăng bài và giọng nói |
| 5 | Nghiệm thu hình ảnh và thiết bị | Typography/emoji/asset/spacing/scroll/overlay; iOS/Android và trạng thái lỗi/trống/tải; quyền/lưu/chia sẻ ảnh vé trên điện thoại |

Sai khác hình ảnh ở sổ tay/quét và các nhóm chưa hoàn thiện vẫn cần xử lý. [Diff đã lưu](figma-fidelity/diff/report.json) khác 0; không chuyển thành phần trăm giống Figma. Tin tức hiện dùng ảnh minh họa gốc đã bundle cho cả 13 fixture; ảnh không xác nhận sự kiện hoặc nhân vật trong bài. Nhắc lịch mới lưu cấu hình trong phiên, chưa hẹn hoặc gửi thông báo.

Xác thực thật, dữ liệu bền vững, nhận diện ảnh, bản đồ/GPS, phát điểm/đổi quà, vé/check-in, push và realtime chưa tích hợp. Các giới hạn này được tách khỏi trạng thái hoàn thành UI demo.



