param([ValidateSet('step6', 'step7')][string]$Phase = 'step7')
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskEnvironment = Join-Path $taskRoot '.env.test'
if (-not (Test-Path -LiteralPath $taskEnvironment)) { throw 'Run setup-development.ps1 first.' }
$taskValues = @{}
foreach ($line in [IO.File]::ReadAllLines($taskEnvironment)) {
    if ($line -match '^([A-Z_]+)=([a-f0-9]{64})$') { $taskValues[$matches[1]] = $matches[2] }
}
foreach ($key in @('POSTGRES_PASSWORD', 'MIGRATION_DB_PASSWORD', 'API_DB_PASSWORD')) {
    if (-not $taskValues.ContainsKey($key)) { throw 'Dedicated test credentials must be 32-byte random hex values.' }
}
$taskPreviousEnvironment = @{}
foreach ($key in @('TEST_DATABASE_ADMIN_URL', 'TEST_MIGRATION_DB_PASSWORD', 'TEST_API_DB_PASSWORD')) {
    $taskPreviousEnvironment[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
}
$env:TEST_DATABASE_ADMIN_URL = "postgresql+psycopg://postgres:$($taskValues.POSTGRES_PASSWORD)@127.0.0.1:15432/makan_test_control"
$env:TEST_MIGRATION_DB_PASSWORD = $taskValues.MIGRATION_DB_PASSWORD
$env:TEST_API_DB_PASSWORD = $taskValues.API_DB_PASSWORD
Push-Location (Join-Path $taskRoot 'apps/api')
try {
    & ./.venv/Scripts/python.exe -m pytest "--junitxml=../../docs/qa/$Phase/pytest.xml"
    if ($LASTEXITCODE -ne 0) { throw "Backend tests failed with exit $LASTEXITCODE" }
} finally {
    Pop-Location
    foreach ($key in $taskPreviousEnvironment.Keys) {
        [Environment]::SetEnvironmentVariable($key, $taskPreviousEnvironment[$key], 'Process')
    }
}
