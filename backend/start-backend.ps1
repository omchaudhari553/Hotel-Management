Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Starting Hotel Management Backend (Port 8080)" -ForegroundColor Green
Write-Host "  Central Database: 192.168.1.51:1433 (hotel_management)" -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Cyan

Set-Location $PSScriptRoot
mvn spring-boot:run
