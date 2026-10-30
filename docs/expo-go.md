# Chạy BlueSteps bằng Expo Go SDK 58

Baseline hiện tại: **Expo 58.0.21 / React 19.3.0 / React Native 0.88.1 / Expo Router 58.0.28**, TypeScript 6. Phiên bản native theo `expo/bundledNativeModules.json` và lockfile. Ngày 29/10/2026 người dùng chọn nâng SDK 58 sau khi request điện thoại xác nhận iOS SDK 58, Android SDK 57. Các baseline 54/55 trong báo cáo cũ đã được thay thế.

## Mở app

Từ `D:\BlueSteps`:

```powershell
pnpm install --frozen-lockfile
pnpm go:tunnel
```

1. **Cả hai điện thoại cần Expo Go SDK 58.** Android cập nhật [Expo Go trên Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent). Request iOS hiện có đã xác nhận SDK 58. Nếu báo incompatible SDK, đối chiếu số version của app đã cài với project; không chỉ sửa trường sdkVersion để bỏ qua.
2. Giữ Metro và internet máy tính hoạt động. Tunnel không yêu cầu điện thoại cùng Wi-Fi.
3. Quét QR root mới trong terminal bằng Expo Go Android / Camera iPhone. Có thể dùng `exps://` thay `exp://` để bắt buộc HTTPS; [Expo xác nhận cách ánh xạ giao thức](https://docs.expo.dev/linking/into-your-app/).
4. Không quét QR trang HTML `/_expo/loading` bằng trình quét bên trong Expo Go: nó có thể tải HTML như manifest và báo failed to download remote update. Trang loading chỉ mở bằng Safari/Chrome rồi bấm Expo Go.
5. Nếu cần đăng nhập Expo, dùng cùng tài khoản Expo đang đăng nhập CLI. Không cần tài khoản BlueSteps hoặc database. Cấp quyền camera/ảnh của Expo Go khi thử tính năng tương ứng.

**Tunnel phiên hiện tại:** `exps://c-quyhuynh2005-c275k1-mvt8n45jlwts1kal.on.expo.app`. [QR root SDK 58](frontend-evidence/expo-go-sdk58-qr.png). URL tạm thời thay đổi sau khi chạy lại; luôn ưu tiên URL/QR được terminal in mới nhất. Dừng Ctrl+C đóng tunnel.

LAN vẫn có thể dùng với `pnpm go` nếu máy tính/điện thoại cùng mạng và không bị chặn. Lệnh `pnpm go:link` mở launcher HTTP LAN port 8082 để bấm mở app. LAN đã không truy cập được từ điện thoại của người dùng trong phiên này nên ưu tiên tunnel; không tắt firewall Windows.

## Đã kiểm tra và giới hạn

- `expo install --check`: dependencies up to date; `pnpm peers check`: không có peer issues.
- `pnpm typecheck`: đạt sau cập nhật ref TextInput và màu tab theo React Native 0.88/TypeScript 6.
- `pnpm lint`, `pnpm format:check`, `pnpm check:native-config` và export web SDK 58 đạt. Native config vẫn bật camera/photos và loại microphone.
- `pnpm test:e2e` SDK 58: 6/6 đạt trên Chromium, gồm navigation, filter/journey, saved/composer/auth, theme/error, deep link và dữ liệu seed.
- `pnpm test`: 19/19 test, 12/12 suites đạt với Jest 30 / React Native Testing Library 14 và test-renderer 1.3.0. Các render/fireEvent trong test được await theo API mới.
- Metro SDK 58 hoạt động qua tunnel. Manifest báo SDK 58.0.0, bundle iOS/Android local trả HTTP 200. Lần dựng cold cache qua tunnel đầu có HTTP 504; đã dựng cache trực tiếp local rồi kiểm lại trước thử điện thoại.
- QR SDK 58 đã được decoder độc lập đọc đúng URL root `exps://`.
- Mock data nạp tự động. Camera/ảnh chỉ xem trước cục bộ; chưa gọi API/AI hoặc phát giao dịch thật. Config plugin chỉ áp dụng native build riêng, Expo Go dùng permission của app Expo Go.
- Người dùng đã xác nhận **cả iPhone và Android mở được BlueSteps trên SDK 58**. Metro runtime inspector ghi nhận `host.exp.Exponent (iPhone)` và `host.exp.exponent (OPPO CPH1911)`, Android 11/API 30. Đây là chứng cứ mở app native trên cả hai nền tảng; chưa thay kiểm thử chi tiết keyboard, safe area, camera và picker trên thiết bị.
- Metro runtime inspector cũng ghi nhận `host.exp.Exponent (iPhone)` / `React Native Bridgeless [C++ connection]`, cung cấp bằng chứng app native thực sự kết nối chứ không chỉ request manifest từ công cụ.
- Sau khi cache dựng xong, manifest và bundle tunnel SDK 58 cả hai nền tảng đã đạt HTTP 200 (iOS 7.668.516 bytes, Android 8.332.866 bytes tại lượt kiểm).

## Chẩn đoán đã có

- LAN port 8082 không tải được từ Safari/Chrome: đã chuyển tunnel, không sửa firewall.
- `Failed to download remote update`: từng có Android request `/_expo/loading` nhận HTML; dùng QR root để mở manifest.
- `Incompatible SDK version`: log request thật có Android `exposdk:57.0.0`, iOS `exposdk:58.0.0`, project khi đó 54. Đã được người dùng cho phép nâng project lên 58; Android phải cập nhật cùng bản.
- Nếu còn lỗi, cần nội dung Show details/View error log, platform và phiên bản Expo Go; kiểm request thực rồi mới sửa.
