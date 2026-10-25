$ErrorActionPreference='Stop'
$sdkPath=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../tools/android-build/sdk'))
$qaRoot=Join-Path ([IO.Path]::GetTempPath()) 'WeatherlyAndroid16QA'
$sdkLink=Join-Path $qaRoot 'runtime-sdk'
$avdRoot=Join-Path $qaRoot 'avd'
$avdDirectory=Join-Path $avdRoot 'Weatherly16.avd'
New-Item -ItemType Directory -Force -Path $qaRoot,$avdRoot,$avdDirectory,(Join-Path $qaRoot 'user'),(Join-Path $qaRoot 'emulator-home'),(Join-Path $sdkPath 'platform-tools') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $sdkLink 'system-images/android-36/default'),(Join-Path $sdkLink 'platform-tools'),(Join-Path $sdkLink 'platforms') | Out-Null
if(!(Test-Path -LiteralPath (Join-Path $sdkLink 'system-images/android-36/default/x86_64/system.img'))){Copy-Item -LiteralPath (Join-Path $sdkPath 'system-images/android-36/default/x86_64') -Destination (Join-Path $sdkLink 'system-images/android-36/default') -Recurse}
if(!(Test-Path -LiteralPath (Join-Path $sdkLink 'emulator/emulator.exe'))){Copy-Item -LiteralPath (Join-Path $sdkPath 'emulator') -Destination $sdkLink -Recurse}
foreach($name in @('adb.exe','AdbWinApi.dll','AdbWinUsbApi.dll')){Copy-Item -LiteralPath (Join-Path 'C:/Android' $name) -Destination (Join-Path $sdkPath ('platform-tools/'+$name)) -Force}
Copy-Item -LiteralPath (Join-Path $sdkPath 'platform-tools/adb.exe'),(Join-Path $sdkPath 'platform-tools/AdbWinApi.dll'),(Join-Path $sdkPath 'platform-tools/AdbWinUsbApi.dll') -Destination (Join-Path $sdkLink 'platform-tools') -Force
@"
avd.ini.encoding=UTF-8
path=$avdDirectory
target=android-36
"@ | Set-Content -LiteralPath (Join-Path $avdRoot 'Weatherly16.ini') -Encoding utf8NoBOM
@"
AvdId=Weatherly16
avd.ini.displayname=Weatherly Android 16 QA
avd.ini.encoding=UTF-8
abi.type=x86_64
hw.cpu.arch=x86_64
hw.cpu.ncore=4
hw.ramSize=2048
hw.lcd.width=1080
hw.lcd.height=2340
hw.lcd.density=440
hw.gpu.enabled=yes
hw.gpu.mode=swiftshader
hw.keyboard=yes
hw.audioInput=no
hw.audioOutput=no
hw.gsmModem=yes
hw.battery=yes
hw.mainKeys=no
hw.camera.back=none
hw.camera.front=none
image.sysdir.1=$sdkLink/system-images/android-36/default/x86_64/
tag.id=default
tag.display=Default
disk.dataPartition.size=2G
fastboot.forceColdBoot=yes
"@ | Set-Content -LiteralPath (Join-Path $avdDirectory 'config.ini') -Encoding utf8NoBOM
$env:ANDROID_AVD_HOME=$avdRoot
$env:ANDROID_USER_HOME=Join-Path $qaRoot 'user'
$env:ANDROID_EMULATOR_HOME=Join-Path $qaRoot 'emulator-home'
$env:ANDROID_SDK_ROOT=$sdkLink
$emulator=Join-Path $sdkLink 'emulator/emulator.exe'
$process=Start-Process -FilePath $emulator -ArgumentList @('-avd','Weatherly16','-no-window','-no-audio','-no-boot-anim','-no-snapshot','-gpu','swiftshader','-no-metrics','-port','5556','-cores','1','-show-kernel','-verbose') -WorkingDirectory $qaRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $qaRoot 'emulator.log') -RedirectStandardError (Join-Path $qaRoot 'emulator-errors.log') -PassThru
Write-Output "Emulator process: $($process.Id)"
Write-Output "QA logs: $qaRoot"
