$path = 'public/feed.html'
$content = Get-Content -Raw -Encoding Unicode $path
$content = $content -replace 'await API\.request\(', 'await window.SpopeerAPI.request('
Set-Content -Encoding Unicode $path $content
Write-Host "Fixed API.request references in feed.html"
