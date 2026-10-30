# BlueSteps frontend

Báo cáo UI mới nhất: [tiến độ ngày 30/10/2026](docs/ui-progress-2026-10-30.md) — ghi rõ từng chức năng **đã làm xong UI / đang trong tiến trình / chưa làm UI**, phần còn thiếu và bằng chứng. Độ phủ Figma: 69/175 frame có ánh xạ triển khai; chưa nghiệm thu hình ảnh toàn bộ.

Frontend mobile tiếng Việt bằng **Expo SDK 58 / React Native / TypeScript / Expo Router**, bám catalog và ảnh Home mới của `docs/figma-analysis`. Preview web dùng cùng mã nguồn native. SDK 58 được chọn để thử trên Expo Go cả iPhone và Android.

## Chạy ứng dụng

Để thử bằng Expo Go trên điện thoại, chạy `pnpm go`, nối điện thoại và máy tính cùng mạng rồi quét QR trong terminal. iPhone dùng Camera, Android dùng trình quét QR trong Expo Go. Cần Expo Go hỗ trợ SDK 58; hướng dẫn chi tiết ở [Expo Go](docs/expo-go.md).

Yêu cầu Node 22.14+ và pnpm 11.25.0.

```powershell
pnpm install --frozen-lockfile
pnpm web
```

Expo phục vụ preview ở URL được in trong terminal (mặc định `http://localhost:8081`). Để mở native dev server: `pnpm dev`. Android development build: `pnpm --filter @bluesteps/mobile android` sau khi có Android SDK/emulator hoặc thiết bị. iOS native build cần macOS/Xcode. Không cần API, Supabase hoặc biến môi trường để chạy demo.

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm format:check
pnpm check:native-config
pnpm build
pnpm preview
```

`build` export vào `apps/mobile/dist`; `preview` mở server cục bộ ở `http://127.0.0.1:4173` có fallback cho deep link. Server này chỉ phục vụ kiểm tra local.

`pnpm bundle:native` kiểm tra bundle JavaScript/Hermes Android và iOS ở `apps/mobile/dist-native`; lệnh này không tạo APK/IPA và không thay build/chạy thiết bị thật.

E2E trên Chromium:

```powershell
pnpm --filter @bluesteps/mobile exec playwright install chromium
pnpm --filter @bluesteps/mobile test:e2e
```

Nếu dùng Chromium có sẵn, đặt `PLAYWRIGHT_CHROMIUM_EXECUTABLE` tới executable đó. E2E tự chạy preview server; chạy `pnpm build` trước. Kết quả ảnh ở `docs/frontend-evidence`.

## Đã có

- 5 tab: Trang chủ, Thu gom, Quét rác, Đổi quà, Cá nhân; stack chi tiết và trang không tìm thấy.
- Home theo frame `391:25197`; semantic tokens dùng chung, theme system/light/dark, layout giới hạn chiều rộng trên màn lớn.
- Sổ tay: tìm kiếm, nhóm vật liệu, hướng dẫn và nhãn nguy hại.
- Scan: camera có xin quyền/torch/chụp lại, chọn ảnh cục bộ, xem trước, nhập tay, kết quả mẫu và xác nhận không phát điểm. Camera unmount khi tab mất focus.
- Thu gom: tìm kiếm/bộ lọc nháp–áp dụng/hủy, chi tiết, thêm/xóa/sắp xếp điểm dừng, hướng dẫn bàn giao và preview đề xuất/báo cáo.
- Hoạt động: thẻ ảnh/tìm tên và địa điểm không dấu/lọc, chi tiết, lưu có xác nhận xóa, lịch tháng/tuần, form số người/vai trò/liên hệ, vé và check-in mẫu, tổng kết/phản hồi cục bộ; bộ sưu tập và cấu hình nhắc lịch trong phiên.
- Điểm/quà: ví mẫu, danh mục, kiểm tra số dư minh họa, lịch sử điểm/quà đã có seed và command đổi quà thật bị khóa.
- Cộng đồng: thích/bỏ thích, soạn bài cục bộ; tin nhắn cục bộ, RecycleBot trả lời cố định có nhãn demo.
- Tin tức: grid, tìm kiếm không dấu/lọc chủ đề/sắp xếp, chi tiết, lưu và thích bài, thảo luận/trả lời cục bộ, theo dõi chủ đề, lịch sự kiện xanh và bản tin nhanh theo ngày; thẻ Home mở đúng bài `daily-waste`.
- Thông báo có trạng thái đã đọc/chưa đọc, onboarding, form đăng nhập/đăng ký/khôi phục, hồ sơ, cài đặt, thống kê tuần giả lập và luyện tập phân loại.
- Trong Cài đặt có thể bật dữ liệu trống/lỗi/tải chậm để kiểm tra loading/error/retry/empty.

## Chạy với mock data

Chạy `pnpm demo` để mở Expo web với seed đã nạp tự động, không cần `.env`, API hoặc database. Bộ mẫu gồm 10 mục sổ tay, 6 điểm thu gom, 7 hoạt động, 6 quà, 6 bài đọc/4 chủ đề/2 bình luận bài đọc, 5 bài cộng đồng, hồ sơ Linh Chi, ví 180 điểm, lịch sử điểm/quà, thống kê 4 tuần, 5 thông báo và 3 hội thoại.

Hành trình được nạp sẵn 2 điểm dừng; có 1 hoạt động đã lưu và 1 bài cộng đồng đã thích. Tin nhắn, lưu/thích bài đọc, bình luận và chủ đề theo dõi giữ nguyên khi chuyển màn trong cùng phiên. **Cài đặt → Khôi phục dữ liệu demo** đặt lại các thay đổi về seed ban đầu; reload cũng tạo phiên mới. Theme không bị đổi khi khôi phục dữ liệu. Đánh dấu đọc của bản tin nhanh chỉ giữ khi màn đó còn mở.

Chi tiết dữ liệu, vị trí chỉnh seed và kịch bản trình diễn: [mock-data](docs/mock-data.md).

## Ranh giới của bản này

**Đây là frontend demo, chưa phải ứng dụng production.** Toàn bộ điểm, quà, địa chỉ, lịch, hồ sơ và bài viết là dữ liệu tổng hợp. Save/like/message/composer chỉ tồn tại trong bộ nhớ phiên và mất khi reload. Tên BlueSteps dùng theo workspace, chưa coi decision branding đã chốt.

Camera/picker chỉ tạo bản xem trước cục bộ; chưa upload hoặc gọi recognition. Không ghi âm, lấy GPS, gọi map provider, AI, OAuth, API Python hay Supabase. Không cấp session thật, gửi OTP, đăng ký hoạt động/giữ chỗ, phát vé/QR có giá trị tham gia, tính thưởng hoặc giao quà. Vé/check-in/phản hồi hoạt động và cấu hình nhắc lịch chỉ là mô phỏng cục bộ; chưa hẹn/gửi thông báo hoặc email. Không tự triển khai call/video hay game mở rộng. Form đăng ký tài khoản kiểm độ dài mật khẩu 8–128 theo auth-policy, không thay quyết định server.

Kiến trúc: `apps/mobile/app` chỉ chứa routes; `src/features` chứa màn/tương tác; `src/design-system` chứa primitives; `src/services` là read adapter demo; `packages/design-tokens` là tokens. **Không tạo `src/app`**: Expo Router ưu tiên thư mục đó và sẽ bỏ qua route root `app`.

Khi có backend, nối generated client theo OpenAPI đã pin; thêm auth/secure storage, ownership, media upload, idempotency/reconciliation và test thiết bị trước khi mở command thật. Không chuyển fixture demo thành business rule. Execution pack gốc được giữ nguyên; frontend-first không đánh dấu packet backend là đã hoàn thành.

Kế hoạch và bằng chứng: [frontend-plan](docs/frontend-plan.md), [frontend-verification](docs/frontend-verification.md).
