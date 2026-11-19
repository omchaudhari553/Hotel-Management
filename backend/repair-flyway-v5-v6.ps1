$ErrorActionPreference = 'Stop'

Write-Host '============================================================'
Write-Host ' Hotel Management - Flyway V5/V6 Checksum Repair'
Write-Host '============================================================'
Write-Host ''
Write-Host 'This fixes Flyway metadata checksums for V5 and V6 only.'
Write-Host 'It does NOT delete hotel application data.'
Write-Host ''

mvn flyway:info
if ($LASTEXITCODE -ne 0) { throw 'Flyway info failed. Verify SQL Server, database, username and password.' }

Write-Host ''
Write-Host 'Repairing Flyway schema history...'
mvn flyway:repair
if ($LASTEXITCODE -ne 0) { throw 'Flyway repair failed.' }

Write-Host ''
Write-Host 'Verifying Flyway state...'
mvn flyway:info
if ($LASTEXITCODE -ne 0) { throw 'Flyway verification failed.' }

Write-Host ''
Write-Host 'Cleaning Maven target...'
mvn clean
if ($LASTEXITCODE -ne 0) { throw 'Maven clean failed.' }

Write-Host ''
Write-Host 'DONE.'
Write-Host 'Now run: mvn spring-boot:run'
