# Quét cố định Chai nhựa — 02/11/2026

Giữ chỉ đạo của chủ dự án: **mọi ảnh chụp/chọn hợp lệ đều trả Chai nhựa**, không tự chuyển sang mô hình AI. API công khai `resultMode=fixed`, không có confidence hoặc URL ảnh; bootstrap vẫn báo nhận diện AI chưa mở.

Đã nối luồng:

- Camera toàn màn hình: khung ngắm, nút chụp, bật/tắt đèn, đổi camera, chọn ảnh và đóng. Nút chụp chờ camera sẵn sàng, khóa khi đang chụp; đổi camera chờ sẵn sàng lại, camera trước không bật đèn. Lỗi mở/chụp có thông báo và không tạo ảnh/kết quả giả.
- Chọn ảnh/chụp → trạng thái đang mở ảnh thật → “Quét thành công!” → Xem kết quả trên chính ảnh của người dùng → Chi tiết. Lỗi đọc ảnh có bảng lỗi, quét lại và sổ tay; hủy picker/không cho quyền không tạo kết quả mới. Không dùng timer giả cho suy luận AI.
- Trang Chi tiết có hướng dẫn, mở sổ tay và bản đồ lọc đúng vật liệu Nhựa; Quay lại, quét/chọn ảnh khác. Ảnh xem trước dùng toàn màn hình, không lặp thanh điều hướng; trang chi tiết có một thanh điều hướng.
- Tích điểm xanh mở xác nhận; Để sau không ghi scan/action/điểm. Chỉ sau Xác nhận đã phân loại mới tạo scan và gửi xác nhận qua API. Khối lượng cân là tùy chọn, tự khai báo.
- Hộp kết quả lấy điểm/số dư từ response đã commit. Khi giới hạn ngày hoặc policy không cấp điểm, hiện số 0 và trạng thái đã lưu; không lấy số 5 minh họa trong Figma làm kết quả cố định.
- URL `scanId` mở lại chi tiết/biên nhận, không gửi xác nhận lần nữa. Không lưu hoặc tải ảnh lên backend; mở lại dùng metadata/biên nhận và icon minh họa chai. Đổi tài khoản bỏ state ảnh/biên nhận cục bộ; server trả 404 khi tài khoản khác đọc hoặc xác nhận scan.

Backend dùng migration `202611020008_fixed_scan_flow.sql`. Tạo scan có idempotency và khóa theo người dùng/`clientImageId`; một lựa chọn vẫn là một scan khi retry đổi transport key. Xác nhận khóa scan, kiểm item khớp, tạo action/award/snapshot cùng transaction; idempotency chống replay và unique scan chống xác nhận đồng thời. Đây là hành động **người dùng xác nhận**, không phải khối lượng/ảnh đã được tổ chức xác minh.

`BLUESTEPS_FIXED_SCAN_ITEM_CODE` ánh xạ tới mục sổ tay chai đã được công bố, không synthetic, không hazardous và tên bắt đầu bằng Chai nhựa. Mặc định code `bottle`; cấu hình trong môi trường triển khai nếu catalog dùng code khác. Không tự công bố fixture để cấp điểm. Nếu chưa có mục hợp lệ, vẫn giữ nhãn Chai nhựa, báo chưa ghi nhận điểm và cho tra cứu thủ công. Migration/cấu hình này chưa triển khai lên cloud.

Kiểm chứng đã đạt:

- **74 test API**, gồm 6 test mới cho quét: ownership, không cấp điểm khi tạo, replay/dedup, snapshot sau reload, item mismatch, catalog chưa công bố, xác nhận đồng thời và từ chối upload/field tự đặt kết quả. [Log đầy đủ](scan-api-full.log); Ruff/mypy đạt.
- **30 test ứng dụng**, gồm 11 test quét cho camera/picker, tải/lỗi ảnh, xác nhận/hủy, retry, receipt, catalog chưa có, đổi tài khoản, đổi camera/chờ sẵn sàng và chụp lỗi. [Log cuối](scan-all-unit.log); TypeScript/ESLint/format đạt.
- **18/18 luồng browser → HTTP → worker → PostgreSQL**, SQL độc lập đạt trong 586 giây: [log](scan-browser.log), [metadata](scan-runtime/tests). Quét dùng ảnh chiếc lá để xác minh kết quả vẫn là Chai nhựa, nhận đúng 5 điểm cho tài khoản B, 0,250 kg tự khai báo, không upload ảnh, reload không thêm action và tài khoản A không đọc được scan B.
- Suite đầy đủ kiểm **68 route** và **66 lượt bố cục**. Ảnh trước sửa bố cục cho thấy nav lặp/khoảng trắng modal; không dùng các ảnh quét trong `scan-runtime` làm bằng chứng bố cục cuối.
- Sau sửa và thêm bước “Quét thành công!”, chạy lại **một luồng quét riêng với API/database mới**, kiểm nav đúng vai trò tab (0 trên ảnh, 1 ở chi tiết), xác nhận/reload/ownership và SQL đạt: [log](scan-browser-layout.log), [ảnh cuối](scan-layout-runtime). Đã xem ảnh kết quả, chi tiết, xác nhận và nhận điểm ở 390/428 px; không tràn ngang. Scope test được ghi rõ, không thay thế suite 18 luồng đầy đủ. Lượt này đạt trong 124 giây; bài browser riêng mất 19 giây.
- **Android native / Expo Go 58.0.5 / emulator BlueStepsQA32**: chụp từ camera emulated → Quét thành công → kết quả cố định → chi tiết → xác nhận/hủy → nhận 5 điểm → force-stop → mở scanId → xem lại biên nhận → trang chủ, đồng thời giữ các kiểm đăng nhập/thống kê/mục tiêu/xếp hạng trước đó. **1/1 harness đạt trong 399 giây**, [log](scan-native-integration.log), [thao tác](scan-native-actions.log), [ảnh/XML](scan-native-runtime). SQL độc lập xác nhận input camera, snapshot 5 điểm, số action tăng từ 2 lên 3 và mục tiêu tiến độ 3 sau mở lại. Không mock camera hoặc intercept API trong lượt này. Đã xem ảnh camera toàn màn hình, thành công và kết quả; ảnh camera emulator là cảnh mô phỏng/đồng hồ đen, không phải vật phẩm thật.
- [Web đã export lại bằng cấu hình thường](scan-build-normal.log); [Android/iOS export đạt](scan-native-export.log), [cấu hình camera/photos và loại microphone đạt](scan-native-config.log). [Audit 146 file runtime đạt](scan-data-audit.log), không dùng fixture adapter/seeded identity hoặc credential database trong giao diện. Chưa phát hành hoặc triển khai cloud.

Đối chiếu dùng context chi tiết và ảnh Figma đã lưu cho `386:14194/14221/14241/14264/14309/14346/14379/14454/16189/16218`. Kết nối Figma gốc hiện chưa cho đọc lại, nên chưa tuyên bố đối chiếu thiết kế mới nhất. Frame không nhận diện AI được điều chỉnh theo chỉ đạo mọi ảnh trả Chai nhựa; lỗi mở media vẫn xử lý thật.

Lượt unit đầu bị timeout khi chạy đồng thời nhiều tác vụ export/test; sau đó phát hiện fixture dùng cùng ID cho hai ảnh nên React giữ state thành công cũ. Đã sửa fixture để tạo ID mỗi lần chọn như runtime; không tăng timeout hoặc giảm assertion. Lượt cuối toàn bộ 30 test đạt. Lượt bố cục đầu dùng selector button cho nav nhưng component đúng là tab; đã sửa selector, rồi xác minh chỉ một tab bar thật. Metro QA ban đầu dùng bundle cũ; đã khởi động lại và kiểm trực tiếp bundle chứa `CameraControl` trước lượt native cuối.

Các bước còn cần nghiệm thu: các biến thể sổ tay F12 liên quan, đèn/camera trước/picker và vòng đời app trên thiết bị thật/iOS, đối chiếu trực tiếp Figma gốc. Emulator không thay thế kiểm phần cứng; không suy rộng test browser hoặc mock CameraView thành camera phần cứng. Các nhóm khác trong mục tiêu toàn bộ Figma vẫn còn mở.
