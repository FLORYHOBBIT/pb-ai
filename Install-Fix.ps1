param(
 [string]$Target=(Join-Path $env:USERPROFILE 'node_modules\pb-ai'),
 [switch]$Restore,
 [string]$BackupDirectory
)
$ErrorActionPreference='Stop'
$Target=[IO.Path]::GetFullPath($Target)
$files=@('package.json','dist\services\project-service.js','dist\services\compile-service.js','dist\services\compile-service.d.ts','dist\services\pbspy-service.js','dist\tools\compile.js','pb-project-build.exe','src\native\ProjectBuild.cs','test\project.test.js','build-native.ps1','FIX-README.md')
if (!(Test-Path -LiteralPath (Join-Path $Target 'PBSpy.dll'))) {throw "PBSpy.dll not found in $Target"}
if ($Restore) {
 if (!$BackupDirectory) {throw 'Specify -BackupDirectory to restore a particular backup.'}
 $manifest=Get-Content -Encoding UTF8 -LiteralPath (Join-Path $BackupDirectory 'manifest.json') -Raw | ConvertFrom-Json
 foreach($entry in $manifest) {
  if ($files -notcontains $entry.path) {throw 'Backup manifest contains an unexpected path.'}
  $dest=Join-Path $Target $entry.path
  if ($entry.existed) {Copy-Item -LiteralPath (Join-Path $BackupDirectory $entry.path) -Destination $dest -Force}
  elseif (Test-Path -LiteralPath $dest) {Remove-Item -LiteralPath $dest}
 }
 Write-Output "Restored: $Target"
 exit
}
foreach($file in $files) {if(!(Test-Path -LiteralPath (Join-Path $PSScriptRoot $file))) {throw "Patch file missing: $file"}}
$backup=Join-Path $Target ('.projectfix-backups\'+(Get-Date -Format 'yyyyMMdd_HHmmss_fff'))
New-Item -ItemType Directory -Path $backup -Force | Out-Null
$manifest=@()
foreach($file in $files) {
 $dest=Join-Path $Target $file
 $existed=Test-Path -LiteralPath $dest
 if ($existed) {
  $saved=Join-Path $backup $file
  New-Item -ItemType Directory -Path (Split-Path $saved) -Force | Out-Null
  Copy-Item -LiteralPath $dest -Destination $saved
 }
 $manifest+=@{path=$file;existed=$existed}
}
$manifest | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $backup 'manifest.json')
try {
 foreach($file in $files) {
  $dest=Join-Path $Target $file
  New-Item -ItemType Directory -Path (Split-Path $dest) -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot $file) -Destination $dest -Force
 }
} catch {
 foreach($entry in $manifest) {
  $dest=Join-Path $Target $entry.path
  if($entry.existed){Copy-Item -LiteralPath (Join-Path $backup $entry.path) -Destination $dest -Force}
  elseif(Test-Path -LiteralPath $dest){Remove-Item -LiteralPath $dest}
 }
 throw
}
Write-Output "Installed: $Target"
Write-Output "Backup: $backup"
Write-Output 'Reconnect/restart the MCP server to load the updated JavaScript and tool schema.'

