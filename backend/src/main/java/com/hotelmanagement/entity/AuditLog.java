package com.hotelmanagement.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.*;

@Entity @Table(name="audit_logs",indexes=@Index(name="idx_audit_business_time",columnList="business_id,created_at"))@Getter @Setter @NoArgsConstructor
public class AuditLog extends BaseEntity {
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="business_id") private Business business;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="user_id") private User user;
    private String action,module,entityType,entityId,ipAddress;
    @Column(columnDefinition="text") private String oldValue,newValue;
}
