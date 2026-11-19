package com.hotelmanagement.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.*;
import java.util.*;

@Entity @Table(name="hotel_orders")@Getter @Setter @NoArgsConstructor
public class HotelOrder extends BaseEntity {
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="business_id") private Business business;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="branch_id") private Branch branch;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="table_id") private HotelTable table;
    @Column(nullable=false) private String orderNumber,guestName;
    @Column(length=40) private String orderSource="INTERNAL";
    private Integer guestCount;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private com.hotelmanagement.enums.OrderStatus status=com.hotelmanagement.enums.OrderStatus.OPEN;
    @Column(nullable=false,precision=12,scale=2) private BigDecimal discount=BigDecimal.ZERO,taxRate=BigDecimal.ZERO,totalAmount=BigDecimal.ZERO;
    @Column(nullable=false) private boolean sentToKitchen=false;
    @OneToMany(mappedBy="order",cascade=CascadeType.ALL,orphanRemoval=true) private List<HotelOrderItem> items=new ArrayList<>();
}
