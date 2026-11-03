# Tích hợp frontend, backend và database

> Cập nhật dữ liệu 02/11/2026: danh mục và dữ liệu cá nhân đã được bổ sung để hiển thị, có 63 lượt đọc API và 33 màn hình kiểm chứng. Xem [báo cáo dữ liệu hiện hành](display-data.md). Các trạng thái trống trong bằng chứng lịch sử bên dưới thuộc lượt nghiệm thu trước.

> Sau nghiệm thu local trong báo cáo này, backend đã chuyển sang Supabase cloud. Xem [trạng thái kết nối hiện hành](supabase-connection.md). Các kết quả kiểm thử local bên dưới được giữ làm bằng chứng của lượt tích hợp trước.

Cập nhật 01/11/2026. Đây là báo cáo hiện hành, thay trạng thái demo trong các báo cáo UI/backend trước đó. Thay đổi đang ở workspace local; chưa deploy cloud, commit hoặc phát hành mobile.

## Kết quả triển khai

Frontend Expo SDK 58 dùng API Python/FastAPI qua client OpenAPI. PostgreSQL 17/PostGIS lưu dữ liệu; Python quản lý identity, không dùng Supabase Auth. SQL chuẩn là 5 migration trong `supabase/migrations`, gồm 48 bảng `app_private`.

Đã gỡ fixture/adapters/provider demo, fake profile/wallet, post/message/notification seed, trả lời bot cố định, kết quả scan mẫu, bản đồ/ETA dựng sẵn, công cụ reset dữ liệu và các route demo/preview. Công cụ sinh UI và browser spec cũ được chuyển ra `docs/legacy-ui-tools`, không thuộc runtime frontend. Asset thiết kế không được import chỉ còn là nguồn lịch sử; bundle dùng brand/icon và font, không dùng ảnh nội dung mẫu.

66 route ứng dụng nối các màn `features/live` hoặc form auth thật. Các màn nội dung đã chuyển sang bố cục theo dữ liệu, không khẳng định giữ pixel-perfect 211 frame demo cũ. Khi API lỗi/mất mạng, UI báo lỗi; không dùng fixture fallback. Bootstrap mới không seed business data. Danh mục tổng hợp cũ bị loại bằng `synthetic=false`; database chính hiện chưa có nội dung thật được công bố.

## Ma trận kết nối

| Nhóm | Nguồn và thao tác thực |
| --- | --- |
| Tài khoản | Register, outbox OTP/verify, login, refresh, logout, password reset/change, session list/revoke |
| Cá nhân | Profile/version, preferences/theme/timezone/interests/goal, statistics, notifications/read cutoff |
| Sổ tay và ví | Waste/categories/materials, sorting fact, wallet/ledger/redemptions, reward catalog |
| Bài đọc | Search, detail/blocks/sources, saved articles, reactions, topics/follow, threaded comments |
| Cộng đồng | Feed, public/private post create/edit/delete, reactions/save/block, comment tombstone |
| Hội thoại | Member search, direct conversation, sequence pagination, client message ID, read marker, worker inbox |
| Hoạt động | Published event detail/search, saved engagement, collections/create/rename/delete/add/remove/move, calendar |
| Thu gom | Published points/material filters, detail/reviews, report/moderation, proposal draft, route/create/edit/start/cancel, arrival/self-reported handover |
| Camera | Real permission/capture/picker/local preview; manual choice from API handbook |

Nhận diện ảnh/AI, upload ảnh, map directions/ETA, OAuth, đăng ký/vé/check-in/tổng kết hoạt động, nhắc lịch, game/badges và phát/đổi thưởng theo policy chưa được mở. Các API trả lỗi unavailable phù hợp; UI không tạo kết quả hoặc giao dịch giả. Sorting/handover là tự khai, thưởng 0; không suy diễn kg đã xác minh. Danh sách quà có `redemptionEnabled=false`.

## Phiên và quyền

Native credentials nằm trong Expo SecureStore, phân tách theo API origin; cấu hình Android backup loại secure storage. Web refresh credential ở cookie HttpOnly, SameSite=Lax, Secure trong production; access token chỉ trong bộ nhớ. Browser storage không giữ token, chỉ giữ marker ý định đã đăng xuất. Web auth kiểm Origin allowlist và dùng Web Locks khi có.

Client single-flight refresh, chặn kết quả trễ sau đổi tài khoản và session cookie khác, xóa cache khi logout/mất phiên. Command không tự xếp hàng offline; giữ idempotency key khi thử lại cùng nội dung sau lỗi không xác định. Password-reset token chỉ ở bộ nhớ, không URL/storage. API kiểm ownership/visibility; runtime DB role không phải owner/BYPASSRLS, không được sửa ledger, audit hoặc catalog.

## Kiểm chứng

| Kiểm tra | Bằng chứng |
| --- | --- |
| API | `pnpm api:check`: Ruff lint/format, mypy 18 source files, 28 tests đạt với PostgreSQL thật; 1 browser harness opt-in được skip ở lượt mặc định |
| Client | Typecheck và 8 tests đạt: refresh single-flight, reuse revoke, network preservation, stable retry key/body, logout/account-change races |
| Frontend | Typecheck, ESLint, Prettier, 6 unit tests đạt; secure storage boundary và contrast |
| Runtime source | Audit 92 source files: không fixture adapter, seeded identity hoặc DB credentials; toàn bộ 66 route dùng màn live/auth |
| Export | Web, Android và iOS bundle đạt; native permission/backup config đạt |
| Browser + database | Harness thật trong `apps/api/tests/test_mobile_e2e.py`, kết quả cuối ghi ở phần nghiệm thu bên dưới |

Bộ browser dùng Chrome/Chromium, không intercept HTTP hoặc trả fixture từ frontend. Nó tạo database/login runtime, API và worker local riêng; dữ liệu có UUID/tên ngẫu nhiên. Kiểm tra đăng ký qua email sink thực, cookie HttpOnly/reload, profile/zero wallet/sorting, saved/reaction/comments, private post/account switch, messages/inbox, collection/route/handover, offline và service gates, preferences/onboarding, toàn bộ route. Sau browser, truy vấn SQL độc lập kiểm số bản ghi và không có ledger thưởng. Cuối lượt test xóa đúng database/login của nó.

```powershell
$env:BLUESTEPS_TEST_ADMIN_URL = 'postgresql+psycopg://postgres@127.0.0.1:55432/postgres'
pnpm api:check
$env:BLUESTEPS_RUN_MOBILE_E2E = '1'
& apps/api/.venv/Scripts/python.exe -m pytest apps/api/tests/test_mobile_e2e.py -s -q --tb=short
```

Cài browser bằng `pnpm --filter @bluesteps/mobile exec playwright install chromium`, hoặc đặt `PLAYWRIGHT_CHROMIUM_EXECUTABLE` tới Chrome đã cài. Không chạy suite với database/cloud người dùng. Harness build web trỏ API tạm; sau đó chạy lại `pnpm build` không đặt URL test trước khi dùng preview thường.

Workflow `.github/workflows/backend.yml` đã được mở rộng cho frontend/client/backend và browser thật trên PostGIS; chưa có bằng chứng chạy GitHub Actions trong lượt này.

## Vận hành và giới hạn

Xem [README](../README.md), [API](../apps/api/README.md), [Expo Go](expo-go.md). Máy hiện có database loopback cổng 55432, API 8000 và worker local; khởi động lại bằng các lệnh tài liệu nếu process dừng. `.env`, RSA keys, DB data và công cụ portable bị gitignore. Không có Supabase cloud được provision/migrate. Local email sink phục vụ phát triển, chưa gửi SMTP ra ngoài.

Bằng chứng browser/native bundle không thay thế kiểm tra camera, bàn phím, secure storage và khôi phục phiên trên Android/iPhone thật trước phát hành. Các nghiệp vụ/provider bị khóa cần quyết định/config hợp lệ trước khi mở; không dùng dữ liệu demo để lấp phần thiếu.

## Nghiệm thu cuối

- Lượt cuối: **10/10 browser tests đạt trong 2,4 phút**, harness Python và kiểm tra SQL đều exit 0. Có mở đủ 66 route với provider/API thật.
- `pnpm check` đạt: typecheck, lint, format, 6 unit tests, web export và native config. Typecheck sau lần sinh schema cuối cũng đạt. Client 8/8; API 28/28 (browser opt-in chạy riêng như trên).
- Android/iOS export đạt. Web cuối đã build lại không giữ URL test tạm. Audit 73 JavaScript bundle không chứa credentials backend hoặc các fixture nhận diện cũ.
- API chính `/health/ready` trả 200; cả 5 catalog trả 200 với danh sách trống. Chỉ tài khoản `Local smoke` do script triển khai trước tạo đã được chuyển `deleted` và thu hồi phiên, không đụng tài khoản khác.
- Preview `http://127.0.0.1:4173` đã kiểm bằng Chrome ở 390×844: 4 màn, 0 page errors; mọi request API đến `http://127.0.0.1:8000`. Đã xem ảnh để kiểm tra chữ, bố cục và trạng thái trống/khách.

Ảnh bản preview cuối: [Home](live-integration-evidence/home.png), [Tin tức](live-integration-evidence/articles.png), [Thu gom](live-integration-evidence/collection.png), [Cá nhân](live-integration-evidence/profile.png). Đây là trạng thái database local chưa có nội dung công bố, không phải dữ liệu demo.

## Sửa lỗi từ log iOS ngày 2026-11-01

- Cài đặt và onboarding dùng cùng cache preferences với provider giao diện. Các lần lưu chạy tuần tự theo tài khoản, lấy phiên bản mới nhất và chỉ ghi các trường vừa chỉnh. Khi gặp `VERSION_CONFLICT`, tải lại và thử một lần, giữ thay đổi ở các trường khác. Múi giờ đang nhập được giữ riêng đến khi nhấn lưu; thay giao diện/âm thanh không gửi cả bản nháp cũ. Thao tác đang xếp hàng bị hủy khi rời màn hình.
- Gỡ nút gửi `POST /v1/scans` rỗng để kiểm tra provider vốn luôn trả 503. Chụp/chọn ảnh và tra sổ tay vẫn dùng được; nhận diện ảnh chưa được tích hợp.
- Màn nhắc lịch hiển thị trạng thái chưa khả dụng và liên kết hoạt động đã lưu, không gọi endpoint luôn trả 503. Backend vẫn từ chối các nghiệp vụ chưa cấu hình; chưa có dịch vụ nhận diện hoặc thông báo tự động được mở.
- Kiểm thử hồi quy: 12/12 unit/UI tests đạt, gồm lưu đồng thời từ hai màn, xung đột phiên bản giữa thiết bị, lỗi mạng, hủy hàng đợi và sửa múi giờ rồi lưu liên tiếp. Typecheck, ESLint, Prettier, audit live-data và export Android/iOS được dùng để kiểm tra bản sửa. Chưa kiểm tra lại trên iPhone thật.
