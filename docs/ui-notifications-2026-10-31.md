# UI Thông báo — 31/10/2026

Đã dựng thêm **14 frame** của trang backuped (`386:7053`) trong Figma `7GCLABwia0mauoszRi0Vtt`. Giao diện chạy tại `/notifications`. Tham số `?preview=1&frame=<nodeId>` mở đúng biến thể tham chiếu.

| Frame | UI và tương tác |
|---|---|
| `386:7913` | Danh sách gốc, lọc, mở kết quả/scan/quà; vuốt hoặc nhấn giữ ưu đãi để hiện xóa |
| `386:8003` | Thông báo cộng đồng, mở cộng đồng và theo dõi/bỏ theo dõi thành viên |
| `386:8228` | Ưu đãi đã vuốt, nút xóa |
| `386:8311` | Sau khi xóa ưu đãi; giữ trạng thái khi chọn lại bộ lọc Tất cả |
| `386:8380` | Danh sách thông báo trước đó |
| `703:5399` | Bộ lọc chưa đọc, số lượng và danh sách cập nhật sau khi đọc/xóa |
| `703:5468` | Chi tiết kết quả, liên kết tới phần thưởng |
| `703:5524` | Cài đặt bốn loại cập nhật; công tắc có trạng thái trợ năng |
| `703:5589` | Đã xem hết, mở khám phá hoạt động |
| `712:5475` | Lọc hoạt động và đánh dấu tất cả đã đọc |
| `712:5578`, `712:5667`, `712:5756`, `712:5845` | Bốn biến thể công tắc cài đặt |

Luồng cục bộ nối lọc → chi tiết → đổi quà → quay lại; đọc một thông báo làm giảm bộ lọc chưa đọc. Xóa ưu đãi không xuất hiện lại khi chọn Tất cả. Cài đặt và theo dõi được giữ trong phiên. Đặt lại demo cũng đặt lại trạng thái UI này. Không đăng ký push hoặc gọi dịch vụ gửi thông báo.

## Source

- `apps/mobile/src/features/notifications/NotificationScreens.tsx`
- `apps/mobile/src/features/notifications/NotificationUiProvider.tsx`
- `apps/mobile/src/design-system/DesignFrameLayers.tsx`
- `apps/mobile/src/design-system/DesignFrameCanvas.tsx`
- `apps/mobile/src/design-system/notifications-assets.ts`
- `apps/mobile/scripts/notifications-design-config.cjs`
- `apps/mobile/scripts/prepare-backuped-group.cjs`

Renderer chữ/ảnh/shape được tách từ nhóm Điểm và đổi quà đã kiểm chứng để dùng lại. Các màn dùng Text/View/Pressable và asset riêng lẻ; ảnh toàn frame chỉ dùng đối chiếu. SVG có filter được giữ bản gốc kèm 14 PNG trong suốt dành cho native. Icon Material 3 quay lại dùng đúng SVG tương ứng đã có trong dự án. URL Figma không được dùng ở runtime.

## Kiểm chứng

- TypeScript, ESLint và định dạng trong phạm vi thay đổi đạt.
- 3/3 luồng Thông báo mới và 2/2 luồng Điểm/đổi quà đạt.
- Hai kiểm tra route/desktop và dữ liệu demo đạt. Cập nhật hai kỳ vọng tiêu đề cũ trong test cho trang hoạt động và lịch sử đã thay UI trước đó; không đổi source hai màn đó trong lượt này.
- 77/77 component/unit test hiện có đạt, 21 suite.
- Export web và bundle iOS/Android đạt; chưa QA thiết bị thật.
- 28 ảnh Thông báo và 34 ảnh Điểm/đổi quà tại 428/390 px: không lỗi JavaScript, ảnh chưa tải hoặc tràn ngang.
- Audit **464 vị trí asset Thông báo** đạt, lệch tối đa **0,016 CSS px**. Audit hồi quy **1.384 vị trí asset Điểm/đổi quà** cũng đạt, lệch tối đa **0,020 CSS px**.
- So sánh pixel vẫn còn khác biệt font/emoji và chi tiết raster; chưa tuyên bố khớp toàn frame 100%.

Bằng chứng: `docs/figma-fidelity/notifications-asset-audit.json`, `notifications-visual-comparison.json`, `notifications-native-derivatives.json`, các context `*-notifications.txt`/`*-notifications-geometry.json`, và log `docs/ui-progress-evidence-2026-10-31/notifications-*.log`.

Độ phủ hiện tại theo inventory đã lưu: **140/211 frame**, còn **71 frame**. Toàn bộ trang backuped vẫn đang tiếp tục.
