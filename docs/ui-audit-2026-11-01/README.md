# Đối chiếu UI BlueSteps với Figma — 01/11/2026

> Đây là mốc audit ban đầu, trước các đợt phục hồi UI. Kết quả hiện tại nằm ở [báo cáo kiểm tra lại](../ui-recheck-2026-11-01/README.md); không dùng các mô tả source bên dưới làm kết luận cho bản đã sửa.

**Kết luận: UI hiện tại chưa trùng khớp Figma.** Sai khác chủ yếu ở cấu trúc màn hình, thành phần và trạng thái, ngoài các thay đổi nội dung do tích hợp dữ liệu thật.

Đã đọc trực tiếp file [BlueSteps / backuped](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7053), kiểm kê đủ **211 frame**, đối chiếu route/source của từng frame và kiểm tra **66 route hiện tại**. Trang có thêm 12 node trực tiếp không phải FRAME; không tính chúng thành màn hình. So với kiểm kê 31/10: không thêm/bớt ID frame và không đổi kích thước frame. Điều này không chứng minh nội dung bên trong không đổi.

| Phân loại theo source và route | Số frame |
| --- | ---: |
| Bố cục hoặc trạng thái thiết kế đã bị thay đổi/gộp | 206 |
| Form đăng nhập/đăng ký còn gần thiết kế, chưa nghiệm thu khớp hoàn toàn | 2 |
| Khung phụ mất route preview | 3 |
| Tổng | 211 |

Đây là phân loại **cấu trúc/source**, không phải 206 phép so ảnh đầy đủ, cũng không phải tỷ lệ phần trăm giống thiết kế. Chưa có kết quả nghiệm thu pixel-perfect toàn bộ frame.

## Các phát hiện cần ưu tiên

### 1. Bố cục Home, Thu gom, Sổ tay và nội dung đã thay đổi lớn

- **Home 391:25197:** Figma có banner minh họa, avatar, bốn lối tắt ngang, thẻ ví và thẻ hoạt động. App dùng hero icon lá/chữ, sáu MenuItem dọc và các section đẩy xuống dưới. Việc khách chưa đăng nhập không giải thích được thay đổi lưới, hero và cách sắp xếp này. Source: [HomeScreen.tsx](../../apps/mobile/src/features/live/HomeScreen.tsx#L17).
- **Thu gom 386:8569, 386:8633:** Figma có vùng bản đồ, tìm kiếm nổi, pin và thẻ điểm. App render danh sách API bằng Card/MenuItem. Source không có map canvas/provider. Các route directions/navigation/route cùng mở RouteScreen. Source: [CollectionScreens.tsx](../../apps/mobile/src/features/live/CollectionScreens.tsx#L21).
- **Sổ tay 386:13263 và các biến thể:** Figma có header xanh, minh họa và lưới nhóm rác. App dùng tiêu đề/tìm kiếm/danh sách chung; types/category/list không giữ bố cục riêng. Source: [HandbookScreens.tsx](../../apps/mobile/src/features/live/HandbookScreens.tsx#L8).
- **Tin tức 391:24796 / Hoạt động 534:49034:** hero, grid thẻ ảnh, bộ lọc và thành phần riêng không còn. Chi tiết bài đọc chỉ dựng block.text; chi tiết hoạt động dùng Card chữ, không có hero/media theo thiết kế. Source: [NewsScreens.tsx](../../apps/mobile/src/features/live/NewsScreens.tsx#L9), [EventScreens.tsx](../../apps/mobile/src/features/live/EventScreens.tsx#L20).

[Ảnh so sánh 7 màn](comparison.html) · [Home cạnh nhau](home-comparison.png).

### 2. Nhiều frame khác nhau nay dẫn đến cùng một màn

- 10 bước onboarding gộp vào OnboardingScreen, không đọc step.
- Cộng đồng, Thông báo, Tin nhắn, Trợ lý, Trò chơi không đọc frame để dựng các biến thể cũ.
- Bốn SettingsOverlay không còn được chọn bằng overlay.
- /articles/briefs mở NewsScreen; /articles/calendar mở EventsScreen; reading-list và saved cùng dùng NewsScreen saved.
- /handbook/types/[kind] mở HandbookScreen nhưng màn này chỉ đọc category, bỏ qua kind.
- /connected-account hiện mở **Phiên đăng nhập**, khác frame kết nối Google/Facebook.

Bằng chứng: [routes.json](routes.json), [ma trận từng frame](frame-matrix.md), [browser-audit.json](browser-audit.json). Các cặp URL biến thể có nội dung giống nhau trong phiên khách chỉ là bằng chứng bổ sung; các màn bị chặn đăng nhập được kết luận từ source, không từ ảnh đăng nhập.

### 3. Typography và một số nền màn hình không còn đúng

Label chung hiện dùng Montserrat, line-height 1.5; Screen dùng tiêu đề 24 px, padding 24, gap 20. Figma dùng nhiều hệ chữ và kích thước theo màn. Chỉ tải các font trong RootLayout không làm các màn live tự áp dụng đúng font.

| Mục | Figma live | App hiện tại |
| --- | --- | --- |
| Home: lời chào | Montserrat Bold 21 px, line-height 29 | Montserrat Bold 24 px, line-height 36 |
| Home: hero | Montserrat Bold 24 px | Montserrat Bold 28 px |
| Sổ tay: tiêu đề | Roboto ExtraBold 32 px | Montserrat Bold 24 px |
| Thu gom: tiêu đề Khám phá | Inter Bold 20 px | Tiêu đề Điểm thu gom: Montserrat Bold 24 px |
| Trò chơi: tiêu đề | Inter Bold 30 px | Montserrat Bold 24 px |
| Nền Sổ tay / Hoạt động | Trắng #FFFFFF | Nền chung #F4FBFF |

Nguồn: [thuộc tính live của 8 frame](figma-selected-properties.json), [ui.tsx](../../apps/mobile/src/design-system/ui.tsx#L40), [design tokens](../../packages/design-tokens/src/index.ts). Màu nền Home vẫn là #F4FBFF ở cả hai bên; không phải toàn bộ token màu đều sai.

### 4. Một số UI thiết kế đang được thay bằng trạng thái dịch vụ chưa mở

Trò chơi, chat AI/giọng nói, nhận diện ảnh, điểm danh/đổi thưởng, huy hiệu, vé/check-in, nhắc lịch và tổng kết hoạt động không còn đầy đủ các màn/state như Figma. Ví dụ GamesScreen chỉ tải /v1/games và hiển thị trạng thái chưa mở, không dựng 10 frame game.

Đây là khoảng cách với thiết kế và giới hạn nghiệp vụ đã có trong [báo cáo tích hợp](../live-integration.md). Không được suy ra cần mở dịch vụ, cấp điểm, tạo vé hoặc đưa dữ liệu giả trở lại chỉ để làm ảnh giống Figma. Khi sửa UI, cần giữ dữ liệu/API thật và trạng thái unavailable đúng.

### 5. Bằng chứng “211/211” cũ đã hết hiệu lực với runtime hiện tại

Trong coverage.json lịch sử, **209/211 mapping trỏ tới source không còn tồn tại**; hai mục còn file là AuthForm.tsx. Điều này không có nghĩa mất 209 route: đa số route đã nối sang features/live, nhưng UI/state đã đổi.

Ba frame phụ 386:8558, 386:17297, 386:18473 trỏ /design-preview đã bị gỡ. URL hiện hiển thị không tìm thấy trang. coverage.json cũng ghi fullFidelityProven=false ngay ở bản cũ.

### 6. Đăng nhập/đăng ký giữ được nhiều phần thiết kế, vẫn chưa khớp hoàn toàn

AuthForm còn minh họa, form và asset gốc. Riêng đăng nhập, checkbox **Ghi nhớ tôi** trong Figma được thay bằng dòng **Phiên được lưu an toàn**; Google/Facebook chỉ có thông báo chưa hỗ trợ. Validation và trạng thái xác thực cũng đã đổi.

Không tính chênh thanh trạng thái hệ điều hành hoặc safe area trong ảnh web thành lỗi native. Chưa có nghiệm thu Android/iOS của hai form ở lượt này.

## Kiểm chứng và giới hạn

- Đã export web từ source hiện tại bằng pnpm build. Lần chạy trong sandbox gặp lỗi đọc dependency glob; chạy lại ngoài sandbox thành công, không sửa dependency.
- Browser dùng bản export mới tại 127.0.0.1:4173, viewport 428 × 926, light mode, phiên khách; không tạo tài khoản hoặc sửa dữ liệu nghiệp vụ.
- Có 21 ảnh app và 7 ảnh Figma live (Home, Login, Thu gom, Sổ tay, Hoạt động, Tin tức, Game). Đọc trực tiếp geometry/font của 8 frame, gồm Profile.
- Browser mở đủ 66 route và 11 URL kiểm tra biến thể. Kết quả chi tiết theo từng route nằm trong browser-audit.json. HTTP 200 của trang không đồng nghĩa API thành công hoặc UI giống Figma.
- Lượt cuối không có lỗi JavaScript hoặc tràn ngang ở document. 15 route hiển thị trống, 33 bị chặn đăng nhập, 6 hiển thị không tìm thấy tài nguyên kiểm tra, 12 hiển thị các form/thông báo khác. API 503 chỉ xuất hiện ở /v1/games với thông báo dịch vụ chưa mở; không còn lỗi mất kết nối database. Các 401 phiên khách và 404/422 do ID/tham số kiểm tra được giữ trong log.
- Route chi tiết dùng UUID kiểm tra không tồn tại: trạng thái not-found là dự kiến, không tính thành lỗi nội dung.
- Màn riêng tư chỉ được chụp trạng thái khách; các bố cục sau đăng nhập và nội dung có dữ liệu được đối chiếu bằng source. Không có dữ liệu công bố để nghiệm thu ảnh các thẻ nội dung thật.
- Lượt API bị dừng và lượt API bị giới hạn mạng được lưu riêng: browser-audit-api-interrupted.json và browser-audit-database-restricted.json. Chỉ browser-audit.json là lượt cuối sau khi API đọc được Supabase.
- Trước khi dùng bản export, phiên dev web đang có ở 8081 gặp lỗi “Chưa xác định được địa chỉ Expo tunnel.” Ảnh được lưu riêng tại app-dev-tunnel-error.png; không dùng ảnh đó để đánh giá layout.
- Không chạy lại unit test vì không thay mã ứng dụng. Không có kiểm thử native Android/iOS hoặc nghiệm thu mọi state bằng ảnh ở lượt audit này.

## Hướng xử lý

1. Khôi phục bố cục và thành phần riêng cho Home → Thu gom → Sổ tay → Tin tức/Hoạt động trên các màn live, giữ API thật.
2. Áp lại typography, nền, khoảng cách và điều hướng theo từng nhóm; bổ sung thiết kế empty/error/loading/unavailable nếu Figma chưa có.
3. Xác định lại các state còn thuộc phạm vi sản phẩm; dựng UI cho chúng mà không giả lập thành công của nghiệp vụ chưa mở.
4. Lập mapping frame → màn/state hiện tại thay coverage cũ; nghiệm thu ảnh Android/iOS ở cùng kích thước và cỡ chữ chuẩn.

## Hồ sơ đầy đủ

- [Ma trận 211 frame](frame-matrix.md): từng ID, route cũ, component hiện tại và kết quả.
- [frame-audit.json](frame-audit.json): source hiện tại, source cũ, tham số không còn dùng và fingerprint source.
- [figma-live-inventory.json](figma-live-inventory.json): 223 node trực tiếp, 211 frame.
- [figma-selected-properties.json](figma-selected-properties.json): geometry/font live.
- [browser-audit.json](browser-audit.json): text, trạng thái, API response, font tiêu đề, ảnh và lỗi runtime của lượt cuối.
- [comparison.html](comparison.html): 7 cặp ảnh xem cạnh nhau.
- [contact-sheet.png](contact-sheet.png): tổng quan 21 ảnh app của lượt cuối; [verification.json](verification.json): kiểm tra tính đầy đủ của hồ sơ.
- [audit-sources.cjs](audit-sources.cjs), [capture-current.cjs](capture-current.cjs): công cụ tái lập audit. Capture cần API có quyền mạng tới database và server preview; không chạy trên dữ liệu giả.

Mã ứng dụng và file Figma không được sửa trong lượt audit.

