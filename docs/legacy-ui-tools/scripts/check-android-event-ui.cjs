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
const copyOnly = process.argv.includes('--copy-only');
const output = path.join(
  root,
  'docs/ui-progress-evidence-2026-10-31',
  copyOnly ? 'native-event-copy' : 'native-events',
);
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
  return waitFor(ready);
}
function capture(name, current = state()) {
  // Accessibility text can appear before Expo Go finishes loading original media.
  run(['shell', 'sleep', '3']);
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

const originalFont = run(['shell', 'settings', 'get', 'system', 'font_scale']).trim();
try {
  assert.equal(run(['get-state']).trim(), 'device');
  assert.equal(
    run(['shell', 'getprop', 'ro.kernel.qemu']).trim(),
    '1',
    'Use the dedicated QA emulator',
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
    expoUrl + '?__expo_disable_fab=1\\&__expo_disable_onboarding=1',
    'host.exp.exponent',
  ]);
  waitFor('Hồ sơ cá nhân', 60000);
  if (copyOnly) {
    for (const font of ['1.0', '1.3'])
      check(`garden copy uses native paragraph breaks at font ${font}`, () => {
        if (font !== '1.0') {
          run(['shell', 'settings', 'put', 'system', 'font_scale', font]);
          waitFor('Hồ sơ cá nhân');
        }
        open('/events/garden?preview=1', 'Quan tâm hoạt động');
        const content = scrollTo(/^\s*Dưới sự hướng dẫn/);
        assert(
          !/[\u2028\u2029]/.test(content.xml),
          'Figma Unicode separators must become native line breaks',
        );
        capture(`qa-event-copy-font${font === '1.0' ? '100' : '130'}`, content);
        capture(
          `qa-event-copy-related-font${font === '1.0' ? '100' : '130'}`,
          scrollTo('Xem hoạt động Giờ học xanh'),
        );
      });
  } else {
    const variants = [
      ['green-class', '386-9376', '386-7054'],
      ['beach', '386-9470', '386-17397'],
      ['school-class', '386-9575', '386-9681'],
      ['garden', '386-10026', '386-17299'],
    ];
    for (const [id, initial, interested] of variants)
      check(id + ': original detail, interest and related native scroll', () => {
        open('/events/' + id + '?preview=1', 'Quan tâm hoạt động');
        capture('qa-event-' + initial);
        tap('Quan tâm hoạt động');
        capture('qa-event-' + interested, waitFor('Bỏ quan tâm hoạt động'));
        tap('Bỏ quan tâm hoạt động');
        waitFor('Quan tâm hoạt động');
        if (id === 'green-class') {
          tap('Xem ảnh hoạt động 1');
          capture('qa-event-gallery', waitFor('Đóng ảnh hoạt động'));
          tap('Đóng ảnh hoạt động');
          waitFor('Quan tâm hoạt động');
        }
        capture('qa-event-' + id + '-body', scrollTo('Hoạt động khác'));
      });
    check('saving remains independent of interest and saved deletion needs confirmation', () => {
      open('/events/green-class', 'Quan tâm hoạt động');
      tap('Quan tâm hoạt động');
      tap('Lưu hoạt động');
      capture('qa-event-386-10122', waitFor('Đi đến mục yêu thích'));
      tap('Đi đến mục yêu thích');
      waitFor('Xóa Giờ học xanh');
      capture('qa-event-saved-session');
      tap('Xóa Giờ học xanh');
      tap('Hủy xóa');
      waitFor('Xóa Giờ học xanh');
      tap('Xóa Giờ học xanh');
      tap('Xác nhận xóa');
      capture('qa-event-386-10131', waitFor('Hoạt động yêu thích đã xóa'));
      tap('Đóng thông báo yêu thích');
      assert(!find(state(), 'Xóa Giờ học xanh'), 'Removed event must disappear');
      open('/events/green-class', 'Bỏ quan tâm hoạt động');
      assert(find(state(), 'Lưu hoạt động'), 'Interest must remain after removing the saved event');
      tap('Bỏ quan tâm hoạt động');
    });
    check('saved reference list and preview feedback stay separate from the main session', () => {
      open('/saved?preview=1', 'Hoạt động yêu thích');
      capture('qa-event-386-18069');
      tap('Xóa Giờ học xanh');
      tap('Xác nhận xóa');
      waitFor('Hoạt động yêu thích đã xóa');
      tap('Đóng thông báo yêu thích');
      open('/saved', 'Hoạt động yêu thích');
      assert(!find(state(), 'Xóa Giờ học xanh'), 'Preview must not populate actual saved records');
      open('/event-collections?preview=1', 'Tạo bộ sưu tập');
      capture('qa-event-collections-plus');
    });
    check('130 percent text keeps native detail, related cards and saved rows usable', () => {
      run(['shell', 'settings', 'put', 'system', 'font_scale', '1.3']);
      waitFor('Hồ sơ cá nhân');
      open('/events/garden?preview=1', 'Quan tâm hoạt động');
      capture('qa-event-font130-top');
      capture('qa-event-font130-body', scrollTo('Hoạt động khác'));
      scrollTo('Xem hoạt động Giờ học xanh');
      capture('qa-event-font130-related');
      open('/saved?preview=1', 'Hoạt động yêu thích');
      capture('qa-event-font130-saved');
    });
  }
} catch (error) {
  results.push({ name: 'failure', passed: false, message: error.message });
  try {
    capture('qa-event-failure');
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
  const log = run(['logcat', '-d', '-s', 'ReactNativeJS:E', 'AndroidRuntime:E']);
  fs.writeFileSync(path.join(output, 'qa-runtime.log'), log);
  const report = {
    checkedAt: new Date().toISOString(),
    serial,
    expoUrl,
    androidVersion: run(['shell', 'getprop', 'ro.build.version.release']).trim(),
    results,
    screenshots,
    environmentNotes,
    limitations:
      'Android emulator viewport and behavior QA only; no iOS, physical device, backend or full-frame fidelity acceptance',
  };
  fs.writeFileSync(path.join(output, 'qa-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
