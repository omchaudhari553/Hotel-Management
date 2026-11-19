-- ============================================================
-- Migration V17: Drop outlets table, remove outlet columns,
-- parent_branch_id, guest columns from hotel_tables,
-- printer_configuration columns, and cleanup subscription_payments
-- ============================================================

-- 1. Drop foreign key and column outlet_id from staff
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_staff_outlet')
BEGIN
    ALTER TABLE dbo.staff DROP CONSTRAINT fk_staff_outlet;
END;

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.staff') AND name = 'outlet_id')
BEGIN
    ALTER TABLE dbo.staff DROP COLUMN outlet_id;
END;

-- 2. Drop foreign keys and table dbo.outlets
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_outlet_branch')
BEGIN
    ALTER TABLE dbo.outlets DROP CONSTRAINT fk_outlet_branch;
END;

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'outlets' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    DROP TABLE dbo.outlets;
END;

-- 3. Drop parent_branch_id from branches
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_branch_parent')
BEGIN
    ALTER TABLE dbo.branches DROP CONSTRAINT fk_branch_parent;
END;

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.branches') AND name = 'parent_branch_id')
BEGIN
    ALTER TABLE dbo.branches DROP COLUMN parent_branch_id;
END;

-- 4. Drop guest and guest_count from hotel_tables
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.hotel_tables') AND name = 'guest')
BEGIN
    ALTER TABLE dbo.hotel_tables DROP COLUMN guest;
END;

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.hotel_tables') AND name = 'guest_count')
BEGIN
    ALTER TABLE dbo.hotel_tables DROP COLUMN guest_count;
END;

-- 5. Drop model_name, header_lines, footer_lines from printer_configurations
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.printer_configurations') AND name = 'model_name')
BEGIN
    ALTER TABLE dbo.printer_configurations DROP COLUMN model_name;
END;

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.printer_configurations') AND name = 'header_lines')
BEGIN
    ALTER TABLE dbo.printer_configurations DROP COLUMN header_lines;
END;

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.printer_configurations') AND name = 'footer_lines')
BEGIN
    ALTER TABLE dbo.printer_configurations DROP COLUMN footer_lines;
END;

-- 6. Drop unused columns from subscription_payments
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.subscription_payments') AND name = 'admin_notes')
BEGIN
    ALTER TABLE dbo.subscription_payments DROP COLUMN admin_notes;
END;

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.subscription_payments') AND name = 'verified_at')
BEGIN
    ALTER TABLE dbo.subscription_payments DROP COLUMN verified_at;
END;

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.subscription_payments') AND name = 'verified_by')
BEGIN
    ALTER TABLE dbo.subscription_payments DROP COLUMN verified_by;
END;

-- Backfill legacy null columns in subscription_payments
UPDATE dbo.subscription_payments
SET 
    platform = ISNULL(platform, 'Mobile & Desktop'),
    plan_type = ISNULL(plan_type, 'Software Only'),
    duration_type = ISNULL(duration_type, '1 Year'),
    hardware_included = ISNULL(hardware_included, 'None'),
    verification_status = CASE 
        WHEN verification_status IS NOT NULL THEN verification_status
        WHEN status = 'SUCCESS' THEN 'VERIFIED'
        ELSE 'PENDING'
    END,
    order_ref = CASE 
        WHEN order_ref IS NOT NULL THEN order_ref 
        ELSE CONCAT('#', 10000 + id) 
    END,
    payment_id = CASE 
        WHEN payment_id IS NOT NULL THEN payment_id 
        ELSE CONCAT('TXN-', id) 
    END
WHERE platform IS NULL OR plan_type IS NULL OR duration_type IS NULL OR verification_status IS NULL OR order_ref IS NULL OR payment_id IS NULL;

