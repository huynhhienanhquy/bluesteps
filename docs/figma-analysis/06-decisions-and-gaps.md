# Quyết định, giả định và khoảng trống của thiết kế

## Cách đọc

**Quan sát** là điều đọc được trong Figma; **đề xuất** là kiến trúc/nghiệp vụ nên triển khai; **cần chốt** là quyết định chưa có đủ bằng chứng. Phân tích có thể hoàn thành trong khi các quyết định sản phẩm vẫn mở; các ticket phụ thuộc phải giải quyết chúng trước implementation. Những lựa chọn ghi rõ **đã chốt**, gồm backend Python và database Supabase, là yêu cầu của chủ dự án; các đề xuất còn lại không tự trở thành chấp thuận chỉ vì xuất hiện trong kế hoạch.

Nguồn trạng thái có thể đọc bằng máy: [execution/decisions.json](execution/decisions.json). Các technical defaults được ghi rõ là quyết định kỹ thuật trong plan; product policy pending chỉ chặn BUILD/VERIFY tương ứng. Auth owner đã có xác nhận của user, không hỏi lại.

## Decision log

| ID | Bằng chứng/điểm chưa rõ | Phương án đề xuất để lập kế hoạch | Cần chốt trước |
|---|---|---|---|
| DEC01 | GreenSteps, BlueSteps, BLUENSTEPS và Healing xuất hiện ở nhiều màn | Dùng BlueSteps làm tên tài liệu theo workspace; thống nhất brand/copy/assets trên app sau quyết định | Design tokens, store listing, nội dung |
| DEC02 | User đã chọn Python + Supabase và xác nhận Python tự quản lý tài khoản/mật khẩu/session | **Đã chốt Python Identity, Supabase Database only**; technical baseline FastAPI/Pydantic/SQLAlchemy/psycopg; không triển khai Supabase Auth | Pin phiên bản/DB pooling qua foundation packets; auth ownership không còn là câu hỏi mở |
| DEC03 | Onboarding có “Khám phá trước”, “Bỏ qua” và “Để sau” | Guest đọc nội dung/điểm/hoạt động; command giao dịch phải login; guest scan quota riêng nếu chọn | Auth guard, guest navigation, chống abuse |
| DEC04 | UI ba nhóm hữu cơ/vô cơ/tái chế; pin, y tế, điện tử xuất hiện trong sổ tay | Tách category, material và hazard; hướng dẫn theo vùng/nguồn; không dùng màu thùng như quy tắc toàn cầu | Taxonomy seed, scan labels, map filtering |
| DEC05 | “Cách tính điểm” có +2/+5/+3; scan nhựa +5; lịch sử có +10; game +1 | Rule version cấu hình, giới hạn nguồn và eligibility; bảng +2/+5/+3 là mẫu cần xác nhận | Ledger award, level, game reward |
| DEC06 | Wallet header 180 trong khi popup đổi quà ghi 182; lifetime có 253/348/353; thresholds 100/200/350/500/700 | Server trả balance và lifetime riêng; một bảng level thresholds thống nhất; seed mẫu không là rule | Wallet UI và đổi quà |
| DEC07 | Strip 7 ngày có số ngày 5/7 không đủ rõ bằng chữ; chưa có reset/missed-day policy | Chốt đủ 7 mức, timezone cố định, streak reset và một claim/ngày | Daily-claim schema/rules/jobs |
| DEC08 | Có quà vật lý/voucher/giải trí nhưng chưa có checkout nhận hàng, partner hay stock source | Chọn pickup hoặc shipping rõ; voucher one-time; demo có nhãn; production cần fulfillment/refund | Redemption end-to-end và vận hành |
| DEC09 | Point filter có “Còn chỗ” và “cộng đồng cập nhật, có thể thay đổi” | Có nguồn, observedAt, TTL, trạng thái unknown; capability tách per-material status | Point data import, routing alternatives |
| DEC10 | Đề xuất điểm nói phải xét duyệt; báo cáo nói xem xét trước khi cập nhật | Queue review, role theo scope, duplicate checks, audit; không tự publish | Công cụ moderator và public queries |
| DEC11 | Nút “Tôi đã bàn giao xong” là tự xác nhận; chưa có cân, operator QR hay sensor | Self-report khác verified; phương thức operator xác minh phải chốt; không phát kg verified từ ảnh | Handover award/statistics |
| DEC12 | Route chọn nhiều loại và thay điểm phải vẫn nhận đủ nhựa/giấy; all/any filter chưa được mô tả thành rule | MatchMode rõ ràng; route cover toàn vật liệu; ETA theo mode/time; không gọi là tối ưu nếu chỉ user order | Geo filtering, route algorithm |
| DEC13 | Registration có số người, tình nguyện viên từ 18 tuổi, vai trò và contact; vé ghi 1 người | Phân biệt audience trẻ 3–5 với người đăng ký 18+; chốt attendee list và group/individual ticket | Capacity, ticket/check-in model |
| DEC14 | QR vé ghi “minh họa, không dùng để quét thực tế” | Opaque token server, staff scope, validity window/anti-replay; thiết kế UI check-in staff bổ sung | QR production và offline check-in nếu cần |
| DEC15 | Lịch có hai activity overlap 1 giờ; “lưu không đồng nghĩa đăng ký” được ghi rõ | Saved/registration riêng; overlap cảnh báo trước; cấm đăng ký trùng chỉ khi product chọn | Calendar/registration validation |
| DEC16 | Reminder có offsets 1 giờ/1 ngày, nhiều kênh, quiet hours 22–07; yêu cầu hiện lock screen | Rule timezone, generation, next occurrence; OS permission/lock-screen do thiết bị quyết định; nhắc không vượt start | Notification UX và job scheduling |
| DEC17 | Composer có “Bạn bè” nhưng social notification có “Theo dõi” | Theo dõi một chiều + friendship chấp nhận hai chiều là baseline; có thể chọn mutual-follow nếu muốn đơn giản | Post ACL, media privacy, DM policy |
| DEC18 | Chat có call/video/document/camera/voice icons, ghi chú tâm trạng; chưa có màn call hoàn chỉnh | Chat text/media có đặc tả; call/video cần spike+flow riêng; mood notes chỉ là tính năng dự kiến cần TTL/audience | Realtime scope, provider và estimate |
| DEC19 | Bot có prompt rác nguy hại, frames Listening/Start/Stop; copy có “Meta AI” và số “11 tấn/ngày” | Không suy ra phải tích hợp Meta AI; bot dùng approved knowledge/citations; voice transcript có quyền và retention | AI adapter, dataset/evaluation |
| DEC20 | Game cards có Sứ mệnh xanh/XO/Đua vịt, tạo phòng, tạo lịch; chỉ Sứ mệnh xanh có board/result | Hoàn thiện rules/players/timeouts/award/host-disconnect cho từng game; ước lượng mở rộng là tạm | Game engine và multiplayer protocol |
| DEC21 | Cài đặt trên backuped có hai toggle sáng/tối; chưa kiểm tra trực quan đầy đủ mọi frame/theme | Một enum system/light/dark; bổ sung theme và test tương phản, không giả định dark đã hoàn chỉnh từ công tắc | Theming và accessibility QA |
| DEC22 | Thống kê trên backuped có 2.500 Kg, 120 lần/tuần và tỷ lệ mẫu | Chốt denominator/kỳ/đơn vị/evidence scope; thống kê từ facts, không copy mẫu | Statistics aggregation |
| DEC23 | Event summary trên backuped ghi rõ số liệu minh họa/chưa xác minh | Không khẳng định kết quả môi trường, accuracy, UX validation hoặc accessibility đạt chuẩn khi chưa đo | Content publish, báo cáo sản phẩm |
| DEC24 | Media, precise location, DOB, event contact, chat, audio xuất hiện; chưa có retention/account-delete screens | Thu tối thiểu; consent theo mục đích; private media; retention/deletion workflow phải thiết kế | Pilot có dữ liệu người thật |
| DEC25 | Chưa có DAU, tải concurrent, ngân sách, hosting hay provider | Cost model theo usage, pilot load profile và SLO; không mua dịch vụ dựa trên giả định | Infra sizing và release |

## Khoảng trống UI/flow cụ thể

| Nhóm | Chưa đủ bằng chứng trong Figma | Việc cần bổ sung |
|---|---|---|
| Form/account | Sai password, email tồn tại/đổi email, OTP expired/locked, OAuth cancel/collision, social-only change password | Thiết kế error/code/field focus; xác minh email flow; account recovery policy |
| Scan | Permission denied, ảnh lớn/upload fail, nhiều vật thể/confidence thấp, chỉnh kết quả, job timeout | State machine và fallback sổ tay/nhập tay; kết quả có confidence band đã hiệu chuẩn |
| Map/route | Không có điểm phù hợp, status cũ/unknown, point closed khi tới, route provider down, GPS yếu | Empty/error/alternative/manual-area; timestamp, nguồn và cảnh báo rõ |
| Point review | Moderator work queue, rejection/duplicate, báo cáo được xử lý | Operator/admin UI tối thiểu và thông báo kết quả |
| Rewards | Pending/out-of-stock/price changed, claim timezone conflict, nhận hàng/voucher, refund/dispute | Canonical receipt/status history, fulfillment UX, support flow |
| Events | Hết chỗ/deadline, hủy đăng ký/reschedule, ticket invalid/used, staff scan, attendee nhóm | Làm rõ capacities và check-in model trước code |
| Community | Sửa/xóa/report/block, private media, content moderation/appeal, danh sách bạn bè | ACL matrix và UI báo không còn quyền xem, không tiết lộ nội dung |
| Chat | Reconnect/retry/read receipt, blocked recipient, file lỗi, call/video lifecycle, mood note audience/expiry | Command/replay protocol và extension specification |
| Bot/voice | Không có nguồn, câu hỏi ngoài scope, cancel/limit, denied microphone | Safe fallback, citations, quota UI, recording preview và retention |
| Game | Room host rời, reconnect, timeout, tie, game rules cho XO/Đua vịt, lịch và lời mời | Server-authoritative rules và đầy đủ state diagrams trước implement |
| Settings/accessibility | Dark theme thật, large text, screen reader order, account delete | Token modes và QA trên thiết bị; shortcut search có nhãn semantic |

## Giả định không được biến thành dữ kiện

- Tên Healing trong profile/chat có thể là nội dung mẫu hoặc tên dự án cũ; không là bằng chứng tồn tại tổ chức/nhà cung cấp thật.
- Địa điểm, số điện thoại, website và người liên hệ trong thiết kế chưa được xác minh. Không import như dữ liệu production được duyệt.
- Số người tham gia, lượt like, khối lượng, điểm, thời gian phân hủy và tin tức là nội dung thiết kế; cần nguồn biên tập hoặc đo thực tế.
- Prototype có navigation và SET_VARIABLE minh họa tương tác; không chứng minh đã có authentication, DB, AI model, route engine hay backend kết nối.
- 169 frame có nhiều biến thể giống nhau và khung trợ giúp; số effort phải dựa use case/backend rules, không dựa riêng số frame.
- Node `386:14379` (TBáo_tích điểm) chứa cả chuỗi báo không nhận diện được bằng tiếng Anh và nội dung chúc mừng +5 trong cây chữ. Cần rà soát clip/visibility/copy của node này khi triển khai; sự có mặt của chuỗi trong cây không đủ để kết luận chúng chồng nhau trên ảnh render.
- Việc đã đọc mọi lớp chữ không tương đương kiểm tra pixel-perfect toàn trang backuped. Chỉ 8 ảnh đại diện đã được render/xem trong đợt phân tích.

## Phạm vi nguồn

Chỉ sử dụng interface trên trang **backuped (`386:7053`)**. Không dùng nội dung trang khác để bổ sung tính năng, số liệu, kết quả nghiên cứu hoặc kế hoạch. Các đề xuất vận hành/backend được đánh dấu là suy luận từ interface backuped, không phải tính năng đã có thiết kế đầy đủ.
