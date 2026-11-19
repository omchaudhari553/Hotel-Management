package com.hotelmanagement.entity;

import com.hotelmanagement.enums.BillingCycle;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "subscription_payments")
@Getter
@Setter
@NoArgsConstructor
public class SubscriptionPayment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_id")
    private Business business;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subscription_id")
    private BusinessSubscription subscription;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id")
    private SubscriptionPlan plan;

    @Column(name = "order_id", nullable = false, unique = true, length = 100)
    private String orderId;

    @Column(name = "order_ref", length = 50)
    private String orderRef;

    @Column(name = "utr_number", length = 100)
    private String utrNumber;

    @Lob
    @Column(name = "screenshot_url", columnDefinition = "NVARCHAR(MAX)")
    private String screenshotUrl;

    @Column(length = 50)
    private String platform; // MOBILE_ONLY, DESKTOP_ONLY, MOBILE_DESKTOP

    @Column(name = "plan_type", length = 50)
    private String planType; // SOFTWARE_ONLY, SOFTWARE_PRINTER

    @Column(name = "duration_type", length = 50)
    private String durationType; // 1_YEAR, 3_YEARS, LIFETIME

    @Column(name = "hardware_included", length = 100)
    private String hardwareIncluded;

    @Column(name = "verification_status", length = 50)
    private String verificationStatus; // PENDING_VERIFICATION, VERIFIED, REJECTED

    @Column(name = "payment_id", length = 100)
    private String paymentId;

    @Column(length = 255)
    private String signature;

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_cycle", nullable = false, length = 20)
    private BillingCycle billingCycle;

    @Column(nullable = false, length = 10)
    private String currency = "INR";

    @Column(name = "base_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal baseAmount;

    @Column(name = "tax_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal taxAmount;

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(nullable = false, length = 30)
    private String status = "PENDING"; // PENDING, SUCCESS, FAILED, CANCELLED

    @Column(name = "payment_method", length = 50)
    private String paymentMethod;

    @Column(name = "gateway_name", nullable = false, length = 50)
    private String gatewayName = "RAZORPAY";

    @Column(length = 1000)
    private String notes;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;
}
