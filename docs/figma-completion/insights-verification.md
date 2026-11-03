# Thống kê, thành tích và phản hồi thao tác — 02/11/2026

Đã nối dữ liệu và thao tác cho F17, phần thành tích F07 và âm thanh/rung F08. Đây là tiến độ của mục tiêu toàn bộ Figma; chưa đóng các nhóm còn lại hoặc nghiệm thu native.

- `/statistics`: khoảng 7/30 ngày, chuyển kỳ, biểu đồ phân bố và tần suất theo ngày, chi tiết vật liệu. Mọi số lượt và khối lượng lấy từ hoạt động của tài khoản. Nhập khối lượng cân là tùy chọn; giao diện ghi rõ tự khai báo, không coi đó là khối lượng được xác minh. Bản ghi cũ không có khối lượng vẫn giữ số lượt và điểm đúng.
- Mục tiêu cá nhân: tạo/sửa theo số lượt phân loại, kg tự khai báo hoặc lần check-in; khoảng ngày và múi giờ; tiến độ, hoàn thành/hết hạn; xác nhận lưu trữ. API kiểm chủ sở hữu, giới hạn 20 mục tiêu hoạt động, phiên bản chống ghi đè và idempotency khi tạo.
- `/achievements`: tổng điểm tích lũy/cấp bậc thật, bảng xếp hạng chỉ gồm người chủ động tham gia, tham gia/rời và lưu trạng thái. Công khai tên hiển thị và tổng điểm được giải thích trước khi tham gia. Bằng điểm xếp theo thời điểm tạo tài khoản rồi ID; loại tài khoản không hoạt động và chặn hai chiều.
- Bốn cột mốc tính từ bằng chứng hoạt động: phân loại lần đầu, 10 lần phân loại, check-in đầu tiên, chuỗi nhận điểm hằng ngày 7 ngày. Đây là quy tắc triển khai cho cột mốc hoạt động, không phải chứng nhận bên ngoài; không cộng điểm thưởng mới. Thời điểm đạt lấy từ bản ghi nguồn.
- Âm thanh/rung: công tắc đã lưu điều khiển phản hồi sau thao tác thành công, có nút thử và giới hạn tần suất. Clip cục bộ 180 ms, âm lượng 0,35; không ghi âm, không chạy nền, tôn trọng chế độ im lặng. Hai hiệu ứng bật/tắt độc lập, lỗi thiết bị không làm thất bại thao tác API.

Migration mới: `supabase/migrations/202611020007_insights_targets.sql`. Toàn bộ thao tác kiểm thử dùng PostgreSQL local tạm riêng; chưa áp dụng migration này lên cloud.

Kiểm chứng:

- **68 test API đạt**, gồm 6 test mới về dữ liệu trống, khối lượng, múi giờ, ownership/version/idempotency của mục tiêu, bảng xếp hạng tự nguyện/pagination/chặn và bằng chứng cột mốc. Ruff/mypy đạt.
- **23 test ứng dụng đạt**, gồm ba test điều khiển âm thanh/rung. TypeScript/ESLint/format và audit dữ liệu runtime đạt.
- **17/17 luồng browser → API → worker → PostgreSQL đạt**; Python harness và đối chiếu SQL độc lập đạt: [log](insights-browser.log). Kiểm việc nhập 1,25 kg, reload, biểu đồ, tạo/sửa/hoàn thành/lưu trữ mục tiêu, bảng xếp hạng hai tài khoản và lưu thiết lập hiệu ứng.
- **68 route**, **66 lượt bố cục** ở 390×844 và 428×926, không tràn ngang: [route](insights-runtime/runtime-routes.json), [kết quả](insights-runtime/checks.json). Hai test UI riêng thêm **16 ảnh** cho biểu đồ nhiều loại, editor, podium và cột mốc: [log](insights-layout-isolated.log), [ảnh](insights-layout-isolated). Fixture chỉ nằm trong bài test bố cục; suite tích hợp phía trên dùng HTTP và database thật.
- [Export Android/iOS đạt](insights-native-bundle.log). [Web đã export lại bằng cấu hình bình thường](insights-build-normal.log) sau harness.

Browser đã kiểm clip WAV được tải HTTP 200; unit test kiểm lệnh phát/rung và cờ bật/tắt. Những kiểm tra này chưa chứng minh nghe âm thanh hoặc cảm nhận rung trên thiết bị thật. Camera, thông báo và các tương tác native còn ngoài lượt dưới đây vẫn cần nghiệm thu.

Bổ sung lượt Android native trên emulator riêng **Android 32 / Expo Go 58.0.5**: [biên bản](native-verification.md), [log](native-integration.log). Đăng nhập qua API, hai lượt phân loại/khối lượng đã lưu, biểu đồ, tạo mục tiêu, tham gia bảng xếp hạng và mở lại khôi phục phiên/mục tiêu đều đạt. Harness kiểm SQL độc lập cho mục tiêu, lựa chọn tham gia và số lượt, rồi tự dọn database local tạm. Không suy rộng lượt này thành nghiệm thu mọi biến thể native hoặc phần cứng thật.

Đối chiếu dùng context chi tiết và ảnh Figma đã lưu: `391:25009` (thống kê), `386:7550` (thành tích). Giữ assets tĩnh gốc và dựng biểu đồ bằng dữ liệu thực, không đưa số mẫu của Figma vào dữ liệu người dùng. Kết nối file Figma gốc hiện chưa cho đọc lại với tài khoản đang kết nối, nên chưa tuyên bố đã đối chiếu thiết kế mới nhất.
