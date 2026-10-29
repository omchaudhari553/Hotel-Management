package com.hotelmanagement.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.*;
import java.time.*;
import java.util.*;

@Entity @Table(name="invoices",uniqueConstraints=@UniqueConstraint(name="uk_invoice_business_number",columnNames= {
    "business_id","invoice_number"
}
))@Getter @Setter @NoArgsConstructor
public class Invoice extends BaseEntity {
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="business_id") private Business business;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="branch_id") private Branch branch;
    @Column(name="booking_id") private Long bookingId;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="order_id") private HotelOrder order;
    @Column(name="guest_id") private Long guestId;
    @Column(nullable=false) private String invoiceNumber;
    private LocalDate invoiceDate,dueDate;
    @Column(nullable=false,precision=14,scale=2) private BigDecimal subtotal=BigDecimal.ZERO,discountAmount=BigDecimal.ZERO,taxableAmount=BigDecimal.ZERO,cgst=BigDecimal.ZERO,sgst=BigDecimal.ZERO,igst=BigDecimal.ZERO,grandTotal=BigDecimal.ZERO,paidAmount=BigDecimal.ZERO,dueAmount=BigDecimal.ZERO;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private com.hotelmanagement.enums.InvoiceStatus status=com.hotelmanagement.enums.InvoiceStatus.DRAFT;
    private String paymentMethod,notes;
    @OneToMany(mappedBy="invoice",cascade=CascadeType.ALL,orphanRemoval=true) private List<InvoiceItem> items=new ArrayList<>();
}
