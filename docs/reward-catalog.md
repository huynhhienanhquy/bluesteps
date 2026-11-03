# Bổ sung danh mục phần thưởng

Ngày 03/11/2026, đã thêm 9 quà minh họa vào database Supabase development theo yêu cầu:

| Nhóm | Quà | Điểm |
| --- | --- | ---: |
| Voucher | Voucher siêu thị 30k | 150 |
| Voucher | Voucher giảm giá 10% | 160 |
| Voucher | Voucher workshop tái chế nhựa | 200 |
| Giải trí | Vé xem phim | 80 |
| Giải trí | Tham quan khu tái chế | 120 |
| Giải trí | Lớp sáng tạo đồ tái chế | 180 |
| Khác | Bình nước thủy tinh | 150 |
| Khác | Khung ảnh mini | 150 |
| Khác | Hộp đựng tài liệu | 150 |

Mỗi quà có 30 lượt tồn kho ban đầu, `state=published`, `synthetic=false` và mã `display-reward-*` ổn định. Mô tả ghi rõ đây là quà/voucher/trải nghiệm minh họa; chưa có ưu đãi tại đối tác hoặc giao hàng thực tế. Ảnh đóng gói trong project được nối theo mã API tại `apps/mobile/src/design-system/catalog-media.ts`, dùng chung cho danh sách và chi tiết.

Script chỉ thêm vào `rewards` và `reward_inventory`. Chạy lại giữ nguyên giá, trạng thái, tồn kho và lượng đã giữ chỗ của bản ghi có sẵn; không tác động ví hay lịch sử đổi quà. Đây là thao tác chủ động trên development/test, không chạy lúc khởi động và không cần migration schema.

Từ `apps/api`:

```powershell
& .venv/Scripts/python.exe scripts/seed_reward_catalog.py --allow-remote --dry-run
& .venv/Scripts/python.exe scripts/seed_reward_catalog.py --allow-remote
```

Bỏ `--allow-remote` khi dùng localhost. Cấu hình được đọc từ `.env` backend, không đưa credentials vào frontend.

Kiểm chứng:

- Đọc lại sau commit: thêm 9 quà và 9 dòng tồn kho.
- API với role runtime: mỗi nhóm trả 3 quà; phân trang với `limit=2` trả đủ qua 2 trang; đọc được cả 9 chi tiết, đúng tên/giá/tồn kho và đủ 9 mã ảnh.
- Dry run sau commit thêm 0 dòng, giữ nguyên tồn kho.
- Ruff, mypy và Prettier cho các file thay đổi đạt; đủ 21 đường dẫn ảnh trong catalog tồn tại.
- Typecheck frontend bị chặn bởi dependencies hiện tại thiếu `lib.dom.d.ts`, `lib.esnext.d.ts` và khai báo `node`/`react`. Chưa kiểm chứng bản bundle hoặc giao diện chạy thực tế trong lượt cập nhật này.

Tải lại màn hình Phần thưởng để lấy danh mục mới; reload ứng dụng để nhận bản ánh xạ ảnh mới.
