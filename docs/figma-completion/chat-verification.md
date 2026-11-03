# Chat: media, ghi âm và nhận tin tự động

## Phạm vi mới theo chỉ đạo người dùng

Người dùng yêu cầu không làm luồng ghi âm, chỉ giữ hiện diện chức năng. Mã hiện tại đã gỡ `ChatRecording.tsx` cùng các kiểm thử thu âm; giữ nút micro và mục ghi âm trong menu, khi bấm chỉ hiện “Chức năng ghi âm hiện chưa được bật.” Không có nút bắt đầu/dừng, timer, nghe lại hoặc gửi bản ghi. Cấu hình camera/image-picker/audio không cho phép micro Android/iOS; phát âm thanh phản hồi và tệp có sẵn không cần quyền micro.

API/media lưu tệp cũ được giữ tương thích, không rollback migration hoặc xóa dữ liệu. Harness browser/native đã bỏ kịch bản thu/gửi bản ghi và kiểm placeholder thay thế. Kết quả mới nằm trong `chat-placeholder-*.log`; các bằng chứng ghi âm phía dưới là lịch sử của phiên bản trước, không phải yêu cầu phải khôi phục.

- `chat-placeholder-unit.log`: 61 test/10 suite đạt trong 41,617 giây; kiểm nút ghi âm chỉ mở thông báo, không tạo upload hoặc tin nhắn.
- `chat-placeholder-typecheck.log`, `chat-placeholder-lint.log`: TypeScript/ESLint đạt.
- `chat-placeholder-config.log`: introspection Android/iOS xác nhận không có NSMicrophoneUsageDescription hoặc quyền RECORD_AUDIO được bật; camera/photos vẫn có quyền, không ghi/phát nền.
- `chat-placeholder-browser.log`: 2/2 luồng browser và SQL độc lập đạt trong 60,73 giây. Nút ghi âm mở/đóng thông báo, không có nút bắt đầu; emoji, camera mở/hủy, ảnh/tệp, nhận tin hai tài khoản, reload và mở trang thành viên đạt. SQL có 4 tin, 2 asset/link; đã gỡ dữ liệu ghi âm khỏi kịch bản này.
- `chat-placeholder-build.log`: build web bình thường hoàn tất sau harness. `chat-placeholder-native-export.log` là bản xuất mới cho phạm vi chỉ UI.

Phạm vi tiếp tục: ảnh/video/tệp/camera và các biến thể Figma/thiết bị liên quan; không chạy tiếp hoặc khôi phục luồng ghi âm.

## Bằng chứng lịch sử trước khi đổi phạm vi

Ngày cập nhật: 02/11/2026. F16 vẫn thuộc mục tiêu đầy đủ chức năng và luồng Figma. **Luồng browser và Android qua API/SQL local đã đạt; thiết bị thật/iOS, các biến thể picker và đối chiếu đầy đủ Figma còn mở.**

## Luồng được nối

- Dùng nội dung các frame cache `771:6023/6077/6108/6144/6180/6480/6514/6565`, `772:6456/6544`, `773:6563/6609`: emoji, đính kèm, chọn ảnh/tệp, xem trước/chú thích, trạng thái gửi, ghi âm/nghe lại và tin đã gửi. Không chép danh tính, tin mẫu hoặc trạng thái online trong Figma vào runtime.
- Chat có header người nhận từ API, nút mở trang cá nhân, bong bóng phân biệt người gửi và vùng soạn cố định khi cuộn lịch sử. Có chỉ báo tin mới khi đang xem phần lịch sử phía trên.
- Chọn nhiều ảnh/video/tệp bằng picker hệ điều hành, tối đa 10 tệp/tin. Tải byte thật theo phần, tiến độ, hủy/gỡ và thử lại khi lỗi; chỉ gửi ID asset của chính người gửi đã tải xong. Có preview và chú thích trước khi gửi.
- Menu đính kèm có cả chụp ảnh và ghi âm theo `771:6108`. Camera dùng chung ở mode message với nhãn riêng; ảnh chụp tải qua pipeline media rồi xem trước/gửi. Không gọi nhận diện rác khi chụp ảnh chat, không đổi quy tắc Chai nhựa của mode scan.
- Ghi âm chỉ xin quyền khi chọn bắt đầu. Có dừng, nghe lại, ghi lại, hủy và đính kèm; tối đa 2 phút. Rời màn hình hoặc đưa ứng dụng ra nền dừng ghi, cấu hình không bật ghi/phát nền. Bản ghi web được giữ Blob trước khi unmount recorder để tránh mất URL tạm.
- API giải mã audio thực, chấp nhận WAV/M4A/WebM/Ogg/MP3, loại metadata và ghi PCM WAV mono 16 kHz. Thời lượng từ số mẫu thực; tệp rỗng/hỏng hoặc quá 120 giây bị từ chối. Giữ giới hạn 20 MiB/tệp, 100 MiB/500 asset mỗi tài khoản từ pipeline F14.
- Hội thoại lấy trang mới nhất và tải lịch sử cũ theo sequence. Nhận mới tự động bằng polling HTTP 2 giây khi màn được focus và app đang active; dùng cursor sequence, gộp ID và giữ baseline đầu để không bỏ khoảng tin khi focus lại. Chưa triển khai WebSocket hoặc nhận nền.
- Lưu read marker qua API. Gửi lại cùng clientMessageId/nội dung/tệp trả đúng tin cũ; đổi thứ tự tệp hoặc nội dung với cùng ID báo xung đột. Không tạo sequence/tin/link khi đính kèm asset người khác hoặc chưa hoàn tất.
- Đọc metadata/byte tệp yêu cầu thành viên hội thoại, không có chặn hai chiều và các thành viên còn active. URL không chứa bearer token. Người ngoài/guest bị từ chối, chặn thu hồi quyền người nhận ở lần đọc sau. Chủ tệp giữ quyền đọc của mình. Asset đang dùng trong tin không được xóa khỏi thư viện.

## Mã và migration

`202611020013_message_media.sql` thêm audio/duration, bảng liên kết tin-media có thứ tự và RLS/grant runtime. Bỏ ràng buộc DB bắt text phải dài ít nhất 1; API thay bằng kiểm tra text hoặc media. Migration được chạy hai lần trong database local tạm để kiểm tính áp dụng lại; chưa áp dụng cloud.

API dùng `conversation_access.py`, `media.py`, `social.py`, `schemas.py`; UI `ChatScreen.tsx`, `ChatRecording.tsx`, `useChatMessages.ts` và media viewer dùng chung. Schema/API client đã tái sinh 143 path.

Quyền micro là thay đổi mới của F16: camera/image picker/audio plugin dùng cùng thông báo tiếng Việt. Image picker với `microphonePermission:false` chặn quyền Android trên toàn app, nên đã bỏ cấu hình chặn đó. Camera vẫn chụp ảnh, chỉ màn ghi âm chat gọi xin quyền micro. [Tài liệu Expo Audio SDK58](https://docs.expo.dev/versions/v58.0.0/sdk/audio/) và mã plugin cục bộ được dùng để kiểm cách cấu hình.

## Bằng chứng đã hoàn tất

| Artifact | Phạm vi chứng minh |
|---|---|
| `chat-api.log` | 43 API đạt trong 182,64 giây: chat mới cùng API cơ bản và composer. |
| `chat-api-full.log` | 108 API đạt, 2 bài mobile opt-in bỏ chọn, trong 425,89 giây; gồm concurrency/idempotency/ownership, block và binary ACL, lịch sử/incremental, audio WAV và M4A/AAC, WebM/Opus encode/decode thực, metadata, rỗng/hỏng/quá hạn. |
| `chat-unit.log` | 64 UI test/11 suite đạt trong 43,804 giây; thêm emoji, retry upload, thu hồi quyền, đổi tài khoản và 4 kiểm tra recorder: xin quyền đúng thao tác, unmount, navigation blur và về nền trong lúc chuẩn bị ghi. Gồm hồi quy scan/composer dùng camera chung sau thêm mode message. |
| `chat-browser.log`, `chat-runtime/` | 2/2 browser đạt và SQL độc lập trong 105,47 giây sau camera/guard focus. Hai phiên tài khoản đồng thời, emoji, mở/hủy camera, ảnh/tệp, so byte tệp tải xuống, ghi âm bằng Chrome MediaRecorder với micro giả lập, phát lại ở tài khoản nhận, trả lời tự động, reload và mở đúng trang cá nhân người nhận. SQL xác nhận 5 tin, 3 asset/link, 0 chunk/post-media/điểm. |
| `chat-native-config.log` | Introspection đạt: camera/photos và micro cho chat có quyền; không ghi/phát nền. Chưa thay thế thử trên thiết bị thật. |
| `chat-browser-full.log`, `chat-full-runtime/` | 22/22 browser và SQL độc lập đạt trong 766,75 giây. 68 route, 66 lượt bố cục, 0 tràn ngang; bao gồm baseline polling sau refactor. Lượt này trước nút mở trang cá nhân/camera/guard lifecycle cuối; scope chat trong dòng trên đã kiểm lại các phần đó. |
| `chat-native-integration.log`, `chat-native-runtime/` | Android BlueStepsQA32/emulator-5556 qua API/SQL đạt trong 275,09 giây: đọc tin Bob, gửi emoji, camera chat → ảnh upload/preview/gửi, ghi âm → audio upload/preview/gửi, force-stop/mở lại và tải được ảnh/bản ghi. SQL xác nhận 4 tin, 2 asset/link, 0 chunk/post; audio có thời lượng thực >0 và <=120 giây, size bằng octet_length(content), ledger vẫn 2 bản ghi setup. |
| `chat-native-runtime/44-chat-camera-preview.*`, `44-chat-recording-preview.*`, `45-chat-restored.*`, `chat-result.json` | Ảnh/XML tương ứng, thời điểm kết thúc/serial QA. Camera emulated tạo khung đen có timestamp, bản ghi emulator khoảng 46 giây được giải mã thành WAV và tải lại; chưa chứng minh thu giọng nói/nghe loa thật. Nút phát native đã tải xong và enabled; phát/tăng thời gian được kiểm trên browser. |
| `chat-api-static.log`, `chat-typecheck.log`, `chat-lint.log`, `chat-format.log`, `chat-source-audit.log` | Ruff/format đạt 54 file Python, mypy đạt 33 module; TypeScript/ESLint/Prettier đạt; 162 file runtime không có fixture adapter, danh tính seed hoặc credential database. |
| `chat-native-export.log`, `chat-build-normal.log` | Export Android 5,2 MB/iOS 4,8 MB, metadata 37 KB và build web bình thường kết thúc mã 0 sau cập nhật nội dung quyền camera/photos. Đã đọc dist, không còn API URL emulator8093 hoặc localhost cổng tạm của harness. Chưa deploy. |

## Phần theo phạm vi cũ (không còn áp dụng cho ghi âm)

1. Nghiệm thu iOS/thiết bị thật, picker nhiều ảnh/video/tệp của hệ điều hành, camera trước/đèn/permission-denial, phát/nghe trên loa thật, lỗi quyền/mất mạng và đối chiếu mọi frame gốc. Micro giả lập browser/emulator không chứng minh thu giọng nói thật.
2. Hoàn tất đối chiếu trình bày/font/avatar và các biến thể Figma. Không thay thế bằng dữ liệu mẫu hoặc kết quả giả để giống ảnh thiết kế.
3. Chính sách retention/dung lượng, cấu hình triển khai và migration cloud vẫn mở; không tự chọn dịch vụ ngoài hoặc chạy fixture cloud.

## Các lỗi QA đã xử lý

Hộp quyền hệ thống của Google APIs AVD thuộc `com.google.android.permissioncontroller`; Expo Go còn hỏi riêng quyền audio cho project BlueSteps. Đã đọc XML/ảnh xác nhận, chấp nhận đúng nút trên AVD QA và hỗ trợ hai tầng trong helper. `permission-project.*` lưu hộp hỏi project trước khi xử lý.

UIAutomator đôi khi trả null root hoặc không đạt idle khi timer ghi âm đổi liên tục. Helper xóa file dump cũ, chờ hierarchy mới và chỉ tap mục visible/enabled đã quan sát. Nút dừng dùng chính hierarchy ghi âm vừa đọc thay vì yêu cầu dump lần hai. `expectText` cũng lưu hierarchy đã xác nhận thay vì đọc lại có thể rỗng. Không bỏ kiểm SQL: lượt đạt vẫn phải giải mã audio thực, có duration/byte và các liên kết như bảng trên.

Không dùng credential cloud hoặc database cloud trong kiểm thử.
