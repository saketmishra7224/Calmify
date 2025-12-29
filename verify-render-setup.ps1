# Render Deployment Verification Script
# Run this script to check if your project is ready for deployment

Write-Host ""
Write-Host "Checking Render Deployment Readiness..." -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check render.yaml
if (Test-Path "render.yaml") {
    Write-Host "[OK] render.yaml found" -ForegroundColor Green
} else {
    Write-Host "[ERROR] render.yaml not found" -ForegroundColor Red
    $allGood = $false
}

# Check backend
if (Test-Path "backend/package.json") {
    Write-Host "[OK] backend/package.json found" -ForegroundColor Green
    $pkg = Get-Content "backend/package.json" -Raw
    if ($pkg -match '"start"') {
        Write-Host "[OK] backend start script found" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] backend start script missing" -ForegroundColor Red
        $allGood = $false
    }
} else {
    Write-Host "[ERROR] backend/package.json not found" -ForegroundColor Red
    $allGood = $false
}

# Check frontend
if (Test-Path "frontend/package.json") {
    Write-Host "[OK] frontend/package.json found" -ForegroundColor Green
    $pkg = Get-Content "frontend/package.json" -Raw
    if ($pkg -match '"build"') {
        Write-Host "[OK] frontend build script found" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] frontend build script missing" -ForegroundColor Red
        $allGood = $false
    }
} else {
    Write-Host "[ERROR] frontend/package.json not found" -ForegroundColor Red
    $allGood = $false
}

# Check optional files
if (Test-Path "backend/.env.example") {
    Write-Host "[OK] backend/.env.example found" -ForegroundColor Green
} else {
    Write-Host "[WARN] backend/.env.example not found" -ForegroundColor Yellow
}

if (Test-Path "README.md") {
    Write-Host "[OK] README.md found" -ForegroundColor Green
} else {
    Write-Host "[WARN] README.md not found" -ForegroundColor Yellow
}

if (Test-Path ".gitignore") {
    Write-Host "[OK] .gitignore found" -ForegroundColor Green
} else {
    Write-Host "[WARN] .gitignore not found" -ForegroundColor Yellow
}

if (Test-Path ".git") {
    Write-Host "[OK] Git repository initialized" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Git not initialized - Run: git init" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""
Write-Host "Required Environment Variables for Backend:" -ForegroundColor Cyan
Write-Host "  - MONGODB_URI"
Write-Host "  - AZURE_OPENAI_API_KEY"
Write-Host "  - AZURE_OPENAI_ENDPOINT"
Write-Host "  - AZURE_OPENAI_DEPLOYMENT_NAME"
Write-Host "  - ALLOWED_ORIGINS"

Write-Host ""
Write-Host "Required Environment Variables for Frontend:" -ForegroundColor Cyan
Write-Host "  - VITE_API_URL"

Write-Host ""
if ($allGood) {
    Write-Host "SUCCESS: Your project is ready for Render deployment!" -ForegroundColor Green
} else {
    Write-Host "WARNING: Please fix the errors above before deploying." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Push code to GitHub/GitLab"
Write-Host "  2. Go to https://dashboard.render.com"
Write-Host "  3. Click New > Blueprint"
Write-Host "  4. Connect your repository"
Write-Host "  5. Configure environment variables"
Write-Host "  6. Deploy!"

Write-Host ""
Write-Host "For detailed instructions, see RENDER_DEPLOYMENT.md" -ForegroundColor Cyan
Write-Host ""
