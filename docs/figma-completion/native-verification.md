# Kiểm thử Android native — 02/11/2026

Đã chạy ứng dụng hiện hành trong **Expo Go 58.0.5**, emulator **BlueStepsQA32**, Android API 32 x86_64, 1080×2400 / density 420. Đây là emulator riêng trong workspace; không thao tác điện thoại/tài khoản cá nhân hoặc database cloud.

Luồng mở đầu:

- Mở thẳng `exp://127.0.0.1:8092/--/login` khi cài mới vẫn tới giới thiệu; không có lối đăng nhập sớm.
- Đi tuần tự chào mừng → giảm dùng một lần → tái sử dụng → thử phân loại Chai nhựa → sở thích → mục tiêu → điểm gần → lời nhắc → sẵn sàng → đăng nhập. Chọn Tái chế có phản hồi đúng, chọn sở thích/mục tiêu và tiếp tục được.
- Không có nút Google/Facebook. Sau hoàn tất, force-stop và mở lại `/login` giữ quyền vào form email/mật khẩu, không bắt lặp giới thiệu.
- [Log thao tác](native-onboarding.log), [kết quả](native-runtime/onboarding-result.json), [ảnh và XML](native-runtime): `01-welcome` đến `10-login`, `login-restored`. Splash tự chuyển trước lúc chụp; không tuyên bố đã chụp riêng frame splash native.

Luồng có tài khoản:

- Backend chạy trên loopback 8093 với role runtime và database PostgreSQL local tạm do fixture tạo; dữ liệu nền có hai lượt phân loại, trong đó một lượt có 1,250 kg tự khai báo.
- Nhập email/mật khẩu tài khoản fixture bằng bàn phím Android; đăng nhập qua HTTP, mở trang chủ và thống kê. Biểu đồ/số lượt đọc từ API thật, không intercept response hoặc bật dữ liệu demo.
- Mở modal, nhập và lưu `Native target` (10 lượt); vào Thành tích, chủ động tham gia bảng xếp hạng, thấy hạng 1.
- Force-stop Expo Go rồi mở thống kê: phiên được khôi phục từ native storage, vẫn đọc hai lượt và mục tiêu đã lưu.
- Harness đối chiếu SQL độc lập: mục tiêu thuộc đúng người dùng/metric/target, `opted_in=true`, số sorting action vẫn bằng 2. Database/login tạm được dọn khi kết thúc.
- **1/1 harness đạt trong 125 giây**: [log](native-integration.log), [thao tác UTF-8](native-integration-actions.log), [kết quả](native-runtime/integration-result.json). Lượt cuối kiểm đúng AVD, từ chối cổng API bận và chỉ nhận nội dung có bounds hiển thị. Ảnh/XML `11-authenticated-home` đến `18-restored-target` là bằng chứng bổ sung. Đã xem ảnh biểu đồ, modal, Thành tích và mục tiêu sau mở lại; nội dung, nút và các ô nhập hiển thị đúng trong viewport/scroll.

Lượt đầu phát hiện harness chưa chờ modal render; đã thêm bước chờ. Cũng sửa mã hóa stdout của Python trên Windows; không đổi logic ứng dụng để làm bài test qua. UIAutomator báo `null root node` hai lần trong lúc ứng dụng khởi động lại; các bước đọc kế tiếp nhận được cây đúng và toàn bộ assertion/SQL đạt.

Công cụ tái lập:

1. Đảm bảo Android SDK có emulator/adb và image `android-32/google_apis/x86_64` đầy đủ kernel/system/ramdisk, rồi chạy `./scripts/start-android-qa.ps1`. Launcher dùng thư mục `.backend-tools` riêng, nhận diện emulator đã chạy và không tạo bản trùng hoặc thay thiết bị khác.
2. Cài Expo Go tương thích SDK 58 vào `emulator-5556` (lượt này dùng APK đã có trong cache); chạy Metro local cổng 8092 với `EXPO_PUBLIC_API_URL=http://10.0.2.2:8093`, `EXPO_OFFLINE=1`. Dùng `adb -s emulator-5556 reverse tcp:8092 tcp:8092` cho bundle.
3. Với cài mới, mở app, đóng developer menu của Expo Go rồi chạy `node apps/mobile/scripts/android-qa.cjs onboarding` từ workspace. Lượt này không gọi backend.
4. Đặt `BLUESTEPS_RUN_NATIVE_E2E=1`, `BLUESTEPS_TEST_ADMIN_URL` trỏ PostgreSQL **localhost** dùng riêng. Chạy `apps/api/.venv/Scripts/python.exe -m pytest apps/api/tests/test_native_e2e.py -q -s` từ workspace hoặc tương đương từ `apps/api`. Không chạy harness đồng thời với một backend khác ở cổng 8093.

Script QA chỉ chấp nhận `emulator-5556` có AVD tên `BlueStepsQA32`; không chọn thiết bị vật lý. Những dữ liệu/tên/password fixture là riêng bài test, không phải tài khoản triển khai.

Giới hạn: lượt này chưa kiểm camera/picker phần cứng, âm thanh/rung thực tế, thông báo local/remote, GPS, toàn bộ luồng sự kiện/quà và các trạng thái native khác; chưa kiểm iOS hoặc development/release build. Emulator chạy headless và tắt âm thanh. Còn bước đối chiếu file Figma gốc khi kết nối có quyền; không dùng kết quả này để đóng mục tiêu toàn bộ Figma.

Bổ sung sau lượt trên: [quét native](scan-verification.md) đã kiểm camera emulated toàn màn hình, trạng thái thành công, xác nhận phân loại/nhận điểm và mở lại biên nhận qua API/SQL local. [Log mới](scan-native-integration.log) và [ảnh mới](scan-native-runtime) được giữ riêng, không ghi đè bằng chứng giới thiệu cũ.
