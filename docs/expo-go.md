# Chạy BlueSteps trên điện thoại

Baseline của repository là Expo SDK 58. Dùng Expo Go tương thích SDK 58; phiên bản khóa nằm trong `apps/mobile/package.json` và `pnpm-lock.yaml`.

## LAN

Backend Python chạy trên máy tính và kết nối database Supabase đã cấu hình. Điện thoại không thể dùng `127.0.0.1` của máy tính.

Cách chạy chung:

```powershell
cd D:\BlueSteps
pnpm go:connected
```

Lệnh mở API trên LAN, chạy worker và Expo Go, tự chọn IPv4 LAN cho `EXPO_PUBLIC_API_URL`. Dừng phiên `pnpm dev:connected` đang chạy trước để nhường cổng 8000/8081. Điện thoại và máy tính phải cùng mạng; quét QR mới trong terminal. Nếu máy có nhiều card mạng, đặt `$env:BLUESTEPS_DEV_HOST = '<IPv4-LAN>'` trước khi chạy. `pnpm dev:connected` dành cho web và không cung cấp API LAN cho điện thoại.

Sau khi cập nhật backend, áp dụng migration trước khi chạy: `pnpm api:migrate` cho database local hoặc `pnpm api:migrate --allow-remote` cho Supabase đang cấu hình. Lệnh dùng URL owner `BLUESTEPS_MIGRATION_DATABASE_URL` trong `apps/api/.env`. Readiness kiểm tra cả schema nhắc lịch của worker; thiếu migration sẽ trả 503 và launcher dừng với hướng dẫn thay vì mở Expo rồi lỗi `UndefinedTable`. Launcher không tự áp dụng migration lên cloud.

Nếu muốn chạy từng dịch vụ riêng:

```powershell
# Terminal 1: mở API cho mạng local
pnpm api:lan
# Terminal 2
pnpm api:worker
# Terminal 3: thay bằng IPv4 LAN thực của máy tính
$env:EXPO_PUBLIC_API_URL = 'http://<LAN-IP>:8000'
pnpm go
```

Nối điện thoại và máy tính cùng mạng, quét QR mới trong terminal. Không dùng URL tunnel/QR cũ trong báo cáo lịch sử. Có thể kiểm tra `http://<LAN-IP>:8000/health/ready` từ trình duyệt điện thoại trước khi mở app. API chỉ trả `ready` khi kết nối được database bằng runtime role hợp lệ.

`pnpm go:tunnel` chỉ tạo tunnel Metro, không tự đưa API ra internet. Khi LAN không dùng được, cần API HTTPS có thể truy cập từ điện thoại và đặt `EXPO_PUBLIC_API_URL` tương ứng trước khi khởi động Metro. Không đưa database hoặc khóa backend vào biến `EXPO_PUBLIC_*`.

## Tunnel cho bundle và API

Nếu Expo Go báo `Failed to download remote update`, thử mở `http://<LAN-IP>:8081/status` bằng trình duyệt điện thoại. Phải thấy `packager-status:running`. Nếu không tải được dù cùng Wi-Fi, đường LAN từ điện thoại tới Metro đang bị chặn; API/Metro trả 200 trên chính máy tính chưa chứng minh điện thoại truy cập được. Dừng phiên LAN và chạy:

```powershell
pnpm go:tunnel:connected
```

Quét QR mới của phiên tunnel, không dùng QR chứa IP LAN. Tunnel chuyển cả bundle và API qua cùng địa chỉ HTTPS; `pnpm go:tunnel` riêng lẻ không nối API. Cần giữ phiên terminal chạy khi thử điện thoại. Expo Go phải hỗ trợ SDK 58; trên iPhone, đăng nhập cùng tài khoản Expo CLI. Xem [hướng dẫn kết nối Expo](https://docs.expo.dev/get-started/start-developing/) và [yêu cầu tài khoản iPhone](https://docs.expo.dev/troubleshooting/expo-go-sign-in-required/).

Launcher giữ cache Metro và tải sẵn bundle Android/iOS qua localhost, tránh lần biên dịch đầu vượt thời gian chờ của tunnel. Chờ dòng báo tunnel và cả hai bundle đã sẵn sàng trước khi quét. Chỉ xoá cache khi cần bằng `pnpm go:tunnel:connected --clear`; launcher vẫn chuẩn bị lại hai bundle trước khi báo sẵn sàng.

### `AggregateError [ETIMEDOUT]` hoặc `fetch failed` khi khởi động

Đây là lỗi kết nối của Node/Expo; đường dẫn `expo-router/entry.js` trong thanh tiến độ là entry của bundle, chưa đủ để kết luận Router bị lỗi. Giữ cache và chạy lại:

```powershell
pnpm go:tunnel:connected
```

Launcher chỉ báo sẵn sàng khi manifest Android/iOS cùng trỏ tới tunnel công khai, sau đó đã tải xong cả hai bundle qua localhost. Bước chờ tunnel có giới hạn 90 giây, tránh báo thành công khi Expo còn dùng URL LAN dự phòng. Bundle được chuẩn bị lần lượt để giảm tải Metro. Lỗi kết nối tạm thời hoặc HTTP 503 ở bước tải manifest/bundle được thử lại tối đa 3 lần và ghi rõ nền tảng, giai đoạn; lỗi biên dịch HTTP 400/500 vẫn dừng ngay để sửa mã nguồn.

Nếu Expo thoát với mã lỗi mạng như `ETIMEDOUT` trước khi sẵn sàng, launcher khởi động lại Expo tối đa một lần, giữ API/worker đang chạy. Sau khi app đã sẵn sàng, launcher không tự đổi phiên tunnel. Cơ chế này giữ đăng nhập Expo và kiểm tra TLS; không bật offline mode cho tunnel. Nếu dịch vụ Expo vẫn không kết nối được, lỗi sẽ chỉ rõ giai đoạn; có thể dùng LAN bằng `pnpm go:connected` hoặc phương án ngrok đã mô tả bên dưới.

Kiểm tra các tình huống timeout, ngắt stream, lỗi biên dịch và khởi động lại bằng `pnpm test:expo-start`. Ngày 04/11/2026 đã kiểm tra qua HTTPS công khai: manifest và bundle Android/iOS trả 200, proxy API `/health/ready` trả 200. Việc này chưa thay thế kiểm thử trên iPhone thật.

Trong lượt kiểm tra cuối, manifest + bundle Android mất khoảng 2,6 giây, iOS khoảng 61,3 giây; Metro chuẩn bị bundle tương ứng trong khoảng 2,1 và 1,4 giây. Thời gian qua tunnel vẫn dao động theo kết nối mạng. Bản sửa xử lý lỗi khởi động tạm thời và báo đúng trạng thái, không đảm bảo tốc độ dịch vụ tunnel bên ngoài.

Đã chuẩn bị `pnpm go:tunnel:connected`: Expo tunnel chuyển cả bundle và đường `/__bluesteps_api/v1/*` tới backend loopback. Chỉ bật proxy khi launcher đặt `BLUESTEPS_DEV_API_PROXY=1`; mặc định proxy tắt. Các route cần đăng nhập vẫn do API kiểm token/ownership. Database URL và khóa backend không được gửi trong manifest/bundle. Phiên này tạo URL truy cập qua internet, cần được người vận hành chủ động cho phép trước khi mở. Chưa có bằng chứng điện thoại chạy thành công qua tunnel này.

Người dùng đã cho phép mở tunnel tạm thời trong phiên sửa lỗi timeout. Sau khi sửa việc chuyển tiếp callback `next` của Metro, đã kiểm tra qua URL HTTPS công khai: manifest Android/iOS trả 200 và dùng proxy, hai bundle native tải thành công (khoảng 8,53 MB Android / 7,86 MB iOS), readiness và danh mục trả 200; `/v1/me` khi chưa có token vẫn trả 401. Chưa xác nhận điện thoại của người dùng mở app thành công; cần quét QR HTTPS mới của phiên đang chạy. URL thay đổi khi khởi động lại.

Trước khi dùng, dừng phiên Expo cũ để nhường cổng 8081. Khi chạy, dùng QR/URL mới do chính Expo in ra, không dùng QR LAN cũ hoặc URL `/_expo/loading`. Tunnel được đóng khi dừng launcher.

Trên iPhone thật, Expo Go và Expo CLI cần đăng nhập cùng tài khoản Expo. Xem tài khoản CLI bằng `pnpm --filter @bluesteps/mobile exec expo whoami`; đăng nhập bằng `pnpm --filter @bluesteps/mobile exec expo login` nếu cần. Không nhầm tài khoản Expo với tài khoản BlueSteps. [Hướng dẫn Expo](https://docs.expo.dev/get-started/start-developing/).

### Lỗi TLS khi app tải dữ liệu trên iPhone

Nếu đã vào giao diện nhưng gặp `fetch failed: A TLS error caused the secure connection to fail`, mở `https://<host-tunnel-hiện-tại>/__bluesteps_api/health/ready` bằng Safari trên chính iPhone. Địa chỉ phải trả `{"status":"ready"}`. Nếu Safari cũng lỗi, cần kiểm tra kết nối HTTPS từ điện thoại tới tunnel; API trả 200 trên máy tính chưa chứng minh đường kết nối của iPhone hoạt động. Thử đổi Wi-Fi sang dữ liệu di động rồi mở lại cùng địa chỉ.

SDK 58 hỗ trợ chọn nhà cung cấp tunnel. Sau khi người vận hành cho phép chuyển bundle và API qua ngrok, dừng launcher cũ bằng Ctrl+C rồi chạy:

```powershell
pnpm go:tunnel:ngrok:connected
```

Lệnh dùng `expo start --go --tunnel ngrok`, giữ proxy API qua loopback và chuẩn bị cả hai bundle native như lệnh tunnel mặc định. Quét QR mới; không dùng lại địa chỉ `.on.expo.app` của phiên trước. Nếu thử bằng HTTPS, dùng cổng HTTPS mặc định, không thêm `:80`. Không tắt kiểm tra chứng chỉ TLS hoặc thêm ngoại lệ ATS để xử lý lỗi này. Việc chuyển nhà cung cấp chỉ là phương án thử kết nối; cần xác nhận trên iPhone trước khi kết luận đã khắc phục.

## Đăng nhập và camera

Tạo tài khoản từ app, đọc mã xác minh trong `apps/api/.local/mail/*.json` do worker local tạo rồi xác minh. Tài khoản không có điểm hoặc nội dung mẫu. Chỉ nội dung thật đã công bố mới xuất hiện.

Camera/picker xin quyền thực và hiển thị ảnh đã chọn. Theo chỉ đạo dự án, mọi ảnh chụp/chọn hiện trả kết quả **Chai nhựa**; không gọi mô hình AI hoặc tự tải ảnh lên server. Trang chi tiết có xác nhận phân loại để ghi nhận/nhận điểm qua API, chống xác nhận trùng và xem lại bằng scanId. `BLUESTEPS_FIXED_SCAN_ITEM_CODE` ở backend cần trỏ mục sổ tay chai đã công bố, không synthetic; khi chưa có mục hợp lệ, giao diện báo chưa ghi nhận điểm. Có thể chọn thủ công mục sổ tay lấy từ API để ghi nhận phân loại. Native credentials dùng Expo SecureStore. Cấu hình backup loại secure storage khỏi bản sao Android; plugin áp dụng khi build app riêng. Expo Go dùng quyền của Expo Go.

## Giới hạn kiểm chứng

Lượt tích hợp này kiểm tra browser thật, native bundle và cấu hình permission/secure storage. Cần kiểm tra đăng nhập, bàn phím, camera, đổi mạng và khôi phục phiên trên thiết bị trước phát hành. Bằng chứng mở Expo Go trong các báo cáo cũ thuộc giai đoạn demo và không thay thế kiểm thử tích hợp native hiện tại.
