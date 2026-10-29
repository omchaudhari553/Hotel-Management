package com.hotelmanagement.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.*;

@Entity @Table(name="hotel_order_items")@Getter @Setter @NoArgsConstructor
public class HotelOrderItem extends BaseEntity {
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="order_id") private HotelOrder order;
    private Long menuItemId;
    @Column(nullable=false) private String name;
    @Column(nullable=false) private Integer quantity;
    @Column(nullable=false,precision=12,scale=2) private BigDecimal unitPrice,totalPrice;
    private String customization;
}
