# BlueSteps

Ứng dụng Expo/React Native đã nối API Python/FastAPI và PostgreSQL/PostGIS. Chức năng quét rác gửi ảnh chụp hoặc ảnh thư viện tới API để nhận diện bằng trọng số **EfficientNetB0_FastKAN** đã train, hiển thị 10 nhóm rác, độ tin cậy và hướng dẫn phân loại tương ứng. Xem [cấu hình và kiểm chứng mô hình](docs/waste-model-integration.md).

Bộ dữ liệu hiển thị đã có đủ 3 nhóm rác, 9 vật phẩm, bài đọc, hoạt động, điểm thu gom, quà và ảnh minh họa; dữ liệu cá nhân được thêm vào đúng tài khoản đã chọn. Xem [hướng dẫn và bằng chứng](docs/display-data.md).

Backend trong workspace đã chuyển sang Supabase PostgreSQL qua Session pooler, TLS `verify-full` và login runtime riêng. Database local cũ được giữ nguyên; cấu hình trước chuyển đổi được sao lưu trong thư mục `.local` bị gitignore. Xem [báo cáo kết nối Supabase](docs/supabase-connection.md).

Đã tối ưu tải dữ liệu ở API và khi quay lại màn hình; xem [kết quả đo hiệu năng](docs/data-loading-performance.md).

## Chạy local

Yêu cầu Node 22.14+, pnpm 11.25.0, Python 3.12 và PostgreSQL 17/PostGIS. Workspace hiện tại đã có môi trường backend và database local cổng 55432. Cài mới theo [hướng dẫn API](apps/api/README.md).

Sau khi đã cấu hình backend, chạy `pnpm dev:connected` để mở frontend development tại `http://localhost:8081`, API và worker cùng nhau. Lệnh kiểm tra database/API trước khi mở frontend; tự khởi động lại portable PostgreSQL của workspace nếu cấu hình dùng cluster local cổng 55432. API đang ready sẽ được tái sử dụng. Ctrl+C chỉ dừng các process do lệnh này tạo. Lệnh này dành cho web trên máy tính; điện thoại dùng [cấu hình LAN](docs/expo-go.md).

Để chạy app trên điện thoại bằng Expo Go, dừng phiên web rồi chạy `pnpm go:connected`, nối điện thoại cùng Wi-Fi và quét QR mới trong terminal. Lệnh này mở API LAN và tự truyền đúng địa chỉ API vào app.

Nếu điện thoại gặp timeout qua LAN, dùng `pnpm go:tunnel:connected` để mở tunnel tạm thời cho cả bundle và API. Dừng phiên cũ trước, rồi quét QR mới. Người dùng đã cho phép chế độ tunnel trong phiên khắc phục lỗi; xem phạm vi và cách đóng tunnel ở [Expo Go](docs/expo-go.md).

```powershell
pnpm install --frozen-lockfile
# Mỗi lệnh chạy trong một terminal riêng
pnpm api:dev
pnpm api:worker
pnpm web
```

API ở `http://127.0.0.1:8000`, Swagger ở `http://127.0.0.1:8000/docs`. Worker giao thông báo và email xác minh vào `apps/api/.local/mail` trong môi trường phát triển; chưa gửi email ra ngoài. Đăng ký tài khoản mới từ ứng dụng, lấy mã trong file email local để xác minh rồi đăng nhập. Tài khoản mới có ví 0 điểm.

Frontend chỉ nhận `EXPO_PUBLIC_API_URL`, tuyệt đối không nhận DB URL hoặc khóa server. Với web local có thể bỏ biến này để dùng hostname hiện tại ở cổng 8000. Khi đặt URL khác, thêm chính xác origin của web vào `BLUESTEPS_CORS_ORIGINS` trong cấu hình API và khởi động lại. Xem [hướng dẫn Expo Go](docs/expo-go.md) cho điện thoại.

## Phạm vi đã kết nối

- Đăng ký, xác minh, đăng nhập, khôi phục/đổi mật khẩu, refresh và thu hồi phiên; SecureStore trên native, cookie HttpOnly trên web.
- Hồ sơ, cài đặt, onboarding, thống kê, ví và lịch sử theo tài khoản.
- Sổ tay, bài đọc, chủ đề theo dõi, lưu/thích và thảo luận; bài cộng đồng, hội thoại, tin nhắn và thông báo.
- Điểm thu gom, đánh giá/báo cáo, đề xuất nháp; hành trình và bàn giao tự khai; hoạt động, lịch và bộ sưu tập đã lưu.

Quét nhận diện dùng mô hình thật trên CPU của backend. Độ tin cậy dưới 60% yêu cầu chụp lại hoặc tra cứu thủ công. Chỉ thao tác xác nhận đã phân loại mới tạo giao dịch tính điểm theo chính sách máy chủ; ảnh nhận diện không được lưu vào database. Các khả năng khác phụ thuộc cấu hình provider và chính sách nghiệp vụ hiện hành.

## Kiểm tra

```powershell
pnpm check
pnpm bundle:native
pnpm --filter @bluesteps/mobile check:live-data
pnpm api:check
pnpm api:types
pnpm --filter @bluesteps/api-client typecheck
pnpm --filter @bluesteps/api-client test
```

Các test PostgreSQL cần `BLUESTEPS_TEST_ADMIN_URL` trỏ đến server local dùng riêng. Bộ kiểm thử browser thật tự tạo database, API và worker riêng; chạy bằng `apps/api/.venv/Scripts/python.exe -m pytest apps/api/tests/test_mobile_e2e.py`. `pnpm test:e2e` trực tiếp không thay thế harness này.

`pnpm build` xuất web vào `apps/mobile/dist`; `pnpm preview` phục vụ bản xuất tại `http://127.0.0.1:4173`. `pnpm bundle:native` xuất bundle Android/iOS, không tạo APK/IPA hoặc thay kiểm thử trên thiết bị.

Route nằm trong `apps/mobile/app`, màn hình và logic được chia theo chức năng trong `apps/mobile/src/features` ([cấu trúc thư mục](apps/mobile/src/features/README.md)), kết nối trong `apps/mobile/src/services`, contract trong `packages/api-client`, SQL chuẩn trong `supabase/migrations`.
