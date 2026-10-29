-- V10: Add attendance tracking fields to staff_attendance table
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'staff_attendance' AND COLUMN_NAME = 'check_in_time'
)
BEGIN
    ALTER TABLE staff_attendance ADD check_in_time VARCHAR(10) NULL;
    ALTER TABLE staff_attendance ADD check_out_time VARCHAR(10) NULL;
    ALTER TABLE staff_attendance ADD working_hours DECIMAL(5,2) NULL;
    ALTER TABLE staff_attendance ADD remarks NVARCHAR(500) NULL;
END;
