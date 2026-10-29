package com.hotelmanagement.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.*;
import java.time.*;

@Entity @Table(name="expenses")@Getter @Setter @NoArgsConstructor
public class Expense extends BaseEntity {
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="business_id") private Business business;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="branch_id") private Branch branch;
    @Column(nullable=false) private String name,category;
    @Column(nullable=false,precision=14,scale=2) private BigDecimal amount;
    @Column(nullable=false) private LocalDate expenseDate,paymentDate;
    private String paymentMode,description,branchCode;
}
