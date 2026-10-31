# Báo cáo tiến độ UI BlueSteps — 31/10/2026

**Cập nhật cuối:** đã có mã UI cho 211/211 frame backuped. Xem [bàn giao mã nguồn](ui-backuped-complete-2026-10-31.md) và [audit cuối](figma-fidelity/ui-code-completion-audit.json). Các mốc dưới đây là lịch sử trước khi hoàn tất phạm vi sinh code.

## Tiếp tục nhóm Hoạt động — chỉ dùng trang backuped

Phạm vi người dùng chốt: tiếp tục **app Android/iOS**, nguồn thiết kế chỉ trong **backuped (`386:7053`)**, file `7GCLABwia0mauoszRi0Vtt`. Figma đã truy cập lại được. Lượt này chỉ đọc nguồn Figma, không sửa thiết kế hoặc làm web.

Đã nối thêm **11 frame** vào React Native: tám biến thể chi tiết của Giờ học xanh, biển, lớp phân loại và làm vườn; danh sách hoạt động yêu thích; hai thông báo lưu/xóa. Chi tiết có ảnh hero/thumbnail gốc, mở ảnh, Quan tâm độc lập với yêu thích, giới thiệu, hoạt động liên quan và điều hướng đăng ký/vé/lịch/tổng kết. Danh sách đã lưu giữ tìm kiếm không dấu, xác nhận/hủy xóa và lối vào bộ sưu tập/nhắc lịch. Bỏ lưu dọn bộ sưu tập và nhắc lịch, giữ đăng ký/vé và Quan tâm. State vẫn chỉ trong phiên demo.

Đã sửa các vấn đề trên Android: nút Đóng thông báo có vùng chạm rõ ràng; đổi preview sang danh sách thường khởi tạo lại state riêng, tránh modal cũ che màn mới; text lớn cho thống kê/thẻ liên quan chạy theo flow. Đã xuất **Plus 24 px gốc** của instance `534:49905` thay icon tạm; [nguồn icon](figma-fidelity/event-detail-icon-source.json). Chênh chiều cao bộ sưu tập lịch sử 9 px chưa được nghiệm thu lại, vẫn mở.

Android bỏ qua một số SVG filter, nên giữ vector gốc và tạo **61 PNG trong suốt ở 3×** từ chính vector cho blur/shadow. [Manifest derivative](figma-fidelity/event-detail-native-derivatives.json) ghi renderer và SHA-256 nguồn/kết quả. [Audit asset](figma-fidelity/event-detail-asset-audit.json) đạt cho tám biến thể, ba frame lưu/xóa và **402 file**; chỉ chứng minh source/asset/metadata, không chứng minh fidelity toàn frame. Đã lưu lại ảnh tham chiếu Figma 11 frame.

**Kiểm kê live đã thay đổi:** backuped hiện có **211 frame**, thêm 43 và bỏ 7 so với 175 frame ngày 30/10. Sáu frame bản đồ cũ trong danh sách việc tiếp theo đã bị bỏ khỏi trang, không dựng theo ID đó. Có **105/211 mapping source**, còn **106 frame chưa ánh xạ**; cùng bộ 105 mapping này tương đương 105/175 ở baseline lịch sử. [Kiểm kê live](ui-progress-evidence-2026-10-31/figma-live-inventory-1031.json), [đối chiếu thêm/bỏ](ui-progress-evidence-2026-10-31/figma-inventory-delta.json), [coverage hiện tại](figma-fidelity/coverage.json). Đây là độ phủ source, không phải tỷ lệ hoàn thiện hoặc độ giống thiết kế.

**Kiểm chứng:** toàn app đạt **67/67 test, 19 suite**, lint 0 lỗi/3 cảnh báo E2E cũ, format đạt. QA Android hoàn tất lúc **10:55 UTC+7: 7/7 nhóm đạt**, **22 PNG + 22 cây UI**, log ReactNativeJS/AndroidRuntime sạch. [Báo cáo QA](ui-progress-evidence-2026-10-31/native-events/qa-report.json), [log lượt đạt](ui-progress-evidence-2026-10-31/event-detail-android-complete.log), [tổng hợp và mapping capture](ui-progress-evidence-2026-10-31/event-detail-native-validation.json). Một lần timeout System UI khi boot được ghi riêng; hai lần UIAutomator chưa đọc root được thử lại. Lượt trước bị ngắt khi người dùng tạm dừng và các log thất bại vẫn giữ để truy vết.

Xem ảnh cuối phát hiện U+2028 của Figma thành ô sọc trên Android và thumbnail làm vườn thiếu opacity 50%. Đã đổi dấu phân dòng sang `\n` native và giữ opacity từ JSX gốc. Sau sửa chữ: **9/9 test của nhóm bị ảnh hưởng**, TypeScript đạt; kiểm riêng Android **2/2 nhóm ở font 100%/130%, 4 capture**, không lỗi runtime. [Báo cáo kiểm chữ](ui-progress-evidence-2026-10-31/native-event-copy/qa-report.json), [ảnh trước](ui-progress-evidence-2026-10-31/native-events/qa-event-before-linebreak-fix.png), [ảnh sau font 130%](ui-progress-evidence-2026-10-31/native-event-copy/qa-event-copy-font130.png). Đã xem lại hai trạng thái làm vườn sau sửa opacity. Bundle Android/iOS và native config được kiểm lại; JS/Hermes chưa phải APK/IPA. Xem [QA Android Hoạt động](android-ui-qa.md). Chưa nghiệm thu full-frame, iOS hoặc thiết bị thật.

Bốn frame Tin tức mới `680:5343`, `680:5406`, `680:5461`, `695:5419` đều thuộc backuped, đã lấy context/geometry/ảnh tham chiếu nhưng **chưa triển khai**, không cộng mapping. Tiếp theo: bốn frame Tin tức bổ sung; chênh chiều cao bộ sưu tập; các nhóm điểm/quà, cộng đồng, thông báo, chat/bot, game và thống kê còn lại trên cùng trang. Mục tiêu vẫn đang thực hiện. Các cập nhật bên dưới là lịch sử trước lượt này.

## Lượt QA Android native tiếp theo

Đã dựng máy ảo QA riêng từ ảnh Android có sẵn và mở app bằng **Expo Go SDK 58 trên Android 12/API 32**, màn 1080 × 2340, density 480 (360 dp). Đây là lượt kiểm app chạy thật trên emulator; các giới hạn “chưa có AVD/capture native” ở mốc 08:50 bên dưới là lịch sử trước khi chuẩn bị máy ảo này.

Các lỗi đã tìm và sửa trong `NewsArticleScreen.tsx`:

- **Nhãn dưới ảnh vật liệu bị trống trên Android**: sửa chiều ngang của container để chữ có vùng layout khi nằm trong nhãn màu xanh.
- **Nút mở rộng là Text lồng nhau**: chuyển đoạn mở đầu thành vùng chạm native có role, nhãn và trạng thái mở rộng; giữ cách trình bày chữ xem thêm/thu gọn. Nút đã xuất hiện trong cây accessibility Android và thao tác được trực tiếp.
- **Chữ lớn 130% đè lên ảnh và tiêu đề chồng danh sách**: cho các phần media tự chảy theo nội dung khi người dùng tăng cỡ chữ; ảnh vật liệu thành hai cột, phần hậu quả tách tiêu đề/chữ/ảnh. Vẫn dùng asset gốc, giữ bố cục đo sẵn ở cỡ chữ tiêu chuẩn.

Đã kiểm bằng ảnh native trước/sau và cây UI: mở rộng/thu gọn; lưu/thích; mở thảo luận đúng bài và quay lại giữ vị trí cuộn cùng trạng thái lưu/thích; nhập và tạo bộ sưu tập khi bàn phím Android đang mở. Các icon SVG ban đầu tải chậm nhưng hiện đầy đủ khi tải xong; không thay asset hoặc giữ sửa đổi thử về thứ tự vẽ.

Đã thêm [quy trình QA Android](android-ui-qa.md) và lệnh `pnpm --filter @bluesteps/mobile test:android`. Lượt cuối hoàn tất lúc **09:34 UTC+7**: **6/6 nhóm kiểm tra đạt**, lưu **18 ảnh PNG và 18 cây UI XML**, gồm màn khám phá và chín trạng thái bài đọc đã nối ở mốc 08:50. Xem [báo cáo chạy native](ui-progress-evidence-2026-10-31/native/qa-report.json), [log đạt cuối](ui-progress-evidence-2026-10-31/android-ui-smoke-passed.log), [ảnh trước khi sửa chữ lớn](ui-progress-evidence-2026-10-31/native/article-font130-body.png) và [ảnh sau sửa](ui-progress-evidence-2026-10-31/native/qa-article-font130-body.png). Không ghi nhận lỗi ReactNativeJS/AndroidRuntime trong [log runtime của lượt đạt](ui-progress-evidence-2026-10-31/native/qa-runtime.log). Không suy ra nghiệm thu toàn app hoặc full-frame fidelity từ các bước smoke.

Các lượt đầu của runner đã sửa kỳ vọng tên bài trên thẻ thảo luận, việc giữ vị trí cuộn khi quay lại và cách parse thuộc tính XML dùng nháy đơn khi tiêu đề chứa dấu ngoặc kép. Đây là lỗi kỳ vọng/parser của công cụ QA, không phải lý do đổi hành vi app. Log đạt cuối có một lần UIAutomator chưa đọc được root trong lúc Expo khởi động; runner đã thử lại bằng dump mới và sau đó kiểm đủ sáu nhóm thành công. Các log thất bại trước được giữ để truy vết.

TypeScript, định dạng toàn app và **58/58 unit/component test, 18 suite** đã đạt sau sửa. Lint 0 lỗi, còn ba cảnh báo cũ ở E2E. [Bundle Android/iOS mới](ui-progress-evidence-2026-10-31/android-ui-native-bundle.log) đạt cả hai nền tảng; vẫn là JS/Hermes, chưa phải APK/IPA. Mapping giữ **94/175**. Nghiệm thu Figma toàn frame, iOS/điện thoại thật, quyền camera/picker và các nhóm UI còn thiếu vẫn mở; mục tiêu toàn bộ UI đang thực hiện.

## Cập nhật triển khai lúc 08:50 — trước QA Android

Phạm vi thực hiện theo yêu cầu mới: **app React Native trên Android/iOS**. Đã tiếp tục hai phần có đủ context, ảnh tham chiếu và asset trong repo:

- **Khám phá Hoạt động `534:49034`**: dựng lại bố cục, font, icon và hai ảnh thẻ gốc; tìm tên/địa điểm không dấu, lọc khu vực/tuần/chủ đề, xóa bộ lọc, lưu/bỏ lưu và mở lịch/chi tiết. “Tuần này” là tuần mẫu **19–25/10/2026**, được ghi rõ ở màn thường. Preview dùng hai hoạt động và danh sách lưu riêng.
- **Chín biến thể chi tiết Tin tức**: đã nối `news-detail-design-data.ts` và `news-detail-assets.ts` vào màn chạy. Tám bài mở đúng bố cục/ảnh tương ứng; `daily-waste` có hai frame thu gọn/mở rộng. Nội dung dài cuộn được; phần chữ chạy theo flow native, cụm ảnh giữ hình học đã lưu. Lưu/thích giữ trong provider khi đổi trạng thái, thảo luận gắn đúng ID bài; preview cách ly và giữ tham số khi quay về từ thảo luận. Năm frame chỉ có vùng bấm prototype dùng nút quay lại chung để app có điều hướng nhìn thấy được.
- **Chất lượng mã**: sửa định dạng 14 file còn tồn tại ở mốc 08:07; thêm `pnpm check:app` để kiểm TypeScript/lint/format/unit, bundle Android/iOS và cấu hình native. Lượt tiếp tục này không chạy export hoặc E2E web.

**Trạng thái hiện tại: 26 mục xong UI demo / 12 mục đang làm / 5 mục chưa làm**, giữ cùng cách đếm có giao nhau của báo cáo sáng. Mục chi tiết bài đọc đã chuyển sang xong UI demo; nhóm Hoạt động vẫn đang làm. Đây chưa phải nghiệm thu hình ảnh hoặc thiết bị.

Độ phủ mapping source hiện là **94/175 frame (53,7%)**, còn **81** frame. Trong đó **84 mapping cũ có ảnh render kế thừa**, **10 mapping mới chưa có capture native**. Tin tức tăng từ 9 lên **18/18 mapping**; nhóm Hoạt động & tham gia tăng từ 4 lên **5/13 mapping**. Không dùng tỷ lệ mapping để suy ra phần trăm hoàn thành hoặc độ giống thiết kế.

| Kiểm chứng app của lượt tiếp tục | Kết quả |
|---|---|
| TypeScript | Đạt |
| ESLint | 0 lỗi; còn 3 cảnh báo cũ trong `e2e/events.spec.ts` |
| Prettier toàn app | Đạt |
| Unit/component React Native | **58/58 test, 18 suite đạt**; gồm 13 test mới của bài đọc và luồng thảo luận |
| Bundle Android/iOS và cấu hình native | **Đạt cả hai nền tảng**, camera/ảnh bật, microphone loại khỏi cấu hình; [log kiểm chứng cuối](ui-progress-evidence-2026-10-31/native-ui-check-app-final.log), [tổng hợp](ui-progress-evidence-2026-10-31/native-ui-validation.json) |
| Audit asset/source cục bộ | Đạt: [audit](figma-fidelity/native-ui-asset-audit.json), gồm đối chiếu chín bộ dữ liệu với nguồn bố cục và đường dẫn asset không rỗng |
| QA hình ảnh native | Chưa thực hiện; không có thiết bị Android kết nối hoặc AVD được cấu hình |

Figma hiện từ chối `create_session` và `get_design_context` do quyền truy cập file; lượt này dùng nguồn thiết kế đã lưu, không coi đó là xác minh lại thiết kế live. Audit cục bộ chỉ chứng minh file/dữ liệu/source wiring, chưa xác nhận geometry sau render. Bundle JS/Hermes không phải APK/IPA. Chưa commit thay đổi.

Việc tiếp theo: 11 frame còn thiếu của Hoạt động/đã lưu, icon Plus và chiều cao bộ sưu tập; sáu frame thu gom/hành trình; 16 frame điểm/quà; sau đó các nhóm cộng đồng/thông báo/chat/bot/game/thống kê. Các mục cần nguồn thiết kế mới và nghiệm thu thiết bị vẫn mở. Mục tiêu toàn bộ UI tiếp tục ở trạng thái đang thực hiện.

**Các bảng và bằng chứng từ mục kế tiếp là bản rà soát lịch sử lúc 08:07**, được giữ để truy vết. Những câu “chi tiết chưa nối”, 84/175 và 14 file lỗi định dạng ở phần lịch sử đã được thay thế bởi cập nhật ở trên.

## Kết quả rà soát lúc 08:07 — trước lượt tiếp tục app

Rà soát code local ngày **31/10/2026, UTC+7**, hoàn tất kiểm thử lúc **08:07**, trên nhánh `codex/initial-upload`, HEAD `8fce4f02a7bf86aaffd368379f31ae5208d3596c`, gồm các thay đổi chưa commit. Lượt này kiểm tra và cập nhật tài liệu tiến độ; không triển khai thêm chức năng sản phẩm. Chưa kiểm tra lại remote Git hoặc đọc lại toàn page Figma.

| Trạng thái triển khai | Số mục | Phạm vi |
|---|---:|---|
| **Xong UI demo** | **25** | Home, onboarding, tài khoản, hồ sơ/cài đặt, sổ tay, quét mẫu, form đề xuất/báo cáo điểm thu gom; đăng ký/vé/lịch/tổng kết/nhắc lịch hoạt động; trang chính và sáu màn con Tin tức |
| **Đang làm** | **13** | Thu gom/hành trình; khám phá/chi tiết/lưu/bộ sưu tập hoạt động; điểm/quà; cộng đồng, thông báo, chat, bot chữ; chi tiết bài đọc; game và thống kê |
| **Chưa làm UI** | **5** | Thưởng ngày/nhắc thưởng; hướng dẫn quy đổi; xác nhận/kết quả đổi quà; ảnh/quyền riêng tư/trạng thái đăng bài; RecycleBot giọng nói |

**Tiến độ triển khai giữ nguyên so với mốc 23:17 ngày 30/10.** Các mục giao nhau về phạm vi, nên không cộng số mục để suy ra phần trăm hoàn thành sản phẩm. “Xong UI demo” chỉ nói đến màn và tương tác mẫu, còn nghiệm thu hình ảnh, thiết bị và backend được theo dõi riêng.

Độ phủ ánh xạ xác minh từ code hiện tại là **84/175 frame (48%)**, còn **91 frame chưa ánh xạ riêng**. Có **63 file route** ngoài `_layout`; cả 84 mapping đều có source, route tương ứng và ảnh render 428 px đã lưu. Không có ID mapping trùng hoặc ngoài inventory. `coverage.json` khớp danh sách target hiện tại. **48% là độ phủ mapping, không phải mức hoàn thiện hoặc độ giống Figma.**

Nguồn kiểm kê là [inventory ngày 30/10](ui-progress-evidence-2026-10-30/figma-live-inventory.json). [Audit code ngày 31/10](ui-progress-evidence-2026-10-31/frame-audit.json) kiểm lại sự tồn tại của file và route, không xác nhận hành vi hay hình ảnh chỉ bằng đếm file. Có 89 frame có context và 91 frame có ảnh tham chiếu trong inventory đã lưu.

## Chức năng đã làm, đang làm và chưa làm

Phân loại theo phạm vi frontend demo đã kiểm chứng lúc 08:07 ngày 31/10. “Đã làm” là hoàn thành UI và tương tác cục bộ; chưa bao gồm backend thật hoặc nghiệm thu đầy đủ hình ảnh/thiết bị. Lần cập nhật danh sách này không thay đổi trạng thái triển khai sản phẩm.

### Đã làm — 25 mục UI demo

1. **Trang chủ**: bố cục Home, lối tắt và điều hướng chính.
2. **Onboarding và cá nhân hóa ban đầu**: giới thiệu, chọn sở thích, mục tiêu và thiết lập ban đầu.
3. **Đăng nhập và đăng ký tài khoản**: form và kiểm tra dữ liệu nhập.
4. **Khôi phục mật khẩu**: email, OTP sáu số và đặt mật khẩu mới ở mức demo.
5. **Hoàn tất tài khoản Google/Facebook**: thông tin nhà cung cấp, tên và xác nhận mẫu.
6. **Đổi mật khẩu**: form, hiện/ẩn mật khẩu và phản hồi mẫu.
7. **Hồ sơ cá nhân và chỉnh sửa hồ sơ**: tổng quan, lối tắt và form chỉnh sửa.
8. **Thành tích**: màn huy hiệu và dữ liệu trình diễn.
9. **Cài đặt và các bảng tùy chọn**: tìm kiếm, âm thanh/rung, overlay, lịch sử đăng nhập và PIN mẫu.
10. **Tra cứu sổ tay và danh mục rác**: trang đầu, tìm kiếm, danh mục và overlay.
11. **Hướng dẫn vật liệu và bảng phân loại**: bảy hướng dẫn và bốn bảng phân loại.
12. **Quét rác — camera/chọn ảnh và các trạng thái demo**: xin quyền, chụp/chọn ảnh, nhập tay, tải, lỗi và kết quả mẫu.
13. **Đề xuất điểm thu gom và báo cáo vấn đề**: form, chọn ảnh cục bộ, kiểm tra trường và lưu nháp trong phiên.
14. **Đăng ký tham gia hoạt động**: số người, vai trò, liên hệ, đồng ý và kiểm tra dữ liệu.
15. **Vé tham gia và check-in hoạt động**: vé mẫu, lưu ảnh PNG và check-in cục bộ.
16. **Lịch hoạt động**: tháng/tuần, chọn ngày, lọc và cảnh báo trùng giờ mẫu.
17. **Tổng kết sau hoạt động**: kết quả mẫu, đánh giá và phản hồi trong phiên.
18. **Cấu hình nhắc lịch hoạt động đã lưu**: kênh, thời điểm, âm thanh/rung và giờ yên lặng; chưa gửi nhắc thật.
19. **Tin tức — trang chính và các danh sách**: trang chính, Tin mới nhất và Sự kiện sắp tới.
20. **Tin tức — tìm kiếm và lọc**: từ khóa, chủ đề, sắp xếp và phân trang.
21. **Tin tức — bài viết đã lưu**: danh sách, tìm/lọc/sắp xếp và xác nhận bỏ lưu.
22. **Tin tức — thảo luận bài viết**: soạn bình luận, trả lời, thích và xóa có xác nhận.
23. **Tin tức — khám phá chủ đề**: danh sách chủ đề, mở feed và theo dõi trong phiên.
24. **Tin tức — lịch sự kiện xanh**: đổi tháng/năm, chọn ngày, lọc và mở tin liên quan.
25. **Tin tức — bản tin nhanh**: chọn ngày, tóm tắt và đánh dấu đã đọc trong màn.

### Đang làm — 13 mục

1. **Tìm và xem điểm thu gom**: đã có tìm/lọc, bản đồ mẫu, so sánh và chi tiết; còn ba frame/biến thể.
2. **Lập hành trình và bàn giao**: đã có quản lý điểm, tuyến/chặng và bàn giao mẫu; còn ba frame/biến thể.
3. **Khám phá và xem chi tiết hoạt động**: đã có danh sách, tìm/lọc, chi tiết và điều hướng; còn ảnh, bố cục và biến thể theo thiết kế.
4. **Hoạt động đã lưu**: đã có lưu/bỏ lưu, tìm kiếm và xác nhận xóa; còn đối chiếu các biến thể theo Figma.
5. **Quản lý bộ sưu tập hoạt động yêu thích**: đã có tạo/đổi tên/chuyển/bỏ/xóa; còn chốt icon Plus và chiều cao lệch 9 px.
6. **Ví điểm, danh mục/chi tiết quà và lịch sử**: đã có dữ liệu và tương tác mẫu; còn bố cục, biến thể và các luồng thưởng/đổi quà.
7. **Cộng đồng và soạn bài**: đã có feed, thích và bài viết chữ cục bộ; còn ảnh, quyền riêng tư, trạng thái đăng bài và bình luận đầy đủ.
8. **Thông báo**: đã có inbox và trạng thái đọc; còn các loại/tab/biến thể theo thiết kế.
9. **Tin nhắn cá nhân**: đã có hội thoại và gửi chữ trong phiên; còn bố cục/trạng thái chat theo thiết kế.
10. **RecycleBot — hội thoại chữ**: đã có câu trả lời cố định; còn các biến thể màn và trạng thái phản hồi.
11. **Tin tức — chi tiết bài đọc**: đã có màn chung, lưu/thích/thảo luận; còn chín biến thể. Dữ liệu/asset đã chuẩn bị nhưng chưa nối vào màn chạy.
12. **Trò chơi phân loại**: đã có bài luyện ba câu và chơi lại; còn các màn/luồng theo thiết kế.
13. **Thống kê cá nhân**: đã có tổng quan và số liệu tuần mẫu; còn UI biểu diễn theo frame thiết kế.

### Chưa làm — 5 mục UI

1. **Nhận thưởng ngày và nhắc thưởng**: các màn nhận thưởng, sau nhận thưởng và đặt nhắc.
2. **Hướng dẫn quy đổi điểm**: màn hướng dẫn quy đổi riêng.
3. **Xác nhận và kết quả đổi quà theo thiết kế**: các bước xác nhận và kết quả sau đổi quà.
4. **Đính kèm ảnh, chọn quyền riêng tư và trạng thái tải khi đăng bài**: các bước còn thiếu trong luồng soạn bài.
5. **RecycleBot — giọng nói**: các màn/trạng thái ghi âm, nghe và xử lý giọng nói.

Các mục “chưa làm” là phần con của một số nhóm “đang làm”. Không cộng 25 + 13 + 5 thành số tính năng độc lập hoặc dùng để tính phần trăm hoàn thành sản phẩm.

## Tiến độ UI theo nhóm chức năng

Các nhóm dưới đây theo catalog thiết kế, khác với 43 dòng chức năng chi tiết trong bảng thống kê 25/13/5. Trạng thái “xong UI demo” ghi nhận màn và tương tác cục bộ; các nhóm vẫn cần nghiệm thu hình ảnh và thiết bị. Cột frame ghi số đã ánh xạ/tổng frame của nhóm, không phải phần trăm hoàn thành.

| Nhóm chức năng UI | Trạng thái nhóm | Phần UI đã có | Phần UI còn thiếu/chưa chốt | Frame ánh xạ |
|---|---|---|---|---:|
| Trang chủ & điều hướng chung | **Một phần** | Home theo thiết kế, năm tab, lối tắt và điều hướng đến màn chi tiết | Một frame điều hướng rời chưa ánh xạ; Home đã xong trong phạm vi demo | **1/2** |
| Onboarding & cá nhân hóa | **Xong UI demo** | Giới thiệu, chọn sở thích, mục tiêu và các bước thiết lập ban đầu | Nghiệm thu hình ảnh/thiết bị | **10/10** |
| Tài khoản & xác thực | **Xong UI demo** | Đăng nhập, đăng ký, email/OTP/mật khẩu mới, hoàn tất thông tin Google/Facebook | Nghiệm thu UI; xác thực thật thuộc phần tích hợp backend | **6/6** |
| Hồ sơ cá nhân | **Xong UI demo** | Tổng quan, lối tắt, chỉnh sửa thông tin và kiểm tra dữ liệu form | Nghiệm thu hình ảnh/thiết bị | **2/2** |
| Cài đặt & bảo mật | **Xong UI demo** | Cài đặt/tìm kiếm, âm thanh/rung, overlay, PIN/lịch sử đăng nhập mẫu, đổi mật khẩu | Nghiệm thu UI; bảo mật tài khoản thật chưa tích hợp | **6/6** |
| Sổ tay & kiến thức rác | **Xong UI demo** | Trang đầu, tìm kiếm, ba danh mục/overlay, bảy hướng dẫn vật liệu và bốn bảng phân loại | Chốt typography, emoji và độ khớp toàn frame | **21/21** |
| Quét rác & kết quả mẫu | **Xong UI demo** | Xin quyền camera, chụp/chọn ảnh, nhập tay và các trạng thái mẫu: tải, lỗi, kết quả, chi tiết, xác nhận, sổ tay | QA quyền/chụp/chọn ảnh trên điện thoại; nhận diện và điểm thật chưa tích hợp | **9/9** |
| Điểm thu gom | **Đang làm** | Bản đồ mẫu, khám phá, tìm/lọc, so sánh, chi tiết; form đề xuất và báo cáo đã xong UI demo | Ba frame/biến thể còn lại; hoàn thiện bố cục và trạng thái theo thiết kế | **7/10** |
| Hành trình & bàn giao | **Đang làm** | Thêm/bỏ/đổi thứ tự điểm, chọn tuyến/chặng, chỉ đường mẫu, thay điểm và hướng dẫn bàn giao | Ba frame/biến thể còn lại và đối chiếu đầy đủ UI | **6/9** |
| Hoạt động & tham gia | **Đang làm** | Khám phá/chi tiết mẫu; đăng ký, vé/check-in, lịch tháng/tuần và tổng kết/phản hồi đã xong UI demo | Chín frame còn lại, ảnh/bố cục/navigation và biến thể khám phá/chi tiết | **4/13** |
| Hoạt động đã lưu & nhắc lịch | **Đang làm** | Lưu/bỏ lưu, tìm kiếm/xác nhận xóa; bộ sưu tập tạo/đổi tên/chuyển/xóa; cấu hình nhắc lịch đã xong UI demo | Ba frame đã lưu/xóa chưa ánh xạ; chốt icon Plus và chênh 9 px chiều cao bộ sưu tập | **2/5** |
| Điểm, đổi quà & thành tích | **Đang làm; có phần chưa làm** | Thành tích đã xong UI demo; ví, danh mục/chi tiết quà, lọc và lịch sử có bản mẫu | 16 frame chưa ánh xạ; chưa có UI thưởng ngày/nhắc thưởng, hướng dẫn quy đổi và xác nhận/kết quả đổi quà | **1/17** |
| Cộng đồng & tạo bài | **Đang làm; có phần chưa làm** | Feed, thích/bỏ thích, soạn bài chữ cục bộ và bình luận mẫu | 12 frame chưa ánh xạ; thiếu đính kèm ảnh, quyền riêng tư, trạng thái đăng bài và tương tác bình luận đầy đủ | **0/12** |
| Thông báo | **Đang làm** | Inbox mẫu, đã đọc/chưa đọc, đánh dấu và mở nội dung | Bảy frame loại/tab/trạng thái thông báo theo thiết kế | **0/7** |
| Tin nhắn cá nhân | **Đang làm** | Danh sách hội thoại, xem/gửi tin nhắn chữ trong phiên | Bốn frame bố cục/trạng thái chat theo thiết kế | **0/4** |
| RecycleBot & giọng nói | **Đang làm; giọng nói chưa làm** | Chat chữ với câu trả lời cố định, có nhãn demo | 11 frame chưa ánh xạ; thiếu UI phản hồi đầy đủ và ghi âm/nghe/xử lý giọng nói | **0/11** |
| Tin tức | **Đang làm; chín màn đã xong demo** | Trang chính, Tin mới nhất, Sự kiện sắp tới; tìm kiếm/lọc, bài lưu, thảo luận, chủ đề, lịch xanh và bản tin | Chín frame chi tiết chưa triển khai riêng; dữ liệu/asset đã chuẩn bị nhưng chưa nối vào màn chạy | **9/18** |
| Trò chơi phân loại | **Đang làm** | Bài luyện ba câu, phản hồi đáp án và chơi lại | 10 frame/màn/luồng trò chơi theo thiết kế | **0/10** |
| Thống kê cá nhân | **Đang làm** | Tổng quan và số liệu tuần giả lập | Một frame biểu diễn thống kê theo thiết kế và nghiệm thu UI | **0/1** |
| Tư liệu/khung phụ | **Chờ phân loại** | Có trong inventory thiết kế | Xác định hai frame có thuộc UI sản phẩm hay chỉ là tư liệu | **0/2** |
| **Tổng độ phủ** | **UI toàn bộ chưa hoàn tất** | | | **84/175** |

Không có ánh xạ Figma riêng vẫn có thể đã có màn demo chức năng, như Cộng đồng, Thông báo hoặc Chat. Ngược lại, ánh xạ đủ frame chưa đồng nghĩa được nghiệm thu khớp toàn bộ hình ảnh. Mười trạng thái của luồng quét được đếm ở hai nhóm: chín frame Camera và một frame Sổ tay.

## Phần mới xác minh được

- **24/24 hash** trong bộ bằng chứng Tin tức lúc 23:17 ngày 30/10 vẫn khớp, gồm source màn, fixture, test, target, font và icon liên quan. Đây là kiểm tra đúng 24 file được lưu hash, không bao hàm toàn bộ worktree.
- **Chín frame chi tiết bài đọc đã có dữ liệu chuẩn bị**, gồm context, ảnh/asset, hình học và bố cục chữ. Đã có [dữ liệu bố cục](../apps/mobile/src/features/content/news-detail-design-data.ts), [asset module](../apps/mobile/src/design-system/news-detail-assets.ts), [script chuẩn bị](../apps/mobile/scripts/prepare-news-detail-design.cjs) và [nguồn bố cục](figma-fidelity/news-detail-layout-source.json).
- **Hai module dữ liệu/asset chi tiết chưa được app import.** [ArticleDetailScreen](../apps/mobile/src/features/content/NewsScreens.tsx) vẫn dùng bố cục chung; chín frame này chưa có target fidelity riêng. Vì vậy, phần chuẩn bị được ghi nhận nhưng chưa nâng số mục xong hoặc số frame ánh xạ. Có tám bài tương ứng, riêng `daily-waste` có hai biến thể thu gọn/mở rộng.
- **Kiểm tra định dạng toàn app còn 14 file chưa đạt**, bổ sung vào phần việc còn lại. Báo cáo ngày 30/10 chỉ ghi định dạng đạt trong phạm vi 19 file thay đổi của lượt đó.

Danh sách 43 dòng chức năng được trình bày trong [ba nhóm trạng thái ở trên](#chức-năng-đã-làm-đang-làm-và-chưa-làm); [audit ngày 31/10](ui-progress-evidence-2026-10-31/frame-audit.json) lưu cả danh sách trạng thái để truy vết. Không ghi các file chuẩn bị chưa được nối vào app thành chức năng đã xong.

## Kiểm chứng chạy lại ngày 31/10

| Kiểm tra | Kết quả mới | Bằng chứng |
|---|---|---|
| TypeScript | **Đạt** | [Log](ui-progress-evidence-2026-10-31/typecheck-unrestricted.log) |
| ESLint toàn app | **Đạt: 0 lỗi, 3 cảnh báo** | [Log](ui-progress-evidence-2026-10-31/lint-unrestricted.log); import `node:fs` trùng và `require()` trong `e2e/events.spec.ts` |
| Unit/component | **45/45 đạt, 17 suite** | [Log](ui-progress-evidence-2026-10-31/unit-unrestricted.log); 21,021 giây |
| Export web | **Đạt** | [Log](ui-progress-evidence-2026-10-31/build-unrestricted.log); export mới vào `apps/mobile/dist` |
| Bundle iOS/Android | **Đạt cả hai nền tảng** | [Log](ui-progress-evidence-2026-10-31/native-bundle-unrestricted.log); bundle JS/Hermes, chưa phải APK/IPA hoặc QA điện thoại |
| Cấu hình native | **Đạt** | [Log](ui-progress-evidence-2026-10-31/native-config.log); camera/ảnh bật, microphone loại khỏi cấu hình |
| E2E toàn app | **64/64 đạt, 3,9 phút** | [Log](ui-progress-evidence-2026-10-31/e2e-unrestricted.log); Chrome trên export web mới |
| Prettier toàn app | **Chưa đạt: 14 file** | [Log](ui-progress-evidence-2026-10-31/format-unrestricted.log); danh sách cụ thể bên dưới |
| Audit source/route/mapping | **Đạt** | [JSON](ui-progress-evidence-2026-10-31/frame-audit.json), [log](ui-progress-evidence-2026-10-31/frame-audit.log), [script chạy lại](ui-progress-evidence-2026-10-31/audit-progress.cjs) |

Lượt đầu trong sandbox báo không tìm thấy module/type và lỗi load `glob`. Kiểm tra tiếp xác định một số file thư viện tồn tại nhưng bị từ chối đọc trong sandbox; chạy kiểm chứng ngoài sandbox đã giải quyết các lỗi này. Giữ các log ban đầu trong thư mục bằng chứng. Thử `pnpm install --frozen-lockfile --offline` dừng trước bước cài lại do không có TTY; không cần cài lại dependencies sau khi kiểm tra ngoài sandbox đạt. Không kết luận thư viện hoặc source sản phẩm bị hỏng từ lỗi sandbox.

14 file chưa đạt định dạng gồm chín route `articles/{briefs,calendar,discussion,saved,topics}.tsx`, `event-{collections,reminders,summary,ticket}.tsx`; cùng `ContentScreens.tsx`, `news-detail-design-data.ts`, `HomeScreen.tsx`, `providers.tsx` và `scripts/prepare-news-detail-design.cjs`. Lượt báo cáo này ghi nhận kết quả kiểm tra, chưa sửa các file sản phẩm đó. Vì format còn lỗi nên chưa thể ghi toàn bộ `pnpm check` đạt.

## Bằng chứng hình ảnh và giới hạn nghiệm thu

Bằng chứng dưới đây **được kế thừa từ ngày 30/10**, chưa chụp/audit lại trong lượt báo cáo này:

| Phạm vi | Bằng chứng đã lưu | Trạng thái |
|---|---|---|
| Chín màn Tin tức | [18 capture ở 390/428 px](figma-fidelity/rendered/capture-report-news-.json) | Báo cáo capture ghi 0 lỗi JS/ảnh chưa tải/tràn ngang |
| Ba trang danh sách Tin tức | [Audit 306/306 vị trí asset](figma-fidelity/news-landing-asset-audit.json) | File/MD5/geometry/opacity/fit đạt trong dung sai 0,1 CSS px |
| Sáu màn con Tin tức | [58 vị trí tìm kiếm/lưu](figma-fidelity/news-feed-asset-audit.json), [32 thảo luận/chủ đề](figma-fidelity/news-social-asset-audit.json), [29 lịch/bản tin](figma-fidelity/news-digest-asset-audit.json) | Các audit đã lưu đạt |
| Hoạt động | [Form/tổng kết](figma-fidelity/event-form-asset-audit.json), [vé/lịch](figma-fidelity/ticket-calendar-asset-audit.json), [bộ sưu tập/nhắc lịch](figma-fidelity/saved-event-asset-audit.json) | 31 + 33 + 53 vị trí đã đạt; bộ sưu tập còn chốt glyph Plus và chênh 9 px chiều cao |
| Nghiệm thu toàn frame | [Diff Tin tức](figma-fidelity/diff/report-news-.json), [diff trang danh sách](figma-fidelity/diff/report-news-landing-.json) | Còn khác 0; chưa xác nhận khớp 100% |

Chưa QA đầy đủ các màn mới trên iPhone/Android, đặc biệt safe area, chữ, quyền camera/ảnh, lưu và chia sẻ PNG vé. Xác nhận trước đây rằng app mở được trên cả hai điện thoại không thay thế QA các luồng mới.

## Độ phủ theo nhóm

| Nhóm | Tổng frame | Đã ánh xạ | Còn lại |
|---|---:|---:|---:|
| Onboarding & cá nhân hóa | 10 | 10 | 0 |
| Tài khoản & xác thực | 6 | 6 | 0 |
| Hồ sơ | 2 | 2 | 0 |
| Cài đặt & bảo mật | 6 | 6 | 0 |
| Sổ tay & kiến thức rác | 21 | 21 | 0 |
| Camera & nhận diện | 9 | 9 | 0 |
| Điều hướng dùng chung | 2 | 1 | 1 |
| Điểm thu gom | 10 | 7 | 3 |
| Hành trình & bàn giao | 9 | 6 | 3 |
| Hoạt động & tham gia | 13 | 4 | 9 |
| Hoạt động đã lưu & nhắc lịch | 5 | 2 | 3 |
| Điểm, đổi quà & thành tích | 17 | 1 | 16 |
| Cộng đồng & tạo bài | 12 | 0 | 12 |
| Thông báo | 7 | 0 | 7 |
| Tin nhắn cá nhân | 4 | 0 | 4 |
| RecycleBot & giọng nói | 11 | 0 | 11 |
| Tin tức | 18 | 9 | 9 |
| Trò chơi | 10 | 0 | 10 |
| Thống kê | 1 | 0 | 1 |
| Tư liệu/khung phụ | 2 | 0 | 2 |
| **Tổng** | **175** | **84** | **91** |

Giữ cách nhóm của catalog gốc: frame sổ tay mở từ quét `386:14454` nằm trong Sổ tay, nên luồng quét có 10 mapping nhưng nhóm Camera chỉ đếm 9. Hai khung tư liệu vẫn nằm trong mẫu số 175, chờ quyết định phạm vi sản phẩm.

## Công việc tiếp theo

| Ưu tiên | Công việc | Điều kiện hoàn thành |
|---|---|---|
| 1 | Hoàn tất nhóm Hoạt động | 12 frame chưa ánh xạ trong khám phá/chi tiết/đã lưu; chốt Plus và chiều cao bộ sưu tập; bổ sung capture, audit và kiểm thử tương tác |
| 2 | Nối dữ liệu chi tiết Tin tức vào màn chạy | Dựng đủ chín biến thể từ tài liệu đã chuẩn bị, thu gọn/mở rộng, mở đúng bài, giữ tương tác lưu/thích/thảo luận; thêm mapping/capture và kiểm thử |
| 3 | Thu gom/hành trình, điểm/quà | Sáu frame thu gom/hành trình và 16 frame điểm/quà còn lại; gồm thưởng ngày, hướng dẫn và xác nhận/kết quả đổi quà |
| 4 | Cộng đồng, thông báo, chat, bot, game, thống kê | Dựng màn/trạng thái theo từng frame; còn thiếu ảnh/quyền riêng tư/trạng thái đăng bài và UI giọng nói |
| 5 | Hoàn tất các điều kiện kiểm tra chất lượng | Sửa định dạng 14 file và ba cảnh báo lint; nghiệm thu toàn frame, lỗi/trống/tải, cuộn/overlay và QA thiết bị |

Frontend vẫn dùng dữ liệu demo và trạng thái phiên trong RAM. Xác thực, lưu trữ bền vững, nhận diện ảnh, bản đồ/GPS, phát điểm/đổi quà, đăng ký/vé/check-in thật, push/email và realtime chưa tích hợp. Mục tiêu toàn bộ UI vẫn đang thực hiện.

Tổng hợp bằng chứng của lượt này: [validation.json](ui-progress-evidence-2026-10-31/validation.json). Lịch sử triển khai và ảnh từng màn: [báo cáo 30/10](ui-progress-2026-10-30.md).
