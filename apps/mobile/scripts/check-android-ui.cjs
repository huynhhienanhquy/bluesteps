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
const output = path.join(root, 'docs/ui-progress-evidence-2026-10-31/native');
fs.mkdirSync(output, { recursive: true });
const results = [];
const screenshots = [];
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
  return waitFor(ready);
}
function capture(name, current = state()) {
  fs.writeFileSync(path.join(output, `${name}.xml`), current.xml);
  fs.writeFileSync(path.join(output, `${name}.png`), run(['exec-out', 'screencap', '-p'], true));
  screenshots.push(name);
}
const input = (value) => run(['shell', 'input', 'text', value.replaceAll(' ', '%s')]);
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

const originalFont = run(['shell', 'settings', 'get', 'system', 'font_scale']).trim();
try {
  assert.equal(run(['get-state']).trim(), 'device');
  assert.equal(
    run(['shell', 'getprop', 'ro.kernel.qemu']).trim(),
    '1',
    'Use a dedicated QA emulator',
  );
  assert.match(
    run(['shell', 'wm', 'size']),
    /1080x2340/,
    'This QA profile uses a 1080x2340 emulator',
  );
  assert.match(
    run(['shell', 'pm', 'list', 'packages', 'host.exp.exponent']),
    /host\.exp\.exponent/,
  );
  run(['reverse', `tcp:${qaPort}`, `tcp:${qaPort}`]);
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
    `${expoUrl}?__expo_disable_fab=1\\&__expo_disable_onboarding=1`,
    'host.exp.exponent',
  ]);
  waitFor('Hồ sơ cá nhân', 45000);
  check('event discovery searches locations, resets filters and toggles saved state', () => {
    open('/events?preview=1', 'Xem hoạt động Giờ học xanh');
    capture('qa-event-explore');
    tap('Tìm hoạt động');
    input('gia dinh');
    run(['shell', 'input', 'keyevent', '4']);
    const filtered = waitFor('Xem hoạt động Trồng cây cuối tuần');
    assert(!find(filtered, 'Xem hoạt động Giờ học xanh'), 'Search must filter the first event out');
    tap('Tất cả');
    waitFor('Xem hoạt động Giờ học xanh');
    tap('Bỏ lưu Trồng cây cuối tuần');
    waitFor('Lưu Trồng cây cuối tuần');
    tap('Lưu Trồng cây cuối tuần');
    capture('qa-event-save-restored', waitFor('Bỏ lưu Trồng cây cuối tuần'));
  });
  check('article expands and collapses through native accessibility', () => {
    open('/articles/daily-waste?preview=1', 'Xem thêm bài viết');
    capture('qa-article-collapsed');
    tap('Xem thêm bài viết');
    capture('qa-article-expanded', waitFor('Thu gọn bài viết'));
    tap('Thu gọn bài viết');
    const collapsed = waitFor('Xem thêm bài viết');
    for (const caption of ['Rác thải nhựa', 'Rác công nghiệp', 'Rác điện tử', 'Rác sinh hoạt'])
      assert(find(collapsed, caption), `Material caption should be visible: ${caption}`);
  });
  check('article saves, likes and opens the matching discussion', () => {
    scrollTo('Lưu bài viết');
    tap('Lưu bài viết');
    waitFor('Bỏ lưu bài viết');
    scrollTo(/^Thích ·/);
    tap(/^Thích ·/);
    waitFor(/^Bỏ thích ·/);
    scrollTo(/^Thảo luận bài viết ·/);
    tap(/^Thảo luận bài viết ·/);
    const discussion = waitFor('Về bài viết');
    assert(
      discussion.xml.includes('11 triệu tấn rác'),
      'Discussion should belong to the opened article',
    );
    capture('qa-article-discussion', discussion);
    tap('Về bài viết');
    const returned = waitFor('Bỏ lưu bài viết');
    assert(
      find(returned, /^Bỏ thích ·/),
      'Returning to the article must preserve its saved and liked state',
    );
    capture('qa-article-returned', returned);
  });
  check('collection creation works while the native keyboard is open', () => {
    open('/event-collections?preview=1', 'Tạo bộ sưu tập');
    tap('Tạo bộ sưu tập');
    tap('Tên bộ sưu tập mới');
    input('Native QA');
    const keyboard = waitFor('Xác nhận tạo bộ sưu tập');
    assert(find(keyboard, 'Tên bộ sưu tập mới').text === 'Native QA');
    capture('qa-collection-keyboard', keyboard);
    tap('Xác nhận tạo bộ sưu tập');
    capture('qa-collection-created', scrollTo('Native QA · 0'));
  });
  check('the other seven designed article routes render their own titles', () => {
    const layouts = JSON.parse(
      fs.readFileSync(
        path.join(root, 'docs/figma-fidelity/news-detail-layout-source.json'),
        'utf8',
      ),
    );
    for (const [frame, article] of Object.entries(layouts)) {
      if (article.articleId === 'daily-waste') continue;
      const current = open(`/articles/${article.articleId}?preview=1`, article.title.trim());
      assert(
        find(current, 'Xem thêm bài viết'),
        `Article must keep its expansion action: ${frame}`,
      );
      capture(`qa-article-${article.articleId}`, current);
    }
  });
  check('130 percent text reflows material images and consequences without overlap', () => {
    run(['shell', 'settings', 'put', 'system', 'font_scale', '1.3']);
    // Android restarts the Expo activity when its font configuration changes.
    waitFor('Hồ sơ cá nhân');
    open('/articles/daily-waste?preview=1', 'Xem thêm bài viết');
    capture('qa-article-font130-top');
    const body = scrollTo('3. Hậu quả trực tiếp đến Trái Đất');
    const heading = find(body, '3. Hậu quả trực tiếp đến Trái Đất');
    const firstParagraph = body.nodes.find(
      (node) => node.visible && node.text?.startsWith('Ô nhiễm đại dương:'),
    );
    if (!firstParagraph) {
      swipe();
      const visible = state();
      const title = find(visible, '3. Hậu quả trực tiếp đến Trái Đất');
      const paragraph = visible.nodes.find(
        (node) => node.visible && node.text?.startsWith('Ô nhiễm đại dương:'),
      );
      assert(
        title && paragraph && title.bottom <= paragraph.top,
        'Enlarged text must not overlap the section heading',
      );
      capture('qa-article-font130-body', visible);
    } else {
      assert(
        heading.bottom <= firstParagraph.top,
        'Enlarged text must not overlap the section heading',
      );
      capture('qa-article-font130-body', body);
    }
    capture('qa-article-font130-actions', scrollTo('Lưu bài viết'));
  });
} catch (error) {
  results.push({ name: 'failure', passed: false, message: error.message });
  try {
    capture('qa-failure');
  } catch {
    /* Preserve the original failure. */
  }
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
  const log = run(['logcat', '-d', '-s', 'ReactNativeJS:E', 'AndroidRuntime:E']);
  fs.writeFileSync(path.join(output, 'qa-runtime.log'), log);
  const report = {
    checkedAt: new Date().toISOString(),
    serial,
    expoUrl,
    androidVersion: run(['shell', 'getprop', 'ro.build.version.release']).trim(),
    results,
    screenshots,
    limitations:
      'Android emulator smoke/keyboard/font tests only; no iOS or physical-device acceptance; screenshots may include the Expo Go developer overlay',
  };
  fs.writeFileSync(path.join(output, 'qa-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
