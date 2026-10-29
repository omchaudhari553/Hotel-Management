-- ============================================================
-- V6 - Multi-platform Delivery Integration Support
--
-- Supports:
--   ZOMATO
--   SWIGGY
--   ONDC
--   MAGICPIN
--
-- Additive only.
-- V5 creates the required integration tables.
-- V6 adds supporting indexes for multi-platform operation.
--
-- Exact external API payloads/endpoints must come from the
-- approved/current partner integration contracts.
-- ============================================================

IF OBJECT_ID('dbo.integration_connections', 'U') IS NOT NULL
   AND NOT EXISTS
   (
       SELECT 1 FROM sys.indexes
       WHERE name = 'ix_integration_connections_platform_outlet'
         AND object_id = OBJECT_ID('dbo.integration_connections')
   )
BEGIN
    CREATE INDEX ix_integration_connections_platform_outlet
        ON dbo.integration_connections (platform, external_outlet_id);
END;

IF OBJECT_ID('dbo.integration_webhook_events', 'U') IS NOT NULL
   AND NOT EXISTS
   (
       SELECT 1 FROM sys.indexes
       WHERE name = 'ix_integration_webhook_platform_received'
         AND object_id = OBJECT_ID('dbo.integration_webhook_events')
   )
BEGIN
    CREATE INDEX ix_integration_webhook_platform_received
        ON dbo.integration_webhook_events (platform, received_at);
END;

IF OBJECT_ID('dbo.integration_webhook_events', 'U') IS NOT NULL
   AND COL_LENGTH('dbo.integration_webhook_events', 'external_order_id') IS NOT NULL
   AND NOT EXISTS
   (
       SELECT 1 FROM sys.indexes
       WHERE name = 'ix_integration_webhook_external_order'
         AND object_id = OBJECT_ID('dbo.integration_webhook_events')
   )
BEGIN
    CREATE INDEX ix_integration_webhook_external_order
        ON dbo.integration_webhook_events (platform, external_order_id);
END;

IF OBJECT_ID('dbo.integration_menu_mappings', 'U') IS NOT NULL
   AND NOT EXISTS
   (
       SELECT 1 FROM sys.indexes
       WHERE name = 'ix_integration_menu_mappings_integration'
         AND object_id = OBJECT_ID('dbo.integration_menu_mappings')
   )
BEGIN
    CREATE INDEX ix_integration_menu_mappings_integration
        ON dbo.integration_menu_mappings (integration_id);
END;
