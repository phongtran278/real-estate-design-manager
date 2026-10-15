param([switch]$Force)
$ErrorActionPreference = 'Stop'
$source = (Resolve-Path $PSScriptRoot).Path
$extensions = Join-Path $env:APPDATA 'Adobe\CEP\extensions'
$target = Join-Path $extensions 'real-estate-design-manager'
New-Item -ItemType Directory -Path $extensions -Force | Out-Null
if(Test-Path $target){
  $item = Get-Item $target -Force
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    $current = $item.Target
    if ($current -is [array]) { $current = $current[0] }
    if ([string]$current -eq $source) { Write-Host 'Already linked to this Git checkout.'; exit 0 }
    if(-not $Force){throw "Another junction exists at $target. Re-run with -Force only if you want to replace it."}
    cmd /c "rmdir `"$target`"" | Out-Null
  } else {
    $backup = $target + '.backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
    Move-Item -LiteralPath $target -Destination $backup
    Write-Host "Previous installed extension backed up to $backup"
  }
}
$cmd = 'mklink /J "' + $target + '" "' + $source + '"'
cmd /c $cmd
if($LASTEXITCODE -ne 0){throw 'Failed to create directory junction. Check folder permissions.'}
foreach($v in @(10,11,12,13,14)){
  $key="HKCU:\Software\Adobe\CSXS.$v"
  New-Item -Path $key -Force | Out-Null
  New-ItemProperty -Path $key -Name PlayerDebugMode -Value '1' -PropertyType String -Force | Out-Null
}
Write-Host "Linked $target -> $source"
Write-Host 'For everyday updates: git pull; click Reload Panel. No Windows reboot.'
Write-Host 'First install or manifest changes may require restarting Illustrator.'
