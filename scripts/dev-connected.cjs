const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { isIPv4, createServer } = require('node:net');
const { warmExpoBundles } = require('./expo-ready.cjs');

const root = path.resolve(__dirname, '..');
const apiDirectory = path.join(root, 'apps/api');
const python = path.join(
  apiDirectory,
  process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python',
);
const children = [];
const tunnel = process.argv.includes('--tunnel');
const native = process.argv.includes('--go') || tunnel;
const addresses = Object.entries(os.networkInterfaces()).flatMap(([name, entries]) =>
  (entries ?? [])
    .filter((entry) => entry.family === 'IPv4' && !entry.internal)
    .map((entry) => ({ name, address: entry.address })),
);
const lan =
  process.env.BLUESTEPS_DEV_HOST ??
  addresses.find((entry) => /wi-fi|wifi|wlan|en0|ethernet|eth0/i.test(entry.name))?.address ??
  addresses.find((entry) => !/virtual|vethernet|vmware|docker|vpn|wsl/i.test(entry.name))?.address;
const apiUrl = native && !tunnel ? `http://${lan}:8000` : 'http://127.0.0.1:8000';
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue;
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
    } else child.kill('SIGTERM');
  }
  process.exit(code);
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

function start(command, args, cwd, env = process.env) {
  const child = spawn(command, args, { cwd, env, stdio: 'inherit', windowsHide: true });
  children.push(child);
  child.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on('exit', (code) => {
    if (!stopping) stop(code ?? 1);
  });
  return child;
}

async function healthStatus(baseUrl = 'http://127.0.0.1:8000') {
  try {
    const response = await fetch(`${baseUrl}/health/ready`, {
      signal: AbortSignal.timeout(10_000),
    });
    return response.status;
  } catch {
    return null;
  }
}

async function ready(baseUrl = 'http://127.0.0.1:8000') {
  return (await healthStatus(baseUrl)) === 200;
}

const notReady =
  'API chưa ready. Kiểm tra kết nối, migration và role runtime. ' +
  'Áp dụng migration bằng pnpm api:migrate (local) hoặc pnpm api:migrate --allow-remote (Supabase).';

async function main() {
  if (native && !tunnel && (!lan || !isIPv4(lan))) {
    throw new Error('Không tìm thấy IPv4 LAN. Kết nối Wi-Fi hoặc đặt BLUESTEPS_DEV_HOST.');
  }
  if (!fs.existsSync(python) || !fs.existsSync(path.join(apiDirectory, '.env'))) {
    throw new Error('Thiếu môi trường backend. Xem apps/api/README.md để tạo .venv và .env.');
  }
  const expoHosts = [...new Set(['127.0.0.1', lan].filter(Boolean))];
  const active = await Promise.all(
    expoHosts.map((host) =>
      fetch(`http://${host}:8081/status`, { signal: AbortSignal.timeout(1500) }).then(
        () => true,
        () => false,
      ),
    ),
  );
  if (active.some(Boolean)) {
    throw new Error(
      'Expo cổng 8081 đang chạy. Dùng QR hiện có hoặc dừng phiên cũ bằng Ctrl+C trước khi chạy lại.',
    );
  }
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', () =>
      reject(
        new Error(
          'Cổng Expo 8081 đang được sử dụng. Dừng phiên BlueSteps cũ bằng Ctrl+C trước khi chạy lại.',
        ),
      ),
    );
    probe.listen(8081, '0.0.0.0', () => probe.close(resolve));
  });
  const status = await healthStatus();
  if (status === 503) throw new Error(notReady);
  if (status !== 200) {
    // Start only this workspace's existing portable development cluster, if configured for it.
    const database = spawnSync(
      python,
      [
        '-c',
        `
from pathlib import Path
import subprocess
from sqlalchemy.engine import make_url
from bluesteps_api.config import Settings
from bluesteps_api.db import make_engine
settings = Settings()
url = make_url(settings.database_url.get_secret_value())
root = Path.cwd().parents[1]
binary = root / '.backend-tools/package/native/bin/pg_ctl.exe'
data = root / '.backend-tools/pgdata'
if url.host in ('localhost','127.0.0.1') and url.port == 55432 and binary.exists() and data.exists():
    if subprocess.run([str(binary),'-D',str(data),'status'],capture_output=True).returncode != 0:
        subprocess.run([str(binary),'-D',str(data),'-l',str(root / '.backend-tools/postgres.log'),'-o','-h 127.0.0.1 -p 55432','-w','start'],check=True)
try:
    engine = make_engine(settings)
    with engine.connect() as connection:
        connection.exec_driver_sql('select 1')
    engine.dispose()
except Exception:
    raise SystemExit('Database chưa kết nối được. Kiểm tra PostgreSQL và cấu hình backend .env.')
`,
      ],
      { cwd: apiDirectory, stdio: 'inherit', windowsHide: true },
    );
    if (database.status !== 0) throw new Error('Không khởi động API vì database chưa sẵn sàng.');
    start(
      python,
      [
        '-m',
        'uvicorn',
        'bluesteps_api.main:app',
        '--host',
        native && !tunnel ? '0.0.0.0' : '127.0.0.1',
        '--port',
        '8000',
        '--reload',
      ],
      apiDirectory,
    );
    let connected = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      if (await ready()) {
        connected = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!connected) throw new Error(notReady);
  }
  if (native && !tunnel && !(await ready(apiUrl))) {
    throw new Error(
      'API cổng 8000 đang chỉ mở localhost hoặc LAN bị chặn. Dừng phiên pnpm dev:connected cũ rồi chạy lại pnpm go:connected.',
    );
  }
  console.log(`Database → API: kết nối thành công tại ${apiUrl}`);
  // Outbox leases permit multiple workers; this launcher owns and stops only its own worker.
  start(python, ['-m', 'bluesteps_api.worker'], apiDirectory);
  const expo = require.resolve('expo/bin/cli', { paths: [path.join(root, 'apps/mobile')] });
  start(
    process.execPath,
    [
      expo,
      'start',
      ...(tunnel ? ['--go', '--tunnel'] : native ? ['--go', '--lan'] : ['--web']),
      ...(process.argv.includes('--clear') ? ['--clear'] : []),
      '--port',
      '8081',
    ],
    path.join(root, 'apps/mobile'),
    {
      ...process.env,
      EXPO_PUBLIC_API_URL: tunnel ? '' : apiUrl,
      BLUESTEPS_DEV_API_PROXY: tunnel ? '1' : '0',
      REACT_NATIVE_PACKAGER_HOSTNAME: native && !tunnel ? lan : '',
    },
  );
  console.log(
    tunnel
      ? 'Expo Go tunnel: dùng URL/QR HTTPS mới do Expo in bên dưới. Bundle và API dùng chung tunnel; iPhone cần đăng nhập cùng tài khoản Expo với CLI.'
      : native
        ? `Expo Go: exp://${lan}:8081 — Quét QR trong terminal bằng điện thoại cùng Wi-Fi.\nAPI điện thoại: ${apiUrl}/health/ready\nKiểm tra LAN trên điện thoại: http://${lan}:8081/status — cần hiện packager-status:running. Nếu không tải được, dừng phiên này rồi chạy pnpm go:tunnel:connected.`
        : 'Frontend development: http://localhost:8081 — Ctrl+C để dừng các process của lệnh này.',
  );
  if (tunnel) {
    console.log(
      'Đang chuẩn bị bundle Android/iOS qua localhost; chờ thông báo sẵn sàng rồi quét QR.',
    );
    await warmExpoBundles();
    console.log('Bundle Android/iOS đã sẵn sàng. Quét QR tunnel mới ở trên bằng Expo Go.');
  }
}
main().catch((error) => {
  console.error(error.message);
  stop(1);
});
