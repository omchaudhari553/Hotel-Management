package com.hotelmanagement.entity.saas;

import com.hotelmanagement.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "saas_audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaasAuditLog extends BaseEntity {

    @Column(nullable = false, length = 100)
    private String actorUsername;

    @Column(nullable = false, length = 50)
    private String role;

    private Long businessId;

    private Long branchId;

    @Column(nullable = false, length = 100)
    private String action;

    @Column(nullable = false, length = 100)
    private String module;

    @Column(length = 500)
    private String description;

    @Column(length = 50)
    private String ipAddress;
}
