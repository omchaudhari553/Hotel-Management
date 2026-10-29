package com.hotelmanagement.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.*;
import java.time.*;

@Entity @Table(name="staff",uniqueConstraints=@UniqueConstraint(name="uk_staff_business_code",columnNames= {
    "business_id","staff_code"
}
))@Getter @Setter @NoArgsConstructor
public class Staff extends BaseEntity {
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="business_id") private Business business;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="branch_id") private Branch branch;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="outlet_id") private Outlet outlet;
    @Column(nullable=false) private String staffCode,name,phone,address,designation;
    private LocalDate joiningDate;
    private String idProofType,idProofNumber;
    @Column(nullable=false,precision=12,scale=2) private BigDecimal basicSalary,allowance=BigDecimal.ZERO,deduction=BigDecimal.ZERO;
    @Column(nullable=false) private String salaryFrequency;
    @Column(nullable=false) private boolean active=true;
}
