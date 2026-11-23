-- ============================================================
-- Migration V18: Centralized Super Admin Platform System
-- Multi-Product (Hotel, Mess, Cafe) & Multi-Branch Architecture
-- Microsoft SQL Server 2016+ / 2022 Compatible
-- ============================================================

-- 1. SAAS PRODUCTS CATALOG (HOTEL, MESS, CAFE)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'saas_products')
BEGIN
    CREATE TABLE dbo.saas_products (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        code VARCHAR(50) NOT NULL CONSTRAINT uk_saas_products_code UNIQUE,
        name NVARCHAR(150) NOT NULL,
        description NVARCHAR(500) NULL,
        icon VARCHAR(50) NULL,
        active BIT NOT NULL CONSTRAINT df_saas_prod_active DEFAULT 1,
        created_at DATETIME2(6) NOT NULL CONSTRAINT df_saas_prod_created DEFAULT GETDATE(),
        updated_at DATETIME2(6) NULL
    );
END;

-- 2. SAAS PRODUCT MODULES CATALOG
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'saas_product_modules')
BEGIN
    CREATE TABLE dbo.saas_product_modules (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        product_id BIGINT NOT NULL CONSTRAINT fk_saas_mod_product FOREIGN KEY REFERENCES dbo.saas_products(id),
        code VARCHAR(80) NOT NULL,
        name NVARCHAR(150) NOT NULL,
        description NVARCHAR(500) NULL,
        is_core BIT NOT NULL CONSTRAINT df_saas_mod_core DEFAULT 0,
        active BIT NOT NULL CONSTRAINT df_saas_mod_active DEFAULT 1,
        created_at DATETIME2(6) NOT NULL CONSTRAINT df_saas_mod_created DEFAULT GETDATE(),
        CONSTRAINT uk_saas_module_prod_code UNIQUE (product_id, code)
    );
END;

-- 3. SAAS SUBSCRIPTION PLANS (TRIAL, YEARLY, 3-YEAR, LIFETIME)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'saas_subscription_plans')
BEGIN
    CREATE TABLE dbo.saas_subscription_plans (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        product_id BIGINT NOT NULL CONSTRAINT fk_saas_plan_prod FOREIGN KEY REFERENCES dbo.saas_products(id),
        code VARCHAR(80) NOT NULL CONSTRAINT uk_saas_plan_code UNIQUE,
        name NVARCHAR(150) NOT NULL,
        plan_type VARCHAR(50) NOT NULL, -- 'TRIAL', 'YEARLY', 'THREE_YEAR', 'LIFETIME'
        billing_interval_months INT NOT NULL CONSTRAINT df_saas_plan_interval DEFAULT 12,
        base_price DECIMAL(14,2) NOT NULL CONSTRAINT df_saas_plan_base DEFAULT 0.00,
        gst_rate DECIMAL(5,2) NOT NULL CONSTRAINT df_saas_plan_gst DEFAULT 18.00,
        discount_amount DECIMAL(14,2) NOT NULL CONSTRAINT df_saas_plan_disc DEFAULT 0.00,
        final_price DECIMAL(14,2) NOT NULL CONSTRAINT df_saas_plan_final DEFAULT 0.00,
        max_branches INT NOT NULL CONSTRAINT df_saas_plan_branches DEFAULT 1,
        max_users INT NOT NULL CONSTRAINT df_saas_plan_users DEFAULT 10,
        description NVARCHAR(1000) NULL,
        active BIT NOT NULL CONSTRAINT df_saas_plan_active DEFAULT 1,
        created_at DATETIME2(6) NOT NULL CONSTRAINT df_saas_plan_created DEFAULT GETDATE(),
        updated_at DATETIME2(6) NULL
    );
END;

-- 4. SAAS SUBSCRIPTIONS (BRANCH & PRODUCT ISOLATED)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'saas_subscriptions')
BEGIN
    CREATE TABLE dbo.saas_subscriptions (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        business_id BIGINT NOT NULL CONSTRAINT fk_saas_sub_biz FOREIGN KEY REFERENCES dbo.businesses(id),
        branch_id BIGINT NULL CONSTRAINT fk_saas_sub_branch FOREIGN KEY REFERENCES dbo.branches(id),
        product_id BIGINT NOT NULL CONSTRAINT fk_saas_sub_prod FOREIGN KEY REFERENCES dbo.saas_products(id),
        plan_id BIGINT NOT NULL CONSTRAINT fk_saas_sub_plan FOREIGN KEY REFERENCES dbo.saas_subscription_plans(id),
        status VARCHAR(50) NOT NULL CONSTRAINT df_saas_sub_status DEFAULT 'ACTIVE', -- 'TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED'
        start_date DATETIME2(6) NOT NULL CONSTRAINT df_saas_sub_start DEFAULT GETDATE(),
        end_date DATETIME2(6) NULL,
        trial_start_at DATETIME2(6) NULL,
        trial_end_at DATETIME2(6) NULL,
        is_lifetime BIT NOT NULL CONSTRAINT df_saas_sub_life DEFAULT 0,
        auto_renew BIT NOT NULL CONSTRAINT df_saas_sub_renew DEFAULT 0,
        notes NVARCHAR(500) NULL,
        created_at DATETIME2(6) NOT NULL CONSTRAINT df_saas_sub_created DEFAULT GETDATE(),
        updated_at DATETIME2(6) NULL
    );

    CREATE INDEX idx_saas_sub_biz_prod ON dbo.saas_subscriptions(business_id, product_id, status);
    CREATE INDEX idx_saas_sub_branch ON dbo.saas_subscriptions(branch_id);
END;

-- 5. SAAS PAYMENTS & TRANSACTIONS
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'saas_payments')
BEGIN
    CREATE TABLE dbo.saas_payments (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        subscription_id BIGINT NULL CONSTRAINT fk_saas_pay_sub FOREIGN KEY REFERENCES dbo.saas_subscriptions(id),
        business_id BIGINT NOT NULL CONSTRAINT fk_saas_pay_biz FOREIGN KEY REFERENCES dbo.businesses(id),
        branch_id BIGINT NULL CONSTRAINT fk_saas_pay_branch FOREIGN KEY REFERENCES dbo.branches(id),
        amount DECIMAL(14,2) NOT NULL,
        gst_amount DECIMAL(14,2) NOT NULL CONSTRAINT df_saas_pay_gst DEFAULT 0.00,
        total_amount DECIMAL(14,2) NOT NULL,
        currency VARCHAR(10) NOT NULL CONSTRAINT df_saas_pay_curr DEFAULT 'INR',
        payment_gateway VARCHAR(50) NOT NULL CONSTRAINT df_saas_pay_gw DEFAULT 'MANUAL', -- 'RAZORPAY', 'MANUAL', 'UPI'
        gateway_order_id VARCHAR(150) NULL,
        gateway_payment_id VARCHAR(150) NULL,
        status VARCHAR(50) NOT NULL CONSTRAINT df_saas_pay_status DEFAULT 'SUCCESS', -- 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'
        payment_method VARCHAR(50) NULL,
        notes NVARCHAR(500) NULL,
        created_at DATETIME2(6) NOT NULL CONSTRAINT df_saas_pay_created DEFAULT GETDATE()
    );

    CREATE INDEX idx_saas_pay_biz ON dbo.saas_payments(business_id, created_at);
END;

-- 6. SAAS PAYMENT WEBHOOK EVENTS (IDEMPOTENCY)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'saas_payment_webhook_events')
BEGIN
    CREATE TABLE dbo.saas_payment_webhook_events (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        event_id VARCHAR(150) NOT NULL CONSTRAINT uk_saas_webhook_event_id UNIQUE,
        event_type VARCHAR(100) NOT NULL,
        payload NVARCHAR(MAX) NULL,
        processed BIT NOT NULL CONSTRAINT df_saas_webhook_proc DEFAULT 0,
        received_at DATETIME2(6) NOT NULL CONSTRAINT df_saas_webhook_rec DEFAULT GETDATE()
    );
END;

-- 7. SAAS INVOICES (GST TAX INVOICES)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'saas_invoices')
BEGIN
    CREATE TABLE dbo.saas_invoices (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        invoice_number VARCHAR(100) NOT NULL CONSTRAINT uk_saas_inv_num UNIQUE,
        subscription_id BIGINT NULL CONSTRAINT fk_saas_inv_sub FOREIGN KEY REFERENCES dbo.saas_subscriptions(id),
        business_id BIGINT NOT NULL CONSTRAINT fk_saas_inv_biz FOREIGN KEY REFERENCES dbo.businesses(id),
        branch_id BIGINT NULL CONSTRAINT fk_saas_inv_branch FOREIGN KEY REFERENCES dbo.branches(id),
        payment_id BIGINT NULL CONSTRAINT fk_saas_inv_pay FOREIGN KEY REFERENCES dbo.saas_payments(id),
        base_amount DECIMAL(14,2) NOT NULL,
        cgst_amount DECIMAL(14,2) NOT NULL CONSTRAINT df_saas_inv_cgst DEFAULT 0.00,
        sgst_amount DECIMAL(14,2) NOT NULL CONSTRAINT df_saas_inv_sgst DEFAULT 0.00,
        igst_amount DECIMAL(14,2) NOT NULL CONSTRAINT df_saas_inv_igst DEFAULT 0.00,
        total_amount DECIMAL(14,2) NOT NULL,
        status VARCHAR(50) NOT NULL CONSTRAINT df_saas_inv_status DEFAULT 'PAID',
        invoice_date DATETIME2(6) NOT NULL CONSTRAINT df_saas_inv_date DEFAULT GETDATE()
    );
END;

-- 8. SAAS SUPPORT TICKETS & REPLIES
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'saas_support_tickets')
BEGIN
    CREATE TABLE dbo.saas_support_tickets (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        ticket_number VARCHAR(50) NOT NULL CONSTRAINT uk_saas_ticket_num UNIQUE,
        business_id BIGINT NOT NULL CONSTRAINT fk_saas_ticket_biz FOREIGN KEY REFERENCES dbo.businesses(id),
        subject NVARCHAR(250) NOT NULL,
        description NVARCHAR(MAX) NOT NULL,
        product_code VARCHAR(50) NULL,
        priority VARCHAR(30) NOT NULL CONSTRAINT df_saas_ticket_prio DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
        status VARCHAR(30) NOT NULL CONSTRAINT df_saas_ticket_stat DEFAULT 'OPEN', -- 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'
        assigned_to VARCHAR(100) NULL,
        created_at DATETIME2(6) NOT NULL CONSTRAINT df_saas_ticket_created DEFAULT GETDATE(),
        updated_at DATETIME2(6) NULL
    );
END;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'saas_support_replies')
BEGIN
    CREATE TABLE dbo.saas_support_replies (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        ticket_id BIGINT NOT NULL CONSTRAINT fk_saas_reply_ticket FOREIGN KEY REFERENCES dbo.saas_support_tickets(id),
        sender_type VARCHAR(30) NOT NULL, -- 'ADMIN', 'CUSTOMER'
        sender_name NVARCHAR(100) NOT NULL,
        message NVARCHAR(MAX) NOT NULL,
        is_internal BIT NOT NULL CONSTRAINT df_saas_reply_int DEFAULT 0,
        created_at DATETIME2(6) NOT NULL CONSTRAINT df_saas_reply_created DEFAULT GETDATE()
    );
END;

-- 9. SAAS PLATFORM SETTINGS
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'saas_platform_settings')
BEGIN
    CREATE TABLE dbo.saas_platform_settings (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        setting_key VARCHAR(100) NOT NULL CONSTRAINT uk_saas_set_key UNIQUE,
        setting_value NVARCHAR(MAX) NULL,
        category VARCHAR(50) NOT NULL CONSTRAINT df_saas_set_cat DEFAULT 'GENERAL',
        description NVARCHAR(250) NULL
    );
END;

-- 10. SAAS AUDIT LOGS
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'saas_audit_logs')
BEGIN
    CREATE TABLE dbo.saas_audit_logs (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        actor_username VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL,
        business_id BIGINT NULL,
        branch_id BIGINT NULL,
        action VARCHAR(100) NOT NULL,
        module VARCHAR(100) NOT NULL,
        description NVARCHAR(500) NULL,
        ip_address VARCHAR(50) NULL,
        created_at DATETIME2(6) NOT NULL CONSTRAINT df_saas_audit_created DEFAULT GETDATE()
    );
END;

-- ============================================================
-- SEED INITIAL CORE METADATA
-- ============================================================

-- A. SEED PRODUCTS: HOTEL, MESS, CAFE
IF NOT EXISTS (SELECT 1 FROM dbo.saas_products WHERE code = 'HOTEL')
    INSERT INTO dbo.saas_products (code, name, description, icon, active)
    VALUES ('HOTEL', 'Hotel Management System', 'Full hotel billing, rooms, bookings, KOT, tables, purchases and GST accounting', 'Hotel', 1);

IF NOT EXISTS (SELECT 1 FROM dbo.saas_products WHERE code = 'MESS')
    INSERT INTO dbo.saas_products (code, name, description, icon, active)
    VALUES ('MESS', 'Mess Management System', 'Complete mess membership, attendance, meal plans, weekly menu, billing and tiffin dispatch', 'UtensilsCrossed', 1);

IF NOT EXISTS (SELECT 1 FROM dbo.saas_products WHERE code = 'CAFE')
    INSERT INTO dbo.saas_products (code, name, description, icon, active)
    VALUES ('CAFE', 'Cafe Management System', 'High-speed touch POS, beverage modifier menus, table layout, kitchen display and orders', 'Coffee', 1);

-- B. SEED PRODUCT MODULES FOR HOTEL
DECLARE @HotelId BIGINT = (SELECT id FROM dbo.saas_products WHERE code = 'HOTEL');
IF @HotelId IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.saas_product_modules WHERE product_id = @HotelId AND code = 'HOTEL_DASHBOARD')
        INSERT INTO dbo.saas_product_modules (product_id, code, name, is_core) VALUES (@HotelId, 'HOTEL_DASHBOARD', 'Hotel Dashboard', 1);
    IF NOT EXISTS (SELECT 1 FROM dbo.saas_product_modules WHERE product_id = @HotelId AND code = 'HOTEL_BILLING')
        INSERT INTO dbo.saas_product_modules (product_id, code, name, is_core) VALUES (@HotelId, 'HOTEL_BILLING', 'Billing & Invoices', 1);
    IF NOT EXISTS (SELECT 1 FROM dbo.saas_product_modules WHERE product_id = @HotelId AND code = 'HOTEL_KOT')
        INSERT INTO dbo.saas_product_modules (product_id, code, name, is_core) VALUES (@HotelId, 'HOTEL_KOT', 'KOT Management', 1);
    IF NOT EXISTS (SELECT 1 FROM dbo.saas_product_modules WHERE product_id = @HotelId AND code = 'HOTEL_TABLES')
        INSERT INTO dbo.saas_product_modules (product_id, code, name, is_core) VALUES (@HotelId, 'HOTEL_TABLES', 'Tables Management', 1);
    IF NOT EXISTS (SELECT 1 FROM dbo.saas_product_modules WHERE product_id = @HotelId AND code = 'HOTEL_ROOMS')
        INSERT INTO dbo.saas_product_modules (product_id, code, name, is_core) VALUES (@HotelId, 'HOTEL_ROOMS', 'Room & Booking Management', 0);
    IF NOT EXISTS (SELECT 1 FROM dbo.saas_product_modules WHERE product_id = @HotelId AND code = 'HOTEL_PURCHASE')
        INSERT INTO dbo.saas_product_modules (product_id, code, name, is_core) VALUES (@HotelId, 'HOTEL_PURCHASE', 'Purchase & Inventory', 1);
    IF NOT EXISTS (SELECT 1 FROM dbo.saas_product_modules WHERE product_id = @HotelId AND code = 'HOTEL_STAFF')
        INSERT INTO dbo.saas_product_modules (product_id, code, name, is_core) VALUES (@HotelId, 'HOTEL_STAFF', 'Staff Management', 0);
    IF NOT EXISTS (SELECT 1 FROM dbo.saas_product_modules WHERE product_id = @HotelId AND code = 'HOTEL_REPORTS')
        INSERT INTO dbo.saas_product_modules (product_id, code, name, is_core) VALUES (@HotelId, 'HOTEL_REPORTS', 'Reports & GST Analytics', 1);
END;

-- C. SEED PRODUCT MODULES FOR MESS
DECLARE @MessId BIGINT = (SELECT id FROM dbo.saas_products WHERE code = 'MESS');
IF @MessId IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.saas_product_modules WHERE product_id = @MessId AND code = 'MESS_DASHBOARD')
        INSERT INTO dbo.saas_product_modules (product_id, code, name, is_core) VALUES (@MessId, 'MESS_DASHBOARD', 'Mess Dashboard', 1);
    IF NOT EXISTS (SELECT 1 FROM dbo.saas_product_modules WHERE product_id = @MessId AND code = 'MESS_MEMBERS')
        INSERT INTO dbo.saas_product_modules (product_id, code, name, is_core) VALUES (@MessId, 'MESS_MEMBERS', 'Member Enrollment', 1);
    IF NOT EXISTS (SELECT 1 FROM dbo.saas_product_modules WHERE product_id = @MessId AND code = 'MESS_MEAL_PLANS')
        INSERT INTO dbo.saas_product_modules (product_id, code, name, is_core) VALUES (@MessId, 'MESS_MEAL_PLANS', 'Meal Plans Management', 1);
    IF NOT EXISTS (SELECT 1 FROM dbo.saas_product_modules WHERE product_id = @MessId AND code = 'MESS_ATTENDANCE')
        INSERT INTO dbo.saas_product_modules (product_id, code, name, is_core) VALUES (@MessId, 'MESS_ATTENDANCE', 'Daily Meal Attendance', 1);
    IF NOT EXISTS (SELECT 1 FROM dbo.saas_product_modules WHERE product_id = @MessId AND code = 'MESS_WEEKLY_MENU')
        INSERT INTO dbo.saas_product_modules (product_id, code, name, is_core) VALUES (@MessId, 'MESS_WEEKLY_MENU', 'Weekly Menu Schedule', 1);
    IF NOT EXISTS (SELECT 1 FROM dbo.saas_product_modules WHERE product_id = @MessId AND code = 'MESS_TIFFIN')
        INSERT INTO dbo.saas_product_modules (product_id, code, name, is_core) VALUES (@MessId, 'MESS_TIFFIN', 'Tiffin Dispatch & Delivery', 0);
    IF NOT EXISTS (SELECT 1 FROM dbo.saas_product_modules WHERE product_id = @MessId AND code = 'MESS_BILLING')
        INSERT INTO dbo.saas_product_modules (product_id, code, name, is_core) VALUES (@MessId, 'MESS_BILLING', 'Mess Billing & Renewal', 1);
END;

-- D. SEED PRODUCT MODULES FOR CAFE
DECLARE @CafeId BIGINT = (SELECT id FROM dbo.saas_products WHERE code = 'CAFE');
IF @CafeId IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.saas_product_modules WHERE product_id = @CafeId AND code = 'CAFE_DASHBOARD')
        INSERT INTO dbo.saas_product_modules (product_id, code, name, is_core) VALUES (@CafeId, 'CAFE_DASHBOARD', 'Cafe Dashboard', 1);
    IF NOT EXISTS (SELECT 1 FROM dbo.saas_product_modules WHERE product_id = @CafeId AND code = 'CAFE_LIVE_POS')
        INSERT INTO dbo.saas_product_modules (product_id, code, name, is_core) VALUES (@CafeId, 'CAFE_LIVE_POS', 'Touch Live POS', 1);
    IF NOT EXISTS (SELECT 1 FROM dbo.saas_product_modules WHERE product_id = @CafeId AND code = 'CAFE_MENU')
        INSERT INTO dbo.saas_product_modules (product_id, code, name, is_core) VALUES (@CafeId, 'CAFE_MENU', 'Cafe Menu & Modifiers', 1);
    IF NOT EXISTS (SELECT 1 FROM dbo.saas_product_modules WHERE product_id = @CafeId AND code = 'CAFE_KITCHEN')
        INSERT INTO dbo.saas_product_modules (product_id, code, name, is_core) VALUES (@CafeId, 'CAFE_KITCHEN', 'Kitchen Display & KOT', 1);
    IF NOT EXISTS (SELECT 1 FROM dbo.saas_product_modules WHERE product_id = @CafeId AND code = 'CAFE_TABLES')
        INSERT INTO dbo.saas_product_modules (product_id, code, name, is_core) VALUES (@CafeId, 'CAFE_TABLES', 'Table Layout & Orders', 1);
    IF NOT EXISTS (SELECT 1 FROM dbo.saas_product_modules WHERE product_id = @CafeId AND code = 'CAFE_REPORTS')
        INSERT INTO dbo.saas_product_modules (product_id, code, name, is_core) VALUES (@CafeId, 'CAFE_REPORTS', 'Cafe Sales Reports', 1);
END;

-- E. SEED SUBSCRIPTION PLANS FOR HOTEL
IF @HotelId IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.saas_subscription_plans WHERE code = 'HOTEL_TRIAL')
        INSERT INTO dbo.saas_subscription_plans (product_id, code, name, plan_type, billing_interval_months, base_price, gst_rate, discount_amount, final_price, description)
        VALUES (@HotelId, 'HOTEL_TRIAL', 'Hotel Free Trial (28 Days)', 'TRIAL', 0, 0.00, 18.00, 0.00, 0.00, 'Full feature access for 28 days free trial');

    IF NOT EXISTS (SELECT 1 FROM dbo.saas_subscription_plans WHERE code = 'HOTEL_YEARLY')
        INSERT INTO dbo.saas_subscription_plans (product_id, code, name, plan_type, billing_interval_months, base_price, gst_rate, discount_amount, final_price, description)
        VALUES (@HotelId, 'HOTEL_YEARLY', 'Hotel Yearly Pro', 'YEARLY', 12, 12000.00, 18.00, 0.00, 14160.00, 'Complete annual subscription with all features and unlimited bills');

    IF NOT EXISTS (SELECT 1 FROM dbo.saas_subscription_plans WHERE code = 'HOTEL_THREE_YEAR')
        INSERT INTO dbo.saas_subscription_plans (product_id, code, name, plan_type, billing_interval_months, base_price, gst_rate, discount_amount, final_price, description)
        VALUES (@HotelId, 'HOTEL_THREE_YEAR', 'Hotel 3-Year Enterprise', 'THREE_YEAR', 36, 30000.00, 18.00, 2000.00, 33040.00, 'Long-term 3-year hotel management plan with priority support');

    IF NOT EXISTS (SELECT 1 FROM dbo.saas_subscription_plans WHERE code = 'HOTEL_LIFETIME')
        INSERT INTO dbo.saas_subscription_plans (product_id, code, name, plan_type, billing_interval_months, base_price, gst_rate, discount_amount, final_price, description)
        VALUES (@HotelId, 'HOTEL_LIFETIME', 'Hotel Lifetime License', 'LIFETIME', 0, 60000.00, 18.00, 5000.00, 64900.00, 'Permanent single-branch lifetime access subject to terms');
END;

-- F. SEED SUBSCRIPTION PLANS FOR MESS
IF @MessId IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.saas_subscription_plans WHERE code = 'MESS_TRIAL')
        INSERT INTO dbo.saas_subscription_plans (product_id, code, name, plan_type, billing_interval_months, base_price, gst_rate, discount_amount, final_price, description)
        VALUES (@MessId, 'MESS_TRIAL', 'Mess Free Trial (28 Days)', 'TRIAL', 0, 0.00, 18.00, 0.00, 0.00, '28 days free trial for mess management');

    IF NOT EXISTS (SELECT 1 FROM dbo.saas_subscription_plans WHERE code = 'MESS_YEARLY')
        INSERT INTO dbo.saas_subscription_plans (product_id, code, name, plan_type, billing_interval_months, base_price, gst_rate, discount_amount, final_price, description)
        VALUES (@MessId, 'MESS_YEARLY', 'Mess Yearly Pro', 'YEARLY', 12, 8000.00, 18.00, 0.00, 9440.00, 'Full mess management for 12 months');

    IF NOT EXISTS (SELECT 1 FROM dbo.saas_subscription_plans WHERE code = 'MESS_THREE_YEAR')
        INSERT INTO dbo.saas_subscription_plans (product_id, code, name, plan_type, billing_interval_months, base_price, gst_rate, discount_amount, final_price, description)
        VALUES (@MessId, 'MESS_THREE_YEAR', 'Mess 3-Year Plan', 'THREE_YEAR', 36, 20000.00, 18.00, 1000.00, 22420.00, '36 months mess membership and attendance plan');

    IF NOT EXISTS (SELECT 1 FROM dbo.saas_subscription_plans WHERE code = 'MESS_LIFETIME')
        INSERT INTO dbo.saas_subscription_plans (product_id, code, name, plan_type, billing_interval_months, base_price, gst_rate, discount_amount, final_price, description)
        VALUES (@MessId, 'MESS_LIFETIME', 'Mess Lifetime License', 'LIFETIME', 0, 45000.00, 18.00, 3000.00, 49560.00, 'Permanent mess management software license');
END;

-- G. SEED SUBSCRIPTION PLANS FOR CAFE
IF @CafeId IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.saas_subscription_plans WHERE code = 'CAFE_TRIAL')
        INSERT INTO dbo.saas_subscription_plans (product_id, code, name, plan_type, billing_interval_months, base_price, gst_rate, discount_amount, final_price, description)
        VALUES (@CafeId, 'CAFE_TRIAL', 'Cafe Free Trial (28 Days)', 'TRIAL', 0, 0.00, 18.00, 0.00, 0.00, '28 days free trial for cafe POS and orders');

    IF NOT EXISTS (SELECT 1 FROM dbo.saas_subscription_plans WHERE code = 'CAFE_YEARLY')
        INSERT INTO dbo.saas_subscription_plans (product_id, code, name, plan_type, billing_interval_months, base_price, gst_rate, discount_amount, final_price, description)
        VALUES (@CafeId, 'CAFE_YEARLY', 'Cafe Yearly Pro', 'YEARLY', 12, 9000.00, 18.00, 0.00, 10620.00, 'Full cafe POS and menu management for 12 months');

    IF NOT EXISTS (SELECT 1 FROM dbo.saas_subscription_plans WHERE code = 'CAFE_THREE_YEAR')
        INSERT INTO dbo.saas_subscription_plans (product_id, code, name, plan_type, billing_interval_months, base_price, gst_rate, discount_amount, final_price, description)
        VALUES (@CafeId, 'CAFE_THREE_YEAR', 'Cafe 3-Year Plan', 'THREE_YEAR', 36, 22500.00, 18.00, 1500.00, 24780.00, '36 months cafe license with all features');

    IF NOT EXISTS (SELECT 1 FROM dbo.saas_subscription_plans WHERE code = 'CAFE_LIFETIME')
        INSERT INTO dbo.saas_subscription_plans (product_id, code, name, plan_type, billing_interval_months, base_price, gst_rate, discount_amount, final_price, description)
        VALUES (@CafeId, 'CAFE_LIFETIME', 'Cafe Lifetime License', 'LIFETIME', 0, 50000.00, 18.00, 4000.00, 54280.00, 'Permanent cafe POS and billing software license');
END;

-- H. SEED PLATFORM SETTINGS
IF NOT EXISTS (SELECT 1 FROM dbo.saas_platform_settings WHERE setting_key = 'COMPANY_NAME')
    INSERT INTO dbo.saas_platform_settings (setting_key, setting_value, category, description)
    VALUES ('COMPANY_NAME', 'Ajalkar Infotech Multi-SaaS Platform', 'GENERAL', 'Platform Provider Business Name');

IF NOT EXISTS (SELECT 1 FROM dbo.saas_platform_settings WHERE setting_key = 'SUPPORT_EMAIL')
    INSERT INTO dbo.saas_platform_settings (setting_key, setting_value, category, description)
    VALUES ('SUPPORT_EMAIL', 'support@ajalkarpos.com', 'GENERAL', 'Official Platform Support Contact Email');

IF NOT EXISTS (SELECT 1 FROM dbo.saas_platform_settings WHERE setting_key = 'DEFAULT_GST_RATE')
    INSERT INTO dbo.saas_platform_settings (setting_key, setting_value, category, description)
    VALUES ('DEFAULT_GST_RATE', '18.00', 'TAX', 'Standard Platform GST Percentage');

IF NOT EXISTS (SELECT 1 FROM dbo.saas_platform_settings WHERE setting_key = 'DEFAULT_TRIAL_DAYS')
    INSERT INTO dbo.saas_platform_settings (setting_key, setting_value, category, description)
    VALUES ('DEFAULT_TRIAL_DAYS', '28', 'GENERAL', 'Default Free Trial Duration in Days');

IF NOT EXISTS (SELECT 1 FROM dbo.saas_platform_settings WHERE setting_key = 'PLATFORM_CURRENCY')
    INSERT INTO dbo.saas_platform_settings (setting_key, setting_value, category, description)
    VALUES ('PLATFORM_CURRENCY', 'INR', 'GENERAL', 'Platform Currency Code');

IF NOT EXISTS (SELECT 1 FROM dbo.saas_platform_settings WHERE setting_key = 'MAINTENANCE_MODE')
    INSERT INTO dbo.saas_platform_settings (setting_key, setting_value, category, description)
    VALUES ('MAINTENANCE_MODE', 'false', 'GENERAL', 'Platform Maintenance Mode Toggle');
