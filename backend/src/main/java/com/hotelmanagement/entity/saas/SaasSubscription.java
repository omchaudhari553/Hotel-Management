package com.hotelmanagement.entity.saas;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hotelmanagement.entity.BaseEntity;
import com.hotelmanagement.entity.Branch;
import com.hotelmanagement.entity.Business;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "saas_subscriptions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class SaasSubscription extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private SaasProduct product;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    private SaasSubscriptionPlan plan;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String status = "ACTIVE"; // 'TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED'

    @Column(nullable = false)
    private LocalDateTime startDate;

    private LocalDateTime endDate;

    private LocalDateTime trialStartAt;

    private LocalDateTime trialEndAt;

    @Column(nullable = false)
    @Builder.Default
    private boolean isLifetime = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean autoRenew = false;

    @Column(length = 500)
    private String notes;

    public boolean isActive() {
        if ("ACTIVE".equalsIgnoreCase(status)) {
            if (isLifetime) return true;
            return endDate == null || endDate.isAfter(LocalDateTime.now());
        }
        if ("TRIAL".equalsIgnoreCase(status)) {
            return trialEndAt == null || trialEndAt.isAfter(LocalDateTime.now());
        }
        return false;
    }
}
