# Đối chiếu phạm vi và kiểm tra tài liệu

Tài liệu này đánh giá mức hoàn thành **phân tích và lập kế hoạch**. Không đánh giá app/backend đã hoạt động vì chưa có implementation trong phạm vi yêu cầu.

Sau refinement: **execution pack có thể bắt đầu theo gate**, nhưng toàn bộ app/production release chưa hoàn tất. Kiểm tra hiện bao gồm packet DAG, operation ownership, schema examples và pinned inputs; `provided_design` không phải code/test pass. Readiness của từng packet được tính từ prerequisite/product gates; xem [Agent Start Here](12-agent-start-here.md).

## Bằng chứng theo từng yêu cầu

| Yêu cầu | Bằng chứng trực tiếp | Giới hạn |
|---|---|---|
| Đọc toàn bộ interface trong trang được gửi | Snapshot 180 node cấp cao, gồm 169 frame; 2.883 lớp chữ kể cả hidden; inventory IDs đối chiếu đúng tập | Frame gồm biến thể/overlay/khung phụ; không khẳng định 169 màn độc lập |
| Phân tích chi tiết component | Danh mục 131 main component/752 instance; định nghĩa Button/Auth Field; style/token inventory; props/state/data cho component nghiệp vụ | Không tuyên bố mọi frame đã là component tái sử dụng; remote không có nghĩa có quyền publish |
| Phân tích backend theo interface | Catalog từng node có module/contract; 172 operation cụ thể có owner SPEC; tài liệu role, async, state/transaction, integrations, ops | Chưa có endpoint chạy; 9 operation đã có schema, phần còn lại phải hoàn tất SPEC trước BUILD |
| Phân tích database | Dictionary bảng/fields/FK/check/index; ERD; transactions, retention và migration plan | Mô hình logic, chưa có SQL migration thực thi; vài policy quyết định constraint cuối |
| Plan chi tiết app/backend | 48 work packages có FE/BE/QA, phụ thuộc, acceptance; roadmap toàn bộ scope và open spikes | Ước lượng sơ bộ; provider/team/luật còn mở; MVP chỉ là mốc trung gian |

## Kiểm tra có thể lặp lại

Chạy bằng Python 3 của môi trường hiện có:

```text
<python> docs/figma-analysis/tools/build_catalog.py
<python> docs/figma-analysis/tools/verify_analysis.py
```

`build_catalog.py` xây catalog/coverage từ evidence đã lưu, không truy cập/sửa Figma. `verify_analysis.py` kiểm tra tập node của riêng trang backuped, tổng component instance, bảng đã tài liệu hóa trong mapping, task dependency không chu trình, tổng ngày công, liên kết local, PNG và mapping interface→task.

Kết quả thực tế được lưu ở [verification-results.json](verification-results.json); mapping từng interface tới backlog ở [interface-task-traceability.json](interface-task-traceability.json). Kiểm tra cấu trúc và tham chiếu không chứng minh kiến trúc tối ưu hoặc implementation đã đúng; nội dung nghiệp vụ đã được rà soát cùng decision log.

Execution pack được kiểm thêm bằng `tools/validate_execution_pack.py`: 90 capability, 270 packet, DAG không chu trình, owner/pins hợp lệ, OpenAPI metaschema và 13 fixture JSON Schema đạt. `tools/test_execution_workflow.py` có 11 kiểm tra handoff/gate/evidence; `tools/test_plan_regeneration.py` có 4 kiểm tra bảo toàn trạng thái, quyết định, authored contract và invalidation khi input đổi. Hai bộ kiểm tra chỉ dùng dữ liệu tạm, không thực thi backend/database/mobile. Kết quả packet hiện tại ở [execution/validation-results.json](execution/validation-results.json).

Phạm vi kiểm tra: **1 trang backuped**, 180/180 đối tượng cấp cao (169 frame), 2.883 lớp chữ; 752 instance, 131 main component có instance trên trang. Mọi đối tượng có ánh xạ backlog. Các bảng logic và task là đề xuất từ interface backuped; kết quả chạy mới nhất nằm trong verification-results.json.

## Kiểm tra trực quan đã làm

Đã xem 8 PNG render thật trên backuped: Home, scan không nhận diện được, route nhiều điểm, đăng ký hoạt động, đổi quà, community feed, game result và settings. Ảnh được lưu local, không phụ thuộc URL Figma tạm thời. Các quan sát ảnh hỗ trợ phân tích bố cục, modal exchange, state unrecognized, registration form, bottom navigation và sự thiếu thống nhất theme/type trên chính trang này.

Chưa thực hiện pixel QA toàn bộ 169 frame, chạy prototype như người dùng, thử camera/map/AI thật, kiểm thử quyền trên server, benchmark, migration hoặc deploy. Đó là các bước implementation/UAT được ghi trong kế hoạch, không phải công việc phân tích đã thực hiện.

## Tính toàn vẹn và khả năng đối chiếu

Stack đã được cập nhật theo lựa chọn chủ dự án: **backend Python, database Supabase**. FastAPI/Pydantic, SQLAlchemy/psycopg, Celery/Redis và WebSocket Python là phương án kỹ thuật đề xuất. [Tech stack](08-tech-stack.md), [thiết kế tích hợp](09-python-supabase.md), backend/database plan và backlog đã đồng bộ. Các ngày công cũ chưa được tái hiệu chỉnh theo packet throughput mới; kết quả verifier chỉ kiểm tra tài liệu và tham chiếu, chưa chứng minh tích hợp chạy thật.

- Mỗi node có ID và link Figma. Mỗi chuỗi text trong primary giữ nội dung gốc; text hidden được đánh dấu riêng.
- Bảng/endpoint đề xuất được gắn rõ là thiết kế. Decision log không thay lời chấp thuận của chủ sản phẩm.
- Không sửa thiết kế, không tạo app/backend runtime, không gửi tin nhắn cho người khác, không publish/deploy trong công việc này.
