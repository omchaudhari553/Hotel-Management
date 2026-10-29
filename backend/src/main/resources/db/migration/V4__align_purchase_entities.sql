-- ============================================================
-- V4 - ALIGN PURCHASE ENTITIES WITH EXISTING HOTEL BACKEND
-- Microsoft SQL Server
--
-- IMPORTANT:
-- Dynamic SQL is used after ALTER TABLE statements because
-- SQL Server may compile later statements before newly added
-- columns are visible in the same batch.
-- ============================================================


/* ============================================================
   1. GOODS RECEIPTS
   ============================================================ */

IF COL_LENGTH('goods_receipts', 'total_ordered_qty') IS NULL
BEGIN
    ALTER TABLE goods_receipts
        ADD total_ordered_qty DECIMAL(12,3) NULL;
END;

IF COL_LENGTH('goods_receipts', 'total_received_qty') IS NULL
BEGIN
    ALTER TABLE goods_receipts
        ADD total_received_qty DECIMAL(12,3) NULL;
END;

IF COL_LENGTH('goods_receipts', 'total_accepted_qty') IS NULL
BEGIN
    ALTER TABLE goods_receipts
        ADD total_accepted_qty DECIMAL(12,3) NULL;
END;

IF COL_LENGTH('goods_receipts', 'total_rejected_qty') IS NULL
BEGIN
    ALTER TABLE goods_receipts
        ADD total_rejected_qty DECIMAL(12,3) NULL;
END;

IF COL_LENGTH('goods_receipts', 'notes') IS NULL
BEGIN
    ALTER TABLE goods_receipts
        ADD notes VARCHAR(1000) NULL;
END;


/*
   Use dynamic SQL so SQL Server compiles the UPDATE
   after the newly added columns exist.
*/
EXEC sp_executesql N'
UPDATE goods_receipts
SET
    total_ordered_qty  = COALESCE(total_ordered_qty, 0),
    total_received_qty = COALESCE(total_received_qty, 0),
    total_accepted_qty = COALESCE(total_accepted_qty, 0),
    total_rejected_qty = COALESCE(total_rejected_qty, 0);
';


IF COL_LENGTH('goods_receipts', 'total_ordered_qty') IS NOT NULL
BEGIN
    ALTER TABLE goods_receipts
        ALTER COLUMN total_ordered_qty DECIMAL(12,3) NOT NULL;
END;

IF COL_LENGTH('goods_receipts', 'total_received_qty') IS NOT NULL
BEGIN
    ALTER TABLE goods_receipts
        ALTER COLUMN total_received_qty DECIMAL(12,3) NOT NULL;
END;

IF COL_LENGTH('goods_receipts', 'total_accepted_qty') IS NOT NULL
BEGIN
    ALTER TABLE goods_receipts
        ALTER COLUMN total_accepted_qty DECIMAL(12,3) NOT NULL;
END;

IF COL_LENGTH('goods_receipts', 'total_rejected_qty') IS NOT NULL
BEGIN
    ALTER TABLE goods_receipts
        ALTER COLUMN total_rejected_qty DECIMAL(12,3) NOT NULL;
END;


/* ============================================================
   2. PURCHASE INVOICES
   ============================================================ */

IF COL_LENGTH('purchase_invoices', 'goods_receipt_id') IS NULL
BEGIN
    ALTER TABLE purchase_invoices
        ADD goods_receipt_id BIGINT NULL;
END;

IF COL_LENGTH('purchase_invoices', 'subtotal') IS NULL
BEGIN
    ALTER TABLE purchase_invoices
        ADD subtotal DECIMAL(14,2) NULL;
END;

IF COL_LENGTH('purchase_invoices', 'tax_amount') IS NULL
BEGIN
    ALTER TABLE purchase_invoices
        ADD tax_amount DECIMAL(14,2) NULL;
END;

IF COL_LENGTH('purchase_invoices', 'discount_amount') IS NULL
BEGIN
    ALTER TABLE purchase_invoices
        ADD discount_amount DECIMAL(14,2) NULL;
END;

IF COL_LENGTH('purchase_invoices', 'status') IS NULL
BEGIN
    ALTER TABLE purchase_invoices
        ADD status VARCHAR(30) NULL;
END;

IF COL_LENGTH('purchase_invoices', 'notes') IS NULL
BEGIN
    ALTER TABLE purchase_invoices
        ADD notes VARCHAR(1000) NULL;
END;

IF COL_LENGTH('purchase_invoices', 'payment_method') IS NULL
BEGIN
    ALTER TABLE purchase_invoices
        ADD payment_method VARCHAR(50) NULL;
END;


/*
   Dynamic SQL because the columns above may have just been created.
*/
EXEC sp_executesql N'
UPDATE purchase_invoices
SET
    subtotal = COALESCE(subtotal, total),
    tax_amount = COALESCE(tax_amount, 0),
    discount_amount = COALESCE(discount_amount, 0),
    status = COALESCE(status, ''ACTIVE'');
';


IF NOT EXISTS
(
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'fk_purchase_invoices_grn'
      AND parent_object_id = OBJECT_ID('purchase_invoices')
)
AND OBJECT_ID('goods_receipts', 'U') IS NOT NULL
BEGIN
    ALTER TABLE purchase_invoices
        ADD CONSTRAINT fk_purchase_invoices_grn
        FOREIGN KEY (goods_receipt_id)
        REFERENCES goods_receipts(id);
END;


/* ============================================================
   3. PURCHASE INVOICE ITEMS
   ============================================================ */

IF OBJECT_ID('purchase_invoice_items', 'U') IS NULL
BEGIN
    CREATE TABLE purchase_invoice_items
    (
        id BIGINT IDENTITY(1,1) NOT NULL,
        purchase_invoice_id BIGINT NOT NULL,
        item_name VARCHAR(200) NOT NULL,
        quantity DECIMAL(12,3) NOT NULL,
        unit_price DECIMAL(12,2) NOT NULL,
        discount_percent DECIMAL(7,2) NULL,
        tax_rate DECIMAL(7,2) NULL,
        total DECIMAL(14,2) NOT NULL,
        created_at DATETIME2(6) NOT NULL,
        updated_at DATETIME2(6) NOT NULL,

        CONSTRAINT pk_purchase_invoice_items
            PRIMARY KEY (id),

        CONSTRAINT fk_purchase_invoice_items_inv
            FOREIGN KEY (purchase_invoice_id)
            REFERENCES purchase_invoices(id)
    );
END;


/* ============================================================
   4. PURCHASE RETURNS
   ============================================================ */

IF COL_LENGTH('purchase_returns', 'branch_id') IS NULL
BEGIN
    ALTER TABLE purchase_returns
        ADD branch_id BIGINT NULL;
END;

IF COL_LENGTH('purchase_returns', 'tax_amount') IS NULL
BEGIN
    ALTER TABLE purchase_returns
        ADD tax_amount DECIMAL(14,2) NULL;
END;

IF COL_LENGTH('purchase_returns', 'total_amount') IS NULL
BEGIN
    ALTER TABLE purchase_returns
        ADD total_amount DECIMAL(14,2) NULL;
END;


/*
   Dynamic SQL because total_amount/tax_amount may have just
   been created.
*/
EXEC sp_executesql N'
UPDATE purchase_returns
SET
    total_amount = COALESCE(total_amount, total),
    tax_amount = COALESCE(tax_amount, 0);
';


IF COL_LENGTH('purchase_returns', 'total_amount') IS NOT NULL
BEGIN
    ALTER TABLE purchase_returns
        ALTER COLUMN total_amount DECIMAL(14,2) NOT NULL;
END;


/* Add branch foreign key only if it does not already exist. */
IF NOT EXISTS
(
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'fk_purchase_returns_branch'
      AND parent_object_id = OBJECT_ID('purchase_returns')
)
AND OBJECT_ID('branches', 'U') IS NOT NULL
BEGIN
    ALTER TABLE purchase_returns
        ADD CONSTRAINT fk_purchase_returns_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(id);
END;


/* ============================================================
   5. PURCHASE RETURN ITEMS
   ============================================================ */

IF COL_LENGTH('purchase_return_items', 'total_price') IS NULL
BEGIN
    ALTER TABLE purchase_return_items
        ADD total_price DECIMAL(14,2) NULL;
END;


/*
   Dynamic SQL because total_price may have just been created.
*/
EXEC sp_executesql N'
UPDATE purchase_return_items
SET
    total_price = COALESCE(total_price, total);
';


IF COL_LENGTH('purchase_return_items', 'total_price') IS NOT NULL
BEGIN
    ALTER TABLE purchase_return_items
        ALTER COLUMN total_price DECIMAL(14,2) NOT NULL;
END;


/* ============================================================
   6. CURRENT ENTITY NULLABILITY ALIGNMENT
   ============================================================ */

IF COL_LENGTH('purchase_returns', 'supplier_id') IS NOT NULL
AND NOT EXISTS
(
    SELECT 1
    FROM purchase_returns
    WHERE supplier_id IS NULL
)
BEGIN
    ALTER TABLE purchase_returns
        ALTER COLUMN supplier_id BIGINT NOT NULL;
END;


/*
   GoodsReceipt.purchaseOrder is optional in the current entity.
*/
IF COL_LENGTH('goods_receipts', 'purchase_order_id') IS NOT NULL
BEGIN
    ALTER TABLE goods_receipts
        ALTER COLUMN purchase_order_id BIGINT NULL;
END;