# Dữ liệu mẫu database

**Cập nhật hiển thị:** sau lượt seed ban đầu bên dưới, đã xuất bản danh mục mẫu và bổ sung dữ liệu cho tài khoản được chọn. Xem [dữ liệu hiển thị hiện hành](display-data.md). Phần `synthetic=true` bên dưới mô tả trạng thái của lần seed ban đầu.

Ngày 02/11/2026, thêm **3 dòng mẫu vào mỗi bảng trong 48 bảng `app_private`**, tổng cộng **144 dòng** trên Supabase đang cấu hình trong `apps/api/.env`. Dữ liệu có sẵn được giữ nguyên, vì vậy một số bảng có tổng số dòng lớn hơn 3. Schema hệ thống Supabase, bảng migration và PostGIS không thuộc bộ dữ liệu này.

Xem bằng Supabase Dashboard → Table Editor → chọn schema **`app_private`**. Kết quả đọc lại sau commit nằm trong sample-data-verification.json, gồm số dòng trước/sau, số dòng thêm và số dòng mẫu của từng bảng.

Script [seed_sample.py](../apps/api/scripts/seed_sample.py) dùng UUID ổn định và khóa chính để tránh trùng khi chạy lại. Tất cả thao tác thêm chạy trong một giao dịch; lỗi ràng buộc sẽ rollback. Script không được gọi bởi startup hay migration và không thay đổi quyền database.

Từ `apps/api`:

```powershell
# Kiểm tra ràng buộc rồi rollback, không giữ dữ liệu.
& .venv/Scripts/python.exe scripts/seed_sample.py --allow-remote --dry-run

# Thêm dữ liệu vào database development/test đã cấu hình.
& .venv/Scripts/python.exe scripts/seed_sample.py --allow-remote
```

Với database localhost, bỏ `--allow-remote`. Lệnh dùng URL migration owner từ `.env`; không in credentials. Không chạy bộ pytest tạo/drop database trên Supabase.

Các dòng mẫu có mã `sample-*`, nhãn `[Mẫu]` hoặc liên kết đến tài khoản mẫu. Tài khoản mẫu dùng email miền `.invalid`, trạng thái `locked`, mật khẩu ngẫu nhiên bị loại bỏ; không cung cấp tài khoản đăng nhập demo. Phiên và challenge đã hết hạn/thu hồi, outbox đã đánh dấu xử lý để không phát sinh gửi thư. Vai trò editor chỉ gán cho ba tài khoản mẫu bị khóa.

Năm danh mục `waste_items`, `collection_points`, `events`, `articles`, `rewards` có `synthetic=true` theo quy ước hiện tại: **xem được trong database nhưng API danh mục không hiển thị**. Điểm thu gom, sự kiện và tồn kho đều là minh họa. Bài đăng công khai có nhãn `[Mẫu]` có thể xuất hiện trong cộng đồng.

Để giữ đúng 3 dòng mỗi bảng, cuộc trò chuyện là ba bản xem trước một thành viên, không mô phỏng hội thoại trực tiếp hai người. Ví là ảnh chụp tài khoản có số dư đầu kỳ lịch sử 1.000 điểm và một giao dịch đổi quà gần nhất mỗi người; ba dòng ledger không đại diện toàn bộ lịch sử tích điểm. Số dư ví sau giao dịch, chi phí đổi quà và lượng hàng dành trước khớp nhau.

Kiểm chứng: chạy thử 144 insert rồi rollback; ghi chính thức và đọc lại 48/48 bảng, mỗi bảng đủ 3 khóa mẫu; chạy thử lần nữa phải thêm 0 dòng. Script cũng được kiểm tra bằng Ruff và mypy.
