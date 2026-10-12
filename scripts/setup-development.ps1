$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
function New-TaskSecret { return [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLowerInvariant() }
foreach ($taskEnvName in @('.env', '.env.test')) {
    $taskTarget = Join-Path $taskRoot $taskEnvName
    if (Test-Path -LiteralPath $taskTarget) { Write-Output "$taskEnvName already exists; preserved."; continue }
    $taskValues = @("POSTGRES_PASSWORD=$(New-TaskSecret)", "MIGRATION_DB_PASSWORD=$(New-TaskSecret)", "API_DB_PASSWORD=$(New-TaskSecret)")
    [IO.File]::WriteAllText($taskTarget, ($taskValues -join "`n") + "`n", [Text.UTF8Encoding]::new($false))
    Write-Output "$taskEnvName created with random local credentials; contents not printed."
}
