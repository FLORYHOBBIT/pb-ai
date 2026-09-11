param([string]$Target,[switch]$Restore,[string]$BackupDirectory)
$ErrorActionPreference='Stop'
if(!$Target){throw 'Specify -Target <installed pb-ai package directory>. Prefer npm install for normal upgrades.'}
$Target=[IO.Path]::GetFullPath($Target)
if(!(Test-Path -LiteralPath (Join-Path $Target 'package.json'))){throw 'Target must be an installed package directory.'}
function Destination([string]$relative){
 $p=[IO.Path]::GetFullPath((Join-Path $Target $relative))
 if(!$p.StartsWith($Target+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Path escapes target package.'}
 return $p
}
if($Restore){
 if(!$BackupDirectory){throw 'Specify -BackupDirectory.'}
 $manifest=Get-Content -Encoding UTF8 -LiteralPath (Join-Path $BackupDirectory 'manifest.json') -Raw | ConvertFrom-Json
 foreach($e in $manifest){$dest=Destination $e.path;if($e.existed){New-Item -ItemType Directory -Path (Split-Path $dest) -Force | Out-Null;Copy-Item -LiteralPath (Join-Path $BackupDirectory $e.path) -Destination $dest -Force}else{if(Test-Path -LiteralPath $dest){Remove-Item -LiteralPath $dest}}}
 Write-Output 'Restored package files. Restart the MCP process.';exit
}
$files=@('package.json','pb-native.dll','pb-native-host.exe','build-native.ps1','README.md','FIX-README.md','UPSTREAM.md','TRIAL.md')
foreach($dir in @('dist','src','test')){Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot $dir) -File -Recurse | ForEach-Object {$files+=$_.FullName.Substring($PSScriptRoot.Length+1)}}
$obsolete=@('PBSpy.dll','pb-cli.exe','pb-project-build.exe','dist\services\pbspy-service.js','dist\services\pbspy-service.d.ts')
$backup=Join-Path $Target ('.projectfix-backups\'+(Get-Date -Format 'yyyyMMdd_HHmmss_fff'))
New-Item -ItemType Directory -Path $backup -Force | Out-Null
$manifest=@()
foreach($file in @($files)+@($obsolete)){
 $dest=Destination $file;$exists=Test-Path -LiteralPath $dest
 if($exists){$saved=Join-Path $backup $file;New-Item -ItemType Directory -Path (Split-Path $saved) -Force | Out-Null;Copy-Item -LiteralPath $dest -Destination $saved}
 $manifest+=@{path=$file;existed=$exists}
}
$manifest | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $backup 'manifest.json')
try{
 foreach($file in $files){$dest=Destination $file;New-Item -ItemType Directory -Path (Split-Path $dest) -Force | Out-Null;Copy-Item -LiteralPath (Join-Path $PSScriptRoot $file) -Destination $dest -Force}
 foreach($file in $obsolete){$dest=Destination $file;if(Test-Path -LiteralPath $dest){Remove-Item -LiteralPath $dest}}
}catch{
 foreach($e in $manifest){$dest=Destination $e.path;if($e.existed){Copy-Item -LiteralPath (Join-Path $backup $e.path) -Destination $dest -Force}elseif(Test-Path -LiteralPath $dest){Remove-Item -LiteralPath $dest}}
 throw
}
Write-Output "Updated: $Target"
Write-Output "Backup: $backup"
Write-Output 'Restart the MCP process to load the native backend.'
