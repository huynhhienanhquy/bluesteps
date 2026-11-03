# Code hành trình nhiều điểm và PIN

Theo chỉ đạo mới **“code thôi không cần test”**, không tiếp tục chạy test, build, lint hoặc typecheck. Các lượt browser/native planner bị ngắt không được tính là nghiệm thu; log cũ không chứng minh các thay đổi dưới đây đã đạt runtime. Mục tiêu toàn bộ Figma vẫn mở.

## Hành trình

Đã viết `JourneyPlanner` theo context `534:48774`: chọn vật liệu, tìm điểm nhận ít nhất một vật liệu đã chọn, thêm/bỏ tối đa 10 điểm, kéo thứ tự bằng tay nắm, phím mũi tên và lựa chọn truy cập native, xem trước Valhalla, lưu và mở lại bản nháp, bắt đầu trực tiếp sau khi tính tuyến. Cảnh báo vật liệu chưa có điểm nhận. Giữ phiên bản lúc mở biểu mẫu để bản cũ không ghi đè sau refetch. Migration `202611030017_route_materials.sql` thêm vật liệu vào route; PATCH từ client cũ không xóa lựa chọn này.

Phần dẫn đường nội suy quãng đường/thời gian còn lại theo geometry và chi phí maneuver của nhà cung cấp, cộng các chặng chưa đi. Chỉ dùng fix mới, đủ chính xác và còn trên tuyến; mất GPS/lệch tuyến hiện tổng snapshot thay vì phần còn lại. Không tự đánh dấu đã đến hoặc cấp thưởng.

## PIN

Đã thay `PinUnavailable` bằng đặt PIN 6 số, nhập lại xác nhận, đổi/tắt bằng PIN hiện tại, khóa ngay và khóa khi ứng dụng rời foreground. Có bàn phím số theo frame `514:5102`, lưu salt/hash PBKDF2 qua `@noble/hashes`, giới hạn nhập sai với thời gian chờ tăng dần. Native dùng SecureStore theo thiết bị; web dùng bộ nhớ trình duyệt cho khóa giao diện, không làm cơ chế phân quyền API.

`PinGate` che nội dung; các modal riêng tư dùng `PrivateModal` để không hiện trên màn khóa. GPS/giọng đọc chỉ đường dừng khi khóa. Đổi tài khoản hoặc kết quả async tới muộn không được mở khóa phiên mới. Quên PIN kết thúc phiên trước khi xóa PIN cục bộ và yêu cầu đăng nhập lại; đăng xuất web được truyền sang các cửa sổ cùng origin. Avatar/email được viết trong [lượt tiếp theo](profile-identity-code.md), cũng chưa nghiệm thu runtime theo chỉ đạo chỉ viết code.
