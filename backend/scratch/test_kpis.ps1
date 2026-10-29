$login = Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/auth/login' -Method Post -ContentType 'application/json' -Body '{"identifier":"hoteladmin","password":"Admin@12345"}'
$token = $login.data.token
$headers = @{Authorization = "Bearer $token"}

$kpis = (Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/hotel/dashboard/kpis' -Headers $headers).data
Write-Host "Dashboard KPIs:" ($kpis | ConvertTo-Json -Depth 5)
