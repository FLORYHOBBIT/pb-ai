param([string]$TccPath=$env:PB_AI_TCC,[switch]$BootstrapCompiler)
$ErrorActionPreference='Stop'
$cache=Join-Path $env:LOCALAPPDATA 'pb-ai\toolchains\tcc-0.9.27'
if (!$TccPath) {$TccPath=Join-Path $cache 'tcc\tcc.exe'}
if (!(Test-Path -LiteralPath $TccPath)) {
 if (!$BootstrapCompiler) {throw 'Specify -TccPath <x86 tcc.exe>, PB_AI_TCC, or use -BootstrapCompiler once.'}
 New-Item -ItemType Directory -Path $cache -Force | Out-Null
 $archive=Join-Path $cache 'tcc-0.9.27-win32-bin.zip'
 Invoke-WebRequest -UseBasicParsing -Uri 'https://download.savannah.gnu.org/releases/tinycc/tcc-0.9.27-win32-bin.zip' -OutFile $archive
 if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne '02E2BFE8C272A549B15E4BFA4507BD7E05304692AF1761DB6C1E8E88AF675651') {throw 'Compiler archive SHA256 mismatch.'}
 Expand-Archive -LiteralPath $archive -DestinationPath $cache -Force
}
$compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe'
if (!(Test-Path -LiteralPath $compiler)) {throw '.NET Framework x86 host compiler was not found.'}
& $TccPath -shared -o (Join-Path $PSScriptRoot 'pb-native.dll') (Join-Path $PSScriptRoot 'src\native\pb_native.c') -lversion
if ($LASTEXITCODE -ne 0) {throw 'C native adapter compilation failed.'}
$dll=[IO.File]::ReadAllBytes((Join-Path $PSScriptRoot 'pb-native.dll'))
$offset=[BitConverter]::ToInt32($dll,60)
if ([BitConverter]::ToUInt16($dll,$offset+4) -ne 0x14c) {throw 'pb-native.dll must be x86; use the win32 TinyCC distribution.'}
$sources=@('ProjectBuild.cs','NativeRuntime.cs','NativeCommands.cs','VersionResource.cs') | ForEach-Object {Join-Path $PSScriptRoot ('src\native\'+$_)}
& $compiler /nologo /target:exe /platform:x86 /reference:System.Web.Extensions.dll (('/out:')+(Join-Path $PSScriptRoot 'pb-native-host.exe')) @sources
if ($LASTEXITCODE -ne 0) {throw 'JSON host compilation failed.'}
Write-Output 'Built pb-native.dll (C/x86) and pb-native-host.exe (JSON transport).'
