package com.hotelmanagement.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.*;
import java.time.*;
import java.util.*;

@Entity @Table(name="purchase_orders",uniqueConstraints=@UniqueConstraint(name="uk_po_business_number",columnNames= {
    "business_id","po_number"
}
))@Getter @Setter @NoArgsConstructor
public class PurchaseOrder extends BaseEntity {
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="business_id") private Business business;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="branch_id") private Branch branch;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="supplier_id") private Supplier supplier;
    @Column(nullable=false) private String poNumber;
    private LocalDate poDate,expectedDeliveryDate;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private com.hotelmanagement.enums.PurchaseStatus status=com.hotelmanagement.enums.PurchaseStatus.DRAFT;
    @Column(nullable=false,precision=14,scale=2) private BigDecimal total=BigDecimal.ZERO;
    private String notes;
    @OneToMany(mappedBy="purchaseOrder",cascade=CascadeType.ALL,orphanRemoval=true) private List<PurchaseOrderItem> items=new ArrayList<>();
}
