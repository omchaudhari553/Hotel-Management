-- ============================================================
-- Migration V19: Ensure timestamp columns on all Saas tables
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'saas_product_modules' AND COLUMN_NAME = 'updated_at')
    ALTER TABLE dbo.saas_product_modules ADD updated_at DATETIME2(6) NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'saas_payments' AND COLUMN_NAME = 'updated_at')
    ALTER TABLE dbo.saas_payments ADD updated_at DATETIME2(6) NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'saas_support_replies' AND COLUMN_NAME = 'updated_at')
    ALTER TABLE dbo.saas_support_replies ADD updated_at DATETIME2(6) NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'saas_audit_logs' AND COLUMN_NAME = 'updated_at')
    ALTER TABLE dbo.saas_audit_logs ADD updated_at DATETIME2(6) NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'saas_platform_settings' AND COLUMN_NAME = 'created_at')
    ALTER TABLE dbo.saas_platform_settings ADD created_at DATETIME2(6) NOT NULL CONSTRAINT df_saas_setting_created DEFAULT GETDATE();

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'saas_platform_settings' AND COLUMN_NAME = 'updated_at')
    ALTER TABLE dbo.saas_platform_settings ADD updated_at DATETIME2(6) NULL;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'saas_invoices' AND COLUMN_NAME = 'created_at')
    ALTER TABLE dbo.saas_invoices ADD created_at DATETIME2(6) NOT NULL CONSTRAINT df_saas_inv_created DEFAULT GETDATE();

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'saas_invoices' AND COLUMN_NAME = 'updated_at')
    ALTER TABLE dbo.saas_invoices ADD updated_at DATETIME2(6) NULL;
