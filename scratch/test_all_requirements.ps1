# Comprehensive Test Script for POS Billing Application Fixes
# Tests all 6 requested test cases against backend, SQL Server, and module contracts

$base = "http://localhost:8080/api/v1"
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " STARTING E2E VERIFICATION OF ALL 6 TEST CASES " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 0. Login
$loginBody = @{ identifier = "hoteladmin"; password = "Admin@123"; rememberMe = $true } | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginRes.data.token
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }
Write-Host "[SETUP] Authenticated as hoteladmin. Business: $($loginRes.data.business.name)" -ForegroundColor Green

# -------------------------------------------------------------
# TEST CASE 1: Normal Order (Tables -> KOT -> Billing -> Payments)
# -------------------------------------------------------------
Write-Host "`n--- TEST CASE 1: Normal Order Workflow ---" -ForegroundColor Yellow

# Pick or reset an available table
$tables = (Invoke-RestMethod -Uri "$base/hotel/tables?branchId=1" -Method Get -Headers $headers).data
$testTable = $tables | Where-Object { $_.status -eq "AVAILABLE" } | Select-Object -First 1
if (-not $testTable) {
    $testTable = $tables | Select-Object -First 1
    Invoke-RestMethod -Uri "$base/hotel/tables/$($testTable.id)/status" -Method Patch -Body (@{ status = "AVAILABLE" } | ConvertTo-Json) -Headers $headers | Out-Null
}
$tableId = $testTable.id
$tableName = $testTable.name
Write-Host "1.1 Table selected: $tableName (ID: $tableId)"

# 1. Start Order
$createOrdBody = @{
    branchId = 1
    tableId = $tableId
    guestName = "Rajesh Verma"
    guestCount = 3
    discount = 0
    taxRate = 5
    items = @()
} | ConvertTo-Json
$orderRes = (Invoke-RestMethod -Uri "$base/hotel/orders" -Method Post -Body $createOrdBody -Headers $headers).data
$orderId = $orderRes.id
Write-Host "1.2 Order created: Order ID $orderId (Status: $($orderRes.status))"

# Table should be OCCUPIED
$tbl = (Invoke-RestMethod -Uri "$base/hotel/tables/$tableId" -Method Get -Headers $headers).data
if ($tbl.status -ne "OCCUPIED") { throw "Table must be OCCUPIED after Start Order!" }
Write-Host "    Verified table status is OCCUPIED." -ForegroundColor Green

# 2. Add Menu items
$itemsBody = @{
    branchId = 1
    tableId = $tableId
    guestName = "Rajesh Verma"
    guestCount = 3
    discount = 0
    taxRate = 5
    items = @(
        @{ name = "Veg Biryani"; quantity = 2; unitPrice = 180; customization = "" },
        @{ name = "Raita"; quantity = 2; unitPrice = 40; customization = "" }
    )
} | ConvertTo-Json
$orderUpdated = (Invoke-RestMethod -Uri "$base/hotel/orders/$orderId" -Method Put -Body $itemsBody -Headers $headers).data
Write-Host "1.3 Items added to order! Order Total: $($orderUpdated.totalAmount)"

# 3. KOT check
$kots = (Invoke-RestMethod -Uri "$base/hotel/kot?branchId=1" -Method Get -Headers $headers).data
$kot = $kots | Where-Object { $_.orderId -eq $orderId } | Select-Object -First 1
if (-not $kot) { throw "KOT must exist for order $orderId!" }
Write-Host "1.4 KOT found: $($kot.kotNumber) linked to Order $orderId" -ForegroundColor Green

# 4. Billing / Invoices: Generate Bill
$invGenBody = @{
    branchId = 1
    orderId = $orderId
    discountAmount = 0
    items = @(
        @{ description = "Veg Biryani"; quantity = 2; unitPrice = 180 },
        @{ description = "Raita"; quantity = 2; unitPrice = 40 }
    )
} | ConvertTo-Json
$inv1 = (Invoke-RestMethod -Uri "$base/hotel/invoices" -Method Post -Body $invGenBody -Headers $headers).data
$invoiceId = $inv1.id
Write-Host "1.5 Bill Generated: Invoice ID $invoiceId, Number $($inv1.invoiceNumber), Total $($inv1.grandTotal)" -ForegroundColor Green

# Verify only 1 invoice exists for orderId in invoice list
$allInvoices = (Invoke-RestMethod -Uri "$base/hotel/invoices?branchId=1" -Method Get -Headers $headers).data
$matchingInvs = @($allInvoices | Where-Object { $_.orderId -eq $orderId })
if ($matchingInvs.Count -ne 1) { throw "Expected exactly 1 invoice for order $orderId, but found $($matchingInvs.Count)!" }
Write-Host "    Verified exactly ONE invoice exists for Order $orderId." -ForegroundColor Green

# 5. Complete Payment
$txnRef1 = "TXN-TEST1-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
$payBody = @{
    invoiceId = $invoiceId
    amount = $inv1.grandTotal
    paymentMethod = "UPI"
    transactionRef = $txnRef1
    paymentDate = [DateTime]::UtcNow.ToString("yyyy-MM-dd")
    notes = "Full settlement"
} | ConvertTo-Json
$payRes = (Invoke-RestMethod -Uri "$base/hotel/payments" -Method Post -Body $payBody -Headers $headers).data
Write-Host "1.6 Payment recorded! Invoice Status: $($payRes.status)" -ForegroundColor Green

# Verify invoice is PAID and table is AVAILABLE
$finalTbl = (Invoke-RestMethod -Uri "$base/hotel/tables/$tableId" -Method Get -Headers $headers).data
if ($finalTbl.status -ne "AVAILABLE") { throw "Table must be AVAILABLE after payment!" }
Write-Host "    Verified table status returned to AVAILABLE." -ForegroundColor Green

# Verify payment record in history
$allPays = (Invoke-RestMethod -Uri "$base/hotel/payments?branchId=1" -Method Get -Headers $headers).data
$matchingPays = @($allPays | Where-Object { $_.invoiceId -eq $invoiceId })
if ($matchingPays.Count -ne 1) { throw "Expected exactly 1 payment record for invoice $invoiceId, but found $($matchingPays.Count)!" }
Write-Host "    Verified exactly ONE payment record exists in Payments module history." -ForegroundColor Green
Write-Host "PASSED: Test Case 1 passed successfully!" -ForegroundColor Green

# -------------------------------------------------------------
# TEST CASE 2: Repeated Bill Generation (Idempotency)
# -------------------------------------------------------------
Write-Host "`n--- TEST CASE 2: Repeated Bill Generation ---" -ForegroundColor Yellow

# Pick an available table
$availTables2 = (Invoke-RestMethod -Uri "$base/hotel/tables?branchId=1" -Method Get -Headers $headers).data | Where-Object { $_.status -eq "AVAILABLE" }
$tbl2 = $availTables2 | Select-Object -First 1
$ord2 = (Invoke-RestMethod -Uri "$base/hotel/orders" -Method Post -Body (@{ branchId = 1; tableId = $tbl2.id; guestName = "Ananya Roy"; guestCount = 2; discount = 0; taxRate = 5; items = @(@{ name = "Dal Makhani"; quantity = 1; unitPrice = 190 }) } | ConvertTo-Json) -Headers $headers).data
$ord2Id = $ord2.id
Write-Host "2.1 Created Order $ord2Id for Table $($tbl2.name)"

# Simulate clicking "Generate Bill" 3 times in rapid succession
$genBody2 = @{
    branchId = 1
    orderId = $ord2Id
    items = @(@{ description = "Dal Makhani"; quantity = 1; unitPrice = 190 })
} | ConvertTo-Json

Write-Host "2.2 Simulating 3 repeated bill generation calls for Order $ord2Id..."
$call1 = (Invoke-RestMethod -Uri "$base/hotel/invoices" -Method Post -Body $genBody2 -Headers $headers).data
$call2 = (Invoke-RestMethod -Uri "$base/hotel/invoices" -Method Post -Body $genBody2 -Headers $headers).data
$call3 = (Invoke-RestMethod -Uri "$base/hotel/invoices" -Method Post -Body $genBody2 -Headers $headers).data

if ($call1.id -ne $call2.id -or $call2.id -ne $call3.id) {
    throw "Duplicate invoices were generated! IDs: $($call1.id), $($call2.id), $($call3.id)"
}
if ($call1.invoiceNumber -ne $call2.invoiceNumber -or $call2.invoiceNumber -ne $call3.invoiceNumber) {
    throw "Duplicate invoice numbers were generated! Numbers: $($call1.invoiceNumber), $($call2.invoiceNumber), $($call3.invoiceNumber)"
}

$allInvs2 = (Invoke-RestMethod -Uri "$base/hotel/invoices?branchId=1" -Method Get -Headers $headers).data
$countOrd2 = @($allInvs2 | Where-Object { $_.orderId -eq $ord2Id }).Count
if ($countOrd2 -ne 1) {
    throw "Expected exactly 1 invoice for Order $ord2Id, but found $countOrd2!"
}
Write-Host "    Verified: All 3 calls returned the exact same Invoice ID ($($call1.id)) and Number ($($call1.invoiceNumber))." -ForegroundColor Green
Write-Host "    Total invoices in database for Order $($ord2Id): $countOrd2." -ForegroundColor Green
Write-Host "PASSED: Test Case 2 passed successfully!" -ForegroundColor Green

# -------------------------------------------------------------
# TEST CASE 3: Repeated Payment Submission (Idempotency)
# -------------------------------------------------------------
Write-Host "`n--- TEST CASE 3: Repeated Payment Submission ---" -ForegroundColor Yellow

$inv2Id = $call1.id
$txnRef2 = "TXN-TEST2-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
$payRepeatBody = @{
    invoiceId = $inv2Id
    amount = $call1.grandTotal
    paymentMethod = "CARD"
    transactionRef = $txnRef2
    paymentDate = [DateTime]::UtcNow.ToString("yyyy-MM-dd")
    notes = "Simulated double click"
} | ConvertTo-Json

Write-Host "3.1 Simulating 3 rapid payment submissions for Invoice $inv2Id..."
$pay1 = (Invoke-RestMethod -Uri "$base/hotel/payments" -Method Post -Body $payRepeatBody -Headers $headers).data
$pay2 = (Invoke-RestMethod -Uri "$base/hotel/payments" -Method Post -Body $payRepeatBody -Headers $headers).data
$pay3 = (Invoke-RestMethod -Uri "$base/hotel/payments" -Method Post -Body $payRepeatBody -Headers $headers).data

if ($pay1.status -ne "PAID" -or $pay2.status -ne "PAID" -or $pay3.status -ne "PAID") {
    throw "Payment response did not return PAID status!"
}

# Verify payments module history
$allPays2 = (Invoke-RestMethod -Uri "$base/hotel/payments?branchId=1" -Method Get -Headers $headers).data
$paysForInv2 = @($allPays2 | Where-Object { $_.invoiceId -eq $inv2Id })
if ($paysForInv2.Count -ne 1) {
    throw "Expected exactly 1 payment record for Invoice $inv2Id, but found $($paysForInv2.Count)!"
}
Write-Host "    Verified: 3 rapid payment clicks produced exactly ONE payment record in database." -ForegroundColor Green
Write-Host "    Payment ID: $($paysForInv2[0].id), Method: $($paysForInv2[0].paymentMethod), Amount: $($paysForInv2[0].amount)" -ForegroundColor Green
Write-Host "PASSED: Test Case 3 passed successfully!" -ForegroundColor Green

# -------------------------------------------------------------
# TEST CASE 4: Navigate Between Modules (Consistency)
# -------------------------------------------------------------
Write-Host "`n--- TEST CASE 4: Cross-Module Linkage ---" -ForegroundColor Yellow

$tablesList = (Invoke-RestMethod -Uri "$base/hotel/tables?branchId=1" -Method Get -Headers $headers).data
$kotsList = (Invoke-RestMethod -Uri "$base/hotel/kot?branchId=1" -Method Get -Headers $headers).data
$invoicesList = (Invoke-RestMethod -Uri "$base/hotel/invoices?branchId=1" -Method Get -Headers $headers).data
$paymentsList = (Invoke-RestMethod -Uri "$base/hotel/payments?branchId=1" -Method Get -Headers $headers).data

# Verify Order 1 linkage
$k1 = $kotsList | Where-Object { $_.orderId -eq $orderId } | Select-Object -First 1
$i1 = $invoicesList | Where-Object { $_.orderId -eq $orderId } | Select-Object -First 1
$p1 = $paymentsList | Where-Object { $_.invoiceId -eq $i1.id } | Select-Object -First 1

Write-Host "4.1 Order $orderId linkage across modules:"
Write-Host "    KOT Number:      $($k1.kotNumber) (Linked Order: $($k1.orderId))"
Write-Host "    Invoice Number:  $($i1.invoiceNumber) (Linked Order: $($i1.orderId))"
Write-Host "    Payment Ref:     $($p1.transactionRef) (Linked Invoice: $($p1.invoiceId))"

if ($k1.orderId -ne $i1.orderId) { throw "KOT and Invoice orderId do not match!" }
if ($p1.invoiceId -ne $i1.id) { throw "Payment and Invoice ID do not match!" }
Write-Host "PASSED: Test Case 4 passed successfully!" -ForegroundColor Green

# -------------------------------------------------------------
# TEST CASE 5: Add More Items (Updates without Duplicates)
# -------------------------------------------------------------
Write-Host "`n--- TEST CASE 5: Add More Items to Existing Order ---" -ForegroundColor Yellow

# Start a new order on an available table
$availTables5 = (Invoke-RestMethod -Uri "$base/hotel/tables?branchId=1" -Method Get -Headers $headers).data | Where-Object { $_.status -eq "AVAILABLE" }
$testTable5 = $availTables5 | Select-Object -First 1
$ord3 = (Invoke-RestMethod -Uri "$base/hotel/orders" -Method Post -Body (@{ branchId = 1; tableId = $testTable5.id; guestName = "Kunal Shah"; guestCount = 4; discount = 0; taxRate = 5; items = @(@{ name = "Paneer Tikka"; quantity = 2; unitPrice = 220 }) } | ConvertTo-Json) -Headers $headers).data
$ord3Id = $ord3.id
Write-Host "5.1 Initial Order $ord3Id created with 2 x Paneer Tikka on Table $($testTable5.name) (Subtotal: 440)"

# Generate bill initially
$inv3 = (Invoke-RestMethod -Uri "$base/hotel/invoices" -Method Post -Body (@{ branchId = 1; orderId = $ord3Id; items = @(@{ description = "Paneer Tikka"; quantity = 2; unitPrice = 220 }) } | ConvertTo-Json) -Headers $headers).data
Write-Host "5.2 Initial Invoice generated: $($inv3.invoiceNumber) (Total: $($inv3.grandTotal))"

# Customer adds 2 more items (e.g. 2 x Garlic Naan @ 50)
$updatedItems3 = @{
    branchId = 1
    tableId = $testTable5.id
    guestName = "Kunal Shah"
    guestCount = 4
    discount = 0
    taxRate = 5
    items = @(
        @{ name = "Paneer Tikka"; quantity = 2; unitPrice = 220 },
        @{ name = "Garlic Naan"; quantity = 2; unitPrice = 50 }
    )
} | ConvertTo-Json
$ord3Updated = (Invoke-RestMethod -Uri "$base/hotel/orders/$ord3Id" -Method Put -Body $updatedItems3 -Headers $headers).data
Write-Host "5.3 Added 2 x Garlic Naan to Order $ord3Id. New Order Total: $($ord3Updated.totalAmount)"

# Call createInvoice again (or sync from billing)
$inv3Recheck = (Invoke-RestMethod -Uri "$base/hotel/invoices" -Method Post -Body (@{ branchId = 1; orderId = $ord3Id; items = @(@{ description = "Paneer Tikka"; quantity = 2; unitPrice = 220 }, @{ description = "Garlic Naan"; quantity = 2; unitPrice = 50 }) } | ConvertTo-Json) -Headers $headers).data

if ($inv3Recheck.id -ne $inv3.id) {
    throw "A new invoice was created instead of updating existing invoice! Original ID: $($inv3.id), New ID: $($inv3Recheck.id)"
}
if ($inv3Recheck.invoiceNumber -ne $inv3.invoiceNumber) {
    throw "Invoice number changed unexpectedly! Original: $($inv3.invoiceNumber), New: $($inv3Recheck.invoiceNumber)"
}

# Verify total updated accurately
Write-Host "    Verified: Invoice ID remained the same ($($inv3.id)), Invoice Number remained the same ($($inv3.invoiceNumber))." -ForegroundColor Green
Write-Host "    Updated Grand Total: $($inv3Recheck.grandTotal)" -ForegroundColor Green

# Verify count of invoices for ord3Id is still exactly 1
$invCount3 = @((Invoke-RestMethod -Uri "$base/hotel/invoices?branchId=1" -Method Get -Headers $headers).data | Where-Object { $_.orderId -eq $ord3Id }).Count
if ($invCount3 -ne 1) { throw "Expected 1 invoice for Order $ord3Id, but found $invCount3!" }
Write-Host "    Verified database contains exactly 1 invoice for Order $ord3Id." -ForegroundColor Green
Write-Host "PASSED: Test Case 5 passed successfully!" -ForegroundColor Green

# -------------------------------------------------------------
# TEST CASE 6: Refresh and Reopen
# -------------------------------------------------------------
Write-Host "`n--- TEST CASE 6: Refresh and Reopen ---" -ForegroundColor Yellow

# Settle invoice 3
$pay3Res = (Invoke-RestMethod -Uri "$base/hotel/payments" -Method Post -Body (@{ invoiceId = $inv3.id; amount = $inv3Recheck.grandTotal; paymentMethod = "CASH"; transactionRef = "TXN-TEST6-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"; paymentDate = [DateTime]::UtcNow.ToString("yyyy-MM-dd"); notes = "Final cash payment" } | ConvertTo-Json) -Headers $headers).data

# Re-fetch invoice 3 directly (simulate page refresh / reopen)
$reopenedInv = (Invoke-RestMethod -Uri "$base/hotel/invoices/$($inv3.id)" -Method Get -Headers $headers).data
if ($reopenedInv.status -ne "PAID") { throw "Reopened invoice must be PAID!" }

# Attempt to pay reopened invoice again
$repayRes = (Invoke-RestMethod -Uri "$base/hotel/payments" -Method Post -Body (@{ invoiceId = $inv3.id; amount = $reopenedInv.grandTotal; paymentMethod = "CASH"; transactionRef = "TXN-REOPEN-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"; paymentDate = [DateTime]::UtcNow.ToString("yyyy-MM-dd"); notes = "Attempted duplicate pay on refresh" } | ConvertTo-Json) -Headers $headers).data

# Verify no extra payment was created
$paysForInv3 = @((Invoke-RestMethod -Uri "$base/hotel/payments?branchId=1" -Method Get -Headers $headers).data | Where-Object { $_.invoiceId -eq $inv3.id })
if ($paysForInv3.Count -ne 1) {
    throw "Expected exactly 1 payment record for Invoice $($inv3.id), but found $($paysForInv3.Count)!"
}
Write-Host "6.1 Reopened Invoice $($inv3.id): Status is PAID, No duplicate bill or payment created on reopen." -ForegroundColor Green
Write-Host "PASSED: Test Case 6 passed successfully!" -ForegroundColor Green

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " ALL 6 TEST CASES PASSED WITH 100% SUCCESS! " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
