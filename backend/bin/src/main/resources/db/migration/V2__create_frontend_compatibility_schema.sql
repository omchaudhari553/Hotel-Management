CREATE TABLE inventory_products (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    business_id BIGINT NOT NULL,
    branch_id BIGINT NULL,
    category NVARCHAR(120) NOT NULL,
    name NVARCHAR(200) NOT NULL,
    sku NVARCHAR(100) NOT NULL,
    unit NVARCHAR(50) NOT NULL,
    purchase_price DECIMAL(14,2) NOT NULL DEFAULT 0,
    selling_price DECIMAL(14,2) NOT NULL DEFAULT 0,
    stock_quantity DECIMAL(14,3) NOT NULL DEFAULT 0,
    min_stock_alert DECIMAL(14,3) NOT NULL DEFAULT 0,
    active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2(6) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(6) NULL,
    CONSTRAINT fk_inventory_product_business FOREIGN KEY (business_id) REFERENCES businesses(id)
);
CREATE UNIQUE INDEX uk_inventory_product_business_sku ON inventory_products(business_id, sku);

CREATE TABLE inventory_movements (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    business_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    movement_type NVARCHAR(50) NOT NULL,
    quantity DECIMAL(14,3) NOT NULL,
    reference_id NVARCHAR(100) NULL,
    notes NVARCHAR(1000) NULL,
    created_at DATETIME2(6) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(6) NULL,
    CONSTRAINT fk_inventory_movement_business FOREIGN KEY (business_id) REFERENCES businesses(id),
    CONSTRAINT fk_inventory_movement_product FOREIGN KEY (product_id) REFERENCES inventory_products(id)
);

CREATE TABLE mess_plans (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    business_id BIGINT NOT NULL,
    plan_name NVARCHAR(150) NOT NULL,
    plan_type NVARCHAR(50) NOT NULL,
    meals_included NVARCHAR(500) NULL,
    price DECIMAL(14,2) NOT NULL DEFAULT 0,
    validity_days INT NOT NULL DEFAULT 30,
    total_meals_count INT NOT NULL DEFAULT 0,
    description NVARCHAR(1000) NULL,
    active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2(6) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(6) NULL,
    CONSTRAINT fk_mess_plan_business FOREIGN KEY (business_id) REFERENCES businesses(id)
);

CREATE TABLE mess_subscriptions (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    business_id BIGINT NOT NULL,
    plan_id BIGINT NULL,
    full_name NVARCHAR(200) NOT NULL,
    phone NVARCHAR(50) NOT NULL,
    email NVARCHAR(200) NULL,
    join_date DATE NOT NULL,
    end_date DATE NULL,
    remaining_meals INT NOT NULL DEFAULT 0,
    tiffin_enabled BIT NOT NULL DEFAULT 0,
    delivery_address NVARCHAR(1000) NULL,
    tiffin_slot NVARCHAR(100) NULL,
    status NVARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME2(6) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(6) NULL,
    CONSTRAINT fk_mess_subscription_business FOREIGN KEY (business_id) REFERENCES businesses(id),
    CONSTRAINT fk_mess_subscription_plan FOREIGN KEY (plan_id) REFERENCES mess_plans(id)
);

CREATE TABLE mess_menu (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    business_id BIGINT NOT NULL,
    day_of_week NVARCHAR(20) NOT NULL,
    meal_time NVARCHAR(30) NOT NULL,
    items_description NVARCHAR(2000) NULL,
    special BIT NOT NULL DEFAULT 0,
    created_at DATETIME2(6) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(6) NULL,
    CONSTRAINT fk_mess_menu_business FOREIGN KEY (business_id) REFERENCES businesses(id)
);

CREATE TABLE mess_attendance (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    business_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    attendance_date DATE NOT NULL,
    meal_time NVARCHAR(30) NOT NULL,
    status NVARCHAR(50) NOT NULL,
    created_at DATETIME2(6) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(6) NULL,
    CONSTRAINT fk_mess_attendance_business FOREIGN KEY (business_id) REFERENCES businesses(id),
    CONSTRAINT fk_mess_attendance_customer FOREIGN KEY (customer_id) REFERENCES mess_subscriptions(id)
);

CREATE TABLE mess_orders (
    id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    business_id BIGINT NOT NULL,
    customer_id BIGINT NULL,
    customer_name NVARCHAR(200) NOT NULL,
    order_type NVARCHAR(50) NOT NULL,
    delivery_status NVARCHAR(50) NOT NULL DEFAULT 'PENDING',
    total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
    delivery_address NVARCHAR(1000) NULL,
    order_date DATETIME2(6) NOT NULL DEFAULT SYSUTCDATETIME(),
    created_at DATETIME2(6) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(6) NULL,
    CONSTRAINT fk_mess_order_business FOREIGN KEY (business_id) REFERENCES businesses(id),
    CONSTRAINT fk_mess_order_customer FOREIGN KEY (customer_id) REFERENCES mess_subscriptions(id)
);
