package com.hotelmanagement.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "printer_configurations")
@Getter
@Setter
@NoArgsConstructor
public class PrinterConfiguration extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(name = "printer_type", nullable = false, length = 30)
    private String printerType; // 'BLUETOOTH', 'NETWORK', 'USB', 'SYSTEM'

    @Column(name = "connection_string", length = 255)
    private String connectionString; // MAC address, IP, or USB identifier

    @Column(nullable = false)
    private Integer port = 9100;

    @Column(name = "paper_size", nullable = false, length = 20)
    private String paperSize = "80mm"; // '58mm', '80mm', 'A4'

    @Column(name = "is_default", nullable = false)
    private Boolean isDefault = false;

    @Column(name = "is_kot_default", nullable = false)
    private Boolean isKotDefault = false;

    @Column(name = "is_receipt_default", nullable = false)
    private Boolean isReceiptDefault = false;

    @Column(name = "is_purchase_default", nullable = false)
    private Boolean isPurchaseDefault = false;

    @Column(nullable = false, length = 30)
    private String status = "DISCONNECTED"; // 'CONNECTED', 'DISCONNECTED', 'ONLINE', 'OFFLINE'

    @Column(name = "character_set", length = 30)
    private String characterSet = "PC437_USA";

    @Column(name = "auto_cut", nullable = false)
    private Boolean autoCut = true;

    @Column(name = "open_cash_drawer", nullable = false)
    private Boolean openCashDrawer = false;

    @Column(name = "print_density", nullable = false)
    private Integer printDensity = 0;
}

