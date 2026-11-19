-- ============================================================
-- V7 - Delivery payment, settlement and reconciliation
-- Microsoft SQL Server
--
-- Additive only. This supports the Delivery module financial flow:
-- DELIVERED/NOT DELIVERED is independent from PENDING/PAID payment.
-- Paid delivery orders become settlement-eligible.
-- Reconciliation compares platform/system/bank amounts.
-- ============================================================

IF OBJECT_ID('dbo.delivery_settlements', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.delivery_settlements
    (
        id BIGINT IDENTITY(1,1) NOT NULL,
        business_id BIGINT NOT NULL,
        branch_id BIGINT NULL,
        delivery_order_id BIGINT NOT NULL,
        platform VARCHAR(40) NOT NULL,
        external_order_id VARCHAR(200) NULL,
        gross_amount DECIMAL(14,2) NOT NULL,
        commission_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        fee_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        refund_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        net_amount DECIMAL(14,2) NOT NULL,
        settlement_status VARCHAR(40) NOT NULL,
        settlement_reference VARCHAR(200) NULL,
        settlement_date DATE NULL,
        created_at DATETIME2(6) NOT NULL,
        updated_at DATETIME2(6) NOT NULL,
        CONSTRAINT pk_delivery_settlements PRIMARY KEY (id),
        CONSTRAINT fk_delivery_settlement_business FOREIGN KEY (business_id) REFERENCES dbo.businesses(id),
        CONSTRAINT fk_delivery_settlement_branch FOREIGN KEY (branch_id) REFERENCES dbo.branches(id),
        CONSTRAINT fk_delivery_settlement_delivery FOREIGN KEY (delivery_order_id) REFERENCES dbo.delivery_orders(id)
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='uk_delivery_settlement_delivery' AND object_id=OBJECT_ID('dbo.delivery_settlements'))
BEGIN
    CREATE UNIQUE INDEX uk_delivery_settlement_delivery ON dbo.delivery_settlements(delivery_order_id);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='ix_delivery_settlement_business_platform' AND object_id=OBJECT_ID('dbo.delivery_settlements'))
BEGIN
    CREATE INDEX ix_delivery_settlement_business_platform ON dbo.delivery_settlements(business_id, platform, settlement_date);
END;

IF OBJECT_ID('dbo.delivery_reconciliations', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.delivery_reconciliations
    (
        id BIGINT IDENTITY(1,1) NOT NULL,
        business_id BIGINT NOT NULL,
        branch_id BIGINT NULL,
        settlement_id BIGINT NOT NULL,
        delivery_order_id BIGINT NOT NULL,
        platform VARCHAR(40) NOT NULL,
        external_order_id VARCHAR(200) NULL,
        platform_amount DECIMAL(14,2) NOT NULL,
        system_amount DECIMAL(14,2) NOT NULL,
        bank_amount DECIMAL(14,2) NULL,
        difference_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        status VARCHAR(40) NOT NULL,
        remark VARCHAR(2000) NULL,
        reconciled_at DATETIME2(6) NULL,
        created_at DATETIME2(6) NOT NULL,
        updated_at DATETIME2(6) NOT NULL,
        CONSTRAINT pk_delivery_reconciliations PRIMARY KEY (id),
        CONSTRAINT fk_delivery_recon_business FOREIGN KEY (business_id) REFERENCES dbo.businesses(id),
        CONSTRAINT fk_delivery_recon_branch FOREIGN KEY (branch_id) REFERENCES dbo.branches(id),
        CONSTRAINT fk_delivery_recon_settlement FOREIGN KEY (settlement_id) REFERENCES dbo.delivery_settlements(id),
        CONSTRAINT fk_delivery_recon_delivery FOREIGN KEY (delivery_order_id) REFERENCES dbo.delivery_orders(id)
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='uk_delivery_reconciliation_settlement' AND object_id=OBJECT_ID('dbo.delivery_reconciliations'))
BEGIN
    CREATE UNIQUE INDEX uk_delivery_reconciliation_settlement ON dbo.delivery_reconciliations(settlement_id);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='ix_delivery_reconciliation_business_status' AND object_id=OBJECT_ID('dbo.delivery_reconciliations'))
BEGIN
    CREATE INDEX ix_delivery_reconciliation_business_status ON dbo.delivery_reconciliations(business_id, status, platform);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='uk_delivery_reconciliation_delivery' AND object_id=OBJECT_ID('dbo.delivery_reconciliations'))
BEGIN
    CREATE UNIQUE INDEX uk_delivery_reconciliation_delivery ON dbo.delivery_reconciliations(delivery_order_id);
END;
