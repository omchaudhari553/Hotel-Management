$ErrorActionPreference = 'Stop'

Write-Host "==============================================="
Write-Host " Hotel Management - Flyway Repair"
Write-Host "==============================================="
Write-Host ""
Write-Host "This repairs ONLY Flyway metadata checksums."
Write-Host "It does NOT delete application tables or data."
Write-Host ""

mvn flyway:info
if ($LASTEXITCODE -ne 0) {
    throw "Flyway info failed. Check SQL Server and database credentials."
}

Write-Host ""
Write-Host "Repairing Flyway schema history..."
mvn flyway:repair
if ($LASTEXITCODE -ne 0) {
    throw "Flyway repair failed."
}

Write-Host ""
Write-Host "Flyway repair completed."
Write-Host ""
Write-Host "Starting clean application build..."
mvn clean
if ($LASTEXITCODE -ne 0) {
    throw "Maven clean failed."
}

Write-Host ""
Write-Host "Now run: mvn spring-boot:run"
