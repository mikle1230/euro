# git-sync.ps1 —— 手动批量同步本地提交到 GitHub（断点重试，可反复运行）。
#
# 工作流：日常用「git add . && git commit -m "..."」在本地提交，完全不需要网络；
#        每隔一段时间（比如一天结束时）运行本脚本把积压的 commit 统一推上去。
#
# 用法：
#   powershell -File scripts\git-sync.ps1          # 查看积压 + 尝试推送当前分支
#   powershell -File scripts\git-sync.ps1 -Push     # 直接推送（跳过确认）
#   powershell -File scripts\git-sync.ps1 -DryRun   # 只查看，不推送
#
# 推送失败会自动重试（每次等几秒），网络通了就能推上去；也可隔段时间再跑一次。
param(
  [switch]$Push,
  [switch]$DryRun
)

$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$branch = git rev-parse --abbrev-ref HEAD 2>$null
if (-not $branch) { Write-Host '无法获取当前分支' -ForegroundColor Red; exit 1 }

# 本地尚未推送到 origin 的提交数
$behind = git rev-list --count origin/$branch..HEAD 2>$null
if (-not $behind) { $behind = 0 }

Write-Host ("分支: {0}" -f $branch)
Write-Host ("本地领先 origin/{0} 的提交: {1} 个" -f $branch, $behind) -ForegroundColor Cyan

if ($behind -eq 0) {
  Write-Host '没有需要推送的本地提交，一切已同步。' -ForegroundColor Green
  exit 0
}

Write-Host ''
# 列出这些提交，方便确认推的是什么
Write-Host '待推送提交：' -ForegroundColor Cyan
git log --oneline origin/$branch..HEAD 2>$null | ForEach-Object { Write-Host ("  {0}" -f $_) }

if ($DryRun) { Write-Host ''; Write-Host '[DryRun] 未推送。'; exit 0 }

if (-not $Push) {
  Write-Host ''
  Read-Host '按回车开始推送（或 Ctrl+C 取消）' | Out-Null
}

Write-Host ''
Write-Host "正在推送到 origin/$branch ..." -ForegroundColor Cyan

$maxTries = 20
for ($i = 1; $i -le $maxTries; $i++) {
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  git -c http.sslBackend=openssl -c http.postBuffer=524288000 push origin $branch 2>&1 | ForEach-Object { Write-Host $_ }
  $code = $LASTEXITCODE
  $sw.Stop()
  if ($code -eq 0) {
    Write-Host ''
    Write-Host ("✔ 推送成功（第 {0} 次尝试，耗时 {1:n1}s）" -f $i, $sw.Elapsed.TotalSeconds) -ForegroundColor Green
    exit 0
  }
  Write-Host ("第 {0} 次失败，稍后重试...（{1:n1}s）" -f $i, $sw.Elapsed.TotalSeconds) -ForegroundColor Yellow
  Start-Sleep -Seconds 5
}

Write-Host ''
Write-Host '✘ 多次重试仍未推送成功。可能是网络暂时不通。' -ForegroundColor Red
Write-Host '  你可以稍后再运行本脚本重试（本地提交不会丢，都在 git 里）。' -ForegroundColor Yellow
exit 1
