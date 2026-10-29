package com.hotelmanagement.entity;
import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name="suppliers",indexes=@Index(name="idx_supplier_business_name",columnList="business_id,name"))@Getter @Setter @NoArgsConstructor
public class Supplier extends BaseEntity {
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="business_id") private Business business;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="branch_id") private Branch branch;
    @Column(nullable=false) private String name,company,phone;
    private String email,address,gstNumber;
    @Column(nullable=false) private String status="Active";
}
