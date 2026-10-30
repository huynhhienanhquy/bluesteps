# Mock data để chạy demo frontend

## Chạy

Từ `D:\BlueSteps`:

```powershell
pnpm install --frozen-lockfile
pnpm demo
```

Expo in URL web trong terminal, thường là `http://localhost:8081`. Có thể dùng bản tĩnh bằng `pnpm build` rồi `pnpm preview` tại `http://127.0.0.1:4173`. Không cần backend, database, tài khoản, provider key hoặc biến môi trường. Không có API mạng được gọi để tải bộ mẫu.

## Bộ dữ liệu

| Nhóm | Số lượng / nội dung |
| --- | --- |
| Sổ tay | 10 vật liệu, gồm tái chế/hữu cơ/thu gom riêng, có hướng dẫn và nhãn pin nguy hại |
| Thu gom | 6 điểm, đủ 6 loại vật liệu, nhiều quận, trạng thái mở/đóng/gần đầy/tạm ngừng; địa chỉ và khoảng cách minh họa |
| Hoạt động | 6 hoạt động tháng 11/2026, gồm thu gom và workshop, dùng chung list/detail/calendar/saved |
| Quà | 6 quà sống xanh/voucher; giá cả thấp hơn và cao hơn số dư 180 để thử nhánh đủ/thiếu điểm |
| Bài đọc / cộng đồng | 5 bài đọc, 5 bài đăng và 3 bình luận gắn đúng bài; tác giả giả lập, lượt thích mẫu |
| Hồ sơ | Linh Chi, email `linhchi@example.test`, thành phố Đà Nẵng; không phải tài khoản thật |
| Ví và lịch sử | 4 dòng sổ cái mẫu: +100, +80, −120, +120 → số dư 180; tổng nhận 300, tổng dùng 120 |
| Quà đã đổi | 1 túi vải mẫu liên kết dòng −120 của sổ cái; trạng thái đã giao chỉ là fixture |
| Thống kê | 4 tuần tháng 10/2026; tổng 12 lượt phân loại, 8,4 kg và 2 hoạt động minh họa; không coi là số liệu xác minh |
| Thông báo | 5 bản ghi, 3 chưa đọc; đích mở vào event/article/point/history/onboarding có thật trong demo |
| Hội thoại | Minh An, Thu Hà và RecycleBot; tổng 8 tin nhắn ban đầu, trong đó Bot trả lời cố định và ghi rõ chưa có AI |
| Trạng thái phiên | Đã lưu workshop; đã thích post-2; hành trình gồm green-hub và paper-house |

## Vị trí nguồn

- `apps/mobile/src/services/fixtures.ts`: catalog và bài đăng tổng hợp, ID ổn định cho route chi tiết.
- `apps/mobile/src/services/mock-session.ts`: profile, wallet/ledger/redemption, thống kê, notifications và conversations.
- `apps/mobile/src/services/demo-session.ts`: tạo bản sao phiên độc lập và thêm tin nhắn cục bộ; không để thao tác demo sửa seed gốc.
- `apps/mobile/src/services/demo.ts`: adapter đọc bất đồng bộ với content/loading/empty/error và cancellation.
- `apps/mobile/src/providers.tsx`: state của phiên demo và reset.

Khi đổi seed, cập nhật các ID liên quan. Test kiểm ID duy nhất, đích notification, liên kết quà–sổ cái, tổng số dư, tổng thống kê và tính độc lập giữa các phiên.

## Kịch bản demo nhanh

1. Home hiển thị Linh Chi và ví 180 điểm; vào sổ tay, tìm “Pin” hoặc một chuỗi không có kết quả.
2. Thu gom: lọc Thủy tinh để thấy các điểm phù hợp, thử hủy bộ lọc nháp; vào Hành trình để đổi thứ tự 2 điểm đã nạp.
3. Hoạt động đã lưu có “Đổi giấy cũ, gieo mầm xanh”; lưu thêm một sự kiện hoặc xem lịch tháng 11.
4. Đổi quà → Lịch sử: chuyển giữa “Điểm xanh” và “Quà đã đổi”. Xem trước túi vải để thử đủ điểm, bình nước để thử thiếu điểm. Không có giao dịch thật.
5. Cá nhân → Thống kê: xem tổng mẫu và bảng tuần. Thông báo: mở một đích hoặc đánh dấu tất cả đã đọc.
6. Tin nhắn: mở Minh An, thêm tin nhắn demo, quay lại danh sách rồi mở lại; nội dung vẫn ở đúng hội thoại trong phiên. Bot dùng phản hồi có sẵn.
7. Cài đặt: chọn Trống/Lỗi/Tải chậm rồi quay lại danh sách để thử UI. Chọn “Khôi phục dữ liệu demo” để khôi phục bài đăng, saved/liked, hành trình, thông báo và hội thoại; chế độ dữ liệu trở về Có dữ liệu.

Các thao tác hiện chỉ thay đổi RAM trong phiên, mất sau reload. Không phát JWT/OTP, upload ảnh, gửi tin nhắn, đăng ký vé hoặc redeem thật. Các số điểm trong lịch sử là fixture, không phải policy thưởng được chấp nhận. Các quyết định pending trong execution pack gốc được giữ nguyên.
