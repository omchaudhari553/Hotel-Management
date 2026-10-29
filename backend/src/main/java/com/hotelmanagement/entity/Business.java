package com.hotelmanagement.entity;
import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name="businesses", uniqueConstraints=@UniqueConstraint(name="uk_business_code",columnNames="code"))@Getter @Setter @NoArgsConstructor
public class Business extends BaseEntity {
    @Column(nullable=false) private String name;
    @Column(nullable=false,length=50) private String code;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private com.hotelmanagement.enums.IndustryType industryType;
    private String ownerName, contactEmail, phone, address, city, state, currency, taxNumber;
    @Column(nullable=false) private boolean active=true;
}
