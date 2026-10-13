param(
    [ValidateSet('msedge','chrome','bundled')][string]$ChromiumChannel = 'msedge',
    [switch]$SmokeOnly,
    [switch]$CmsOnly,
    [switch]$LearnOnly,
    [switch]$LearningLayoutOnly,
    [switch]$AdminAndLearnOnly,
    [switch]$FinalAcceptance,
    [switch]$LeadsOnly,
    [switch]$Step8Acceptance,
    [switch]$CrmLayoutOnly,
    [switch]$SeoOnly,
    [switch]$LighthouseOnly,
    [switch]$Step9Acceptance,
    [switch]$PublicOnly,
    [switch]$FoundationChecks,
    [ValidateSet('all','chromium','firefox','webkit')][string]$BrowserProject = 'all',
    [switch]$FailFast
)
$ErrorActionPreference='Stop'
$taskRoot=Split-Path -Parent $PSScriptRoot
$taskValues=@{}
foreach ($line in [IO.File]::ReadAllLines((Join-Path $taskRoot '.env.test'))) {if ($line -match '^([A-Z_]+)=([a-f0-9]{64})$') {$taskValues[$matches[1]]=$matches[2]}}
$taskPrevious=@{}
foreach ($key in @('TEST_DATABASE_ADMIN_URL','TEST_MIGRATION_DB_PASSWORD','TEST_API_DB_PASSWORD','AUTH_SECRET','AUTH_MFA_KEY','E2E_ADMIN_PASSWORD','API_INTERNAL_URL','PLAYWRIGHT_CHROMIUM_CHANNEL','E2E_SEO_FIXTURES')) {$taskPrevious[$key]=[Environment]::GetEnvironmentVariable($key,'Process')}
$env:TEST_DATABASE_ADMIN_URL="postgresql+psycopg://postgres:$($taskValues.POSTGRES_PASSWORD)@127.0.0.1:15432/makan_test_control"
$env:TEST_MIGRATION_DB_PASSWORD=$taskValues.MIGRATION_DB_PASSWORD
$env:TEST_API_DB_PASSWORD=$taskValues.API_DB_PASSWORD
$env:AUTH_SECRET=$taskValues.AUTH_SECRET
$env:AUTH_MFA_KEY=$taskValues.AUTH_MFA_KEY
$env:E2E_ADMIN_PASSWORD=[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(24))
$env:API_INTERNAL_URL='http://127.0.0.1:8100'
$env:E2E_SEO_FIXTURES=if($SeoOnly -or $LighthouseOnly){'1'}else{$null}
$env:PLAYWRIGHT_CHROMIUM_CHANNEL=if ($ChromiumChannel -eq 'bundled') {$null} else {$ChromiumChannel}
$taskPreview=Join-Path $taskRoot '.preview'
New-Item -ItemType Directory -Path $taskPreview -Force | Out-Null
if (Get-NetTCPConnection -LocalPort 8100 -State Listen -ErrorAction SilentlyContinue) {throw 'E2E API port 8100 is already in use.'}
if (Test-Path -LiteralPath (Join-Path $taskPreview 'e2e-db-name.txt')) {throw 'An earlier owned E2E fixture needs cleanup before another run.'}
$taskServer=Start-Process -FilePath (Join-Path $taskRoot 'apps/api/.venv/Scripts/python.exe') -ArgumentList ('"'+(Join-Path $taskRoot 'apps/api/tests/e2e_server.py')+'"') -WorkingDirectory (Join-Path $taskRoot 'apps/api') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $taskPreview 'api-e2e-out.log') -RedirectStandardError (Join-Path $taskPreview 'api-e2e-error.log')
try {
    $taskReady=$false
    for ($attempt=0;$attempt -lt 40;$attempt++) {
        if ($taskServer.HasExited) {throw 'Dedicated E2E API exited; inspect private .preview logs.'}
        try {if ((Invoke-WebRequest 'http://127.0.0.1:8100/api/v1/health/ready' -TimeoutSec 2).StatusCode -eq 200) {$taskReady=$true;break}} catch {}
        Start-Sleep -Milliseconds 500
    }
    if (-not $taskReady) {throw 'Dedicated E2E API did not become ready.'}
    Push-Location (Join-Path $taskRoot 'apps/web')
    # One worker avoids GPU/process contention in Windows Firefox during repeated axe pages.
    try {
        $taskBrowserArguments=@('../../node_modules/@playwright/test/cli.js','test','--workers=1')
        if ($SmokeOnly) {$taskBrowserArguments+=@('--grep','guest.*CSRF')}
        if ($CmsOnly) {$taskBrowserArguments+=@('cms.spec.ts')}
        if ($LearnOnly) {$taskBrowserArguments+=@('learning.spec.ts','learning-category.spec.ts')}
        if ($LearningLayoutOnly) {$taskBrowserArguments+=@('learning.spec.ts','--grep','learning management and library are accessible')}
        if ($AdminAndLearnOnly) {$taskBrowserArguments+=@('admin.spec.ts','learning.spec.ts')}
        if ($FinalAcceptance) {$taskBrowserArguments+=@('admin.spec.ts','learning.spec.ts','learning-category.spec.ts','public-pages.spec.ts','layout.spec.ts','--grep','admin\.spec\.ts|learning(?:-category)?\.spec\.ts|public-pages\.spec\.ts|missing route')}
        if ($LeadsOnly) {$taskBrowserArguments+=@('leads.spec.ts')}
        if ($Step8Acceptance) {$taskBrowserArguments+=@('leads.spec.ts','public-pages.spec.ts','admin.spec.ts')}
        if ($CrmLayoutOnly) {$taskBrowserArguments+=@('leads-layout.spec.ts')}
        if ($SeoOnly) {$taskBrowserArguments+=@('seo.spec.ts')}
        if ($PublicOnly) {$taskBrowserArguments+=@('public-pages.spec.ts')}
        if ($FoundationChecks) {$taskBrowserArguments+=@('layout.spec.ts','leads-layout.spec.ts','--grep','missing route|reduced motion|200 percent|CRM list')}
        if ($Step9Acceptance) {$taskBrowserArguments+=@('leads.spec.ts','public-pages.spec.ts','admin.spec.ts','learning.spec.ts','learning-category.spec.ts')}
        if ($LighthouseOnly) {$taskBrowserArguments=@('../../scripts/lighthouse-step9.mjs')}
        if ($BrowserProject -ne 'all') {$taskBrowserArguments+=@("--project=$BrowserProject")}
        if ($FailFast) {$taskBrowserArguments+=@('--max-failures=1')}
        if ((& node --version) -match '^v24\.') {
            & node @taskBrowserArguments
        } else {
            # This development host uses cached Node 24 alongside its system runtime.
            & npm.cmd exec --offline --package=node@24 -- node @taskBrowserArguments
        }
        if($LASTEXITCODE -ne 0){throw 'Browser tests failed. Use Node 24 LTS and install the selected Playwright browsers.'}
    } finally {Pop-Location}
} finally {
    $taskIds=@($taskServer.Id)+@(Get-CimInstance Win32_Process -Filter "ParentProcessId=$($taskServer.Id)" | Select-Object -ExpandProperty ProcessId)
    foreach ($taskId in $taskIds) {
        $taskProcess=Get-CimInstance Win32_Process -Filter "ProcessId=$taskId"
        # A process can exit between enumeration and inspection; CIM then has no command line.
        if ($taskProcess -and $taskProcess.CommandLine -and $taskProcess.CommandLine.Contains($taskRoot) -and $taskProcess.CommandLine.Contains('e2e_server.py')) {
            Stop-Process -Id $taskId -ErrorAction SilentlyContinue
        }
    }
    if (Get-NetTCPConnection -LocalPort 8100 -State Listen -ErrorAction SilentlyContinue) {throw 'E2E API did not stop; database cleanup deferred for inspection.'}
    & (Join-Path $taskRoot 'apps/api/.venv/Scripts/python.exe') (Join-Path $taskRoot 'apps/api/tests/e2e_cleanup.py')
    $taskCleanupExit=$LASTEXITCODE
    foreach ($key in $taskPrevious.Keys) {[Environment]::SetEnvironmentVariable($key,$taskPrevious[$key],'Process')}
    if ($taskCleanupExit -ne 0) {throw 'Dedicated E2E database cleanup failed; inspect private .preview logs before another run.'}
}
