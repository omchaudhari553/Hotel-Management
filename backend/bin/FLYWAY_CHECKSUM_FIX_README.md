# Flyway V5/V6 checksum mismatch - final fix

## What was wrong

The database already contains V5 and V6, but the local SQL files were changed after those migrations were applied. Flyway therefore reports checksum mismatches.

The `jpaSharedEM_entityManagerFactory` / `UserRepository` error is a downstream error. JPA cannot finish initialization because Flyway validation fails first.

## Important

Do **not** delete the database.

Do **not** delete `flyway_schema_history`.

Do **not** edit V5/V6 again after repair.

The current V5 and V6 files in this project are treated as the authoritative versions for the existing development database. `repair` updates only the checksum metadata in `flyway_schema_history`; it does not rerun V5/V6 and does not delete application data.

## One-time fix on Windows PowerShell

From the `backend` directory:

```powershell
mvn flyway:info
mvn flyway:repair
mvn clean
mvn spring-boot:run
```

Or simply:

```powershell
.\\repair-flyway.ps1
mvn spring-boot:run
```

The Maven Flyway plugin is now configured with the same SQL Server URL, username and password used by `application.yml`, so `mvn flyway:repair` no longer fails with:

```text
Unable to connect to the database. Configure the url, user and password!
```

## Verify after repair

Run in SQL Server:

```sql
USE hotel_management;
GO

SELECT
    installed_rank,
    version,
    description,
    script,
    checksum,
    success
FROM dbo.flyway_schema_history
WHERE version IN ('5', '6')
ORDER BY installed_rank;
GO
```

Then start:

```powershell
mvn spring-boot:run
```

Expected result is that Flyway validation succeeds and Spring can create `entityManagerFactory`, repositories, security filters and Tomcat.

## Future migration rule

After V5/V6 are repaired, never modify those files again. Any future database change must be a new migration, for example:

```text
V7__additional_integration_fix.sql
V8__delivery_changes.sql
```

## Data safety

The repair operation updates Flyway's migration metadata. It does not remove hotel orders, delivery orders, branches, staff, menu items, or other application records.
