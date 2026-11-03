param(
    [string]$SdkRoot = (Join-Path $env:LOCALAPPDATA 'Android/Sdk')
)

$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
$qaBase = Join-Path $workspace '.backend-tools/android-avd'
$qaName = 'BlueStepsQA32'
$qaAvd = Join-Path $qaBase "$qaName.avd"
$adb = Join-Path $SdkRoot 'platform-tools/adb.exe'
$emulator = Join-Path $SdkRoot 'emulator/emulator.exe'
$imageDir = Join-Path $SdkRoot 'system-images/android-32/google_apis/x86_64'
foreach ($required in @($adb, $emulator, (Join-Path $imageDir 'kernel-ranchu'), (Join-Path $imageDir 'system.img'), (Join-Path $imageDir 'ramdisk.img'))) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
        throw "Missing Android QA dependency: $required"
    }
}
$devices = & $adb devices
if ($devices -match '^emulator-5556\s') {
    $name = (& $adb -s emulator-5556 emu avd name 2>$null | Select-Object -First 1)
    if ($name -ne $qaName) { throw 'Port 5556 is occupied by another emulator; it will not be changed.' }
    Write-Output 'BlueSteps QA emulator is already running.'
    exit 0
}
New-Item -ItemType Directory -Path $qaAvd -Force | Out-Null
$config = @"
AvdId=$qaName
avd.ini.encoding=UTF-8
avd.ini.displayname=BlueSteps QA 32
abi.type=x86_64
tag.id=google_apis
tag.display=Google APIs
image.sysdir.1=$imageDir\
hw.cpu.arch=x86_64
hw.cpu.ncore=2
hw.ramSize=2048
hw.lcd.width=1080
hw.lcd.height=2400
hw.lcd.density=420
hw.keyboard=yes
hw.gpu.enabled=yes
hw.gpu.mode=swiftshader_indirect
hw.camera.back=emulated
hw.camera.front=none
hw.audioInput=no
hw.audioOutput=yes
disk.dataPartition.size=2G
showDeviceFrame=no
fastboot.forceColdBoot=yes
"@
Set-Content -LiteralPath (Join-Path $qaAvd 'config.ini') -Value $config -Encoding ascii
Set-Content -LiteralPath (Join-Path $qaBase "$qaName.ini") -Value "avd.ini.encoding=UTF-8`npath=$qaAvd`ntarget=android-32" -Encoding ascii
$env:ANDROID_AVD_HOME = $qaBase
$env:ANDROID_USER_HOME = Join-Path $workspace '.backend-tools/android-user'
$env:ANDROID_SDK_ROOT = $SdkRoot
$qaProcess = Start-Process -FilePath $emulator -WindowStyle Hidden -PassThru -ArgumentList @(
    '-avd', $qaName, '-no-window', '-no-audio', '-no-metrics', '-no-snapshot', '-no-boot-anim',
    '-gpu', 'swiftshader_indirect', '-ports', '5556,5557', '-memory', '2048', '-cores', '2'
) -RedirectStandardOutput (Join-Path $qaBase 'qa32.stdout.log') -RedirectStandardError (Join-Path $qaBase 'qa32.stderr.log')
Write-Output "Started $qaName (PID $($qaProcess.Id)). Check boot with adb -s emulator-5556 shell getprop sys.boot_completed."
