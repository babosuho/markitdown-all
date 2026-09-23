# UTF-8 BOM
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " All-to-Markdown Verification Harness  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$success = $true
$details = @()

# 1. Python 환경 및 패키지 검사
Write-Host "`n[1/4] Python 의존성 검사 중..." -ForegroundColor Yellow
$requiredPackages = @("markitdown", "fastapi", "uvicorn", "defusedxml", "charset_normalizer", "httpx")
foreach ($pkg in $requiredPackages) {
    python -c "import $pkg" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] $pkg" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $pkg 미설치 (pip install $pkg 필요)" -ForegroundColor Red
        $success = $false
        $details += "Missing $pkg"
    }
}

# 2. 테스트 스위트 실행
Write-Host "`n[2/4] 단위 테스트 실행 (pytest)..." -ForegroundColor Yellow
if (Test-Path "tests") {
    python -m pytest tests/ -q
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] 단위 테스트 통과" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] 단위 테스트 실패" -ForegroundColor Red
        $success = $false
        $details += "Unit tests failed"
    }
} else {
    Write-Host "  [SKIP] tests 디렉터리 없음" -ForegroundColor Gray
}

# 3. 샘플 파일 변환 스모크 테스트 (PDF & HWPX)
Write-Host "`n[3/4] 샘플 파일 스모크 테스트..." -ForegroundColor Yellow
python tests/smoke_test.py
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] 스모크 테스트 통과" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] 스모크 테스트 실패" -ForegroundColor Red
    $success = $false
    $details += "Smoke test failed"
}

# 4. 프론트엔드 정적 파일 무결성 검사
Write-Host "`n[4/4] 프론트엔드 파일 검사..." -ForegroundColor Yellow
$frontendFiles = @("frontend/index.html", "frontend/app.js", "frontend/style.css")
foreach ($f in $frontendFiles) {
    if (Test-Path $f) {
        Write-Host "  [OK] $f 존재" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $f 누락" -ForegroundColor Red
        $success = $false
        $details += "Missing $f"
    }
}

# 5. docs/PROGRESS.md에 하네스 실행 결과 append
$timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
$statusStr = if ($success) { "SUCCESS" } else { "FAIL" }
$detailStr = if ($details.Count -gt 0) { ($details -join ", ") } else { "모든 검증 통과" }
$logLine = "- [$timestamp] <$statusStr> detail=$detailStr"

Add-Content -Path "docs/PROGRESS.md" -Value $logLine -Encoding UTF8
Write-Host "`n결과가 docs/PROGRESS.md에 기록되었습니다: $logLine" -ForegroundColor Cyan

if (-not $success) {
    exit 1
}
