# Tin tức — 02/11/2026

Phạm vi F11 giữ nguyên các frame `612:5286`, `612:5362`, `612:5441`, `680:5343`, `680:5406`, `680:5461`, `695:5419`, cùng luồng bài viết/thảo luận đã có.

Đã triển khai:

- `/articles/calendar`: lịch sự kiện công khai theo tháng và múi giờ, chuyển tháng, ngày/giờ/địa điểm lấy API, mở chi tiết và lịch cá nhân. Không còn mở thẳng danh sách khám phá.
- `/articles/briefs`: bản tin theo ngày, mặc định ngày gần nhất có bài đã công bố, trước/sau ngày, dùng summary do nguồn xuất bản cung cấp; không tạo tóm tắt AI giả hoặc số tin giả.
- `/articles/reading-list`: bố cục riêng, số bài lưu thật, lưới/danh sách, chưa đọc/đọc tiếp/đã đọc. Bài viết có nút lưu ở đầu trang, lưu tiến độ khi cuộn và đánh dấu đã đọc; mở Đọc tiếp khôi phục vị trí theo tỷ lệ. Thời gian đọc ghi rõ là ước tính từ số từ.
- `/articles/search`: từ khóa và chủ đề, khoảng 7/30 ngày, danh sách/lưới, kết quả trống, lịch sử tìm kiếm theo tài khoản (tối đa 10 từ, gộp không phân biệt hoa/thường), xóa lịch sử. Khách không ghi lịch sử lên tài khoản hoặc tạo dữ liệu minh họa.
- `/articles/topics`: hero/card theo bố cục Figma, số bài từ API, mở kết quả đúng chủ đề, theo dõi/bỏ theo dõi và đọc lại trạng thái.
- Chi tiết sự kiện trong Tin tức: chỉ mở xác nhận quan tâm sau khi PUT lưu thành công; đóng modal trở về nội dung. Quan tâm vẫn là lưu lịch, không tự cấp vé đăng ký.
- Bình luận bài viết/bài cộng đồng: thích/bỏ thích idempotent, số lượt và trạng thái sau reload; kiểm bài riêng tư, chặn hai chiều và bình luận đã xóa trước khi ghi reaction.

Backend dùng migration `202611020005_news_reading.sql` và `202611020006_comment_reactions.sql`. Reading progress tăng đơn điệu khi nhận lại request cũ; không cho tài khoản khác đọc tiến độ/lịch sử riêng. Pagination kết quả tìm kiếm gắn scope theo từ khóa/chủ đề/khoảng ngày, không dùng nhầm cursor của bộ lọc cũ.

Kiểm chứng đã đạt: 62 test API (5 test Tin tức mới), mypy/Ruff; TypeScript/ESLint; 20 test ứng dụng; export Android/iOS; audit nguồn dữ liệu. Mọi test ghi dữ liệu dùng database local tạm riêng, chưa triển khai migration lên cloud.

Lượt browser đầy đủ: **16/16 đạt**, Python harness và đối chiếu SQL độc lập đạt; [log](news-browser.log), [metadata từng test](news-runtime/tests), **68 route** trong [danh mục](news-runtime/runtime-routes.json), **62 lượt bố cục** ở 390×844 và 428×926 trong [kết quả](news-runtime/checks.json), không tràn ngang. Bài kiểm đọc tiếp dùng bài dài và thao tác cuộn, xác minh tiến độ được lưu rồi mở lại với scrollTop lớn hơn 0. Theo dõi chủ đề, thích/bỏ thích bình luận, lịch sử từ khóa, đã đọc và quan tâm đều kiểm reload/API, không chỉ chụp hình.

Đã xem trực tiếp ảnh runtime của lịch, bản tin, danh sách đọc, tìm kiếm, chủ đề và modal. Ảnh `news-reading-list.png` chụp quá sớm sau reload bị trắng; không dùng ảnh này làm bằng chứng hình ảnh. Hai ảnh `news-reading-390.png` / `news-reading-428.png` sau khi đã chờ render trong suite bố cục mới là bằng chứng danh sách đọc.

Bổ sung [hai test UI riêng](news-layout-isolated.log) đạt, với [8 ảnh](news-layout-isolated) cho dữ liệu đủ ba bản tin và năm chủ đề: kiểm mọi badge 38×38, circle 46×46, xuống dòng và thanh điều hướng trong viewport ở cả hai kích thước (cho phép sai số làm tròn CSS dưới 0,5px). Đây là fixture chỉ trong test trình bày, bổ sung cho suite HTTP/PostgreSQL thật; không phải dữ liệu sản phẩm hoặc bằng chứng backend. Ảnh UI riêng được chụp sau khi chờ dữ liệu và ảnh tải xong.

Các lượt trước đã tìm và sửa lỗi trong công cụ test ở iframe sandbox, chờ render và ranh giới thời gian rate-limit. Không giảm giới hạn bảo vệ API để chạy test. [Web đã export lại với cấu hình bình thường](news-build-normal.log) sau harness, không để URL API tạm trong bản phát triển.

Đối chiếu hình ảnh dựa trên context độ chi tiết cao và ảnh Figma đã lưu tại `docs/figma-fidelity/contexts` và `reference`. Kết nối Figma `Primary` hiện báo không có quyền edit file gốc; tài khoản này đã được kiểm bằng whoami. Không tuyên bố đã đọc lại thiết kế mới nhất. Giữ bước đối chiếu trực tiếp file gốc và nghiệm thu native trên thiết bị là việc còn lại.

Các ảnh nội dung/tiêu đề/chủ đề/count đều theo catalog API. Static assets mới dùng ảnh hero `612-5286/imgFrame.png`, vòng tròn `imgBiuTng.svg` (46×46), ba badge `612-5441/imgSTin*.svg` (38×38), cùng navigation component hiện có. Không dùng ảnh chụp toàn màn làm giao diện.
