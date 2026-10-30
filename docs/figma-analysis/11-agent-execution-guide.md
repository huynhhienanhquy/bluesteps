# Quy tắc bàn giao implementation task cho AI agent

Áp dụng cho dự án chỉ lấy interface từ backuped (`386:7053`), backend Python, database Supabase. Đây là hướng dẫn cho lần implementation được yêu cầu sau này; không cấp quyền tạo dịch vụ cloud, mua provider hoặc deploy chỉ bằng việc đọc tài liệu này.

## 1. Đầu vào chuẩn và thứ tự xử lý mâu thuẫn

1. Yêu cầu và quyết định mới nhất của người dùng trong chat.
2. Instruction đang áp dụng của workspace/subtree; hiện root chưa có `AGENTS.md` cho sản phẩm. `codex-agent-kit` là thư mục riêng, không tự trở thành instruction của app tương lai.
3. Decision record đã được chốt cho task; Python/Supabase là fixed constraint, Python Identity là lựa chọn đã xác nhận; FastAPI và các thư viện khác là technical default có version của plan.
4. Task packet với contract/migration/interface revision đã pin; nếu packet mâu thuẫn decision đã chốt, phải sửa packet trước code.
5. Tài liệu kiến trúc/catalog tổng quát chỉ làm context, không override contract được chốt.

Xung đột cùng mức chưa được giải quyết là một blocker của phần phụ thuộc, không là quyền tự chọn theo ý agent. Agent tiếp tục được phần độc lập đã rõ. Không tự chốt policy điểm, auth owner, retention, friendship hay phương thức giao quà; không hỏi lại quyết định đã có câu trả lời.

## 2. Epic khác implementation packet

48 dòng trong `05-delivery-plan.md` là **epic** đã được tách thành các capability và packet ở `execution/tasks.json`. **Packet DAG là nguồn dispatch chuẩn**; một parent epic chưa xong không chặn child packet độc lập đã có prerequisite rõ. Một packet thường nên hoàn thành trong một thay đổi có thể review và kiểm chứng độc lập: một command/query, một migration capability hoặc một flow UI giới hạn. Không giao “làm F06 đầy đủ” cho một agent mà thiếu API/media/auth contracts.

Mỗi packet có một owner, phạm vi file/domain, output và evidence. Chỉ chia việc song song khi dependency đã ổn định và vùng sửa tách rõ; không tự spawn subagent từ tài liệu này. Shared OpenAPI, migrations và design tokens cần owner điều phối để tránh sửa cùng artifact.

## 3. Definition of Ready

Chỉ mark `ready` cho **packet cụ thể**, không cho cả roadmap vì graph DAG hợp lệ. Packet phải có:

| Trường | Yêu cầu |
|---|---|
| Identity | ID, loại planning/spike/implementation, parent epic, mục tiêu một câu |
| Sources | Page ID backuped; node IDs nếu có UI; tên file + revision/hash artifact liên quan |
| Decisions | Fixed constraints, technical baseline, product decision IDs; trạng thái và nguồn xác nhận |
| Dependencies | Packet prerequisite và evidence đã đạt; service/mock nào được phép dùng |
| Scope | Allowed paths/domain; files dự kiến tạo/sửa; nội dung ngoài scope |
| Contracts | Schema input/output/error, auth matrix, state transitions; hoặc ghi không áp dụng với lý do |
| Data | Tables/migrations/constraints, fixtures, unit/timezone, cleanup; hoặc không áp dụng |
| Behavior | Happy path, validation, forbidden/cross-user, stale/conflict, retry/offline nếu liên quan |
| Verification | Working directory, commands, expected outcomes, required evidence; phân biệt command planned với available |
| Delivery | Diff summary, commands thực chạy, kết quả, artifact paths, unresolved risks và next handoff |

`needs_decision`, `needs_spec`, `needs_environment`, `ready`, `in_progress`, `review_required`, `done` là trạng thái packet. `done` cần evidence. Nếu chưa có repo/toolchain, command chỉ là **target command contract**; không được ghi đã chạy/pass.

Task planning có thể ready trong khi domain implementation vẫn needs_decision. Trạng thái/pin/handoff bền vững ở execution/task-state.json; routine generation không reset done/in_progress hoặc overwrite authored decision/contract. Input đổi thì chuyển needs_input_review và giữ evidence cũ. Spike được phép dùng fake/sandbox cô lập và dữ liệu tổng hợp; không được phát hành fake như kết quả provider thật hoặc đưa công thức demo thành policy production.

## 4. Template packet

```text
ID / type / parent:
Objective:
Sources + revisions:
Fixed constraints / technical baseline:
Decisions resolved / unresolved:
Prerequisite packets + evidence:
Allowed paths / excluded scope:
Input-output-errors + authorization:
State transitions / data constraints:
Fixtures + edge scenarios:
Implementation sequence:
Verification commands + cwd + expected results:
Definition of Done:
Handoff format:
```

Manifest chuẩn: [execution/tasks.json](execution/tasks.json); packet Markdown sinh ở agent-packets/generated. Ví dụ bootstrap chi tiết: [AG-001](agent-packets/AG-001-api-bootstrap.md), hiện được liên kết từ **API-BASE-BUILD**. Đây là một subset tách khỏi F01 để phá phụ thuộc ngầm bootstrap→generated client→bootstrap; parent F01 chưa vì thế được xem là xong.

## 5. Acceptance bắt buộc cho nghiệp vụ nhạy cảm

Các số sau là **fixture kiểm thử**, không phải giá/rule sản phẩm đã chốt.

| Capability | Fixture / thao tác | Kết quả phải chứng minh |
|---|---|---|
| Redemption cạnh tranh | Ví 100, quà cost 80, available=1; hai operation khác key chạy thật trên DB bằng hai connection | Chính xác 1 thành công; ví 20, một debit -80, một redemption và một outbox nghiệp vụ; không bán vượt kho |
| Retry cùng operation | Gửi lại key/body của redemption thành công, kể cả sau disconnect | Trả lại cùng operation/result theo contract; không thêm debit/redemption/outbox cùng loại |
| Key reused với body khác | Cùng actor/operation/key, đổi reward hoặc quantity | 409 theo error contract đã pin, dữ liệu không thay đổi |
| Capacity | Sự kiện còn 1 chỗ; hai user đăng ký 1 người đồng thời | Một confirmed; reserved_count tăng 1; một registration giữ chỗ/vé theo ticket policy đã chốt |
| Cross-user | User B gọi read/mutate resource của A; actor không có operator scope | Deny theo 403/404 contract; response/log không lộ contact/token/media của A |
| DB grants | Dùng role `anon`/`authenticated`/runtime/migration thật, không chỉ DB owner | Client roles không ghi ledger/kho/chỗ hoặc chạy privileged function; runtime đúng quyền; migration owner chỉ dùng ở migration |
| Worker crash/redelivery | Crash sau commit side effect trước ack, broker giao lại | Consumer phát hiện source đã xử lý; không award/fulfill lần hai; có trạng thái reconciliation cho provider unknown |
| Event reschedule | Job generation cũ đến hạn sau event/rule version đã đổi | Không gửi nhắc stale; tạo delivery mới theo rule/time policy đã chốt |

Phải xác định status/error exact trước khi chạy test. Assert database rows và aggregate invariants, không chỉ HTTP status hoặc mock call count. Test bằng role runtime mới chứng minh grants/RLS runtime; owner connection có thể cho kết quả khác.

## 6. Command và artifact gates

| Nhóm | Command contract sau bootstrap | Hiện trạng khi review |
|---|---|---|
| Tài liệu | Chạy `tools/verify_analysis.py` bằng Python có sẵn | Available; chỉ kiểm tài liệu |
| Python unit/API | Từ `apps/api`: `python -m pytest`, `python -m ruff check .`, `python -m ruff format --check .`, `python -m mypy src` | Planned; chưa có package/config, không được báo pass |
| API schema | Xuất OpenAPI deterministic, validate schemas/error examples, generate client rồi compile client | Chưa có script; D03/F01 phải tạo và ghi tên command thật |
| Supabase | Local reset/migrate trên test project + role/constraint integration suite | Chưa có config/migrations; không chạy reset hoặc migration lên cloud/production để test |
| Mobile | Typecheck, component tests, platform build, E2E theo scripts thực tế | Chưa có package.json/app scaffold; không invent command “đã tồn tại” |
| Release | UAT, restore/load reports, migration rehearsal, selected-scope manifest | Chưa sẵn sàng; deployment cần quyền riêng |

Một child packet có thể chưa cần DB/mobile; ghi N/A cụ thể. Không bắt mọi packet chạy toàn bộ hệ thống, nhưng phải chạy test đủ mạnh cho thay đổi của nó. Không tạo test mirror implementation chỉ để có số lượng test.

## 7. Start, resume và handoff

Trước code: đọc packet và file hiện tại; kiểm tra git status nếu có repo; xác nhận prerequisites bằng artifact/output thật. File lock hoặc status cũ không chứng minh agent khác vẫn chạy. Không ghi đè thay đổi ngoài scope.

Nếu test fail: ghi command, failure và phạm vi ảnh hưởng; sửa trong scope rồi chạy lại phần liên quan. Không thay expected result để giữ implementation sai. Nếu blocked: nêu quyết định/service cụ thể đang thiếu, phần đã làm và việc độc lập có thể tiếp tục; không đánh dấu epic done.

Handoff tối thiểu:

```text
Packet: <id>, status: <review_required|blocked|done>
Changes: <paths + behavior>
Evidence: <cwd, exact commands, exit codes, artifact paths>
Contracts/migrations changed: <revision + compatibility>
Open decisions / failures: <IDs + impact>
Next: <packet/prerequisite that is now unblocked>
```

Reviewer kiểm diff và evidence với requirement, không duyệt chỉ từ câu “all tests passed”. Sau đổi contract/schema, cập nhật types/fixture/packet revisions và invalidation của task phụ thuộc.

## 8. Release scope và quyền hạn

S08/G03 là candidate có điều kiện, đã tách khỏi core Q/UAT dependency graph và có gate riêng trong execution/release-manifest.json. Trước release phải có manifest ghi từng epic include/defer/exclude cùng nguồn quyết định; unknown không được tự coi là excluded. Conditional decision chưa chốt giữ release chưa ready, nhưng không chặn một packet nền tảng độc lập.

Không tự provision Supabase cloud, mua provider, gửi email/push thật, seed production, migrate/reset remote DB, deploy hoặc publish app từ task review/packet template. Khi người dùng đã yêu cầu hành động cụ thể trong phạm vi, thực hiện phần đã được phép và các kiểm chứng cần thiết; không tạo thêm vòng xin phép không có lý do.
