$ErrorActionPreference='Stop'
$compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe'
if (!(Test-Path -LiteralPath $compiler)) {throw '.NET Framework C# compiler was not found.'}
& $compiler /nologo /target:exe /platform:x86 /reference:System.Web.Extensions.dll (('/out:')+(Join-Path $PSScriptRoot 'pb-project-build.exe')) (Join-Path $PSScriptRoot 'src\native\ProjectBuild.cs')
if ($LASTEXITCODE -ne 0) {throw 'Native bridge compilation failed.'}

