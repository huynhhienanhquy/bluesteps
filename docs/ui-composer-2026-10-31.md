# UI Soạn bài — 31/10/2026

Đã dựng thêm **17 frame** của trang backuped (`386:7053`) trong Figma `7GCLABwia0mauoszRi0Vtt`, bằng React Native/Expo. Route `/compose`; `?preview=1&frame=<nodeId>` mở đúng biến thể tham chiếu.

| Frame | UI |
|---|---|
| `386:15047` | Bản nháp trống, thêm nội dung |
| `386:15090` | Soạn nội dung, ảnh và bàn phím |
| `386:15150`, `386:16188`, `386:15209` | Đang tải, tiến trình và thành công |
| `386:15270` | Chọn quyền xem |
| `386:15419`, `386:15552` | Tìm/chọn địa điểm và cảm xúc |
| `386:15972`, `386:16071` | Thư viện ảnh, chọn một hoặc nhiều ảnh |
| `741:5779` | Bản nháp kèm ảnh |
| `741:5846`, `741:5913` | Đã gắn địa điểm/cảm xúc |
| `741:5980`, `741:6047` | Quyền Bạn bè và Chỉ mình tôi |
| `741:6114` | Xem trước bài viết |
| `743:6023` | UI chụp ảnh |

Bản nháp giữ nội dung, quyền xem, vị trí, cảm xúc và tối đa hai ảnh khi đóng/mở bộ chọn hoặc quay lại từ feed. Nội dung giới hạn 2.000 ký tự. Chọn/xóa ảnh, tìm kiếm địa điểm/cảm xúc, xem trước và chuỗi trạng thái đăng hoạt động trong phiên. Sau thành công, bài mới cùng ảnh và lựa chọn xuất hiện trong feed; bản nháp được xóa. Đặt lại demo cũng xóa trạng thái này. Camera/thư viện dùng ảnh mẫu cục bộ để thể hiện UI, không mở camera thật, xin quyền hoặc tải nội dung lên dịch vụ.

Source chính: `apps/mobile/src/features/community/ComposerDesignScreen.tsx`, `CommunityUiProvider.tsx`, `composer-design-data.json`, `apps/mobile/src/design-system/composer-assets.ts`; route `apps/mobile/app/compose.tsx`. Bộ chuẩn bị nằm ở `scripts/composer-design-config.cjs` và `scripts/prepare-composer-components.cjs` trong app mobile.

Mỗi màn được dựng từ Text/View/TextInput/Pressable và asset riêng lẻ. Ảnh cả frame chỉ dùng đối chiếu. Code Connect của các bộ icon/keyboard không có implementation tương ứng trong stack cài sẵn; đã đọc child node và dùng đúng SVG, hình học, chữ và màu của component gốc. Web có bàn phím mẫu thao tác được; native dùng ô nhập và bàn phím hệ thống. Giữ SVG gốc cùng **26 PNG trong suốt** dành cho SVG dùng filter trên native. Font Poppins Bold được nạp từ dependency đã có. Runtime không dùng URL Figma tạm.

Kiểm chứng:

- TypeScript, ESLint và định dạng trong phạm vi thay đổi đạt.
- 4/4 luồng Soạn bài mới; hồi quy Cộng đồng 4/4, Thông báo 3/3 và Điểm/đổi quà 2/2 đạt.
- 6/6 luồng frontend hiện có và 77/77 component/unit test trong 21 suite đạt.
- Export web và bundle iOS/Android đạt; chưa QA thiết bị thật.
- 34 ảnh ở 428/390 px không lỗi JavaScript, ảnh chưa tải hoặc tràn ngang.
- Audit **1.100 vị trí asset** đạt, lệch tối đa **0,016 CSS px**. Đã kiểm tra lại trực quan icon quay lại, glyph bàn phím, bo góc/viền ảnh và gốc xoay/vùng cắt của asset loading.
- So sánh toàn frame còn khác biệt font/emoji và chi tiết raster; chưa tuyên bố khớp toàn trang 100%.

Bằng chứng: `docs/figma-fidelity/composer-asset-audit.json`, `composer-visual-comparison.json`, `composer-native-derivatives.json`, `composer-component-layout.json`, các context `*-composer.txt`/`*-composer-geometry.json` và log `docs/ui-progress-evidence-2026-10-31/composer-*.log`.

Độ phủ theo inventory: **170/211 frame**, còn **41 frame**. Toàn bộ trang backuped vẫn đang tiếp tục.
