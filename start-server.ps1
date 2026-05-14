# Bilibili Video Stats - Local HTTP Server
# Run with: .\start-server.ps1

$port = 8080
$directory = $PSScriptRoot

Write-Host "========================================"
Write-Host "  Bilibili Video Stats - Local Server"
Write-Host "========================================"
Write-Host ""
Write-Host "  Local URL: http://localhost:$port"
Write-Host "  Directory: $directory"
Write-Host ""
Write-Host "  Press Ctrl+C to stop server"
Write-Host "========================================"
Write-Host ""

# Try Python first, then Node.js
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
$python3Cmd = Get-Command python3 -ErrorAction SilentlyContinue
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue

if ($pythonCmd) {
    Write-Host "Using Python..."
    Set-Location $directory
    & python -m http.server $port
} elseif ($python3Cmd) {
    Write-Host "Using Python3..."
    Set-Location $directory
    & python3 -m http.server $port
} elseif ($nodeCmd) {
    Write-Host "Using Node.js http-server..."
    Set-Location $directory
    # Try npx first
    npx http-server -p $port -c-1
} else {
    Write-Host "ERROR: Neither Python nor Node.js found!"
    Write-Host "Please install Python or Node.js"
    Write-Host ""
    Write-Host "Or manually start a server with:"
    Write-Host "  Python: python -m http.server 8080"
    Write-Host "  Node.js: npx http-server"
    pause
}
