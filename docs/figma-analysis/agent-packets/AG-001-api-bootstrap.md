# AG-001 — Bootstrap API Python local

**Alias packet:** API-BASE-BUILD trong execution/tasks.json là ID dispatch chuẩn. **Loại:** implementation packet đề xuất cho lần triển khai tiếp theo. **Parent:** subset bootstrap của F01. **Readiness:** đủ đặc tả cho local scaffold, chưa được thực thi; framework FastAPI là technical default của execution plan. User hiện yêu cầu cập nhật kế hoạch, chưa yêu cầu triển khai runtime packet này.

## Mục tiêu và nguồn

Tạo nền API Python có thể import, chạy local và kiểm thử mà không cần database, provider hay tài khoản cloud. Đây là hạ tầng phục vụ app backuped, không thêm tính năng sản phẩm.

Đọc `08-tech-stack.md` sections 3/6/8, `09-python-supabase.md` sections 1/6 và `11-agent-execution-guide.md`. Fixed constraints: Python backend, Supabase database, nguồn UI backuped `386:7053`. Không có frame UI áp dụng cho endpoint hạ tầng này.

Không phụ thuộc product decisions điểm/auth/privacy; không triển khai auth. Trước bắt đầu xác nhận người dùng đã yêu cầu implementation local và không có code mới/thay đổi xung đột trong workspace. Nếu FastAPI baseline được thay bằng quyết định mới, sửa packet trước code.

## Phạm vi file

Được tạo/sửa: `apps/api/pyproject.toml`, dependency lock tương ứng, `apps/api/src/bluesteps_api/__init__.py`, `main.py`, `apps/api/tests/`, `apps/api/README.md`, `.gitignore` chỉ mục entries liên quan. Chỉ sửa root scaffold khi thật sự cần và ghi diff rõ; không sửa `codex-agent-kit`, evidence Figma hoặc tạo app mobile/admin/worker trong packet này.

Chọn Python version được toolchain và dependency stable hỗ trợ; ghi version/rationale và lock dependencies. Không áp dụng một phiên bản đoán từ tài liệu cũ. Dùng src-layout, installable package; configure pytest/Ruff/mypy trong pyproject và môi trường cô lập. Chỉ một packaging/lock workflow, ghi command bootstrap thật trong README.

## Contract hạ tầng

- Import `bluesteps_api.main:app` không gọi mạng, DB, Redis hoặc provider.
- `GET /health/live` trả 200 JSON `{"status":"ok"}`; schema không có secret, timestamp tùy ý hoặc trạng thái business.
- Chưa tạo readiness endpoint khẳng định DB sẵn sàng. Chưa dùng health endpoint này làm bằng chứng kết nối Supabase.
- FastAPI có OpenAPI, operation ID ổn định do implementation khai báo; schema health response có type cụ thể.
- URL không tồn tại trả 404; chưa thay error envelope toàn domain hoặc tự tạo auth middleware/business routers.

Health là unauthenticated liveness có chủ đích. Không có database table/migration/fixtures nghiệp vụ trong packet. Không xin Supabase credentials chỉ để tạo scaffold.

## Thứ tự làm

1. Kiểm tra workspace/toolchain; đọc instructions hiện hành; ghi dependency baseline được chọn.
2. Tạo pyproject/src package và health route; import không side effect.
3. Thêm test API qua in-process client và test import không cần config cloud; test schema response/OpenAPI và 404.
4. Configure lint/format/typecheck; ghi bootstrap/run/test commands thật từ môi trường đã chọn.
5. Chạy checks, review diff, bàn giao evidence; không tuyên bố parent F01 đã xong.

## Verification contract

Các command sau là **planned target**, chưa chạy tại thời điểm review. Sau setup package đúng cách, chạy từ `D:/BlueSteps/apps/api` bằng Python của environment đã tạo:

```text
python -m pytest
python -m ruff check .
python -m ruff format --check .
python -m mypy src
```

Kỳ vọng: exit 0; pytest không kết nối cloud/DB/provider; response health đúng schema; import được khi không có biến môi trường production; không có secret trong output. Mypy phải có cấu hình phù hợp dependencies thật; không disable toàn bộ checking hoặc bỏ test chỉ để command xanh.

Smoke manual qua `python -m uvicorn bluesteps_api.main:app --host 127.0.0.1 --port <free-port>` trong environment: GET health đúng, shutdown sạch. Chỉ bind loopback cho smoke; chọn port trống, không dừng process người dùng để chiếm port. Ghi command/response thật, tắt server thử khi xong.

## Definition of Done và handoff

Code chỉ trong scope; dependency lock và hướng dẫn tái lập có thật; tests/lint/typecheck/smoke đã chạy với output/exit code; không tạo tài nguyên cloud/DB/auth; diff không có `.env`, token, cache hoặc dữ liệu production. Bàn giao bằng format trong execution guide; nêu rõ SQL integration, generated client, CI, worker và auth **chưa thuộc packet này**.

Task kế tiếp được refinement: DB capability/pooling/role spike và OpenAPI/error contract, không tự chuyển sang “implement toàn F01” từ health route pass.
