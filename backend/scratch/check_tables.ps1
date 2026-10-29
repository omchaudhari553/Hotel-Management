$login = Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/auth/login' -Method Post -ContentType 'application/json' -Body '{"identifier":"hoteladmin","password":"Admin@12345"}'
$token = $login.data.token
$headers = @{Authorization = "Bearer $token"}
$tables = (Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/hotel/tables?branchId=1' -Headers $headers).data
$tables | Select-Object id, name, status, capacity, area | Format-Table -AutoSize
