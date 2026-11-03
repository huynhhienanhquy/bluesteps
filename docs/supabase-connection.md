# Kết nối Supabase

Ngày 03/11/2026: đã áp dụng thêm 19 migration còn thiếu, từ `202611020001_event_participation.sql` đến `202611030019_handover_guidance.sql`; database hiện có đủ 24 migration của repository. Việc này bổ sung schema nhắc lịch còn thiếu gây worker lỗi `app_private.event_reminder_jobs`. Các số liệu 5 migration/48 bảng bên dưới là trạng thái lịch sử trước lần cập nhật này.

Đã chuẩn bị danh mục và dữ liệu cá nhân để hiển thị trong app; xem [báo cáo dữ liệu hiện hành](display-data.md). API và bản web kiểm tra chạy local, database lưu trên Supabase.

Cập nhật 02/11/2026: đã thêm 3 dòng mẫu cho mỗi bảng trong 48 bảng `app_private` (144 dòng), giữ nguyên dữ liệu có sẵn. Xem [hướng dẫn dữ liệu mẫu](sample-data.md) và kết quả kiểm chứng. Các ghi nhận database trống bên dưới là trạng thái tại thời điểm chuyển kết nối ban đầu.

Đã chuyển backend workspace sang Supabase project `dpfaimkykjibpzbwksaf` qua Session pooler `aws-0-eu-west-1.pooler.supabase.com:5432`. Frontend vẫn gọi API Python; không kết nối trực tiếp database và không nhận credentials Supabase.

## Xem bảng trong Dashboard

Mở đúng project `dpfaimkykjibpzbwksaf`, vào Table Editor và đổi schema từ `public` sang `app_private`. Các bảng nghiệp vụ không được tạo trong `public`. Đã truy vấn lại database cloud sau phản ánh không thấy bảng: có đủ 48 bảng trong `app_private` (gồm `users`, `profiles`, `wallets`, `posts`, `messages`, `events`, `collection_points` và các bảng còn lại).

Có thể kiểm tra trực tiếp bằng SQL Editor:

```sql
select table_schema, table_name
from information_schema.tables
where table_schema = 'app_private' and table_type = 'BASE TABLE'
order by table_name;
```

Không cần tạo lại bảng hoặc đưa schema này vào Data API để xem từ Dashboard. Quyền truy cập của app vẫn qua backend Python.

- Đã áp dụng 5 migration của repository: 48 bảng nghiệp vụ trong `app_private`, PostGIS và quyền runtime.
- API/worker dùng login ngẫu nhiên riêng kế thừa `bluesteps_runtime`, không phải owner, superuser hoặc BYPASSRLS. Runtime không được UPDATE point ledger.
- Kết nối dùng `sslmode=verify-full` và Supabase Root 2021 CA, kiểm chứng cả CA và hostname. CA được lưu tại `apps/api/.local/supabase-ca.crt`, tải qua HTTPS từ kho chứng chỉ Supabase.
- URL owner dùng cho migration; URL runtime dùng cho API/worker. Cả hai chỉ nằm trong `apps/api/.env` bị gitignore. Bản cấu hình local cũ nằm trong `apps/api/.local/pre-supabase.env`.
- Đã thử ghi/đọc bằng runtime và rollback, không giữ dữ liệu kiểm tra. Không seed mock content và không chuyển dữ liệu local lên cloud.

Chạy `pnpm dev:connected` tại root để mở API 8000, worker và frontend development 8081. Readiness chờ tối đa 10 giây mỗi request để hỗ trợ độ trễ database cloud.

Các migration tiếp theo dùng runner của repository, từ `apps/api`:

```powershell
& .venv/Scripts/python.exe -m bluesteps_api.cli migrate --allow-remote
```

Không dùng URL Supabase làm `BLUESTEPS_TEST_ADMIN_URL`; integration tests tạo/drop database chỉ chạy trên PostgreSQL local dùng riêng. Database local cũ vẫn được giữ cho kiểm thử và không tự đồng bộ với cloud.

Hiện backend/frontend vẫn chạy trên máy phát triển. Email OTP vẫn được worker giao vào file local, chưa gửi SMTP ra ngoài. Kết nối database cloud không đồng nghĩa đã deploy API hoặc phát hành ứng dụng production.

Kiểm chứng sau chuyển đổi: readiness API trả 200; 5 danh mục trả 200 với dữ liệu trống; browser mở Home và Thu gom, nhận phản hồi API thực và không có page error. Checksum 5 migration trên cloud khớp source, 48/48 bảng bật RLS, `anon`/`authenticated` không có USAGE schema riêng. Supabase hiện có PostGIS 3.3.7 và chưa có tài khoản người dùng. Không chạy suite tạo/drop database lên cloud.

Hướng dẫn nhà cung cấp: [PostgreSQL connections](https://supabase.com/docs/guides/database/connecting-to-postgres), [SSL](https://supabase.com/docs/guides/platform/ssl-enforcement).
