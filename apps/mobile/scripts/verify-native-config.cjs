const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const config = JSON.parse(
  execFileSync(
    process.execPath,
    [require.resolve('expo/bin/cli'), 'config', '--type', 'introspect', '--json'],
    { cwd: path.resolve(__dirname, '..'), encoding: 'utf8' },
  ),
);
const ios = config._internal.modResults.ios.infoPlist;
const permissions = config._internal.modResults.android.manifest.manifest['uses-permission'];
assert.match(ios.NSCameraUsageDescription, /camera/);
assert.match(ios.NSPhotoLibraryUsageDescription, /ảnh/);
assert.match(ios.NSPhotoLibraryAddUsageDescription, /vé mẫu/);
assert.equal(ios.NSMicrophoneUsageDescription, undefined);
assert(
  !permissions.some(
    (item) =>
      item.$['android:name'] === 'android.permission.READ_MEDIA_AUDIO' &&
      item.$['tools:node'] !== 'remove',
  ),
);
assert(
  !permissions.some(
    (item) =>
      item.$['android:name'] === 'android.permission.READ_MEDIA_VIDEO' &&
      item.$['tools:node'] !== 'remove',
  ),
);
assert(
  permissions.some(
    (item) =>
      item.$['android:name'] === 'android.permission.CAMERA' && item.$['tools:node'] !== 'remove',
  ),
);
assert(
  !permissions.some(
    (item) =>
      item.$['android:name'] === 'android.permission.CAMERA' && item.$['tools:node'] === 'remove',
  ),
);
assert(
  permissions.some(
    (item) =>
      item.$['android:name'] === 'android.permission.RECORD_AUDIO' &&
      item.$['tools:node'] === 'remove',
  ),
);
process.stdout.write('Native config verified: camera/photos enabled, microphone excluded.\n');
