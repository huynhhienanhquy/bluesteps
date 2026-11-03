# Dữ liệu trình diễn Cộng đồng

Ngày 03/11/2026, thêm nội dung riêng cho phần Cộng đồng trên database development đang cấu hình:

- 3 hồ sơ hư cấu: Mai Anh, Minh Khang, Linh Chi.
- 4 bài công khai về bình nước cá nhân, góc phân loại rác, tận dụng cốc làm vỏ chậu và túi vải.
- 4 chủ đề: Giảm nhựa, Phân loại rác, Tái sử dụng, Sống xanh mỗi ngày.
- 8 bình luận, gồm 4 bình luận gốc và 4 phản hồi; 8 lượt thích từ các hồ sơ minh họa.

Vào **Trang chủ → Ghé cộng đồng** để xem bảng tin. Chọn **Chủ đề**, **Thành viên** hoặc mở bình luận của một bài để trình diễn các góc nhìn khác nhau. Nếu đang mở màn này, rời màn rồi quay lại để tải dữ liệu mới.

Các tài khoản minh họa dùng email `.invalid`, mật khẩu ngẫu nhiên bị loại bỏ và chưa xác minh email, nên không đăng nhập được. Trạng thái `active` chỉ để chúng xuất hiện trong truy vấn cộng đồng hiện có. Không tạo phiên đăng nhập, vai trò đặc quyền, outbox hay thông báo gửi cho người dùng. Không chỉnh tài khoản hay bài viết có sẵn.

Script chạy thủ công, không chạy cùng startup hoặc migration. UUID cố định và `ON CONFLICT DO NOTHING` tránh thêm trùng hoặc ghi đè nội dung khi chạy lại. Mọi thay đổi nằm trong một transaction.

## Các mục cá nhân

Đã bổ sung cho tài khoản đã dùng trong bộ dữ liệu hiển thị trước đây (`37c3c91a-0ff1-4ce6-8d7c-9c9c4c5d770d`):

| Mục | Dữ liệu demo |
| --- | --- |
| Đang theo dõi | Minh Khang, với bài “Góc phân loại nhỏ trong căn bếp” |
| Đã lưu | Bài “Một tuần mang bình nước cá nhân” của Mai Anh |
| Đã ẩn | Bài “Chiếc cốc cũ có nhiệm vụ mới” của Linh Chi |
| Đã chặn | Hồ sơ hư cấu Tuấn Phong, tách riêng khỏi các tác giả còn lại |
| Bạn bè | Mai Anh, quan hệ đã chấp nhận |

Chỉ những quan hệ demo được yêu cầu được thêm vào tài khoản này. Dữ liệu cá nhân của tài khoản khác không thay đổi. Không tạo thông báo, tin nhắn hay gửi lời mời ra ngoài. Nút bỏ ẩn, bỏ chặn và hủy kết bạn hoạt động qua API hiện có. Script từ chối nếu các tác giả demo đang bị tài khoản đích chặn, thay vì tự gỡ chặn.

Thêm tùy chọn `--user-id` khi cần chuẩn bị lại đủ năm mục cho một tài khoản cụ thể:

```powershell
& .venv/Scripts/python.exe scripts/seed_community_demo.py --allow-remote --user-id '<UUID tài khoản>' --dry-run
& .venv/Scripts/python.exe scripts/seed_community_demo.py --allow-remote --user-id '<UUID tài khoản>'
```

Kết quả đọc qua các API với danh tính tài khoản đích nằm trong `community-personal-demo-verification.json`. Kiểm tra đọc này sử dụng TestClient với danh tính được tiêm qua dependency, không tạo thêm phiên đăng nhập hoặc thay mật khẩu. Các test PostgreSQL riêng kiểm tra cả xác thực Bearer thực, quyền riêng tư giữa hai tài khoản và việc bỏ ẩn/bỏ chặn/hủy kết bạn.

Từ `apps/api`:

```powershell
& .venv/Scripts/python.exe scripts/seed_community_demo.py --allow-remote --dry-run
& .venv/Scripts/python.exe scripts/seed_community_demo.py --allow-remote
```

Bỏ `--allow-remote` khi dùng database localhost. Script chỉ chấp nhận môi trường development/test.

Kiểm chứng: `tests/test_community_demo.py` kiểm tra bài viết, thành viên, chủ đề, số bình luận và lượt thích qua API; kiểm tra chạy lại không thêm bản sao và giữ nội dung đã chỉnh. Kết quả đọc lại trên database ứng dụng được lưu tại `community-demo-verification.json`.
