# UI Điểm và đổi quà — 31/10/2026

Tiếp tục từ trang **backuped** (`386:7053`) của Figma `7GCLABwia0mauoszRi0Vtt`. Chỉ triển khai code React Native/Expo, asset và trạng thái UI trong bộ nhớ. Không chỉnh sửa thiết kế Figma.

## Phần mới

| Route | Frame Figma | Nội dung |
|---|---|---|
| `/rewards` | `386:11010`, `386:16253`, `386:16592` | Ví điểm, thanh tiến trình và lộ trình cấp độ; biến thể mở bằng `?preview=1&frame=…` |
| `/rewards/guide` | `386:11320` | Hướng dẫn quy đổi, ba loại rác và liên kết tới quà |
| `/rewards/catalog` | `386:11451`, `386:11652`, `386:11858` | Danh mục tái chế, trước/sau nhận thưởng và bật nhắc |
| `/rewards/catalog` | `386:12064` | Phản hồi nhắc thưởng trong UI; không lên lịch thông báo hệ điều hành |
| `/history` | `386:12071`, `386:12194`, `386:12284` | Tất cả, tháng và tuần; giữ ngày và nội dung mẫu của thiết kế |
| `/rewards/catalog` | `386:12517`, `386:12362` | Xác nhận/hủy, thiếu điểm và kết quả đổi quà |
| `/rewards/catalog` | `386:12671` | Nhận thưởng ngày và đóng phản hồi |
| `/rewards/catalog` | `386:12823`, `386:12956`, `386:13109` | Giải trí, khác và voucher |

Các màn dùng Text/View/Pressable, ảnh riêng lẻ và SVG gốc. Ảnh toàn frame chỉ nằm trong tài liệu đối chiếu. Không dùng URL asset Figma làm nguồn ảnh runtime. Icon có Code Connect thuộc Material 3 nhưng không có component React Native tương ứng trong dự án; dùng vector gốc của chính child node. Font Kavivanar và giấy phép được lưu cục bộ. 23 SVG có filter có bản PNG trong suốt để giữ hiệu ứng trên native.

`RewardsUiProvider` giữ việc nhận thưởng một lần, lời nhắc và số dư đổi quà trong phiên; việc đặt lại demo cũng đặt lại trạng thái này. Số dư, thưởng và kết quả đổi quà là tương tác trình diễn, không phải giao dịch hoặc thông báo thật. Route chi tiết quà cũ `/rewards/[id]` vẫn giữ bản mẫu trước đây.

## Code

- `apps/mobile/src/features/rewards/RewardsDesignScreens.tsx`: ví, hướng dẫn, catalog, modal và lịch sử.
- `apps/mobile/src/features/rewards/RewardsDesignParts.tsx`: render chữ/ảnh/shape, co theo màn hình, safe area và navigation.
- `apps/mobile/src/features/rewards/RewardsUiProvider.tsx`: trạng thái UI trong phiên.
- `apps/mobile/scripts/prepare-rewards-design.cjs`: chuyển context và hình học đã đọc từ Figma thành dữ liệu/asset của app.
- `apps/mobile/e2e/rewards-design.spec.ts`: nhận thưởng, nhắc, hủy/đổi, thiếu điểm, đổi danh mục và điều hướng.

## Kiểm chứng

- TypeScript và ESLint trong phạm vi thay đổi đạt.
- 2/2 luồng trình duyệt mới đạt.
- 77/77 kiểm tra component/unit hiện có đạt, 21 suite.
- Export web và bundle iOS/Android đạt; chưa QA vật lý trên điện thoại.
- 34 ảnh tại 428/390 px: không lỗi JavaScript, ảnh chưa tải hoặc tràn ngang.
- Audit **1.384 vị trí asset**: đúng file/hash, đã tải và hình học; lệch lớn nhất khoảng **0,020 CSS px**.
- So sánh pixel còn khác biệt raster chữ, emoji và một số chi tiết nhỏ. Chưa tuyên bố khớp toàn frame 100%.

Nguồn và kết quả: `docs/figma-fidelity/contexts/*-rewards.txt`, `*-rewards-geometry.json`, `rewards-transforms.json`, `rewards-asset-audit.json`, `rewards-visual-comparison.json`; log trong `docs/ui-progress-evidence-2026-10-31/rewards-*.log`.

Độ phủ theo inventory đã lưu hiện là **126/211 frame**, thêm **17 frame**, còn **85 frame**. Toàn bộ UI trang backuped vẫn đang tiếp tục.
