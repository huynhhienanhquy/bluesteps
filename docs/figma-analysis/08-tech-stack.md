# Tech stack đề xuất cho BlueSteps

Ngày đối chiếu tài liệu công nghệ: **29/10/2026**. Phạm vi chức năng: **chỉ interface trên trang backuped (`386:7053`)**. Đọc cùng [phân tích component](02-components-and-app.md), [backend/API](03-backend-and-api.md), [database](04-database.md) và [kế hoạch triển khai](05-delivery-plan.md).

**Đã chốt theo yêu cầu người dùng: backend Python và database Supabase.** FastAPI, SQLAlchemy, Celery và các thư viện đi kèm là phương án triển khai đề xuất; dependency chưa được cài. **Python tự quản lý tài khoản/mật khẩu/session đã được user xác nhận; không dùng Supabase Auth.** Supabase là database trong baseline. Không suy ra công nghệ đang dùng từ hình ảnh Figma. Các phiên bản cụ thể sẽ được khóa sau kiểm tra tương thích ở D04/F01; tài liệu không gán nhãn “latest” cho dependency.

## 1. Phương án cơ sở

| Lớp | Công nghệ đề xuất | Vai trò trong app | Lý do lựa chọn của dự án |
|---|---|---|---|
| Ngôn ngữ | Python cho backend/worker; TypeScript strict cho mobile/admin | Chia sẻ qua OpenAPI/generated client | Tôn trọng lựa chọn backend Python, không import source Python vào app |
| Mobile | React Native + Expo development build | Android/iOS, camera, vị trí, thông báo, secure storage | Phù hợp app mobile nhiều tính năng native; kiểm chứng SDK trên thiết bị từ đầu |
| Điều hướng | Expo Router | Auth/onboarding, 5 tab, stack chi tiết, deeplink | Một cơ chế quản lý route cho mobile; không thêm một router song song |
| UI | React Native primitives + StyleSheet + semantic tokens | Button, field, card, bottom sheet, theme | Chủ động khớp Figma; component nghiệp vụ dùng chung trong app |
| Server state trên app | TanStack Query | Cache, pagination, mutations, refetch | Tách dữ liệu API khỏi trạng thái điều khiển giao diện |
| Form | React Hook Form + Zod | Auth, đăng ký hoạt động, đề xuất điểm, tạo bài | Form state và kiểm tra đầu vào có cấu trúc; business rule vẫn ở server |
| Backend | **Python + FastAPI + Pydantic** | REST API, auth, domain services, WebSocket | Python đã chọn; FastAPI đề xuất cho validation/OpenAPI và API theo module |
| HTTP | ASGI server Uvicorn + FastAPI routers | Transport API | Tách routers/services/repositories, dependency theo request |
| Contract | OpenAPI + generated TypeScript client | API/types dùng chung cho mobile/admin | Giảm lệch field, enum, error và pagination giữa client/server |
| Database | **Supabase PostgreSQL + PostGIS** | Toàn bộ bảng nghiệp vụ và geo queries | Supabase Database đã chọn; PostgreSQL giữ transaction và relational constraints |
| Data access | SQLAlchemy + psycopg, SQL có tham số | Repository, locks, transactions, geo | SQL connection trực tiếp từ Python; không dùng nhiều HTTP Data API calls thay một transaction |
| Job queue | Celery + Redis broker | Nhận diện async, reminders, delivery, cleanup | Worker Python; trạng thái nghiệp vụ ở PostgreSQL, consumer idempotent |
| Realtime | FastAPI WebSocket + DB replay | Chat/read marker/game events | Server kiểm membership; custom envelope/ack/cursor, không tự coi delivery là exactly once |
| Media | Private object storage; Supabase Storage là ứng viên | Ảnh/audio/album | Database Supabase không có nghĩa Storage đã được chọn; backend quản lý ACL và upload URL |
| Admin vận hành | React + Vite + cùng generated API client | Duyệt điểm, nội dung, sự kiện, kho/quà và support | UI nội bộ riêng, tái dùng types/API; không cần SSR cho phương án cơ sở |
| Kiểm thử | pytest + HTTPX cho Python; Jest/RNTL/Maestro cho mobile | Unit/API integration/E2E | Concurrency/PostGIS chạy DB thật; UI test dùng generated client |
| Local/CI | Python virtualenv + dependency lock; pnpm workspace; Supabase CLI/Docker | API/worker, app và local services | Python và JS có lockfile riêng, CI tái lập được |

Các lý do lựa chọn là đánh giá cho dự án, không phải kết luận benchmark các framework.

## 2. Mobile: thư viện và ranh giới dữ liệu

### Nền tảng và điều hướng

Dùng Expo **development build** để kiểm tra cấu hình native và các thư viện sẽ đưa vào bản phát hành. Expo phân biệt development build với môi trường thử nhanh Expo Go; development build cho phép native library/config của riêng app. Build phát hành vẫn là profile riêng. [Tài liệu Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/).

Expo Router quản lý route theo cấu trúc thư mục. Đề xuất chia `(auth)`, `(onboarding)`, `(tabs)` và các route chi tiết `events/[id]`, `points/[id]`, `redemptions/[id]`, `conversations/[id]`. Auth guard phục vụ UX; backend vẫn kiểm tra quyền từng request. Không tạo route riêng cho mọi frame trùng trạng thái trong Figma. [Expo Router](https://docs.expo.dev/router/introduction/).

### State và form

| Loại dữ liệu | Cách quản lý | Ví dụ và quy tắc |
|---|---|---|
| Server state | TanStack Query | Wallet, event, post, scan status, cursor history; cache key có user và filters; clear dữ liệu riêng tư khi logout |
| UI state cục bộ | React state/reducer/context | Modal đang mở, tab filter nháp, lựa chọn camera; chưa cần thêm global store chỉ để chứa mọi API response |
| Form state | React Hook Form | Touched/dirty/error/submitting; controller cho input native; giữ nháp khi một upload thất bại |
| Input schema | Zod trên client | Kiểm tra hình dạng form, độ dài, lựa chọn bắt buộc; server kiểm tra lại và quyết định số điểm/capacity |
| Secret nhỏ trên thiết bị | expo-secure-store | Refresh token và dữ liệu khóa app phù hợp; không dùng để chứa lịch sử hội thoại hoặc ảnh |
| Nháp/cache không bí mật | Local persistence qua adapter, chọn sau spike | Version schema và purge theo tài khoản; không persist OTP/password hoặc token QR như dữ liệu thường |

TanStack Query có hướng dẫn riêng cho React Native về kết nối mạng và app focus; cần nối các tín hiệu này vào refetch policy. Retry của query không đồng nghĩa được phép gửi lại tùy ý command đổi quà. [TanStack Query trên React Native](https://tanstack.com/query/latest/docs/framework/react/react-native).

React Hook Form hỗ trợ controlled inputs và React Native; Zod cung cấp schema validation với suy luận kiểu TypeScript. API contract vẫn có nguồn chuẩn riêng ở backend; không sao chép công thức tính điểm vào form schema. [React Hook Form](https://react-hook-form.com/get-started), [Zod](https://zod.dev/).

SecureStore có khác biệt theo nền tảng và cấu hình sao lưu; phải thử logout, reinstall và thay đổi xác thực thiết bị. Không coi dữ liệu secure storage là nguồn sự thật cho session còn hiệu lực: server có thể revoke. [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).

### Chức năng native theo interface backuped

| Interface/nhu cầu | Module đề xuất | Điều kiện trước khi chốt |
|---|---|---|
| Chụp rác, torch, camera preview, quét QR | `expo-camera` | Quyền bị từ chối, camera lifecycle, ảnh lớn, QR vé thật; không giữ camera chạy khi rời màn |
| Chọn ảnh/video cho bài, avatar, đề xuất điểm | `expo-image-picker` | Native picker, nhiều ảnh, permission và retry; server kiểm MIME/quota/owner |
| Vị trí hiện tại, tìm điểm gần | `expo-location` | Foreground permission, approximate location, khu vực nhập tay; chưa thêm background tracking |
| Nhận push, mở deeplink, notification handling | `expo-notifications` | Thiết bị thật, build credentials, permission, token lifecycle; provider gửi push là quyết định riêng |
| Ghi âm trong chat/voice input | `expo-audio` | Microphone permission, record/preview/cancel, duration/retention; transcription chạy qua backend adapter |
| Bản đồ, marker, polyline | SDK bản đồ native, **chưa chọn package/provider** | Render trên hai nền tảng, nguồn tile, quota, geocode/routing, attribution và cấu hình key |
| Kéo thả phân loại/game và reorder stop | Gesture/animation library sau spike | Tương thích React Native/Expo đã chọn; có cách chọn bằng chạm/nút thay cho drag |
| Biểu đồ thống kê | Chart renderer sau spike | Nhãn tiếng Việt, unit/denominator, no-data, accessibility; có bảng số liệu thay thế |

Khả năng module native được đối chiếu từ tài liệu chính thức: [Camera](https://docs.expo.dev/versions/latest/sdk/camera/), [ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/), [Location](https://docs.expo.dev/versions/latest/sdk/location/), [Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/), [Audio](https://docs.expo.dev/versions/latest/sdk/audio/). Package phải khớp Expo SDK đã chọn; không cài từng package native theo phiên bản mới nhất độc lập.

### UI và theme

Đề xuất token semantic `color.background/surface/text/primary/danger`, spacing, radius và typography; mode `system/light/dark`. Button/Field/Chip/Dialog/Header được xây từ token và tái dùng, thay vì nhúng màu/kích thước của từng frame vào mọi screen. Component Figma tham chiếu là đầu vào thiết kế, không tự chuyển thành dependency npm.

Game Sứ mệnh xanh có thể bắt đầu bằng component native và state machine. Chưa cần engine game/WebView cho thao tác phân loại ba thùng; XO/Đua vịt phải có luật trước khi quyết định engine. Call/video dùng media/signaling stack riêng sau S07; WebSocket event không thay media transport.

## 3. Backend Python và contract

### Cấu trúc đề xuất

FastAPI tổ chức theo `routers → application services → domain/repositories`. Pydantic định nghĩa input/output, lỗi validation và OpenAPI; Uvicorn phục vụ ASGI. Domain gồm Identity, Users, Waste, Recognition, Collection, Routing, Events, Rewards, Community, Messaging, Assistant, Games, Notifications, Statistics và Operations. Business rules không đặt trong frontend hoặc DB client của mobile. FastAPI có nền tảng OpenAPI, validation và dependency injection phù hợp cho hướng này. [FastAPI features](https://fastapi.tiangolo.com/features/).

`apps/api` chạy API/WebSocket; `apps/worker` chạy Celery consumers; scheduler/outbox dispatcher là process role có điều phối. Cả API và worker dùng package domain/repositories Python chung. Recognition nặng không chạy trên event loop của HTTP/WebSocket; đưa sang worker hoặc provider adapter.

Baseline dùng SQLAlchemy Session đồng bộ với psycopg để API/worker dùng cùng transaction code. HTTP handler đồng bộ chạy theo cơ chế phù hợp của FastAPI; tác vụ DB đồng bộ của WebSocket được chuyển sang threadpool có giới hạn. Không chặn event loop bằng truy vấn sync, không dùng chung Session giữa request/thread/task. Nếu spike chọn AsyncSession, đổi có chủ đích và kiểm thử lại driver/pool, không trộn tùy tiện.

### OpenAPI giữa Python và TypeScript

FastAPI/Pydantic là nguồn contract HTTP; xuất OpenAPI để sinh TypeScript client cho mobile/admin. Zod ở form chỉ hỗ trợ UX, không là nguồn công thức điểm. CI kiểm tra breaking changes, generated client build, error envelope và enum/cursor/version. Không chia sẻ entity SQLAlchemy hoặc password/token internals cho frontend.

### SQLAlchemy và migrations

SQLAlchemy + psycopg kết nối **Supabase PostgreSQL qua SQL**. Transaction đổi quà bao gồm lock ví/kho, ledger, redemption, idempotency outcome và outbox trong một `Session.begin()`; đăng ký hoạt động tương tự với capacity. Không thay bằng một chuỗi request HTTP độc lập tới Supabase Data API. [SQLAlchemy transactions](https://docs.sqlalchemy.org/en/20/orm/session_transaction.html).

Chỉ một nguồn migration: **SQL trong `supabase/migrations`**, chạy qua workflow Supabase CLI. Models SQLAlchemy ánh xạ schema đã migrate; không gọi `create_all()` hoặc tự đồng bộ schema ở production. Không vận hành thêm Alembic song song. PostGIS, GiST/partial index, grants, RLS policies và SQL functions cũng có migration/version. [Supabase schema/migration workflow](https://supabase.com/docs/guides/local-development/declarative-database-schemas).

## 4. Database Supabase và quyền truy cập

Supabase là nền tảng PostgreSQL đã chọn, không thay toàn bộ business backend. PostGIS tiếp tục phục vụ điểm thu gom/vị trí. Tên bảng logic trong [database plan](04-database.md) dự kiến nằm trong schema `app_private`, ngoài exposed schemas của Data API. Mobile/admin đọc và ghi nghiệp vụ qua Python API.

API và worker có DB role riêng với grants tối thiểu; credential migration tách khỏi runtime. Không dùng tài khoản owner mặc định cho mọi tiến trình. RLS/grants bảo vệ đường truy cập dữ liệu; Python vẫn phải kiểm owner/membership/operator scope. Kết nối SQLAlchemy trực tiếp không tự truyền JWT của user vào `auth.uid()`. [Supabase Data API security](https://supabase.com/docs/guides/api/securing-your-api), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

### Kết nối và pooling

API/worker lâu dài dùng direct connection hoặc **session pooler** tùy kết nối mạng và giới hạn dự án. Migration dùng direct/session connection phù hợp DDL. Transaction pooler chỉ dùng sau khi kiểm driver/prepared statements và các giả định session; không cấu hình driver theo phỏng đoán. TLS, certificate verification, pool timeout và tổng connection budget được xác nhận ở D04. [Supabase database connections](https://supabase.com/docs/guides/database/connecting-to-postgres).

Mỗi replica/process có giới hạn pool; tổng pool/overflow của API, worker, scheduler, migration và vận hành phải nhỏ hơn budget DB/pooler. Không mở connection cho mỗi WebSocket đang online. Giao dịch DB ngắn, không giữ row lock trong khi gọi map/AI/email/fulfillment provider.

### Phần Supabase chưa tự động chọn

| Dịch vụ | Trạng thái | Cách quyết định |
|---|---|---|
| Database PostgreSQL | **Đã chọn** | Dùng cho bảng ứng dụng, transaction, constraints và outbox |
| PostGIS extension | Đề xuất trong Supabase DB | Bật qua migration và kiểm tra spatial index/query trên môi trường test |
| Auth | **Python Identity đã chọn** | Python sở hữu account/password/JWT/session; không cài Supabase Auth cho app |
| Storage | Ứng viên cho media | Private bucket, upload/finalize và ACL/signed URL phải được kiểm thử; không coi backup DB là backup file |
| Realtime | Chưa chọn | Baseline WebSocket Python; nếu dùng Broadcast/Presence, review channel authorization và replay, không gửi business command hai đường |
| Edge Functions | Không dùng cho API Python trong baseline | API Python chạy trên container/host riêng; không coi Supabase DB là nơi tự chạy FastAPI |

PostGIS được Supabase tài liệu hóa; cần kiểm tra extension/schema cụ thể của project. [Supabase PostGIS](https://supabase.com/docs/guides/database/extensions/postgis). Supabase Edge Functions có runtime/workflow riêng, nên không thay kế hoạch host API Python bằng việc chỉ tạo một Supabase project. [Edge Functions](https://supabase.com/docs/guides/functions).

Chi tiết quyết định và luồng truy cập ở [09 — Python + Supabase](09-python-supabase.md).

## 5. Worker, realtime và tích hợp

### Celery + Redis

Celery workers Python xử lý nhận diện, email/push, reminder, thumbnail, cleanup và fulfillment. Redis dùng làm broker; trạng thái scan/redemption/delivery lưu ở Supabase PostgreSQL. Result backend của Celery là tùy chọn kỹ thuật, không là ledger hoặc nguồn trạng thái cho người dùng. Redis và cache có eviction được tách deployment/policy phù hợp; broker có persistence, giới hạn memory và cảnh báo.

Chọn Celery thay queue JavaScript để giữ backend/worker Python. Redis broker có visibility timeout và hành vi redelivery cần cấu hình theo job; job phải idempotent khi retry hoặc worker chết. Tránh giữ task ETA dài cho từng reminder: lưu lịch ở DB, dispatcher lấy horizon gần và enqueue. Scheduler chỉ có một leader hiệu lực; outbox và unique business source vẫn là bảo vệ cuối. [Celery Redis broker](https://docs.celeryq.dev/en/stable/getting-started/backends-and-brokers/redis.html).

Workers chạy Linux container trong local/staging/production; môi trường Windows hiện tại cần kiểm tra Docker/WSL2. Chưa khởi tạo Redis/Celery hoặc mua dịch vụ nào.

### FastAPI WebSocket

WebSocket vận chuyển chat/read marker/presence/game events; thiết kế envelope, ack, heartbeat, reconnect/backoff, cursor replay và dedup trong ứng dụng. Persist message trước broadcast, `clientMessageId` chống trùng, server sequence cho replay. Không coi WebSocket tự bảo đảm exactly-once. Kiểm session/token ở connect, command và lifecycle; revoke/block chặn quyền truy cập. [FastAPI WebSockets](https://fastapi.tiangolo.com/advanced/websockets/).

Khi scale API, cần fan-out/coordination giữa instances; không dùng danh sách connection trong RAM của một instance làm toàn bộ hệ thống. Presence có TTL, DB là lịch sử. Call/video sau S07 dùng signaling/media stack riêng.

### Media và providers

Private object storage có upload trực tiếp thời hạn ngắn; Python kiểm owner/purpose/MIME/quota, finalize rồi attach mediaId. Supabase Storage là ứng viên hợp lý để gom dịch vụ, chưa phải quyết định đã chốt. Nếu chọn, private buckets và storage policies phải được cấu hình; privileged credential chỉ ở server. [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control).

Map/geocode/routing, recognition model, assistant, transcription, push/email, OAuth và reward partner vẫn qua adapter. Chưa chọn vendor/model chỉ vì backend đổi sang Python. AI không trực tiếp ghi ledger; provider timeout của fulfillment cần reconciliation, không gửi lại mù. Bản đồ phải kiểm chất lượng dữ liệu Việt Nam, nhiều điểm, ETA, quota và attribution ở D04.

## 6. Repo, môi trường và công cụ

```text
apps/
  mobile/                  TypeScript / React Native / Expo
  admin/                   TypeScript / React / Vite khi tới giai đoạn vận hành
  api/                     Python / FastAPI / Pydantic
  worker/                  Python / Celery / scheduler / outbox dispatcher
packages/
  backend/                 Python domain, services, SQLAlchemy repositories
  api-client/              TypeScript generated từ OpenAPI
  design-tokens/           token UI
  test-fixtures/           dữ liệu tổng hợp
supabase/
  config.toml              cấu hình local được review
  migrations/              nguồn SQL migrations duy nhất
  seed.sql                 dữ liệu tổng hợp, không production PII
infra/
  compose/                 Python services, Redis; tích hợp local Supabase
docs/                      kiến trúc, ADR, API notes, runbooks
```

Python dùng virtualenv, dependency lock, Ruff cho lint/format, type checker được chọn khi bootstrap, pytest/HTTPX cho test. JavaScript dùng pnpm workspace/lockfile, TypeScript strict, Jest/RNTL cho mobile; Maestro cho E2E. Không biến pnpm thành trình quản lý dependency Python.

| Môi trường | Thiết lập đề xuất | Điều kiện |
|---|---|---|
| Local | Python API/Celery, Redis và Supabase local qua CLI/Docker; mobile development build | Seed tổng hợp, provider fake, không đọc DB production |
| CI | Python tests/lint/typecheck + JS build/tests + PostGIS thật | Migration từ empty/previous release, role/grants/Data API tests, race tests |
| Staging | API/worker Linux containers, Supabase project riêng, Redis riêng | UAT, thiết bị thật, thử pooling/restore và provider sandbox |
| Production | API/worker host riêng + Supabase Database + Redis/media đã chọn | Region/connection budget, TLS/secrets, backups, migration gate, monitoring và rollback |

Chi phí/gói/region Supabase và hosting Python chưa chốt. Kiểm tra giới hạn connection, tài nguyên, lưu trữ/egress, backup/PITR và SLA theo gói thực tế trước sizing. Không đưa giá cố định hoặc tự kết luận database managed sẽ giảm bao nhiêu ngày công. Auth, Storage và Realtime có chi phí/quota riêng nếu được chọn.

## 7. Kiểm thử và vận hành

| Lớp | Công cụ đề xuất | Điều cần chứng minh |
|---|---|---|
| Python domain | pytest | Rule điểm, state machine, overlap, unit và timezone |
| API | pytest + HTTPX/TestClient phù hợp | Input/output OpenAPI, auth/ACL, idempotency/error, cursor |
| DB integration | SQLAlchemy + Supabase local/PostGIS thật | Locking/concurrency, constraints, migration, grants/RLS và connection pooling |
| Worker | pytest + broker/worker test riêng | Redelivery/crash/timeout/outbox replay không award/giao quà trùng |
| Realtime | WebSocket integration + nhiều client/instance | Membership/revoke, ack/replay, disconnect/reconnect và duplicate send |
| Mobile | Jest + RNTL + Maestro | Form/permission/theme, flow scan→wallet→map, đổi quà và vé |

FastAPI có hướng dẫn testing với TestClient; không coi unit test mock repository là bằng chứng DB transaction an toàn. [FastAPI testing](https://fastapi.tiangolo.com/tutorial/testing/). Dùng dữ liệu tổng hợp, test DB cô lập và clock-controlled reminders. Python unit tests không thay kiểm thử native camera/push trên thiết bị.

Log có requestId/operationId, redact token/OTP/QR secret/PII; metric API/DB-pool wait, job age/retry, scan latency/uncertainty, redemption/refund, socket reconnect và DB connections. Backup database và media phải có kế hoạch phục hồi riêng. Supabase dashboard không thay application audit trail.

## 8. Quyết định đã chốt và điều kiện khóa phiên bản

| Nhóm | Trạng thái/cách chốt | Bằng chứng cần có |
|---|---|---|
| Backend language | **Python đã chọn**; FastAPI/Pydantic là framework/schema đề xuất | API/OpenAPI/client generation pass; đúng Python version được các package hỗ trợ |
| Database platform | **Supabase đã chọn** | Project/region/gói được xác nhận, PostGIS và grants/schema test đạt |
| SQLAlchemy/psycopg | Khóa cặp phiên bản sau pooling/transaction spike | Không leak Session/connection, locking/serializer/migration pass |
| Migration | SQL qua Supabase CLI, một lịch sử | Dựng từ empty và nâng từ previous release; không dual migration tool |
| Queue | Celery + Redis đề xuất | Retry/redelivery/stalled jobs, memory và visibility timeout đã thử |
| Realtime | FastAPI WebSocket đề xuất | Auth/revoke/replay/multi-instance; không nhầm transport với media call |
| Mobile | Expo/RN/React cùng bộ tương thích | Camera/picker/location/push/audio/secure store và release build chạy thật |
| Dependency governance | Python và JS lockfiles, nguồn/license/advisory review | CI tái lập, upgrade qua review và test liên quan |

**D03/D04/F01** chốt kết nối Supabase, Python auth contract, SQL transaction, schema grants/RLS, migration, workers và compatibility trước implementation rộng. **C05/R03/E03** kiểm concurrency thật cho điểm/kho/chỗ. **S07/G02** chốt call/video và game extensions sau đặc tả.

Core pilot: **mobile TypeScript → API Python/FastAPI → Supabase PostgreSQL/PostGIS**, cộng worker Python/Celery, Redis và private media khi chức năng cần. Phạm vi vẫn chỉ dựa trên interface backuped; việc đổi stack không bổ sung tính năng hoặc tạo tài nguyên ngoài workspace.
