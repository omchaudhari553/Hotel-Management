package com.hotelmanagement.entity;
import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name="outlets", uniqueConstraints=@UniqueConstraint(name="uk_outlet_branch_code",columnNames= {
    "branch_id","code"
}
))@Getter @Setter @NoArgsConstructor
public class Outlet extends BaseEntity {
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="branch_id") private Branch branch;
    @Column(nullable=false) private String name, code, type, contactPhone;
    @Column(nullable=false) private String status="ACTIVE";
}
