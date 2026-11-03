# Kiểm tra và sửa Sổ tay rác — 03/11/2026

## Lỗi đã tái hiện và sửa

- Hộp “Cách xử lý” dùng nền sáng cố định nhưng chữ theo theme. Ở dark mode, tương phản đo trên trình duyệt chỉ đạt 1,08:1. Đổi nền sang `colors.surface` để chữ và nền cùng theme; kiểm tra hồi quy yêu cầu tối thiểu 4,5:1 đã đạt.
- Minh họa vật liệu kim loại, vải, cao su và gốm sứ cùng rơi về biểu tượng lá cây. Đã gán biểu tượng riêng theo loại vật liệu; giữ các ảnh vật liệu có sẵn.

## Phạm vi kiểm chứng

- 9 unit test về hộp hướng dẫn, tìm kiếm theo nhóm, mở chi tiết vật liệu, điều hướng vật phẩm, chuyển Nên làm/Không nên làm và trạng thái lỗi.
- 4 test trình duyệt với dữ liệu công khai từ API đang nối database hiện tại: ba nhóm rác, hộp hướng dẫn, các liên kết vật liệu, toàn bộ 9 vật phẩm đã xuất bản, chuyển hướng dẫn, tìm kiếm không dấu, xóa tìm kiếm, tra PET và bố cục 360/390/428 px.
- Có test riêng đo độ tương phản của hộp hướng dẫn ở dark mode; test này thất bại trên bản cũ và đạt sau sửa.
- Web export, ESLint và Prettier của các file thay đổi đều đạt.

Browser chỉ giả lập danh tính để vượt bước điều hướng đăng nhập; toàn bộ GET của Sổ tay gọi API thật. Test không ghi hoạt động phân loại, không cộng điểm và không thay dữ liệu người dùng.

```powershell
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$env:BLUESTEPS_HANDBOOK_API = 'http://127.0.0.1:8011'
pnpm --filter @bluesteps/mobile exec playwright test handbook-live.spec.ts
pnpm --filter @bluesteps/mobile exec jest --runInBand src/features/live/HandbookGuides.test.tsx
```

API được khởi động riêng cho kiểm tra ở cổng 8011; dừng sau khi hoàn tất. Chưa kiểm tra bằng thiết bị vật lý trong lượt này.
