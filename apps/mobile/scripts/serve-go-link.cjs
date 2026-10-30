const http = require('node:http');
const os = require('node:os');
const sdkMajor = require('expo/package.json').version.split('.')[0];

// HTTP landing link is recognized by camera apps that do not offer exp:// QR actions.
const addresses = Object.values(os.networkInterfaces()).flat().filter(Boolean);
const lan = addresses.find((address) => address.family === 'IPv4' && !address.internal)?.address;
if (!lan) throw new Error('No LAN IPv4 address found. Connect to Wi-Fi before starting.');
const expoUrl = `exp://${lan}:8081`;
const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Mở BlueSteps trong Expo Go</title><style>body{font:18px/1.6 system-ui;background:#f3fafe;color:#164561;max-width:540px;margin:40px auto;padding:24px}a{display:block;padding:18px;border-radius:16px;background:#1176b6;color:white;text-align:center;text-decoration:none;font-weight:700}code{overflow-wrap:anywhere}p{margin:24px 0}</style><h1>BlueSteps Demo</h1><p>Trang này tải được nghĩa là điện thoại đã kết nối được máy tính qua LAN.</p><a href="${expoUrl}">Mở bằng Expo Go</a><p>Cần Expo Go hỗ trợ SDK ${sdkMajor}. Nếu không tự mở, sao chép địa chỉ sau vào mục nhập URL trong Expo Go:</p><code>${expoUrl}</code><p>Giữ Metro đang chạy trên máy tính. Mock data có sẵn, không cần tài khoản BlueSteps.</p></html>`;
http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(html);
  })
  .listen(8082, '0.0.0.0', () =>
    process.stdout.write(`Expo Go launch page: http://${lan}:8082\nApp: ${expoUrl}\n`),
  );
