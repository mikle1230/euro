# git-push.ps1 = 推送 helper, 带重试。
# 用法:  powershell -File scripts\git-push.ps1  [branch]
# 默认推送当前分支到 origin; 失败自动重试(最多 8 次)。
param([string]$Branch = "")

$ErrorActionPreference = 'Continue'

if (-not $Branch) {
  git rev-parse --abbrev-ref HEAD 2>$null | ForEach-Object { $Branch = $_ }
  if (-not $Branch) { Write-Error 'CaChUo CUrrent branch'; exit 1 }
}

Write-Host "Pushing to origin/$Branch ..."

for ($i = 1; $i -le 8; $i++) {
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  git -c http.sslBackend=openssl push origin $Branch 2>&1 | ForEach-Object { Write-Host $_ }
  $code = $LASTEXITCODE
  $sw.Stop()
  if ($code -eq 0) {
    Write-Host ("OK on try {0}, {1:n1}s" -f $i, $sw.Elapsed.TotalSeconds) -ForegroundColor Green
    exit 0
  }
  Write-Host ("try {0} failed (exit {1}), retrying..." -f $i, $code) -ForegroundColor Yellow
  Start-Sleep -Seconds 3
}

Write-Error 'Push failed after 8 tries.'
exit 1
