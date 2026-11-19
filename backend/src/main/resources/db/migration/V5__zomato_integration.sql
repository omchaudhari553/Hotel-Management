-- ============================================================
-- V5 - Zomato / External Delivery Integration Support
-- Microsoft SQL Server
--
-- IMPORTANT:
-- This migration is additive.
-- It creates the integration tables and adds external-order
-- fields to the existing hotel order/delivery tables.
--
-- V5 has not been successfully applied in the current database,
-- so this file can be corrected before the first successful run.
-- ============================================================

IF OBJECT_ID('dbo.integration_connections', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.integration_connections
    (
        id BIGINT IDENTITY(1,1) NOT NULL,
        business_id BIGINT NOT NULL,
        branch_id BIGINT NOT NULL,
        platform VARCHAR(40) NOT NULL,
        status VARCHAR(40) NOT NULL,
        external_account_id VARCHAR(200) NULL,
        external_outlet_id VARCHAR(200) NULL,
        external_outlet_name VARCHAR(300) NULL,
        api_base_url VARCHAR(1000) NULL,
        test_endpoint VARCHAR(300) NULL,
        confirm_endpoint VARCHAR(300) NULL,
        ready_endpoint VARCHAR(300) NULL,
        status_endpoint VARCHAR(300) NULL,
        auth_type VARCHAR(40) NULL,
        encrypted_api_key VARCHAR(2000) NULL,
        encrypted_api_secret VARCHAR(4000) NULL,
        scopes VARCHAR(1000) NULL,
        last_sync_at DATETIME2(6) NULL,
        last_error VARCHAR(2000) NULL,
        last_tested_at DATETIME2(6) NULL,
        created_at DATETIME2(6) NOT NULL,
        updated_at DATETIME2(6) NOT NULL,
        CONSTRAINT pk_integration_connections PRIMARY KEY (id),
        CONSTRAINT fk_integration_business FOREIGN KEY (business_id) REFERENCES dbo.businesses(id),
        CONSTRAINT fk_integration_branch FOREIGN KEY (branch_id) REFERENCES dbo.branches(id),
        CONSTRAINT uk_integration_business_branch_platform UNIQUE (business_id, branch_id, platform)
    );
END;

IF OBJECT_ID('dbo.integration_webhook_events', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.integration_webhook_events
    (
        id BIGINT IDENTITY(1,1) NOT NULL,
        platform VARCHAR(40) NOT NULL,
        event_key VARCHAR(200) NOT NULL,
        external_order_id VARCHAR(200) NULL,
        external_outlet_id VARCHAR(200) NULL,
        event_type VARCHAR(100) NULL,
        status VARCHAR(30) NOT NULL,
        error_message VARCHAR(4000) NULL,
        payload VARCHAR(MAX) NOT NULL,
        received_at DATETIME2(6) NULL,
        processed_at DATETIME2(6) NULL,
        created_at DATETIME2(6) NOT NULL,
        updated_at DATETIME2(6) NOT NULL,
        CONSTRAINT pk_integration_webhook_events PRIMARY KEY (id),
        CONSTRAINT uk_webhook_platform_event UNIQUE (platform, event_key)
    );
END;

IF OBJECT_ID('dbo.integration_menu_mappings', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.integration_menu_mappings
    (
        id BIGINT IDENTITY(1,1) NOT NULL,
        integration_id BIGINT NOT NULL,
        menu_item_id BIGINT NOT NULL,
        external_item_id VARCHAR(200) NOT NULL,
        external_item_name VARCHAR(300) NULL,
        status VARCHAR(30) NOT NULL,
        created_at DATETIME2(6) NOT NULL,
        updated_at DATETIME2(6) NOT NULL,
        CONSTRAINT pk_integration_menu_mappings PRIMARY KEY (id),
        CONSTRAINT fk_integration_menu_integration FOREIGN KEY (integration_id) REFERENCES dbo.integration_connections(id),
        CONSTRAINT fk_integration_menu_item FOREIGN KEY (menu_item_id) REFERENCES dbo.hotel_menu_items(id),
        CONSTRAINT uk_menu_mapping_internal UNIQUE (integration_id, menu_item_id),
        CONSTRAINT uk_menu_mapping_external UNIQUE (integration_id, external_item_id)
    );
END;

IF COL_LENGTH('dbo.hotel_orders', 'order_source') IS NULL
BEGIN
    ALTER TABLE dbo.hotel_orders ADD order_source VARCHAR(40) NULL;
END;
IF COL_LENGTH('dbo.hotel_orders', 'external_platform') IS NULL
BEGIN
    ALTER TABLE dbo.hotel_orders ADD external_platform VARCHAR(40) NULL;
END;
IF COL_LENGTH('dbo.hotel_orders', 'external_order_id') IS NULL
BEGIN
    ALTER TABLE dbo.hotel_orders ADD external_order_id VARCHAR(200) NULL;
END;
IF COL_LENGTH('dbo.hotel_orders', 'external_order_number') IS NULL
BEGIN
    ALTER TABLE dbo.hotel_orders ADD external_order_number VARCHAR(200) NULL;
END;
IF COL_LENGTH('dbo.hotel_orders', 'external_outlet_id') IS NULL
BEGIN
    ALTER TABLE dbo.hotel_orders ADD external_outlet_id VARCHAR(200) NULL;
END;
IF COL_LENGTH('dbo.hotel_orders', 'external_payment_status') IS NULL
BEGIN
    ALTER TABLE dbo.hotel_orders ADD external_payment_status VARCHAR(40) NULL;
END;
IF COL_LENGTH('dbo.hotel_orders', 'external_status') IS NULL
BEGIN
    ALTER TABLE dbo.hotel_orders ADD external_status VARCHAR(100) NULL;
END;

IF COL_LENGTH('dbo.hotel_orders', 'business_id') IS NOT NULL
   AND COL_LENGTH('dbo.hotel_orders', 'external_platform') IS NOT NULL
   AND COL_LENGTH('dbo.hotel_orders', 'external_order_id') IS NOT NULL
   AND NOT EXISTS
   (
       SELECT 1 FROM sys.indexes
       WHERE name = 'uk_hotel_orders_external'
         AND object_id = OBJECT_ID('dbo.hotel_orders')
   )
BEGIN
    EXEC
    (
        'CREATE UNIQUE INDEX uk_hotel_orders_external
         ON dbo.hotel_orders
         (business_id, external_platform, external_order_id)
         WHERE external_order_id IS NOT NULL;'
    );
END;

IF COL_LENGTH('dbo.delivery_orders', 'delivery_mode') IS NULL
BEGIN
    ALTER TABLE dbo.delivery_orders ADD delivery_mode VARCHAR(40) NULL;
END;
IF COL_LENGTH('dbo.delivery_orders', 'external_platform') IS NULL
BEGIN
    ALTER TABLE dbo.delivery_orders ADD external_platform VARCHAR(40) NULL;
END;
IF COL_LENGTH('dbo.delivery_orders', 'external_order_id') IS NULL
BEGIN
    ALTER TABLE dbo.delivery_orders ADD external_order_id VARCHAR(200) NULL;
END;
IF COL_LENGTH('dbo.delivery_orders', 'external_delivery_partner_id') IS NULL
BEGIN
    ALTER TABLE dbo.delivery_orders ADD external_delivery_partner_id VARCHAR(200) NULL;
END;

IF COL_LENGTH('dbo.delivery_orders', 'external_order_id') IS NOT NULL
   AND NOT EXISTS
   (
       SELECT 1 FROM sys.indexes
       WHERE name = 'ix_delivery_orders_external_order'
         AND object_id = OBJECT_ID('dbo.delivery_orders')
   )
BEGIN
    EXEC
    (
        'CREATE INDEX ix_delivery_orders_external_order
         ON dbo.delivery_orders (external_order_id);'
    );
END;
