-- V9: Create notifications table for system alerts and notifications
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_NAME = 'notifications'
)
BEGIN
    CREATE TABLE notifications (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        business_id BIGINT NOT NULL FOREIGN KEY REFERENCES businesses(id),
        branch_id BIGINT NULL FOREIGN KEY REFERENCES branches(id),
        type VARCHAR(40) NOT NULL,
        title VARCHAR(200) NOT NULL,
        message VARCHAR(1000) NOT NULL,
        [read] BIT NOT NULL DEFAULT 0,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END;
