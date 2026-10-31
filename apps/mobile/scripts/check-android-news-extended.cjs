const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Run against an already booted, dedicated QA emulator and a running Expo Go server.
// No account, real device permissions, or backend commands are used by this suite.
const root = path.resolve(__dirname, '../../..');
const adb =
  process.env.ADB_PATH ||
  path.join(
    process.env.ANDROID_HOME || path.join(os.homedir(), 'AppData/Local/Android/Sdk'),
    'platform-tools',
    process.platform === 'win32' ? 'adb.exe' : 'adb',
  );
const serial = process.env.ANDROID_SERIAL || 'emulator-5556';
const expoUrl = process.env.EXPO_QA_URL || 'exp://127.0.0.1:8091';
assert.match(
  expoUrl,
  /^exp:\/\/(?:127\.0\.0\.1|localhost|10\.0\.2\.2):\d+$/,
  'Use the local Expo QA server',
);
const qaPort = new URL(expoUrl).port;
const output = path.join(root, 'docs/ui-progress-evidence-2026-10-31', 'native-news-extended');
fs.mkdirSync(output, { recursive: true });
const results = [];
const screenshots = [];
const environmentNotes = [];
const run = (args, binary = false) =>
  execFileSync(adb, ['-s', serial, ...args], {
    windowsHide: true,
    timeout: 25000,
    maxBuffer: 20 * 1024 * 1024,
    encoding: binary ? undefined : 'utf8',
  });
const decode = (text) =>
  text
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&#10;', '\n');
let dumpNumber = 0;
function state() {
  const file = `/sdcard/bluesteps-ui-${++dumpNumber}.xml`;
  run(['shell', 'uiautomator', 'dump', file]);
  const xml = run(['shell', 'cat', file]);
  run(['shell', 'rm', file]);
  assert(xml.includes('<hierarchy'), 'Native accessibility dump is missing');
  const nodes = [...xml.matchAll(/<node\s+([^>]+)>?/g)].map((match) => {
    const attrs = Object.fromEntries(
      [...match[1].matchAll(/([\w-]+)=(["'])(.*?)\2/g)].map((entry) => [
        entry[1],
        decode(entry[3]),
      ]),
    );
    const [left, top, right, bottom] = (attrs.bounds?.match(/\d+/g) || []).map(Number);
    return { ...attrs, left, top, right, bottom, visible: right > left && bottom > top };
  });
  return { xml, nodes };
}
const find = (current, label) =>
  current.nodes.find(
    (node) =>
      node.visible &&
      (typeof label === 'string'
        ? node['content-desc'] === label
        : label.test(node['content-desc'])),
  ) ||
  current.nodes.find(
    (node) =>
      node.visible && (typeof label === 'string' ? node.text === label : label.test(node.text)),
  );
function waitFor(label, timeout = 25000) {
  const until = Date.now() + timeout;
  let last;
  do {
    try {
      last = state();
      if (find(last, label)) return last;
      // The headless emulator can display an Android System UI ANR at boot.
      // Dismiss only that OS dialog; an app ANR must still fail this suite.
      if (find(last, "System UI isn't responding")) {
        const wait = find(last, 'Wait');
        if (wait) {
          environmentNotes.push('Android System UI boot timeout: chose Wait');
          run([
            'shell',
            'input',
            'tap',
            String(Math.round((wait.left + wait.right) / 2)),
            String(Math.round((wait.top + wait.bottom) / 2)),
          ]);
        }
      }
    } catch (error) {
      last = { error: error.message };
    }
  } while (Date.now() < until);
  fs.writeFileSync(path.join(output, 'failure-state.json'), JSON.stringify(last, null, 2));
  throw Error(`Native UI not ready: ${label}`);
}
function tap(label) {
  const node = find(waitFor(label), label);
  run([
    'shell',
    'input',
    'tap',
    String(Math.round((node.left + node.right) / 2)),
    String(Math.round((node.top + node.bottom) / 2)),
  ]);
}
function open(route, ready) {
  run([
    'shell',
    'am',
    'start',
    '-a',
    'android.intent.action.VIEW',
    '-d',
    `${expoUrl}/--${route.replaceAll('&', '\\&')}`,
    'host.exp.exponent',
  ]);
  // Expo Go can briefly expose the previous route while handling a deep link.
  run(['shell', 'sleep', '2']);
  waitFor(ready);
  run(['shell', 'sleep', '3']);
  return waitFor(ready);
}
function capture(name, current = state()) {
  // Accessibility text can appear before Expo Go finishes loading original media.
  run(['shell', 'sleep', '3']);
  current = state();
  fs.writeFileSync(path.join(output, `${name}.xml`), current.xml);
  fs.writeFileSync(path.join(output, `${name}.png`), run(['exec-out', 'screencap', '-p'], true));
  screenshots.push(name);
}
function swipe() {
  run(['shell', 'input', 'swipe', '540', '1800', '540', '1200', '400']);
}
function scrollTo(label) {
  for (let index = 0; index < 12; index++) {
    const current = state();
    if (find(current, label)) return current;
    swipe();
  }
  throw Error(`Could not scroll to ${label}`);
}
function check(name, work) {
  process.stdout.write(`Android QA: ${name}\n`);
  work();
  results.push({ name, passed: true });
}

const input = (value) => run(['shell', 'input', 'text', value.replaceAll(' ', '%s')]);
const geometry = [];
const layouts = JSON.parse(
  fs.readFileSync(path.join(root, 'docs/figma-fidelity/news-extended-layout-source.json'), 'utf8'),
);
const resource = (current, id) =>
  current.nodes.find(
    (node) =>
      node.visible && (node['resource-id'] === id || node['resource-id']?.endsWith('/' + id)),
  );
function asset(current, id, width, height, frame) {
  const node = resource(current, id);
  assert(node, 'Missing native asset slot: ' + id);
  const expected = [(width * 1080) / 428, (height * 1080) / 428];
  const actual = [node.right - node.left, node.bottom - node.top];
  assert(
    actual.every((value, index) => Math.abs(value - expected[index]) <= 3),
    'Native asset dimensions: ' + id + ' ' + actual + ' vs ' + expected,
  );
  geometry.push({
    frame,
    id,
    sourceSlot: [width, height],
    actual: [node.left, node.top, ...actual],
    expectedSize: expected,
    tolerancePhysicalPixels: 3,
    passed: true,
  });
}
function navigation(current, frame) {
  const scale = 1080 / 428;
  const source = layouts[frame].navigation.filter((item) => item.key !== 'imgLine1');
  const anchor = resource(current, 'news-extended-nav-imgGroup36731');
  assert(anchor, 'Navigation image slots must be exposed for native measurement');
  const origin = anchor.top - source.find((item) => item.key === 'imgGroup36731').y * scale;
  for (const slot of source) {
    const id = 'news-extended-nav-' + slot.key;
    const node = resource(current, id);
    assert(node, 'Missing navigation asset: ' + id);
    const expected = [slot.x * scale, origin + slot.y * scale, slot.w * scale, slot.h * scale];
    const actual = [node.left, node.top, node.right - node.left, node.bottom - node.top];
    assert(
      actual.every((value, index) => Math.abs(value - expected[index]) <= 3),
      'Navigation source geometry: ' + id + ' ' + actual + ' vs ' + expected,
    );
    geometry.push({ frame, id, expected, actual, tolerancePhysicalPixels: 3, passed: true });
  }
}
const originalFont = run(['shell', 'settings', 'get', 'system', 'font_scale']).trim();
try {
  assert.equal(run(['get-state']).trim(), 'device');
  assert.equal(
    run(['shell', 'getprop', 'ro.kernel.qemu']).trim(),
    '1',
    'Use the dedicated QA emulator',
  );
  run(['reverse', 'tcp:' + qaPort, 'tcp:' + qaPort]);
  run(['logcat', '-c']);
  run(['shell', 'settings', 'put', 'system', 'font_scale', '1.0']);
  run(['shell', 'am', 'force-stop', 'host.exp.exponent']);
  run([
    'shell',
    'am',
    'start',
    '-a',
    'android.intent.action.VIEW',
    '-d',
    expoUrl + '?__expo_disable_fab=1\\&__expo_disable_onboarding=1',
    'host.exp.exponent',
  ]);
  waitFor('Hồ sơ cá nhân', 60000);
  check(
    'search matches accents, recovers empty results and carries its query into the grid',
    () => {
      let current = open('/articles/search?preview=1', '3 bài viết');
      capture('qa-news-680-5343', current);
      current = state();
      for (const id of ['daily-waste', 'storm-cleanup', 'saigon-cleanup'])
        asset(current, 'news-search-cover-' + id, 116, 92, '680:5343');
      navigation(current, '680:5343');
      tap('Xóa từ khóa tìm kiếm');
      tap('Tìm kiếm tin tức');
      input('khong co bai nay');
      run(['shell', 'input', 'keyevent', '4']);
      capture('qa-news-search-empty', waitFor('Không tìm thấy bài viết'));
      tap('Xóa từ khóa');
      waitFor('3 bài viết');
      tap('Tìm tái chế');
      waitFor('1 bài viết');
      tap('Đọc Mỗi ngày, thế giới thải ra khoảng 11 triệu tấn rác');
      waitFor('Xem thêm bài viết');
      tap('Quay lại');
      waitFor('1 bài viết');
      scrollTo('Xem dạng lưới');
      tap('Xem dạng lưới');
      current = waitFor('Tìm bài viết');
      assert(
        current.nodes.some((node) => node.text === 'tái chế'),
        'The grid must retain the submitted query',
      );
      capture('qa-news-search-grid', current);
    },
  );
  check('reading preview removes only after confirmation and leaves the primary list empty', () => {
    let current = open('/articles/reading-list?preview=1', 'Bạn đã lưu 4 bài viết');
    capture('qa-news-680-5406', current);
    current = state();
    asset(current, 'news-reading-featured-cover', 352, 139, '680:5406');
    navigation(current, '680:5406');
    swipe();
    current = state();
    asset(current, 'news-reading-cover-saigon-cleanup', 116, 92, '680:5406');
    asset(current, 'news-reading-cover-local-cleanup', 116, 92, '680:5406');
    capture('qa-news-reading-body', current);
    open('/articles/reading-list?preview=1&reset=1', 'Bạn đã lưu 4 bài viết');
    run(['shell', 'input', 'swipe', '540', '500', '540', '1800', '400']);
    tap('Bỏ lưu bài Cùng nhau trả lại bờ biển trong lành');
    capture('qa-news-reading-confirm', waitFor('Bỏ bài khỏi danh sách đọc?'));
    tap('Giữ bài đã lưu');
    waitFor('Bạn đã lưu 4 bài viết');
    tap('Bỏ lưu bài Cùng nhau trả lại bờ biển trong lành');
    tap('Xác nhận bỏ lưu bài đọc');
    capture('qa-news-reading-removed', waitFor('Bạn đã lưu 3 bài viết'));
    open('/articles/reading-list', 'Chưa có bài viết đã lưu');
  });
  check('event preview saves separately and opens the original interest confirmation', () => {
    let current = open('/articles/events/nhieu-loc?preview=1', 'Lưu sự kiện xanh');
    capture('qa-news-680-5461', current);
    current = state();
    asset(current, 'news-event-cover-viewport', 428, 263, '680:5461');
    navigation(current, '680:5461');
    tap('Lưu sự kiện xanh');
    waitFor('Bỏ lưu sự kiện xanh');
    swipe();
    scrollTo('Tham gia sự kiện');
    tap('Tham gia sự kiện');
    capture('qa-news-695-5419', waitFor('Đã ghi nhận sự quan tâm'));
    tap('Xong');
    waitFor('Xem lịch quan tâm');
    tap('Xem lịch quan tâm');
    capture(
      'qa-news-preview-interested-calendar',
      waitFor('Xem sự kiện Dọn rác ven kênh Nhiêu Lộc cùng BlueSteps'),
    );
  });
  check('primary event interest survives the calendar and can be removed without unsaving', () => {
    open('/articles/events/nhieu-loc', 'Lưu sự kiện xanh');
    tap('Lưu sự kiện xanh');
    swipe();
    scrollTo('Tham gia sự kiện');
    tap('Tham gia sự kiện');
    waitFor('Đã ghi nhận sự quan tâm');
    tap('Xong');
    waitFor('Xem lịch quan tâm');
    tap('Xem lịch quan tâm');
    waitFor('Xem sự kiện Dọn rác ven kênh Nhiêu Lộc cùng BlueSteps');
    tap('Xem sự kiện Dọn rác ven kênh Nhiêu Lộc cùng BlueSteps');
    waitFor('Bỏ lưu sự kiện xanh');
    scrollTo('Bỏ quan tâm sự kiện xanh');
    tap('Bỏ quan tâm sự kiện xanh');
    waitFor('Tham gia sự kiện');
    open('/articles/events/nhieu-loc?preview=0', 'Bỏ lưu sự kiện xanh');
    tap('Bỏ lưu sự kiện xanh');
    waitFor('Lưu sự kiện xanh');
    open('/articles/calendar?interested=1', 'Chưa có sự kiện phù hợp');
  });
  check('130 percent text keeps search, reading, event and confirmation usable', () => {
    run(['shell', 'settings', 'put', 'system', 'font_scale', '1.3']);
    waitFor('Hồ sơ cá nhân');
    open('/articles/search?preview=1', '3 bài viết');
    capture('qa-news-search-font130');
    capture('qa-news-search-actions-font130', scrollTo('Xem dạng lưới'));
    open('/articles/reading-list?preview=1', 'Bạn đã lưu 4 bài viết');
    capture('qa-news-reading-font130');
    capture('qa-news-reading-body-font130', scrollTo('Đọc Tuổi trẻ chung tay làm sạch dòng kênh'));
    open('/articles/events/nhieu-loc?preview=1', 'Lưu sự kiện xanh');
    capture('qa-news-event-font130');
    scrollTo('Tham gia sự kiện');
    tap('Tham gia sự kiện');
    capture('qa-news-confirm-font130', waitFor('Đã ghi nhận sự quan tâm'));
    tap('Xong');
    waitFor('Xem lịch quan tâm');
  });
} catch (error) {
  results.push({ name: 'failure', passed: false, message: error.message });
  try {
    capture('qa-news-failure');
  } catch {}
  console.error(error);
  process.exitCode = 1;
} finally {
  run([
    'shell',
    'settings',
    'put',
    'system',
    'font_scale',
    originalFont === 'null' ? '1.0' : originalFont,
  ]);
  const runtime = run(['logcat', '-d', '-s', 'ReactNativeJS:E', 'AndroidRuntime:E']);
  fs.writeFileSync(path.join(output, 'qa-runtime.log'), runtime);
  const report = {
    checkedAt: new Date().toISOString(),
    serial,
    expoUrl,
    sourcePage: { id: '386:7053', name: 'backuped' },
    results,
    screenshots,
    geometry,
    environmentNotes,
    limitations:
      'Dedicated Android emulator behavior, native media slots and font QA; no iOS, physical-device or full-frame fidelity acceptance. Native OS status/navigation bars replace Figma mock system chrome.',
  };
  fs.writeFileSync(path.join(output, 'qa-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
