$login = Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/auth/login' -Method Post -ContentType 'application/json' -Body '{"identifier":"hoteladmin","password":"Admin@12345"}'
$token = $login.data.token
$headers = @{Authorization = "Bearer $token"}

$pis = (Invoke-RestMethod -Uri 'http://localhost:8080/api/v1/hotel/purchase-invoices' -Headers $headers).data
$pis | Select-Object id, invoiceNumber, purchaseOrderId, poNumber, supplierName, total, subtotal, taxAmount, invoiceDate | Format-Table -AutoSize
