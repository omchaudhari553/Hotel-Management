# Flyway Final Fix

The SQL Server database already has Flyway migration version 2 recorded as:
- version: 2
- description: create frontend compatibility schema
- checksum: 1834827180

Therefore the local migration must keep the exact V2 migration name/content that produced that history entry.

Do NOT rename V2 to another description and do NOT run `flyway repair` just to hide a mismatch.

Expected migration files:
- V1__create_hotel_schema.sql
- V2__create_frontend_compatibility_schema.sql
- V3__purchase_operations.sql
- V4__align_purchase_entities.sql

Run from backend:

$env:SPRING_PROFILES_ACTIVE="dev"
mvn clean spring-boot:run
