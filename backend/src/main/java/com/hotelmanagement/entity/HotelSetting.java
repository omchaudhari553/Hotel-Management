package com.hotelmanagement.entity;
import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name="hotel_settings",uniqueConstraints=@UniqueConstraint(name="uk_settings_business_category_key",columnNames= {
    "business_id","category","setting_key"
}
))@Getter @Setter @NoArgsConstructor
public class HotelSetting extends BaseEntity {
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="business_id") private Business business;
    @Column(nullable=false) private String category,settingKey;
    @Column(columnDefinition="text") private String settingValue;
}
