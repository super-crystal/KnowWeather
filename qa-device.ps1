param([ValidateSet('Dump','Tap','Text','Swipe','Capture')][string]$Action='Dump',[string]$Label,[string]$Value,[string]$Name='screen')
$ErrorActionPreference='Stop'
$adb='C:/Android/adb.exe'
$qaRoot=Join-Path ([IO.Path]::GetTempPath()) 'WeatherlyAndroid16QA'
$screens=Join-Path $PSScriptRoot 'output/qa-1.3.0'
New-Item -ItemType Directory -Force -Path $screens | Out-Null
function Dump-WeatherUI {
  & $adb -s emulator-5556 shell uiautomator dump /sdcard/weatherly-v12.xml | Out-Null
  & $adb -s emulator-5556 pull /sdcard/weatherly-v12.xml (Join-Path $qaRoot 'v12-ui.xml') 2>$null | Out-Null
  [xml]$tree=Get-Content -LiteralPath (Join-Path $qaRoot 'v12-ui.xml') -Raw
  return $tree
}
function Get-Bounds($node){if($node.bounds -match '\[(\d+),(\d+)\]\[(\d+),(\d+)\]'){return @([int]$Matches[1],[int]$Matches[2],[int]$Matches[3],[int]$Matches[4])}return @(0,0,0,0)}
if($Action -eq 'Capture'){
  Dump-WeatherUI | Out-Null
  & $adb -s emulator-5556 shell screencap -p /sdcard/weatherly-v12.png | Out-Null
  & $adb -s emulator-5556 pull /sdcard/weatherly-v12.png (Join-Path $qaRoot 'v12-screen.png') 2>$null | Out-Null
  $target=Join-Path $screens ($Name+'.png');Copy-Item -LiteralPath (Join-Path $qaRoot 'v12-screen.png') -Destination $target -Force;Write-Output $target;exit
}
if($Action -eq 'Text'){& $adb -s emulator-5556 shell input text $Value;exit}
$tree=Dump-WeatherUI
if($Action -eq 'Tap'){
  $nodes=@($tree.SelectNodes('//node') | Where-Object {($_.text -eq $Label -or $_.'content-desc' -eq $Label -or $_.'resource-id' -eq $Label) -and $_.enabled -eq 'true'} | Where-Object {$b=Get-Bounds $_;$b[3]-$b[1] -gt 5 -and $b[2]-$b[0] -gt 5} | Sort-Object @{Expression={$_.clickable -eq 'true'};Descending=$true})
  if(!$nodes.Count -and $tree.SelectNodes('//node').Count -lt 12){
    $tree=Dump-WeatherUI
    $nodes=@($tree.SelectNodes('//node') | Where-Object {($_.text -eq $Label -or $_.'content-desc' -eq $Label) -and $_.enabled -eq 'true'} | Where-Object {$b=Get-Bounds $_;$b[3]-$b[1] -gt 5 -and $b[2]-$b[0] -gt 5} | Sort-Object @{Expression={$_.clickable -eq 'true'};Descending=$true})
  }
  if(!$nodes.Count){throw "No visible UI target: $Label"}
  $b=Get-Bounds $nodes[0];$x=[int](($b[0]+$b[2])/2);$y=[int](($b[1]+$b[3])/2);Write-Output "Tap $Label [$x,$y]";& $adb -s emulator-5556 shell input tap $x $y;exit
}
if($Action -eq 'Swipe'){
  if($Value -eq 'outside-map'){
    $mapNode=$tree.SelectNodes('//node') | Where-Object {$_.'content-desc' -eq '台风观测和预报路径地图' -or $_.'content-desc' -eq '降水雷达互动地图' -or $_.text -eq '台风观测和预报路径地图' -or $_.text -eq '降水雷达互动地图'} | Select-Object -First 1
    if(!$mapNode){throw 'No map bounds for outer-page scroll'}
    $b=Get-Bounds $mapNode;$start=$b[1]-500;$end=[Math]::Max(520,$start-650);$x=[int](($b[0]+$b[2])/2)
    & $adb -s emulator-5556 shell input swipe $x $start $x $end 450;exit
  }
  if($Label){$nodes=@($tree.SelectNodes('//node') | Where-Object {$_.text -eq $Label -or $_.'content-desc' -eq $Label})}else{$nodes=@($tree.SelectNodes('//node[@scrollable="true"]') | Where-Object {$b=Get-Bounds $_;$b[3]-$b[1] -gt 300})};if(!$nodes.Count){throw 'No scrollable UI target'}
  $b=Get-Bounds $nodes[0];$x=[int](($b[0]+$b[2])/2);$top=[int]($b[1]+($b[3]-$b[1])*.28);$bottom=[int]($b[1]+($b[3]-$b[1])*.78)
  if($Value -eq 'horizontal'){& $adb -s emulator-5556 shell input swipe ([int]($b[0]+($b[2]-$b[0])*.8)) $top ([int]($b[0]+($b[2]-$b[0])*.2)) $top 400}else{& $adb -s emulator-5556 shell input swipe $x $bottom $x $top 450};exit
}
$tree.SelectNodes('//node') | Where-Object {$b=Get-Bounds $_;($_.text -or $_.'content-desc') -and $b[3]-$b[1] -gt 5 -and $b[2]-$b[0] -gt 5} | ForEach-Object {Write-Output "$($_.text) $($_.'content-desc') $($_.bounds)"}

