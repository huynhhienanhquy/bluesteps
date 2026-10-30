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
| Hoạt động | 7 hoạt động: `green-class` ngày 25/10/2026 theo thiết kế đã lưu và 6 mẫu tháng 11; có thu gom, workshop, giáo dục; dùng chung Home/list/detail/calendar/saved/registration/ticket/summary |
| Quà | 6 quà sống xanh/voucher; giá cả thấp hơn và cao hơn số dư 180 để thử nhánh đủ/thiếu điểm |
| Bài đọc | 6 bài, 4 chủ đề, metadata ngày/phút đọc/lượt xem/lượt thích mẫu và 2 bình luận gắn với `small-steps`/`recycle`; chưa lưu/thích/theo dõi chủ đề mặc định |
| Cộng đồng | 5 bài đăng và 3 bình luận cộng đồng; state riêng với bình luận/lưu/thích của bài đọc |
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
- `apps/mobile/src/services/event-planning.ts`: seed ba bộ sưu tập (Cuối tuần có workshop, Gần nhà và Đi cùng bạn bè trống), cấu hình nhắc lịch ban đầu tắt và đăng ký/vé/feedback rỗng; tiện ích lịch dùng ngày ISO, không phụ thuộc timezone thiết bị.
- `apps/mobile/src/services/news.ts`: 4 chủ đề, metadata của 6 bài đọc và state lưu/thích/theo dõi/bình luận riêng; thêm bình luận kiểm article/reply cùng bài và sinh ID độc lập. Nội dung/metrics tổng hợp dùng để demo, không phải nguồn tin hoặc tác động cá nhân đã xác minh.
- `apps/mobile/src/services/demo.ts`: adapter đọc bất đồng bộ với content/loading/empty/error và cancellation.
- `apps/mobile/src/providers.tsx`: state của phiên demo và reset.

Khi đổi seed, cập nhật các ID liên quan. Test kiểm ID duy nhất, đích notification, liên kết quà–sổ cái, tổng số dư, tổng thống kê và tính độc lập giữa các phiên.

## Kịch bản demo nhanh

1. Home hiển thị Linh Chi và ví 180 điểm; vào sổ tay, tìm “Pin” hoặc một chuỗi không có kết quả.
2. Thu gom: lọc Thủy tinh để thấy các điểm phù hợp, thử hủy bộ lọc nháp; vào Hành trình để đổi thứ tự 2 điểm đã nạp.
3. Home → “Giờ học xanh”: mở đúng hoạt động `green-class`, lưu, mở biểu mẫu, điền tên/điện thoại/email, chọn số người/vai trò và hai mục đồng ý. Xác nhận mở vé mẫu; mô phỏng check-in, xem tổng kết và lưu phản hồi trong phiên. Không giữ chỗ hoặc cấp vé thật.
4. Hoạt động đã lưu có “Đổi giấy cũ, gieo mầm xanh”: vào Bộ sưu tập để tạo/thêm/chuyển/xóa; vào Nhắc lịch để chọn hoạt động, thời điểm, kênh và giờ yên lặng. Xác nhận xóa hoạt động loại bỏ cả liên kết bộ sưu tập/lời nhắc nhưng giữ đăng ký mẫu. Lịch mặc định tháng 10 theo thiết kế, có thể chuyển sang tháng 11.
5. Đổi quà → Lịch sử: chuyển giữa “Điểm xanh” và “Quà đã đổi”. Xem trước túi vải để thử đủ điểm, bình nước để thử thiếu điểm. Không có giao dịch thật.
6. Cá nhân → Thống kê: xem tổng mẫu và bảng tuần. Thông báo: mở một đích hoặc đánh dấu tất cả đã đọc.
7. Tin nhắn: mở Minh An, thêm tin nhắn demo, quay lại danh sách rồi mở lại; nội dung vẫn ở đúng hội thoại trong phiên. Bot dùng phản hồi có sẵn.
8. Tin tức: thử tìm “PIN CU”, lọc Phân loại hoặc sắp Phổ biến, lưu một bài rồi vào Bài đã lưu để thử hủy/xác nhận bỏ lưu. Vào bài `small-steps` để thêm bình luận, trả lời và thích; sang bài khác để thấy thảo luận tách riêng. Theo dõi một chủ đề rồi mở feed theo chủ đề đó. Lịch xanh mở đúng hoạt động; Tin nhanh có chọn ngày và đánh dấu đọc trong màn. Các route này tách khỏi hoạt động đã lưu/thảo luận cộng đồng.
9. Cài đặt: chọn Trống/Lỗi/Tải chậm rồi quay lại danh sách để thử UI. Chọn “Khôi phục dữ liệu demo” để khôi phục bài đăng, saved/liked, hành trình, thông báo, hội thoại, bộ sưu tập, cấu hình nhắc lịch, đăng ký/vé mẫu và state Tin tức; chế độ dữ liệu trở về Có dữ liệu.

Thẻ tin tức Home mở bài `daily-waste` có tiêu đề/ảnh từ thiết kế đã lưu. Con số trong tiêu đề là nội dung mẫu chưa đối chiếu nguồn; phần thân ghi rõ giới hạn này. Chỉ bài này có ảnh gốc đã lưu; năm bài còn lại dùng icon minh họa và chưa được coi là đã hoàn thiện asset Figma. Lịch sự kiện xanh là màn riêng dùng chung seed hoạt động, chưa có lịch biên tập thật. Trạng thái đọc bản tin nhanh là state của màn, không persist khi màn bị đóng.

Các thao tác hiện chỉ thay đổi RAM trong phiên, mất sau reload. Không phát JWT/OTP, upload ảnh, gửi tin nhắn, đăng ký vé hoặc redeem thật. Các số điểm trong lịch sử là fixture, không phải policy thưởng được chấp nhận. Các quyết định pending trong execution pack gốc được giữ nguyên.
