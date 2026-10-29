CREATE TABLE goods_receipts (
 id BIGINT IDENTITY(1,1) NOT NULL, business_id BIGINT NOT NULL, branch_id BIGINT, supplier_id BIGINT NOT NULL, purchase_order_id BIGINT NOT NULL,
 grn_number VARCHAR(100) NOT NULL, grn_date DATE NOT NULL, received_by VARCHAR(200), status VARCHAR(30) NOT NULL,
 created_at DATETIME2(6) NOT NULL, updated_at DATETIME2(6) NOT NULL,
 CONSTRAINT pk_goods_receipts PRIMARY KEY (id), CONSTRAINT fk_goods_receipts_business FOREIGN KEY (business_id) REFERENCES businesses(id), CONSTRAINT fk_goods_receipts_branch FOREIGN KEY (branch_id) REFERENCES branches(id), CONSTRAINT fk_goods_receipts_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id), CONSTRAINT fk_goods_receipts_po FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id), CONSTRAINT uk_goods_receipts_business_number UNIQUE (business_id,grn_number)
);
CREATE TABLE goods_receipt_items (
 id BIGINT IDENTITY(1,1) NOT NULL, goods_receipt_id BIGINT NOT NULL, item_name VARCHAR(200) NOT NULL, ordered_qty DECIMAL(12,3) NOT NULL, received_qty DECIMAL(12,3) NOT NULL, accepted_qty DECIMAL(12,3) NOT NULL, rejected_qty DECIMAL(12,3) NOT NULL, unit VARCHAR(50) NOT NULL, batch_no VARCHAR(100), expiry_date DATE, created_at DATETIME2(6) NOT NULL, updated_at DATETIME2(6) NOT NULL,
 CONSTRAINT pk_goods_receipt_items PRIMARY KEY (id), CONSTRAINT fk_goods_receipt_items_receipt FOREIGN KEY (goods_receipt_id) REFERENCES goods_receipts(id)
);
CREATE TABLE purchase_returns (
 id BIGINT IDENTITY(1,1) NOT NULL, business_id BIGINT NOT NULL, supplier_id BIGINT, purchase_invoice_id BIGINT, purchase_order_id BIGINT, return_number VARCHAR(100) NOT NULL, return_date DATE NOT NULL, reason VARCHAR(500), status VARCHAR(30) NOT NULL, total DECIMAL(14,2) NOT NULL, created_at DATETIME2(6) NOT NULL, updated_at DATETIME2(6) NOT NULL,
 CONSTRAINT pk_purchase_returns PRIMARY KEY (id), CONSTRAINT fk_purchase_returns_business FOREIGN KEY (business_id) REFERENCES businesses(id), CONSTRAINT fk_purchase_returns_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id), CONSTRAINT fk_purchase_returns_invoice FOREIGN KEY (purchase_invoice_id) REFERENCES purchase_invoices(id), CONSTRAINT fk_purchase_returns_po FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id), CONSTRAINT uk_purchase_returns_business_number UNIQUE (business_id,return_number)
);
CREATE TABLE purchase_return_items (
 id BIGINT IDENTITY(1,1) NOT NULL, purchase_return_id BIGINT NOT NULL, item_name VARCHAR(200) NOT NULL, quantity DECIMAL(12,3) NOT NULL, unit VARCHAR(50) NOT NULL, unit_price DECIMAL(12,2) NOT NULL, reason VARCHAR(500), total DECIMAL(14,2) NOT NULL, created_at DATETIME2(6) NOT NULL, updated_at DATETIME2(6) NOT NULL,
 CONSTRAINT pk_purchase_return_items PRIMARY KEY (id), CONSTRAINT fk_purchase_return_items_return FOREIGN KEY (purchase_return_id) REFERENCES purchase_returns(id)
);
