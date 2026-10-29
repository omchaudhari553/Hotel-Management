$login = Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/auth/login' -Method Post -ContentType 'application/json' -Body '{"identifier":"hoteladmin","password":"Admin@12345"}'
$token = $login.data.token
$headers = @{Authorization = "Bearer $token"; "Content-Type" = "application/json"}

$orderBody = @{
    branchId = 1
    tableId = 1
    guestName = "Sachin Tendulkar"
    guestCount = 2
    items = @(
        @{
            name = "Veg Kolhapuri"
            quantity = 1
            unitPrice = 240
        },
        @{
            name = "Butter Roti"
            quantity = 4
            unitPrice = 30
        }
    )
    discount = 0
    taxRate = 5
} | ConvertTo-Json -Depth 5

$orderRes = Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/hotel/orders' -Method Post -Headers $headers -Body $orderBody
Write-Host "Created Order on Table 01:" ($orderRes | ConvertTo-Json -Depth 5)
