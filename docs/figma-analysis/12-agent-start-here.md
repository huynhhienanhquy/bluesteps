# Agent Start Here — BlueSteps execution plan v0.2

## Phạm vi và quyết định cố định

- Chỉ interface trên Figma **backuped (`386:7053`)**. Snapshot/catalog là evidence, không sửa nguồn Figma để khớp implementation.
- Backend **Python**, database **Supabase PostgreSQL/PostGIS**.
- User đã xác nhận **Python tự quản lý tài khoản, mật khẩu và session**. Không dùng Supabase Auth, không FK `auth.users`, không tạo hai kho session.
- FastAPI/Pydantic, SQLAlchemy/psycopg, Celery/Redis và WebSocket Python là technical defaults của plan. Native/mobile dùng TypeScript/React Native/Expo.
- Công việc hiện tại tạo plan/contracts/fixtures, chưa chạy API/DB/mobile, chưa cấp quyền deploy/provision cloud.

## 1. Nguồn chuẩn để nhận việc

| Artifact | Vai trò |
|---|---|
| [execution/tasks.json](execution/tasks.json) | Packet ID, stage, dependencies, product gates, scope, test contract, SHA-256 input pins, dispatch status |
| [execution/capabilities.json](execution/capabilities.json) | Capability cụ thể theo từng epic, API/data và acceptance scenarios |
| [execution/decisions.json](execution/decisions.json) | Fixed user choices, technical defaults, product decisions còn pending và owner |
| [contracts/core.openapi.json](contracts/core.openapi.json) | Contract design đã pin cho bootstrap/auth session/sorting/moderation |
| [contracts/operation-inventory.json](contracts/operation-inventory.json) | Từng method/path/operationId và owner SPEC; không còn dùng route wildcard làm implementation input |
| [contracts/access-matrix.json](contracts/access-matrix.json) | DB/runtime/client actor matrix, negative tests và RLS/grants artifact gates |
| [contracts/auth-policy.json](contracts/auth-policy.json) | Python Identity, JWT/OTP/password/session/refresh rotation defaults |
| [execution/release-manifest.json](execution/release-manifest.json) | Core candidates, conditional candidates và production activation conditions |
| [11 — Execution guide](11-agent-execution-guide.md) | DoR, evidence, ownership, resume/handoff và quyền hạn |

`05-delivery-plan.md` là roadmap và lịch sử estimate, không là scheduler. `contracts/core.openapi.json` là design contract; chưa chứng minh FastAPI server đã khớp contract.

## 2. Vòng làm việc

1. Chọn packet có `dispatchStatus=ready`; không chọn nguyên epic. Bắt đầu với **API-BASE-BUILD** để scaffold backend hoặc các SPEC độc lập ở ready list. API-BASE-SPEC là `provided_design`, không phải implementation đã chạy.
2. Đọc packet Markdown tại `packetPath`, kiểm current workspace/instructions và `inputPins`. Nếu file nguồn đổi hash, review/invalidate packet/handoff liên quan; không tự cập nhật hash để bỏ qua thay đổi.
3. Với **SPEC**: tạo schema request/response/error/state/authorization, chọn exact frame IDs, fixtures valid/invalid, data/migration impact và command thật cho capability. Product gate pending phải giữ rõ; không ghi candidate thành approved.
4. Với **BUILD**: prerequisite VERIFY/SPEC phải có evidence đạt. Chỉ code capability được giao, migration/contract/shared artifacts có một owner. Không chuyển operation pending thành DTO `{}` chỉ để generate client xanh.
5. Với **VERIFY**: kiểm behavior bằng môi trường đúng mức — real DB roles/connections cho grants/race, worker/broker cho redelivery, device/render cho native UI. Ghi failures/skips; planned command chưa tồn tại không được báo pass.
6. Ghi handoff theo [schema](execution/handoff.schema.json). Chỉ chuyển `done` khi các output/check required đều có bằng chứng, product gate liên quan đã được resolve đúng nguồn. Recompute dispatch/readiness; không đánh dấu parent epic done vì một health endpoint pass.

`dispatchStatus` trong manifest là snapshot lúc sinh plan. Trước dispatch lần sau phải đối chiếu task state/handoff hiện tại và prerequisite; không xem snapshot cũ như trạng thái live.

## 3. Tách việc giúp tránh vòng phụ thuộc

| Trước đây | Sau refinement |
|---|---|
| F01 chờ D03 trong khi D03 cần code để export schema/types | API-BASE → DB-HARNESS/CONTRACTS; CI/schema generation riêng, không ép bootstrap chờ toàn bộ domain contract |
| Scanner cần job infrastructure nhưng notification task đến sau | OUTBOX/QUEUE trong foundation; SCAN-JOB dùng QUEUE; NOTIFY-INBOX/DELIVERY là use case riêng |
| Calendar dùng saved data nhưng collections/reminders lại chờ calendar | SAVED-CORE → EVENT-CALENDAR; COLLECTIONS/EVENT-REMINDER tách nhánh riêng |
| Game phải đợi social chat để dùng socket | SOCKET-BASE là transport foundation, GAME-LOBBY không phải xây chat cá nhân trước |
| Core QA hard-depend call/video và game extensions chưa chọn | Core QA có DAG riêng; conditional implementation chờ scope gate; full release vẫn cần disposition rõ |

## 4. Contract sorting đã thống nhất

Scan request: `{"source":"scan","scanId":"<uuid>","itemId":"<uuid>"}`.

Manual request: `{"source":"manual","itemId":"<uuid>"}`.

`scanId` không được có trong manual variant. Các field `confirmedCategory`, `confirmedItemId`, `manualItemId`, `points`, `isVerified` đều không thuộc request. Server suy category/material từ item và rule đã pin. Identity/ownership lấy từ Python session, không từ body.

Chưa có policy điểm được chấp nhận: **vẫn có thể xây và kiểm chứng việc ghi nhận hành động**, trả award `not_awarded`, `points="0"`, `reason="POLICY_NOT_ENABLED"`. Đây là fail-closed control để không tự invent rule; không giả rằng người dùng đã chốt +2/+3/+5. POINT-EARN/DAILY-CLAIM/LEVELS chỉ bật phần tính điểm khi decision/policy liên quan có nguồn.

Unknown provider dùng fake trong test/demo có nhãn. Không biến fallback/mock thành claim recognition accuracy, verified kg, vé thật hoặc fulfillment thật.

## 5. Product decision không chặn mọi việc

Auth owner đã chốt, không hỏi lại. Các lựa chọn như số điểm, daily streak, vé nhóm, friendship, fulfillment, retention và scope call/game còn theo decision register; chúng chỉ gate BUILD/VERIFY tương ứng. SPEC có thể chuẩn bị phương án/schema/fixtures mà không chốt thay user. Foundation, DB isolation, read-only query, upload adapter, auth login/refresh và nhiều UI shell không cần đợi tất cả quyết định đó.

S08/G03 luôn được bảo toàn như conditional candidates. Khi chưa có disposition, không tự implement hoặc tự loại; full production release chưa ready. Core local implementation không bị khóa chỉ vì chưa có quyết định game extension.

## 6. Kiểm tra plan và runtime là hai loại bằng chứng

```text
<python> tools/build_execution_pack.py
<python> tools/validate_execution_pack.py
<python> tools/verify_analysis.py
```

CWD: `D:/BlueSteps/docs/figma-analysis`. Build là deterministic plan generation, không chạy deployment. Routine run giữ authored core contract/decision/access/auth-policy; nếu sửa chúng, sửa artifact nguồn rồi validate và regenerate packet pins. Không chạy `--refresh-design` trong routine work: tùy chọn này chỉ dành authoring trước khi có active/completed task. Validate dùng OpenAPI/JSON Schema standard validators nếu đã cài qua `tools/validation-requirements.lock`, cùng kiểm examples/references/packet DAG/ownership/scope; nó không thực thi API hoặc migration. Không tự regenerate để xóa handoff hoặc reset task đang làm; giữ task state/handoff và invalidation khi input đổi.

Runtime commands trong packet đa số là **planned target** vì chưa có source app. Bootstrap phải tạo scripts/config/test paths thật và ghi lệnh đã chạy. Estimate ngày công cũ không là cam kết chi phí/token/thời gian AI; ước lượng lại từng capability sau spike và một lát cắt thực tế.

Sau khi tạo handoff có evidence thật, reviewer có thể ghi trạng thái bằng:

```text
<python> tools/record_task_handoff.py --handoff execution/handoffs/<TASK-ID>.json --reviewed-by <reviewer-id>
```

Tool kiểm schema, input hashes, file ownership, log/artifact tồn tại, prerequisite/gate và trạng thái done; nó **không chạy command runtime thay agent**. Nếu input đổi, giữ handoff cũ; chỉ reviewer ghi rõ lý do mới dùng `--accept-input-review "<reason>"`, và lựa chọn này không bỏ qua gate sản phẩm/phạm vi hoặc prerequisite. Routine generation giữ quyết định scope đã có nguồn và trạng thái đã làm; không tự reset lịch sử.

Khi blocker đã được xử lý, dùng `--resume <TASK-ID> --reviewed-by <reviewer-id>` để đưa task blocked/needs_input_review về hàng xét điều kiện. Tool giữ evidence cũ, không tự mark done, không reset task đang chạy, và chạy lại gate evaluation; prerequisite/policy chưa đạt thì task vẫn chờ.

Validation tooling được cô lập trong `.validation-packages` (không là dependency app), với lockfile `tools/validation-requirements.lock`. Schema checker mặc định yêu cầu standard validators; `--allow-subset-only` là chế độ hạn chế có nhãn, không được dùng thay kết quả standard validation khi bàn giao contract.

## 7. Tài liệu và đầu ra cần bàn giao theo capability

- SPEC: schema/ACL/state/examples, exact source frames và review record, không placeholder.
- BUILD: scoped code + tests + migration cần thiết + actual command log; không secrets/production data.
- VERIFY: independent acceptance evidence, concurrency/role/device tests đúng yêu cầu, ghi skipped/blocked rõ.
- Release: selected-scope manifest có quyết định thật, mọi included packet verified, backup/restore/UAT/monitoring và quyền deploy riêng.

Mục tiêu của execution pack là cho agent biết **việc nào có thể làm ngay, việc nào cần contract hoặc câu trả lời**, thay vì giao cả app rồi buộc agent tự đoán.
