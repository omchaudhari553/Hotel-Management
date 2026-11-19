-- ============================================================
-- V15 - SUBSCRIPTION SUPER ADMIN & ENTERPRISE PLAN MANAGEMENT
-- Microsoft SQL Server 2016+ / 2022 Compatible
-- Ajalkar POS / Hotel Management Complete Subscription System
-- ============================================================

-- 1. ADD EXTENDED LIMITS & BILLING ATTRIBUTES TO subscription_plans
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'subscription_plans' AND COLUMN_NAME = 'currency'
)
BEGIN
    EXEC('ALTER TABLE subscription_plans ADD currency VARCHAR(10) NOT NULL CONSTRAINT df_plans_curr DEFAULT ''INR'';');
END;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'subscription_plans' AND COLUMN_NAME = 'billing_interval'
)
BEGIN
    EXEC('ALTER TABLE subscription_plans ADD billing_interval VARCHAR(20) NOT NULL CONSTRAINT df_plans_interval DEFAULT ''MONTH'';');
END;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'subscription_plans' AND COLUMN_NAME = 'billing_duration'
)
BEGIN
    EXEC('ALTER TABLE subscription_plans ADD billing_duration INT NOT NULL CONSTRAINT df_plans_duration DEFAULT 1;');
END;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'subscription_plans' AND COLUMN_NAME = 'tax_configuration'
)
BEGIN
    EXEC('ALTER TABLE subscription_plans ADD tax_configuration VARCHAR(50) NOT NULL CONSTRAINT df_plans_tax DEFAULT ''GST 18%'';');
END;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'subscription_plans' AND COLUMN_NAME = 'max_rooms'
)
BEGIN
    EXEC('ALTER TABLE subscription_plans ADD max_rooms INT NULL;');
END;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'subscription_plans' AND COLUMN_NAME = 'max_staff'
)
BEGIN
    EXEC('ALTER TABLE subscription_plans ADD max_staff INT NULL;');
END;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'subscription_plans' AND COLUMN_NAME = 'max_branches'
)
BEGIN
    EXEC('ALTER TABLE subscription_plans ADD max_branches INT NULL;');
END;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'subscription_plans' AND COLUMN_NAME = 'max_users'
)
BEGIN
    EXEC('ALTER TABLE subscription_plans ADD max_users INT NULL;');
END;

-- 2. CREATE subscription_history TABLE
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_NAME = 'subscription_history'
)
BEGIN
    CREATE TABLE subscription_history (
        id BIGINT IDENTITY(1,1) NOT NULL,
        business_id BIGINT NOT NULL,
        subscription_id BIGINT NULL,
        previous_status VARCHAR(50) NULL,
        new_status VARCHAR(50) NOT NULL,
        action VARCHAR(100) NOT NULL,
        description NVARCHAR(500) NULL,
        performed_by VARCHAR(100) NOT NULL,
        created_at DATETIME2(6) NOT NULL CONSTRAINT df_sub_hist_created DEFAULT GETDATE(),

        CONSTRAINT pk_subscription_history PRIMARY KEY (id),
        CONSTRAINT fk_sub_hist_business FOREIGN KEY (business_id) REFERENCES businesses(id),
        CONSTRAINT fk_sub_hist_sub FOREIGN KEY (subscription_id) REFERENCES business_subscriptions(id)
    );

    CREATE INDEX idx_sub_history_biz ON subscription_history(business_id, created_at);
END;

-- 3. CREATE subscription_notifications TABLE
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_NAME = 'subscription_notifications'
)
BEGIN
    CREATE TABLE subscription_notifications (
        id BIGINT IDENTITY(1,1) NOT NULL,
        business_id BIGINT NOT NULL,
        subscription_id BIGINT NULL,
        notification_type VARCHAR(50) NOT NULL,
        message NVARCHAR(1000) NOT NULL,
        scheduled_at DATETIME2(6) NULL,
        sent_at DATETIME2(6) NULL,
        delivery_status VARCHAR(30) NOT NULL CONSTRAINT df_sub_notif_status DEFAULT 'SENT',
        created_at DATETIME2(6) NOT NULL CONSTRAINT df_sub_notif_created DEFAULT GETDATE(),

        CONSTRAINT pk_subscription_notifications PRIMARY KEY (id),
        CONSTRAINT fk_sub_notif_biz FOREIGN KEY (business_id) REFERENCES businesses(id)
    );

    CREATE INDEX idx_sub_notif_lookup ON subscription_notifications(business_id, notification_type);
END;

-- 4. UPDATE EXISTING DEFAULT PLANS WITH FEATURE LIMITS (USING DYNAMIC EXEC TO PREVENT PARSE-TIME BATCH VALIDATION ISSUES)
EXEC('UPDATE subscription_plans
SET max_rooms = 15, max_staff = 5, max_branches = 1, max_users = 3,
    currency = ''INR'', billing_interval = ''MONTH'', billing_duration = 1, tax_configuration = ''GST 18%''
WHERE plan_code = ''HOTEL_STARTER'';');

EXEC('UPDATE subscription_plans
SET max_rooms = 50, max_staff = 20, max_branches = 3, max_users = 10,
    currency = ''INR'', billing_interval = ''MONTH'', billing_duration = 1, tax_configuration = ''GST 18%''
WHERE plan_code = ''HOTEL_PRO'';');

EXEC('UPDATE subscription_plans
SET max_rooms = 500, max_staff = 100, max_branches = 20, max_users = 50,
    currency = ''INR'', billing_interval = ''MONTH'', billing_duration = 1, tax_configuration = ''GST 18%''
WHERE plan_code = ''HOTEL_ENTERPRISE'';');
