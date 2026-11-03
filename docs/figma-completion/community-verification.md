# Cộng đồng: khám phá và tương tác

Ngày kiểm tra: 02/11/2026. Nhóm F13 trong mục tiêu hoàn thiện luồng Figma; F14 media/địa điểm/cảm xúc/bạn bè vẫn là phần việc riêng còn mở.

## Phạm vi đã nối

- `/community` có Bài viết, Thành viên, Chủ đề; tìm kiếm và chủ đề được giữ trong URL. API lọc trước phân trang, cursor gắn với người xem/bộ lọc.
- `/community?member=<id>` lấy tên, giới thiệu, số bài đang hiển thị và số theo dõi từ API; không dùng người hoặc số liệu mẫu trong Figma làm dữ liệu ứng dụng. Có theo dõi/bỏ theo dõi, bảng tin đang theo dõi và mở hội thoại thật.
- Bài viết có chủ đề tùy chọn, thích, bình luận, lưu/bỏ lưu, tùy chọn và chia sẻ. Chủ đề cộng đồng được tổng hợp từ bài có quyền xem, tách khỏi chủ đề tin tức.
- Hộp tùy chọn có sao chép liên kết, lưu và ẩn bài. Ẩn là tùy chọn riêng của người xem; không xóa bài của tác giả. Bài đã ẩn không xuất hiện trong bảng tin, bài đã lưu, kết quả chủ đề hoặc trang thành viên của người xem đó. Có danh sách đã ẩn để hiện lại; đường dẫn trực tiếp vẫn kiểm tra quyền xem.
- Chặn có xác nhận, loại quan hệ theo dõi cả hai chiều và ngăn khám phá/xem/tương tác với nội dung của nhau. Danh sách đã chặn cho phép bỏ chặn; bỏ chặn không tự theo dõi lại.
- Chia sẻ mở trình chia sẻ hệ thống; không báo đã gửi hoặc tăng số lượt chia sẻ khi chưa có bằng chứng. Clipboard chỉ báo thành công khi API hệ thống trả về thành công. Liên kết dùng origin/scheme đang chạy, không cấp quyền đọc bài riêng tư.

## Dữ liệu và quyền

Migration `202611020010_community_discovery.sql` thêm `posts.topic`, `member_follows` và `hidden_posts`, khóa duy nhất, index và RLS cho vai trò runtime. Không seed bài viết, thành viên, theo dõi hoặc tương tác. Migration đã kiểm bằng database PostgreSQL local tạm, chạy lặp qua fixture migration; chưa áp dụng cloud.

`community.py` cung cấp member/topic discovery, follow/unfollow và hide/unhide. `social.py` lọc bài theo nội dung/tác giả/chủ đề/theo dõi; tác giả không active và tài khoản chặn nhau bị loại. Khóa giao dịch theo cặp người dùng dùng chung cho follow/block bảo đảm block luôn loại quan hệ theo dõi cả khi hai request đồng thời.

API trả dữ liệu công khai tối thiểu cho trang thành viên, không trả email/ngày sinh/mật khẩu/wallet. Bài chỉ mình tôi chỉ có tác giả xem được. Follow/hide/save/block không cấp điểm; kiểm SQL độc lập xác nhận điều này.

## Đối chiếu thiết kế

Dùng context và ảnh Figma đã lưu tại `docs/figma-fidelity`, gồm 722:5570 (khám phá), 722:5699/723:5892 (trang thành viên/theo dõi), 733:5722/733:5787 (thành viên/chủ đề), 723:5809 (tùy chọn), cùng luồng bài đã lưu/chi tiết/thích/bình luận có sẵn. Không có lần đọc mới thành công từ file Figma gốc trong lượt này.

Header xanh, thẻ bo góc, bộ lọc, hộp tùy chọn và thanh điều hướng dùng thành phần chung. Ảnh đại diện hiện là chữ đầu từ tên thật của API; ảnh bìa/avatar/media do người dùng quản lý thuộc phần F07/F14 còn mở. Chưa coi các khác biệt hình ảnh hoặc mọi biến thể frame đã được nghiệm thu.

## Bằng chứng kiểm tra

- `community-api-targeted.log`: 7 kiểm tra API đạt, gồm quyền xem/cursor, hai chiều chặn, theo dõi đồng thời với chặn, tính riêng tư của ẩn bài, cập nhật chủ đề, tác giả không active và không cấp điểm.
- `community-api.log`: toàn bộ 90 kiểm tra API đạt, 2 acceptance suite opt-in được loại khỏi lượt API này; PostgreSQL local tách biệt, 326,94 giây.
- `community-all-unit.log`: 47 kiểm tra ứng dụng, 8 suite đạt; trong đó 8 kiểm tra mới cho cộng đồng, clipboard thất bại, native share bị hủy và yêu cầu đăng nhập của feed cá nhân.
- `community-browser-targeted.log`: browser → API → PostgreSQL local đạt. Thao tác qua hai tài khoản, tải lại, theo dõi, thích, lọc chủ đề, sao chép clipboard thật, lưu, ẩn/hiện lại, chặn/bỏ chặn. SQL xác nhận quan hệ được gỡ và không có point ledger mới. Ảnh trong `community-runtime/`.
- `community-browser-full.log`: toàn bộ 20/20 luồng browser và kiểm SQL độc lập đạt, 686,66 giây. Ảnh mới nhất trong `community-full-runtime/`; ảnh tùy chọn tắt animation khi chụp để không lấy khung đang trượt. 68 route hiển thị qua live provider; `checks.json` ghi 66 lượt bố cục ở 390/428 px, không tràn ngang.
- `community-typecheck.log`, `community-lint.log`: TypeScript/ESLint đạt. Audit nguồn: 150 file runtime, không có fixture adapter/seeded identity/credential database.
- `community-format.log`: Prettier toàn ứng dụng đạt; `community-build-normal.log`: web export bình thường đạt sau khi kết thúc harness, không giữ URL API của database QA trong bản export cuối.
- `community-native-export.log`: export Android và iOS đạt; `community-native-config.log`: quyền camera/photos hợp lệ, không thêm microphone.
- `community-native-integration.log`: Android 1/1 đạt, 313,52 giây, trên AVD riêng `BlueStepsQA32`/`emulator-5556`. Chạy API 8093 và database tạm riêng; theo dõi và đóng/mở ứng dụng để đọc lại trạng thái, clipboard thật, lưu/ẩn/hiện lại, chặn/bỏ chặn. SQL xác nhận 1 bài fixture, không còn follow/hide/save/block sau khôi phục, không tạo scan/điểm mới. Bằng chứng ảnh/XML và `community-result.json` trong `community-native-runtime/`.

QA Android ưu tiên nút có accessibility label khi tên thành viên trùng nội dung ô tìm kiếm. Mỗi lần quan sát xóa đúng tệp dump tạm do QA tạo trước khi yêu cầu UIAutomator ghi mới; dump thất bại trong lúc Expo Go khởi động trả quan sát rỗng và được chờ lại, không dùng XML của màn hình cũ để kết luận khôi phục phiên. Các ảnh có nút nổi của Expo Go không dùng làm bằng chứng đối chiếu pixel bản phát hành.

Chưa nghiệm thu thiết bị thật/iOS, chia sẻ tới ứng dụng ngoài, mọi media/preview/friends hoặc đối chiếu pixel với file Figma gốc. Không tự triển khai migration lên cloud trong lượt này.
