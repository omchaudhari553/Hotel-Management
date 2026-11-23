package com.hotelmanagement.entity.saas;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hotelmanagement.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "saas_subscription_plans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class SaasSubscriptionPlan extends BaseEntity {

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private SaasProduct product;

    @Column(nullable = false, unique = true, length = 80)
    private String code;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 50)
    private String planType; // 'TRIAL', 'YEARLY', 'THREE_YEAR', 'LIFETIME'

    @Column(nullable = false)
    @Builder.Default
    private int billingIntervalMonths = 12;

    @Column(nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal basePrice = BigDecimal.ZERO;

    @Column(nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal gstRate = new BigDecimal("18.00");

    @Column(nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal finalPrice = BigDecimal.ZERO;

    @Column(nullable = false)
    @Builder.Default
    private int maxBranches = 1;

    @Column(nullable = false)
    @Builder.Default
    private int maxUsers = 10;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;
}
