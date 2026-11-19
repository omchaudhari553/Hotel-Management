package com.hotelmanagement.entity;
import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name="kots",uniqueConstraints=@UniqueConstraint(name="uk_kot_business_number",columnNames= {
    "business_id","kot_number"
}
))@Getter @Setter @NoArgsConstructor
public class Kot extends BaseEntity {
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="business_id") private Business business;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="branch_id") private Branch branch;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="order_id") private HotelOrder order;
    @Column(nullable=false) private String kotNumber;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private com.hotelmanagement.enums.KotStatus status=com.hotelmanagement.enums.KotStatus.SENT_TO_KITCHEN;
    @Column(length=1000) private String instructions;
}
