package com.hotelmanagement.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.*;

@Entity @Table(name="invoice_items")@Getter @Setter @NoArgsConstructor
public class InvoiceItem extends BaseEntity {
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="invoice_id") private Invoice invoice;
    private Long productId;
    @Column(nullable=false) private String description;
    @Column(nullable=false,precision=12,scale=3) private BigDecimal quantity;
    @Column(nullable=false,precision=12,scale=2) private BigDecimal unitPrice;
    @Column(nullable=false,precision=7,scale=3) private BigDecimal taxRate=BigDecimal.ZERO;
    @Column(nullable=false,precision=14,scale=2) private BigDecimal totalPrice=BigDecimal.ZERO;
}
