$login = Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/auth/login' -Method Post -ContentType 'application/json' -Body '{"identifier":"hoteladmin","password":"Admin@12345"}'
$token = $login.data.token
$headers = @{Authorization = "Bearer $token"}
$kot = (Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/hotel/kot?branchId=1' -Headers $headers).data | Where-Object { $_.orderId -eq 116 }
Write-Host "KOT for order 116:" ($kot | ConvertTo-Json -Depth 5)
