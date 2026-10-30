# Kế hoạch triển khai app và backend

## Trạng thái bàn giao AI agent

**Đã có execution pack để agent bắt đầu theo gate.** 48 dòng dưới đây vẫn là epic roadmap; mỗi epic đã được tách thành capability và packet SPEC → BUILD → VERIFY trong [execution/tasks.json](execution/tasks.json). Đọc [Agent Start Here](12-agent-start-here.md) rồi dispatch task `ready`; không giao nguyên epic hoặc coi task planning là runtime đã xong.

Core Q/UAT không còn hard-depend implementation call/video và game extension. **S08/G03 vẫn được giữ trong roadmap như conditional candidates**, với gate riêng tại [release manifest](execution/release-manifest.json). Unknown không tự thành excluded/approved; full production release vẫn chờ explicit disposition và runtime evidence, nhưng không chặn bootstrap/core packets độc lập.

## Giả định ước lượng

Đơn vị là **ngày công** tập trung, không phải ngày lịch. FE gồm mobile và phần UI công cụ vận hành tối thiểu; BE gồm API, database/migration, worker và tích hợp; QA gồm chuẩn bị scenario, kiểm thử và review nghiệm thu. Ước lượng không lấy số frame nhân một mức cố định. Đây là kế hoạch sơ bộ từ thiết kế, chưa có code, team thực tế, tải hoặc provider đã chọn.

Đội tham chiếu: 2 mobile engineer, 2 backend/full-stack engineer, **2 QA/test engineer** (kiểm thử sản phẩm và tự động hóa), designer/product tham gia khoảng nửa thời gian, DevOps khoảng một phần tư thời gian. Mốc core pilot dự kiến **8–10 tuần**; toàn bộ phạm vi có đủ luật nghiệp vụ dự kiến **24–30 tuần**, có thể tăng sau spike call/video hoặc game chưa đặc tả. Với chỉ 1 QA, riêng 143 ngày công QA cộng dự phòng đã cần khoảng 34–38 tuần làm việc; cần kéo dài lịch hoặc phân bổ kỹ sư hỗ trợ test. Không cam kết một ngày phát hành khi chưa biết ngày bắt đầu và năng lực đội.

Tổng backlog bên dưới: **178 FE + 197 BE + 143 QA = 518 ngày công**. Dành thêm 20–30% dự phòng cho thay đổi, tích hợp và sửa sau UAT; designer/DevOps/product ngoài các số này. Hạng mục call/video và XO/Đua vịt có ước lượng tạm để không bỏ sót tín hiệu trong Figma, phải ước lượng lại sau đặc tả; nếu chủ sản phẩm loại khỏi scope thì ghi quyết định, không âm thầm bỏ.

## Điều chỉnh theo Python và Supabase

Backend dùng Python; framework đề xuất FastAPI/Pydantic, data access SQLAlchemy/psycopg. Supabase là database PostgreSQL/PostGIS đã chọn. Migrations SQL qua Supabase CLI; runtime role riêng và schema không expose Data API; queue Celery/Redis. Mobile và generated TypeScript API client giữ nguyên vai trò. **Auth do Python tự quản lý đã chốt**; Supabase là database, không tạo Supabase Auth.

Các ngày công cũ là **ước lượng sơ bộ chưa tái hiệu chỉnh cho stack mới**; không mặc định rút ngắn lịch vì dùng Supabase. D03/D04/F01 phải kiểm tra pooling, transaction locks, schema/grants/RLS, Python auth contract, local Supabase và worker Linux trước khi xác nhận estimate. Không thay đổi chức năng hoặc phạm vi ngoài backuped.

## Roadmap và điều kiện ra khỏi từng giai đoạn

| Giai đoạn | Cửa sổ đề xuất | Kết quả app | Kết quả backend/data | Gate |
|---|---|---|---|---|
| P0 | Tuần 1–2 | Chuẩn hóa navigation/token, map toàn trạng thái và thiết bị mục tiêu | Chốt domain/role/policy, OpenAPI, schema, provider spikes | Quyết định chặn được chốt hoặc mock/flag rõ; chưa hard-code chính sách kinh tế điểm |
| P1 | Tuần 3–5 | Shell, auth/onboarding/profile/settings, component dùng chung | Identity/session/consent, môi trường, upload nền | Auth/ACL smoke và thiết bị thật, không còn secret trong log |
| P2 | Tuần 5–10 | Sổ tay, scan, map/filter/compare, Home, wallet cơ bản | Content source, recognition jobs, geo, ledger earn, inbox/outbox | Core E2E + không award trùng + no-location/no-network fallback; pilot trung gian |
| P3 | Tuần 9–14 | Rewards/daily/history, báo cáo/đề xuất, route nhiều điểm, bàn giao | Inventory/redemption/refund, moderation, routing/verification | Race tests ví/kho pass; self-report tách verified; quà có fulfillment thật hoặc demo gắn nhãn |
| P4 | Tuần 13–18 | Discovery/calendar, đăng ký/vé, check-in, feedback, collections/reminder | Capacity/ticket anti-replay, organizer scope, schedules, impact | Race capacity, cancel/reschedule/reminder dedup pass; vé không còn QR minh họa |
| P5 | Tuần 16–25 | News/social/chat/bot/voice/game và các mở rộng đã chốt | Social ACL, realtime replay, AI retrieval, server game scoring | Matrix privacy, reconnect, AI no-source, award anti-cheat; luật game/call đủ trước code |
| P6 | Tuần 24–30 | Accessiblity, dark mode, offline/permission, UAT | Load/failure/restore, deletion/retention, audit/runbook | Nghiệm thu toàn bộ luồng và rollout có monitoring/rollback |

Các cửa sổ chồng nhau theo phụ thuộc, không cộng tổng số tuần của mỗi dòng. QA tham gia từ P0; không dồn tất cả lỗi bảo mật hoặc concurrency đến P6. N01 nằm P2 dù được một số task P3 tham chiếu.

## Backlog chi tiết

| ID | Công việc | FE | BE | QA | Phụ thuộc | Điều kiện nghiệm thu cụ thể |
|---|---|---:|---:|---:|---|---|
| D01 | Chốt sản phẩm, guest, thương hiệu và role | 1 | 1 | 1 | — | Mọi quyết định chặn trong DEC01–DEC25 có owner và hạn chốt; quyết định liên quan được chốt trước ticket phụ thuộc. |
| D02 | Chuẩn hóa token, navigation và trạng thái thiếu | 3 | 0 | 1 | D01 | Có light/dark/system, type scale, responsive và failure-state map; 8 interface đại diện trên backuped được đối chiếu. |
| D03 | Đặc tả API, schema và contract errors | 1 | 3 | 1 | D01, F01 | OpenAPI cụ thể, role matrix, state machines và migration plan review xong; types sinh cho app. Python/FastAPI OpenAPI; SQLAlchemy transaction boundaries; Supabase schema/grants/RLS và migrations SQL được review. |
| D04 | Spike map, camera, scan, push/email và provider | 3 | 4 | 2 | F01 | Chạy trên thiết bị mục tiêu; ghi quota, chất lượng, latency, chi phí đơn vị và fallback; chưa mua/deploy tự động. Spike Supabase pooling/TLS/PostGIS và lock cạnh tranh; Celery/Redis restart/retry; auth vẫn chỉ một owner. |
| F01 | Monorepo, CI, môi trường local/staging và feature flags | 1 | 3 | 1 | — | Build/typecheck/lint và API smoke chạy CI; staging tách secret và dữ liệu; rollback app flag. Dựng Python API/worker, local Supabase, DB role riêng, CI pytest/Ruff/type checking; pin versions; một chuỗi Supabase SQL migrations. |
| F02 | Design system và shell 5 tab | 5 | 1 | 2 | D02, F01 | Button/field/dialog/chips/header/tab/skeleton dùng token; keyboard/safe area và font scaling đạt checklist. |
| F03 | Identity email/password, OTP, reset, đổi mật khẩu | 4 | 5 | 3 | D03, F01 | OTP hết hạn/single-use/throttle; logout/revoke; không lộ email tồn tại; app retry không tạo user trùng. Python Identity do user chốt; không dùng Supabase Auth; refresh hash history, rotation/revoke và active session check theo pinned contract. |
| F04 | Google/Facebook và liên kết tài khoản | 3 | 4 | 2 | F03, D04 | Provider xác minh server; cancel/error; email collision không tự takeover; consent version lưu. |
| F05 | Onboarding 10 bước, guest và đồng bộ nháp | 4 | 2 | 2 | F02, F03 | Skip/back/relaunch giữ state; quiz 3R không award; sau login merge có quy tắc; denied permission vẫn đi tiếp. |
| F06 | Profile, avatar, email verification, settings, session list, PIN | 5 | 4 | 3 | F02, F03, C03 | Update đúng owner; email chưa verified không thay ngay; revoke thiết bị; PIN/secret ở secure storage; theme một enum. |
| C01 | Taxonomy, nội dung hướng dẫn và công cụ biên tập tối thiểu | 2 | 4 | 2 | D03, F01 | Có category/material/hazard/source/locality/revision; dữ liệu seed đã duyệt, không dùng số mẫu không nguồn. |
| C02 | Sổ tay, tìm kiếm, bộ lọc và chi tiết vật liệu | 5 | 2 | 2 | C01, F02 | Mọi màn sổ tay/material được map; search tiếng Việt; offline cache gắn revision và no-data. |
| C03 | Media upload, finalize, validation và cleanup | 3 | 4 | 2 | F03, D04 | Ảnh sai MIME/quota/owner bị chặn; retry từng ảnh; private URL; orphan cleanup; ảnh đề xuất tối đa 5. |
| C04 | Scanner camera/gallery và nhận diện async | 5 | 5 | 3 | C02, C03, D04 | Capture/upload/processing/recognized/uncertain/unrecognized/error; retake không hiển thị kết quả job cũ. |
| C05 | Sorting action, chống farm và ledger earn cơ bản | 2 | 5 | 3 | C04, F03 | Server rule; một scan không award hai lần; manual/correction và evidence scope rõ; reconcile số dư. |
| C06 | Danh mục điểm thu gom, geo API và moderation nền | 2 | 5 | 3 | C01, D04 | Geo bounds/radius/vật liệu/giờ/status freshness; chỉ published; thao tác staff theo scope. |
| C07 | Map, tìm điểm, bộ lọc, compare và point detail | 6 | 3 | 3 | C06, F02 | Denied/approx location có manual area; all/any filters; distance khác ETA; compare không bỏ nhãn stale. |
| C08 | Home tích hợp, thống kê cơ bản và pilot core | 4 | 3 | 3 | C02, C05, C07 | Luồng guest→account→scan→action→wallet→map chạy E2E; số kg không suy từ ảnh; partial Home errors. |
| R01 | Level, badge, leaderboard, wallet và history | 4 | 4 | 3 | C05 | Balance/lifetime khác nhau; rule version; rank privacy/ties có policy; ledger cursor ổn định. |
| R02 | Điểm danh 7 ngày và nhắc mỗi ngày | 3 | 4 | 3 | R01, N01 | Claim atomic một ngày/server timezone; streak/reset rõ; reward schedule đủ 7 ngày; không đổi timezone để farm. |
| R03 | Catalog reward, inventory, redemption transaction | 4 | 6 | 4 | R01, D03 | Concurrent redeem không âm ví/vượt kho; expectedCost conflict; retry một redemption/ledger debit. |
| R04 | Fulfillment, voucher, lịch sử đổi quà, cancel/refund | 4 | 5 | 4 | R03, N01 | Voucher một người dùng; unknown provider→review; refund once; app biết pending/fulfilled/refunded. |
| R05 | Đề xuất điểm, draft, report, review và moderation queue | 4 | 5 | 3 | C03, C06, C07 | Draft owner; submitted→review→decision; audit/source; report không tự publish; duplicate point detection. |
| R06 | Route preview nhiều điểm, reorder và alternatives | 5 | 5 | 3 | C07, D04 | Lưu material từng stop; reorder version; alternative nhận đủ vật liệu; unserved warning; ETA timestamp. |
| R07 | Arrival, hướng dẫn bàn giao và xác minh operator | 3 | 4 | 3 | R06, R05, C05 | Self-report tách verified; handover idempotent; không nhân đôi award; point operator đúng scope. |
| N01 | Inbox, push/email adapter, outbox và scheduler | 3 | 5 | 3 | F03, F01, D04 | Inbox bền vững khi provider down; dedup giao lặp; logout unbind token; read/deeplink kiểm tra quyền. |
| E01 | Event content, occurrence, role, capacity và organizer tools | 2 | 5 | 3 | D03, C03 | Ngày/giờ/timezone, role eligibility, published/cancel/reschedule; organizer đúng scope. |
| E02 | Khám phá, chi tiết, quan tâm và lịch tháng/tuần | 5 | 3 | 3 | E01, F02, E05 | Calendar saved/registered phân biệt; overlap mẫu 09–10 hiển thị; không tự hủy lịch. |
| E03 | Đăng ký, contact/consent và capacity concurrency | 4 | 5 | 4 | E01, F03 | Chỗ giữ theo participantCount và role; hết chỗ/deadline/eligibility xử lý; retry không tạo vé trùng. |
| E04 | Vé, QR, tải vé và staff check-in | 4 | 5 | 4 | E03, N01 | Chốt group/individual ticket; QR real token, anti-replay, expiry, revoke và staff scope; PII không public. |
| E05 | Collections, batch move, save/un-save và reminders | 5 | 5 | 3 | E01, F02, N01 | Move không mất saved/registration; offset/channel/quiet hours; event reschedule/hủy vô hiệu job cũ. |
| E06 | Participation history, feedback, album và impact | 4 | 4 | 3 | E04, C03 | Chỉ participant đúng điều kiện feedback; ảnh theo consent; số liệu illustrative/verified có nhãn và nguồn. |
| S01 | Articles, editor, sources và public metrics | 4 | 4 | 2 | C01, C03 | News list/latest/upcoming/detail; blocks safe; sources/revision; global metrics không là personal stats. |
| S02 | Social graph, post ACL, follow/friends/block và moderation | 3 | 5 | 4 | F03, D01 | Chốt friendship model; kiểm thử matrix public/friends/private và block mọi read/search/media/share. |
| S03 | Feed, composer ảnh/video, cảm xúc/check-in/privacy | 6 | 5 | 4 | S02, C03 | Draft, upload, visibility, publish retry; không vẽ keyboard mẫu; content moderation và report. |
| S04 | Reaction, comments, save/share và social notification | 4 | 4 | 3 | S03, N01 | Optimistic rollback; counters canonical; notification không lộ nội dung đã private/deleted. |
| S05 | P2P chat, attachments, read markers và reconnect | 6 | 6 | 4 | S02, C03, N01 | ClientMessageId dedup; sequence replay; membership/auth ở HTTP/WS; block chặn gửi/đọc theo policy. Mood/status notes có TTL, audience, create/delete và ACL. |
| S06 | Voice capture/transcription và RecycleBot có nguồn | 5 | 6 | 4 | C01, C03, D04 | Permission/record/pause/preview; citations, no-source fallback; quota, cancellation, retention; bot không award. |
| S07 | Spike và đặc tả call/video từ icon trong chat | 2 | 3 | 1 | S05, D01 | Chốt có thực hiện call/video không; nếu có: state model, signaling/relay provider, privacy/abuse và estimate được review. |
| S08 | Call/video implementation theo đặc tả được chọn | 6 | 7 | 4 | S07 | Nếu scope call được giữ: caller/callee, accept/reject/busy/missed/end, reconnect/permission; có test thiết bị mạng yếu. |
| G01 | Sứ mệnh xanh: question engine, lobby, chơi và kết quả | 6 | 6 | 4 | C01, R01, F01 | Server chấm đáp án; drag có alternative; một session award once; room capacity/host/disconnect rules. |
| G02 | Đặc tả XO, Đua vịt và tạo lịch chơi | 2 | 3 | 1 | G01, D01 | Mỗi game có luật thắng/thua, số người, timeout, anti-cheat, reward, thiết kế trạng thái; tránh tự suy từ tên thẻ. |
| G03 | XO, Đua vịt, schedules và invites sau đặc tả | 8 | 8 | 5 | G02, N01 | Luật server; room/reconnect; invite/block/decline/cancel; timezone/schedule, no duplicate award. |
| A01 | Statistics đầy đủ, reconciliation và audit dashboard | 3 | 4 | 3 | R07, E06, G01 | Phân biệt scan/action/handovers/kg; evidence/unit/period/denominator; so projection với source facts. |
| Q01 | Hardening accessibility, dark mode và thiết bị | 4 | 1 | 5 | F06, C08, R04, E06, S04, S05, G01, F04, F05, R02, E05, S01, S06, E02 | Font scale, screen reader, contrast, touch, drag alternative, denied permissions; API không đổi UI state ngoài quyền. |
| Q02 | Concurrency, security, offline, load và failure injection | 2 | 4 | 6 | R04, R07, E04, S05, S06 | Pass invariant suite, provider timeout/retry, auth isolation, IDOR/media ACL, socket replay, target pilot load. Kiểm thử bằng pytest/HTTPX và SQLAlchemy với PostGIS thật; không có đường Data API/RPC/grants cho client ghi ledger/kho/chỗ. |
| O01 | Backup/restore, retention, account deletion và runbooks | 1 | 5 | 3 | F01, Q02 | Restore thử; RPO/RTO đo được; purge media/account qua workflow; support refund/moderation có audit. Backup/restore Supabase theo gói được chọn; media phục hồi riêng; worker và app không dùng migration-owner credentials. |
| O02 | UAT, seed production được duyệt và staged release | 3 | 3 | 5 | A01, Q01, Q02, O01, S07, G02 | Acceptance theo flow/coverage; không dùng Figma sample PII/data; monitoring/rollback; deploy chỉ sau authorization riêng. |

## Dispatch và phụ thuộc capability

F01 là bootstrap kỹ thuật không còn chờ generated client D03; D03/D04 chạy trên foundation đã có. Queue/outbox thuộc foundation F01, còn inbox/delivery thuộc N01. E05 có SAVED-CORE packet chạy trước EVENT-CALENDAR, còn collection/reminder là capability riêng. Parent dependencies trong bảng là coarse roadmap; scheduler phải dùng packet DAG, không bắt toàn bộ epic E05 xong mới đọc được saved data. Socket transport có foundation riêng, game không buộc triển khai social chat chỉ để dùng realtime.

Xem [capability inventory](execution/capabilities.json), [packet manifest](execution/tasks.json) và [release manifest](execution/release-manifest.json).

## Tổng hợp tải công việc

| Giai đoạn | FE | BE | QA | Tổng ngày công |
|---|---:|---:|---:|---:|
| P0 — Khám phá & quyết định | 8 | 8 | 5 | 21 |
| P1 — Nền tảng | 22 | 19 | 13 | 54 |
| P2 — Core pilot | 32 | 36 | 24 | 92 |
| P3 — Giao dịch & thu gom nâng cao | 27 | 33 | 23 | 83 |
| P4 — Hoạt động thực tế | 24 | 27 | 20 | 71 |
| P5 — Nội dung, cộng đồng, chat, AI & game | 52 | 57 | 36 | 145 |
| P6 — Nghiệm thu và vận hành | 13 | 17 | 22 | 52 |

## Thứ tự kỹ thuật và cách chia công việc

1. Chốt taxonomy/material/hazard, rule điểm, privacy graph, role và semantics saved/registered/verified trước schema final. Chuẩn hóa API errors, idempotency, timestamps và media flow trước nhiều màn hình.
2. Build theo lát cắt end-to-end: UI + contract + migration + backend use case + acceptance trong cùng ticket. App dùng mock sinh từ OpenAPI khi backend đang làm, sau đó chạy contract tests với server thật.
3. Đặt ledger/inventory/capacity invariants ở DB transaction và integration tests trước khi làm hiệu ứng chúc mừng hoặc ranking. Không để UI mẫu quyết định điểm/stock.
4. Tách nội dung có nguồn khỏi engine scan/bot. Có bộ test ảnh tham chiếu theo vật liệu/điều kiện ánh sáng; đo confusion/uncertain rate; không công bố accuracy khi chưa đo.
5. Tích hợp provider qua adapter có fake cho CI và sandbox cho staging. Lập bảng quota/đơn giá chính thức tại thời điểm chọn vendor; thiết lập budget alert sau khi được chọn.
6. Mỗi module có log/metric, audit cho action nhạy cảm, seed tổng hợp, migration và runbook. Migration production và publish/deploy là hành động riêng, chưa được thực hiện trong task phân tích.

## Kiểm thử và acceptance theo nhóm

| Nhóm | Kiểm thử trọng tâm | Bằng chứng phải có khi implementation |
|---|---|---|
| Auth/settings | OTP reuse/expiry/throttle, OAuth email collision, session revoke, secure storage | Integration results, thiết bị thật, log redaction; không chỉ screenshot happy path |
| Handbook/scan | Tiếng Việt, vùng/nguồn, denied camera, invalid file, timeout, uncertain, correction | Dataset có consent/source, confusion matrix theo nhóm, job retry và no-double-award tests |
| Collection/routes | Geo boundary/all-vs-any, giờ qua ngày, stale status, provider timeout, missing material, reorder version | Query plan mẫu + integration fixtures + device permission test |
| Rewards | 100 request cạnh tranh ví/kho, duplicate key/body mismatch, refund once, voucher exclusivity, streak timezone | DB concurrent test thực và reconcile ledger, không chỉ unit mock service |
| Events/reminders | Nhiều người tranh chỗ cuối, group size, expired QR/replay, cancellation, reschedule, quiet hours | Atomic registration/check-in tests, clock-controlled jobs, delivery dedup evidence |
| Community/chat | Public/friends/private/block, private media URL, deleted post share, reconnect/replay, duplicate send | ACL matrix và HTTP/WS tests, client retry chạy lại không tăng message count |
| Bot/voice | No source, source stale, prompt injection, cancellation, quota, microphone denied | Evaluation set phiên bản, citation checks, budget/retention controls |
| Game | Correctness server, replay answer/finish, time window, host leaves, lost connection | Deterministic rule fixtures, award uniqueness, room state tests |
| Statistics | Units, denominator, period/timezone, self-report/verified separation | Compare read model với source facts và no-data UI |
| Release | Accessibility/large text, dark theme, offline, account deletion, backup restore/load | UAT checklist, restore report, migration rehearsal, monitoring và rollback rehearsal |

Con số 100 request trong test là kịch bản concurrency đề xuất, không phải tải production đã đo. Load profile cần chốt DAU/peak requests/scan concurrency/media volume trước sizing.

## Tài liệu và sản phẩm bàn giao khi xây dựng

- App mobile build có thể cài lên thiết bị mục tiêu; demo data có nhãn, môi trường rõ; đầy đủ flow/failed states đã chốt.
- Backend source theo module, OpenAPI versioned, generated client, DB migrations/seed có nguồn và rollback/forward-fix notes.
- Công cụ vận hành tối thiểu cho content, point proposal/report, event/QR staff, inventory/fulfillment/refund và audit.
- Dashboard/alerts, backup/restore evidence, account deletion/retention workflow, provider quota và chi phí đơn vị.
- E2E/contract/integration results, screenshot review từng route/biến thể cần nghiệm thu, UAT sign-off và release checklist.

## Chi phí và rủi ro kế hoạch

Chưa có ngân sách hạ tầng. Lập cost model từ số lượt map tile/geocode/route, ảnh scan/ngày và latency inference, AI token/audio phút, storage/egress, email/push và peak sockets. Công thức tháng = fixed DB/compute/backup + đơn giá × usage theo từng provider + moderation/support. Không dùng giá dự đoán để lựa chọn dịch vụ.

Rủi ro lớn: chưa có nguồn điểm thu gom và status đáng tin; chưa có dataset/model scan; chưa có đối tác giao quà; privacy graph và luật game chưa đủ; call/video chỉ thấy icon; nhiều theme/style chưa thống nhất. Mỗi rủi ro có ticket spike/quyết định trước hạng mục phụ thuộc. Nếu một quyết định chưa xong, tiếp tục module độc lập và giữ ticket phụ thuộc chưa ready; không coi dữ liệu mẫu là cách hoàn thành production.

