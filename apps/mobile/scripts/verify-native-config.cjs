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
assert.equal(ios.NSPhotoLibraryAddUsageDescription, undefined);
const application = config._internal.modResults.android.manifest.manifest.application[0].$;
assert.match(application['android:fullBackupContent'], /secure_store/);
assert.match(application['android:dataExtractionRules'], /secure_store/);
assert.equal(ios.NSMicrophoneUsageDescription, undefined);
assert.match(ios.NSLocationWhenInUseUsageDescription, /vị trí/);
assert.equal(ios.NSLocationAlwaysUsageDescription, undefined);
assert.equal(ios.NSLocationAlwaysAndWhenInUseUsageDescription, undefined);
assert(!ios.UIBackgroundModes?.includes('location'));
for (const name of [
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
]) {
  assert(
    permissions.some(
      (item) => item.$['android:name'] === name && item.$['tools:node'] !== 'remove',
    ),
  );
}
for (const name of [
  'android.permission.ACCESS_BACKGROUND_LOCATION',
  'android.permission.FOREGROUND_SERVICE_LOCATION',
]) {
  assert(
    !permissions.some(
      (item) => item.$['android:name'] === name && item.$['tools:node'] !== 'remove',
    ),
  );
}
assert(!ios.UIBackgroundModes?.includes('audio'));
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
assert(
  !permissions.some(
    (item) =>
      item.$['android:name'] === 'android.permission.RECORD_AUDIO' &&
      item.$['tools:node'] !== 'remove',
  ),
);
process.stdout.write(
  'Native config verified: camera/photos enabled; microphone and background recording excluded.\n',
);
