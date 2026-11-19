-- ============================================================
-- V13 - CLEANUP UNWANTED AND UNUSED COLUMNS
-- Compatible with Microsoft SQL Server 2016+ / 2022
-- ============================================================

-- 1. DROP expiry_date FROM goods_receipt_items
IF COL_LENGTH('dbo.goods_receipt_items', 'expiry_date') IS NOT NULL
BEGIN
    ALTER TABLE dbo.goods_receipt_items DROP COLUMN expiry_date;
END;

-- 2. DROP booking_id, external_* COLUMNS FROM hotel_orders
-- Drop foreign key constraint if exists
IF EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'fk_hotel_orders_booking'
      AND parent_object_id = OBJECT_ID('dbo.hotel_orders')
)
BEGIN
    ALTER TABLE dbo.hotel_orders DROP CONSTRAINT fk_hotel_orders_booking;
END;

-- Drop external index if exists
IF EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'uk_hotel_orders_external'
      AND object_id = OBJECT_ID('dbo.hotel_orders')
)
BEGIN
    DROP INDEX uk_hotel_orders_external ON dbo.hotel_orders;
END;

IF COL_LENGTH('dbo.hotel_orders', 'booking_id') IS NOT NULL
BEGIN
    ALTER TABLE dbo.hotel_orders DROP COLUMN booking_id;
END;

IF COL_LENGTH('dbo.hotel_orders', 'external_platform') IS NOT NULL
BEGIN
    ALTER TABLE dbo.hotel_orders DROP COLUMN external_platform;
END;

IF COL_LENGTH('dbo.hotel_orders', 'external_order_id') IS NOT NULL
BEGIN
    ALTER TABLE dbo.hotel_orders DROP COLUMN external_order_id;
END;

IF COL_LENGTH('dbo.hotel_orders', 'external_order_number') IS NOT NULL
BEGIN
    ALTER TABLE dbo.hotel_orders DROP COLUMN external_order_number;
END;

IF COL_LENGTH('dbo.hotel_orders', 'external_outlet_id') IS NOT NULL
BEGIN
    ALTER TABLE dbo.hotel_orders DROP COLUMN external_outlet_id;
END;

IF COL_LENGTH('dbo.hotel_orders', 'external_payment_status') IS NOT NULL
BEGIN
    ALTER TABLE dbo.hotel_orders DROP COLUMN external_payment_status;
END;

IF COL_LENGTH('dbo.hotel_orders', 'external_status') IS NOT NULL
BEGIN
    ALTER TABLE dbo.hotel_orders DROP COLUMN external_status;
END;

-- 3. DROP product_id FROM invoice_items
IF COL_LENGTH('dbo.invoice_items', 'product_id') IS NOT NULL
BEGIN
    ALTER TABLE dbo.invoice_items DROP COLUMN product_id;
END;

-- 4. DROP booking_id, guest_id FROM invoices
IF EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'fk_invoices_booking'
      AND parent_object_id = OBJECT_ID('dbo.invoices')
)
BEGIN
    ALTER TABLE dbo.invoices DROP CONSTRAINT fk_invoices_booking;
END;

IF EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'fk_invoices_guest'
      AND parent_object_id = OBJECT_ID('dbo.invoices')
)
BEGIN
    ALTER TABLE dbo.invoices DROP CONSTRAINT fk_invoices_guest;
END;

IF COL_LENGTH('dbo.invoices', 'booking_id') IS NOT NULL
BEGIN
    ALTER TABLE dbo.invoices DROP COLUMN booking_id;
END;

IF COL_LENGTH('dbo.invoices', 'guest_id') IS NOT NULL
BEGIN
    ALTER TABLE dbo.invoices DROP COLUMN guest_id;
END;

-- 5. DROP menu_item_id FROM hotel_order_items
IF COL_LENGTH('dbo.hotel_order_items', 'menu_item_id') IS NOT NULL
BEGIN
    ALTER TABLE dbo.hotel_order_items DROP COLUMN menu_item_id;
END;

