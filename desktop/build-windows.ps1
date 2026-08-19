$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $root
try {
  if (-not (Test-Path "node_modules")) {
    npm install
  }

  npm run dist:win
} finally {
  Pop-Location
}
