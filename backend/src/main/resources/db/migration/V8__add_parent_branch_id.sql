-- V8: Add parent_branch_id to branches table for multi-branch hierarchy support
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'branches' AND COLUMN_NAME = 'parent_branch_id'
)
BEGIN
    ALTER TABLE branches ADD parent_branch_id BIGINT NULL;
    ALTER TABLE branches ADD CONSTRAINT fk_branch_parent FOREIGN KEY (parent_branch_id) REFERENCES branches(id);
END;
