-- ============================================================
-- V11 - SUBSCRIPTION AND LICENSE MANAGEMENT SYSTEM
-- Ajalkar POS Billing / Hotel Management System
-- 28-Day Free Trial, Plan Subscriptions & Payment Transactions
-- ============================================================

-- 1. SUBSCRIPTION PLANS TABLE
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_NAME = 'subscription_plans'
)
BEGIN
    CREATE TABLE subscription_plans (
        id BIGINT IDENTITY(1,1) NOT NULL,
        plan_code VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        industry_code VARCHAR(30) NOT NULL,
        tier VARCHAR(30) NOT NULL,
        monthly_price DECIMAL(12,2) NOT NULL,
        annual_price_per_month DECIMAL(12,2) NOT NULL,
        trial_duration_days INT NOT NULL CONSTRAINT df_plans_trial_days DEFAULT 28,
        features_json NVARCHAR(MAX) NOT NULL,
        description NVARCHAR(500) NULL,
        is_popular BIT NOT NULL CONSTRAINT df_plans_is_popular DEFAULT 0,
        is_active BIT NOT NULL CONSTRAINT df_plans_is_active DEFAULT 1,
        created_at DATETIME2(6) NOT NULL CONSTRAINT df_plans_created DEFAULT GETDATE(),
        updated_at DATETIME2(6) NOT NULL CONSTRAINT df_plans_updated DEFAULT GETDATE(),

        CONSTRAINT pk_subscription_plans PRIMARY KEY (id),
        CONSTRAINT uk_subscription_plans_code UNIQUE (plan_code)
    );
END;

-- 2. BUSINESS SUBSCRIPTIONS TABLE
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_NAME = 'business_subscriptions'
)
BEGIN
    CREATE TABLE business_subscriptions (
        id BIGINT IDENTITY(1,1) NOT NULL,
        business_id BIGINT NOT NULL,
        plan_id BIGINT NOT NULL,
        billing_cycle VARCHAR(20) NOT NULL CONSTRAINT df_bs_cycle DEFAULT 'MONTHLY',
        status VARCHAR(30) NOT NULL CONSTRAINT df_bs_status DEFAULT 'TRIAL_ACTIVE',
        is_trial BIT NOT NULL CONSTRAINT df_bs_is_trial DEFAULT 1,
        trial_start_date DATETIME2(6) NULL,
        trial_end_date DATETIME2(6) NULL,
        start_date DATETIME2(6) NOT NULL,
        end_date DATETIME2(6) NOT NULL,
        auto_renew BIT NOT NULL CONSTRAINT df_bs_auto_renew DEFAULT 0,
        last_payment_id BIGINT NULL,
        created_at DATETIME2(6) NOT NULL CONSTRAINT df_bs_created DEFAULT GETDATE(),
        updated_at DATETIME2(6) NOT NULL CONSTRAINT df_bs_updated DEFAULT GETDATE(),

        CONSTRAINT pk_business_subscriptions PRIMARY KEY (id),
        CONSTRAINT fk_bs_business FOREIGN KEY (business_id) REFERENCES businesses(id),
        CONSTRAINT fk_bs_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
    );

    CREATE INDEX idx_business_subscriptions_lookup 
        ON business_subscriptions(business_id, status);
END;

-- 3. SUBSCRIPTION PAYMENTS TABLE
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_NAME = 'subscription_payments'
)
BEGIN
    CREATE TABLE subscription_payments (
        id BIGINT IDENTITY(1,1) NOT NULL,
        business_id BIGINT NOT NULL,
        subscription_id BIGINT NULL,
        plan_id BIGINT NOT NULL,
        order_id VARCHAR(100) NOT NULL,
        payment_id VARCHAR(100) NULL,
        signature VARCHAR(255) NULL,
        billing_cycle VARCHAR(20) NOT NULL,
        currency VARCHAR(10) NOT NULL CONSTRAINT df_sp_curr DEFAULT 'INR',
        base_amount DECIMAL(12,2) NOT NULL,
        tax_amount DECIMAL(12,2) NOT NULL,
        total_amount DECIMAL(12,2) NOT NULL,
        status VARCHAR(30) NOT NULL CONSTRAINT df_sp_status DEFAULT 'PENDING',
        payment_method VARCHAR(50) NULL,
        gateway_name VARCHAR(50) NOT NULL CONSTRAINT df_sp_gateway DEFAULT 'RAZORPAY',
        notes NVARCHAR(1000) NULL,
        paid_at DATETIME2(6) NULL,
        created_at DATETIME2(6) NOT NULL CONSTRAINT df_sp_created DEFAULT GETDATE(),
        updated_at DATETIME2(6) NOT NULL CONSTRAINT df_sp_updated DEFAULT GETDATE(),

        CONSTRAINT pk_subscription_payments PRIMARY KEY (id),
        CONSTRAINT uk_subscription_payments_order UNIQUE (order_id),
        CONSTRAINT fk_sp_business FOREIGN KEY (business_id) REFERENCES businesses(id),
        CONSTRAINT fk_sp_subscription FOREIGN KEY (subscription_id) REFERENCES business_subscriptions(id),
        CONSTRAINT fk_sp_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
    );

    CREATE INDEX idx_subscription_payments_biz 
        ON subscription_payments(business_id, status);
END;

-- 4. SEED SUBSCRIPTION PLANS
IF NOT EXISTS (SELECT 1 FROM subscription_plans WHERE plan_code = 'HOTEL_STARTER')
BEGIN
    INSERT INTO subscription_plans (plan_code, name, industry_code, tier, monthly_price, annual_price_per_month, trial_duration_days, features_json, description, is_popular, is_active, created_at, updated_at)
    VALUES 
    ('HOTEL_STARTER', 'Hotel Starter', 'HOTEL', 'STARTER', 1499.00, 1199.00, 28, 
     '["Up to 15 Rooms Management","Front Desk & Guest Directory","Check-in / Check-out Workflow","Universal GST Billing & Invoicing","Daily Occupancy Statistics","Email & Phone Support"]', 
     'Ideal for small lodges, guesthouses, and homestays with up to 15 rooms.', 0, 1, GETDATE(), GETDATE()),

    ('HOTEL_PRO', 'Hotel Professional', 'HOTEL', 'PRO', 2999.00, 2399.00, 28, 
     '["Up to 50 Rooms & Floor Grids","Integrated Room Service Billing","Housekeeping & Maintenance Tracker","Inventory & Linen Stock Deductions","Comprehensive Revenue Reports & KPIs","Multiple Staff User Accounts","Priority 24/7 Support"]', 
     'Best for standard hotels & multi-floor dining restaurants.', 1, 1, GETDATE(), GETDATE()),

    ('HOTEL_ENTERPRISE', 'Hotel Enterprise', 'HOTEL', 'ENTERPRISE', 5999.00, 4799.00, 28, 
     '["Unlimited Rooms & Banquet Halls","Multi-Building Floor Layouts","Multi-Tender Advanced Invoicing","Supplier Purchase Ledger & Auto-Reorder","Dedicated Account Manager","Custom Integrations & API Access"]', 
     'Full capabilities for luxury resorts, hotel chains, and multi-property groups.', 0, 1, GETDATE(), GETDATE());
END;

-- 5. DATA CLEANUP: FIX 360-DAY VALUES IN LEGACY HOTEL_SETTINGS
UPDATE hotel_settings
SET setting_value = '28', updated_at = GETDATE()
WHERE category = 'licence' AND setting_key = 'trial_duration_days' AND setting_value = '360';

-- For any trial_end_date that was erroneously set to 360 days in the future, recalculate as start_date + 28 days
UPDATE hs_end
SET setting_value = CONVERT(VARCHAR(33), DATEADD(day, 28, CAST(hs_start.setting_value AS DATETIME2)), 126) + 'Z',
    updated_at = GETDATE()
FROM hotel_settings hs_end
JOIN hotel_settings hs_start 
    ON hs_end.business_id = hs_start.business_id 
    AND hs_start.category = 'licence' 
    AND hs_start.setting_key = 'trial_start_date'
WHERE hs_end.category = 'licence' 
  AND hs_end.setting_key = 'trial_end_date'
  AND DATEDIFF(day, CAST(hs_start.setting_value AS DATETIME2), CAST(hs_end.setting_value AS DATETIME2)) > 30;

-- 6. POPULATE INITIAL BUSINESS_SUBSCRIPTIONS FOR EXISTING BUSINESSES
DECLARE @DefaultPlanId BIGINT;
SELECT TOP 1 @DefaultPlanId = id FROM subscription_plans WHERE plan_code = 'HOTEL_ENTERPRISE';

IF @DefaultPlanId IS NOT NULL
BEGIN
    INSERT INTO business_subscriptions (business_id, plan_id, billing_cycle, status, is_trial, trial_start_date, trial_end_date, start_date, end_date, auto_renew, created_at, updated_at)
    SELECT 
        b.id,
        @DefaultPlanId,
        'TRIAL',
        CASE 
            WHEN DATEDIFF(day, GETDATE(), DATEADD(day, 28, ISNULL(TRY_CAST(hs_start.setting_value AS DATETIME2), b.created_at))) <= 0 
            THEN 'TRIAL_EXPIRED'
            ELSE 'TRIAL_ACTIVE'
        END,
        1,
        ISNULL(TRY_CAST(hs_start.setting_value AS DATETIME2), b.created_at),
        DATEADD(day, 28, ISNULL(TRY_CAST(hs_start.setting_value AS DATETIME2), b.created_at)),
        ISNULL(TRY_CAST(hs_start.setting_value AS DATETIME2), b.created_at),
        DATEADD(day, 28, ISNULL(TRY_CAST(hs_start.setting_value AS DATETIME2), b.created_at)),
        0,
        GETDATE(),
        GETDATE()
    FROM businesses b
    LEFT JOIN hotel_settings hs_start 
        ON b.id = hs_start.business_id 
        AND hs_start.category = 'licence' 
        AND hs_start.setting_key = 'trial_start_date'
    WHERE NOT EXISTS (
        SELECT 1 FROM business_subscriptions bs WHERE bs.business_id = b.id
    );
END;
