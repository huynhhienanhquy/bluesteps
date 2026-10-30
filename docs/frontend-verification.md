# Frontend delivery — 29/10/2026

## Baseline hiện tại: SDK 58

Sau kiểm tra request thật trên điện thoại (iOS SDK 58, Android SDK 57), người dùng chọn nâng project lên SDK 58. Expo 58.0.21 / RN 0.88.1 / React 19.3.0 / Router 58.0.28; TypeScript 6, Jest 30, RNTL 14. Đã chuyển test render/fireEvent sang async và cập nhật ref/color types. Typecheck, lint, format, native config, export web, 19/19 unit/component tests và 6/6 E2E đạt; Expo compatibility và peer checks đạt. Manifest/bundle tunnel iOS/Android HTTP 200. **Người dùng xác nhận cả iPhone và Android đã mở được BlueSteps.** Runtime inspector đồng thời ghi nhận iPhone và OPPO CPH1911 (Android 11/API 30); lượt đọc log Metro sau đó không thấy runtime error mới. Chưa claim đã kiểm camera/picker hoặc toàn bộ luồng trên thiết bị thật. Hướng dẫn và QR hiện hành ở [expo-go.md](expo-go.md). Các baseline 54/55 bên dưới là lịch sử.

## Cập nhật Expo Go SDK 54 — 29/10/2026

Theo lựa chọn người dùng, chuyển baseline từ SDK 55 về SDK 54 để dùng Expo Go trên iPhone và Android. Bộ package đã align bằng manifest Expo 54; TypeScript/lint/format, 19 test, native config introspection và export web đạt. Metro `--go --lan` đã phục vụ manifest SDK 54 và development bundle cả Android/iOS qua IP LAN với HTTP 200. Đang chờ xác nhận trên điện thoại thật; xem [hướng dẫn và bằng chứng Expo Go](expo-go.md). Các kết quả SDK 55 bên dưới là lịch sử, không đại diện baseline hiện tại.

## Cập nhật mock data — 29/10/2026

Yêu cầu tiếp theo đã bổ sung bộ seed dùng ngay không cần API: 10 vật liệu, 6 điểm thu gom, 6 hoạt động, 6 quà, 5 bài đọc, 5 bài đăng và 3 bình luận; profile/ví/lịch sử điểm–quà đối soát số dư 180; thống kê 4 tuần; 5 thông báo và 3 hội thoại/8 tin nhắn. Màn lịch sử và thống kê hiện hiển thị dữ liệu minh họa thay cho trạng thái trống của bản bàn giao đầu bên dưới.

`createDemoSession` tạo bản sao độc lập; reset khôi phục saved/liked, 2 điểm hành trình, bài viết, thông báo và hội thoại. Tin nhắn mới giữ nguyên khi chuyển màn trong phiên. Dữ liệu không persist hoặc gửi ra ngoài. `pnpm demo` mở Expo web với seed tự nạp. Chi tiết: [mock-data](mock-data.md).

Kiểm tra sau cập nhật: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` (**19 tests / 12 suites**) và `pnpm build` đạt. Test kiểm ID/foreign reference, wallet/ledger/redemption, tổng thống kê, reset độc lập, hiển thị lịch sử và thông báo, giữ tin nhắn qua chuyển màn. `pnpm test:e2e` **6/6 đạt trên Chromium**, gồm các màn dữ liệu mới và bình luận; preview loopback trả HTTP 200. Native hardware và backend vẫn ngoài phạm vi mock data; các kết quả bundle/native bên dưới thuộc bản frontend đầu.

Ảnh đã kiểm tra: [Lịch sử mẫu](frontend-evidence/mock-history.png), [Hội thoại mẫu](frontend-evidence/mock-conversation.png).

Các mục sau ghi lại bản frontend đầu; các trạng thái “lịch sử trống”/“thống kê chưa có dữ liệu” được thay bằng seed nêu trên.

## Kết quả và phạm vi

Đã xây frontend-first trong `apps/mobile` từ workspace chưa có source app. Expo/React Native dùng chung mã cho Android, iOS và preview web; 5 tab và các flow chính lấy từ catalog trang backuped. Đây là **frontend demo có thể chạy và kiểm chứng**, chưa phải hoàn tất mọi packet của roadmap hoặc release production.

Đã áp dụng các nguyên tắc frontend/state/accessibility/verification của `codex-agent-kit`, không sửa kit hoặc authored execution pack. Kế hoạch frontend độc lập ở `frontend-plan.md`; source API/Supabase/contract/state/handoff cũ không bị đánh dấu hoàn thành.

| Phần | Hành vi đã có |
| --- | --- |
| Foundation | pnpm workspace + lockfile, TypeScript strict, Expo Router, design tokens, theme system/light/dark, screen shell và stack back/deep link |
| Home | Banner theo ảnh `391-25197`, lối tắt, ví mẫu và hoạt động; điều chỉnh khoảng rộng cho điện thoại 390px |
| Handbook/scan | Search/category/detail/hazard; xin quyền camera/torch/chụp/xem lại/chọn ảnh; nhập tay; demo không cộng điểm |
| Collection/journey | Search, bộ lọc nháp/applied/cancel, detail, thêm/xóa/sắp xếp điểm bằng nút, hướng dẫn bàn giao, preview báo cáo/đề xuất |
| Events | List/filter/detail/save, lịch tháng 11/2026 chọn ngày, danh sách đã lưu, form kiểm tra thông tin đăng ký |
| Rewards | Ví/giá mẫu, lọc danh mục, preview đổi quà, nhánh mẫu thiếu điểm, command thật disabled, lịch sử trống |
| Community/content | Like cục bộ, soạn bài cục bộ, bài đọc/detail, inbox thông báo demo |
| Auth/profile | Onboarding, login/register/recovery form, kiểm mật khẩu đăng ký 8–128 theo policy, focus lỗi đầu, profile/edit preview/settings/statistics chưa có dữ liệu |
| Messages/games | P2P cục bộ, RecycleBot trả lời cố định có nhãn, luyện tập phân loại bằng chạm không phát điểm |

## Kiểm chứng đã chạy

CWD `D:\BlueSteps`, trừ các lệnh có `--filter` tự chọn package. Các lệnh dùng Node 22.14.0, pnpm 11.25.0 và dependency pin trong `pnpm-lock.yaml`.

| Lệnh | Kết quả |
| --- | --- |
| `pnpm install` | Đạt; allowlist chỉ build script `unrs-resolver` |
| `pnpm --filter @bluesteps/mobile exec expo install --check` | Dependencies up to date theo SDK 55 |
| `pnpm typecheck` | Đạt |
| `pnpm lint` | Đạt |
| `pnpm format:check` | Đạt |
| `pnpm test` | **10 tests, 7 suites đạt**, không còn cảnh báo act hoặc tiến trình Jest không thoát |
| `pnpm build` | Export web đạt; chỉ import font Ionicons dùng thực tế thay vì toàn bộ họ font |
| `pnpm bundle:native` | Export bundle Hermes Android và iOS đạt; **không phải APK/IPA hoặc chứng cứ chạy thiết bị** |
| `pnpm check:native-config` | Introspection config đạt: iOS camera/photos có mô tả, không có mô tả microphone; Android camera không bị block, RECORD_AUDIO bị remove |
| `pnpm test:e2e` | **5 tests Chromium đạt**, gồm cả smoke deep link trên 20 đường dẫn bổ sung |
| `pnpm audit --prod --audit-level high` | Chưa sạch: 1 high, 1 moderate, 1 low trong cây dependency; xem bên dưới |

E2E sử dụng Chromium sẵn có qua `PLAYWRIGHT_CHROMIUM_EXECUTABLE`; config mặc định vẫn dùng Chromium do Playwright cài để chạy được trên máy khác. Preview phục vụ trên loopback `127.0.0.1:4173`.

## Hành vi được test

- Tra cứu sổ tay và empty result; read adapter có content/empty/error/retry và abort.
- Bộ lọc chỉ đổi kết quả khi apply; cancel giữ giá trị đã áp dụng.
- Save/unsave hoạt động; thêm/xóa điểm hành trình trên trình duyệt.
- Form email/password lỗi và kiểm dữ liệu hợp lệ không tạo session.
- Camera bị từ chối vẫn có nhập tay; scan xác nhận trả demo 0 điểm, không phát thưởng.
- Theme và các cặp text/action semantic được kiểm tương phản tối thiểu 4.5:1 ở cả sáng/tối. Primary đã điều chỉnh từ mẫu `#147CC1` thành `#1176B6` để chữ nhỏ đạt tương phản; action text trên nền nhạt dùng primaryDark.
- E2E: 5 tab, scan thủ công, lưu hoạt động, soạn bài cục bộ, disabled redemption, error/retry UI, theme, deep links và không tràn ngang ở viewport 1440px.
- Đã xem ảnh Home 390×844, Home 1440×1000 và Settings dark. Đây là QA hình ảnh, không claim pixel-perfect toàn bộ 169 frame.

Ảnh: [Home mobile](frontend-evidence/home-mobile.png), [Home desktop](frontend-evidence/home-desktop.png), [Settings dark](frontend-evidence/settings-dark.png).

## Giới hạn và việc nối tiếp

1. Chưa chạy development build APK/IPA, emulator hoặc thiết bị thật. Cần kiểm camera/picker/lifecycle/quyền, font lớn, safe area, keyboard và performance trên thiết bị. Unit test mock boundary camera không thay kiểm phần cứng.
2. Chưa có API Python, Supabase, xác thực/session, media upload, map/GPS/routing thật, push, worker hoặc WebSocket. Tất cả profile/địa chỉ/lịch/số dư/giá là fixture tổng hợp; thay đổi demo chỉ ở RAM và mất khi reload.
3. Chưa bật earning/daily claim/level/redemption/capacity/QR/fulfillment/friendship/retention; các decision trong register vẫn pending đúng nguồn. Không tạo provider AI/map, game extension, call/video hoặc dịch vụ cloud. Các biến thể màn nghiệp vụ nhạy cảm cần contract/policy và tích hợp sau frontend nền tảng này.
4. `pnpm audit` báo high [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) ở **Zod 3.25.76 do Expo CLI 55 kéo vào**. Form app dùng Zod 4.6.7 đã ở trên bản vá được advisory nêu. Chưa override transitive Zod khác major vì có thể làm hỏng CLI; cần review/nâng bộ Expo tương thích và xử lý toàn bộ advisory trước release. Không coi audit đạt.
5. Git root của môi trường là thư mục cha trên ổ D; workspace này đang untracked trong repo đó. Không tạo commit hoặc thay đổi lịch sử Git, không chạm dự án khác.

Các bước nối backend: generate types từ schema đã pin → API adapter → Python Identity + SecureStore + cache purge → media provider được chọn → command có idempotency/operation reconciliation → role/device/E2E thật. Không đưa công thức điểm hoặc vé mẫu vào production.
