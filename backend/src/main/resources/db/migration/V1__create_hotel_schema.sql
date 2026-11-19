-- ============================================================
-- V1 - CREATE HOTEL MANAGEMENT SCHEMA
-- Microsoft SQL Server 2022
-- ============================================================


-- ============================================================
-- 1. BUSINESSES
-- ============================================================

CREATE TABLE businesses (
    id BIGINT IDENTITY(1,1) NOT NULL,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) NOT NULL,
    industry_type VARCHAR(20) NOT NULL,
    owner_name VARCHAR(200),
    contact_email VARCHAR(255),
    phone VARCHAR(30),
    address VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(100),
    currency VARCHAR(10),
    tax_number VARCHAR(50),
    active BIT NOT NULL CONSTRAINT df_businesses_active DEFAULT 1,
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,

    CONSTRAINT pk_businesses PRIMARY KEY (id),
    CONSTRAINT uk_businesses_code UNIQUE (code)
);


-- ============================================================
-- 2. BRANCHES
-- ============================================================

CREATE TABLE branches (
    id BIGINT IDENTITY(1,1) NOT NULL,
    business_id BIGINT NOT NULL,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(80) NOT NULL,
    manager_name VARCHAR(200),
    contact_phone VARCHAR(30),
    email VARCHAR(255),
    operating_hours VARCHAR(100),
    address VARCHAR(500),
    established_on DATE,
    status VARCHAR(30) NOT NULL
        CONSTRAINT df_branches_status DEFAULT 'ACTIVE',
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,

    CONSTRAINT pk_branches PRIMARY KEY (id),
    CONSTRAINT fk_branch_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id),
    CONSTRAINT uk_branch_business_code
        UNIQUE (business_id, code)
);


-- ============================================================
-- 3. OUTLETS
-- ============================================================

CREATE TABLE outlets (
    id BIGINT IDENTITY(1,1) NOT NULL,
    branch_id BIGINT NOT NULL,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(80) NOT NULL,
    type VARCHAR(80),
    contact_phone VARCHAR(30),
    status VARCHAR(30) NOT NULL
        CONSTRAINT df_outlets_status DEFAULT 'ACTIVE',
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,

    CONSTRAINT pk_outlets PRIMARY KEY (id),
    CONSTRAINT fk_outlet_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(id),
    CONSTRAINT uk_outlet_branch_code
        UNIQUE (branch_id, code)
);


-- ============================================================
-- 4. USERS
-- ============================================================

CREATE TABLE users (
    id BIGINT IDENTITY(1,1) NOT NULL,
    business_id BIGINT NOT NULL,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(30),
    password_hash VARCHAR(255) NOT NULL,
    active BIT NOT NULL
        CONSTRAINT df_users_active DEFAULT 1,
    role VARCHAR(40) NOT NULL,
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,

    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT uk_users_username UNIQUE (username),
    CONSTRAINT uk_users_email UNIQUE (email),
    CONSTRAINT fk_user_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id)
);


-- ============================================================
-- 5. REFRESH TOKENS
-- ============================================================

CREATE TABLE refresh_tokens (
    id BIGINT IDENTITY(1,1) NOT NULL,
    user_id BIGINT NOT NULL,
    token VARCHAR(120) NOT NULL,
    expires_at DATETIME2(6) NOT NULL,
    revoked BIT NOT NULL
        CONSTRAINT df_refresh_tokens_revoked DEFAULT 0,
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,

    CONSTRAINT pk_refresh_tokens PRIMARY KEY (id),
    CONSTRAINT uk_refresh_tokens_token UNIQUE (token),
    CONSTRAINT fk_refresh_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
);


-- ============================================================
-- 6. ROOMS
-- ============================================================

CREATE TABLE rooms (
    id BIGINT IDENTITY(1,1) NOT NULL,
    business_id BIGINT NOT NULL,
    branch_id BIGINT NOT NULL,
    room_number VARCHAR(50) NOT NULL,
    room_type VARCHAR(100) NOT NULL,
    floor VARCHAR(50) NOT NULL,
    base_price_per_night DECIMAL(12,2) NOT NULL,
    max_occupancy INT NOT NULL,
    status VARCHAR(30) NOT NULL,
    amenities VARCHAR(1000),
    active BIT NOT NULL
        CONSTRAINT df_rooms_active DEFAULT 1,
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,

    CONSTRAINT pk_rooms PRIMARY KEY (id),
    CONSTRAINT fk_rooms_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id),
    CONSTRAINT fk_rooms_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(id),
    CONSTRAINT uk_rooms_branch_number
        UNIQUE (branch_id, room_number)
);


-- ============================================================
-- 7. GUESTS
-- ============================================================

CREATE TABLE guests (
    id BIGINT IDENTITY(1,1) NOT NULL,
    business_id BIGINT NOT NULL,
    branch_id BIGINT,
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(255),
    id_proof_type VARCHAR(80),
    id_proof_number VARCHAR(120),
    address VARCHAR(500),
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,

    CONSTRAINT pk_guests PRIMARY KEY (id),
    CONSTRAINT fk_guests_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id),
    CONSTRAINT fk_guests_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(id)
);


-- ============================================================
-- 8. BOOKINGS
-- ============================================================

CREATE TABLE bookings (
    id BIGINT IDENTITY(1,1) NOT NULL,
    business_id BIGINT NOT NULL,
    branch_id BIGINT NOT NULL,
    room_id BIGINT NOT NULL,
    guest_id BIGINT NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    actual_check_in DATETIME2(6),
    actual_check_out DATETIME2(6),
    total_nights INT NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(30) NOT NULL,
    notes VARCHAR(1000),
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,

    CONSTRAINT pk_bookings PRIMARY KEY (id),
    CONSTRAINT fk_bookings_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id),
    CONSTRAINT fk_bookings_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(id),
    CONSTRAINT fk_bookings_room
        FOREIGN KEY (room_id)
        REFERENCES rooms(id),
    CONSTRAINT fk_bookings_guest
        FOREIGN KEY (guest_id)
        REFERENCES guests(id)
);


-- ============================================================
-- 9. BOOKING SERVICES
-- ============================================================

CREATE TABLE booking_services (
    id BIGINT IDENTITY(1,1) NOT NULL,
    booking_id BIGINT NOT NULL,
    service_name VARCHAR(200) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    service_time DATETIME2(6),
    status VARCHAR(40),
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,

    CONSTRAINT pk_booking_services PRIMARY KEY (id),
    CONSTRAINT fk_booking_services_booking
        FOREIGN KEY (booking_id)
        REFERENCES bookings(id)
);


-- ============================================================
-- 10. HOTEL TABLES
-- ============================================================

CREATE TABLE hotel_tables (
    id BIGINT IDENTITY(1,1) NOT NULL,
    business_id BIGINT NOT NULL,
    branch_id BIGINT NOT NULL,
    name VARCHAR(80) NOT NULL,
    capacity INT NOT NULL,
    area VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL,
    guest VARCHAR(200),
    guest_count INT,
    note VARCHAR(500),
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,

    CONSTRAINT pk_hotel_tables PRIMARY KEY (id),
    CONSTRAINT fk_hotel_tables_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id),
    CONSTRAINT fk_hotel_tables_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(id),
    CONSTRAINT uk_hotel_tables_branch_name
        UNIQUE (branch_id, name)
);


-- ============================================================
-- 11. HOTEL MENU ITEMS
-- ============================================================

CREATE TABLE hotel_menu_items (
    id BIGINT IDENTITY(1,1) NOT NULL,
    business_id BIGINT NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    description VARCHAR(1000),
    active BIT NOT NULL
        CONSTRAINT df_hotel_menu_items_active DEFAULT 1,
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,

    CONSTRAINT pk_hotel_menu_items PRIMARY KEY (id),
    CONSTRAINT fk_hotel_menu_items_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id)
);


-- ============================================================
-- 12. HOTEL ORDERS
-- ============================================================

CREATE TABLE hotel_orders (
    id BIGINT IDENTITY(1,1) NOT NULL,
    business_id BIGINT NOT NULL,
    branch_id BIGINT NOT NULL,
    table_id BIGINT,
    booking_id BIGINT,
    order_number VARCHAR(80) NOT NULL,
    guest_name VARCHAR(200) NOT NULL,
    guest_count INT,
    status VARCHAR(30) NOT NULL,
    discount DECIMAL(12,2) NOT NULL,
    tax_rate DECIMAL(12,2) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    sent_to_kitchen BIT NOT NULL
        CONSTRAINT df_hotel_orders_sent_to_kitchen DEFAULT 0,
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,

    CONSTRAINT pk_hotel_orders PRIMARY KEY (id),
    CONSTRAINT fk_hotel_orders_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id),
    CONSTRAINT fk_hotel_orders_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(id),
    CONSTRAINT fk_hotel_orders_table
        FOREIGN KEY (table_id)
        REFERENCES hotel_tables(id),
    CONSTRAINT fk_hotel_orders_booking
        FOREIGN KEY (booking_id)
        REFERENCES bookings(id),
    CONSTRAINT uk_hotel_orders_business_number
        UNIQUE (business_id, order_number)
);


-- ============================================================
-- 13. HOTEL ORDER ITEMS
-- ============================================================

CREATE TABLE hotel_order_items (
    id BIGINT IDENTITY(1,1) NOT NULL,
    order_id BIGINT NOT NULL,
    menu_item_id BIGINT,
    name VARCHAR(200) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    customization VARCHAR(500),
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,

    CONSTRAINT pk_hotel_order_items PRIMARY KEY (id),
    CONSTRAINT fk_hotel_order_items_order
        FOREIGN KEY (order_id)
        REFERENCES hotel_orders(id)
);


-- ============================================================
-- 14. KOTS
-- ============================================================

CREATE TABLE kots (
    id BIGINT IDENTITY(1,1) NOT NULL,
    business_id BIGINT NOT NULL,
    branch_id BIGINT NOT NULL,
    order_id BIGINT,
    kot_number VARCHAR(80) NOT NULL,
    status VARCHAR(30) NOT NULL,
    instructions VARCHAR(1000),
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,

    CONSTRAINT pk_kots PRIMARY KEY (id),
    CONSTRAINT fk_kots_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id),
    CONSTRAINT fk_kots_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(id),
    CONSTRAINT fk_kots_order
        FOREIGN KEY (order_id)
        REFERENCES hotel_orders(id),
    CONSTRAINT uk_kots_business_number
        UNIQUE (business_id, kot_number)
);


-- ============================================================
-- 15. STAFF
-- ============================================================

CREATE TABLE staff (
    id BIGINT IDENTITY(1,1) NOT NULL,
    business_id BIGINT NOT NULL,
    branch_id BIGINT,
    outlet_id BIGINT,
    staff_code VARCHAR(80) NOT NULL,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    address VARCHAR(500) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    joining_date DATE,
    id_proof_type VARCHAR(80),
    id_proof_number VARCHAR(120),
    basic_salary DECIMAL(12,2) NOT NULL,
    salary_frequency VARCHAR(30) NOT NULL,
    allowance DECIMAL(12,2) NOT NULL,
    deduction DECIMAL(12,2) NOT NULL,
    active BIT NOT NULL
        CONSTRAINT df_staff_active DEFAULT 1,
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,

    CONSTRAINT pk_staff PRIMARY KEY (id),
    CONSTRAINT fk_staff_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id),
    CONSTRAINT fk_staff_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(id),
    CONSTRAINT fk_staff_outlet
        FOREIGN KEY (outlet_id)
        REFERENCES outlets(id),
    CONSTRAINT uk_staff_business_code
        UNIQUE (business_id, staff_code)
);


-- ============================================================
-- 16. STAFF ATTENDANCE
-- ============================================================

CREATE TABLE staff_attendance (
    id BIGINT IDENTITY(1,1) NOT NULL,
    staff_id BIGINT NOT NULL,
    attendance_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL,
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,

    CONSTRAINT pk_staff_attendance PRIMARY KEY (id),
    CONSTRAINT fk_staff_attendance_staff
        FOREIGN KEY (staff_id)
        REFERENCES staff(id),
    CONSTRAINT uk_staff_attendance_date
        UNIQUE (staff_id, attendance_date)
);


-- ============================================================
-- 17. INVOICES
-- ============================================================

CREATE TABLE invoices (
    id BIGINT IDENTITY(1,1) NOT NULL,
    business_id BIGINT NOT NULL,
    branch_id BIGINT,
    booking_id BIGINT,
    order_id BIGINT,
    guest_id BIGINT,
    invoice_number VARCHAR(80) NOT NULL,
    invoice_date DATE,
    due_date DATE,
    subtotal DECIMAL(14,2) NOT NULL,
    discount_amount DECIMAL(14,2) NOT NULL,
    taxable_amount DECIMAL(14,2) NOT NULL,
    cgst DECIMAL(14,2) NOT NULL,
    sgst DECIMAL(14,2) NOT NULL,
    igst DECIMAL(14,2) NOT NULL,
    grand_total DECIMAL(14,2) NOT NULL,
    paid_amount DECIMAL(14,2) NOT NULL,
    due_amount DECIMAL(14,2) NOT NULL,
    status VARCHAR(30) NOT NULL,
    payment_method VARCHAR(40),
    notes VARCHAR(1000),
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,

    CONSTRAINT pk_invoices PRIMARY KEY (id),
    CONSTRAINT fk_invoices_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id),
    CONSTRAINT fk_invoices_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(id),
    CONSTRAINT fk_invoices_booking
        FOREIGN KEY (booking_id)
        REFERENCES bookings(id),
    CONSTRAINT fk_invoices_order
        FOREIGN KEY (order_id)
        REFERENCES hotel_orders(id),
    CONSTRAINT fk_invoices_guest
        FOREIGN KEY (guest_id)
        REFERENCES guests(id),
    CONSTRAINT uk_invoices_business_number
        UNIQUE (business_id, invoice_number)
);


-- ============================================================
-- 18. INVOICE ITEMS
-- ============================================================

CREATE TABLE invoice_items (
    id BIGINT IDENTITY(1,1) NOT NULL,
    invoice_id BIGINT NOT NULL,
    product_id BIGINT,
    description VARCHAR(500) NOT NULL,
    quantity DECIMAL(12,3) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    tax_rate DECIMAL(7,3) NOT NULL,
    total_price DECIMAL(14,2) NOT NULL,
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,

    CONSTRAINT pk_invoice_items PRIMARY KEY (id),
    CONSTRAINT fk_invoice_items_invoice
        FOREIGN KEY (invoice_id)
        REFERENCES invoices(id)
);


-- ============================================================
-- 19. PAYMENTS
-- ============================================================

CREATE TABLE payments (
    id BIGINT IDENTITY(1,1) NOT NULL,
    business_id BIGINT NOT NULL,
    branch_id BIGINT,
    invoice_id BIGINT,
    amount DECIMAL(14,2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    transaction_ref VARCHAR(150),
    payment_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL,
    notes VARCHAR(500),
    created_by BIGINT,
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,

    CONSTRAINT pk_payments PRIMARY KEY (id),
    CONSTRAINT fk_payments_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id),
    CONSTRAINT fk_payments_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(id),
    CONSTRAINT fk_payments_invoice
        FOREIGN KEY (invoice_id)
        REFERENCES invoices(id),
    CONSTRAINT fk_payments_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id)
);


-- ============================================================
-- 20. SUPPLIERS
-- ============================================================

CREATE TABLE suppliers (
    id BIGINT IDENTITY(1,1) NOT NULL,
    business_id BIGINT NOT NULL,
    branch_id BIGINT,
    name VARCHAR(200) NOT NULL,
    company VARCHAR(200) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(255),
    address VARCHAR(500),
    gst_number VARCHAR(50),
    status VARCHAR(30) NOT NULL,
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,

    CONSTRAINT pk_suppliers PRIMARY KEY (id),
    CONSTRAINT fk_suppliers_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id),
    CONSTRAINT fk_suppliers_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(id)
);


-- ============================================================
-- 21. PURCHASE ORDERS
-- ============================================================

CREATE TABLE purchase_orders (
    id BIGINT IDENTITY(1,1) NOT NULL,
    business_id BIGINT NOT NULL,
    branch_id BIGINT,
    supplier_id BIGINT NOT NULL,
    po_number VARCHAR(80) NOT NULL,
    po_date DATE,
    expected_delivery_date DATE,
    status VARCHAR(30) NOT NULL,
    total DECIMAL(14,2) NOT NULL,
    notes VARCHAR(1000),
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,

    CONSTRAINT pk_purchase_orders PRIMARY KEY (id),
    CONSTRAINT fk_purchase_orders_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id),
    CONSTRAINT fk_purchase_orders_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(id),
    CONSTRAINT fk_purchase_orders_supplier
        FOREIGN KEY (supplier_id)
        REFERENCES suppliers(id),
    CONSTRAINT uk_purchase_orders_business_number
        UNIQUE (business_id, po_number)
);


-- ============================================================
-- 22. PURCHASE ORDER ITEMS
-- ============================================================

CREATE TABLE purchase_order_items (
    id BIGINT IDENTITY(1,1) NOT NULL,
    purchase_order_id BIGINT NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    quantity DECIMAL(12,3) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    tax_rate DECIMAL(7,3) NOT NULL,
    total DECIMAL(14,2) NOT NULL,
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,

    CONSTRAINT pk_purchase_order_items PRIMARY KEY (id),
    CONSTRAINT fk_purchase_order_items_order
        FOREIGN KEY (purchase_order_id)
        REFERENCES purchase_orders(id)
);


-- ============================================================
-- 23. PURCHASE INVOICES
-- ============================================================

CREATE TABLE purchase_invoices (
    id BIGINT IDENTITY(1,1) NOT NULL,
    business_id BIGINT NOT NULL,
    supplier_id BIGINT NOT NULL,
    purchase_order_id BIGINT,
    invoice_number VARCHAR(100) NOT NULL,
    invoice_date DATE,
    due_date DATE,
    total DECIMAL(14,2) NOT NULL,
    paid_amount DECIMAL(14,2) NOT NULL,
    due_amount DECIMAL(14,2) NOT NULL,
    payment_status VARCHAR(30) NOT NULL,
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,

    CONSTRAINT pk_purchase_invoices PRIMARY KEY (id),
    CONSTRAINT fk_purchase_invoices_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id),
    CONSTRAINT fk_purchase_invoices_supplier
        FOREIGN KEY (supplier_id)
        REFERENCES suppliers(id),
    CONSTRAINT fk_purchase_invoices_order
        FOREIGN KEY (purchase_order_id)
        REFERENCES purchase_orders(id)
);


-- ============================================================
-- 24. SUPPLIER PAYMENTS
-- ============================================================

CREATE TABLE supplier_payments (
    id BIGINT IDENTITY(1,1) NOT NULL,
    business_id BIGINT NOT NULL,
    supplier_id BIGINT NOT NULL,
    purchase_invoice_id BIGINT NOT NULL,
    amount DECIMAL(14,2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    transaction_reference VARCHAR(150),
    payment_date DATE NOT NULL,
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,

    CONSTRAINT pk_supplier_payments PRIMARY KEY (id),
    CONSTRAINT fk_supplier_payments_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id),
    CONSTRAINT fk_supplier_payments_supplier
        FOREIGN KEY (supplier_id)
        REFERENCES suppliers(id),
    CONSTRAINT fk_supplier_payments_invoice
        FOREIGN KEY (purchase_invoice_id)
        REFERENCES purchase_invoices(id)
);


-- ============================================================
-- 25. DELIVERY ORDERS
-- ============================================================

CREATE TABLE delivery_orders (
    id BIGINT IDENTITY(1,1) NOT NULL,
    business_id BIGINT NOT NULL,
    branch_id BIGINT,
    order_id BIGINT,
    assigned_staff_id BIGINT,
    delivery_number VARCHAR(80) NOT NULL,
    customer_name VARCHAR(200) NOT NULL,
    customer_phone VARCHAR(30) NOT NULL,
    address VARCHAR(1000),
    instructions VARCHAR(1000),
    status VARCHAR(40) NOT NULL,
    delivery_charge DECIMAL(12,2) NOT NULL,
    payment_status VARCHAR(40),
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,

    CONSTRAINT pk_delivery_orders PRIMARY KEY (id),
    CONSTRAINT fk_delivery_orders_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id),
    CONSTRAINT fk_delivery_orders_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(id),
    CONSTRAINT fk_delivery_orders_order
        FOREIGN KEY (order_id)
        REFERENCES hotel_orders(id),
    CONSTRAINT fk_delivery_orders_staff
        FOREIGN KEY (assigned_staff_id)
        REFERENCES staff(id),
    CONSTRAINT uk_delivery_orders_business_number
        UNIQUE (business_id, delivery_number)
);


-- ============================================================
-- 26. HOTEL SETTINGS
-- ============================================================

CREATE TABLE hotel_settings (
    id BIGINT IDENTITY(1,1) NOT NULL,
    business_id BIGINT NOT NULL,
    category VARCHAR(100) NOT NULL,
    setting_key VARCHAR(150) NOT NULL,
    setting_value NVARCHAR(MAX),
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,

    CONSTRAINT pk_hotel_settings PRIMARY KEY (id),
    CONSTRAINT fk_hotel_settings_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id),
    CONSTRAINT uk_hotel_settings_business_key
        UNIQUE (business_id, category, setting_key)
);


-- ============================================================
-- 27. EXPENSES
-- ============================================================

CREATE TABLE expenses (
    id BIGINT IDENTITY(1,1) NOT NULL,
    business_id BIGINT NOT NULL,
    branch_id BIGINT,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(14,2) NOT NULL,
    expense_date DATE NOT NULL,
    payment_date DATE NOT NULL,
    payment_mode VARCHAR(50),
    description VARCHAR(1000),
    branch_code VARCHAR(80),
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,

    CONSTRAINT pk_expenses PRIMARY KEY (id),
    CONSTRAINT fk_expenses_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id),
    CONSTRAINT fk_expenses_branch
        FOREIGN KEY (branch_id)
        REFERENCES branches(id)
);


-- ============================================================
-- 28. AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
    id BIGINT IDENTITY(1,1) NOT NULL,
    business_id BIGINT NOT NULL,
    user_id BIGINT,
    action VARCHAR(100),
    module VARCHAR(100),
    entity_type VARCHAR(100),
    entity_id VARCHAR(100),
    ip_address VARCHAR(80),
    old_value NVARCHAR(MAX),
    new_value NVARCHAR(MAX),
    created_at DATETIME2(6) NOT NULL,
    updated_at DATETIME2(6) NOT NULL,

    CONSTRAINT pk_audit_logs PRIMARY KEY (id),
    CONSTRAINT fk_audit_logs_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id),
    CONSTRAINT fk_audit_logs_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
);


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_refresh_token
    ON refresh_tokens(token);

CREATE INDEX idx_room_business
    ON rooms(business_id);

CREATE INDEX idx_guest_business_phone
    ON guests(business_id, phone);

CREATE INDEX idx_booking_room_dates
    ON bookings(room_id, check_in_date, check_out_date);

CREATE INDEX idx_audit_business_time
    ON audit_logs(business_id, created_at);


-- ============================================================
-- FILTERED UNIQUE INDEX
-- SQL Server allows only one NULL in a normal unique
-- constraint, so use a filtered index for nullable transaction_ref.
-- ============================================================

CREATE UNIQUE INDEX ux_payments_transaction_ref
    ON payments(transaction_ref)
    WHERE transaction_ref IS NOT NULL;


-- ============================================================
-- END OF V1
-- ============================================================