package com.hotelmanagement.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "goods_receipts")
@Getter
@Setter
@NoArgsConstructor
public class GoodsReceipt extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_id")
    private Business business;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "supplier_id")
    private Supplier supplier;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_id")
    private PurchaseOrder purchaseOrder;

    @Column(nullable = false)
    private String grnNumber;

    @Column(nullable = false)
    private LocalDate grnDate;

    private String receivedBy;

    @Column(nullable = false)
    private String status = "RECEIVED";

    @Column(precision = 12, scale = 3)
    private BigDecimal totalOrderedQty = BigDecimal.ZERO;

    @Column(precision = 12, scale = 3)
    private BigDecimal totalReceivedQty = BigDecimal.ZERO;

    @Column(precision = 12, scale = 3)
    private BigDecimal totalAcceptedQty = BigDecimal.ZERO;

    @Column(precision = 12, scale = 3)
    private BigDecimal totalRejectedQty = BigDecimal.ZERO;

    private String notes;

    @OneToMany(mappedBy = "goodsReceipt", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<GoodsReceiptItem> items = new ArrayList<>();
}
