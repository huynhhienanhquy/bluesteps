# Ảnh, báo cáo và đề xuất điểm thu gom

Theo hai frame Figma `534:48595` và `534:48690`, dùng [context đề xuất](../figma-fidelity/contexts/534-48595.txt), [context báo cáo](../figma-fidelity/contexts/534-48690.txt) và ảnh tham chiếu đã lưu. Đây là phần tiếp theo của [thu gom](collection-verification.md), chưa đóng toàn bộ F03/F09 hoặc mục tiêu Figma.

## Hành vi

- Đề xuất có tên, địa chỉ, ghim, vật liệu dự kiến, giờ tiếp nhận nếu biết và tối đa 5 ảnh. GPS chỉ được gọi qua nút; có thể chỉnh tọa độ hoặc dịch ghim 10 m về bốn hướng. Không suy tọa độ từ địa chỉ hoặc dựng GPS mặc định.
- Lưu bản nháp qua API, mở lại từ danh sách đề xuất của mình và sửa theo phiên bản. Thay đổi từ cửa sổ khác trả xung đột thay vì ghi đè. Bản đã gửi/duyệt/từ chối chỉ đọc.
- Gửi duyệt cần ít nhất một ảnh hoàn tất và xác nhận thông tin cộng đồng chưa được xác minh. Lưu bản nháp trước khi gửi; thử lại cùng nội dung giữ kết quả đã lưu và khóa idempotency của lần gửi.
- Người điều hành khác có thể xem hàng đợi và duyệt/từ chối. Duyệt đề xuất tạo đúng một điểm công khai cùng vật liệu và giờ mô tả, có audit log và thông báo qua outbox. Thông báo mở đúng URL biên nhận đề xuất hoặc báo cáo của chủ sở hữu. Lịch mở cửa/sức chứa/nhân viên vẫn chưa rõ cho tới khi có xác nhận vận hành riêng.
- Báo cáo hỗ trợ đúng các lựa chọn Figma, bao gồm không tiếp nhận vật liệu đã công bố, ảnh hiện trạng và mô tả. Biên nhận có URL riêng, đọc lại được sau tải lại. Thời điểm quan sát giữ ổn định khi thử gửi lại cùng nội dung để API idempotency không tạo bản trùng.
- Ảnh dùng bộ tải từng phần hiện có, kiểm tra giải mã/chuẩn hóa ảnh và xóa metadata. Có chọn thư viện, camera, bỏ ảnh, hủy và thử lại upload. Rời biểu mẫu hoặc đổi tài khoản hủy upload và bỏ qua kết quả đến muộn.
- Ảnh bằng chứng chỉ cho chủ sở hữu và người điều hành có vai trò hiện hành khi hồ sơ đã gửi. Bản nháp không được mở cho người điều hành khác; duyệt điểm không biến ảnh bằng chứng thành ảnh công khai. Ảnh đang được liên kết không thể xóa khỏi thư viện.

Migration `202611030015_collection_evidence.sql` chỉ được áp dụng/kiểm tra trên database PostgreSQL local dùng một lần. Không đụng database cloud. Giữ onboarding trước đăng nhập, ảnh quét trả Chai nhựa, không Google/Facebook và không triển khai luồng ghi âm/quyền micro.

## Kiểm chứng

- [API trọng tâm và worker](collection-evidence-api.log): 12 ca đạt, 20 ca ngoài phạm vi bị loại, trong 23,81 giây. Bao gồm ownership/phiên bản, ảnh sai loại/chưa hoàn tất/thuộc người khác/trùng/vượt số lượng, xác nhận trước gửi, quyền xem ảnh, duyệt đồng thời và SQL chỉ có một điểm/audit, báo cáo không tự đổi sức chứa. Ca từ chối xác minh không công bố điểm và thông báo mở đúng biên nhận; các ca worker cũ tiếp tục đạt khi payload chưa có đường dẫn.
- [API đầy đủ trước bổ sung đường dẫn thông báo](collection-evidence-api-full.log): 119 đạt, 1 bỏ qua, 1 loại khỏi lượt chạy, trong 283,52 giây. Thay đổi đường dẫn thông báo sau đó được kiểm bằng 12 ca ở trên. Các harness trình duyệt/thiết bị là opt-in riêng.
- [UI đầy đủ](collection-evidence-unit.log): 68 ca/13 suite đạt. [3 ca ảnh mới](collection-photos-unit.log) xác minh giới hạn 5 ảnh, thử lại giữ cùng mã upload và bỏ qua kết quả sau unmount. Test soạn bài cũ từng timeout khi chạy đồng thời; [chạy riêng](collection-evidence-composer-recheck.log) đạt 8/8 và lượt đầy đủ sau đó đạt.
- [Browser/API/SQL](collection-evidence-browser.log) kiểm GPS cấp rõ trong trình duyệt, dịch ghim, tải ảnh, lưu/sửa/mở lại nháp, xác nhận/gửi, người điều hành duyệt, điểm công khai và báo cáo có ảnh. Không chặn HTTP hoặc dùng phản hồi frontend giả. SQL đối chiếu trạng thái, phiên bản, tọa độ/giờ, liên kết ảnh và số audit.
- Lượt browser cuối đạt trong 52,56 giây cả harness; ca Playwright 16,2 giây. Có mở/đóng camera và kiểm tra không tràn ngang 390/428 px. Đã xem ảnh [thẻ báo cáo](collection-evidence-runtime/collection-report-390.png), [đầu biểu mẫu đề xuất](collection-evidence-runtime/collection-proposal-top-428.png) và [cuối biểu mẫu](collection-evidence-runtime/collection-proposal-draft-390.png); ảnh xác nhận đúng dấu chọn trắng và tài nguyên minh họa Figma. Bản đồ ngoài chưa đạt như ghi bên dưới.
- [TypeScript](collection-evidence-typecheck.log), [lint](collection-evidence-lint.log) và [format](collection-evidence-format.log) đạt; Ruff và mypy đạt trên 34 module.
- [Bundle Android/iOS](collection-evidence-native-export.log), [cấu hình quyền](collection-evidence-native-config.log) và [audit 167 tệp runtime](collection-evidence-live-data.log) đạt. [Bản build web bình thường](collection-evidence-build.log) đã khôi phục sau QA.

## Còn cần nghiệm thu

Chưa xác minh camera/chọn ảnh của biểu mẫu mới trên Android/iOS hoặc thiết bị thật. Iframe OSM của lượt này từng bị từ chối kết nối; [lượt dẫn đường tiếp theo](routing-verification.md) thay bằng OpenFreeMap/MapLibre, đã kiểm tile thật trên trình duyệt và nối Valhalla cho geometry/thời gian/chỉ dẫn. Đây là bằng chứng mới thay thế tình trạng bản đồ chưa tải được, không thay đổi kết quả lịch sử ở trên. Chưa đối chiếu đầy đủ mọi trạng thái/frame Figma hoặc cung cấp giao diện điều hành; xét duyệt hiện có API theo vai trò và được nghiệm thu qua API.
