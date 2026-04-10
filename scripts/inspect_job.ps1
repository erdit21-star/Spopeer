$jobId = 70684203974
$j = Invoke-RestMethod -Uri "https://api.github.com/repos/erdit21-star/Spopeer/actions/jobs/$jobId"
$j.steps | ForEach-Object { "{0}`t{1}`t{2}" -f $_.number, $_.name, $_.conclusion } | Out-String | Write-Output
