Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Starting Hotel Billing Frontend (Vite)" -ForegroundColor Green
Write-Host "  Local URL:   http://localhost:5173" -ForegroundColor Yellow
Write-Host "  Network URL: http://192.168.1.51:5173" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Cyan

Set-Location $PSScriptRoot
npm run dev -- --host
