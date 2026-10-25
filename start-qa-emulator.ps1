param([string]$QaRoot='C:/Users/Supercrystal/AppData/Local/Temp/WeatherlyAndroid16QA')
$ErrorActionPreference='Stop'
$env:ANDROID_AVD_HOME=Join-Path $QaRoot 'avd'
$env:ANDROID_EMULATOR_HOME=Join-Path $QaRoot 'emulator-home'
$env:ANDROID_SDK_ROOT=Join-Path $QaRoot 'runtime-sdk'
# This emulator build exposes this switch in -help-crash-report-mode.
# Disable the host crash reporter rather than suppressing Windows error dialogs globally.
$taskEmulator=Start-Process -FilePath (Join-Path $env:ANDROID_SDK_ROOT 'emulator/emulator.exe') -ArgumentList @('-avd','Weatherly16','-port','5556','-no-window','-no-audio','-no-snapshot','-gpu','swiftshader','-accel','auto','-crash-report-mode','disabled','-no-metrics') -WindowStyle Hidden -PassThru
Write-Output "QA emulator launcher PID: $($taskEmulator.Id); crash reporting disabled."
$taskEmulator.WaitForExit()
