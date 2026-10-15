$ErrorActionPreference='Stop'
Set-Location $PSScriptRoot
git pull --ff-only
Write-Host 'Update complete. Click Reload Panel in Illustrator.'
