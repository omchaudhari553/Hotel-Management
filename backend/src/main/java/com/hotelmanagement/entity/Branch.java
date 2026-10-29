package com.hotelmanagement.entity;
import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name="branches", uniqueConstraints=@UniqueConstraint(name="uk_branch_business_code",columnNames= {
    "business_id","code"
}
))@Getter @Setter @NoArgsConstructor
public class Branch extends BaseEntity {
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="business_id") private Business business;
    @Column(nullable=false) private String name, code;
    private String managerName, contactPhone, email, operatingHours, address;
    private java.time.LocalDate establishedOn;
    @Column(nullable=false) private String status="ACTIVE";
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="parent_branch_id") private Branch parentBranch;
}
