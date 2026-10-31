# Rà soát liên kết frame — 31/10/2026

**Chưa thể xác nhận mọi frame đều nối vào luồng sử dụng bình thường.** Đủ 211/211 frame có đường dẫn mở được, nhưng vẫn có cụm thiếu đường vào và frame chỉ dành cho preview.

Phạm vi: app Expo/React Native trong workspace hiện tại, đối chiếu kiểm kê `backuped` 211 frame đã lưu. Lượt này không đọc reaction/prototype trực tiếp trong file Figma và không nghiệm thu trên thiết bị native.

| Kết quả | Bằng chứng |
| --- | --- |
| 68 route; không có route thiếu trong 211 mapping frame | [Audit tĩnh](ui-progress-evidence-2026-10-31/navigation-static.json) |
| 211/211 đường dẫn mở được và đạt selector sẵn sàng; không ghi nhận lỗi JavaScript | [Audit runtime](ui-progress-evidence-2026-10-31/navigation-runtime.json) |
| 89/89 bài E2E đạt theo kết quả cuối của từng bài sau chạy lại; gồm bấm nút, chuyển màn, quay lại và giữ dữ liệu phiên | [Kết quả tổng hợp](ui-progress-evidence-2026-10-31/navigation-validation.json) |

## Các điểm còn thiếu hoặc cần phân biệt

1. **Cụm onboarding 10 frame chưa có đường vào từ UI đang dùng.** App vào Home ở `app/(tabs)/index.tsx`; tìm kiếm mã nguồn chỉ thấy đường `/onboarding` trong `NotificationsScreen` cũ tại `src/features/content/ContentScreens.tsx:29`. Route thông báo hiện dùng `NotificationsDesignScreen`, nên đường cũ không cung cấp nút vào onboarding. Các bước onboarding nối được với nhau khi mở bằng deep link; bài E2E hoàn tất onboarding đạt. Cần gắn entry khi mở app lần đầu hoặc một mục xem lại giới thiệu nếu muốn cụm này thuộc luồng bình thường.
2. **Frame tải 64% `386:18473` chỉ được dựng tại `/design-preview`.** Chưa có luồng nghiệp vụ dẫn vào, chưa có chuyển tiếp khi tải xong hoặc nút thoát trên frame này (`src/features/backuped/BackupedParts.tsx:65`). Vì vậy chưa thể tính đây là một màn tải đã nối hoàn chỉnh.
3. **Khung pin `386:17297` là khung minh họa nhỏ, chỉ có preview.** Không tính nó như một màn hình nghiệp vụ bị thiếu nút. Menu `386:8558` tuy cũng có preview riêng nhưng đã được nhúng vào menu Tin tức, mở được Hồ sơ/Tin tức/Cộng đồng/Thống kê/Sổ tay.
4. **`/demo-tools` hiện không có nút đi vào.** Đây là công cụ QA ngoài mapping 211 frame. Nội dung README mô tả có thể bật dữ liệu lỗi/trống trong Cài đặt chưa khớp đường vào UI hiện tại.

Các biến thể game, bàn phím, modal và trạng thái nội bộ không nhất thiết là route riêng. Audit mở link chỉ chứng minh màn dựng được; không dùng số 211 để suy ra đã kiểm thử toàn bộ cạnh chuyển trạng thái.

## Kiểm chứng và thay đổi trong lượt rà soát

Web export và TypeScript đạt khi chạy ngoài sandbox; sandbox ban đầu chặn đọc một số dependency. Không thay đổi mã UI hoặc cách điều hướng sản phẩm.

Bổ sung hai script có thể chạy lại: `apps/mobile/scripts/audit-navigation.cjs` và `apps/mobile/scripts/audit-navigation-runtime.cjs`. Script runtime cần web export mới và preview server tại cổng 4173.

Lượt E2E đầu chạy đủ 89 bài: 81 đạt, 8 không đạt. Rà soát phát hiện các kịch bản cũ chưa đóng modal yêu thích, còn dùng tên ô tìm kiếm cũ, bỏ qua màn Danh sách đọc, đếm thiếu một sự kiện seed và kỳ vọng rời preview dù UI vẫn giữ preview. Đã cập nhật các test liên quan. Hai bài chụp nhiều route dùng giới hạn 60 giây; bài Tin tức vốn có 60 giây được chạy lại riêng sau khi hết các lượt Chrome đồng thời. Kết quả cuối của từng bài được tổng hợp từ log gốc và các lượt chạy lại, không phải tuyên bố một lượt chạy toàn bộ mới đều xanh.

Log gốc được giữ tại `ui-progress-evidence-2026-10-31/navigation-*.log`. Prettier đạt; ESLint các file thay đổi có 0 lỗi, còn 3 cảnh báo sẵn có trong `events.spec.ts` về import trùng và `require()`.
