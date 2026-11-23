-- ============================================================
-- Migration V21: Align Hotel Modules with Exact 8 Hotel Sidebar Items
-- Removes HOTEL_ROOMS and syncs exact names:
-- 1. Hotel Overview (HOTEL_OVERVIEW)
-- 2. KOT (HOTEL_KOT)
-- 3. Billing / Invoices (HOTEL_BILLING)
-- 4. Tables (HOTEL_TABLES)
-- 5. Payments (HOTEL_PAYMENTS)
-- 6. Purchase (HOTEL_PURCHASE)
-- 7. Staff (HOTEL_STAFF)
-- 8. Settings (HOTEL_SETTINGS)
-- ============================================================

DECLARE @HotelId BIGINT = (SELECT TOP 1 id FROM dbo.saas_products WHERE code = 'HOTEL');
IF @HotelId IS NOT NULL
BEGIN
    -- 1. Permanently remove HOTEL_ROOMS
    DELETE FROM dbo.saas_product_modules WHERE product_id = @HotelId AND code = 'HOTEL_ROOMS';

    -- 2. Align 1: Hotel Overview
    IF EXISTS (SELECT 1 FROM dbo.saas_product_modules WHERE product_id = @HotelId AND (code = 'HOTEL_OVERVIEW' OR code = 'HOTEL_DASHBOARD'))
    BEGIN
        UPDATE dbo.saas_product_modules
        SET code = 'HOTEL_OVERVIEW', name = 'Hotel Overview', is_core = 1, active = 1
        WHERE product_id = @HotelId AND (code = 'HOTEL_OVERVIEW' OR code = 'HOTEL_DASHBOARD');
    END
    ELSE
    BEGIN
        INSERT INTO dbo.saas_product_modules (product_id, code, name, is_core, active)
        VALUES (@HotelId, 'HOTEL_OVERVIEW', 'Hotel Overview', 1, 1);
    END;

    -- 3. Align 2: KOT
    IF EXISTS (SELECT 1 FROM dbo.saas_product_modules WHERE product_id = @HotelId AND code = 'HOTEL_KOT')
    BEGIN
        UPDATE dbo.saas_product_modules
        SET name = 'KOT', is_core = 1, active = 1
        WHERE product_id = @HotelId AND code = 'HOTEL_KOT';
    END
    ELSE
    BEGIN
        INSERT INTO dbo.saas_product_modules (product_id, code, name, is_core, active)
        VALUES (@HotelId, 'HOTEL_KOT', 'KOT', 1, 1);
    END;

    -- 4. Align 3: Billing / Invoices
    IF EXISTS (SELECT 1 FROM dbo.saas_product_modules WHERE product_id = @HotelId AND code = 'HOTEL_BILLING')
    BEGIN
        UPDATE dbo.saas_product_modules
        SET name = 'Billing / Invoices', is_core = 1, active = 1
        WHERE product_id = @HotelId AND code = 'HOTEL_BILLING';
    END
    ELSE
    BEGIN
        INSERT INTO dbo.saas_product_modules (product_id, code, name, is_core, active)
        VALUES (@HotelId, 'HOTEL_BILLING', 'Billing / Invoices', 1, 1);
    END;

    -- 5. Align 4: Tables
    IF EXISTS (SELECT 1 FROM dbo.saas_product_modules WHERE product_id = @HotelId AND code = 'HOTEL_TABLES')
    BEGIN
        UPDATE dbo.saas_product_modules
        SET name = 'Tables', is_core = 1, active = 1
        WHERE product_id = @HotelId AND code = 'HOTEL_TABLES';
    END
    ELSE
    BEGIN
        INSERT INTO dbo.saas_product_modules (product_id, code, name, is_core, active)
        VALUES (@HotelId, 'HOTEL_TABLES', 'Tables', 1, 1);
    END;

    -- 6. Align 5: Payments
    IF EXISTS (SELECT 1 FROM dbo.saas_product_modules WHERE product_id = @HotelId AND code = 'HOTEL_PAYMENTS')
    BEGIN
        UPDATE dbo.saas_product_modules
        SET name = 'Payments', is_core = 1, active = 1
        WHERE product_id = @HotelId AND code = 'HOTEL_PAYMENTS';
    END
    ELSE
    BEGIN
        INSERT INTO dbo.saas_product_modules (product_id, code, name, is_core, active)
        VALUES (@HotelId, 'HOTEL_PAYMENTS', 'Payments', 1, 1);
    END;

    -- 7. Align 6: Purchase
    IF EXISTS (SELECT 1 FROM dbo.saas_product_modules WHERE product_id = @HotelId AND code = 'HOTEL_PURCHASE')
    BEGIN
        UPDATE dbo.saas_product_modules
        SET name = 'Purchase', is_core = 1, active = 1
        WHERE product_id = @HotelId AND code = 'HOTEL_PURCHASE';
    END
    ELSE
    BEGIN
        INSERT INTO dbo.saas_product_modules (product_id, code, name, is_core, active)
        VALUES (@HotelId, 'HOTEL_PURCHASE', 'Purchase', 1, 1);
    END;

    -- 8. Align 7: Staff
    IF EXISTS (SELECT 1 FROM dbo.saas_product_modules WHERE product_id = @HotelId AND code = 'HOTEL_STAFF')
    BEGIN
        UPDATE dbo.saas_product_modules
        SET name = 'Staff', is_core = 0, active = 1
        WHERE product_id = @HotelId AND code = 'HOTEL_STAFF';
    END
    ELSE
    BEGIN
        INSERT INTO dbo.saas_product_modules (product_id, code, name, is_core, active)
        VALUES (@HotelId, 'HOTEL_STAFF', 'Staff', 0, 1);
    END;

    -- 9. Align 8: Settings
    IF EXISTS (SELECT 1 FROM dbo.saas_product_modules WHERE product_id = @HotelId AND (code = 'HOTEL_SETTINGS' OR code = 'HOTEL_REPORTS'))
    BEGIN
        UPDATE dbo.saas_product_modules
        SET code = 'HOTEL_SETTINGS', name = 'Settings', is_core = 0, active = 1
        WHERE product_id = @HotelId AND (code = 'HOTEL_SETTINGS' OR code = 'HOTEL_REPORTS');
    END
    ELSE
    BEGIN
        INSERT INTO dbo.saas_product_modules (product_id, code, name, is_core, active)
        VALUES (@HotelId, 'HOTEL_SETTINGS', 'Settings', 0, 1);
    END;

    -- 10. Delete any unexpected modules for Hotel that don't match the 8
    DELETE FROM dbo.saas_product_modules
    WHERE product_id = @HotelId
      AND code NOT IN ('HOTEL_OVERVIEW', 'HOTEL_DASHBOARD', 'HOTEL_KOT', 'HOTEL_BILLING', 'HOTEL_TABLES', 'HOTEL_PAYMENTS', 'HOTEL_PURCHASE', 'HOTEL_STAFF', 'HOTEL_SETTINGS', 'HOTEL_REPORTS');
END;
