package com.hotelmanagement.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity @Table(name="hotel_menu_items")@Getter @Setter @NoArgsConstructor
public class MenuItem extends BaseEntity {
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="business_id") private Business business;
    @Column(nullable=false) private String name,category;
    @Column(nullable=false,precision=12,scale=2) private BigDecimal price;
    private String description;
    @Column(nullable=false) private boolean active=true;
}
