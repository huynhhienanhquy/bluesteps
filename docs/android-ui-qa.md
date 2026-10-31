# Kiểm tra UI app trên Android

Suite Hoạt động: `pnpm --filter @bluesteps/mobile test:android:events`, cùng profile ADB bên dưới. Kiểm tám biến thể chi tiết, Quan tâm hai chiều, ảnh/modal, lưu/xóa có xác nhận, preview độc lập và font 130%. Ảnh/cây UI/log ở `docs/ui-progress-evidence-2026-10-31/native-events`; dùng `qa-report.json` cùng log của **lượt mới nhất hoàn tất** để kết luận. Lần thất bại/bị dừng không phải lượt đạt. Suite khôi phục font trong `finally`; nếu bị dừng cưỡng bức, khôi phục `font_scale` bằng ADB trước lượt mới. Suite chỉ chọn Wait khi đúng hộp thoại **Android System UI** timeout lúc boot và ghi `environmentNotes`; không bỏ qua ANR của app.

Nguồn thiết kế cho suite này chỉ thuộc **backuped (`386:7053`)**. Blur/shadow SVG dùng PNG trong suốt từ vector gốc để Android render đủ filter; xem `event-detail-native-derivatives.json`. Capture là viewport, có thể có overlay Expo Go; chưa nghiệm thu full-frame Figma, thiết bị thật hoặc iOS.

Lượt 31/10 hoàn tất **7/7 nhóm, 22 capture**, không lỗi runtime. Sau sửa phân dòng U+2028, chạy `pnpm --filter @bluesteps/mobile exec node scripts/check-android-event-ui.cjs --copy-only` để kiểm riêng chữ 100%/130%, giữ báo cáo đầy đủ bảy nhóm; follow-up **2/2 nhóm, 4 capture** ở `native-event-copy`. `record-event-native-evidence.cjs` chỉ ghi mapping khi báo cáo đầy đủ đạt, các file ảnh/XML tồn tại và log runtime không lỗi; nếu có báo cáo follow-up thì cả hai bước phải đạt. [Kết quả và giới hạn](ui-progress-2026-10-31.md).

`apps/mobile/scripts/check-android-ui.cjs` chạy trực tiếp qua ADB trên **emulator QA riêng**, không dùng trình duyệt. Profile đã kiểm ngày 31/10/2026: Android 12/API 32, ảnh hệ thống Google APIs x86_64, màn 1080 × 2340, density 480 (360 dp), Expo Go SDK 58. Máy ảo được lưu local trong `.native-qa/avd` và bỏ qua Git.

Mở emulator trước. Với profile local đã chuẩn bị trong workspace:

```powershell
$env:ANDROID_HOME = 'C:\Users\DELL\AppData\Local\Android\Sdk'
$env:ANDROID_AVD_HOME = 'D:\BlueSteps\.native-qa\avd'
& "$env:ANDROID_HOME\emulator\emulator.exe" -avd BlueStepsQA -no-window -no-audio -no-snapshot -gpu swiftshader_indirect -port 5556
```

Sau khi emulator boot xong, chạy Metro trong terminal khác:

```powershell
$env:ANDROID_HOME = 'C:\Users\DELL\AppData\Local\Android\Sdk'
pnpm --filter @bluesteps/mobile exec expo start --go --localhost --android --port 8091
```

Đóng hướng dẫn/menu ban đầu của Expo Go, để app BlueSteps đang mở. Trong terminal khác:

```powershell
$env:ANDROID_SERIAL = 'emulator-5556'
pnpm --filter @bluesteps/mobile test:android
```

Có thể đặt `ADB_PATH`, `ANDROID_HOME`, `ANDROID_SERIAL`, `EXPO_QA_URL` khi đường dẫn hoặc cổng khác. Script yêu cầu emulator với đúng độ phân giải của profile; không chạy trên điện thoại cá nhân. Nó chỉ dùng dữ liệu demo/preview, đổi font giữa 100% và 130%, rồi khôi phục font ban đầu trong `finally`.

Các luồng kiểm tra gồm tìm theo tên/địa điểm hoạt động, xóa bộ lọc, lưu/bỏ lưu; mở rộng/thu gọn bài đọc bằng nút accessibility; lưu/thích và mở đúng thảo luận; tạo bộ sưu tập khi bàn phím đang mở; mở tám bài có thiết kế riêng; và kiểm chữ lớn không chồng lên tiêu đề trong phần hậu quả của bài `daily-waste`.

Ảnh PNG, cây UI XML, log runtime và `qa-report.json` được ghi tại `docs/ui-progress-evidence-2026-10-31/native`. Báo cáo chỉ đánh dấu một bước đạt sau khi thao tác và kiểm tra kết quả trên cây UI. Ảnh có thể còn nút Tools của Expo Go. Không xem ảnh chụp hoặc các bước smoke này là chứng minh giống Figma toàn frame, kiểm camera/picker, APK/IPA, iOS hoặc điện thoại thật.
