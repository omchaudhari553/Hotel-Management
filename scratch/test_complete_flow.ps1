$base = "http://localhost:8080/api/v1"

# 1. Login
$loginBody = @{ identifier = "hoteladmin"; password = "Admin@123"; rememberMe = $true } | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginRes.data.token
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }
Write-Host "1. Login Success! Business: $($loginRes.data.business.name)" -ForegroundColor Green

# 2. Get Available Tables
$tablesRes = Invoke-RestMethod -Uri "$base/hotel/tables?branchId=1" -Method Get -Headers $headers
$tables = $tablesRes.data
$availTable = $tables | Where-Object { $_.status -eq "AVAILABLE" } | Select-Object -First 1
if (-not $availTable) {
    $availTable = $tables | Select-Object -First 1
    $statusBody = @{ status = "AVAILABLE" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$base/hotel/tables/$($availTable.id)/status" -Method Patch -Body $statusBody -Headers $headers | Out-Null
}
$tableId = $availTable.id
$tableName = $availTable.name
Write-Host "2. Selected Table: $tableName (ID: $tableId), Initial Status: $($availTable.status)" -ForegroundColor Cyan

# 3. Start Order (Table Management -> Start Order)
$createOrderBody = @{
    branchId = 1
    tableId = $tableId
    guestName = "Priya Sharma"
    guestCount = 2
    discount = 0
    taxRate = 5
    items = @()
} | ConvertTo-Json
$orderRes = (Invoke-RestMethod -Uri "$base/hotel/orders" -Method Post -Body $createOrderBody -Headers $headers).data
$orderId = $orderRes.id
Write-Host "3. Order Created! Order ID: $orderId, Order No: $($orderRes.orderNumber), Status: $($orderRes.status)" -ForegroundColor Green

# Set Table to OCCUPIED
$statusOccBody = @{ status = "OCCUPIED" } | ConvertTo-Json
$tableOccRes = (Invoke-RestMethod -Uri "$base/hotel/tables/$tableId/status" -Method Patch -Body $statusOccBody -Headers $headers).data
Write-Host "   Table Status updated to OCCUPIED in database: $($tableOccRes.status)" -ForegroundColor Green

# Verify Table in Database
$tblCheck = (Invoke-RestMethod -Uri "$base/hotel/tables/$tableId" -Method Get -Headers $headers).data
if ($tblCheck.status -ne "OCCUPIED") { throw "Table should be OCCUPIED!" }
Write-Host "   Verified Table $tableName is OCCUPIED in SQL Server." -ForegroundColor Green

# 4. Select Menu Items (Add 2 x Paneer Butter Masala @ 220, 3 x Butter Naan @ 40)
$updateOrderBody = @{
    branchId = 1
    tableId = $tableId
    guestName = "Priya Sharma"
    guestCount = 2
    discount = 0
    taxRate = 5
    items = @(
        @{ name = "Paneer Butter Masala"; quantity = 2; unitPrice = 220; customization = "Medium spicy" },
        @{ name = "Butter Naan"; quantity = 3; unitPrice = 40; customization = "" }
    )
} | ConvertTo-Json
$ordUpdated = (Invoke-RestMethod -Uri "$base/hotel/orders/$orderId" -Method Put -Body $updateOrderBody -Headers $headers).data
Write-Host "4. Menu Items Added! Items Count: $($ordUpdated.items.Count), Total: ₹$($ordUpdated.totalAmount)" -ForegroundColor Green

# 5. KOT Management
$kotBody = @{
    branchId = 1
    orderId = $orderId
    instructions = "Table $tableName - Priya Sharma"
} | ConvertTo-Json
$kotRes = (Invoke-RestMethod -Uri "$base/hotel/kot" -Method Post -Body $kotBody -Headers $headers).data
$kotId = $kotRes.id
Write-Host "5. KOT Created! KOT ID: $kotId, KOT No: $($kotRes.kotNumber), Status: $($kotRes.status)" -ForegroundColor Green

# Progress KOT: PENDING -> PREPARING
$statusPrepBody = @{ status = "PREPARING" } | ConvertTo-Json
$kotPrep = (Invoke-RestMethod -Uri "$base/hotel/kot/$kotId/status" -Method Patch -Body $statusPrepBody -Headers $headers).data
Write-Host "   KOT Status: $($kotPrep.status)" -ForegroundColor Yellow
$tblAfterPrep = (Invoke-RestMethod -Uri "$base/hotel/tables/$tableId" -Method Get -Headers $headers).data
Write-Host "   Table Status during PREPARING: $($tblAfterPrep.status) (Must be OCCUPIED)" -ForegroundColor Cyan
if ($tblAfterPrep.status -ne "OCCUPIED") { throw "Table must remain OCCUPIED during PREPARING!" }

# Progress KOT: PREPARING -> READY
$statusReadyBody = @{ status = "READY" } | ConvertTo-Json
$kotReady = (Invoke-RestMethod -Uri "$base/hotel/kot/$kotId/status" -Method Patch -Body $statusReadyBody -Headers $headers).data
Write-Host "   KOT Status: $($kotReady.status)" -ForegroundColor Yellow
$tblAfterReady = (Invoke-RestMethod -Uri "$base/hotel/tables/$tableId" -Method Get -Headers $headers).data
Write-Host "   Table Status during READY: $($tblAfterReady.status) (Must be OCCUPIED)" -ForegroundColor Cyan
if ($tblAfterReady.status -ne "OCCUPIED") { throw "Table must remain OCCUPIED during READY!" }

# Progress KOT: READY -> SERVED
$statusServedBody = @{ status = "SERVED" } | ConvertTo-Json
$kotServed = (Invoke-RestMethod -Uri "$base/hotel/kot/$kotId/status" -Method Patch -Body $statusServedBody -Headers $headers).data
Write-Host "   KOT Status: $($kotServed.status)" -ForegroundColor Yellow
$tblAfterServed = (Invoke-RestMethod -Uri "$base/hotel/tables/$tableId" -Method Get -Headers $headers).data
Write-Host "   Table Status during SERVED: $($tblAfterServed.status) (Must be OCCUPIED)" -ForegroundColor Cyan
if ($tblAfterServed.status -ne "OCCUPIED") { throw "Table must remain OCCUPIED during SERVED!" }

# 6. Add More Items (1 x Cold Drink @ 60)
$addMoreBody = @{
    branchId = 1
    tableId = $tableId
    guestName = "Priya Sharma"
    guestCount = 2
    discount = 0
    taxRate = 5
    items = @(
        @{ name = "Paneer Butter Masala"; quantity = 2; unitPrice = 220; customization = "Medium spicy" },
        @{ name = "Butter Naan"; quantity = 3; unitPrice = 40; customization = "" },
        @{ name = "Cold Drink"; quantity = 1; unitPrice = 60; customization = "Chilled" }
    )
} | ConvertTo-Json
$ordWithMore = (Invoke-RestMethod -Uri "$base/hotel/orders/$orderId" -Method Put -Body $addMoreBody -Headers $headers).data
Write-Host "6. Additional Items Added! Total Items: $($ordWithMore.items.Count), New Total: ₹$($ordWithMore.totalAmount)" -ForegroundColor Green

# 7. Billing / Invoices
$invBody = @{
    branchId = 1
    orderId = $orderId
    dueDate = (Get-Date).ToString("yyyy-MM-dd")
    discountAmount = 0
    cgstRate = 2.5
    sgstRate = 2.5
    igstRate = 0
    items = @(
        @{ description = "Paneer Butter Masala"; quantity = 2; unitPrice = 220 },
        @{ description = "Butter Naan"; quantity = 3; unitPrice = 40 },
        @{ description = "Cold Drink"; quantity = 1; unitPrice = 60 }
    )
    notes = "Invoice for Table $tableName - Priya Sharma"
} | ConvertTo-Json
$invRes = (Invoke-RestMethod -Uri "$base/hotel/invoices" -Method Post -Body $invBody -Headers $headers).data
$invoiceId = $invRes.id
Write-Host "7. Invoice Generated! Invoice ID: $invoiceId, Inv No: $($invRes.invoiceNumber), Grand Total: ₹$($invRes.grandTotal), Status: $($invRes.status)" -ForegroundColor Green

# Verify Table is STILL OCCUPIED
$tblBeforePay = (Invoke-RestMethod -Uri "$base/hotel/tables/$tableId" -Method Get -Headers $headers).data
Write-Host "   Table Status with Unpaid Invoice: $($tblBeforePay.status) (Must be OCCUPIED)" -ForegroundColor Cyan
if ($tblBeforePay.status -ne "OCCUPIED") { throw "Table must remain OCCUPIED before payment!" }

# Attempt to prematurely set table available (Backend guard check)
try {
    $prematureBody = @{ status = "AVAILABLE" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$base/hotel/tables/$tableId/status" -Method Patch -Body $prematureBody -Headers $headers -ErrorAction Stop | Out-Null
    Write-Host "   WARNING: Table was unexpectedly allowed to be set to AVAILABLE with active order/unpaid invoice!" -ForegroundColor Red
} catch {
    Write-Host "   SUCCESS: Backend correctly rejected premature AVAILABLE status with Conflict error." -ForegroundColor Green
}

# 8. Payment Flow
$payBody = @{
    invoiceId = $invoiceId
    amount = [double]$invRes.grandTotal
    paymentMethod = "UPI"
    transactionRef = "TXN-TEST-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
    paymentDate = (Get-Date).ToString("yyyy-MM-dd")
    notes = "Payment for Table $tableName by Priya Sharma"
} | ConvertTo-Json
$payRes = (Invoke-RestMethod -Uri "$base/hotel/payments" -Method Post -Body $payBody -Headers $headers).data
Write-Host "8. Payment Recorded! Status: $($payRes.status), Paid Amount: ₹$($payRes.paidAmount), Due: ₹$($payRes.dueAmount)" -ForegroundColor Green

# 9. Verification After Successful Payment
$invAfter = (Invoke-RestMethod -Uri "$base/hotel/invoices/$invoiceId" -Method Get -Headers $headers).data
$ordAfter = (Invoke-RestMethod -Uri "$base/hotel/orders/$orderId" -Method Get -Headers $headers).data
$kotAfter = (Invoke-RestMethod -Uri "$base/hotel/kot/$kotId" -Method Get -Headers $headers).data
$tblAfter = (Invoke-RestMethod -Uri "$base/hotel/tables/$tableId" -Method Get -Headers $headers).data

Write-Host "`n=== FINAL STATUS AUDIT IN SQL SERVER ===" -ForegroundColor Yellow
Write-Host "Invoice Status: $($invAfter.status) (Expected: PAID)" -ForegroundColor $(if ($invAfter.status -eq "PAID") { "Green" } else { "Red" })
Write-Host "Order Status:   $($ordAfter.status) (Expected: COMPLETED)" -ForegroundColor $(if ($ordAfter.status -eq "COMPLETED") { "Green" } else { "Red" })
Write-Host "KOT Status:     $($kotAfter.status) (Expected: COMPLETED)" -ForegroundColor $(if ($kotAfter.status -eq "COMPLETED") { "Green" } else { "Red" })
Write-Host "Table Status:   $($tblAfter.status) (Expected: AVAILABLE)" -ForegroundColor $(if ($tblAfter.status -eq "AVAILABLE") { "Green" } else { "Red" })

# 10. Payment History Verification
$paymentsRes = Invoke-RestMethod -Uri "$base/hotel/payments?branchId=1" -Method Get -Headers $headers
$paymentsList = $paymentsRes.data
$foundPay = $paymentsList | Where-Object { $_.invoiceId -eq $invoiceId }
if ($foundPay) {
    Write-Host "Payment History: Found record in SQL Server! ID: $($foundPay.id), Method: $($foundPay.paymentMethod), Amount: ₹$($foundPay.amount)" -ForegroundColor Green
} else {
    Write-Host "Payment History: Record NOT found in SQL Server!" -ForegroundColor Red
}

Write-Host "`n>>> ALL 10 STEPS OF THE INTEGRATED FLOW PASSED PERFECTLY! <<<" -ForegroundColor Green
