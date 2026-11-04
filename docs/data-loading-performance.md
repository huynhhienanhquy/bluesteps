# Tối ưu tải dữ liệu

Ngày 04/11/2026, đo API local kết nối Supabase Session pooler hiện cấu hình.
Một lượt trao đổi database mất khoảng 202–210 ms. Trước thay đổi, mỗi request
danh mục thực hiện ping, BEGIN, SET LOCAL TIME ZONE, SELECT và commit.

UTC được chuyển sang tham số khởi tạo kết nối PostgreSQL, giữ các libpq options
khác trong URL. Nhờ đó mỗi request bỏ được một lượt mạng; vẫn kiểm tra kết nối
khi lấy từ pool và commit/rollback trước khi trả response.

| API | Trung vị trước | Trung vị sau | Giảm |
| --- | ---: | ---: | ---: |
| `/v1/events` | 992 ms | 787 ms | 20,7% |
| `/v1/articles` | 999 ms | 791 ms | 20,8% |
| `/v1/waste-items` | 1.180 ms | 981 ms | 16,9% |

Mỗi endpoint được đo luân phiên 5 lượt trước và 5 lượt sau trên cùng engine;
cả 30 GET trả 200. Đây là thời gian API trực tiếp qua FastAPI TestClient trên
máy phát triển, chưa bao gồm hiển thị giao diện hoặc mạng điện thoại. Độ trễ
cloud vẫn ảnh hưởng thời gian tải lần đầu.

Các thay đổi bổ sung:

- Trang chủ, danh mục quà, tin đã lưu và chi tiết điểm thu gom dùng dữ liệu
  còn mới khi quay lại màn hình; truy vấn đang chạy được dùng tiếp. Dữ liệu
  hết hạn vẫn được tải lại khi quay lại và các thao tác ghi vẫn invalidation
  cache như trước.
- Danh mục sổ tay `recycle`, `organic`, `inorganic` gửi trực tiếp
  `category_key`, bỏ bước chờ tải danh sách category để lấy ID.
- Dữ liệu tham khảo công khai của sổ tay tải song song với khôi phục phiên
  đăng nhập và dùng cache chung; dữ liệu cá nhân vẫn chờ xác thực và bị xóa
  khi đổi/thoát tài khoản.
- Danh sách 20 mục tiêu cá nhân giảm từ 21 xuống 2 truy vấn, giữ cách tính
  biên ngày/múi giờ bằng Python ZoneInfo và lọc theo tài khoản.
- Chi tiết hướng dẫn vật phẩm gộp 3 truy vấn thành 1; giữ bộ lọc công bố,
  ưu tiên tài liệu theo vật liệu và các nguồn tham khảo.

Kiểm thử hồi quy nằm trong `apps/api/tests/test_db_loading.py`,
`test_target_loading.py`, `test_handbook_loading.py`,
`apps/mobile/src/services/__tests__/query-focus.test.tsx` và
`resource-loading.test.tsx`.
Các bài kiểm thử database dùng database local riêng, không tạo/xóa dữ liệu
trên Supabase. Không cần migration cho thay đổi này. Khởi động lại API nếu
đang chạy không có `--reload` để áp dụng cấu hình kết nối mới.

Kiểm chứng sau cập nhật:

- 180 test backend qua: 169 ở lượt kiểm tra rộng, 11 qua khi chạy lại sau khi
  chuyển thư mục tạm vào workspace và chuẩn hóa phép so sánh timestamp trong
  test mới. Hai test E2E không nằm trong lượt này.
- 17 test frontend tập trung qua; bộ kiểm thử cache phiên cũng được chạy lại
  sau chỉnh sửa kiểu dữ liệu và qua cả 3 test.
- Ruff/format cho 6 file Python thay đổi đều qua. ESLint cho các service,
  test và phần màn hình kiểm tra tập trung qua; Prettier cho 12 file frontend
  thay đổi qua.
- TypeScript có 28 lỗi ở cả source gốc và source sau sửa, không phát sinh lỗi
  mới. Kiểm tra toàn repo vẫn có lỗi lint/format/mypy ở mã có sẵn; hai màn
  News/Rewards còn 3 lỗi lint cũ. Suite CollectionPhotos chưa khởi chạy được
  do cấu hình Jest ESM hiện có của `@noble/hashes`.
