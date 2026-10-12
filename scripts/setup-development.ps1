$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
function New-TaskSecret { return [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLowerInvariant() }
foreach ($taskEnvName in @('.env', '.env.test')) {
    $taskTarget = Join-Path $taskRoot $taskEnvName
    $taskExisting = if (Test-Path -LiteralPath $taskTarget) { [IO.File]::ReadAllText($taskTarget) } else { '' }
    $taskValues = @()
    foreach ($key in @('POSTGRES_PASSWORD','MIGRATION_DB_PASSWORD','API_DB_PASSWORD','AUTH_SECRET','AUTH_MFA_KEY')) {
        if ($taskExisting -notmatch "(?m)^$key=") { $taskValues += "$key=$(New-TaskSecret)" }
    }
    if ($taskValues.Count -gt 0) {
        [IO.File]::WriteAllText($taskTarget, $taskExisting.TrimEnd() + "`n" + ($taskValues -join "`n") + "`n", [Text.UTF8Encoding]::new($false))
    }
    Write-Output "$taskEnvName preserved; missing local keys initialized without printing contents."
}
