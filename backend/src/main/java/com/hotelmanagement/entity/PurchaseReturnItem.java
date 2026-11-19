package com.hotelmanagement.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "purchase_return_items")
@Getter
@Setter
@NoArgsConstructor
public class PurchaseReturnItem extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "purchase_return_id")
    private PurchaseReturn purchaseReturn;

    @Column(nullable = false)
    private String itemName;

    private String unit;

    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal quantity = BigDecimal.ZERO;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice = BigDecimal.ZERO;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal totalPrice = BigDecimal.ZERO;

    // V3 also has the original NOT NULL `total` column.
    @Column(name = "total", nullable = false, precision = 14, scale = 2)
    private BigDecimal legacyTotal = BigDecimal.ZERO;

    private String reason;
}
