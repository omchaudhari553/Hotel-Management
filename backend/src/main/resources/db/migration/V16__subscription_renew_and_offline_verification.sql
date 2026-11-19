-- ============================================================
-- V16 - SUBSCRIPTION RENEW AND OFFLINE UPI VERIFICATION
-- Microsoft SQL Server 2016+ / 2022 Compatible
-- Ajalkar POS / Hotel Management Subscription Renewal System
-- ============================================================

-- 1. ADD EXTENDED COLUMNS TO subscription_payments FOR RENEWAL & OFFLINE VERIFICATION
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'subscription_payments' AND COLUMN_NAME = 'order_ref'
)
BEGIN
    EXEC('ALTER TABLE subscription_payments ADD order_ref VARCHAR(50) NULL;');
END;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'subscription_payments' AND COLUMN_NAME = 'utr_number'
)
BEGIN
    EXEC('ALTER TABLE subscription_payments ADD utr_number VARCHAR(100) NULL;');
END;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'subscription_payments' AND COLUMN_NAME = 'screenshot_url'
)
BEGIN
    EXEC('ALTER TABLE subscription_payments ADD screenshot_url NVARCHAR(MAX) NULL;');
END;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'subscription_payments' AND COLUMN_NAME = 'platform'
)
BEGIN
    EXEC('ALTER TABLE subscription_payments ADD platform VARCHAR(50) NULL;');
END;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'subscription_payments' AND COLUMN_NAME = 'plan_type'
)
BEGIN
    EXEC('ALTER TABLE subscription_payments ADD plan_type VARCHAR(50) NULL;');
END;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'subscription_payments' AND COLUMN_NAME = 'duration_type'
)
BEGIN
    EXEC('ALTER TABLE subscription_payments ADD duration_type VARCHAR(50) NULL;');
END;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'subscription_payments' AND COLUMN_NAME = 'hardware_included'
)
BEGIN
    EXEC('ALTER TABLE subscription_payments ADD hardware_included VARCHAR(100) NULL;');
END;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'subscription_payments' AND COLUMN_NAME = 'verification_status'
)
BEGIN
    EXEC('ALTER TABLE subscription_payments ADD verification_status VARCHAR(50) NULL CONSTRAINT df_sp_verif DEFAULT ''PENDING_VERIFICATION'';');
END;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'subscription_payments' AND COLUMN_NAME = 'admin_notes'
)
BEGIN
    EXEC('ALTER TABLE subscription_payments ADD admin_notes NVARCHAR(500) NULL;');
END;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'subscription_payments' AND COLUMN_NAME = 'verified_at'
)
BEGIN
    EXEC('ALTER TABLE subscription_payments ADD verified_at DATETIME2(6) NULL;');
END;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'subscription_payments' AND COLUMN_NAME = 'verified_by'
)
BEGIN
    EXEC('ALTER TABLE subscription_payments ADD verified_by VARCHAR(100) NULL;');
END;

-- 2. ADD PLATFORM & PLAN TYPE ATTRIBUTES TO business_subscriptions
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'business_subscriptions' AND COLUMN_NAME = 'platform'
)
BEGIN
    EXEC('ALTER TABLE business_subscriptions ADD platform VARCHAR(50) NULL;');
END;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'business_subscriptions' AND COLUMN_NAME = 'plan_type'
)
BEGIN
    EXEC('ALTER TABLE business_subscriptions ADD plan_type VARCHAR(50) NULL;');
END;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'business_subscriptions' AND COLUMN_NAME = 'duration_type'
)
BEGIN
    EXEC('ALTER TABLE business_subscriptions ADD duration_type VARCHAR(50) NULL;');
END;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'business_subscriptions' AND COLUMN_NAME = 'hardware_included'
)
BEGIN
    EXEC('ALTER TABLE business_subscriptions ADD hardware_included VARCHAR(100) NULL;');
END;

-- 3. CREATE INDEX FOR FASTER LOOKUP OF ORDER REFERENCE AND UTR
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'idx_sp_order_ref' AND object_id = OBJECT_ID('subscription_payments')
)
BEGIN
    EXEC('CREATE INDEX idx_sp_order_ref ON subscription_payments(order_ref);');
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'idx_sp_utr' AND object_id = OBJECT_ID('subscription_payments')
)
BEGIN
    EXEC('CREATE INDEX idx_sp_utr ON subscription_payments(utr_number);');
END;
