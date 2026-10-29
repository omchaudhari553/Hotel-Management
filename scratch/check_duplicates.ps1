$base = "http://localhost:8080/api/v1"
$loginBody = @{ identifier = "hoteladmin"; password = "Admin@123"; rememberMe = $true } | ConvertTo-Json
$token = (Invoke-RestMethod -Uri "$base/auth/login" -Method Post -Body $loginBody -ContentType "application/json").data.token
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }
$invs = (Invoke-RestMethod -Uri "$base/hotel/invoices" -Method Get -Headers $headers).data
Write-Host "Total invoices: $($invs.Count)"
$byOrder = $invs | Where-Object { $_.orderId } | Group-Object orderId
$dups = $byOrder | Where-Object { $_.Count -gt 1 }
Write-Host "Orders with duplicate invoices: $($dups.Count)"
if ($dups.Count -gt 0) {
    $dups | ForEach-Object { Write-Host "Order ID $($_.Name) has $($_.Count) invoices: $($_.Group.id -join ', ')" }
}
$pays = (Invoke-RestMethod -Uri "$base/hotel/payments" -Method Get -Headers $headers).data
Write-Host "Total payments: $($pays.Count)"
$byInv = $pays | Where-Object { $_.invoiceId } | Group-Object invoiceId
$dupPays = $byInv | Where-Object { $_.Count -gt 1 }
Write-Host "Invoices with duplicate payments: $($dupPays.Count)"
