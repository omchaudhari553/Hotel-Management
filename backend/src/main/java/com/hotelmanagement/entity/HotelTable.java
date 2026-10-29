package com.hotelmanagement.entity;
import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name="hotel_tables", uniqueConstraints=@UniqueConstraint(name="uk_table_branch_name",columnNames= {
    "branch_id","name"
}
))@Getter @Setter @NoArgsConstructor
public class HotelTable extends BaseEntity {
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="business_id") private Business business;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="branch_id") private Branch branch;
    @Column(nullable=false) private String name,area;
    @Column(nullable=false) private Integer capacity;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private com.hotelmanagement.enums.TableStatus status=com.hotelmanagement.enums.TableStatus.AVAILABLE;
    private String guest;
    private Integer guestCount;
    private String note;
}
