# Chương trình điểm triển khai từ Figma

Quy tắc công khai trong API `/v1/reward-program`, lưu ở bảng cấu hình do migration owner quản lý; runtime không được sửa giá, tồn kho hoặc chương trình. Phiên bản đầu `2026-11-v1`:

- Phân loại tái chế +5, vô cơ +2, hữu cơ +3, theo frame `386:11320`.
- Điểm danh theo chuỗi bảy ngày: 2, 2, 3, 5, 3, 5, 10 điểm. Figma không ghi trị giá của hai rương ngày 4/7; triển khai hai mốc cố định +5/+10 và công bố số điểm, không có quay thưởng ngẫu nhiên.
- Một lần nhận mỗi ngày theo `Asia/Ho_Chi_Minh`, không theo timezone có thể đổi của tài khoản. Bỏ một ngày bắt đầu lại chuỗi; hết bảy ngày lặp chu kỳ.
- Tối đa 30 lượt phân loại có điểm mỗi ngày; vượt giới hạn vẫn lưu hành động nhưng không cộng thêm. Hành động vẫn là người dùng xác nhận/tự khai, không suy ra kg đã xác minh.
- Đổi quà dùng giá/phiên bản từ server, giữ tồn kho và trừ điểm trong cùng transaction. Không đủ điểm, hết hàng hoặc giá thay đổi sẽ rollback toàn bộ. Retry cùng key không trừ/cấp lặp.
- Trạng thái `reserved` nghĩa là đã giữ quà, chưa phải đã giao. Hủy trước khi giao trả đúng điểm và tồn kho một lần. Ban quản lý xác nhận giao quà bằng quyền moderator.

Các giá trị trên là cấu hình sản phẩm cụ thể được thêm để thực hiện yêu cầu hoàn thiện, không phải dữ liệu thưởng/tồn kho giả theo ảnh thiết kế. Khi triển khai môi trường thật cần dùng danh mục/giá/kho do đơn vị vận hành công bố.
