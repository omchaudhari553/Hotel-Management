package com.hotelmanagement.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.*;
import java.time.*;

@Entity @Table(name="supplier_payments")@Getter @Setter @NoArgsConstructor
public class SupplierPayment extends BaseEntity {
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="business_id") private Business business;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="supplier_id") private Supplier supplier;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="purchase_invoice_id") private PurchaseInvoice purchaseInvoice;
    @Column(nullable=false,precision=14,scale=2) private BigDecimal amount;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private com.hotelmanagement.enums.PaymentMethod paymentMethod;
    private String transactionReference;
    @Column(nullable=false) private LocalDate paymentDate;
}
