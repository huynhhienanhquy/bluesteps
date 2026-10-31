# UI Cộng đồng — 31/10/2026

Đã dựng thêm **13 frame** của trang backuped (`386:7053`) trong Figma `7GCLABwia0mauoszRi0Vtt`, bằng React Native/Expo. Route `/community` và `/discussion`; `?preview=1&frame=<nodeId>` mở biến thể tham chiếu.

| Frame | UI |
|---|---|
| `386:7647`, `386:7813` | Feed và feed đã thích |
| `722:5570` | Khám phá bài viết |
| `722:5635`, `734:5760` | Chi tiết bài viết và trạng thái đã thích |
| `722:5699`, `723:5892` | Thành viên và trạng thái đang theo dõi |
| `722:5749` | Bài viết đã lưu |
| `723:5646`, `723:5722` | Soạn bình luận và bình luận đã gửi |
| `723:5809` | Tùy chọn bài viết |
| `733:5722`, `733:5787` | Tìm thành viên và chủ đề |

Thích, lưu, theo dõi, ẩn bài và bình luận dùng trạng thái cục bộ trong phiên; đặt lại demo xóa trạng thái này. Tìm kiếm lọc nội dung, tab chuyển đúng màn, sao chép dùng clipboard. Bàn phím mô phỏng trên web có tương tác; native dùng bàn phím hệ thống. Bài mới từ composer hiện có vẫn xuất hiện trong feed. Chưa kết nối API đăng bài hay mạng xã hội.

Source chính: `apps/mobile/src/features/community/CommunityDesignScreens.tsx`, `CommunityUiProvider.tsx`, `community-design-data.json`; asset riêng lẻ trong `apps/mobile/assets/figma/community/`. Dùng chung `DesignFrameCanvas`/`DesignFrameLayers`, không dùng ảnh toàn frame làm UI. SVG có filter giữ bản gốc và 12 PNG trong suốt cho native. Icon helper được lấy từ đúng child node của Figma, có lưu vị trí và context; không vẽ fallback cho instance rỗng.

Kiểm chứng:

- TypeScript, ESLint đạt; web export và bundle iOS/Android đạt.
- 77/77 component/unit test, 21 suite đạt.
- 4/4 luồng Cộng đồng mới, 3/3 luồng Thông báo hồi quy và 6/6 luồng frontend hiện có đạt.
- 26 ảnh ở 428/390 px không lỗi runtime, ảnh chưa tải hoặc tràn ngang.
- Audit **548 vị trí asset** đạt, lệch tối đa **0,016 CSS px**.
- So sánh pixel 13 frame còn khác biệt font/emoji và raster; chưa khẳng định khớp toàn frame 100%, chưa QA thiết bị thật.

Bằng chứng: `docs/figma-fidelity/community-asset-audit.json`, `community-visual-comparison.json`, `community-native-derivatives.json`, các context `*-community.txt`/`*-community-geometry.json` và log `docs/ui-progress-evidence-2026-10-31/community-*.log`.

Độ phủ theo inventory: **153/211 frame**, còn **58 frame**. Toàn bộ trang backuped vẫn đang tiếp tục.
