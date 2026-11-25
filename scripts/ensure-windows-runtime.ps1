# Portable Node.js for Windows (no system install required)
param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectRoot,

    [string]$VersionFile = (Join-Path $PSScriptRoot 'bundled-node.version')
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$NodeHome = Join-Path $ProjectRoot '.ivo-runtime\node'
$NodeExe = Join-Path $NodeHome 'node.exe'

if (Test-Path $NodeExe) {
    Write-Host "OK: Portable Node.js already present at $NodeHome"
    exit 0
}

if (-not (Test-Path $VersionFile)) {
    throw "Version file not found: $VersionFile"
}

$version = (Get-Content $VersionFile -Raw).Trim()
if (-not $version) {
    throw 'bundled-node.version is empty'
}

$arch = 'x64'
if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') {
    $arch = 'arm64'
}

$folder = "node-v$version-win-$arch"
$zipName = "$folder.zip"
$url = "https://nodejs.org/dist/v$version/$zipName"

$runtimeRoot = Join-Path $ProjectRoot '.ivo-runtime'
$downloadDir = Join-Path $runtimeRoot 'downloads'
New-Item -ItemType Directory -Force -Path $downloadDir | Out-Null
$zipPath = Join-Path $downloadDir $zipName

Write-Host "Downloading Node.js v$version ($arch) ..."
Write-Host $url

try {
    Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing
} catch {
    throw "Download failed. Check internet/firewall.`n$url`n$($_.Exception.Message)"
}

$extractDir = Join-Path $runtimeRoot '_node_extract'
if (Test-Path $extractDir) {
    Remove-Item -Recurse -Force $extractDir
}
New-Item -ItemType Directory -Force -Path $extractDir | Out-Null

Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force

$inner = Join-Path $extractDir $folder
if (-not (Test-Path (Join-Path $inner 'node.exe'))) {
    throw "Unexpected Node zip layout (missing node.exe in $folder)"
}

if (Test-Path $NodeHome) {
    Remove-Item -Recurse -Force $NodeHome
}
Move-Item -Path $inner -Destination $NodeHome

Remove-Item -Recurse -Force $extractDir
Remove-Item -Force $zipPath -ErrorAction SilentlyContinue

Write-Host "OK: Node.js installed at $NodeHome"
exit 0
