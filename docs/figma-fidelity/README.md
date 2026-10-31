# Đối chiếu frontend với trang backuped

## RecycleBot — cập nhật 31/10/2026

Độ phủ mới nhất là **197/211 frame**, còn **14 frame**. [Nhóm RecycleBot](../ui-bot-2026-10-31.md) thêm 11 mapping, gồm hai khung chat và các component giọng nói ở kích thước gốc; 22 ảnh đối chiếu và 130 vị trí asset đã kiểm tra. Các mốc 186/211 và cũ hơn bên dưới là lịch sử. Mục tiêu toàn trang vẫn đang tiếp tục; chưa xác nhận full-frame fidelity 100%.

## Tin nhắn — cập nhật 31/10/2026

Độ phủ mới nhất là **186/211 frame**, còn **25 frame**. [Nhóm Tin nhắn](../ui-chat-2026-10-31.md) thêm 16 mapping, có 32 ảnh đối chiếu và audit 606 vị trí asset. Các mốc 170/211 và cũ hơn bên dưới là lịch sử. Mục tiêu vẫn là toàn bộ trang backuped; chưa xác nhận full-frame fidelity 100%.

## Cộng đồng và Soạn bài — cập nhật 31/10/2026

Độ phủ mới nhất theo inventory 211 frame là **170 mapping / 41 pending**. Các mốc 105/211 và cũ hơn bên dưới là lịch sử. Các nhóm mới gồm [Điểm/đổi quà](../ui-rewards-2026-10-31.md), [Thông báo](../ui-notifications-2026-10-31.md), [Cộng đồng](../ui-community-2026-10-31.md) và [Soạn bài](../ui-composer-2026-10-31.md). `coverage.json` lưu route/source/context/ảnh đối chiếu theo từng node. Chưa xác nhận khớp toàn frame 100% hoặc hoàn tất toàn trang backuped.

## Kiểm kê live và nhóm Hoạt động — 31/10/2026

Nguồn duy nhất người dùng chốt là **backuped (`386:7053`)**. Figma đã truy cập lại được, xác nhận **211 frame**: thêm 43, bỏ 7 so với 175 frame cũ. `coverage.json` dùng [inventory mới](../ui-progress-evidence-2026-10-31/figma-live-inventory-1031.json), có **105 mapping / 106 pending**; [baseline 105/175](../ui-progress-evidence-2026-10-31/coverage-baseline-175.json) giữ để so sánh. Đổi mẫu số không phải giảm số frame đã triển khai.

11 mapping Hoạt động mới: tám biến thể chi tiết, danh sách yêu thích và hai feedback. [Audit source/asset](event-detail-asset-audit.json), [hình học nguồn](event-detail-layout-source.json), [PNG derivative có SHA-256](event-detail-native-derivatives.json), [icon export gốc](event-detail-icon-source.json). Bốn context Tin tức mới đã lấy nhưng chưa nối app/cộng mapping. [Báo cáo ngày](../ui-progress-2026-10-31.md) ghi kiểm chứng cuối và phần còn mở. Số 94/175 và từ chối Figma bên dưới là lịch sử.

## Tiếp tục app ngày 31/10/2026

QA Android lúc 09:34 đã lưu **18 capture native**, gồm màn khám phá và chín trạng thái bài đọc mới; **6/6 nhóm smoke đạt**. Lượt này sửa nhãn ảnh và accessibility/chữ lớn 130% trong bài đọc. [Báo cáo native](../ui-progress-evidence-2026-10-31/native/qa-report.json), [ánh xạ capture native](android-ui-source-map.json) và [tiến độ](../ui-progress-2026-10-31.md). Capture là viewport emulator 360 dp, không thay các render 428 px lịch sử hoặc chứng minh full-frame fidelity. Nội dung “10 mapping chưa có capture” ngay dưới là trạng thái mốc 08:50 trước QA Android.

Mã React Native đã nối chín frame chi tiết Tin tức (tám bài, `daily-waste` có thu gọn/mở rộng) và màn Khám phá Hoạt động `534:49034`. Mapping source hiện là **94/175**, còn **81**; 10 mapping mới chưa có capture native. [Audit asset cục bộ](native-ui-asset-audit.json) kiểm tra file, dữ liệu hình học đã lưu và source wiring, không thay thế kiểm tra hình ảnh/geometry render trên thiết bị. [Báo cáo cập nhật](../ui-progress-2026-10-31.md) nêu phạm vi và bằng chứng kiểm chứng app.

Lượt này dùng context, ảnh tham chiếu và asset đã lưu trong repo; Figma hiện từ chối truy cập. Chưa có thiết bị Android kết nối hoặc AVD để nghiệm thu trực tiếp. Các số 84/175, capture web và giới hạn ở những mục bên dưới là lịch sử trước lượt tiếp tục app này.

## Rà soát code ngày 31/10/2026

[Báo cáo mới nhất](../ui-progress-2026-10-31.md) và [audit local](../ui-progress-evidence-2026-10-31/frame-audit.json) xác nhận **84/175 frame ánh xạ**, 63 route, không thiếu source/route/ảnh render đã lưu của các mapping. Có 89 frame có context và 91 frame có ảnh tham chiếu. Dữ liệu bố cục/asset cho chín frame chi tiết Tin tức đã chuẩn bị nhưng chưa được app import, nên chưa tăng mapping. Lượt này không đọc lại toàn page Figma hoặc chụp/audit lại hình ảnh; các capture và số đo asset dưới đây là bằng chứng ngày 30/10. Định dạng toàn app còn 14 file chưa đạt; nghiệm thu hình ảnh và thiết bị vẫn mở.

## Trạng thái hiện tại — tiếp tục UI ngày 30/10/2026

Ba trang danh sách Tin tức `391:24796`, `386:9787`, `386:9901` đã triển khai từ context gốc, đọc lại screenshot full-size và hình học Figma thành công. [Nguồn/khác biệt demo](news-landing-source-map.json), [sáu capture](rendered/capture-report-news-landing-.json), [audit 306/306 vị trí](news-landing-asset-audit.json) ở 428/390 px đạt, sai lệch lớn nhất 0,03418 CSS px. Hai icon chuyển trang được xuất nguyên gốc vì component Code Connect không có trong repo. Trang tổng hợp dùng flow native; hai thiết kế cũ dùng LegacyCanvas. Font Inknut Antiqua đã bundle cùng giấy phép.

Tin tức hiện có chín frame đã ánh xạ và [18 capture](rendered/capture-report-news-.json), không lỗi JS/ảnh chưa tải/tràn ngang. Generator toàn page dùng inventory đã lưu **175 frame**, có **84 frame ánh xạ**, **91 frame chưa ánh xạ** và **89 frame có context**. Chín biến thể chi tiết bài đọc vẫn chưa triển khai riêng. Có context không đồng nghĩa UI đã hoàn thành; [diff toàn frame](diff/report-news-.json) vẫn khác 0 và chưa được nghiệm thu khớp 100%.

Đường vào hiện tại: `/articles` là trang chính, `?view=latest` và `?view=events` là hai danh sách còn lại; frame tìm kiếm dùng `/articles?view=search&preview=1`. Query `q`/`topic` vẫn mở feed tìm kiếm. Catalog tăng lên 13 bài với `youth-ideas` có ảnh/ID riêng; nội dung và metrics là mẫu. Preview cách ly state thật.

Sáu màn con giữ nguyên audit 58 + 32 + 29 vị trí đúng MD5/geometry. Sáu màn Hoạt động trước có 12 capture và audit 31 + 33 + 53 vị trí; bộ sưu tập còn chốt glyph Plus/chiều cao. Các đoạn bên dưới là bằng chứng của từng mốc triển khai.

Figma vừa cho đọc lại lịch `612:5362` và bản tin `612:5441`; context/ảnh canonical đã cập nhật, bản cũ giữ ở `*-previous.*`. UI theo thay đổi mới: back button, hai sự kiện “Sắp mở đăng ký”, lối vào tin sự kiện liên quan và CTA khám phá chủ đề ở bản tin thứ ba. [Nguồn](news-digest-source-map.json), [audit](news-digest-asset-audit.json), [capture hiện tại 18 ảnh](rendered/capture-report-news-.json). Preview chỉ là dữ liệu thiết kế cách ly; normal vẫn mở đúng fixture. Chưa kiểm kê lại toàn page, nên tổng 175 vẫn là inventory đã lưu.

Thảo luận/chủ đề: [nguồn và giới hạn](news-social-source-map.json), [audit asset](news-social-asset-audit.json). Count theo fixture thực, preview có ba bình luận và state riêng; UI thường giữ trả lời/thích/xóa của mình/theo dõi. Bình luận 500 ký tự ở 320px đã kiểm và lỗi blur làm hủy gửi đã sửa. Chi tiết vẫn cần hoàn thiện; lịch xanh/bản tin đã được dựng ở lượt tiếp theo nêu trên.

Tin tức: [nguồn và giới hạn](news-feed-source-map.json), [audit asset](news-feed-asset-audit.json), [capture](rendered/capture-report-news-.json), [diff toàn frame](diff/report-news-.json). Counter tìm kiếm hiển thị sáu kết quả thực của query preview thay vì số 12 cố định trong thiết kế; danh sách không lọc hiện có 13 bài. Dùng ảnh Figma gốc cho các fixture, không coi ảnh/tiêu đề là sự kiện hoặc bản tin đã xác minh. Preview lưu/thích cách ly state thật; chi tiết còn trong phạm vi cần hoàn thiện.

Nhắc lịch hoàn tất UI demo, chưa hẹn/gửi thông báo. Bộ sưu tập vẫn đang trong tiến trình nghiệm thu: package Code Connect Plus không có trong repo, đang dùng plus gốc từ form đăng ký trong slot 24px và chưa xác minh glyph tương đương; flow JSX đã lưu dài 1153px trong viewport Figma 1144px, cuộn thêm 9px. Xem [nguồn và giới hạn](saved-event-source-map.json), [audit asset](saved-event-asset-audit.json), [capture](rendered/capture-report-event-saved-.json). Không coi kiểm hành vi hoặc geometry slot là chứng minh full-frame fidelity.

Nguồn mới: `event-form-source-map.json`, `ticket-calendar-source-map.json`, các báo cáo asset audit, `rendered/capture-report-event-.json`, diff theo nhóm và báo cáo [tiến độ UI](../ui-progress-2026-10-30.md). Context/asset nhóm kế tiếp nằm ở `contexts/`, `event-design-asset-map.json`, `news-design-asset-map.json`. Các lượt trước bị từ chối đọc ảnh/hình học; lượt mới nhất đã đọc lại lịch xanh và bản tin thành công. Lịch hoạt động cũ vẫn có giới hạn ảnh context thu nhỏ đã ghi trong source map; các nguồn đang có vẫn cho phép tiếp tục. Các số 169/69 frame bên dưới là nhật ký lịch sử.

Mục tiêu triển khai: tiếp tục các UI đang trong tiến trình, đối chiếu trang **backuped `386:7053`** trong file Figma `7GCLABwia0mauoszRi0Vtt`. Lượt triển khai hiện tại đã hoàn thiện ba trang danh sách Tin tức, đọc lại screenshot/hình học Figma và chạy lại kiểm thử; chín biến thể chi tiết cùng các nhóm còn lại vẫn đang làm. Quyền đọc từng frame ở các lượt trước được ghi trong source map, không suy ra trạng thái truy cập hiện tại từ lỗi cũ. Chưa đạt hoặc được xác nhận giống 100%.

Snapshot lịch sử 29/10: 180 đối tượng cấp cao, 169 FRAME, gồm màn hình, trạng thái, overlay và khung phụ. Mỗi frame phải được phân loại và đối chiếu; không coi việc sửa một nhóm màn là hoàn tất cả trang.

## Bằng chứng

- `contexts/`: code, thông số và hướng dẫn trả về trực tiếp từ Figma MCP. Mã này chỉ là tài liệu tham chiếu; frontend dùng React Native/Expo và asset cục bộ.
- `reference/`: ảnh Figma mới lấy ở kích thước frame gốc.
- `rendered/`: ảnh ứng dụng chạy trên Chromium ở 428 × 926 và 390 × 844; `capture-report.json` ghi lỗi JavaScript, tải ảnh, kích thước và tràn ngang.
- `coverage.json`: danh sách toàn bộ frame và trạng thái triển khai/đối chiếu. Chưa dùng test hành vi hoặc đếm frame làm bằng chứng khớp hình ảnh.

## Cập nhật 29/10/2026

Đã dựng lại Home, Cá nhân, Đăng nhập, Đăng ký, Quên mật khẩu, OTP, Đặt mật khẩu mới và Thành tích theo design context. Home/Cá nhân dùng vùng cuộn giữa header và navigation cố định. Các màn cũ vẫn giữ ngôn ngữ thiết kế riêng của frame; không ép thành một mẫu giao diện mới.

Font Montserrat/Inter và các ảnh, SVG gốc được bundle cục bộ. Preview server đã bổ sung MIME SVG. Các form có kiểm tra dữ liệu, hiện/ẩn mật khẩu và điều hướng; khôi phục tài khoản là bản xem trước, không gửi OTP hoặc cập nhật tài khoản thật.

Màu `brand` giữ nguyên `#147CC1` của Figma cho các màn đang đối chiếu. `primary` của primitives hiện hữu giữ `#1176B6`; không dùng kết quả contrast test của token này để khẳng định toàn bộ thiết kế Figma đạt 4.5:1. Cặp trắng trên màu Figma có tỷ lệ 4.484:1.

Các màn chưa được dựng lại, các overlay, khác biệt typography/asset/geometry còn lại và kiểm tra thiết bị iOS/Android đều nằm trong mục tiêu còn mở. Kết quả build web hoặc test không thay cho đối chiếu hình ảnh toàn bộ trang.

Người dùng đã xác nhận trong chat rằng **không bắt buộc font SF Pro**. Các phần SF Pro dùng font hệ thống tương đương trên từng nền tảng; các font Montserrat và Inter được bundle theo thiết kế.

Luồng Quét rác đã được dựng thêm sáu trạng thái: trang mở quét, camera, khung nhận diện, không nhận diện được, kết quả và thông báo thành công. `ScanScene.tsx` ghép các lớp React Native, chữ và asset riêng lẻ từ số đo Figma, không dùng ảnh chụp toàn màn làm giao diện. `scan-geometry.json` lưu bằng chứng số đo và `scan-asset-map.json` ghi nguồn asset của sáu frame.

Camera thực chỉ mount khi màn được focus và có quyền. Chọn ảnh giữ dữ liệu cục bộ và chuyển sang lựa chọn vật liệu thủ công. Các trạng thái có ảnh/kết quả mẫu được mở riêng trong menu và có mô tả rõ; ứng dụng chưa có API nhận diện, xác minh hoặc cộng điểm. Bundle iOS và Android đã xuất thành công; chưa kiểm tra chụp ảnh trên thiết bị thật.

Kết nối Figma đã hoạt động trở lại. Đã đọc thêm context và asset gốc cho nhóm thu gom; lỗi quyền trước đó không còn chặn việc đối chiếu.

Đã dựng 13 frame thu gom: bản đồ `386:8569`, khám phá `386:8633`, bộ lọc `534:48401`, so sánh `534:48505`, hành trình `534:48774`, chi tiết điểm `386:10186`, chọn tuyến `386:10279`, các chặng `386:10351`, chỉ đường mẫu `386:10136`, điểm thay thế `534:48869`, hướng dẫn bàn giao `534:48955`, đề xuất điểm `534:48595` và báo cáo `534:48690`.

Đã dựng thêm sáu frame danh mục sổ tay: rác vô cơ `386:13593`, hữu cơ `386:13782`, tái chế `386:13929` và ba hướng dẫn mở rộng tương ứng `386:13685`, `386:13838`, `386:14037`. Danh sách dùng hình gốc, hỗ trợ cuộn, tìm tiếng Việt không dấu và mở đúng chi tiết vật liệu; hướng dẫn đóng bằng nút, vùng ngoài, Escape hoặc nút quay lại trên thiết bị. Tổng phạm vi hiện tại là **61/169 frame**, còn **108 frame** trong snapshot chờ phân loại, triển khai hoặc đối chiếu đầy đủ. Đây là số frame đã có giao diện, không phải số frame được xác nhận khớp 100%.

Bộ lọc giữ thay đổi nháp đến khi Áp dụng; so sánh giữ điểm được chọn; hành trình hỗ trợ thêm/bỏ, kéo và thao tác truy cập để đổi thứ tự. Thay điểm đầu giữ các điểm sau. Bàn giao là xác nhận do người dùng tự thực hiện trong phiên mẫu, chưa xác minh với đơn vị thu gom và không cộng điểm.

Nhóm thu gom có 26 ảnh chụp ở 428 px và 390 px, không có lỗi JavaScript, ảnh chưa tải hoặc tràn ngang trong báo cáo capture. Bộ kiểm tra chức năng đạt 20/20; bộ kiểm tra trình duyệt đạt 32/32 sau khi thêm danh mục sổ tay. Sau thay đổi font hướng dẫn, chín kiểm tra liên quan sổ tay/quét đã đạt lại. Sai khác hình ảnh vẫn được ghi trong `diff/report.json`; build và test đạt không xác nhận toàn bộ trang giống 100%.

Nhóm thu gom dùng năm font tĩnh Inter 3.19 từ [bản phát hành chính thức](https://github.com/rsms/inter/releases/tag/v3.19), kèm giấy phép trong `apps/mobile/assets/fonts/inter-3.19/LICENSE.txt`. Đây là lựa chọn dựa trên đo đạc: sai khác trung bình giảm ở cả chín frame so với Inter 4.001 đang có trong gói Google Fonts. Bằng chứng trước thay đổi nằm ở `diff/report-before-inter-3.json`; vẫn còn khác biệt raster hóa và một số chi tiết hình ảnh.

TypeScript, lint và định dạng mã đã đạt sau thay đổi font và biểu mẫu; cả bundle iOS lẫn Android đã xuất thành công với đủ 13 frame thu gom và năm asset OTF. Chưa xác nhận giao diện hoặc camera trên thiết bị thật. Ảnh thêm trong biểu mẫu giữ cục bộ, bản nháp đề xuất chỉ giữ trong phiên; các bản xem trước không gửi dữ liệu lên dịch vụ xét duyệt hoặc báo cáo.

Đã sửa fallback tiếng Việt trong bảy hướng dẫn vật liệu. Đo qua Chrome DevTools xác nhận Poppins thiếu 26 glyph đang xuất hiện trong đoạn mẫu và trước đó trình duyệt dùng Times New Roman cho chúng. Figma dùng [font Noto khi font đã chọn thiếu ký tự](https://help.figma.com/hc/en-us/articles/360040449673-Add-text-in-Chinese-Japanese-and-Korean). Frontend hiện bundle Noto Sans Light/Medium từ [kho chính thức](https://github.com/notofonts/noto-fonts/tree/main/hinted/ttf/NotoSans), kèm giấy phép; chỉ dùng cho ký tự Poppins thiếu. Web dùng font fallback; native dùng Text lồng với cùng cỡ chữ và chiều cao dòng. `guide-font-audit.json` ghi font thực tế, `poppins-cmap.json` ghi ký tự thiếu, `vietnamese-font-comparison.json` ghi sai khác trước/sau. Sai khác trung bình giảm ở cả bảy frame; vẫn còn khác biệt emoji, raster chữ và một số chi tiết.

Ảnh chụp mới của toàn bộ nhóm sổ tay gồm 32 ảnh, không có lỗi JavaScript, ảnh chưa tải hoặc tràn ngang. TypeScript, lint, định dạng và bundle iOS/Android đã đạt với hai font Noto mới. Giao diện native trên thiết bị thật vẫn chưa được đối chiếu.

Thanh điều hướng trong bảy hướng dẫn đã chuyển sang 11 SVG riêng của từng frame, gồm từng phần icon, nền giữa, nút quét và vạch hệ thống, với canvas gốc 444 × 116 đặt giữa màn 428 px. Không còn dùng các icon gần đúng từ frame Thành tích cho nhóm này. `guide-navigation-asset-audit.json` ghi 77 file gốc không rỗng và kích thước SVG; `guide-navigation-layout-audit.json` đối chiếu 154 vị trí ở cả 428 px và 390 px. Công cụ đọc bố cục từ JSX Figma đã lưu, xác định asset bằng MD5 và so với kích thước DOM sau scale; không lấy số đo kỳ vọng từ mã ứng dụng. Cả 154 vị trí khớp trong 0,1 CSS px, sai khác lớn nhất khoảng 0,034 px do phần trăm làm tròn và lượng tử hóa bố cục trình duyệt. Đây là kiểm tra asset/bố cục, không xác nhận pixel toàn màn khớp 100%.

Tiêu đề GreenSteps của bảy hướng dẫn dùng Inter 3.19 đã có trong dự án. Đo với cùng cỡ 32 px cho độ rộng 185,30 px, gần số đo Figma 186 px hơn bản Inter 4.001 trước đó 183,83 px. Sai khác toàn frame giảm ở cả bảy màn sau từng thay đổi điều hướng và font; xem `guide-navigation-comparison.json` và `guide-title-font-comparison.json`. Bộ chụp hiện ghi kích thước DOM thực sau scale thay vì thuộc tính width/height nguyên của thẻ ảnh. Sau thay đổi điều hướng, chín kiểm tra sổ tay/quét đạt lại; kiểm tra kiểu dữ liệu, lint, định dạng và bundle iOS/Android cuối đều đạt.

Lần đọc mới nhất của các frame còn thiếu và ảnh hoạt động `534:49034` lại bị Figma từ chối với thông báo thiếu quyền chỉnh sửa. `whoami` xác nhận kết nối vẫn đăng nhập, nhưng chưa xác định được file thuộc plan nào; không suy ra quyền file từ seat của một team. Bằng chứng lỗi nằm ở `figma-access-error-2026-10-29.txt`. Việc đối chiếu từ context và ảnh đã lưu vẫn tiếp tục; cần quyền đọc context/ảnh của các frame còn lại để hoàn tất toàn trang.

## Cập nhật 30/10/2026

Người dùng xác nhận hiện chỉ có quyền xem file Figma. Đã thử cách đọc qua ứng dụng Figma cài sẵn; cửa sổ chưa trả về nội dung file có thể đối chiếu, nên chưa lấy được context/ảnh mới cho 108 frame còn thiếu. Không thay đổi quyền file hoặc gửi yêu cầu quyền thay người dùng.

Đã thay thêm điều hướng cho sáu frame: trang đầu sổ tay `386:13263`, biến thể đang chọn `386:13313`, danh sách `386:13364` và ba danh mục `386:13593`, `386:13782`, `386:13929`. `handbook-navigation-source-map.json` ghi tên từng asset trong context và tham chiếu cục bộ. Các SVG còn thiếu của biến thể đang chọn được tải từ URL gốc trong context đã lưu. Ba overlay có bố cục điều hướng khác vẫn giữ triển khai hiện hành và cần đối chiếu riêng; không dùng số đo của frame khác để tuyên bố chúng đã khớp.

Đối chiếu mở rộng `guide-navigation-layout-audit.json` hiện gồm **286 vị trí SVG của 13 frame**, ở 428 px và 390 px: không có vị trí sai ngoài dung sai 0,1 CSS px; sai khác lớn nhất vẫn khoảng 0,034 px. Báo cáo `handbook-navigation-comparison.json` xác nhận sai khác toàn frame giảm ở cả sáu màn vừa sửa. Bộ chụp sổ tay 32 ảnh không có lỗi JavaScript, ảnh chưa tải hoặc tràn ngang. TypeScript, lint, build web và bundle iOS/Android đã đạt sau thay đổi; chín kiểm tra sổ tay/quét đạt lại. Độ phủ giữ **61/169 frame**, chưa xác nhận mục tiêu 100%.

Kiểm tra tích hợp mới đã bấm lần lượt cả năm nút trên thanh điều hướng gốc của danh mục tái chế và xác nhận mở đúng Trang chủ, Thu gom, Đổi quà, Cá nhân và Quét rác; kết quả đạt. Tổng các kiểm tra liên quan trong lần cập nhật này là 10/10.

Kết nối đọc Figma đã hoạt động trở lại: `use_figma` đọc được node, sau đó cả `get_design_context` và `get_screenshot` đều trả kết quả cho các frame mới. Không xác nhận nguyên nhân của lỗi quyền trước đó và không thay đổi quyền xem của người dùng. Lỗi này hiện không còn chặn việc triển khai.

Đã sửa thanh điều hướng riêng của ba overlay danh mục `386:13685`, `386:13838`, `386:14037` bằng sáu SVG của từng frame. Đây là bố cục riêng: tọa độ nền, icon, nút quét và vạch hệ thống không dùng lại vị trí của frame danh mục đóng. Sai khác giảm ở cả ba overlay; xem `expanded-navigation-comparison.json`. Kiểm tra độc lập từ JSX Figma hiện bao phủ **322 vị trí SVG trên 16 frame** ở 428 px và 390 px; không có sai khác ngoài dung sai 0,1 CSS px, lớn nhất khoảng 0,040 px.

Đã dựng thêm bốn bảng phân loại 428 × 1114: nhựa `386:16931`, dụng cụ y tế `386:17005`, túi nilon `386:17077` và pin `386:17145`, tại `/handbook/types/{plastic|medical|bag|battery}`. Nội dung dùng Text/View và asset gốc, gồm ảnh minh họa, thanh thời gian phân hủy, phần tóm tắt/lưu ý, CTA và navigation; không dùng ảnh chụp toàn màn làm UI. `handbook-types-*-geometry.json` lưu số đo từng lớp, `handbook-types-typography.json` lưu font và các đoạn chữ khác cỡ, còn `handbook-types-context-asset-map.json` ghi liên kết asset với node. Các nút tìm hiểu nối đúng bảng theo nhãn gốc; menu hướng dẫn vật liệu mở được nhóm bảng này. Menu bảng hỗ trợ chọn cả bốn loại và quay về sổ tay.

Đã sửa cách crop ảnh FILL thành cover, bóng ở cấp nhóm thẻ và chiều rộng tự nhiên của chữ theo Figma. Tám ảnh chụp mới của bốn bảng không có lỗi JavaScript, ảnh chưa tải hoặc tràn ngang. Vẫn còn khác biệt emoji, raster hóa chữ và một số chi tiết nhỏ; báo cáo số đo sai khác không thay cho việc xác nhận khớp 100%. TypeScript, lint, định dạng, build web và bundle iOS/Android đã đạt sau thay đổi. Độ phủ hiện tại là **65/169 frame**, còn **104 frame** chờ triển khai/đối chiếu; mục tiêu đầy đủ vẫn đang mở.

Đã lấy context và ảnh gốc cho bốn trạng thái quét tiếp theo `386:14241`, `386:14346`, `386:14379`, `386:14454`; nhóm này đã được triển khai trong cập nhật tiếp theo bên dưới.

Bộ kiểm tra trình duyệt đầy đủ đạt **34/34** sau bốn bảng phân loại và các sửa overlay; bao gồm luồng qua các CTA gốc, quay về sổ tay và năm nút điều hướng. Kết quả này xác nhận hành vi đã kiểm tra, không xác nhận toàn bộ frame đã khớp hình ảnh hoặc native trên thiết bị thật.

Đã dựng thêm bốn trạng thái quét: Loading `386:14241`, chi tiết kết quả `386:14346`, thông báo điểm mẫu `386:14379` và sổ tay mở từ quét `386:14454`, dùng `/scan?state={loading|detail|award|handbook}&preview=1`. `ScanDetailsScene.tsx` dựng Text/View, ảnh và SVG riêng lẻ từ `scan-details-data.ts`. Số đo gốc nằm ở `scan-details-*-geometry.json`; `scan-details-context-asset-map.json` ánh xạ asset với node Figma. Hai gradient được chuyển từ ma trận Figma sang SVG trong hệ tọa độ pixel, không dùng ảnh chụp toàn màn. Các vector Code Connect không có thành phần React Native tương ứng dùng đúng SVG gốc đọc từ child node, gồm mũi tên hàng, nút đóng và quay lại.

Luồng camera mẫu đi qua kết quả và chi tiết; Loading mẫu tiếp tục bằng thao tác người dùng, không giả nhận diện ảnh thật. Sổ tay mới cuộn đủ bảy vật liệu và mở đúng hướng dẫn. Kết quả thủ công giữ ảnh cục bộ, tên, phân loại và hướng dẫn của vật liệu khi mở chi tiết; quay lại giữ dữ liệu. Bấm tích điểm từ kết quả thủ công mở xác nhận hiện hành với `Điểm thưởng: 0 · POLICY_NOT_ENABLED`; không chuyển sang thông báo 5 điểm. Màn 5 điểm chỉ được mở trong luồng mẫu hoặc preview; không cập nhật điểm người dùng.

Đã bổ sung Poppins Regular, Mulish Regular và Noto Sans Regular có giấy phép trong dự án để hiển thị đúng các kiểu chữ mới. Đối chiếu vẫn còn khác biệt emoji, raster chữ và một số chỗ xuống dòng Poppins giữa bản Figma và Chromium; chưa coi các frame này khớp 100%. `scan-typography-comparison.json` ghi thử nghiệm fallback để đánh giá nguyên nhân; kết quả chưa đủ chứng minh một font thay thế nên giao diện giữ font theo metadata gốc.

Độ phủ hiện tại là **69/169 frame**, còn **100 frame** chưa triển khai/đối chiếu đầy đủ. Toàn bộ **36/36 kiểm tra trình duyệt** và **20/20 kiểm tra chức năng** đã đạt sau khi nối bốn trạng thái quét. TypeScript, lint và định dạng cũng đạt; bundle iOS/Android đã xuất thành công. Các kiểm tra không thay thế xác nhận giao diện/camera trên thiết bị thật hoặc đối chiếu toàn bộ trang backuped.

Khi chuẩn bị nhóm hoạt động `534:49034`–`534:49968`, Figma MCP lại từ chối cả context và phép đọc cục bộ với cùng thông báo thiếu quyền chỉnh sửa. Không thay đổi quyền chỉ xem đã được người dùng xác nhận và chưa có dữ liệu mới cho nhóm này; mục tiêu vẫn giữ toàn bộ phạm vi trang backuped.

Đối chiếu cuối của nhóm quét gồm **20 ảnh** cho 10 trạng thái ở 428 px và 390 px, không có lỗi JavaScript, ảnh chưa tải hoặc tràn ngang. Sửa hệ tọa độ gradient từ normalized box sang pixel đã giảm sai khác của cả chi tiết và thông báo điểm; xem `scan-gradient-comparison.json`. Các điểm màu nền kiểm tra trực tiếp khớp ảnh Figma trong khoảng 0–1 mức màu, nhưng phần chữ/emoji vẫn còn sai khác nên chưa xác nhận hai frame khớp toàn bộ. Bản native cuối sau sửa SVG gradient đã xuất thành công.

Kiểm tra truy cập tiếp theo ngày 30/10: `get_design_context` cho `534:49034` và phép đọc `use_figma` cùng trả thông báo thiếu quyền chỉnh sửa; `whoami` vẫn hoạt động. Ứng dụng Figma cài trên máy có cửa sổ Untitled nhưng đang thu nhỏ; công cụ trả lỗi cần activate/refresh và lần khôi phục bằng launcher không lấy được cửa sổ có thể thao tác. Không gửi đầu vào vào canvas hoặc thay đổi file/quyền. `access-status-2026-10-30.json` ghi bằng chứng, phần context còn thiếu và bước cần để tiếp tục. Phạm vi vẫn là toàn bộ 169 frame; chưa đánh dấu mục tiêu hoàn tất.

Lần xác minh kế tiếp vẫn gặp cùng lỗi: MCP từ chối context `534:49034` (debug ID `08a579ca-bce1-4197-9565-d57fa1425194`), và cửa sổ Figma vẫn thu nhỏ, không đọc được qua công cụ UI. Điều kiện chặn đã lặp lại ba lượt mục tiêu liên tiếp sau lần đọc thành công trước đó. Trạng thái chuyển sang **blocked**, giữ nguyên phạm vi 169 frame và phần đã dựng 69 frame. Trong 100 frame chưa triển khai, chỉ hai frame có context đã lưu và không frame nào có ảnh tham chiếu đã lưu; 98 frame còn thiếu cả context. Cần khôi phục khả năng đọc thiết kế hoặc nhận bản xuất được phép sử dụng của trang backuped để tiếp tục, không coi các kiểm tra đã đạt là bằng chứng hoàn tất toàn trang.
