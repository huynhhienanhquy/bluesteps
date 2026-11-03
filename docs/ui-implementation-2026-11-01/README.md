# Frontend ↔ Figma — đang thực hiện

Nguồn: file `7GCLABwia0mauoszRi0Vtt`, trang `backuped` (`386:7053`), 211 frame. Kiểm kê ban đầu và toàn bộ 66 route nằm tại [báo cáo audit](../ui-audit-2026-11-01/README.md). Không dùng coverage cũ của frontend demo làm bằng chứng hoàn thành.

## Tiến độ

[progress.json](progress.json) giữ đủ 211 frame. `PARTIAL_LAYOUT` chỉ nghĩa là đã chuyển bố cục sang component React Native dùng API hiện tại. Chưa có nghiệm thu toàn bộ frame; không được xem các candidate là đã khớp 100%.

Đã sửa các bố cục chính: trang chủ, sổ tay, tin tức, khám phá hoạt động, bản đồ thu gom, cá nhân; 10 bước onboarding; khôi phục/đổi mật khẩu; cài đặt, tìm kiếm cài đặt, âm thanh/rung, danh sách phiên và chỉnh sửa hồ sơ. Màn PIN hiện là trạng thái chưa hỗ trợ, không lưu PIN giả.

Những nhóm còn nhiều việc: chi tiết/lịch/vé/đăng ký hoạt động, bộ lọc/chi tiết/chỉ đường thu gom, điểm/quà, quét/kết quả, các biến thể sổ tay/tin tức, cộng đồng/soạn bài, thông báo, chat, trợ lý, trò chơi, thành tích và các khung phụ. Các file context mới có thể đã được tải để chuẩn bị nhưng chưa có thay đổi frontend tương ứng.

Đã bổ sung bố cục riêng cho 4 frame điểm/quà (`386:11010`, `386:11451`, `386:12071`, `386:11320`): hành trình minh họa, danh mục quà hai cột, lịch sử theo tuần/tháng và hướng dẫn. Các biến thể nhận điểm, nhắc, xác nhận đổi quà và thành công vẫn chưa hoàn thiện.

Đợt tiếp theo thêm 3 bố cục luồng hoạt động (`534:49166`, `386:9376`, `534:49326`): lịch tháng/tuần, chi tiết hoạt động và form đăng ký.

Đợt 02/11 bổ sung 4 bố cục (`534:49845`, `534:49968`, `534:49416`, `534:49760`): bộ sưu tập yêu thích, nhắc lịch, vé và tổng kết. Tổng hiện tại: **39 frame `PARTIAL_LAYOUT`, 172 frame `PENDING`, 0 frame được nghiệm thu hoàn toàn**. Các biến thể chi tiết/đã lưu và các trạng thái nghiệp vụ chưa hỗ trợ vẫn cần hoàn thiện hoặc nghiệm thu riêng.

## Dữ liệu và khác biệt bắt buộc

- Tên, email, ví, nội dung, hoạt động, điểm thu gom, giao dịch và phiên đăng nhập lấy từ API. Không dùng Linh Chi/Thu Phương, điểm 180/253 hay thành tích của mẫu Figma làm dữ liệu tài khoản.
- Ảnh minh họa trang trí dùng asset gốc; ảnh bài viết/quà/địa điểm/ảnh đại diện không thay bằng ảnh mẫu. Khi API thiếu ảnh, dùng ô trung tính hoặc monogram.
- Bản đồ dùng tọa độ điểm công bố và OpenStreetMap embed; không có điểm thì hiển thị trạng thái rỗng. Không tạo khoảng cách/ETA/tuyến đi giả.
- Backend chưa hỗ trợ PIN, upload avatar, social sign-in, lời nhắc onboarding, hệ thống cấp bậc/huy hiệu. Không báo đã lưu/đã cấp quyền/đã nhận thưởng cho chức năng chưa có.
- Chủ đề onboarding dùng enum thật (`sorting`, `collection`, `activities`, `news`); Figma có chủ đề thưởng không tương ứng API. Đây là khác biệt cần đối chiếu khi hoàn thiện sản phẩm.
- Chỉnh sửa hồ sơ giữ email chỉ đọc; ô mật khẩu mở luồng đổi mật khẩu. Ngày sinh nhập YYYY-MM-DD, quốc gia mã 2 chữ cái. Giới thiệu có thể mở rộng để giữ chức năng hiện có.
- Điểm/quà: các mốc hành trình ghi rõ là minh họa và khóa; không gán cấp bậc hay mục tiêu 100/200/350/500/700 như chính sách đang hoạt động. Điểm danh gọi API và hiển thị lỗi chương trình chưa mở. Bảy ngày không được tô đã nhận, không hứa số điểm. Thẻ quà dùng tên, giá, tồn kho và danh mục công bố từ API; thiếu ảnh thì dùng ô trung tính. Tổng điểm tuần/tháng chỉ tính khi đã tải hết giao dịch; không dùng số liệu của trang đầu làm tổng toàn tài khoản.
- Lịch hoạt động dùng ngày hiện tại và múi giờ tài khoản, thay cho tháng/ngày mẫu trong Figma. Lưới bắt đầu thứ hai; nút ngày, chuyển tuần/tháng và nút xem hoạt động ngày đều có tác dụng. Hoạt động kéo qua nửa đêm có thể xuất hiện ở hai ngày, nhưng thời điểm kết thúc đúng 00:00 không chiếm ngày tiếp theo. Lịch từ API chỉ là quan hệ **đã lưu**, chưa phải đăng ký; không hiển thị vé hay trạng thái dự định tham gia giả.
- Chi tiết hoạt động dùng ảnh/gallery, tiêu đề, giới thiệu, địa điểm, số chỗ và độ tuổi từ nội dung API. Thiếu ảnh thì để ô trung tính; không dùng ảnh trẻ em/avatar mẫu Figma làm nội dung thật. Độ tuổi chưa công bố hiển thị “Chưa rõ”. Font Inknut Antiqua dùng font đã có và đã được load trong project.
- Form đăng ký điền tên/email tài khoản vào bản nháp cục bộ, có điều chỉnh số người, vai trò công bố, trường liên hệ và checkbox. Thông báo rõ chưa gửi thông tin. Nút kiểm tra gọi cổng API hiện có, nhận lỗi 503 khi chương trình chưa mở; không tạo vé hoặc báo đăng ký thành công. Phí và điều kiện theo ban tổ chức, không tự gán “Miễn phí” hay tuổi 18.
- Bộ sưu tập dùng tên và quan hệ lưu thật: lưới hai cột, số lượng đã tải (có `+` khi còn trang), chọn hoạt động, chuyển bộ sưu tập, tạo/đổi tên/xóa/thêm/bỏ qua menu. Xóa bộ sưu tập hoặc bỏ khỏi bộ sưu tập không xóa hoạt động đã lưu. Chuyển nhiều hoạt động gọi API từng mục: nếu lỗi giữa chừng, chỉ thông báo số đã chuyển và giữ lựa chọn còn lại, không báo thành công toàn bộ.
- Nhắc lịch dựng các section, danh sách đã lưu, chip thời điểm, kênh thông báo, giờ yên lặng và thông tin lời nhắc; công tắc/checkbox ở trạng thái tắt, khóa và ghi rõ chưa lưu. Không giả định khung giờ 22:00–07:00 hoặc hai lời nhắc đã được lên lịch.
- Vé dùng bố cục thẻ xanh, thông tin tài khoản/hoạt động thật nếu có ID, đường xé và thông tin liên hệ do nội dung công bố. Không có QR/mã vé mẫu hay nút tải vé hoạt động khi chưa được cấp vé. Tổng kết dùng ảnh thật nếu có, dấu `—` cho số liệu chưa xác minh, sao chưa chấm và ô đánh giá chỉ đọc; không gán 200/24/3 hoặc đánh giá 4/5 của mẫu Figma cho tài khoản.
- Navbar bộ sưu tập dùng từng layer SVG gốc của frame. Android cần bản PNG trong suốt được render nguyên từ `imgEllipse9.svg` ở 3× cho vòng tròn/bóng nút quét; không chỉnh hoặc vẽ lại asset. Brand của bốn frame có cùng SHA-256 với brand lịch đã dùng.
- Native dùng safe area và thanh trạng thái thực. Không vẽ giờ/pin iPhone lên Android. Bố cục thích ứng cỡ chữ 130% nên không cố ép số dòng như mẫu.

## Bằng chứng và giới hạn

- `context-*.txt`: code/layout trực tiếp từ Figma trong phiên làm việc này. Không dùng ảnh toàn màn làm implementation.
- `live-visual/`: chụp bởi browser harness kết nối API/PostgreSQL cục bộ biệt lập, có dữ liệu kiểm thử trong DB; không chặn request hoặc inject fixture vào frontend. Kích thước 428×926 và 390×844. Chỉ được coi là đủ bộ khi `checks.json` được ghi sau vòng chụp thành công.
- `native/`: Android emulator 1080×2340, 360dp, API32; đã kiểm tra fontScale 1.0 và 1.3. Nút Tools nổi của Expo Go có thể xuất hiện trên ảnh; không phải UI BlueSteps.
- Các ảnh cũ tên `*-data.png` ở thư mục gốc có thể đã được chụp sau khi backend kiểm thử tắt. Không dùng làm bằng chứng trạng thái có dữ liệu; ưu tiên `live-visual`.
- Typecheck/lint và kiểm thử hành vi không chứng minh pixel fidelity. Vẫn cần duyệt bố cục/state cho từng frame chưa nghiệm thu.

## Kiểm tra đang thực hiện

TypeScript và ESLint của các component đã sửa đã qua. 12 unit test và kiểm tra live data (113 runtime file) đã qua. `rewards-live-e2e.log` ghi đợt cuối: 13 bài browser + kiểm tra SQL độc lập đã qua, gồm bài mới kiểm tra tồn kho/danh mục và cổng chính sách của phần thưởng. Đã chụp 38 màn/trạng thái ở hai chiều rộng trong `live-visual/checks.json`. Bản đồ tải tile HTTP 200 tại cả hai chiều rộng. Mã email và mật khẩu mới đã được kiểm tra trong luồng khôi phục thật. Android/iOS đều export thành công (`rewards-native-build.log`). Một lượt chạy trước đó lỗi xác thực 401 ngay sau login; đợt chạy riêng cuối đã qua đủ 13 bài, chưa đủ bằng chứng quy nguyên nhân lỗi thoáng qua đó cho UI.

`reward-assets.json` xác nhận 33 asset không rỗng và kích thước gốc. Đã duyệt 8 ảnh `rewards-visual` ở 428×926 và 390×844 sau các chỉnh sửa lớp nền/đường nét đứt: không lỗi JavaScript, không tràn chiều ngang, asset tải thành công. Các ảnh này dùng API thường và trạng thái guest; không phải bằng chứng cho trạng thái có giao dịch.

Đợt luồng hoạt động: **16 unit test, TypeScript, ESLint và kiểm tra live data (120 runtime file) đã qua**. `events-live-e2e.log` ghi **14 bài browser + kiểm tra SQL độc lập đã qua**, gồm chọn ngày, chuyển tháng/tuần, hai hoạt động chồng giờ thật và cổng đăng ký 503. Không thay đổi giới hạn đăng nhập trên server: bộ E2E chủ động đợi cửa sổ 10 lần/5 phút khi cần, để không bị lỗi 429 trong lượt chụp ảnh.

`live-visual/checks.json` hiện ghi 44 màn/trạng thái ở hai chiều rộng; đã duyệt ảnh ba màn hoạt động cùng ảnh phần nội dung cuộn xuống (`event-detail-content-*`, `event-registration-bottom-*`, `event-calendar-bottom-*`) và `calendar-week-selected.png` có hai thẻ trùng giờ. `event-assets.json` ghi 29 asset gốc/derivative không rỗng. Android emulator đã hiển thị lưới lịch, chuyển tháng 11→12 và chuyển sang 7 ô ngày của chế độ tuần (`native/calendar*.png`, XML tương ứng). Các kiểm tra này chưa thay thế nghiệm thu đầy đủ các frame và trạng thái.

Sau khi harness dọn API/DB biệt lập, phải chạy `pnpm build` với cấu hình bình thường để bản preview không trỏ tới API kiểm thử đã tắt.

Đợt bốn màn hỗ trợ hoạt động (02/11): **16 unit test, TypeScript và ESLint đã qua**. `support-live-e2e.log` ghi **15 bài browser + kiểm tra SQL độc lập đã qua** (454,31 giây), gồm tạo/đổi tên/xóa bộ sưu tập, thêm hoạt động, chuyển đi/chuyển lại và kiểm tra sau reload; checkbox/công tắc bị khóa đúng, không tạo vé hay số liệu tổng kết. Một lượt trước đã tìm ra ARIA disabled của View không được truyền như mong đợi trên web; đã thêm thuộc tính ARIA rõ ràng và chạy lại thành công. Một lượt typecheck đồng thời bị thiếu bộ nhớ; chạy riêng sau khi browser đóng đã qua.

`live-visual/checks.json` có **52 trạng thái ở 428×926 và 390×844**, không tràn ngang, asset tải thành công và không lỗi JavaScript. Bốn màn mới có cả ảnh phần cuối; `event-collections-selected*.png` có dữ liệu thật từ DB biệt lập và lựa chọn chuyển bộ sưu tập. Ngày tổng kết sau lượt chụp được thống nhất sang `dd/MM/yyyy` bằng formatter múi giờ đã có kiểm thử. `event-assets.json` hiện xác nhận **66 asset/derivative không rỗng**; hình ảnh nội dung vẫn phụ thuộc dữ liệu API.

Android: `native/event-collections-guest-fixed.png` xác nhận vòng tròn/bóng nút quét sau fallback PNG. `native/event-summary-font130.png` và `native/event-summary-bottom-font130.png` kiểm tra bố cục tổng kết ở font 130%; đã sửa safe area để nội dung cuộn không chạy dưới thanh trạng thái và trả emulator về font 100%. Các ảnh native này là trạng thái guest/chưa có báo cáo, không chứng minh trạng thái có đăng ký hoặc kết quả xác minh.

`support-native-build.log` ghi export **Android và iOS thành công** với source cuối. Đây là kiểm chứng bundle, không phải nghiệm thu ảnh trên iPhone. Bản preview được export lại với API bình thường sau khi dọn môi trường E2E (`support-build.log`).
