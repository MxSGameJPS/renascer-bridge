$ErrorActionPreference = 'Stop'
# Regression: 1 + 1 + 5 items with the same GeMaster reference must remain 7 entries.
$items = @(1..7 | ForEach-Object { @{ code = '10'; variable = $false } })
$encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((ConvertTo-Json -InputObject @{ entries = $items } -Depth 5 -Compress)))
$codesJson = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($encoded))
$payload = ConvertFrom-Json -InputObject $codesJson
$entries = $payload.entries
if ($null -eq $entries -or $entries.Count -ne 7) { throw ('Expected 7 launches, got ' + $entries.Count) }
foreach ($entry in $entries) {
  if ($entry.code -ne '10' -or $entry.code -isnot [string] -or $entry.variable -ne $false) {
    throw 'Product launch was corrupted by PowerShell JSON decoding'
  }
}
Write-Output 'PASS: 7 separate product launches (code 10)'