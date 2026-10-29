package com.hotelmanagement.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.math.BigDecimal;

@Entity
@Table(name = "subscription_plans")
@Getter
@Setter
@NoArgsConstructor
public class SubscriptionPlan extends BaseEntity {

    @Column(name = "plan_code", nullable = false, unique = true, length = 50)
    private String planCode;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "industry_code", nullable = false, length = 30)
    private String industryCode;

    @Column(nullable = false, length = 30)
    private String tier;

    @Column(name = "monthly_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal monthlyPrice;

    @Column(name = "annual_price_per_month", nullable = false, precision = 12, scale = 2)
    private BigDecimal annualPricePerMonth;

    @Column(name = "trial_duration_days", nullable = false)
    private Integer trialDurationDays = 28;

    @Column(name = "features_json", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String featuresJson;

    @Column(length = 500)
    private String description;

    @Column(name = "is_popular", nullable = false)
    private boolean isPopular = false;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;
}
