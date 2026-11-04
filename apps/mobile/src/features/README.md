# Các chức năng mobile

Mỗi thư mục gom màn hình, component, hook và logic của một chức năng. Route trong `app` trỏ tới màn hình tương ứng; test nằm cạnh module được kiểm thử.

| Thư mục         | Nội dung                                                     |
| --------------- | ------------------------------------------------------------ |
| `assistant`     | Trợ lý và hướng dẫn trả lời                                  |
| `auth`          | Đăng nhập, đăng ký, xác minh, khôi phục mật khẩu và khóa PIN |
| `collection`    | Điểm thu gom, bản đồ, hành trình và chỉ đường                |
| `community`     | Bài cộng đồng, soạn bài, bình luận và bạn bè                 |
| `events`        | Hoạt động, lịch, đăng ký, vé, nhắc lịch và bộ sưu tập        |
| `games`         | Các trò chơi                                                 |
| `handbook`      | Sổ tay, hướng dẫn và kiểm tra khối lượng phân loại           |
| `home`          | Trang chủ                                                    |
| `messages`      | Hội thoại, tin nhắn và ghi chú                               |
| `news`          | Bài đọc, chủ đề, danh sách đọc và thảo luận bài viết         |
| `notifications` | Hiển thị và xử lý thông báo                                  |
| `onboarding`    | Giới thiệu ứng dụng và lựa chọn ban đầu                      |
| `profile`       | Hồ sơ, ảnh đại diện, thành tích và thống kê                  |
| `rewards`       | Quà tặng, đổi quà, điểm danh và lịch sử điểm                 |
| `scan`          | Chụp ảnh, nhận diện và xác nhận phân loại                    |
| `settings`      | Cài đặt và quản lý phiên đăng nhập                           |
| `shared`        | Component và tiện ích dùng chung giữa các chức năng          |

Giữ các biến thể nền tảng như `.tsx` và `.web.tsx` cùng thư mục. UI nền tảng nằm trong `src/design-system`; truy cập API và lưu trữ nằm trong `src/services`.
