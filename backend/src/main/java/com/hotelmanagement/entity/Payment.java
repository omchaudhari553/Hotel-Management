package com.hotelmanagement.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.*;
import java.time.*;

@Entity @Table(name="payments",indexes=@Index(name="idx_payment_business_date",columnList="business_id,payment_date"))@Getter @Setter @NoArgsConstructor
public class Payment extends BaseEntity {
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="business_id") private Business business;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="branch_id") private Branch branch;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="invoice_id") private Invoice invoice;
    @Column(nullable=false,precision=14,scale=2) private BigDecimal amount;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private com.hotelmanagement.enums.PaymentMethod paymentMethod;
    @Column(unique=true) private String transactionRef;
    @Column(nullable=false) private LocalDate paymentDate;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private com.hotelmanagement.enums.PaymentStatus status;
    private String notes;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="created_by") private User createdBy;
}
