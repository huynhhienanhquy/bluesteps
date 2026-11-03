# Kiểm tra lại UI BlueSteps với Figma

> Báo cáo này là ảnh chụp trạng thái lúc 16:45 UTC ngày 01/11, trước đợt sửa bốn màn hoạt động tiếp theo. Xem [tiến độ triển khai hiện tại](../ui-implementation-2026-11-01/README.md) cho các thay đổi sau thời điểm audit; không dùng hash/ảnh ở đây làm bằng chứng cho source mới hơn.

**Kết luận: frontend hiện tại chưa trùng khớp toàn bộ các frame Figma.** Có các nhóm màn đã phục hồi bố cục, nhưng còn thiếu nhiều màn/state và chưa có nghiệm thu toàn bộ từng frame.

Nguồn: [BlueSteps / backuped](https://www.figma.com/design/7GCLABwia0mauoszRi0Vtt/Untitled?node-id=386-7053). Thời điểm kiểm kê Figma: 2026-11-01T16:30:11.957Z. Thời điểm hoàn tất chụp route: 2026-11-01T16:45:57.843Z.

## Phạm vi và kết quả

- Xác nhận trực tiếp **211 FRAME và 12 node phụ** bằng Figma Plugin API. Metadata XML mô tả GROUP `386:17294` như frame; đã dùng loại node thật để tránh đếm nhầm 212 màn. Không thêm/bớt ID frame và không đổi kích thước so với kiểm kê trước; chưa kết luận nội dung bên trong mọi frame không đổi.
- Đã ánh xạ **211/211 frame** sang route/source hiện tại, lần theo các re-export như EventDetail, EventCalendar, ProfileOverview và SettingsScreen. Có hash của 66 file route cùng các source liên quan.
- Tiến độ implementation vẫn là **35 PARTIAL_LAYOUT, 176 PENDING, 0 frame đã được nghiệm thu hoàn toàn**. Trong 176 frame pending có 3 khung phụ không có route runtime. Đây là trạng thái công việc/bằng chứng, **không phải tỷ lệ phần trăm giống thiết kế** và không có nghĩa mọi pixel của 176 frame đều sai.
- Duyệt lại **66 route ở 428×926**, chụp đủ 66 ảnh; thêm **10 route ở 390×844**. Phiên khách, chỉ đọc API thường, không đăng nhập/tạo dữ liệu/intercept request. Bản JS export mới hơn lần sửa source gần nhất trước đợt audit; không dùng bản demo cũ.

[Ma trận đủ 211 frame](frame-matrix.md) · [Ảnh so sánh và gallery 66 route](comparison.html) · [Kết quả browser](browser-audit.json) · [Source/route hiện tại](routes.json).

## Tổng hợp từng nhóm

| Nhóm | Frame | Có bố cục partial | Còn pending |
| --- | ---: | ---: | ---: |
| Hoạt động | 18 | 4 | 14 |
| Thu gom / hành trình | 13 | 1 | 12 |
| Đăng nhập / đăng ký | 2 | 2 | 0 |
| Khôi phục / bảo mật tài khoản | 5 | 4 | 1 |
| Cá nhân / cài đặt / thành tích | 8 | 7 | 1 |
| Cộng đồng / soạn bài | 30 | 0 | 30 |
| Thông báo | 14 | 0 | 14 |
| Tin nhắn | 16 | 0 | 16 |
| Khung phụ | 3 | 0 | 3 |
| Trợ lý | 11 | 0 | 11 |
| Tin tức | 22 | 1 | 21 |
| Điểm / đổi quà | 17 | 4 | 13 |
| Sổ tay rác | 20 | 1 | 19 |
| Quét / kết quả phân loại | 10 | 0 | 10 |
| Trò chơi | 10 | 0 | 10 |
| Thống kê | 1 | 0 | 1 |
| Trang chủ | 1 | 1 | 0 |
| Onboarding | 10 | 10 | 0 |

## Các khác biệt còn rõ

1. **Cộng đồng, thông báo và tin nhắn:** source vẫn dùng danh sách/MenuItem/Card và form chữ chung; chưa có đầy đủ trang thành viên, bộ lọc, panel ảnh/tệp/emoji/ghi âm hoặc trạng thái cài đặt theo frame. Xem [SocialScreens.tsx](../../apps/mobile/src/features/live/SocialScreens.tsx) và [ProfileScreens.tsx](../../apps/mobile/src/features/live/ProfileScreens.tsx). Việc không hỗ trợ selector `frame` chỉ là bằng chứng bổ sung; kết luận dựa trên cả cấu trúc component và khả năng tương tác hiện có.
2. **Quét rác và trò chơi:** ảnh so sánh mới xác nhận sai khác lớn về bố cục. Scan là camera/chọn ảnh + tra cứu thủ công, không có đầy đủ các scene Figma. Games hiện báo chương trình chưa mở. Trợ lý cũng chỉ có form câu hỏi, thiếu giao diện chat/giọng nói. Xem [ScanScreen.tsx](../../apps/mobile/src/features/live/ScanScreen.tsx), [ServiceScreens.tsx](../../apps/mobile/src/features/live/ServiceScreens.tsx).
3. **Thu gom:** màn khám phá đã có OSM, nhưng filter/detail/compare/journey/proposal/report còn layout form chung; directions/navigation/route dùng chung RouteScreen. Không có bằng chứng điều hướng/ETA theo thiết kế. Xem [CollectionScreens.tsx](../../apps/mobile/src/features/live/CollectionScreens.tsx).
4. **Tin tức và sổ tay:** landing đã được chỉnh; chi tiết bài viết vẫn render các block chữ, các biến thể list/category/material và briefs/reading-list/topic chưa được nghiệm thu theo từng frame. `/articles/calendar` hiện nối EventsScreen, khác màn lịch sự kiện xanh riêng. Xem [NewsScreens.tsx](../../apps/mobile/src/features/live/NewsScreens.tsx), [HandbookScreens.tsx](../../apps/mobile/src/features/live/HandbookScreens.tsx).
5. **Hoạt động và điểm/quà:** lịch tháng/tuần, một detail, form đăng ký và bốn bố cục điểm/quà đã được bổ sung. Nhiều biến thể detail/đã lưu, bộ sưu tập, nhắc lịch, vé/check-in, tổng kết, modal nhận/đổi quà vẫn cần hoàn thiện hoặc nghiệm thu riêng.
6. **Tài khoản và khung phụ:** `/connected-account` mở danh sách phiên thay vì kết nối Google/Facebook; PIN, thành tích và thống kê chưa đủ thiết kế. Ba frame phụ `386:8558`, `386:17297`, `386:18473` vẫn không có route `/design-preview`. Đây là khung phụ, chưa tự suy ra phải đưa preview vào sản phẩm.

## Những phần đã cải thiện so với báo cáo ban đầu

Home đã có hero minh họa, bốn lối tắt, ví và phần hoạt động theo bố cục mẫu. Onboarding đã có 10 bước; sổ tay đã đọc `kind`/`category`; cài đặt đã đọc `overlay`; lịch hoạt động đã có lưới tháng/tuần; detail và đăng ký có component riêng. Những kết luận cũ rằng các phần này vẫn hoàn toàn là MenuItem hoặc không đọc tham số đã hết hiệu lực. Vì vậy báo cáo cũ được giữ làm mốc lịch sử, không dùng làm kết quả hiện tại.

Tên/ảnh tài khoản, điểm, ngày lịch, nội dung và ảnh từ API khác dữ liệu mẫu Figma không tự động là lỗi UI. Native safe area/thanh hệ thống cũng cần đối chiếu riêng. Chức năng backend chưa mở phải giữ trạng thái thật, không tạo dữ liệu/điểm/vé/thành công giả để làm ảnh giống mẫu.

## Kiểm chứng browser và giới hạn

- Kết quả 76 lượt chụp route/viewport: **0 lượt lỗi điều hướng hoặc JavaScript**, **0 lượt tràn ngang**, **0 image element chưa tải được**. Không coi phản hồi API 404 cho bản ghi không tồn tại hoặc 503 dịch vụ chưa mở là lỗi JavaScript.
- Phân loại 66 route: 27 `rendered`, 33 `auth-gated`, 6 `missing-resource`. `rendered` chỉ nghĩa UI xuất hiện, có thể là trạng thái rỗng/chưa hỗ trợ; không có nghĩa màn hoàn chỉnh hay khớp Figma.
- API thường trong lượt này có số bản ghi công bố ở trang đầu: `events`: 0; `articles`: 0; `waste-items`: 0; `collection-points`: 0; `rewards`: 0. Vì vậy lượt này không đủ chứng minh trạng thái detail/list có dữ liệu.
- Variant onboarding bước 0/9 và kind sổ tay có kiểm tra riêng. Các cặp `frame` của community/notifications/messages/game/scan chỉ là kiểm tra phụ; nếu đều gặp auth gate thì không dùng nội dung giống nhau để kết luận phần sau đăng nhập giống nhau.
- Có bằng chứng tích hợp trước đợt audit: [events-live-e2e.log](../ui-implementation-2026-11-01/events-live-e2e.log) ghi 14 bài browser và kiểm tra SQL đã qua; [live-visual](../ui-implementation-2026-11-01/live-visual/checks.json) ghi 44 trạng thái ở hai chiều rộng với API/PostgreSQL kiểm thử biệt lập. Không chạy lại hoặc coi đó là 211 phép so ảnh trong đợt chỉ đọc này.
- Ảnh Android từ các đợt triển khai nằm trong [native](../ui-implementation-2026-11-01/native). Đợt recheck này chưa kiểm tra lại toàn bộ trên Android/iOS, chưa có pixel-diff hoặc duyệt mọi trạng thái của cả 211 frame. **0 accepted** là chưa đủ bằng chứng nghiệm thu, không phải tuyên bố không có màn nào giống.

## Typography đã đo lại

Thuộc tính được đọc trực tiếp từ Figma và computed style của browser trong đợt này, không dùng bảng đo của bản UI cũ.

| Mẫu | Figma | App hiện tại |
| --- | --- | --- |
| Home · lời chào | Montserrat Bold 21 px | Montserrat_700Bold 21px |
| Quét · tiêu đề | Inter Bold 28 px | Montserrat_700Bold 24px |
| Trò chơi · tiêu đề | Inter Bold 30 px | Montserrat_700Bold 24px |

Lời chào Home đã dùng đúng family/cỡ chữ trong mẫu đo. Điều này không nghiệm thu toàn bộ Home. [Thuộc tính Figma](figma-selected-typography.json).

## Tái lập

`node docs/ui-recheck-2026-11-01/recheck.cjs` dựng lại route/source matrix từ kiểm kê đã lưu. `capture-current.cjs` cần preview 4173 và API 8000 đang chạy; chỉ đọc. `build-report.cjs` dựng báo cáo/gallery từ kết quả hoàn tất. Đợt này chỉ thêm tài liệu và bằng chứng audit, không thay đổi frontend/backend.
