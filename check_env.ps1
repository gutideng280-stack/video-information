# Check Environment
Write-Host "=== Trae Environment Check ===" -ForegroundColor Cyan
Write-Host ""

# Check Git
Write-Host "[1/5] Checking Git..." -ForegroundColor Yellow
$gitAvailable = $false
try {
    $gitVersion = git --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Git found: $gitVersion" -ForegroundColor Green
        $gitAvailable = $true
    }
} catch {
    Write-Host "✗ Git not found" -ForegroundColor Red
}

# Check GitHub CLI
Write-Host ""
Write-Host "[2/5] Checking GitHub CLI (gh)..." -ForegroundColor Yellow
$ghAvailable = $false
try {
    $ghVersion = gh --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ GitHub CLI found: $ghVersion" -ForegroundColor Green
        $ghAvailable = $true
        
        # Check auth status
        Write-Host "  Checking auth..." -ForegroundColor Gray
        $authStatus = gh auth status 2>&1
        Write-Host "  $authStatus" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ GitHub CLI not found" -ForegroundColor Red
}

# Check environment variables
Write-Host ""
Write-Host "[3/5] Checking environment variables..." -ForegroundColor Yellow
$envVars = Get-ChildItem Env: | Where-Object { $_.Name -like "*GITHUB*" -or $_.Name -like "*GH_*" -or $_.Name -like "*TOKEN*" }
if ($envVars) {
    Write-Host "✓ Found environment variables:" -ForegroundColor Green
    foreach ($v in $envVars) {
        $val = if ($v.Value.Length -gt 10) { "***" } else { $v.Value }
        Write-Host "  $($v.Name): $val" -ForegroundColor Gray
    }
} else {
    Write-Host "✗ No GitHub-related environment variables found" -ForegroundColor Red
}

# Check current directory
Write-Host ""
Write-Host "[4/5] Checking current directory..." -ForegroundColor Yellow
Write-Host "✓ Current directory: $PWD" -ForegroundColor Green
Write-Host "✓ Files:" -ForegroundColor Gray
Get-ChildItem -File | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor Gray }

# Check GitHub repo exists
Write-Host ""
Write-Host "[5/5] Checking GitHub repo..." -ForegroundColor Yellow
try {
    # Try to check repo exists (no auth required for public repos)
    $response = Invoke-RestMethod -Uri "https://api.github.com/repos/gutideng280-stack/video-information" -Method Get -ErrorAction SilentlyContinue
    if ($response) {
        Write-Host "✓ Repository exists: $($response.html_url)" -ForegroundColor Green
        Write-Host "  Description: $($response.description)" -ForegroundColor Gray
        Write-Host "  Default branch: $($response.default_branch)" -ForegroundColor Gray
        Write-Host "  Stars: $($response.stargazers_count)" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Could not check repository (may be private or doesn't exist)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== End of Check ===" -ForegroundColor Cyan
