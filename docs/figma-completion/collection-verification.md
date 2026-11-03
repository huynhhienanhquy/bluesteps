# Thu gom: GPS, bộ lọc, so sánh và thay điểm

Phạm vi đang hoàn thiện của F03/F09. Lượt này nối GPS foreground, bộ lọc vận hành, so sánh và thay điểm chưa đến qua API/PostgreSQL. Chưa đóng toàn bộ nhóm thu gom.

## Hành vi đã triển khai

- Chỉ xin vị trí khi người dùng nhấn nút; không theo dõi nền, không dựng tọa độ mặc định. Bán kính cần vị trí thật; từ chối quyền hoặc hết thời gian chờ có thông báo. Kết quả cũ không được ghi vào cache sau đổi tài khoản.
- Bộ lọc vật liệu all/any, bán kính, đang mở, 24 giờ, còn chỗ và có nhân viên được thực hiện trên server trước phân trang. Giá trị chưa biết không được coi là đã xác nhận.
- Lịch mở cửa có múi giờ của điểm, hỗ trợ qua nửa đêm và giao tuần. Trạng thái sức chứa có thời hạn; hết hạn trở về chưa rõ. Trạng thái tạm đóng cửa còn hiệu lực ghi đè lịch mở cửa.
- So sánh giữ thứ tự điểm đã chọn. Chỉ gợi ý điểm đang mở, còn chỗ và gần nhất khi có GPS. Khoảng cách ghi rõ là đường thẳng; không dùng làm quãng đường hoặc thời gian di chuyển.
- Thay điểm trong hành trình đang hoạt động yêu cầu chủ sở hữu, phiên bản hiện hành và điểm dừng chưa đến. Điểm mới phải được công bố, chưa nằm trong hành trình và không đang đầy/tạm đóng cửa. Điểm thay có ID mới để URL cũ không thể đánh dấu nhầm đã đến; thứ tự và các điểm khác được giữ lại, có lịch sử thay thế chỉ được thêm.
- Cập nhật vận hành điểm yêu cầu vai trò điều hành, lý do, khóa hàng/phiên bản, giới hạn thời hạn tối đa 24 giờ và audit log. Không lấy báo cáo chưa duyệt làm dữ liệu vận hành đã xác nhận.

Migration `202611020014_collection_operations.sql` được kiểm trên database local dùng một lần. Không áp dụng migration hay dữ liệu kiểm thử lên cloud.

## Bằng chứng

- [7 kiểm thử API thu gom](collection-api.log): bộ lọc trước phân trang, trạng thái hết hạn/tạm đóng cửa, so sánh/GPS, lịch qua đêm/giao tuần, quyền/phiên bản/audit và thay điểm/URL cũ.
- [Toàn bộ API sau thay đổi](collection-api-full.log): 115 đạt, 1 bỏ qua và 1 loại khỏi lượt chạy, 246,09 giây; các harness thiết bị/trình duyệt opt-in được chạy riêng theo phạm vi.
- [65 kiểm thử UI](collection-unit.log), gồm từ chối quyền, không tự xin GPS, ngăn kết quả sau đổi tài khoản và bộ lọc cần vị trí.
- [Nghiệm thu trình duyệt/API/SQL](collection-browser.log): lấy GPS do trình duyệt kiểm thử cấp rõ ràng, lọc/so sánh, tạo/bắt đầu/thay điểm và tải lại; đối chiếu dữ liệu bằng SQL độc lập. Tọa độ fixture chỉ tồn tại trong kiểm thử.
- Lượt trình duyệt cuối đạt trong 94,12 giây cả harness; ca Playwright đạt trong 13,8 giây. Bộ lọc xuống dòng ở 390 và 428 px, đã xem ảnh [390 px](collection-runtime/collection-filters-390.png), [428 px](collection-runtime/collection-filters-428.png) và [hành trình sau thay điểm](collection-runtime/collection-replaced-390.png).
- [Cấu hình native](collection-native-config.log): GPS foreground, không GPS nền, không quyền micro. Ghi âm chỉ giữ nút và thông báo theo chỉ đạo người dùng; xem [biên bản chat](chat-verification.md).
- [TypeScript](collection-typecheck.log), [lint](collection-lint.log), [format](collection-format.log), Ruff và mypy (33 module) đạt. [Bundle Android/iOS](collection-native-export.log) xuất thành công; đây chưa phải nghiệm thu thao tác trên thiết bị.
- [Audit nguồn dữ liệu](collection-live-data.log) đạt trên 165 tệp runtime; [build web bình thường](collection-build.log) đã khôi phục sau harness local.

## Phạm vi còn mở

Ảnh và luồng lưu nháp/gửi/duyệt đề xuất, báo cáo đã được triển khai trong [lượt tiếp theo](collection-evidence-verification.md). Bản đồ OpenFreeMap và Valhalla không cần khóa, tính tuyến/chỉ dẫn từng chặng đã được nối trong [lượt dẫn đường](routing-verification.md), thay thế gate dịch vụ trước đây. Các phần native, thiết bị thật/iOS và đối chiếu mọi frame phải được đọc theo bằng chứng/phạm vi còn mở của biên bản mới; chưa đóng toàn bộ F03/F09.
