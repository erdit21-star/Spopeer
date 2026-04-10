$url = 'https://api.github.com/repos/erdit21-star/Spopeer/actions/runs/24212357881/logs'
$zip = 'run_logs_24212357881.zip'
Invoke-WebRequest -Uri $url -OutFile $zip
Expand-Archive -Path $zip -DestinationPath run_logs -Force
Get-ChildItem run_logs -Recurse | Select-Object FullName | Out-String | Write-Output
