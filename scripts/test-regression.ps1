param([ValidateSet('chromium','firefox','webkit')][string]$BrowserProject='chromium')
$ErrorActionPreference='Stop'
$taskRoot=Split-Path -Parent $PSScriptRoot
$taskResults=Join-Path $taskRoot 'apps/web/test-results/results.json'
$taskQa=Join-Path $taskRoot 'docs/qa/step10'
foreach ($taskSuite in @('acceptance','cms','seo')) {
    $taskArguments=@('-NoProfile','-File',(Join-Path $PSScriptRoot 'test-web-admin.ps1'),'-BrowserProject',$BrowserProject,'-FailFast')
    if ($taskSuite -eq 'acceptance') {$taskArguments+='-Step9Acceptance'}
    if ($taskSuite -eq 'cms') {$taskArguments+='-CmsOnly'}
    if ($taskSuite -eq 'seo') {$taskArguments+='-SeoOnly'}
    & pwsh @taskArguments
    $taskExit=$LASTEXITCODE
    if (Test-Path -LiteralPath $taskResults) {
        Copy-Item -LiteralPath $taskResults -Destination (Join-Path $taskQa "regression-$BrowserProject-$taskSuite.json")
        & (Join-Path $taskRoot 'apps/api/.venv/Scripts/python.exe') (Join-Path $PSScriptRoot 'capture-browser-quality.py') "regression-$BrowserProject-$taskSuite"
    }
    if ($taskExit -ne 0) {throw "Regression gate failed: $BrowserProject/$taskSuite"}
}
