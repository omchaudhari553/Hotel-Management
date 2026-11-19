$ErrorActionPreference = "Stop"

Write-Host "Cleaning stale Maven build output..." -ForegroundColor Cyan
mvn clean

Write-Host "Starting Hotel Management backend..." -ForegroundColor Green
mvn spring-boot:run
