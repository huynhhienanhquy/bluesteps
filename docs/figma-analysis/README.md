# BlueSteps — phân tích Figma và kế hoạch sản phẩm

Ngày phân tích: **29/10/2026**. [File Figma, trang backuped](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7053).

Phạm vi duy nhất của bộ phân tích là **trang backuped (`386:7053`)**: **180 đối tượng cấp cao, gồm 169 frame**, **2.883 lớp chữ**, **752 instance**, tham chiếu **131 main component**. Frame gồm màn hình, biến thể, popup và khung phụ; đây không phải 169 màn hình sản phẩm độc lập. Đã xem ảnh render của 8 interface đại diện; các interface còn lại được đọc qua cây node, chữ, trạng thái ẩn và prototype, chưa được kiểm tra trực quan từng ảnh.

Mọi nhận định giao diện và yêu cầu nghiệp vụ trong tài liệu chỉ dựa trên interface của **trang backuped**. Backend, database và kế hoạch từ yêu cầu ban đầu được giữ dưới dạng **đề xuất suy ra từ các interface này**. Workspace chưa có source app/backend/database của sản phẩm để xác nhận hệ thống đang chạy. Component thư viện được liệt kê vì có instance sử dụng trên backuped, không mở rộng phạm vi sang interface của trang khác.

## Đọc tài liệu

| Tài liệu | Nội dung |
|---|---|
| [01 — Interface catalog](01-interface-catalog.md) | Chỉ mục 180 node, cấu trúc, nội dung, trạng thái ẩn, component, ánh xạ API và bảng cho từng interface |
| [02 — Component & frontend](02-components-and-app.md) | Phân rã component, props, biến thể, state, navigation, offline và accessibility |
| [02a — Component gốc Figma](02a-figma-component-inventory.md) | 131 main component thực tế, tần suất và nguồn tham chiếu |
| [03 — Backend & API](03-backend-and-api.md) | Module, phân quyền, contract, state machine, transaction, job, tích hợp và vận hành |
| [04 — Database](04-database.md) | Quan hệ, từ điển bảng/trường, unique/check/index, chiến lược dữ liệu và migration |
| [05 — Kế hoạch triển khai](05-delivery-plan.md) | Backlog app/backend/data/QA, phụ thuộc, ước lượng, mốc nghiệm thu và toàn bộ phạm vi sau MVP |
| [06 — Quyết định & khoảng trống](06-decisions-and-gaps.md) | Mâu thuẫn thiết kế, giả định, câu hỏi cần chốt và trạng thái thiếu |
| [07 — Đối chiếu hoàn thành](07-verification.md) | Bằng chứng đã đọc, kiểm tra artifact và giới hạn của phân tích |
| [08 — Tech stack](08-tech-stack.md) | Python/FastAPI, Supabase, mobile, queue/realtime, môi trường, kiểm thử và chính sách phiên bản |
| [09 — Python + Supabase](09-python-supabase.md) | Phân chia trách nhiệm, SQL transaction, pooling, schema/grants/RLS, auth tùy chọn và kế hoạch thiết lập |
| [10 — Review khả năng giao agent](10-agent-readiness-review.md) | Kết luận chưa sẵn sàng cho full implementation, phát hiện theo ưu tiên và việc cần sửa |
| [11 — Hướng dẫn thực thi cho agent](11-agent-execution-guide.md) | Definition of Ready, scope/contract/test/handoff và mẫu task packet |
| [12 — Agent Start Here](12-agent-start-here.md) | Điểm vào chuẩn, task DAG, next tasks, product gates, contract và release manifest |

**Bàn giao:** 48 epic đã được tách thành capability và packet SPEC → BUILD → VERIFY. Đọc [12 — Agent Start Here](12-agent-start-here.md), chọn task `dispatchStatus=ready` trong [manifest](execution/tasks.json). Đây là plan sẵn sàng bắt đầu theo gate, chưa phải phần mềm hoặc production release đã hoàn tất.

## Định hướng đề xuất

**Đã chốt bởi chủ dự án: Python backend, Supabase Database và Python tự quản lý tài khoản/mật khẩu/session.** FastAPI/Pydantic, SQLAlchemy/psycopg, Celery/Redis và WebSocket Python là technical baseline của kế hoạch, không tạo Supabase Auth song song. Mobile dùng React Native/Expo/TypeScript. [Bắt đầu giao việc cho agent](12-agent-start-here.md) là entry point; [execution/tasks.json](execution/tasks.json) là nguồn thứ tự dispatch. Các provider và production policies chưa chốt chỉ chặn capability liên quan, không chặn bootstrap/local schema/contract work.

Luồng nên làm đầu tiên: **tạo tài khoản → xem sổ tay → quét/đính chính → ghi nhận hành động đủ điều kiện → xem điểm → tìm điểm thu gom**. Tiếp theo hoàn thiện đổi quà, tham gia hoạt động, cộng đồng/chat, RecycleBot và trò chơi. Mọi nhóm chức năng trong Figma đều có chỗ trong backlog; MVP là một mốc trung gian.

Các quyết định quan trọng: nhận diện ảnh khác hành động phân loại thực tế; tự báo đã bàn giao khác xác minh tại điểm; điểm khả dụng khác tổng điểm tích lũy; lưu/quan tâm hoạt động khác đăng ký và có vé. Backend phải là nơi quyết định trạng thái và số điểm.

## Bằng chứng nguồn

- [Ảnh Home](evidence/screenshots/391-25197.png), [quét không nhận diện được](evidence/screenshots/386-14264.png), [hành trình nhiều điểm](evidence/screenshots/534-48774.png), [đăng ký hoạt động](evidence/screenshots/534-49326.png).
- [Ảnh đổi quà](evidence/screenshots/386-12517.png), [cộng đồng](evidence/screenshots/386-7647.png), [trò chơi](evidence/screenshots/386-18428.png), [cài đặt](evidence/screenshots/386-8451.png).
- [Toàn bộ snapshot trang chính](evidence/backuped-all.json), [coverage](coverage.json), [định nghĩa hai component set](evidence/component-sets.json), [style sử dụng](evidence/style-usage.json).

Đây là tài liệu phân tích và kế hoạch; chưa triển khai app/backend, chưa chạy migration, chưa deploy và chưa chỉnh thiết kế Figma.
