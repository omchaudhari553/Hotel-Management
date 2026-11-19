-- ============================================================
-- V12 - CREATE PRINTER CONFIGURATIONS TABLE
-- Microsoft SQL Server 2022
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'printer_configurations')
BEGIN
    CREATE TABLE printer_configurations (
        id BIGINT IDENTITY(1,1) NOT NULL,
        business_id BIGINT NOT NULL,
        branch_id BIGINT NULL,
        name NVARCHAR(150) NOT NULL,
        printer_type VARCHAR(30) NOT NULL, -- 'BLUETOOTH', 'NETWORK', 'USB', 'SYSTEM'
        connection_string NVARCHAR(255) NULL, -- MAC Address, IP Address or USB Device Path
        port INT NOT NULL CONSTRAINT df_printer_configs_port DEFAULT 9100,
        paper_size VARCHAR(20) NOT NULL CONSTRAINT df_printer_configs_paper_size DEFAULT '80mm', -- '58mm', '80mm', 'A4'
        is_default BIT NOT NULL CONSTRAINT df_printer_configs_is_default DEFAULT 0,
        is_kot_default BIT NOT NULL CONSTRAINT df_printer_configs_is_kot_default DEFAULT 0,
        is_receipt_default BIT NOT NULL CONSTRAINT df_printer_configs_is_receipt_default DEFAULT 0,
        is_purchase_default BIT NOT NULL CONSTRAINT df_printer_configs_is_purchase_default DEFAULT 0,
        status VARCHAR(30) NOT NULL CONSTRAINT df_printer_configs_status DEFAULT 'DISCONNECTED',
        model_name NVARCHAR(100) NULL,
        character_set VARCHAR(30) NULL CONSTRAINT df_printer_configs_charset DEFAULT 'PC437_USA',
        auto_cut BIT NOT NULL CONSTRAINT df_printer_configs_auto_cut DEFAULT 1,
        open_cash_drawer BIT NOT NULL CONSTRAINT df_printer_configs_open_cash_drawer DEFAULT 0,
        print_density INT NOT NULL CONSTRAINT df_printer_configs_print_density DEFAULT 0,
        header_lines NVARCHAR(500) NULL,
        footer_lines NVARCHAR(500) NULL,
        created_at DATETIME2(6) NOT NULL,
        updated_at DATETIME2(6) NOT NULL,

        CONSTRAINT pk_printer_configurations PRIMARY KEY (id),
        CONSTRAINT fk_printer_configs_business FOREIGN KEY (business_id) REFERENCES businesses(id),
        CONSTRAINT fk_printer_configs_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
    );

    CREATE INDEX idx_printer_configs_business_branch ON printer_configurations (business_id, branch_id);
    CREATE INDEX idx_printer_configs_type ON printer_configurations (printer_type);
END;

