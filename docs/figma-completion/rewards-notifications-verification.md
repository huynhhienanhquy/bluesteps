# Điểm, quà và thông báo — 02/11/2026

Đã nối điểm phân loại theo cấu hình, điểm danh một lần/ngày, đổi quà có kiểm số dư/tồn kho/version, biên nhận và hủy hoàn điểm. Lịch sử và cấp bậc đọc dữ liệu API. Quy tắc được ghi tại [reward-program.md](reward-program.md), bao gồm phần Figma chưa chỉ định giá trị rương.

Thông báo có bộ lọc tất cả/chưa đọc/hoạt động, chi tiết đánh dấu đã đọc, liên kết tới sự kiện/hội thoại/biên nhận, cài đặt theo nhóm và nhắc điểm danh. Lịch thông báo local trên điện thoại lấy giờ chuẩn từ server, áp dụng giờ yên lặng, chỉ lấy sự kiện còn lưu/đăng ký; xóa và đồng bộ lại khi đổi cài đặt hoặc đăng xuất. Deep-link kiểm userId trước khi mở. Quyền hệ điều hành chỉ được hỏi khi người dùng bấm bật.

Lịch local chỉ chuẩn bị cho 7 ngày tới và được đồng bộ khi mở ứng dụng. Đây chưa phải remote push. Thay đổi trên thiết bị khác chỉ cập nhật sau lần đồng bộ tiếp theo. Không tuyên bố đã nghiệm thu quyền thông báo/camera/haptic trên thiết bị thật.

Đã sửa race giao dịch: dependency database dùng `scope="function"` để commit trước khi gửi response. Trước đó, GET ngay sau lệnh PUT có thể thấy dữ liệu cũ, và lỗi commit có thể xảy ra sau phản hồi thành công. Hai test hồi quy quan sát trực tiếp thời điểm gửi HTTP headers và mô phỏng commit thất bại đều đạt. FastAPI tối thiểu nâng lên 0.121, khớp API này: [tài liệu dependency scope chính thức](https://fastapi.tiangolo.com/tutorial/dependencies/dependencies-with-yield/#early-exit-and-scope).

Kiểm chứng:

- [Browser harness](rewards-notifications-browser.log): 15/15 đạt; harness SQL độc lập đạt, 293 giây. Có nhận 5 điểm phân loại, điểm danh 2 điểm, đổi 40 điểm, biên nhận sau reload, hủy và hoàn điểm về 42. SQL: 8 sorting actions, 11 ledger entries, 1 daily claim, 1 redemption; không dùng điểm ví giả.
- [Bằng chứng runtime](rewards-notifications-runtime/runtime-routes.json): 68 route; [bố cục hai kích thước](rewards-notifications-runtime/checks.json): 52 lượt, không tràn ngang; metadata HTTP từng test tại `rewards-notifications-runtime/tests/`. Các lượt thử dùng PostgreSQL local/database tạm riêng, không sửa cloud.
- API: 55 test đạt sau sửa commit; thêm 2 test hồi quy commit đạt. Ruff và mypy đạt. Frontend: TypeScript, ESLint, 20 test Jest và native config đạt. Export Android và iOS thành công.
- [Bản web cấu hình bình thường](rewards-notifications-build-normal.log) được export lại sau harness để không để URL backend test trong bản phát triển.
- [Kiểm tra onboarding](onboarding-recheck.log): 6/6 đạt; đủ các trang trước đăng nhập, chặn mở thẳng login/register hoặc nhảy tới trang cuối, nhớ trạng thái hoàn thành. Chạy bằng Chrome cài sẵn; kiểm tra này chủ động stub API để xác minh điều hướng khách độc lập với backend.

Chỉ đạo không dùng đăng nhập Google/Facebook đã áp dụng vào AuthForm, và browser kiểm không còn hai nút này. Các nhóm chưa nghiệm thu trong [tracker](README.md) vẫn thuộc mục tiêu đang thực hiện. Migration mới hiện được kiểm local; chưa triển khai lên cloud.
