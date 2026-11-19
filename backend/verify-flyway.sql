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

SELECT TABLE_SCHEMA, TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME IN
(
    'integration_connections',
    'integration_webhook_events',
    'integration_menu_mappings'
)
ORDER BY TABLE_NAME;
GO
