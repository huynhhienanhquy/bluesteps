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
| Hoạt động | 9 hoạt động: `green-class` và `tree-day` ngày 25/10/2026 theo thiết kế, 7 mẫu tháng 11 gồm `school-class`; có thu gom, trồng cây, workshop, giáo dục; dùng chung Home/list/detail/calendar/saved/registration/ticket/summary |
| Quà | 6 quà sống xanh/voucher; giá cả thấp hơn và cao hơn số dư 180 để thử nhánh đủ/thiếu điểm |
| Bài đọc | 13 bài, 4 chủ đề, metadata ngày/phút đọc/lượt xem/lượt thích mẫu và 2 bình luận gắn với `small-steps`/`recycle`; chưa lưu/thích/theo dõi chủ đề mặc định. Bảy bài từ Figma dùng ảnh/tiêu đề trong thiết kế, không xác nhận sự kiện/nhân vật thực tế |
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
- `apps/mobile/src/services/event-planning.ts`: seed ba bộ sưu tập (Cuối tuần có workshop, Gần nhà và Đi cùng bạn bè trống), cấu hình nhắc lịch ban đầu tắt và đăng ký/vé/feedback rỗng; tiện ích lịch dùng ngày ISO, không phụ thuộc timezone thiết bị. Nhắc lịch có hai kênh push/email độc lập, âm thanh/rung, mốc 1–168 giờ và giờ yên lặng; hàm preview tính giờ Việt Nam từ fixture, dời qua giờ yên lặng, loại lời nhắc trùng và không gợi ý sau lúc bắt đầu. Không hẹn/gửi thông báo thật.
- `apps/mobile/src/services/news.ts`: 4 chủ đề, metadata của 13 bài đọc và state lưu/thích/theo dõi/bình luận riêng; tìm kiếm không dấu, alias Tái chế → Phân loại và Sự kiện → Cộng đồng; sắp mới nhất/phổ biến/theo thứ tự lưu. Thêm bình luận kiểm article/reply cùng bài và sinh ID độc lập. Nội dung/metrics tổng hợp dùng để demo, không phải nguồn tin hoặc tác động cá nhân đã xác minh.
- `apps/mobile/src/services/demo.ts`: adapter đọc bất đồng bộ với content/loading/empty/error và cancellation.
- `apps/mobile/src/providers.tsx`: state của phiên demo và reset.

Khi đổi seed, cập nhật các ID liên quan. Test kiểm ID duy nhất, đích notification, liên kết quà–sổ cái, tổng số dư, tổng thống kê và tính độc lập giữa các phiên.

## Kịch bản demo nhanh

1. Home hiển thị Linh Chi và ví 180 điểm; vào sổ tay, tìm “Pin” hoặc một chuỗi không có kết quả.
2. Thu gom: lọc Thủy tinh để thấy các điểm phù hợp, thử hủy bộ lọc nháp; vào Hành trình để đổi thứ tự 2 điểm đã nạp.
3. Home → “Giờ học xanh”: mở đúng hoạt động `green-class`, lưu, mở biểu mẫu, điền tên/điện thoại/email, chọn số người/vai trò và hai mục đồng ý. Xác nhận mở vé mẫu; thử Lưu vé vào thiết bị để tải PNG trên web hoặc xin quyền thêm ảnh trên native. Bảng chia sẻ chỉ mở khi tự chọn sau lỗi lưu/từ chối quyền. Mô phỏng check-in, xem tổng kết và lưu phản hồi trong phiên. Không giữ chỗ hoặc cấp vé thật; QR là mô-típ Figma không có payload.
4. Hoạt động đã lưu có “Đổi giấy cũ, gieo mầm xanh”: vào Bộ sưu tập để tạo/thêm/chuyển/xóa; vào Nhắc lịch để chọn hoạt động, thời điểm, kênh và giờ yên lặng. Xác nhận xóa hoạt động loại bỏ cả liên kết bộ sưu tập/lời nhắc nhưng giữ đăng ký mẫu. Lịch mặc định tháng 10, ngày 25/10 có hai hoạt động chồng giờ 09:00–10:00; chọn ngày khác để thấy cảnh báo biến mất. Nút tùy chọn lịch mở lọc đã lưu/đã đăng ký, xem cả tháng và nhắc lịch; các nhóm Vé của tôi/Lịch sử chỉ mở đăng ký/check-in mẫu trong phiên.
5. Đổi quà → Lịch sử: chuyển giữa “Điểm xanh” và “Quà đã đổi”. Xem trước túi vải để thử đủ điểm, bình nước để thử thiếu điểm. Không có giao dịch thật.
6. Cá nhân → Thống kê: xem tổng mẫu và bảng tuần. Thông báo: mở một đích hoặc đánh dấu tất cả đã đọc.
7. Tin nhắn: mở Minh An, thêm tin nhắn demo, quay lại danh sách rồi mở lại; nội dung vẫn ở đúng hội thoại trong phiên. Bot dùng phản hồi có sẵn.
8. Tin tức: thử tìm “PIN CU”, lọc Phân loại hoặc sắp Phổ biến, lưu một bài rồi vào Bài đã lưu để thử hủy/xác nhận bỏ lưu. Vào bài `small-steps` để thêm bình luận, trả lời và thích; sang bài khác để thấy thảo luận tách riêng. Theo dõi một chủ đề rồi mở feed theo chủ đề đó. Lịch xanh mở đúng hoạt động; Tin nhanh có chọn ngày và đánh dấu đọc trong màn. Các route này tách khỏi hoạt động đã lưu/thảo luận cộng đồng.
9. Cài đặt: chọn Trống/Lỗi/Tải chậm rồi quay lại danh sách để thử UI. Chọn “Khôi phục dữ liệu demo” để khôi phục bài đăng, saved/liked, hành trình, thông báo, hội thoại, bộ sưu tập, cấu hình nhắc lịch, đăng ký/vé mẫu và state Tin tức; chế độ dữ liệu trở về Có dữ liệu.

Thẻ tin tức Home mở bài `daily-waste` có tiêu đề/ảnh từ thiết kế đã lưu. Con số trong tiêu đề là nội dung mẫu chưa đối chiếu nguồn; phần thân ghi rõ giới hạn này. Chỉ bài này có ảnh gốc đã lưu; năm bài còn lại dùng icon minh họa và chưa được coi là đã hoàn thiện asset Figma. Lịch sự kiện xanh là màn riêng dùng chung seed hoạt động, chưa có lịch biên tập thật. Trạng thái đọc bản tin nhanh là state của màn, không persist khi màn bị đóng.

Các thao tác hiện chỉ thay đổi RAM trong phiên, mất sau reload. Không phát JWT/OTP, upload ảnh, gửi tin nhắn, đăng ký vé hoặc redeem thật. Các số điểm trong lịch sử là fixture, không phải policy thưởng được chấp nhận. Các quyết định pending trong execution pack gốc được giữ nguyên.

Hai route /event-collections?preview=1 và /event-reminders?preview=1 dùng state minh họa riêng để đối chiếu layout: chọn/chuyển/lưu trong preview không sửa danh sách đã lưu, bộ sưu tập hay cấu hình thật của phiên. Luồng thường chỉ giữ cấu hình nhắc lịch sau khi bấm lưu; đóng bảng giờ yên lặng bỏ thay đổi chưa áp dụng. Bộ sưu tập truyền ID hoạt động đã chọn qua query; màn nhắc lịch lọc lại theo danh sách đã lưu.

Tin tức: `/articles?view=search&preview=1` nạp query “rác thải” và các bài mẫu từ thiết kế; `/articles/saved?preview=1` có sáu bài lưu mẫu riêng, chỉ hiện bốn thẻ đầu để đối chiếu frame. Thay đổi lưu/thích trong preview không sửa provider. Danh sách thường có bốn trang: ba trang đầu bốn bài và trang cuối một bài; alias Tái chế/Sự kiện tương ứng Phân loại/Cộng đồng. Ảnh minh họa gốc dùng cho fixture không chứng minh nhân vật hoặc hoạt động trong bài là sự kiện đã xác minh.

Lịch xanh `/articles/calendar` giữ nguồn tám event fixture hiện có, hiển thị theo tháng (mặc định 11/2026), đổi năm/tháng, chọn ngày/danh mục trong sheet. `/articles/calendar?preview=1` dùng ba ví dụ riêng từ Figma (`preview-*`); mở chi tiết chỉ hiện mô tả minh họa, không thêm vào catalog hoặc tạo đăng ký. CTA cuối dẫn feed Cộng đồng; các mục “Sắp mở đăng ký” không nhận đăng ký thật.

Bản tin thường lấy ngày/summary từ metadata của 13 bài; đọc/chưa đọc chỉ ở state màn đang mở. Chọn ngày nhận YYYY-MM-DD, kiểm ngày thật và năm nhuận. `/articles/briefs?preview=1` dùng ba tóm tắt ngày 29/10/2026 từ Figma; hai mục đầu mở sheet nêu rõ chưa có toàn văn xác minh và cung cấp bài demo liên quan riêng, mục thứ ba mở khám phá chủ đề. Đã đọc/preview không cấp thưởng hoặc gửi tin.

Trang chính Tin tức nằm ở `/articles`; tìm kiếm ở `/articles?view=search` (deep link `q`/`topic` vẫn hoạt động). `?view=latest` phân trang 4 bài, sắp theo metadata ngày của đủ 13 fixture; `?view=events` giữ năm bài đọc về hoạt động trong thiết kế, không phải lịch tổ chức đã xác minh. `youth-ideas` dùng đúng ảnh thẻ thanh niên và có metadata/body mẫu riêng; không đổi nội dung Home `daily-waste`. Trang chính có hai thẻ Sài Gòn Xanh cùng ID theo hai vị trí trong Figma. Tham số `preview=1` của ba trang dùng save/like cách ly; chuyển tab preview tạo mẫu mới, không ghi vào provider thật.
Chi tiết Tin tức native (31/10): `/articles/{id}` mở bố cục riêng cho `daily-waste`, `youth-ideas`, `local-cleanup`, `green-sunday`, `storm-cleanup`, `saigon-cleanup`, `ha-long` và `tourism-cleanup`. `daily-waste?expanded=1` mở ngay frame mở rộng; trong màn có thể mở rộng/thu gọn. `preview=1` dùng save/like riêng; mở thảo luận và quay về giữ preview. Năm bài không có frame riêng vẫn dùng màn đọc chung. Nguồn chữ/ảnh theo thiết kế, chưa phải tin đã xác minh.

Khám phá Hoạt động: `/events?preview=1` hiển thị `green-class`/`tree-day` và hai trái tim lưu mẫu; bấm lưu/bỏ lưu ở màn này không sửa provider. Màn thường giữ đủ tám fixture; bộ lọc tuần dùng mốc mẫu 19–25/10/2026 thay cho ngày hệ thống. Xóa bộ lọc khôi phục toàn bộ catalog.
