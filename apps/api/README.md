# BlueSteps API và database

Backend local dùng Python 3.12, FastAPI/Pydantic, SQLAlchemy Core và psycopg 3. Database là PostgreSQL 17/PostGIS, tương thích Supabase Database; Python sở hữu toàn bộ identity, không dùng Supabase Auth. Dependency chính xác nằm trong `uv.lock`. Schema chuẩn duy nhất nằm trong `../../supabase/migrations`; không dùng ORM `create_all` hoặc Alembic.

Frontend kết nối trực tiếp với API.

Quét rác dùng checkpoint `EfficientNetB0_FastKAN_Export` trên CPU, với kiến trúc đúng notebook Kaggle của tác giả. Chạy `uv sync --frozen` để cài PyTorch/torchvision; áp dụng migration `202611030023_waste_model_scans.sql` trước khi mở app. Biến `BLUESTEPS_SCAN_MODEL_DIRECTORY` cho phép đổi thư mục export; mặc định dùng thư mục ở root repository. Xem [luồng nhận diện và kiểm chứng](../../docs/waste-model-integration.md).

## Chạy trong workspace hiện tại

Môi trường ảo, `.env` và PostgreSQL/PostGIS local dùng riêng đã được tạo khi triển khai. `.env`, khóa RSA, dữ liệu và công cụ portable đều bị gitignore. Database local dùng cổng **55432**, chỉ bind `127.0.0.1`. Không có tài khoản/mật khẩu demo cố định.

Từ root repository, mở hai terminal:

```powershell
pnpm api:dev
pnpm api:worker
```

API: `http://127.0.0.1:8000`; Swagger: `http://127.0.0.1:8000/docs`. Trong môi trường `development`, mã xác minh email khi đăng ký, gửi lại hoặc đặt lại mật khẩu luôn là `123456`, có hiệu lực 5 phút. Đăng ký tài khoản, lấy `challengeId`, gọi verify với mã này rồi login. Worker phục vụ inbox và email local tại `apps/api/.local/mail/*.json`, không gửi email thật. Mã trong môi trường `test`/`production` vẫn được tạo ngẫu nhiên. Nếu không chạy worker, mã vẫn ở outbox chờ giao.

Đăng ký lại email chưa xác minh sẽ cấp yêu cầu xác minh mới và vô hiệu hóa mã cũ; mật khẩu và thông tin đăng ký ban đầu được giữ nguyên. `pnpm dev:connected` và các biến thể Go tự reload API khi sửa mã backend. Nếu API được chạy trực tiếp không có `--reload`, cần khởi động lại để nạp thay đổi.

Nếu PostgreSQL/pooler ngắt kết nối, kể cả lúc commit, worker tự tạo lại connection pool và thử lại sau 1, 2, 4, 8, 16 rồi tối đa 30 giây; một lần poll thành công đặt lại thời gian chờ. Event đã được claim có thể cần chờ lease 60 giây hết hạn. Receipt giữ việc giao inbox không bị trùng; SMTP vẫn có thể gửi lại email nếu mất kết nối sau khi provider đã nhận thư. Worker chỉ ghi cảnh báo kết nối, không ghi SQL, payload hoặc credentials. Khi dùng `dev:connected`, lỗi kết nối tạm thời này không còn làm worker thoát và kéo theo dừng cả phiên ứng dụng.

Nếu khởi động lại máy, portable database có thể được mở lại từ root bằng:

```powershell
& .backend-tools/package/native/bin/pg_ctl.exe -D .backend-tools/pgdata -l .backend-tools/postgres.log -o '-h 127.0.0.1 -p 55432' -w start
```

Portable binaries là công cụ kiểm thử local không được commit. Cài mới dùng Supabase CLI/Docker hoặc PostgreSQL theo hướng dẫn dưới.

## Cài lại trên máy mới

Cần Python 3.12, uv và PostgreSQL 17/PostGIS. Có thể dùng `supabase start` với Docker và config trong repository, hoặc chạy database riêng bằng Compose:

```powershell
# Từ root. Đặt mật khẩu local do bạn chọn, không dùng lại mật khẩu production.
$env:BLUESTEPS_LOCAL_DB_PASSWORD = '<your-local-password>'
docker compose up -d db

cd apps/api
uv sync --frozen
# URL owner chỉ dành cho migration/bootstrap local; URL-encode ký tự đặc biệt trong mật khẩu.
$env:BLUESTEPS_MIGRATION_DATABASE_URL = 'postgresql+psycopg://postgres:<password>@127.0.0.1:54322/bluesteps'
uv run python scripts/bootstrap_local.py
```

Helper chỉ chấp nhận localhost, từ chối ghi đè `.env`, áp dụng migration, tạo login hạn chế kế thừa `bluesteps_runtime` và sinh khóa RSA ngẫu nhiên. Không seed dữ liệu nghiệp vụ, reset database, tạo cloud hoặc tạo người dùng. Fixture backend chỉ dành cho kiểm thử; các bản ghi `synthetic=true` luôn bị loại khỏi danh mục API. Tài khoản mới có ví 0 điểm.

Chạy API/worker từ `apps/api`:

```powershell
uv run uvicorn bluesteps_api.main:app --host 127.0.0.1 --port 8000 --reload
uv run python -m bluesteps_api.worker
```

`init-local-env` cũng có thể chỉ sinh cấu hình/khóa khi đã có DB role:

```powershell
uv run python -m bluesteps_api.cli init-local-env
```

Sau đó thay URL placeholder. Không có khóa ký fallback. Import module và export OpenAPI không kết nối DB; startup đòi config ký token hợp lệ. Liveness kiểm process; readiness kiểm bảng/migration và yêu cầu role runtime không phải owner/superuser/BYPASSRLS.

Khi cập nhật mã nguồn có migration mới, chạy `pnpm api:migrate` từ root với database local hoặc `pnpm api:migrate --allow-remote` với Supabase đang cấu hình. Readiness cũng kiểm tra các cột `website_url`, `publish_photos` và `prefer_no_tolls`; nếu thiếu, launcher dừng trước khi mở ứng dụng. Lỗi `column p.website_url does not exist` ở điểm thu gom cho biết database chưa áp dụng migration `202611030021_collection_point_website.sql`.

## Supabase

Workspace đã kết nối Supabase cloud qua Session pooler, áp dụng 5 migration và dùng login runtime riêng. Chi tiết trạng thái hiện hành ở [báo cáo Supabase](../../docs/supabase-connection.md); các hướng dẫn PostgreSQL local bên trên vẫn dùng được cho môi trường khác và kiểm thử. Schema `app_private` nằm ngoài exposed schemas; không đưa DB URL vào Expo. Runtime URL dùng login riêng được cấp `bluesteps_runtime`; migration dùng owner connection riêng. Database Supabase có PostGIS. RLS ở đây phân tách database role; quyền từng user nằm trong Python, không dựa vào `auth.uid()` trên SQL connection.

Một chuỗi SQL có thể được chạy bằng Supabase CLI hoặc runner của repo. Chọn một cách quản lý lịch sử cho mỗi môi trường, không xen kẽ hai runner trên cùng database. Runner repo ghi checksum trong `bluesteps_migrations.applied`, khóa migration và chạy cả batch trong transaction; từ chối file đã apply bị sửa. Remote migration chỉ mở khi có `--allow-remote`, không được chạy trong test. Production yêu cầu URL có `sslmode=verify-full`, bộ khóa riêng và SMTP thật nếu mở đăng ký.

```powershell
uv run python -m bluesteps_api.cli migrate
```

Đối với role runtime, ledger/audit/consent/sorting facts là append-only; không được tự cấp role, sửa danh mục/giá/quà/kho. Các client role `anon`/`authenticated` không có quyền schema/bảng/hàm nghiệp vụ. Default privileges không tự cấp quyền bảng tương lai.

## Kiểm thử

```powershell
# Từ root; không có TEST_ADMIN_URL thì các test PostgreSQL được báo skipped.
pnpm api:check

# Muốn chạy đủ integration tests trên database LOCAL dùng riêng:
$env:BLUESTEPS_TEST_ADMIN_URL = 'postgresql+psycopg://postgres@127.0.0.1:55432/postgres'
pnpm api:check
pnpm api:types
pnpm --filter @bluesteps/api-client typecheck
pnpm --filter @bluesteps/api-client test
```

Test suite tạo database và login ngẫu nhiên riêng, chạy migration hai lần, test bằng login runtime rồi xóa đúng database/login do suite tạo. Từ chối URL remote. Admin test cần quyền tạo database/role; không dùng database người dùng thật. CI dựng PostGIS riêng và chạy đầy đủ, không dựa vào skip.

Smoke thật với config development + email sink local, chạy từ `apps/api`:

```powershell
uv run python scripts/smoke.py
```

Smoke chọn cổng loopback trống, tạo tài khoản tổng hợp ngẫu nhiên, đi hết verify/login/refresh/logout và tự tắt API thử. Không in mật khẩu/token/OTP.

## Contract và client

`pnpm api:types` xuất contract runtime tại `packages/api-client/openapi.json` rồi sinh TypeScript `src/schema.ts`. `/openapi.json` của server và artifact dùng cùng schema. Các operation nền/auth/sorting/moderation giữ operation ID và wire shape của contract đã pin trong docs; contract thiết kế gốc được giữ nguyên.

Client `@bluesteps/api-client` nhận `TokenStore` hoặc web `authAdapter` do app cung cấp, thực hiện single-flight refresh và không xóa token do lỗi mạng tạm thời. Frontend dùng Expo SecureStore trên native và cookie refresh HttpOnly trên web; access token web chỉ ở bộ nhớ. Query cache được xóa khi logout, mất phiên hoặc chuyển tài khoản; kết quả trễ từ phiên cũ bị loại. Command giữ key/body khi thử lại sau lỗi kết nối.

Web auth ở `/v1/auth/web/*` yêu cầu Origin khớp `BLUESTEPS_CORS_ORIGINS`; cookie SameSite=Lax, Secure trong production. Production cần app/API cùng site hoặc reverse proxy phù hợp. Không lưu credentials trong localStorage/sessionStorage. Marker localStorage chỉ ghi ý định đã đăng xuất để tránh tự đăng nhập lại sau logout khi mất mạng.

Điện thoại dùng API có thể truy cập được từ mạng của nó; `pnpm api:lan` bind cổng 8000 trên LAN. Đặt `EXPO_PUBLIC_API_URL` trước khi chạy Metro, xem [Expo Go](../../docs/expo-go.md). Không expose database và không đưa secret backend vào Expo.
