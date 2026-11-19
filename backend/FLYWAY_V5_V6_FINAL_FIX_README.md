# Final V5/V6 Flyway checksum fix

The database already contains Flyway migrations V5 and V6, but the local SQL files were changed after they were applied. Flyway therefore reports checksum mismatches.

The supplied V5 and V6 files are now the intended final migration files. Because V5/V6 are already recorded in the database, **do not edit them again after repair**. Future schema changes must use V7, V8, etc.

## Run from backend

```powershell
mvn flyway:info
mvn flyway:repair
mvn flyway:info
mvn clean
mvn spring-boot:run
```

Or run:

```powershell
.\repair-flyway-v5-v6.ps1
mvn spring-boot:run
```

## Important

- `flyway:repair` updates Flyway's recorded checksums; it does not delete hotel orders, delivery records, users, branches, or integration records.
- Do not run `DROP DATABASE`, delete `flyway_schema_history`, or manually delete V5/V6 rows.
- If the application starts after repair but Hibernate reports a missing/incorrect column, fix that schema difference with a new migration (V7+), not by changing V5/V6 again.
- The Maven Flyway plugin uses the same SQL Server connection already used by the application in this project.
