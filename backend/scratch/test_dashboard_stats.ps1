$login = Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/auth/login' -Method Post -ContentType 'application/json' -Body '{"identifier":"hoteladmin","password":"Admin@12345"}'
$token = $login.data.token
$headers = @{Authorization = "Bearer $token"}

$stats = (Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/hotel/reports/dashboard?branchId=1' -Headers $headers).data
Write-Host "Dashboard Stats:" ($stats | ConvertTo-Json -Depth 5)
