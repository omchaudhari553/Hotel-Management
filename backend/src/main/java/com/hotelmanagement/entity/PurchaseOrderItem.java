package com.hotelmanagement.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.*;

@Entity @Table(name="purchase_order_items")@Getter @Setter @NoArgsConstructor
public class PurchaseOrderItem extends BaseEntity {
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="purchase_order_id") private PurchaseOrder purchaseOrder;
    @Column(nullable=false) private String itemName,unit;
    @Column(nullable=false,precision=12,scale=3) private BigDecimal quantity;
    @Column(nullable=false,precision=12,scale=2) private BigDecimal unitPrice;
    @Column(nullable=false,precision=7,scale=3) private BigDecimal taxRate=BigDecimal.ZERO;
    @Column(nullable=false,precision=14,scale=2) private BigDecimal total=BigDecimal.ZERO;
}
