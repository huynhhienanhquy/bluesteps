# Bản đồ không cần khóa và dẫn đường

Tiếp tục F03/F09 theo các frame `386:10279`, `386:10351`, `386:10136` và `534:48869`. Dùng yêu cầu/ảnh Figma đã lưu trong `docs/figma-fidelity`; lượt này chưa đóng toàn bộ nhóm thu gom hoặc mục tiêu 211 frame.

## Hành vi hiện hành

- Nền vector **OpenFreeMap Liberty**, MapLibre GL JS được đóng gói cục bộ cùng giấy phép; không tải mã thực thi từ CDN. Bản đồ trong iframe web và WebView native có attribution OpenFreeMap/OpenMapTiles/OpenStreetMap. Tải dữ liệu bản đồ vẫn cần mạng. Trang mất focus tháo bản đồ để giải phóng WebGL và dừng tải ngoài màn hình.
- Ghim có thể chọn trên bản đồ, kéo, nhập tọa độ hoặc dịch 10 m. Không suy tọa độ từ địa chỉ. Bridge kiểm tra nguồn cửa sổ/kênh và giới hạn tọa độ trước khi cập nhật form.
- Tính đường qua **Valhalla** cho đi bộ, xe đạp, xe máy và ô tô, theo thứ tự điểm đã chọn. Khoảng cách/thời gian, đường vẽ và chỉ dẫn lấy từ phản hồi dịch vụ; lỗi/không tìm được tuyến không sinh số liệu thay thế. Tránh phí là ưu tiên, không cam kết loại mọi đường có phí.
- Lưu snapshot tuyến vào PostgreSQL: phương tiện, vị trí xuất phát, điểm dừng, các chặng, geometry, thao tác rẽ và thời điểm tính. Gọi lại cùng điểm xuất phát/tùy chọn trong 5 phút dùng cache. Sửa thứ tự/phương tiện, thay điểm, hủy hoặc bàn giao xóa tuyến cũ để bắt buộc tính lại.
- Xem tuyến, chia sẻ, bắt đầu, dẫn đường, phát hiện lệch tuyến và tính lại từ vị trí hiện tại. Tiếp tục tới biên nhận bàn giao; bàn giao hết điểm kết thúc hành trình. Không tự xác nhận đã đến, khối lượng hoặc thưởng từ GPS.
- GPS theo dõi chỉ bật bằng thao tác rõ ràng khi đang chỉ đường, dừng khi ra nền/rời màn hình và bỏ kết quả đến muộn. Fix quá 20 giây hoặc độ chính xác kém hơn 50 m không dùng để tính lại. Giọng đọc dùng TTS, không xin micro; chỉ đọc khi màn hình có focus và ứng dụng ở foreground.
- Chỉ dẫn rẽ thông dụng được diễn đạt bằng tiếng Việt kèm tên đường; giữ bản gốc nhà cung cấp trong API. Loại chỉ dẫn chưa có bản dịch dùng nguyên văn nhà cung cấp.

Migration `202611030016_route_plans.sql` được áp dụng hai lần trên database local dùng một lần. Không chạy migration hay fixture lên cloud.

## Dịch vụ không cần khóa

Theo chỉ đạo người dùng, không thêm yêu cầu API key. [OpenFreeMap quick start](https://openfreemap.org/quick_start/) cung cấp style Liberty. Adapter phát triển mặc định dùng [Valhalla public demo của FOSSGIS](https://valhalla.github.io/valhalla/start/introduction/), gửi `X-Client-Id`, giới hạn một yêu cầu/giây/mỗi process, timeout và kích thước phản hồi. Test/production phải cấu hình `BLUESTEPS_ROUTING_URL` rõ ràng; xem [env mẫu API](../../apps/api/.env.example). Không sửa cấu hình bí mật hiện hành.

Trước khi công bố ứng dụng dùng demo cần thực hiện hướng dẫn fair-use của nhà cung cấp hoặc trỏ tới Valhalla tự host. Không có SLA hoặc điều phối rate-limit giữa nhiều process trong triển khai hiện tại. Chưa công bố ứng dụng hoặc gửi thông báo cho nhà cung cấp. Tọa độ xuất phát/điểm dừng được gửi tới dịch vụ tính tuyến sau thao tác người dùng, có mô tả ngay trong UI.

## Bằng chứng

- [Probe dịch vụ thật](routing-provider-live.log): cả bốn phương tiện trả khoảng cách/thời gian, geometry và maneuver thật cho cặp tọa độ công khai tại Đà Nẵng; không dùng phản hồi mock cho lượt này.
- [API đầy đủ](routing-api-full.log): 134 đạt, 1 bỏ qua, 1 loại khỏi lượt chạy trong 252,73 giây. Sau sửa phạm vi truy vấn biên nhận theo route và bổ sung kiểm tra cấu trúc phản hồi lỗi, [15 ca trọng tâm](routing-api.log) đạt. Test adapter dùng MockTransport riêng để chứng minh profile, payload, lỗi/rate-limit/shape/index/metric; test PostgreSQL chứng minh ownership, CAS, cache và invalidation.
- [72 UI / 15 suite](routing-unit.log): gồm chiếu GPS lên đoạn đường, phát hiện lệch tuyến, an toàn tài liệu bản đồ, theo dõi foreground, dừng nền và hủy subscription tới muộn.
- [Browser/API/SQL](routing-browser.log): ba luồng thu gom đạt, cả harness 81,99 giây; không chặn HTTP. Có GPS được context kiểm thử cấp rõ ràng, chọn/kéo ghim bằng chuột, tải tile OpenFreeMap thật, vẽ geometry thật, khôi phục snapshot sau reload, lệch tuyến/tính lại và bàn giao kết thúc. SQL đối chiếu độc lập trạng thái, geometry, thay điểm, bằng chứng ảnh và không cấp thưởng bàn giao tự khai. Đã xem ảnh [xem tuyến 390 px](routing-runtime/route-preview-390.png) và [dẫn đường 428 px](routing-runtime/route-navigation-428.png) sau khi tile tải xong, không tràn ngang.
- [Android/API/SQL](routing-native.log): Expo Go 58.0.5 trên BlueStepsQA32/API 32, 165,55 giây. Đăng nhập, chọn xe máy, nhập vị trí xuất phát, gọi Valhalla thật, bắt đầu, chờ bản đồ tải xong, bật GPS, kiểm nút tính lại được bật khi có fix và force-stop/mở lại thành công. Tọa độ GPS được cấp rõ qua emulator, không áp dụng cho runtime sản phẩm. SQL độc lập xác nhận route active/motorcycling, snapshot Valhalla có geometry/metric và chưa có biên nhận bàn giao tự động.
- Native WebView dùng WebGL1 tương thích. Lượt đầu có lỗi framebuffer/khung trắng trên GPU giả lập; chưa được tính là đạt hình ảnh. Lượt sau đã xem trực tiếp [bản đồ và tuyến](routing-native-runtime/02-navigation.png) và [khôi phục](routing-native-runtime/04-navigation-restored.png) sau khi chờ trạng thái tile tải xong. Đây là bản đồ tương tác thật, không phải ảnh Figma nền.
- [TypeScript](routing-typecheck.log), [lint](routing-lint.log), [format](routing-format.log), Ruff và mypy 35 module đạt. [4 ca UI trọng tâm chạy lại](routing-focused-unit.log) kiểm an toàn tài liệu bản đồ và vòng đời GPS trên mã cuối. [Bundle Android/iOS](routing-native-export.log), [quyền native](routing-native-config.log) và [audit 174 tệp runtime](routing-live-data.log) đạt. [Build web bình thường](routing-build.log) được khôi phục sau harness local.

## Phạm vi còn mở

Các lượt sau đã viết ETA theo tiến trình, kéo sắp xếp hành trình và màn hướng dẫn bàn giao `534:48955`. Lối vào, hướng dẫn và số điện thoại công khai lấy từ cấu hình vận hành của từng điểm. Màn bàn giao có bản đồ, checklist, báo cáo và chuyển đến điểm kế tiếp. Khi điểm thiếu dữ liệu, màn hình ghi rõ và ẩn nút gọi. Migration `202611030019_handover_guidance.sql` chưa được áp dụng trong lượt viết code.

Đã viết giao diện điều hành để mở hàng chờ đề xuất và báo cáo, xem bằng chứng và gửi quyết định có lý do. Lối vào trong Thu gom chỉ hiển thị cho người có quyền xét duyệt. API xét duyệt đã được kiểm riêng ở lượt trước. Giao diện mới chưa chạy kiểm thử theo yêu cầu.

Chưa nghiệm thu thiết bị thật/iOS, nghe TTS thực tế, mọi biến thể picker/bản đồ và mọi frame Figma. Bố cục dẫn đường hiện dùng thành phần ứng dụng chung.
