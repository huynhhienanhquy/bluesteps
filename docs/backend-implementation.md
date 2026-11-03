> Báo cáo lịch sử của giai đoạn trước tích hợp. Trạng thái hiện hành và kiểm chứng nằm trong [live-integration](live-integration.md).

# Backend và database local — 31/10/2026

Đã xây dựng backend chạy được từ frontend hiện hữu và các tài liệu `figma-analysis/03`, `04`, `09`, `contracts/core.openapi.json`, `auth-policy.json`, `access-matrix.json`. Giữ lựa chọn Python Identity + Supabase Database; không dùng Supabase Auth. Phạm vi bàn giao là backend nền tảng local có dữ liệu bền vững và kiểm thử PostgreSQL thật, chưa phải full production roadmap hoặc bản mobile đã nối API.

## Mã nguồn và contract

| Thành phần | Vị trí | Kết quả |
|---|---|---|
| API | `apps/api/src/bluesteps_api` | FastAPI, Pydantic, SQLAlchemy Core/psycopg; 74 path/90 operation trong OpenAPI, gồm cả operation bị khóa rõ bằng 503 |
| Database | `supabase/migrations` | 4 migration SQL, 44 bảng nghiệp vụ/hạ tầng, PostGIS/GiST, constraints, grants/RLS và outbox lease |
| Runtime contract/client | `packages/api-client` | OpenAPI thực tế, generated TypeScript và client refresh single-flight |
| Local tooling | `apps/api/scripts`, `scripts/backend.cjs` | Bootstrap role/keys, seed tổng hợp, smoke HTTP thật, lệnh pnpm |
| Reproducibility | `apps/api/uv.lock`, `pnpm-lock.yaml` | Python lock; lockfile pnpm chỉ thêm closure dependency client, giữ nguyên importers/snapshots frontend |
| Infrastructure templates | `compose.yaml`, `apps/api/Dockerfile`, `.github/workflows/backend.yml` | Database Docker local, image API không chạy root, CI PostGIS; chưa build/chạy Docker hoặc chạy GitHub CI trong phiên này |

Không sửa execution/task-state hoặc đánh dấu các epic/packet production đã xong. Contract thiết kế gốc được giữ nguyên; runtime contract là artifact riêng. Các operation đã pin giữ method/path/operationId; test kiểm request fixture âm và response auth/session/sorting/moderation/error theo JSON Schema gốc.

## Luồng đã triển khai

| Nhóm | Hành vi có thật |
|---|---|
| Identity | Đăng ký pending, consent version, xác minh email, resend, đăng nhập Argon2id, JWT RS256/kid, refresh token opaque hash-stored, atomic rotation/reuse revocation, session list/revoke/logout, đổi/khôi phục mật khẩu thu hồi session |
| Abuse/email | Cooldown tối thiểu 60 giây bền vững, rate limit PostgreSQL theo recipient/IP, OTP HMAC TTL 5 phút/tối đa 5 lần thử; outbox mã hóa payload mail; SMTP STARTTLS hoặc development mail sink được cấu hình rõ; không giao OTP expired/consumed |
| Cá nhân | Hồ sơ và preferences theo owner, expectedVersion chống ghi đè, IANA timezone validation, ví/sổ điểm read-only, activity và thống kê self-report; không giả số kg xác minh |
| Danh mục | Public published-only sổ tay, vật liệu, nhóm rác, điểm thu gom, hoạt động, bài đọc, quà; cursor keyset; tìm kiếm cơ bản; PostGIS radius và all/any materials; trạng thái capacity unknown khi chưa có nguồn xác minh |
| Phân loại | Manual/scan schema phân biệt; kiểm item/scan owner và state; unique scan + idempotency actor/operation/key; ghi action/outbox nguyên tử, award luôn 0 vì policy chưa bật |
| Lưu nội dung | Lưu/bỏ hoạt động và bài đọc, CRUD/move bộ sưu tập theo owner, FK collection-owner, lịch sự kiện đã lưu và cảnh báo overlap; xóa collection giữ sự kiện đã lưu |
| Cộng đồng | Tạo bài public/private có idempotency, feed/detail ACL, xóa mềm, thích/bỏ thích, bình luận/trả lời bài/bài đọc, tombstone giữ replies, block hai chiều; không bật friends-only trước DEC17 |
| Chat | Direct text conversation, kiểm membership/block, sequence tăng dưới row lock, clientMessageId dedup/conflict, đọc lại sau sequence, read marker tăng đơn điệu; hiện dùng REST, chưa có WebSocket |
| Thu gom | Review pending, báo cáo submitted không tự đổi trạng thái public, đề xuất draft, moderator decision có role/self-review/version/audit; approve proposal bị từ chối nếu chưa có ảnh xác minh |
| Hành trình | Tạo/đọc/sửa danh sách điểm đã publish, owner/version/state guards, reorder giữ stop ID, start/cancel; không bịa polyline/ETA/khoảng cách khi chưa có map provider |
| Thông báo/worker | Inbox owner-only, read/read-all cutoff; outbox lease/SKIP LOCKED, backoff, consumer receipt và transactional inbox dedup; notification chat không chứa body tin nhắn |

Tiền điểm được trả bằng chuỗi decimal để không mất precision ở JavaScript. API trả thời gian UTC; database lưu `timestamptz`. Upload/AI/provider không được giả lập như kết quả thật. Không seed user/password/số dư 180 điểm từ frontend; tài khoản mới có ví 0.

## Database và local runtime

Schema `app_private` không expose qua Supabase Data API. RLS bảo vệ ranh giới database role; Python kiểm từng owner/membership/visibility. `anon`/`authenticated` không có quyền nghiệp vụ. API/worker dùng login không phải owner/superuser/BYPASSRLS kế thừa `bluesteps_runtime`; migration dùng credential riêng. Ledger, audit, consent và sorting facts là append-only đối với runtime; runtime không được tự cấp role hoặc sửa giá/kho/danh mục.

Runner migration dùng transaction/advisory lock/checksum; chạy lại cùng file không đổi là no-op, từ chối file đã apply bị sửa. Supabase CLI vẫn có thể dùng cùng SQL, nhưng mỗi môi trường chỉ chọn một runner quản lý lịch sử. Không chạy reset hoặc migration remote trong kiểm thử.

Môi trường local hiện tại: PostgreSQL **17.11**, PostGIS **3.6.2**, bind `127.0.0.1:55432`; `.env` chứa khóa ngẫu nhiên và runtime login riêng, được gitignore. Binaries portable và cluster nằm trong `.backend-tools` bị gitignore, không cần đưa vào source control. Seed giữ **10 waste items, 6 points, 8 events, 13 articles, 6 rewards**, mọi entity gắn `synthetic=true`. Tọa độ, capacity và stock seed chỉ là fixture, không phải địa điểm/tồn kho đã xác minh.

Chạy từ root: `pnpm api:dev`; terminal khác: `pnpm api:worker`. Swagger ở `http://127.0.0.1:8000/docs`. Hướng dẫn cài lại, Supabase và secret configuration nằm trong `apps/api/README.md`.

## Bằng chứng đã chạy

Ngày kiểm tra 31/10/2026, Windows, Python **3.12.14**, Node **22.14.0**, pnpm **11.25.0**. Phiên bản Python libraries chính xác được khóa trong `uv.lock` (FastAPI 0.162.0, SQLAlchemy 2.0.55, psycopg 3.3.6, Pydantic 2.14.2).

| Lệnh/kiểm tra | Kết quả thực tế |
|---|---|
| `uv sync --frozen --offline` sau khi tải dependency | Exit 0; environment tái lập từ lock |
| `pnpm api:check` với `BLUESTEPS_TEST_ADMIN_URL` trỏ localhost:55432 | Exit 0: Ruff lint/format, mypy strict 16 source files, **23 pytest pass, 0 skip** |
| Integration migration | Tạo database/login test UUID riêng; migrate từ empty có PostGIS; apply lần hai no-op; xóa đúng database/login test khi xong |
| Database grants | API chạy bằng login runtime thật; deny runtime sửa ledger/audit/role/giá; kiểm client grants và thực thi SELECT dưới role `anon`/`authenticated` đều bị chặn |
| Race/security tests | Hai connection refresh cùng token: 1 thành công/1 replay, family revoked; hai sorting cùng key: một action/outbox; scan business dedup; chat retry một message/sequence; cross-user/stale version/private/block |
| `pnpm api:types` | Exit 0: runtime OpenAPI xuất 74 paths và generated TypeScript |
| Client `typecheck`, `test` | Exit 0: **5 Node tests pass**, gồm single-flight refresh, network failure, replay clear, key/body retry và logout khi refresh đang chạy |
| `pnpm typecheck` | Exit 0; frontend vẫn typecheck |
| `python scripts/smoke.py` từ `apps/api` | Exit 0: live/ready/catalog/register/mail/verify/login/wallet/refresh/logout/revoked qua HTTP thật; tự đóng API thử |
| Frozen pnpm client install | Exit 0 với lockfile chỉ thêm 156 dòng; dependency graph frontend cũ được giữ nguyên |

Pytest có một deprecation warning của Starlette TestClient về httpx; không có test fail/skip trong lần chạy đầy đủ. Chưa đo tải, backup/restore, thiết bị mobile nối API, hoặc kết nối Supabase cloud. Chưa chạy workflow CI trên GitHub hay build Docker image vì môi trường này không có Docker CLI.

## Phần chưa bật/chưa thực hiện

Các lệnh sau cố ý trả 503 và không ghi giao dịch giả: daily claim (**DEC07**), redemption/fulfillment (**DEC08**, cùng rule/level **DEC05/06**), registration/ticket/check-in (**DEC13/14**), recognition/media, routing provider, assistant. Cần quyết định và contract/provider tương ứng trước khi mở. Các bảng ví/ledger/kho/redemption bảo vệ integrity nhưng không được coi là bằng chứng đã triển khai fulfillment hoặc kiểm thử race đổi quà/giữ chỗ; các use case đó đang khóa.

Ngoài ra chưa triển khai media upload/private storage, OAuth/email-change, friends/follows, post edit/media/share, event feedback/album/impact, reminder scheduling/push, operator handover verification, badges/leaderboard, bot/voice, game engine/multiplayer, WebSocket và full admin tooling. Không tự lựa chọn retention, reward policy hoặc ticket policy từ fixture UI.

Frontend vẫn dùng adapter demo và local state. Client mới đã sẵn sàng để tích hợp, nhưng cần secure storage/cache purge, mapping UUID/code và nối từng screen/command trước khi gọi là mobile end-to-end. Chưa deploy hoặc tạo Supabase cloud; không có credentials cloud nào được yêu cầu hay đưa vào repository.
