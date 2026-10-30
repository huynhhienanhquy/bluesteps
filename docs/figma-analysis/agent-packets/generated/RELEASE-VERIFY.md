# RELEASE-VERIFY — UAT, selected-scope manifest và staged deployment gate — VERIFY

Type: **verification** · Parent epic: **O02** · Dispatch: **needs_product_decision** · State: **not_started**.

Phạm vi: backuped `386:7053`; backend Python tự quản lý Identity; Supabase chỉ làm database. Đây là task plan, chưa có runtime code được triển khai.

## Đầu vào và prerequisite

- Task trước: RELEASE-BUILD. Chỉ bắt đầu phần implementation khi có handoff/evidence đạt của prerequisite.
- Product decision gates: DEC18, DEC20, DEC25. Context: DEC18, DEC20, DEC25.
- Interface/contract: execution/release-manifest.json. Operation IDs: N/A: internal/UI contract; phải ghi schema tương tác trong SPEC.
- Data: production seed only after approval.
- Source revisions: `inputPins` SHA-256 trong `execution/tasks.json`; nếu hash đổi, review/invalidate task trước chạy tiếp.
- Frame candidates: N/A cho infrastructure; không tự tạo chức năng từ lớp phụ. SPEC phải chọn frame cụ thể, không coi tất cả candidates là scope visual.

## Scope ownership

- `apps/api/src/bluesteps_api/modules/release/`
- `apps/api/tests/release/`
- `supabase/migrations/`
- `packages/backend/release/`

Chỉ sửa migration/schema/shared client tương ứng capability này; cần thêm path thì ghi lý do vào handoff. Migrations là vùng ghi có owner tuần tự, không để hai task chiếm cùng số migration. Không tự spawn agent.

## Hành vi phải chứng minh

- Unknown scope blocks production full release.
- include candidates require verified packets.
- deferred/excluded require explicit decision.
- no deploy from plan-update task.

## Kết quả bàn giao

- Independent acceptance results with real DB/roles/device where relevant.
- Failure injection/race results required by scenarios.
- No unexplained skipped required checks.

## Verification

- CWD: `D:/BlueSteps/apps/api`.
- Command contract: `python -m pytest tests/release -q`.
- Availability: planned_target; create actual script/test path in bootstrap or this packet and record it, not a command already run.
- Expected: Assertions cover: Unknown scope blocks production full release; include candidates require verified packets; deferred/excluded require explicit decision; no deploy from plan-update task.
- Nếu API/DB/worker: kiểm real runtime roles và connections cho ACL/race; mock service không thay transaction test. Nếu UI: render đúng frame/state/viewport trên target build và đính ảnh evidence.
- Nếu command chưa tồn tại, tạo script/config trong scope rồi ghi lệnh thật đã chạy; không báo planned command đã pass.

## Handoff và stop conditions

Ghi `execution/handoffs/RELEASE-VERIFY.json` theo `execution/handoff.schema.json`: changed files, command/cwd/exit, evidence paths, decision/contract revisions, unresolved failures.
Không triển khai cloud/provider thật hoặc thay product policy trong task này. Gặp gate chưa rõ chỉ dừng phần phụ thuộc; tiếp tục fixture/schema/local work đã rõ. Mọi implementation phải giữ điểm thưởng tắt khi chưa có policy được ghi nhận.
