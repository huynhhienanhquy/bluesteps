# Dữ liệu ứng dụng sau khi bỏ demo

Frontend không nạp fixture hoặc seed tự động. Đã gỡ provider demo, dữ liệu nội bộ, ví mẫu, bot trả lời cố định, các route `demo-tools`/`design-preview` và chế độ lỗi giả trong Cài đặt.

Dữ liệu hiển thị đến từ API Python và PostgreSQL. Các danh mục công khai chỉ trả bản ghi đã công bố và `synthetic=false` (quà dùng `state=published`). Dữ liệu tổng hợp của giai đoạn backend trước vẫn được đánh dấu `synthetic` và không xuất hiện trong ứng dụng. Bootstrap mới không seed dữ liệu nghiệp vụ.

Không dùng frontend để chuyển dữ liệu tổng hợp thành dữ liệu thật. Đơn vị vận hành cần nhập và duyệt nội dung, địa chỉ, lịch và danh mục từ nguồn xác thực bằng tài khoản quản trị database; không cấp quyền sửa danh mục cho runtime API hoặc ứng dụng.

Fixture chỉ còn ở backend để tạo dữ liệu trong database kiểm thử riêng. Bộ browser test tạo UUID và dữ liệu ngẫu nhiên trong PostgreSQL rồi thao tác qua HTTP thật, không intercept API. Công cụ thiết kế/demo cũ được lưu ngoài frontend ở [legacy-ui-tools](legacy-ui-tools/README.md).

Mất mạng hoặc server lỗi hiển thị lỗi/thử lại; danh mục trống hiển thị trạng thái trống. Không có fallback sang dữ liệu mẫu. Chi tiết hiện hành: [báo cáo tích hợp](live-integration.md).
