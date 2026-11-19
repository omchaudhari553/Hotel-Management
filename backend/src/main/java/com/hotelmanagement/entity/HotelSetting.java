package com.hotelmanagement.entity;
import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name="hotel_settings")
@Getter @Setter @NoArgsConstructor
public class HotelSetting extends BaseEntity {
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="business_id") private Business business;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="branch_id") private Branch branch;
    @Column(nullable=false) private String category,settingKey;
    @Column(columnDefinition="text") private String settingValue;
}
