// Operate only the dedicated local QA emulator; never selects a physical device.
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const serial = process.env.ANDROID_QA_SERIAL || 'emulator-5556';
assert.equal(serial, 'emulator-5556', 'This tool is restricted to the dedicated QA emulator');
const root = path.resolve(__dirname, '../../..');
const evidenceBase = path.join(root, 'docs/figma-completion');
const output = process.env.BLUESTEPS_NATIVE_QA_OUTPUT
  ? path.resolve(process.env.BLUESTEPS_NATIVE_QA_OUTPUT)
  : path.join(evidenceBase, 'native-runtime');
assert(
  !path.relative(evidenceBase, output).startsWith('..'),
  'QA evidence must stay in the workspace',
);
const adb = path.join(os.homedir(), 'AppData/Local/Android/Sdk/platform-tools/adb.exe');
const expo = 'exp://127.0.0.1:8092';
const run = (args, binary = false) =>
  execFileSync(adb, ['-s', serial, ...args], {
    windowsHide: true,
    timeout: 25000,
    maxBuffer: 20 * 1024 * 1024,
    encoding: binary ? undefined : 'utf8',
  });
const decode = (value) =>
  value
    .replaceAll('&quot;', '"')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&apos;', "'")
    .replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (entity, code) => {
      const value =
        code[0].toLowerCase() === 'x'
          ? Number.parseInt(code.slice(1), 16)
          : Number.parseInt(code, 10);
      return value <= 0x10ffff ? String.fromCodePoint(value) : entity;
    })
    .replaceAll('&#10;', '\n')
    .replaceAll('&amp;', '&');
function state() {
  // A failed UIAutomator dump leaves the previous file in place during app restart.
  // Never treat that stale hierarchy as evidence that the new screen is ready.
  run(['shell', 'rm', '-f', '/sdcard/bluesteps-qa.xml']);
  run(['shell', 'uiautomator', 'dump', '/sdcard/bluesteps-qa.xml']);
  let xml;
  try {
    xml = run(['shell', 'cat', '/sdcard/bluesteps-qa.xml']);
  } catch {
    return { xml: '', nodes: [] };
  }
  const nodes = [...xml.matchAll(/<node\s+([^>]+)>?/g)].map((match) => {
    const attrs = Object.fromEntries(
      [...match[1].matchAll(/([\w-]+)="(.*?)"/g)].map((entry) => [entry[1], decode(entry[2])]),
    );
    const bounds = (attrs.bounds?.match(/\d+/g) || []).map(Number);
    return { ...attrs, bounds };
  });
  return { xml, nodes };
}
function summary(current) {
  return current.nodes
    .filter((node) => node.text || node['content-desc'])
    .map((node) => ({
      text: node.text,
      label: node['content-desc'],
      bounds: node.bounds,
      checked: node.checked,
      clickable: node.clickable,
      enabled: node.enabled,
    }));
}
function capture(name) {
  assert.match(name, /^[a-z0-9-]+$/);
  fs.mkdirSync(output, { recursive: true });
  const current = state();
  fs.writeFileSync(path.join(output, name + '.xml'), current.xml);
  fs.writeFileSync(path.join(output, name + '.png'), run(['exec-out', 'screencap', '-p'], true));
  console.log(JSON.stringify(summary(current), null, 2));
}
function find(current, label) {
  const candidates = current.nodes.filter(
    (node) => visible(node) && (node['content-desc'] === label || node.text === label),
  );
  const clickable = candidates.filter((node) => node.clickable === 'true');
  const labelled = clickable.filter((node) => node['content-desc'] === label);
  const target = labelled.length ? labelled : clickable.length ? clickable : candidates;
  assert.equal(target.length, 1, `Expected one visible node: ${label}`);
  return target[0];
}
function visible(node) {
  const [left, top, right, bottom] = node.bounds;
  return right > left && bottom > top && bottom > 0 && top < 2400;
}
function tap(label) {
  const end = Date.now() + 60000;
  while (Date.now() < end) {
    const current = state();
    if (
      !current.nodes.some(
        (node) =>
          visible(node) &&
          (node['content-desc'] === label || node.text === label) &&
          node.enabled === 'true',
      )
    )
      continue;
    const target = find(current, label);
    if (target.enabled !== 'true') continue;
    const [left, top, right, bottom] = target.bounds;
    run(['shell', 'input', 'tap', String((left + right) >> 1), String((top + bottom) >> 1)]);
    return;
  }
  capture('failure');
  throw Error('Timed out locating an enabled tap target ' + label);
}
function waitEnabled(label) {
  const end = Date.now() + 60000;
  while (Date.now() < end) {
    if (
      state().nodes.some(
        (node) =>
          visible(node) &&
          node['content-desc'] === label &&
          node.enabled === 'true' &&
          node.clickable === 'true',
      )
    )
      return;
  }
  capture('failure');
  throw Error('Timed out waiting for enabled button ' + label);
}
function fill(label, value) {
  assert.match(value, /^[a-zA-Z0-9@._ -]+$/, 'QA text must be plain ASCII');
  tap(label);
  run(['shell', 'input', 'text', value.replaceAll(' ', '%s')]);
  run(['shell', 'input', 'keyevent', 'KEYCODE_BACK']);
}
function scrollTo(label) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const current = state();
    if (
      current.nodes.some(
        (node) =>
          (node.text === label || node['content-desc'] === label) &&
          node.bounds[3] > node.bounds[1] &&
          node.bounds[1] > 80 &&
          node.bounds[3] < 2000,
      )
    )
      return;
    run(['shell', 'input', 'swipe', '540', '1800', '540', '1000', '350']);
  }
  throw Error('Could not scroll to ' + label);
}
function open(route) {
  run([
    'shell',
    'am',
    'start',
    '-a',
    'android.intent.action.VIEW',
    '-d',
    expo + '/--' + route.replaceAll('&', '\\&'),
    'host.exp.exponent',
  ]);
}
function waitText(text) {
  const end = Date.now() + 60000;
  while (Date.now() < end) {
    const current = state();
    if (
      current.nodes.some(
        (node) =>
          visible(node) && (node.text.includes(text) || node['content-desc'].includes(text)),
      )
    )
      return current;
  }
  capture('failure');
  throw Error('Timed out waiting for ' + text);
}
function expectText(text, name) {
  const current = waitText(text);
  assert(
    current.nodes.some(
      (node) => visible(node) && (node.text.includes(text) || node['content-desc'].includes(text)),
    ),
    `Missing native content: ${text}`,
  );
  assert(!current.nodes.some((node) => /Google|Facebook/.test(node.text + node['content-desc'])));
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, name + '.xml'), current.xml);
  fs.writeFileSync(path.join(output, name + '.png'), run(['exec-out', 'screencap', '-p'], true));
  console.log('PASS ' + name + ': ' + text);
}
const [action = 'capture', value = 'current'] = process.argv.slice(2);
assert.equal(run(['shell', 'getprop', 'sys.boot_completed']).trim(), '1');
assert.equal(run(['emu', 'avd', 'name']).split(/\r?\n/)[0].trim(), 'BlueStepsQA32');
if (action === 'capture') capture(value);
else if (action === 'tap') {
  tap(value);
  capture('after-tap');
} else if (action === 'open') {
  assert.match(value, /^\/[a-z0-9/?=&-]*$/);
  open(value);
} else if (action === 'onboarding') {
  // Start on a fresh install after dismissing the Expo Go developer menu.
  expectText('Một khởi đầu nhỏ.', '01-welcome');
  assert(!state().nodes.some((node) => node['content-desc'] === 'Đã có tài khoản? Đăng nhập'));
  tap('Bắt đầu hành trình');
  expectText('Ít đồ dùng một lần', '02-reduce');
  tap('Tiếp tục');
  expectText('Đồ cũ', '03-reuse');
  tap('Thử phân loại rác');
  expectText('Chai nhựa về đâu?', '04-recycle');
  tap('Tái chế');
  expectText('Đúng rồi!', '04-recycle-correct');
  tap('Để sau');
  expectText('Bạn muốn bắt đầu', '05-interests');
  tap('Phân loại rác');
  tap('Tiếp tục');
  expectText('Bước nhỏ nào', '06-goal');
  tap('Phân loại rác mỗi ngày');
  tap('Chọn mục tiêu này');
  expectText('Một điểm đến gần', '07-nearby');
  tap('Để sau');
  expectText('Một lời nhắc nhẹ', '08-reminders');
  tap('Bỏ qua bước này');
  expectText('Hành trình xanh', '09-ready');
  tap('Đăng nhập');
  expectText('Email', '10-login');
  find(state(), 'Mật khẩu');
  fs.writeFileSync(
    path.join(output, 'onboarding-result.json'),
    JSON.stringify({ passed: true, serial, expo, checkedAt: new Date().toISOString() }, null, 2),
  );
} else if (action === 'integration') {
  assert(process.env.BLUESTEPS_NATIVE_QA_EMAIL && process.env.BLUESTEPS_NATIVE_QA_PASSWORD);
  run(['shell', 'am', 'force-stop', 'host.exp.exponent']);
  open('/login');
  waitText('Email');
  fill('Email', process.env.BLUESTEPS_NATIVE_QA_EMAIL);
  fill('Mật khẩu', process.env.BLUESTEPS_NATIVE_QA_PASSWORD);
  scrollTo('Đăng nhập');
  tap('Đăng nhập');
  waitText('Chào alice!');
  expectText('Chào alice!', '11-authenticated-home');
  open('/statistics');
  waitText('Thống kê loại rác');
  expectText('2 lượt', '12-statistics');
  scrollTo('Thêm mục tiêu');
  tap('Thêm mục tiêu');
  expectText('Mục tiêu mới', '13-target-editor');
  fill('Tên mục tiêu', 'Native target');
  scrollTo('Lưu mục tiêu');
  tap('Lưu mục tiêu');
  waitText('Native target');
  expectText('Native target', '14-target-created');
  open('/achievements');
  waitText('Tham gia bảng xếp hạng');
  expectText('Thành tích', '15-achievements');
  scrollTo('Tham gia bảng xếp hạng');
  tap('Tham gia bảng xếp hạng');
  waitText('Rời bảng xếp hạng');
  expectText('Hạng 1', '16-ranking-joined');
  run(['shell', 'am', 'force-stop', 'host.exp.exponent']);
  open('/statistics');
  waitText('Thống kê loại rác');
  expectText('2 lượt', '17-restored-session');
  scrollTo('Native target');
  expectText('Native target', '18-restored-target');
  fs.writeFileSync(
    path.join(output, 'integration-result.json'),
    JSON.stringify({ passed: true, serial, expo, checkedAt: new Date().toISOString() }, null, 2),
  );
} else if (action === 'scan') {
  open('/scan');
  waitText('Quét và phân loại'); // Proves this is the new flow, not a stale Metro bundle.
  tap('Mở camera');
  const permission = state().nodes.some(
    (node) => node['content-desc'] === 'Cho phép dùng camera' && visible(node),
  );
  if (permission) {
    tap('Cho phép dùng camera');
    waitText('While using the app');
    tap('While using the app');
  }
  waitEnabled('Chụp ảnh');
  expectText('Chụp ảnh', '19-camera-ready');
  tap('Chụp ảnh');
  expectText('Quét thành công!', '20-scan-success');
  tap('Xem kết quả');
  expectText('Chai nhựa', '20-scan-photo');
  tap('Chi tiết');
  expectText('Kết quả quét rác', '21-scan-details');
  scrollTo('Tích điểm xanh');
  tap('Tích điểm xanh');
  expectText('Xác nhận phân loại', '22-scan-confirm');
  tap('Để sau');
  scrollTo('Tích điểm xanh');
  tap('Tích điểm xanh');
  waitText('Xác nhận đã phân loại');
  tap('Xác nhận đã phân loại');
  expectText('Bạn nhận được 5 điểm', '23-scan-reward');
  tap('Đóng kết quả nhận điểm');
  fs.writeFileSync(
    path.join(output, 'scan-result.json'),
    JSON.stringify(
      { passed: true, serial, input: 'camera', checkedAt: new Date().toISOString() },
      null,
      2,
    ),
  );
} else if (action === 'scan-restore') {
  const scanId = process.env.BLUESTEPS_NATIVE_QA_SCAN_ID;
  assert.match(scanId || '', /^[a-f0-9-]{36}$/);
  run(['shell', 'am', 'force-stop', 'host.exp.exponent']);
  open('/scan?scanId=' + scanId);
  waitText('Lần quét này đã được xác nhận.');
  scrollTo('Xem kết quả nhận điểm');
  tap('Xem kết quả nhận điểm');
  expectText('Bạn nhận được 5 điểm', '24-scan-restored');
  tap('Trở về trang chủ');
  expectText('Chào alice!', '25-scan-home');
} else if (action === 'planner') {
  const routeId = process.env.BLUESTEPS_NATIVE_QA_ROUTE_ID,
    first = process.env.BLUESTEPS_NATIVE_QA_POINT_NAME,
    second = process.env.BLUESTEPS_NATIVE_QA_SECOND_POINT_NAME;
  assert.match(routeId || '', /^[a-f0-9-]{36}$/);
  assert(first && second);
  fs.rmSync(path.join(output, 'planner-result.json'), { force: true });
  run(['shell', 'am', 'force-stop', 'host.exp.exponent']);
  open('/login');
  waitText('Email');
  fill('Email', process.env.BLUESTEPS_NATIVE_QA_EMAIL);
  fill('Mật khẩu', process.env.BLUESTEPS_NATIVE_QA_PASSWORD);
  scrollTo('Đăng nhập');
  tap('Đăng nhập');
  waitText('Chào alice!');
  open('/collection-replacement?id=' + routeId);
  waitText('Hôm nay bạn mang theo gì?');
  tap('Nhựa');
  scrollTo('Đổi thứ tự ' + second);
  const a = find(state(), 'Đổi thứ tự ' + first).bounds,
    b = find(state(), 'Đổi thứ tự ' + second).bounds;
  run([
    'shell',
    'input',
    'swipe',
    String((a[0] + a[2]) >> 1),
    String((a[1] + a[3]) >> 1),
    String((b[0] + b[2]) >> 1),
    String((b[1] + b[3]) >> 1),
    '900',
  ]);
  expectText('Đã chuyển ' + first + ' đến vị trí 2.', '01-native-drag');
  scrollTo('Xe máy');
  tap('Xe máy');
  scrollTo('Lưu điểm dừng và phương tiện');
  tap('Lưu điểm dừng và phương tiện');
  waitText('Chi tiết hành trình');
  run(['shell', 'am', 'force-stop', 'host.exp.exponent']);
  open('/collection-replacement?id=' + routeId);
  waitText('Hôm nay bạn mang theo gì?');
  assert.equal(find(state(), 'Nhựa').selected, 'true');
  scrollTo('Đổi thứ tự ' + first);
  assert(
    find(state(), 'Đổi thứ tự ' + second).bounds[1] <
      find(state(), 'Đổi thứ tự ' + first).bounds[1],
  );
  expectText(first, '02-native-order-restored');
  // Return to the origin controls above the stop list.
  for (let i = 0; i < 3; i++) run(['shell', 'input', 'swipe', '540', '700', '540', '1800', '350']);
  tap('Đổi vị trí xuất phát');
  fill('Vĩ độ xuất phát', '16.069');
  fill('Kinh độ xuất phát', '108.219');
  scrollTo('Bắt đầu hành trình • 2 điểm');
  tap('Bắt đầu hành trình • 2 điểm');
  waitText('Đang chỉ đường');
  waitText('Bản đồ điểm thu gom đã tải');
  expectText('Đang chỉ đường', '03-native-planner-start');
  fs.writeFileSync(
    path.join(output, 'planner-result.json'),
    JSON.stringify({ passed: true, serial, checkedAt: new Date().toISOString() }, null, 2),
  );
} else if (action === 'routing') {
  fs.rmSync(path.join(output, 'routing-result.json'), { force: true });
  const routeId = process.env.BLUESTEPS_NATIVE_QA_ROUTE_ID;
  assert.match(routeId || '', /^[a-f0-9-]{36}$/);
  assert(process.env.BLUESTEPS_NATIVE_QA_EMAIL && process.env.BLUESTEPS_NATIVE_QA_PASSWORD);
  run(['shell', 'am', 'force-stop', 'host.exp.exponent']);
  open('/login');
  waitText('Email');
  fill('Email', process.env.BLUESTEPS_NATIVE_QA_EMAIL);
  fill('Mật khẩu', process.env.BLUESTEPS_NATIVE_QA_PASSWORD);
  scrollTo('Đăng nhập');
  tap('Đăng nhập');
  waitText('Chào alice!');
  open('/collection-directions?routeId=' + routeId);
  waitText('Xe máy');
  tap('Xe máy');
  tap('Đổi vị trí xuất phát');
  fill('Vĩ độ xuất phát', '16.069');
  fill('Kinh độ xuất phát', '108.219');
  scrollTo('Tính tuyến đường');
  tap('Tính tuyến đường');
  scrollTo('Bắt đầu chỉ đường');
  expectText('Bắt đầu chỉ đường', '01-route-preview');
  tap('Bắt đầu chỉ đường');
  waitText('Đang chỉ đường');
  waitText('Bản đồ điểm thu gom đã tải');
  expectText('Đang chỉ đường', '02-navigation');
  run(['emu', 'geo', 'fix', '108.219', '16.069']);
  scrollTo('Theo dõi vị trí khi chỉ đường');
  tap('Theo dõi vị trí khi chỉ đường');
  const permission = state().nodes.some((node) => node.text === 'While using the app');
  if (permission) tap('While using the app');
  run(['emu', 'geo', 'fix', '108.219', '16.069']);
  waitEnabled('Tính lại từ vị trí hiện tại');
  expectText('Theo dõi vị trí khi chỉ đường', '03-navigation-gps');
  run(['shell', 'am', 'force-stop', 'host.exp.exponent']);
  open('/collection-navigation?id=' + routeId);
  waitText('Đang chỉ đường');
  waitText('Bản đồ điểm thu gom đã tải');
  expectText('Đang chỉ đường', '04-navigation-restored');
  fs.writeFileSync(
    path.join(output, 'routing-result.json'),
    JSON.stringify({ passed: true, serial, expo, checkedAt: new Date().toISOString() }, null, 2),
  );
} else if (action === 'chat') {
  const conversation = process.env.BLUESTEPS_NATIVE_QA_CONVERSATION_ID;
  assert.match(conversation || '', /^[a-f0-9-]{36}$/);
  run(['shell', 'am', 'force-stop', 'host.exp.exponent']);
  open('/login');
  waitText('Email');
  fill('Email', process.env.BLUESTEPS_NATIVE_QA_EMAIL);
  fill('Mật khẩu', process.env.BLUESTEPS_NATIVE_QA_PASSWORD);
  scrollTo('Đăng nhập');
  tap('Đăng nhập');
  waitText('Chào alice!');
  open('/conversation?id=' + conversation);
  expectText('Native incoming chat', '42-chat-incoming');
  tap('Chọn emoji');
  waitEnabled('Chèn emoji 💚');
  tap('Chèn emoji 💚');
  tap('Gửi tin nhắn');
  expectText('💚', '43-chat-emoji-sent');
  tap('Đính kèm');
  waitEnabled('Chụp ảnh');
  tap('Chụp ảnh');
  waitText('Chụp ảnh cho tin nhắn');
  waitEnabled('Chụp ảnh');
  tap('Chụp ảnh');
  waitEnabled('Gửi tin nhắn từ xem trước');
  expectText('chat-camera.jpg', '44-chat-camera-preview');
  tap('Gửi tin nhắn từ xem trước');
  waitText('chat-camera.jpg');
  tap('Ghi âm');
  expectText('Chức năng ghi âm hiện chưa được bật.', '44-chat-recording-placeholder');
  tap('Đóng');
  run(['shell', 'am', 'force-stop', 'host.exp.exponent']);
  open('/conversation?id=' + conversation);
  expectText('chat-camera.jpg', '45-chat-restored');
  fs.writeFileSync(
    path.join(output, 'chat-result.json'),
    JSON.stringify({ passed: true, serial, checkedAt: new Date().toISOString() }, null, 2),
  );
} else if (action === 'composer') {
  const pointName = process.env.BLUESTEPS_NATIVE_QA_POINT_NAME;
  assert(pointName);
  run(['shell', 'am', 'force-stop', 'host.exp.exponent']);
  open('/login');
  // Expo Go can restore its previous screen on cold launch before Router receives the URI.
  // Observe a loaded app surface, then deliver the login route to the running project.
  const launchEnd = Date.now() + 60000;
  let loaded = false;
  while (Date.now() < launchEnd) {
    if (
      state().nodes.some(
        (node) =>
          visible(node) &&
          node.package === 'host.exp.exponent' &&
          !!node['content-desc'] &&
          node['content-desc'] !== 'Tools',
      )
    ) {
      loaded = true;
      break;
    }
  }
  assert(loaded, 'The Expo Go project must load before opening the login route');
  open('/login');
  waitText('Email');
  fill('Email', process.env.BLUESTEPS_NATIVE_QA_EMAIL);
  fill('Mật khẩu', process.env.BLUESTEPS_NATIVE_QA_PASSWORD);
  scrollTo('Đăng nhập');
  tap('Đăng nhập');
  waitText('Chào alice!');
  open('/compose');
  waitText('Nội dung bài viết');
  fill('Nội dung bài viết', 'Native composer post');
  tap('Công khai');
  waitEnabled('Bạn bè');
  tap('Bạn bè');
  scrollTo('Cảm xúc');
  capture('36-composer-before-emotion');
  tap('Cảm xúc');
  capture('36-composer-emotions-open');
  waitEnabled('😊 Hạnh phúc');
  tap('😊 Hạnh phúc');
  scrollTo('Check in');
  tap('Check in');
  waitEnabled(pointName);
  tap(pointName);
  scrollTo('Camera');
  tap('Camera');
  waitText('Chụp ảnh cho bài viết');
  waitEnabled('Chụp ảnh');
  expectText('Chụp ảnh cho bài viết', '36-composer-camera');
  tap('Chụp ảnh');
  waitText('camera.jpg');
  scrollTo('Gỡ tệp camera.jpg');
  waitEnabled('Gỡ tệp camera.jpg');
  scrollTo('Lưu bản nháp');
  tap('Lưu bản nháp');
  expectText('Đã lưu bản nháp trong tài khoản', '37-composer-saved');
  run(['shell', 'am', 'force-stop', 'host.exp.exponent']);
  open('/compose');
  waitText('Native composer post');
  scrollTo('Ảnh bài viết camera.jpg');
  expectText('Ảnh bài viết camera.jpg', '38-composer-restored');
  scrollTo('Xem trước');
  tap('Xem trước');
  expectText('Xem trước bài viết', '39-composer-preview');
  scrollTo('Đăng bài viết từ xem trước');
  tap('Đăng bài viết từ xem trước');
  expectText('Đăng bài thành công', '40-composer-published');
  tap('Xem bài viết');
  expectText('Native composer post', '41-composer-discussion');
  fs.writeFileSync(
    path.join(output, 'composer-result.json'),
    JSON.stringify({ passed: true, serial, checkedAt: new Date().toISOString() }, null, 2),
  );
} else if (action === 'community') {
  const memberId = process.env.BLUESTEPS_NATIVE_QA_MEMBER_ID;
  assert.match(memberId || '', /^[a-f0-9-]{36}$/);
  run(['shell', 'am', 'force-stop', 'host.exp.exponent']);
  open('/login');
  waitText('Email');
  fill('Email', process.env.BLUESTEPS_NATIVE_QA_EMAIL);
  fill('Mật khẩu', process.env.BLUESTEPS_NATIVE_QA_PASSWORD);
  scrollTo('Đăng nhập');
  tap('Đăng nhập');
  waitText('Chào alice!');
  open('/community?view=members&q=bob');
  waitEnabled('bob');
  expectText('bob', '30-community-members');
  tap('bob');
  waitEnabled('+ Theo dõi');
  tap('+ Theo dõi');
  expectText('1 người theo dõi', '31-community-followed');
  run(['shell', 'am', 'force-stop', 'host.exp.exponent']);
  open('/community?member=' + memberId);
  expectText('✓ Đang theo dõi', '32-community-restored');
  open('/community?view=following');
  waitText('Native community post');
  scrollTo('Tùy chọn bài đăng');
  tap('Tùy chọn bài đăng');
  waitEnabled('Sao chép liên kết');
  tap('Sao chép liên kết');
  expectText('Đã sao chép liên kết', '33-community-options');
  tap('Lưu bài đăng');
  open('/community?view=saved');
  waitText('Native community post');
  scrollTo('Tùy chọn bài đăng');
  tap('Tùy chọn bài đăng');
  waitEnabled('Ẩn bài đăng');
  tap('Ẩn bài đăng');
  waitText('Chưa có bài viết');
  open('/community?view=hidden');
  waitText('Native community post');
  scrollTo('Tùy chọn bài đăng');
  tap('Tùy chọn bài đăng');
  waitEnabled('Hiện lại bài đăng');
  tap('Hiện lại bài đăng');
  waitText('Chưa có bài viết đã ẩn');
  open('/community?view=saved');
  waitText('Native community post');
  scrollTo('Tùy chọn bài đăng');
  tap('Tùy chọn bài đăng');
  waitEnabled('Bỏ lưu bài đăng');
  tap('Bỏ lưu bài đăng');
  waitText('Chưa có bài viết');
  open('/community?member=' + memberId);
  waitEnabled('Chặn thành viên');
  tap('Chặn thành viên');
  scrollTo('Xác nhận chặn thành viên');
  tap('Xác nhận chặn thành viên');
  waitText('Cộng đồng');
  open('/community?view=blocked');
  waitEnabled('Bỏ chặn bob');
  expectText('bob', '34-community-blocked');
  tap('Bỏ chặn bob');
  waitText('Chưa có thành viên đã chặn');
  open('/community?member=' + memberId);
  expectText('+ Theo dõi', '35-community-unblocked');
  fs.writeFileSync(
    path.join(output, 'community-result.json'),
    JSON.stringify({ passed: true, serial, checkedAt: new Date().toISOString() }, null, 2),
  );
} else if (action === 'handbook') {
  open('/handbook/category/recycle');
  waitText('Cách xử lý Rác tái chế');
  tap('Cách xử lý Rác tái chế');
  expectText('Cách xử lý:', '26-handbook-category');
  tap('Đóng cách xử lý');
  open('/handbook/types/plastic');
  waitText('Chi tiết PET');
  tap('Chi tiết PET');
  expectText('Ví dụ: Chai đồ uống', '27-handbook-pet');
  open('/handbook/list?kind=plastic&query=PET');
  waitText('Chai nhựa PET');
  tap('Chai nhựa PET');
  waitText('Xem điều không nên làm');
  tap('Xem điều không nên làm');
  expectText('Không mặc định mọi loại nhựa', '28-handbook-donts');
  assert(
    state().nodes.some(
      (node) => node['content-desc'] === 'Xem điều không nên làm' && node.checked === 'true',
    ),
  );
  for (const [kind, title] of [
    ['medical', 'Phân loại chất thải y tế'],
    ['bag', 'Các loại túi và màng phổ biến'],
    ['battery', 'Các loại pin thường gặp'],
  ]) {
    open('/handbook/types/' + kind);
    expectText(title, '29-handbook-' + kind);
  }
  fs.writeFileSync(
    path.join(output, 'handbook-result.json'),
    JSON.stringify({ passed: true, serial, checkedAt: new Date().toISOString() }, null, 2),
  );
} else throw Error('Unknown QA action');
