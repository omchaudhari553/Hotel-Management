$base = 'http://localhost:8080/api/v1'
$loginBody = @{ identifier = 'hoteladmin'; password = 'Admin@123'; rememberMe = $true } | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -Body $loginBody -ContentType 'application/json'
$headers = @{ 'Authorization' = "Bearer $($loginRes.data.token)"; 'Content-Type' = 'application/json' }
try {
    $res = Invoke-RestMethod -Uri "$base/tables?branchId=1" -Method Get -Headers $headers
    Write-Host "Success:" ($res | ConvertTo-Json)
} catch {
    Write-Host "Status:" $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "Body:" $reader.ReadToEnd()
}
