-- ============================================================
-- V14 - ADD BRANCH TO USERS AND MULTI-BRANCH SUPPORT
-- Microsoft SQL Server 2016+ / 2022 Compatible
-- Ajalkar POS / Hotel Management Multi-Branch Isolation
-- ============================================================

-- 1. ADD branch_id TO users TABLE FOR BRANCH-SPECIFIC CREDENTIALS
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'branch_id'
)
BEGIN
    EXEC('ALTER TABLE users ADD branch_id BIGINT NULL;');
    EXEC('ALTER TABLE users ADD CONSTRAINT fk_user_branch FOREIGN KEY (branch_id) REFERENCES branches(id);');
    EXEC('CREATE INDEX idx_users_branch_id ON users(branch_id);');
END;

-- 2. ADD city AND state TO branches TABLE
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'branches' AND COLUMN_NAME = 'city'
)
BEGIN
    EXEC('ALTER TABLE branches ADD city VARCHAR(100) NULL;');
END;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'branches' AND COLUMN_NAME = 'state'
)
BEGIN
    EXEC('ALTER TABLE branches ADD state VARCHAR(100) NULL;');
END;

-- 3. ADD branch_id TO purchase_invoices TABLE
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'purchase_invoices' AND COLUMN_NAME = 'branch_id'
)
BEGIN
    EXEC('ALTER TABLE purchase_invoices ADD branch_id BIGINT NULL;');
    EXEC('ALTER TABLE purchase_invoices ADD CONSTRAINT fk_purchase_invoices_branch FOREIGN KEY (branch_id) REFERENCES branches(id);');
    EXEC('CREATE INDEX idx_purchase_invoices_branch_id ON purchase_invoices(branch_id);');
END;

-- 4. ADD branch_id TO purchase_orders TABLE
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'purchase_orders' AND COLUMN_NAME = 'branch_id'
)
BEGIN
    EXEC('ALTER TABLE purchase_orders ADD branch_id BIGINT NULL;');
    EXEC('ALTER TABLE purchase_orders ADD CONSTRAINT fk_purchase_orders_branch FOREIGN KEY (branch_id) REFERENCES branches(id);');
    EXEC('CREATE INDEX idx_purchase_orders_branch_id ON purchase_orders(branch_id);');
END;

-- 5. ADD branch_id TO hotel_settings TABLE
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'hotel_settings' AND COLUMN_NAME = 'branch_id'
)
BEGIN
    EXEC('ALTER TABLE hotel_settings ADD branch_id BIGINT NULL;');
    EXEC('ALTER TABLE hotel_settings ADD CONSTRAINT fk_hotel_settings_branch FOREIGN KEY (branch_id) REFERENCES branches(id);');
    EXEC('CREATE INDEX idx_hotel_settings_branch_id ON hotel_settings(branch_id);');
END;

-- 6. ENSURE PERFORMANCE INDEXES FOR DATA ISOLATION
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_invoices_biz_branch' AND object_id = OBJECT_ID('invoices'))
BEGIN
    EXEC('CREATE INDEX idx_invoices_biz_branch ON invoices(business_id, branch_id);');
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_payments_biz_branch' AND object_id = OBJECT_ID('payments'))
BEGIN
    EXEC('CREATE INDEX idx_payments_biz_branch ON payments(business_id, branch_id);');
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_orders_biz_branch' AND object_id = OBJECT_ID('hotel_orders'))
BEGIN
    EXEC('CREATE INDEX idx_orders_biz_branch ON hotel_orders(business_id, branch_id);');
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_kots_biz_branch' AND object_id = OBJECT_ID('kots'))
BEGIN
    EXEC('CREATE INDEX idx_kots_biz_branch ON kots(business_id, branch_id);');
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_tables_biz_branch' AND object_id = OBJECT_ID('hotel_tables'))
BEGIN
    EXEC('CREATE INDEX idx_tables_biz_branch ON hotel_tables(business_id, branch_id);');
END;

-- 7. SAFE DATA BACKFILL: ENSURE EXISTING RECORDS BELONG TO A PRIMARY BRANCH
EXEC('
UPDATE inv
SET inv.branch_id = (SELECT TOP 1 b.id FROM branches b WHERE b.business_id = inv.business_id ORDER BY b.id ASC)
FROM invoices inv
WHERE inv.branch_id IS NULL 
  AND EXISTS (SELECT 1 FROM branches b WHERE b.business_id = inv.business_id);
');

EXEC('
UPDATE p
SET p.branch_id = (SELECT TOP 1 b.id FROM branches b WHERE b.business_id = p.business_id ORDER BY b.id ASC)
FROM payments p
WHERE p.branch_id IS NULL 
  AND EXISTS (SELECT 1 FROM branches b WHERE b.business_id = p.business_id);
');

EXEC('
UPDATE ho
SET ho.branch_id = (SELECT TOP 1 b.id FROM branches b WHERE b.business_id = ho.business_id ORDER BY b.id ASC)
FROM hotel_orders ho
WHERE ho.branch_id IS NULL 
  AND EXISTS (SELECT 1 FROM branches b WHERE b.business_id = ho.business_id);
');

EXEC('
UPDATE k
SET k.branch_id = (SELECT TOP 1 b.id FROM branches b WHERE b.business_id = k.business_id ORDER BY b.id ASC)
FROM kots k
WHERE k.branch_id IS NULL 
  AND EXISTS (SELECT 1 FROM branches b WHERE b.business_id = k.business_id);
');

EXEC('
UPDATE ht
SET ht.branch_id = (SELECT TOP 1 b.id FROM branches b WHERE b.business_id = ht.business_id ORDER BY b.id ASC)
FROM hotel_tables ht
WHERE ht.branch_id IS NULL 
  AND EXISTS (SELECT 1 FROM branches b WHERE b.business_id = ht.business_id);
');

IF OBJECT_ID('staff') IS NOT NULL
BEGIN
    EXEC('
    UPDATE s
    SET s.branch_id = (SELECT TOP 1 b.id FROM branches b WHERE b.business_id = s.business_id ORDER BY b.id ASC)
    FROM staff s
    WHERE s.branch_id IS NULL 
      AND EXISTS (SELECT 1 FROM branches b WHERE b.business_id = s.business_id);
    ');
END;

EXEC('
UPDATE pi
SET pi.branch_id = (SELECT TOP 1 b.id FROM branches b WHERE b.business_id = pi.business_id ORDER BY b.id ASC)
FROM purchase_invoices pi
WHERE pi.branch_id IS NULL 
  AND EXISTS (SELECT 1 FROM branches b WHERE b.business_id = pi.business_id);
');

EXEC('
UPDATE po
SET po.branch_id = (SELECT TOP 1 b.id FROM branches b WHERE b.business_id = po.business_id ORDER BY b.id ASC)
FROM purchase_orders po
WHERE po.branch_id IS NULL 
  AND EXISTS (SELECT 1 FROM branches b WHERE b.business_id = po.business_id);
');
