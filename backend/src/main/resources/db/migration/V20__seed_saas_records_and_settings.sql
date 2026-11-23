-- ============================================================
-- Migration V20: Seed Rich Multi-Product SaaS Records & Settings
-- Hotel, Mess, Cafe Subscriptions, Payments, Invoices & Tickets
-- ============================================================

-- 1. SEED MULTI-PRODUCT BUSINESSES (MESS, CAFE)
IF NOT EXISTS (SELECT 1 FROM dbo.businesses WHERE code = 'MESS_ANNAPURNA')
BEGIN
    INSERT INTO dbo.businesses (name, code, industry_type, owner_name, contact_email, phone, address, city, state, currency, active, created_at, updated_at)
    VALUES ('Annapurna Executive Mess', 'MESS_ANNAPURNA', 'MESS', 'Mahesh Kulkarni', 'annapurna@mess.com', '9822012345', 'College Road, Near KTHM College', 'Nashik', 'Maharashtra', 'INR', 1, GETDATE(), GETDATE());
END;

IF NOT EXISTS (SELECT 1 FROM dbo.businesses WHERE code = 'CAFE_DELIGHT')
BEGIN
    INSERT INTO dbo.businesses (name, code, industry_type, owner_name, contact_email, phone, address, city, state, currency, active, created_at, updated_at)
    VALUES ('Cafe Coffee & Bakery Hub', 'CAFE_DELIGHT', 'CAFE', 'Priya Deshmukh', 'priya@cafedelight.com', '9890123456', 'FC Road, Deccan', 'Pune', 'Maharashtra', 'INR', 1, GETDATE(), GETDATE());
END;

-- 2. SEED BRANCHES FOR MESS AND CAFE
DECLARE @messBizId BIGINT = (SELECT TOP 1 id FROM dbo.businesses WHERE code = 'MESS_ANNAPURNA');
DECLARE @cafeBizId BIGINT = (SELECT TOP 1 id FROM dbo.businesses WHERE code = 'CAFE_DELIGHT');
DECLARE @hotelBizId BIGINT = (SELECT TOP 1 id FROM dbo.businesses WHERE code LIKE 'HOTEL%' ORDER BY id ASC);

IF @messBizId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.branches WHERE business_id = @messBizId)
BEGIN
    INSERT INTO dbo.branches (business_id, name, code, manager_name, email, contact_phone, address, city, state, status, established_on, operating_hours, created_at, updated_at)
    VALUES (@messBizId, 'College Road Branch', 'MB-NSK-01', 'Mahesh Kulkarni', 'annapurna@mess.com', '9822012345', 'College Road', 'Nashik', 'Maharashtra', 'ACTIVE', GETDATE(), '7 AM - 10 PM', GETDATE(), GETDATE());

    INSERT INTO dbo.branches (business_id, name, code, manager_name, email, contact_phone, address, city, state, status, established_on, operating_hours, created_at, updated_at)
    VALUES (@messBizId, 'Gangapur Road Branch', 'MB-NSK-02', 'Sachin Kulkarni', 'sachin@mess.com', '9822012346', 'Gangapur Road', 'Nashik', 'Maharashtra', 'ACTIVE', GETDATE(), '7 AM - 10 PM', GETDATE(), GETDATE());
END;

IF @cafeBizId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.branches WHERE business_id = @cafeBizId)
BEGIN
    INSERT INTO dbo.branches (business_id, name, code, manager_name, email, contact_phone, address, city, state, status, established_on, operating_hours, created_at, updated_at)
    VALUES (@cafeBizId, 'FC Road Branch', 'CB-PUN-01', 'Priya Deshmukh', 'priya@cafedelight.com', '9890123456', 'FC Road', 'Pune', 'Maharashtra', 'ACTIVE', GETDATE(), '8 AM - 11 PM', GETDATE(), GETDATE());

    INSERT INTO dbo.branches (business_id, name, code, manager_name, email, contact_phone, address, city, state, status, established_on, operating_hours, created_at, updated_at)
    VALUES (@cafeBizId, 'Kothrud Branch', 'CB-PUN-02', 'Anand Joshi', 'anand@cafedelight.com', '9890123457', 'Kothrud Stand', 'Pune', 'Maharashtra', 'ACTIVE', GETDATE(), '8 AM - 11 PM', GETDATE(), GETDATE());
END;

-- 3. SEED SUBSCRIPTIONS ACROSS HOTEL, MESS, CAFE
DECLARE @prodHotelId BIGINT = (SELECT TOP 1 id FROM dbo.saas_products WHERE code = 'HOTEL');
DECLARE @prodMessId BIGINT = (SELECT TOP 1 id FROM dbo.saas_products WHERE code = 'MESS');
DECLARE @prodCafeId BIGINT = (SELECT TOP 1 id FROM dbo.saas_products WHERE code = 'CAFE');

DECLARE @hotelPlanYearly BIGINT = (SELECT TOP 1 id FROM dbo.saas_subscription_plans WHERE code = 'HOTEL_YEARLY');
DECLARE @messPlanYearly BIGINT = (SELECT TOP 1 id FROM dbo.saas_subscription_plans WHERE code = 'MESS_YEARLY');
DECLARE @cafePlanTrial BIGINT = (SELECT TOP 1 id FROM dbo.saas_subscription_plans WHERE code = 'CAFE_TRIAL');

DECLARE @hotelBranch1 BIGINT = (SELECT TOP 1 id FROM dbo.branches WHERE business_id = @hotelBizId ORDER BY id ASC);
DECLARE @messBranch1 BIGINT = (SELECT TOP 1 id FROM dbo.branches WHERE business_id = @messBizId ORDER BY id ASC);
DECLARE @cafeBranch1 BIGINT = (SELECT TOP 1 id FROM dbo.branches WHERE business_id = @cafeBizId ORDER BY id ASC);

IF @hotelBizId IS NOT NULL AND @hotelPlanYearly IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.saas_subscriptions WHERE business_id = @hotelBizId)
BEGIN
    INSERT INTO dbo.saas_subscriptions (business_id, branch_id, product_id, plan_id, status, start_date, end_date, auto_renew, is_lifetime, notes, created_at, updated_at)
    VALUES (@hotelBizId, @hotelBranch1, @prodHotelId, @hotelPlanYearly, 'ACTIVE', DATEADD(MONTH, -2, GETDATE()), DATEADD(MONTH, 10, GETDATE()), 1, 0, 'Hotel Yearly Pro Subscription', GETDATE(), GETDATE());
END;

IF @messBizId IS NOT NULL AND @messPlanYearly IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.saas_subscriptions WHERE business_id = @messBizId)
BEGIN
    INSERT INTO dbo.saas_subscriptions (business_id, branch_id, product_id, plan_id, status, start_date, end_date, auto_renew, is_lifetime, notes, created_at, updated_at)
    VALUES (@messBizId, @messBranch1, @prodMessId, @messPlanYearly, 'ACTIVE', DATEADD(MONTH, -1, GETDATE()), DATEADD(MONTH, 11, GETDATE()), 1, 0, 'Mess Yearly Pro Subscription', GETDATE(), GETDATE());
END;

IF @cafeBizId IS NOT NULL AND @cafePlanTrial IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.saas_subscriptions WHERE business_id = @cafeBizId)
BEGIN
    INSERT INTO dbo.saas_subscriptions (business_id, branch_id, product_id, plan_id, status, start_date, end_date, trial_start_at, trial_end_at, auto_renew, is_lifetime, notes, created_at, updated_at)
    VALUES (@cafeBizId, @cafeBranch1, @prodCafeId, @cafePlanTrial, 'TRIAL', GETDATE(), DATEADD(DAY, 28, GETDATE()), GETDATE(), DATEADD(DAY, 28, GETDATE()), 0, 0, 'Cafe 28-Day Free Trial', GETDATE(), GETDATE());
END;

-- 4. SEED PAYMENTS
DECLARE @subHotelId BIGINT = (SELECT TOP 1 id FROM dbo.saas_subscriptions WHERE business_id = @hotelBizId);
DECLARE @subMessId BIGINT = (SELECT TOP 1 id FROM dbo.saas_subscriptions WHERE business_id = @messBizId);

IF @subHotelId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.saas_payments WHERE subscription_id = @subHotelId)
BEGIN
    INSERT INTO dbo.saas_payments (subscription_id, business_id, branch_id, amount, gst_amount, total_amount, currency, payment_gateway, gateway_payment_id, status, payment_method, notes, created_at, updated_at)
    VALUES (@subHotelId, @hotelBizId, @hotelBranch1, 12000.00, 2160.00, 14160.00, 'INR', 'RAZORPAY', 'pay_HOTEL_2026_981', 'SUCCESS', 'UPI', 'Hotel Yearly Pro Payment', DATEADD(MONTH, -2, GETDATE()), DATEADD(MONTH, -2, GETDATE()));
END;

IF @subMessId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.saas_payments WHERE subscription_id = @subMessId)
BEGIN
    INSERT INTO dbo.saas_payments (subscription_id, business_id, branch_id, amount, gst_amount, total_amount, currency, payment_gateway, gateway_payment_id, status, payment_method, notes, created_at, updated_at)
    VALUES (@subMessId, @messBizId, @messBranch1, 8000.00, 1440.00, 9440.00, 'INR', 'RAZORPAY', 'pay_MESS_2026_342', 'SUCCESS', 'NETBANKING', 'Mess Yearly Pro Payment', DATEADD(MONTH, -1, GETDATE()), DATEADD(MONTH, -1, GETDATE()));
END;

-- 5. SEED INVOICES
DECLARE @payHotelId BIGINT = (SELECT TOP 1 id FROM dbo.saas_payments WHERE business_id = @hotelBizId);
DECLARE @payMessId BIGINT = (SELECT TOP 1 id FROM dbo.saas_payments WHERE business_id = @messBizId);

IF @subHotelId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.saas_invoices WHERE invoice_number = 'INV-2026-001')
BEGIN
    INSERT INTO dbo.saas_invoices (invoice_number, subscription_id, business_id, branch_id, payment_id, base_amount, cgst_amount, sgst_amount, igst_amount, total_amount, status, invoice_date, created_at, updated_at)
    VALUES ('INV-2026-001', @subHotelId, @hotelBizId, @hotelBranch1, @payHotelId, 12000.00, 1080.00, 1080.00, 0.00, 14160.00, 'PAID', DATEADD(MONTH, -2, GETDATE()), GETDATE(), GETDATE());
END;

IF @subMessId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.saas_invoices WHERE invoice_number = 'INV-2026-002')
BEGIN
    INSERT INTO dbo.saas_invoices (invoice_number, subscription_id, business_id, branch_id, payment_id, base_amount, cgst_amount, sgst_amount, igst_amount, total_amount, status, invoice_date, created_at, updated_at)
    VALUES ('INV-2026-002', @subMessId, @messBizId, @messBranch1, @payMessId, 8000.00, 720.00, 720.00, 0.00, 9440.00, 'PAID', DATEADD(MONTH, -1, GETDATE()), GETDATE(), GETDATE());
END;

-- 6. SEED SUPPORT TICKETS
IF @hotelBizId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.saas_support_tickets WHERE business_id = @hotelBizId)
BEGIN
    INSERT INTO dbo.saas_support_tickets (ticket_number, business_id, subject, description, product_code, priority, status, assigned_to, created_at, updated_at)
    VALUES ('TCK-2026-001', @hotelBizId, 'Thermal Printer Configuration for KOT', 'Need assistance configuring ESC/POS network thermal printer for kitchen orders.', 'HOTEL', 'MEDIUM', 'RESOLVED', 'Super Admin Support', DATEADD(DAY, -5, GETDATE()), GETDATE());
END;

IF @messBizId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.saas_support_tickets WHERE business_id = @messBizId)
BEGIN
    INSERT INTO dbo.saas_support_tickets (ticket_number, business_id, subject, description, product_code, priority, status, assigned_to, created_at, updated_at)
    VALUES ('TCK-2026-002', @messBizId, 'Student Monthly Attendance CSV Export', 'How do we export monthly student dining records directly to Excel?', 'MESS', 'LOW', 'OPEN', 'Platform Support', DATEADD(DAY, -1, GETDATE()), GETDATE());
END;

IF @cafeBizId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.saas_support_tickets WHERE business_id = @cafeBizId)
BEGIN
    INSERT INTO dbo.saas_support_tickets (ticket_number, business_id, subject, description, product_code, priority, status, assigned_to, created_at, updated_at)
    VALUES ('TCK-2026-003', @cafeBizId, 'Add custom dessert toppings to Cafe POS menu', 'Requests guidance on adding toppings modifier group to Cafe billing terminal.', 'CAFE', 'HIGH', 'IN_PROGRESS', 'Super Admin Technical', GETDATE(), GETDATE());
END;

-- 7. SEED COMPLETE PLATFORM SETTINGS (Prompt Section 18)
MERGE dbo.saas_platform_settings AS target
USING (VALUES
    ('platform_name', 'Ajalkar Central SaaS Platform', 'GENERAL', 'Platform Display Name'),
    ('support_email', 'support@ajalkarpos.com', 'GENERAL', 'Primary Support Contact Email'),
    ('support_phone', '+91 98765 43210', 'GENERAL', 'Platform Support Helpline'),
    ('currency', 'INR', 'GENERAL', 'Default Currency Code (INR, USD, etc.)'),
    ('timezone', 'Asia/Kolkata', 'GENERAL', 'System Timezone (UTC/Asia/Kolkata)'),

    ('branding_title', 'Ajalkar Hospitality Suite', 'BRANDING', 'Browser Window Title'),
    ('branding_theme', 'DARK_INDIGO', 'BRANDING', 'Default Super Admin Visual Theme'),
    ('branding_logo_url', '/assets/logo.png', 'BRANDING', 'Primary Brand Logo URL'),
    ('branding_favicon_url', '/favicon.ico', 'BRANDING', 'Favicon Resource URL'),

    ('razorpay_key_id', 'rzp_live_SAMPLE_KEY_2026', 'PAYMENT', 'Razorpay Production Key ID'),
    ('razorpay_key_secret', 'rzp_sec_SAMPLE_SECRET_8921', 'PAYMENT', 'Razorpay Production Secret'),
    ('razorpay_webhook_secret', 'whsec_AJALKAR_HOOK_4829', 'PAYMENT', 'Razorpay Webhook Verification Secret'),
    ('payment_mode', 'LIVE', 'PAYMENT', 'Payment Environment: LIVE or TEST'),

    ('smtp_host', 'smtp.gmail.com', 'EMAIL', 'Outgoing Mail Server (SMTP) Host'),
    ('smtp_port', '587', 'EMAIL', 'SMTP Port (587 TLS or 465 SSL)'),
    ('smtp_username', 'omchaudhari553@gmail.com', 'EMAIL', 'SMTP Authentication Username'),
    ('smtp_password', 'rcok jodn lbbi ygpi', 'EMAIL', 'SMTP App Password'),
    ('smtp_from_email', 'omchaudhari553@gmail.com', 'EMAIL', 'Default Sender Email Address'),
    ('smtp_from_name', 'Ajalkar Platform Administration', 'EMAIL', 'Sender Display Name'),

    ('sms_provider', 'FAST2SMS', 'SMS_WHATSAPP', 'SMS Gateway Provider'),
    ('sms_api_key', 'sms_api_key_sample_78912', 'SMS_WHATSAPP', 'SMS Service Authorization API Key'),
    ('whatsapp_api_key', 'wa_live_key_sample_48123', 'SMS_WHATSAPP', 'WhatsApp Cloud API Access Token'),
    ('whatsapp_sender_id', '919876543210', 'SMS_WHATSAPP', 'Registered WhatsApp Business Sender ID'),

    ('invoice_prefix', 'INV-2026-', 'INVOICE', 'Default Invoice Number Prefix'),
    ('invoice_next_num', '1003', 'INVOICE', 'Next Auto-Generated Invoice Sequence Number'),
    ('invoice_gstin', '27AABCU9603R1ZM', 'INVOICE', 'Platform Company GST Registration Number'),
    ('invoice_company_address', '101 Technopark, Pune, Maharashtra 411001', 'INVOICE', 'Company Registered Office Address'),
    ('default_gst_rate', '18.00', 'INVOICE', 'Default Standard Goods & Services Tax (GST) Rate %'),

    ('security_require_2fa', 'false', 'SECURITY', 'Require Two-Factor Authentication for Platform Admins'),
    ('security_session_timeout', '60', 'SECURITY', 'Admin Session Inactivity Timeout (minutes)'),
    ('security_max_login_attempts', '5', 'SECURITY', 'Max Failed Login Attempts before Lockout'),
    ('security_ip_whitelist', '*', 'SECURITY', 'IP Whitelist (* for unrestricted, or comma-separated IPs)')
) AS source (setting_key, setting_value, category, description)
ON target.setting_key = source.setting_key
WHEN MATCHED THEN
    UPDATE SET setting_value = source.setting_value, category = source.category, description = source.description, updated_at = GETDATE()
WHEN NOT MATCHED THEN
    INSERT (setting_key, setting_value, category, description, created_at, updated_at)
    VALUES (source.setting_key, source.setting_value, source.category, source.description, GETDATE(), GETDATE());
