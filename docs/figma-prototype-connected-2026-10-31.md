# Liên kết prototype Figma — 31/10/2026

Đã kiểm tra và sửa trực tiếp trang **backuped (`386:7053`)** trong file Figma `7GCLABwia0mauoszRi0Vtt`, bằng tài khoản **h** theo lựa chọn của người dùng.

**Kết quả sau sửa: 211/211 frame có đường đi từ màn khởi động, 0 action dẫn tới đích trống hoặc không tồn tại, 0 frame không có chuyển tiếp/quay lại/đóng.** Đây là kết quả đọc lại cấu trúc prototype trực tiếp trong Figma, bao gồm nhánh điều kiện, overlay và chuyển cảnh tự động; không phải tuyên bố đã bấm thủ công mọi nút trong Presentation.

[Mở prototype từ màn khởi động](https://www.figma.com/proto/7GCLABwia0mauoszRi0Vtt/Untitled?page-id=386%3A7053&node-id=386-7148&starting-point-node-id=386%3A7148).

| Kiểm tra | Trước | Sau |
| --- | ---: | ---: |
| Số frame | 211 | 211 |
| Frame đi tới được từ khởi động | 179 | 211 |
| Action có destination trống | 146 | 0 |
| Reaction tổng cộng | 1.972 | 1.993 |
| Frame không có chuyển tiếp/quay lại/đóng | 5 | 0 |

Đã chỉnh reaction hoặc vùng bấm trên 213 node, giữ nguyên tập 211 frame. Luồng onboarding và tải game 64% vốn đã nối trong Figma; kết luận về app ở lượt trước không dùng để suy ra trạng thái Figma.

Các thay đổi chính:

- Sửa 120 action tab dưới ở các màn Sổ tay, Quét rác, Hoạt động và Đăng bài. Tab đang được chọn không tự điều hướng về chính nó. Xử lý thêm 26 action đích trống ở nút kết quả, menu và các phần tử trùng/thừa; giữ reaction đổi variant của toggle và spinner.
- Nối luồng camera → đang xử lý → nhận diện → thành công → kết quả → chi tiết → tích điểm. Thumbnail ảnh có nhánh không nhận diện; các nút quay lại hoạt động ở từng trạng thái liên quan.
- Nối vùng hỏi AI trong Chat vào RecycleBot, bổ sung đường thoát về Chat, đưa trạng thái giọng nói bị tách rời vào chuỗi ghi âm.
- Nối 19 thẻ trong danh sách Sổ tay tới hướng dẫn hoặc bảng phân loại tương ứng. Ảnh pin có thể mở khung minh họa phụ và đóng lại.
- Nối trạng thái “Đã quan tâm” của hoạt động trường Vành Khuyên; các nút Xóa ở danh sách yêu thích mở phản hồi đã xóa, phản hồi có thể đóng/tự đóng. Nút đi tới yêu thích trong popup đã lưu dẫn tới danh sách tương ứng.
- Nối đủ các mục menu Tin tức/Hồ sơ/Cộng đồng/Thống kê/Sổ tay. Màn ví điểm dài có các lối tới phần thưởng, cách tính điểm, lịch sử và hồ sơ.
- Nhánh trò chơi kiểm tra chưa hoàn chỉnh dẫn tới đúng frame kết quả riêng `487:19805`, thay vì dùng chung kết quả đầy đủ.
- Đặt lại 10 vùng bấm tab trong Tin tức và Thống kê. Trước đó chúng tham gia auto-layout nên bị xếp dọc ra ngoài frame; hiện dùng vị trí tuyệt đối trùng các icon tab gốc. Không thêm lớp đồ họa mới.

Đã đọc lại 67 node điều khiển/vùng bấm mới nối: tất cả có kích thước dương, hiện cùng các ancestor và có action thực. Ảnh render cuối của Tin tức và Thống kê giữ nguyên bố cục, không xuất hiện vùng bấm hữu hình hoặc phần tử tràn mới.

Hồ sơ kiểm chứng:

- [Graph trước sửa](ui-progress-evidence-2026-10-31/figma-prototype-before.json), [graph sau sửa](ui-progress-evidence-2026-10-31/figma-prototype-after.json).
- [Kết quả xác minh](ui-progress-evidence-2026-10-31/figma-prototype-verification.json), [kiểm tra node điều khiển](ui-progress-evidence-2026-10-31/figma-prototype-controls.json).
- [Danh sách thay đổi và reaction trước sửa](ui-progress-evidence-2026-10-31/figma-prototype-changes.json), [script audit chạy trong ngữ cảnh Figma](ui-progress-evidence-2026-10-31/figma-prototype-audit.js).

Các entry reaction rỗng kế thừa/placeholder còn lại không được tính là liên kết hoạt động trong audit. Phạm vi hoàn tất là nối các frame prototype; không đồng nghĩa mọi điều khiển nhập liệu hoặc nghiệp vụ đều đã được mô phỏng. Không sửa mã UI app hoặc backend trong lượt này.
