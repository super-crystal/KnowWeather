param(
  [Parameter(Mandatory=$true)][string]$SdkRoot,
  [string]$JavaHome = 'C:/Program Files/Java/jdk-21',
  [string]$BuildToolsVersion = '35.0.0',
  [string]$KeyStore = '',
  [string]$PasswordFile = '',
  [string]$KeyAlias = 'weatherly',
  [switch]$Unsigned
)
$ErrorActionPreference = 'Stop'
$appRoot = $PSScriptRoot
[xml]$manifest = Get-Content -LiteralPath (Join-Path $appRoot 'AndroidManifest.xml') -Raw
$ns = 'http://schemas.android.com/apk/res/android'
$version = $manifest.manifest.GetAttribute('versionName',$ns)
$minApi = $manifest.manifest.'uses-sdk'.GetAttribute('minSdkVersion',$ns)
$targetApi = $manifest.manifest.'uses-sdk'.GetAttribute('targetSdkVersion',$ns)
$toolsRoot = Join-Path $SdkRoot ('build-tools/' + $BuildToolsVersion)
$androidJar = Join-Path $SdkRoot ('platforms/android-' + $targetApi + '/android.jar')
$java = Join-Path $JavaHome 'bin/java.exe'
$nativeSources = Join-Path $appRoot 'src'
$hasSources = Test-Path -LiteralPath $nativeSources
function Run-Step([string]$Executable,[string[]]$Arguments) {
  & $Executable @Arguments
  if($LASTEXITCODE -ne 0){throw "Build command failed: $([IO.Path]::GetFileName($Executable)) ($LASTEXITCODE)"}
}
foreach($needed in @($androidJar,(Join-Path $toolsRoot 'aapt2.exe'),(Join-Path $toolsRoot 'zipalign.exe'),$java)) {
  if(!(Test-Path -LiteralPath $needed)){throw "Required tool missing: $needed"}
}
if(!$Unsigned) {
  if(!$KeyStore -or !$PasswordFile){throw 'Provide -KeyStore and -PasswordFile for the existing signing identity, or use -Unsigned for a build-only check.'}
  foreach($needed in @($KeyStore,$PasswordFile)){if(!(Test-Path -LiteralPath $needed)){throw "Signing input missing: $needed"}}
}
$buildRoot = Join-Path ([IO.Path]::GetTempPath()) ('weatherly-archive-' + $version + '-' + [Guid]::NewGuid().ToString('N'))
$assetsRoot = Join-Path $buildRoot 'assets'
$outputRoot = Join-Path $appRoot 'output'
New-Item -ItemType Directory -Force -Path $buildRoot,$assetsRoot,$outputRoot,(Join-Path $buildRoot 'generated'),(Join-Path $buildRoot 'classes'),(Join-Path $buildRoot 'dex') | Out-Null
Copy-Item -LiteralPath (Join-Path $appRoot 'res') -Destination $buildRoot -Recurse
Copy-Item -LiteralPath (Join-Path $appRoot 'AndroidManifest.xml') -Destination (Join-Path $buildRoot 'AndroidManifest.xml')
Copy-Item -LiteralPath $androidJar -Destination (Join-Path $buildRoot 'android.jar')
$androidJar = Join-Path $buildRoot 'android.jar'
Copy-Item -Path (Join-Path $appRoot 'web-src/*') -Destination $assetsRoot -Recurse
if(Test-Path -LiteralPath (Join-Path $appRoot 'native.js')){Copy-Item -LiteralPath (Join-Path $appRoot 'native.js') -Destination (Join-Path $assetsRoot 'native.js') -Force}
$compiled = Join-Path $buildRoot 'resources.zip'
$unsignedApk = Join-Path $buildRoot 'unsigned.apk'
$alignedApk = Join-Path $buildRoot 'aligned.apk'
Run-Step (Join-Path $toolsRoot 'aapt2.exe') @('compile','--dir',(Join-Path $buildRoot 'res'),'-o',$compiled)
Run-Step (Join-Path $toolsRoot 'aapt2.exe') @('link','-o',$unsignedApk,'-I',$androidJar,'--manifest',(Join-Path $buildRoot 'AndroidManifest.xml'),'--java',(Join-Path $buildRoot 'generated'),'-A',$assetsRoot,$compiled)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$assetArchive=[IO.Compression.ZipFile]::Open($unsignedApk,[IO.Compression.ZipArchiveMode]::Update)
try {
  foreach($oldEntry in @($assetArchive.Entries | Where-Object {$_.FullName.StartsWith('assets/') -and $_.FullName.Contains('\')})) {
    $normalized=$oldEntry.FullName.Replace('\','/')
    if($assetArchive.GetEntry($normalized)){throw "Duplicate asset: $normalized"}
    $newEntry=$assetArchive.CreateEntry($normalized,[IO.Compression.CompressionLevel]::Optimal)
    $oldStream=$oldEntry.Open();$newStream=$newEntry.Open()
    try{$oldStream.CopyTo($newStream)}finally{$oldStream.Dispose();$newStream.Dispose()}
    $oldEntry.Delete()
  }
}finally{$assetArchive.Dispose()}
if($hasSources) {
  $javaSources = @(Get-ChildItem -LiteralPath $nativeSources,(Join-Path $buildRoot 'generated') -Recurse -File -Filter '*.java' | ForEach-Object {$_.FullName})
  Run-Step (Join-Path $JavaHome 'bin/javac.exe') (@('--release','8','-encoding','UTF-8','-classpath',$androidJar,'-d',(Join-Path $buildRoot 'classes')) + $javaSources)
  $classes = @(Get-ChildItem -LiteralPath (Join-Path $buildRoot 'classes') -Recurse -File -Filter '*.class' | ForEach-Object {$_.FullName})
  Run-Step $java (@('-cp',(Join-Path $toolsRoot 'lib/d8.jar'),'com.android.tools.r8.D8','--release','--min-api',$minApi,'--lib',$androidJar,'--output',(Join-Path $buildRoot 'dex')) + $classes)
  $dexFile = Join-Path $buildRoot 'dex/classes.dex'
  Write-Output 'Native mode: compile archived Java source.'
} else {
  $dexFile = Join-Path $appRoot 'native-compiled/classes.dex'
  if(!(Test-Path -LiteralPath $dexFile)){throw 'Archived native bytecode is missing.'}
  Write-Output 'Native mode: reuse this release native bytecode; historical Java sources are unavailable.'
}
$archive=[IO.Compression.ZipFile]::Open($unsignedApk,[IO.Compression.ZipArchiveMode]::Update)
try{[IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,$dexFile,'classes.dex',[IO.Compression.CompressionLevel]::Optimal) | Out-Null}finally{$archive.Dispose()}
Run-Step (Join-Path $toolsRoot 'zipalign.exe') @('-P','16','-f','4',$unsignedApk,$alignedApk)
if($Unsigned) {
  $finalApk = Join-Path $outputRoot ('知天气-' + $version + '-归档重建-unsigned.apk')
  Copy-Item -LiteralPath $alignedApk -Destination $finalApk -Force
  Write-Output 'Unsigned build: verification only, cannot be installed as a signed release.'
} else {
  $finalApk = Join-Path $outputRoot ('知天气-' + $version + '-归档重建.apk')
  Run-Step $java @('-jar',(Join-Path $toolsRoot 'lib/apksigner.jar'),'sign','--ks',$KeyStore,'--ks-key-alias',$KeyAlias,'--ks-pass',('file:'+$PasswordFile),'--v1-signing-enabled','true','--v2-signing-enabled','true','--v3-signing-enabled','true','--out',$finalApk,$alignedApk)
  Run-Step $java @('-jar',(Join-Path $toolsRoot 'lib/apksigner.jar'),'verify','--verbose',$finalApk)
}
Run-Step (Join-Path $toolsRoot 'zipalign.exe') @('-c','-P','16','4',$finalApk)
Run-Step (Join-Path $toolsRoot 'aapt2.exe') @('dump','badging',$finalApk)
Get-FileHash -LiteralPath $finalApk -Algorithm SHA256 | Format-List
Write-Output "Build files: $buildRoot"
Write-Output "Rebuilt APK: $finalApk"
