$base = 'http://localhost:8080/api/v1'
$loginBody = @{ identifier = 'hoteladmin'; password = 'Admin@123'; rememberMe = $true } | ConvertTo-Json
$token = (Invoke-RestMethod -Uri "$base/auth/login" -Method Post -Body $loginBody -ContentType 'application/json').data.token
$headers = @{ 'Authorization' = "Bearer $token"; 'Content-Type' = 'application/json' }
try {
    $res = Invoke-RestMethod -Uri "$base/hotel/kots?branchId=1" -Method Get -Headers $headers
    Write-Host "KOT Count: $($res.data.Count)"
} catch {
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "Error response:" $reader.ReadToEnd()
}
