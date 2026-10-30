# Frontend-first implementation

Nguồn: `figma-analysis/12-agent-start-here.md`, `02-components-and-app.md`, `08-tech-stack.md`, ảnh `391-25197.png` và catalog trang backuped `386:7053`. Yêu cầu mới trong chat ưu tiên frontend trước backend; không đổi trạng thái các packet backend hoặc coi prerequisite API đã đạt.

## Phạm vi được thực hiện

- FE01: pnpm workspace; TypeScript strict; Expo/React Native/Expo Router với preview web từ cùng mã nguồn.
- FE02: semantic tokens, component native dùng chung, theme system/light/dark, 5 tab theo Home mới; điều hướng stack có back và deep link.
- FE03: Home, onboarding, auth forms, sổ tay và chi tiết, chụp/chọn ảnh cục bộ có xin quyền/xem lại và scan demo có nhánh nhập tay, danh sách/chi tiết/bộ lọc điểm thu gom, hành trình có đổi thứ tự bằng nút.
- FE04: hoạt động/chi tiết/lịch/đã lưu, cộng đồng/soạn bài, thông báo, tin nhắn demo/RecycleBot, quà/chi tiết/lịch sử, hồ sơ/cài đặt/thống kê và game phân loại luyện tập.
- FE05: fixture tổng hợp trong adapter demo, loading/error/retry/empty, kiểm thử hành vi, typecheck/lint và export web. Không tạo API giả có vẻ là backend thật.

## Ranh giới và quyết định còn mở

Các dữ liệu, số dư, capacity, tin nhắn, giá quà và kết quả scan đều là demo. Không gọi provider nhận diện/AI, không ghi điểm, phát vé/QR, redeem, đăng ký thật hay lưu mật khẩu. Auth form chỉ kiểm input và hiển thị trạng thái chưa nối Python Identity. Policy điểm, daily claim, fulfillment, friendship, retention, nhà cung cấp bản đồ, call/video và game mở rộng tiếp tục pending theo decision register. Không tự chọn provider, không triển khai production.

## Cách tiếp tục thực hiện

Xây trong `apps/mobile`, tokens trong `packages/design-tokens`. Query lấy dữ liệu qua adapter demo; local state chỉ phục vụ tương tác phiên demo. Không tạo generated API types từ operation chưa có schema. Khi backend sẵn sàng, triển khai adapter theo OpenAPI và auth policy đã pin, bổ sung SecureStore/cache purge và idempotency reconciliation trước bật command thật.

## Nghiệm thu

1. 5 tab và route chi tiết chạy được, layout gọn trên điện thoại và preview màn lớn.
2. Search/filter/empty/retry hoạt động; saved/like/composer/route reorder có phản hồi và không ghi dữ liệu bên ngoài.
3. Scan demo gắn nhãn, chọn tay được, không cộng điểm. Reward và event không báo giao dịch thành công khi chưa có server.
4. Form có label/lỗi; nút có accessibility role, vùng chạm tối thiểu 44; theme và font lớn không che nội dung.
5. Chạy scripts thực tế và lưu kết quả trong `frontend-verification.md`. Export web không thay chứng cứ build native hoặc kiểm thiết bị thật.

Các tài liệu execution pack hiện hữu được giữ nguyên; đây là handoff riêng cho yêu cầu frontend-first đã được cho phép trong chat.
