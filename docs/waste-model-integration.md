# Tích hợp nhận diện rác EfficientNetB0_FastKAN — 03/11/2026

Màn quét chụp/chọn ảnh gọi mô hình thật trên CPU của API, thay kết quả Chai nhựa cố định. Không cần dịch vụ AI bên ngoài hoặc GPU. Trọng số không được đưa vào bundle điện thoại.

## Mô hình và tiền xử lý

- Nguồn kiến trúc: [Kaggle uiux1, phiên bản 3, cell 9](https://www.kaggle.com/code/thuannn18022005/uiux1). Mã inference tại `apps/api/src/bluesteps_api/waste_model.py`.
- Checkpoint: `EfficientNetB0_FastKAN_Export/best_EfficientNetB0_FastKAN.pth`, PyTorch state_dict, 28.238.999 byte.
- SHA-256: `c958b0a744ba7e6ee39bf2f806b1cbf95e5abd1ad3e82f795ca2483f6f900ab1`.
- EfficientNet-B0 → global average pooling → LayerNorm → tanh → dropout (tắt khi eval) → FastKAN 1280 → 256 → 10. RBF grid 8 điểm từ -1 tới 1, sigma=0.5; SiLU giữa hai lớp FastKAN.
- Ảnh RGB, resize bilinear 224×224, ToTensor và chuẩn hóa mean `[0.485,0.456,0.406]`, std `[0.229,0.224,0.225]`, đúng cấu hình export. Chỉnh hướng EXIF trước khi xử lý ảnh camera.
- Nạp trọng số bằng `weights_only=True`, `map_location='cpu'`, `strict=True`, giữ model ở eval và dùng inference_mode. Không tải trọng số ImageNet khi khởi động.
- Thứ tự nhãn: battery, biological, cardboard, clothes, glass, metal, paper, plastic, shoes, trash. Nhãn tiếng Việt tương ứng: Pin đã qua sử dụng, Rác hữu cơ, Bìa carton, Quần áo, Thủy tinh, Kim loại, Giấy, Nhựa, Giày dép, Rác còn lại.

## Luồng ứng dụng

1. Camera hoặc thư viện cung cấp ảnh; ứng dụng đọc nội dung ảnh bằng implementation native/web hiện có.
2. `POST /v1/scans/recognize` nhận ảnh base64 và ID lựa chọn, trả nhãn, confidence, hướng dẫn sổ tay và token dự đoán được ký bằng khóa máy chủ. Khách chưa đăng nhập cũng nhận diện được.
3. Confidence dưới ngưỡng trả `unrecognized`: giao diện hướng dẫn chụp lại hoặc tra sổ tay, không cho xác nhận điểm từ kết quả này. Mặc định ngưỡng 0.6, thay đổi bằng `BLUESTEPS_SCAN_CONFIDENCE_THRESHOLD`.
4. Khi khách đăng nhập, ứng dụng mang token dự đoán trở lại màn quét, khôi phục nội dung qua `POST /v1/scans/prediction`, không đưa ảnh vào URL và không phải nhận diện lần hai.
5. Chỉ khi người dùng xác nhận đã phân loại, `POST /v1/scans` lưu kết quả dự đoán đã ký, rồi `/v1/sorting-actions` xử lý thưởng theo policy. Token gắn với ID ảnh và cách chọn ảnh, có hạn 24 giờ; máy chủ kiểm chữ ký và từ chối kết quả giả.
6. Xem lại scan đọc kết quả đã lưu, không chạy model lại. Các scan fixed lịch sử tiếp tục đọc được. Giữ quyền sở hữu, idempotency và chống xác nhận hai lần.

Ảnh chỉ được đọc trong bộ nhớ để suy luận; không lưu vào database hoặc thư mục uploads. Chấp nhận JPEG, PNG, WebP tối đa 8 MiB và 16 triệu pixel. Giới hạn body được kiểm trước khi parse JSON; nhận diện giới hạn 30 lần/phút/IP và một inference đồng thời/process, trả lỗi có thể thử lại khi bận. Mô hình chỉ phân loại nhóm vật liệu; 10 mục sổ tay `scan-*` dùng hướng dẫn theo nhóm, không suy diễn thành chai PET hoặc loại pin cụ thể.

Ngưỡng confidence là ngưỡng vận hành, chưa phải ngưỡng hiệu chuẩn trên ảnh thực tế. Mô hình phân loại đóng có thể cho confidence cao với ảnh nằm ngoài dữ liệu train; tích hợp này không bổ sung bộ phát hiện ảnh ngoài phân phối và không khẳng định accuracy mới.

## Cài đặt và migration

```powershell
cd apps/api
uv sync --frozen
# Migration chỉ chạy với quyền owner, không dùng login runtime.
uv run python -m bluesteps_api.cli migrate
# Chỉ dùng --allow-remote khi đã cho phép cập nhật database từ xa.
```

Áp dụng `supabase/migrations/202611030023_waste_model_scans.sql` trước khi khởi động API mới. Migration bổ sung predicted_class/confidence/model_name, mở result_mode=model và thêm 10 mục hướng dẫn theo nhóm; không sửa scan lịch sử, sorting facts hoặc ledger. Readiness sẽ từ chối schema thiếu các trường nhận diện.

`BLUESTEPS_SCAN_MODEL_DIRECTORY` để trống sử dụng thư mục export ở root repository. Khi triển khai wheel riêng, đặt đường dẫn tuyệt đối tới thư mục có checkpoint và model_config.json. Dockerfile đã copy thư mục export vào image; lockfile cài PyTorch/torchvision từ CPU index.

Trong workspace này, các dependency đã cài và migration đã kiểm thử trên database tạm local. Migration `202611030023_waste_model_scans.sql` đã được áp dụng lên Supabase ngày 03/11/2026 sau khi người dùng cho phép rõ ràng, khắc phục lỗi readiness do thiếu cột `scans.predicted_class`.

Đã xác nhận trực tiếp `GET http://127.0.0.1:8000/health/ready` trả `200 {"status":"ready"}`; login runtime đọc được đủ ba cột nhận diện và 10 mục hướng dẫn đã công bố. Endpoint readiness kiểm tra đủ cả ba cột và trả mã `DATABASE_MIGRATION_REQUIRED` kèm tên migration khi schema nhận diện còn thiếu. Lượt khắc phục này không chạy lại bộ test theo yêu cầu người dùng.

## Kiểm chứng

- Nạp thành công toàn bộ state_dict và so sánh trực tiếp với các lớp lấy từ notebook gốc trên hai ảnh: sai lệch logits tối đa bằng **0**. Inference sau khi đã nạp khoảng 30–31 ms/ảnh trên máy kiểm thử; thời gian nạp lần đầu khoảng 8 giây, phụ thuộc máy.
- 62 kiểm thử backend đạt: API nền, HTTP nhận diện với checkpoint thật, 10 ánh xạ lớp, EXIF/RGB, ảnh lỗi, quá dung lượng, confidence thấp, model lỗi, token giả/hết hạn/sai ảnh, quyền sở hữu, idempotency và xác nhận điểm đồng thời.
- 16 kiểm thử giao diện ScanScreen đạt: ảnh thư viện/camera, dự đoán khác nhau theo ảnh, chờ API, model lỗi/thử lại, confidence thấp, đăng nhập khách/khôi phục dự đoán và receipt tính điểm.
- API client typecheck và 11 kiểm thử client đạt. Ruff và mypy của ba module mô hình/scan đạt; lint các tệp giao diện đã sửa đạt.
- Web export và bundle Android/iOS đạt. Nghiệm thu trình duyệt → HTTP → model thật → database tạm local đạt (1 test, 27,6 giây): chọn ảnh, hiển thị confidence/hướng dẫn, xác nhận 5 điểm, tải lại receipt và từ chối chủ tài khoản khác. Ảnh nghiệm thu local ở `.backend-tools/waste-scan-browser/`. Web được build lại với cấu hình bình thường sau nghiệm thu để không giữ URL API tạm.
- Typecheck toàn app còn các lỗi có sẵn ngoài chức năng scan: ScrollView ref, kiểu onboarding và route materials. Mypy toàn backend còn lỗi kiểu trả về trong `collection_evidence.py:public_point_photos`; ba module mới/sửa của scan không có lỗi mypy.
