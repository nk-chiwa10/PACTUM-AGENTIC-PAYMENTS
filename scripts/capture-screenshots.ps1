# Capture the five PACTUM pages with headless Chrome.
#
#   powershell -ExecutionPolicy Bypass -File scripts/capture-screenshots.ps1
#
# Requires Chrome at the default Windows path. Output: docs/screenshots/*.png

param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$OutDir = "docs/screenshots"
)

$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chrome)) {
  $chrome = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
}
if (-not (Test-Path $chrome)) {
  throw "Chrome not found. Install Chrome or edit the path in this script."
}

if (-not [System.IO.Path]::IsPathRooted($OutDir)) {
  $OutDir = Join-Path (Get-Location) $OutDir
}
$OutDir = [System.IO.Path]::GetFullPath($OutDir)
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$profile = Join-Path $env:TEMP "pactum-chrome-profile"
New-Item -ItemType Directory -Force -Path $profile | Out-Null

$pages = @(
  @{ name = "01-overview"; path = "/" },
  @{ name = "02-agent-console"; path = "/agent" },
  @{ name = "03-policies"; path = "/policies" },
  @{ name = "04-transactions"; path = "/transactions" },
  @{ name = "05-onchain-proof"; path = "/proof" }
)

foreach ($page in $pages) {
  $target = Join-Path $OutDir "$($page.name).png"
  Write-Host "Capturing $($page.path) -> $target"
  & $chrome `
    --headless=new `
    --disable-gpu `
    --hide-scrollbars `
    --no-first-run `
    --window-size=1600,1500 `
    --virtual-time-budget=15000 `
    --user-data-dir="$profile" `
    --screenshot="$target" `
    "$BaseUrl$($page.path)" 2>&1 | Out-Null
  if (-not (Test-Path $target)) {
    throw "Screenshot failed for $($page.path)"
  }
}

Write-Host "Done. $($pages.Count) screenshots in $OutDir"
