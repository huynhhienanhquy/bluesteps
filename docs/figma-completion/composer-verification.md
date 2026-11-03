# Soạn bài: media, bản nháp và quyền bạn bè

Ngày cập nhật: 02/11/2026. Nhóm F14 của mục tiêu đầy đủ chức năng và luồng Figma. **Luồng browser và Android qua API/SQL local đã đạt; thiết bị thật/iOS và đối chiếu đầy đủ Figma còn mở.** Không dùng kết quả của lượt Cộng đồng F13 để đóng F14.

Sau lượt F14, F16 bổ sung ghi âm chat và quyền micro theo thao tác người dùng; vì vậy log cấu hình F14 “microphone excluded” là bằng chứng lịch sử của lượt đó. Cấu hình mới được kiểm ở `chat-native-config.log` và [biên bản chat](chat-verification.md). Camera soạn bài vẫn dùng chế độ chụp ảnh.

## Phạm vi trong mã hiện tại

- Màn tạo/sửa bài có nội dung, chủ đề, công khai/bạn bè/chỉ mình tôi, cảm xúc, địa điểm, chọn nhiều ảnh/video/tệp, camera, xem trước, trạng thái đang đăng và kết quả thành công lấy lại từ API.
- Địa điểm được chọn từ điểm thu gom đã công bố hoặc do người dùng tự nhập. Không giả GPS. Nếu chọn ID điểm, API dùng tên/địa chỉ đã công bố thay vì tin tên do client gửi.
- Bản nháp lưu qua API vào tài khoản, có phiên bản và danh sách media. Không dùng bộ nhớ trình duyệt làm dữ liệu chuẩn. Gỡ/đổi thứ tự tệp, tải lại tệp lỗi, hủy tải và thư viện tệp đã tải lên được nối vào API.
- Xóa tệp chưa được dùng trong bài/draft đã lưu cũng gỡ lựa chọn trong form đang soạn, tránh gửi ID đã xóa. Kết quả publish, xóa draft và picker về sau khi form đổi tài khoản/unmount không được chuyển route hoặc thay nội dung form mới.
- Theo dõi một chiều và quan hệ bạn bè độc lập. Người nhận phải chấp nhận lời mời; gửi lời mời ngược lại không tự chấp nhận. Có danh sách bạn bè, lời mời nhận/gửi, hủy/từ chối và hủy kết bạn. Chặn xóa cả theo dõi và tình bạn hai chiều.
- ACL dùng chung cho bài, đếm bài trên trang thành viên và URL tải media. Chỉ bạn bè đã chấp nhận được đọc bài `friends`; theo dõi không cấp quyền đọc. Bỏ kết bạn hoặc chặn khiến lần đọc API sau mất quyền. Không có bucket công khai hoặc token trong URL media.
- Tệp được tải theo phần 256 KiB, request tối đa 400.000 byte, mỗi tệp tối đa 20 MiB, tối đa 10 tệp/bài và 100 MiB/500 mục mỗi tài khoản. Phần đã nhận không thể bị thay bằng byte khác; hoàn tất được serialize/idempotent. PostgreSQL lưu byte thực và metadata bền vững, không cần cấu hình cloud mới.
- Ảnh được giải mã và ghi lại pixel để loại EXIF/GPS; tối đa 16 triệu pixel. Video MP4/MOV/WebM phải giải mã được khung hình, remux một cặp video/audio và bỏ metadata. Tệp khác dùng tải xuống attachment/octet-stream. Đọc content có kiểm quyền, `no-store` và hỗ trợ byte range.
- Media private được tải bằng API client có refresh phiên, sau đó mở bằng blob URL/tệp cache tạm. Cache phụ thuộc tài khoản và được dọn khi unmount; kiểm lại quyền khi API invalidated. Không phát video tự động hoặc bật phát nền/PiP/microphone.

## Migration và mã nguồn

`202611020011_composer_media_friends.sql`: post metadata/audience, friendship, assets/chunks/post links/drafts, RLS runtime. Đã được áp dụng vào database local tạm trong các lượt API dưới đây, chưa áp dụng cloud.

`202611020012_draft_versions.sql`: sequence tạo phiên bản không tái sử dụng sau khi xóa/tạo lại draft. Save/delete/publish có khóa theo tài khoản để tránh xung đột. Migration được áp dụng và chạy lại qua fixture local; kiểm tra tab cũ sau xóa/tạo lại, save/delete/publish cũ không xóa nhầm draft mới đã đạt.

Module API: `composer.py`, `friends.py`, `media.py`, `post_access.py`, cùng cập nhật post/catalog/community. UI: `ComposerScreen.tsx`, `ComposerSheet.tsx`, `FriendControls.tsx`, `PostMedia.tsx`; camera dùng chung `ScanCapture` có chế độ bài viết riêng. Thư viện mới: Pillow, PyAV, Expo Video và DocumentPicker theo SDK hiện có.

## Bằng chứng đã có và giới hạn

| Bằng chứng | Điều thực sự chứng minh |
|---|---|
| `composer-api.log` | 100 API đạt trên mã hiện tại, 139,08 giây; migration 011/012 chạy trong database local tạm. |
| `composer-api-targeted.log` | 10 API media/draft/bạn bè đạt sau migration 012, gồm WebM/MP4 giải mã 5 khung hình, bỏ metadata, tab cũ sau xóa/tạo draft và sửa chữ không đổi audience riêng tư. |
| `composer-all-unit.log` | 56 UI test/9 suite đạt trong 40,358 giây; gồm 8 kiểm tra cho soạn bài, xóa tệp chưa lưu, kết quả publish sau đổi tài khoản và thanh điều hướng ẩn/hiện theo bàn phím. |
| `composer-client-tests.log` | 11 API client test đạt, gồm refresh binary, lỗi quyền trả API error và đổi tài khoản khi đang đọc body binary. |
| `composer-typecheck.log` | TypeScript đạt trên bản soạn bài/preview hiện tại. |
| `composer-lint.log`, `composer-format.log`, `composer-source-audit.log` | ESLint/Prettier đạt; 159 file runtime không có fixture adapter/seeded identity/database credential. |
| `composer-native-config.log` | Introspection cấu hình đạt; camera/photos có quyền, microphone không bật. Bằng chứng chạy camera emulator nằm ở lượt native riêng. |
| `composer-native-export.log` | Android 5,1 MB/iOS 4,8 MB và metadata 37 KB được xuất thành công. |
| `composer-runtime/` | Ảnh bản nháp khôi phục, preview toàn màn hình, thành công và bạn bè đọc được, mỗi trạng thái 390/428 px không tràn ngang; video fixture PyAV mã hóa thật, browser đã phát và tăng currentTime. |
| `composer-browser-targeted.log` | Luồng browser → API → SQL local đạt 1/1 trong 62,96 giây: ảnh/video/tệp thật, tải xuống byte đúng, draft reload, preview/publish, hai tài khoản và quyền bạn bè chấp nhận/hủy. SQL xác nhận 1 bài, 3 asset/link, 0 chunk/draft/friendship còn lại, 0 giao dịch điểm. |
| `composer-browser-full.log` | 21/21 luồng và SQL local đạt trong 687,87 giây; `composer-full-runtime/runtime-routes.json` có 68 route và `checks.json` có 66 lượt bố cục không tràn ngang. Lượt này trước sửa bàn phím/accessibility; ba luồng bị ảnh hưởng được kiểm lại riêng trong `composer-browser-social.log`. |
| `composer-browser-social.log` | Kiểm lại 3/3 luồng cộng đồng/soạn bài đạt sau sửa xóa tệp/đổi tài khoản; pytest và SQL local đạt trong 144,74 giây. Lượt này trước bổ sung dismiss bàn phím khi mở sheet; native và 56 UI test chạy sau bổ sung đó. |
| `composer-native-integration.log` | Đạt trong 331,16 giây trên BlueStepsQA32/emulator-5556: đăng nhập, audience Bạn bè, cảm xúc Hạnh phúc, địa điểm công bố, camera, upload, lưu draft, force-stop/mở lại, preview, publish và chi tiết. SQL độc lập xác nhận 1 bài, 1 asset/link với byte ảnh thật giải mã được, 0 chunk/draft/friendship/scan, 2 sorting/ledger từ setup không tăng sau đăng bài. |
| `composer-native-runtime/36-composer-camera.*` đến `41-composer-discussion.*` | Ảnh/XML camera, draft đã lưu/khôi phục, preview, thành công và chi tiết. Camera emulated tạo khung đen có timestamp; chưa chứng minh chụp vật thể trên điện thoại thật. `composer-result.json` có thời điểm kết thúc và serial QA. |
| `composer-build-normal.log` | Build web cấu hình bình thường kết thúc mã 0 sau harness. Đã đọc dist và xác nhận không còn URL API emulator 8093 hoặc API localhost cổng tạm của harness. |

Đã giới hạn Metro còn 2 worker sau lỗi bộ nhớ và tăng thời gian chờ UI native khi khởi động lên 60 giây. Metro QA 8092 đã khởi động lại, bundle Android 2309 module được tải HTTP 200. Emulator cũ đã dừng được xác nhận bằng tiến trình/ADB, nên khởi động lại đúng AVD QA giữ dữ liệu. Không dừng API/Metro thông thường do người dùng mở.

Đã quan sát và sửa lỗi Android thực: bàn phím mở lại sau chọn audience làm thanh điều hướng nổi che nút Cảm xúc. `CommunityPage` ẩn navigation khi bàn phím hiện, hỗ trợ keyboard avoidance iOS và kéo để đóng bàn phím. Composer dismiss bàn phím khi mở sheet; hộp thoại chỉ mount khi hiển thị và đặt focus accessibility vào tiêu đề. Ảnh trước/sau trong `composer-native-runtime/36-composer-*.png` chỉ rõ hộp cảm xúc mở đúng sau sửa.

UIAutomator biểu diễn emoji bằng entity XML số (`&#128522;`), bộ đọc QA trước đó chỉ giải entity chữ nên không nhận đúng nút. Đã sửa giải mã decimal/hex và không dùng dữ liệu XML cũ khi dump thất bại. Expo Go cold launch cần quan sát project đã tải rồi chuyển lại route đăng nhập; không bỏ qua xác thực hoặc onboarding trong kiểm thử.

Sau lần emulator khởi động lại, hộp lỗi hệ thống “Bluetooth keeps stopping” che Expo Go. Đã xác nhận bằng XML/ảnh, đóng hộp lỗi và disable package `com.android.bluetooth` chỉ trên AVD QA. Lượt native đạt sau xử lý này, giữ dữ liệu AVD. Không sửa ứng dụng để giấu lỗi hệ thống, không thay cấu hình Bluetooth trên thiết bị thật.

## Việc cần chạy tiếp

1. Đối chiếu mọi state/biến thể soạn bài với context/screenshot Figma cache và file gốc khi truy cập được. Preview đã dùng màn toàn màn hình theo `741:6114`; ảnh/thành viên/nội dung lấy từ API nên không chép người mẫu hoặc nội dung mẫu vào runtime.
2. Nghiệm thu iOS/thiết bị thật, chọn nhiều ảnh/video/tệp qua picker hệ điều hành, hủy/lỗi/mất mạng, xoay màn hình và bàn phím. Bundle iOS đạt chưa thay thế chạy trên iOS.
3. Phát video đa codec, chính sách dung lượng/retention và cấu hình triển khai trước phát hành vẫn mở. Byte media hiện lưu PostgreSQL; chưa tự chọn cloud hoặc áp dụng migration cloud.

Không tự áp dụng migration hoặc dùng fixture trên database cloud.

## Trở ngại chạy lệnh

Hệ thống duyệt từng từ chối thực thi vì hạn mức tài khoản. Sau khi người dùng yêu cầu tiếp tục, lệnh kiểm tra được gửi lại qua đúng cơ chế duyệt và đã được chấp nhận; không đổi cách chạy để vượt bước duyệt. PostgreSQL QA local từng dừng; đã xác nhận bằng `pg_ctl status` trước khi khởi động lại, sau đó các kiểm tra database đạt như bảng trên.

Lượt native từng bị hệ thống duyệt tự động từ chối do hết hạn mức, thông báo thử lại lúc 22:03. Lệnh bị từ chối không thực hiện. Sau 22:03, gửi lại qua cùng cơ chế duyệt được chấp nhận; các kiểm tra mới và lượt native hoàn tất như bảng trên. Trở ngại hạn mức hiện đã được giải quyết cho các lệnh đó.
