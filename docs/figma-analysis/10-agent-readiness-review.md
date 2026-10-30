# Review kế hoạch trước khi giao AI agent

Ngày review: 29/10/2026. Phạm vi: tài liệu hiện có và workspace; nguồn UI chỉ trang backuped (`386:7053`). Không đánh giá chất lượng code runtime vì workspace chưa có app/backend, OpenAPI executable, migrations hoặc CI sản phẩm.

## Kết luận của lần review ban đầu (đã có refinement bên dưới)

**Chưa đủ để giao 48 dòng backlog cho AI agent tự triển khai toàn app.** Bộ hiện tại là phân tích sản phẩm, kiến trúc đề xuất và roadmap gồm **48 epic/work package**, chưa phải 48 implementation task có thể dispatch trực tiếp.

Điểm tốt: có nguồn Figma, phân biệt trạng thái nghiệp vụ quan trọng, invariant điểm/kho/chỗ, hướng Python/Supabase, backlog và giới hạn bằng chứng. Điểm thiếu nằm ở Definition of Ready: contract chưa executable, quyết định chưa khóa, task quá lớn, dependency theo capability chưa đủ, test command và artifact bàn giao chưa được thiết lập.

Kết quả `passed` của `verify_analysis.py` chỉ chứng minh **tính nhất quán tài liệu trong phạm vi kiểm tra của script**. Không phải chứng nhận plan đủ để agent code, không phải test backend, không phải xác nhận policy đã được người dùng duyệt.

Bảng sau giữ phát hiện **trước refinement** để đối chiếu; trạng thái hiện tại nằm ở phần cập nhật v0.2 cuối tài liệu. Auth ownership đã được user chốt là Python Identity, không còn là quyết định mở.

## Phát hiện theo mức ưu tiên

| ID | Mức | Bằng chứng hiện tại | Rủi ro khi giao agent | Hướng xử lý / trạng thái sau review |
|---|---|---|---|---|
| AR01 | P1 | `05`/`backlog.json`: F06 gồm profile/avatar/email/session/PIN; S05 gồm chat/media/reconnect/mood notes; F01 gồm repo/CI/staging/worker/DB | Một agent phải tự chia scope, đổi nhiều domain và khó rollback; “xong task” không rõ | **Đã gắn nhãn epic, chưa implementation-ready**. Cần child packets theo một capability, thường một thay đổi reviewable; không chia theo số file máy móc |
| AR02 | P1 | `06`: rule điểm, claim timezone/streak, vé nhóm, friendship, fulfillment, retention chưa chốt; `09` tự host Python Identity chỉ là baseline đề xuất | Agent có thể tự biến giả định thành policy hoặc triển khai một hệ auth không mong muốn | **Còn mở**. Mỗi packet phải khai báo decision IDs và owner; dừng đúng phần phụ thuộc khi chưa có câu trả lời. Python/Supabase đã chọn, Auth/Storage/Realtime chưa chọn |
| AR03 | P1 | `03`: bảng POST `/sorting-actions` dùng `confirmedCategory`; đoạn contract sâu dùng `confirmedItemId`; manual action chưa cùng một schema. Wildcard admin chưa thành operation cụ thể | Mobile/server có thể build hai DTO khác nhau; mock pass nhưng integration hỏng | **Còn mở**, ghi `CI-001/CI-002` trong `api-contract-issues.json`. D03 cần chốt field/oneOf/error và OpenAPI trước code domain liên quan |
| AR04 | P1 | `04` là dictionary logic; `09` mô tả private schema/runtime role/RLS nhưng chưa có migration và policy matrix thực thi | Sai grants hoặc policy có thể chặn tất cả request hoặc để role truy cập quá rộng; schema private không thay ACL | **Còn mở**. Cần ma trận actor × action × resource, migration roles/grants/default privileges/RLS và test bằng role thật; không dùng DB owner để chạy các test này |
| AR05 | P1 | `05`: F01 phụ thuộc D03, trong khi D03 đòi generated types; D04 cần môi trường chạy. F06 dùng avatar nhưng thiếu C03. C04 cần queue/outbox nhưng N01 đến sau. E02 calendar dùng saved/registered trong khi E05 tạo saved flow và lại phụ thuộc E02 | Graph không chu trình vẫn có thể thiếu prerequisite capability; agent phải tự làm ngoài scope hoặc tạo vòng phụ thuộc ngầm | **Sửa trực tiếp:** F06 thêm C03. **Còn cần tách:** bootstrap khỏi F01; queue/outbox infrastructure khỏi notification delivery; saved-event data contract khỏi calendar/collection UI. Chưa tuyên bố graph đủ ngữ nghĩa |
| AR06 | P1 | Q01/Q02 phụ thuộc S08/G03, O02 kéo theo cả hai; S08 call/video và G03 XO/Đua vịt còn điều kiện scope/luật | Gate release vô tình bắt buộc tính năng mới chỉ thấy icon/card; cũng có thể agent tự bỏ chúng để pass | **Còn mở**. Graph là full candidate scope; phải có quyết định include/defer/exclude có nguồn và release manifest trước dispatch release. Không tự xóa tính năng hoặc coi unknown là đã loại |
| AR07 | P1 | Repository chưa có `pyproject.toml`, `package.json`, Supabase migrations, API schema, fixtures và CI app; acceptance đa số là câu mô tả | Agent có thể ghi “tests pass” chỉ từ lint/docs hoặc test mock; không tái lập được bàn giao | **Đã thêm packet bootstrap và command contract có nhãn planned**. Cần tạo/chạy các command thật ở implementation; verifier hiện tại không thay các test đó |
| AR08 | P2 | `05`: 518 ngày công và cửa sổ lịch cũ; `08/09` đã đổi backend sang Python/Supabase và nói chưa re-estimate | Dễ dùng con số cũ làm deadline/cam kết năng lực agent | **Giữ là historical planning estimate**, không dùng như SLA; re-estimate child packet sau spike, theo throughput/review/integration thay vì đổi ngày công thành token |
| AR09 | P2 | `06` DEC21 còn viện dẫn collection token chỉ Light sau khi nguồn phân tích đã giới hạn backuped; chỉ 8 frame có visual inspection | Agent có thể lấy thông tin ngoài phạm vi hoặc suy pixel-perfect cho mọi screen | **Đã bỏ claim collection ngoài phạm vi**. Mỗi UI packet cần frame ID, ảnh render tương ứng, state/failure cases và evidence thiết bị/viewport; không coi text traversal là visual QA |
| AR10 | P2 | Không có start/resume/handoff format hoặc giới hạn ownership theo task | Agent dễ chạy lặp, ghi đè việc khác, “hoàn thành” bằng báo cáo ý định | **Đã bổ sung execution guide**, schema packet và mẫu handoff; chưa tự spawn agent hoặc triển khai code |

P1 = cần giải quyết trước khi triển khai phần phụ thuộc; P2 = ảnh hưởng độ tin cậy/hiệu quả bàn giao. Không có phát hiện P0 từ review tài liệu này. Các chỗ “còn mở” không được đổi thành đã giải quyết chỉ vì thêm checklist.

## Điều chỉnh đã thực hiện

- `backlog.json` ghi rõ granularity epic, readiness chưa đạt; từng epic có decision gates, artifact gates và liên kết tới register readiness.
- F06 thêm prerequisite C03 để profile/avatar không chạy trước media capability.
- Thêm [execution guide](11-agent-execution-guide.md), [packet bootstrap mẫu](agent-packets/AG-001-api-bootstrap.md) và [manifest readiness](agent-readiness.json).
- Thêm [contract issues](api-contract-issues.json), giữ vấn đề field mismatch ở trạng thái mở thay vì tự chọn business contract.
- Verifier xuất riêng `documentationIntegrity` và `agentImplementationReadiness`; không biến tài liệu hợp lệ thành implementation-ready.

## Thứ tự tiếp theo

1. Có thể giao **AG-001** để scaffold API Python local theo FastAPI đề xuất, chỉ khi người dùng yêu cầu bắt đầu implementation; chưa có lệnh triển khai trong lần review này.
2. Tách D03 thành contract tasks cho từng flow; giải quyết `CI-001`, `CI-002`, auth ownership, role/grants matrix và skeleton migration trước các mutation nhạy cảm.
3. Tách F01/D04 theo bootstrap, DB role/pooling/PostGIS, queue/outbox, SDK/provider spike; không để tất cả là một task “nền tảng”.
4. Hoàn thiện một lát cắt end-to-end nhỏ có fixture, test và UI evidence rồi mới mở rộng; ví dụ sổ tay read-only trước scan/award hoặc redemption.
5. Chốt scope manifest cho call/video/XO/Đua vịt và review readiness từng child packet; toàn bộ phạm vi sản phẩm vẫn được bảo toàn ở roadmap.

Sau review: **sẵn sàng để dùng làm đầu vào refinement và bootstrap có giới hạn; chưa sẵn sàng để agent tự động code/release toàn app.**


## Cập nhật v0.2 — đã xử lý ở mức execution plan

| Finding | Cách xử lý hiện tại | Giới hạn còn lại |
|---|---|---|
| AR01 | 48 epic → 90 capability → 270 SPEC/BUILD/VERIFY packet, mỗi packet có path ownership, dependencies, decision gates, scenarios và command contracts | Chưa có app code; BUILD chỉ dispatch khi prerequisites và schema đúng capability đã được verify |
| AR02 | Python Identity đã có user confirmation; decision register phân loại technical default với product input; pending chỉ gate phần liên quan | Rule điểm/streak/vé nhóm/friendship/fulfillment/retention vẫn cần nguồn quyết định, không tự approval |
| AR03 | CI-001 đóng ở design: source+itemId và scanId cho scan, strict oneOf và negative fixtures. 172 concrete operations có owner SPEC, 9 operation có OpenAPI pin | CI-002 còn theo dõi schema còn lại; mọi operation chưa có schema bị gate theo owner packet, không cho DTO placeholder |
| AR04 | Có access matrix rõ PUBLIC/anon/authenticated/runtime/owner; DB-ACCESS packets yêu cầu migration và test bằng role thật | Matrix/packet chưa là SQL đã chạy; cần implementation evidence trước DB use case nhạy cảm |
| AR05 | Bootstrap trước D03, queue/outbox riêng N01 delivery, SAVED-CORE trước calendar, game socket foundation độc lập social graph; avatar phụ thuộc media | Scheduler dùng packet DAG, không dùng coarse epic table làm toàn bộ điều kiện chạy |
| AR06 | S08/G03 tách core QA DAG, vẫn giữ conditional candidates và full-release disposition gate | Production release chưa được phép khi scope còn unknown; không bỏ candidate ngầm |
| AR07 | Packet có planned vs available commands, fixture cases, handoff schema, runtime verification stage riêng | Chưa chạy backend/mobile/DB/provider tests; chỉ đã kiểm plan/contracts |
| AR08 | Estimate cũ giữ historical/provisional; đề xuất re-estimate sau capability spike và first vertical slice | Không chuyển 518 ngày công thành SLA hoặc token budget cho agent |
| AR09 | Chỉ backuped; input hash, exact-frame selection ở SPEC, visual evidence bắt buộc cho UI packet | Các frame chưa render không được coi là pixel QA đạt |
| AR10 | Persistent task-state + pinned-input fingerprint, handoff schema và invalidation khi input đổi; generator không overwrite authored contracts/decisions trong routine run | Reviewer vẫn cần đọc diff/evidence; manifest ready là snapshot, không là live agent status |

**Kết luận hiện tại:** sẵn sàng bắt đầu agent theo task/gate trong [12 — Start Here](12-agent-start-here.md); chưa production-ready hoặc chứng minh toàn bộ app đã implement. Xem [validation results](execution/validation-results.json).
