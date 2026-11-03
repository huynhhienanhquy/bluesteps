# Dữ liệu hiển thị của BlueSteps

Cập nhật 03/11/2026: đã bổ sung 9 quà cho Voucher, Giải trí và Khác (3 quà mỗi nhóm), kèm tồn kho và ảnh. Xem [danh mục phần thưởng và kiểm chứng](reward-catalog.md).

Cập nhật 02/11/2026 theo yêu cầu bổ sung dữ liệu cho các màn hình và tài khoản người dùng đã chỉ định.

Theo yêu cầu tiếp theo, đã bỏ nhãn và chữ “Mẫu” khỏi toàn bộ dữ liệu trình bày: 69 bản ghi được cập nhật, kiểm tra 94 bản ghi thuộc 18 bảng, không còn nhãn trong các trường hiển thị. Các script sinh dữ liệu, fixture và nhãn lịch sử điểm cũng được cập nhật. Xem kết quả làm sạch.

## Đã sửa nguyên nhân trống dữ liệu

Trước cập nhật, cả năm danh mục có 3 dòng nhưng đều `synthetic=true`, nên API loại khỏi kết quả. Bộ dữ liệu minh họa được xuất bản bằng script riêng: `published=true` / `state=published`, `synthetic=false`, dùng mã `sample-*` ổn định. Các bộ lọc của API vẫn giữ nguyên; fixture kiểm thử không tự trở thành nội dung công khai.

| Dữ liệu công khai | Số lượng |
| --- | ---: |
| Nhóm rác: tái chế, hữu cơ, vô cơ | 3 |
| Vật liệu | 7 |
| Vật phẩm (mỗi nhóm 3) | 9 |
| Điểm thu gom, kèm vật liệu và đánh giá | 3 |
| Hoạt động, kèm lịch, giới thiệu, vai trò, chuẩn bị và ảnh | 3 |
| Bài đọc, kèm tóm tắt, nội dung, chủ đề, bình luận và ảnh | 3 |
| Quà, kèm giá điểm, tồn kho và ảnh | 3 |
| Bài đăng cộng đồng, kèm bình luận và phản ứng | 3 |

Ảnh minh họa có sẵn trong project được đăng ký tại `apps/mobile/src/design-system/catalog-media.ts`. `MediaSlot` nhận mã nội dung từ API để chọn ảnh đóng gói; ảnh hoạt động dùng cùng mã trong `details.imageUrl` và `gallery`. Không phụ thuộc host ảnh ngoài. Danh sách và trang chi tiết tin tức, quà, điểm thu gom đều nối ảnh; hoạt động có cả thư viện ảnh.

## Dữ liệu cá nhân

Script chỉ tìm đúng email được truyền vào và yêu cầu tài khoản đang hoạt động. Giữ nguyên thông tin đăng nhập, hồ sơ, tùy chọn và các phiên có sẵn.

| Dữ liệu thêm cho tài khoản được chọn | Số lượng |
| --- | ---: |
| Bộ sưu tập và hoạt động đã lưu | 3 mỗi loại |
| Bài đọc, bài đăng đã lưu; chủ đề theo dõi | 3 mỗi loại |
| Lịch sử quét và phân loại | 3 mỗi loại |
| Thông báo | 3 |
| Hội thoại hai thành viên | 3 |
| Tin nhắn | 9 |
| Hành trình (nháp, đang đi, hoàn tất) | 3 |
| Điểm dừng và bàn giao tự khai | 9 và 3 |
| Lịch sử điểm và đổi quà mẫu | 4 giao dịch và 3 lượt đổi |

Lịch sử điểm mẫu gồm +600 và ba khoản -100, -200, -300, **giữ nguyên số dư ban đầu**; tổng tích lũy tăng 600 điểm minh họa. Các lượt đổi chỉ liên kết quà `[Mẫu]`, không gửi đơn hay giao hàng. Tồn kho mẫu giảm tương ứng. Một audit marker và UUID ổn định bảo vệ khỏi cộng điểm, giảm kho hoặc thêm lịch sử trùng khi chạy lại. Toàn bộ việc chuẩn bị dữ liệu dùng một giao dịch, có tùy chọn rollback để kiểm tra.

## Chạy lại

Từ `apps/api`, dùng cấu hình development/test trong `.env`:

```powershell
& .venv/Scripts/python.exe scripts/prepare_display_data.py --email '<email tài khoản>' --allow-remote --dry-run
& .venv/Scripts/python.exe scripts/prepare_display_data.py --email '<email tài khoản>' --allow-remote
```

Bỏ `--allow-remote` khi dùng localhost. Lệnh này là thao tác chủ động, không chạy khi ứng dụng khởi động. `seed_sample.py` ban đầu vẫn giữ fixture 3 dòng mỗi bảng và không tự xuất bản danh mục.

API chạy tại `http://127.0.0.1:8000`; bản web kiểm tra tại `http://127.0.0.1:4173`. Đăng nhập tài khoản đã chọn để xem dữ liệu cá nhân; khách xem được danh mục công khai. Khi dùng Expo, tải lại màn hình hoặc mở lại app để tải dữ liệu mới và ảnh đóng gói.

## Kiểm chứng

- [Dữ liệu sau commit](display-data-verification.json).
- Đọc lại qua HTTP/API thực, bao gồm chi tiết danh mục, đủ ba nhóm rác, mục đã lưu, lịch, tin nhắn, điểm dừng, lịch sử và thống kê.
- Đối chiếu dữ liệu cá nhân và số dư: số dư 0 được giữ nguyên, 4 dòng ledger có tổng thay đổi 0; chạy lại bằng rollback không tạo dữ liệu trùng.
- Kiểm tra browser lưu ảnh vào `docs/display-data-evidence/` khi chạy lại.
- Script `verify_display_data.py` cấp phiên QA tạm, không thay mật khẩu; credentials chỉ ở `.local` bị gitignore. Sau browser, chạy `scripts/verify_display_data.py --revoke` để thu hồi đúng phiên này.
- Browser opt-in: `BLUESTEPS_VERIFY_DISPLAY=1 pnpm exec playwright test display-data.spec.ts` (PowerShell: đặt biến môi trường trước lệnh).

Kết quả: **63 lượt đọc API, 33 màn hình/trang chi tiết trên Chrome, 0 lỗi JavaScript; 20 kiểm thử frontend đạt**. TypeScript, ESLint, Prettier, audit nguồn dữ liệu, Ruff/mypy của script và web export đều đạt. Phiên QA tạm đã được thu hồi sau kiểm tra; các phiên có sẵn của người dùng được giữ nguyên.

Huy hiệu/game, đăng ký/vé, nhắc lịch tự động, xác minh khối lượng, phát thưởng và provider chỉ đường vẫn theo các service/policy gate hiện hành. Các tính năng này cần triển khai nghiệp vụ/provider, không chỉ thêm dòng dữ liệu. Ảnh chụp/chọn vẫn luôn cho kết quả cố định “Chai nhựa” theo yêu cầu trước.
