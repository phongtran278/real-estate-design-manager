$ErrorActionPreference = 'Stop'
$source = $PSScriptRoot
$target = Join-Path $env:APPDATA 'Adobe\CEP\extensions\real-estate-design-manager'
New-Item -ItemType Directory -Force -Path $target | Out-Null
Copy-Item (Join-Path $source 'CSXS') -Destination $target -Recurse -Force
Copy-Item (Join-Path $source 'panel') -Destination $target -Recurse -Force
Copy-Item (Join-Path $source 'host') -Destination $target -Recurse -Force
Copy-Item (Join-Path $source 'data') -Destination $target -Recurse -Force
foreach ($v in @(10,11,12,13,14)) {
  $key = "HKCU:\Software\Adobe\CSXS.$v"
  New-Item -Path $key -Force | Out-Null
  New-ItemProperty -Path $key -Name PlayerDebugMode -Value '1' -PropertyType String -Force | Out-Null
}
Write-Host "Installed to: $target"
Write-Host 'Restart Illustrator (not Windows), then check Window > Extensions / Extensions (Legacy).'
Write-Host 'Warning: PlayerDebugMode enables unsigned CEP development extensions in your user profile.'
