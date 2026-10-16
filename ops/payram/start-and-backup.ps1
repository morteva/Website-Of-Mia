param([string]$Root = $PSScriptRoot)
$ErrorActionPreference = 'Stop'
$taskVBox = 'C:\Program Files\Oracle\VirtualBox\VBoxManage.exe'
$taskVm = 'Morteva PayRam Test'
$taskPass = Join-Path $Root 'vm-password.txt'
$taskTemp = Join-Path $Root ('backup-' + [guid]::NewGuid().ToString('N') + '.tmp')
$taskPending = $null
function Invoke-Guest([string[]]$GuestArgs) {
    & $taskVBox guestcontrol $taskVm @GuestArgs
    if ($LASTEXITCODE -ne 0) { throw "Guest operation failed ($LASTEXITCODE)" }
}
try {
    $taskState = & $taskVBox showvminfo $taskVm --machinereadable
    if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect payment VM' }
    if (-not ($taskState -contains 'VMState="running"')) {
        & $taskVBox startvm $taskVm --type headless | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'Cannot start payment VM' }
    }
    $taskReady = $false
    for ($taskAttempt=0; $taskAttempt -lt 12; $taskAttempt++) {
        & $taskVBox guestcontrol $taskVm run --exe /usr/bin/true --username root --passwordfile $taskPass --timeout 10000 --wait-stdout 2>$null
        if ($LASTEXITCODE -eq 0) { $taskReady=$true; break }
        Start-Sleep -Seconds 5
    }
    if (-not $taskReady) { throw 'Guest service unavailable after readiness retries; inspect payram-guest-watchdog.timer' }
    Invoke-Guest @('run','--exe','/bin/bash','--username','root','--passwordfile',$taskPass,'--timeout','180000','--wait-stdout','--wait-stderr','--','/root/morteva-backup-mainnet.sh')
    Invoke-Guest @('copyfrom','/root/.morteva-payram-backups/latest.tar.gz',$taskTemp,'--username','root','--passwordfile',$taskPass)
    Add-Type -AssemblyName System.Security
    $taskBytes = [IO.File]::ReadAllBytes($taskTemp)
    if ($taskBytes.Length -lt 1024) { throw 'Backup archive unexpectedly small' }
    $taskEncrypted = [Security.Cryptography.ProtectedData]::Protect($taskBytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
    $taskOutput = Join-Path $Root ('mainnet-backup-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.dpapi')
    $taskPending = $taskOutput+'.pending'
    [IO.File]::WriteAllBytes($taskPending,$taskEncrypted)
    $taskRoundtrip = [Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($taskPending),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
    $taskSha = [Security.Cryptography.SHA256]::Create()
    if ([Convert]::ToBase64String($taskSha.ComputeHash($taskBytes)) -ne [Convert]::ToBase64String($taskSha.ComputeHash($taskRoundtrip))) { throw 'Encrypted backup verification failed' }
    [IO.File]::WriteAllBytes($taskTemp,$taskRoundtrip)
    Invoke-Guest @('copyto',$taskTemp,'/root/.morteva-payram-backups/verify-roundtrip.tar.gz','--username','root','--passwordfile',$taskPass)
    Invoke-Guest @('run','--exe','/bin/bash','--username','root','--passwordfile',$taskPass,'--timeout','180000','--wait-stdout','--wait-stderr','--','/root/morteva-verify-backup.sh','/root/.morteva-payram-backups/verify-roundtrip.tar.gz')
    Move-Item -LiteralPath $taskPending -Destination $taskOutput
    $taskPending=$null
    @{success=$true; completedUtc=[DateTime]::UtcNow.ToString('o'); archive=[IO.Path]::GetFileName($taskOutput); encryptedBytes=$taskEncrypted.Length; verification='DPAPI decrypt/hash and isolated PostgreSQL full restore'} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $Root 'backup-status.json') -Encoding UTF8
    Write-Output 'Encrypted mainnet backup saved; decrypt/hash and isolated database restore passed.'
} catch {
    @{success=$false; completedUtc=[DateTime]::UtcNow.ToString('o'); error='Backup or isolated restore verification failed; inspect scheduled task output'} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $Root 'backup-status.json') -Encoding UTF8
    throw
} finally {
    if (Test-Path -LiteralPath $taskTemp) { Remove-Item -LiteralPath $taskTemp }
    if ($taskPending -and (Test-Path -LiteralPath $taskPending)) { Remove-Item -LiteralPath $taskPending }
}
