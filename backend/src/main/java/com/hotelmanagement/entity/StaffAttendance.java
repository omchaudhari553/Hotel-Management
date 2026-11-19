package com.hotelmanagement.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.*;

@Entity @Table(name="staff_attendance",uniqueConstraints=@UniqueConstraint(name="uk_attendance_staff_date",columnNames= {
    "staff_id","attendance_date"
}
))@Getter @Setter @NoArgsConstructor
public class StaffAttendance extends BaseEntity {
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="staff_id") private Staff staff;
    @Column(nullable=false) private LocalDate attendanceDate;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private com.hotelmanagement.enums.AttendanceStatus status;
    @Column(length=10) private String checkInTime;
    @Column(length=10) private String checkOutTime;
    @Column(precision=4, scale=2) private java.math.BigDecimal workingHours;
    @Column(length=500) private String remarks;
}
