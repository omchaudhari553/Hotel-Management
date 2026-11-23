package com.hotelmanagement.entity.saas;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hotelmanagement.entity.BaseEntity;
import com.hotelmanagement.entity.Branch;
import com.hotelmanagement.entity.Business;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "saas_payments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class SaasPayment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subscription_id")
    private SaasSubscription subscription;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal gstAmount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal totalAmount;

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String currency = "INR";

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String paymentGateway = "MANUAL"; // 'RAZORPAY', 'MANUAL', 'UPI'

    @Column(length = 150)
    private String gatewayOrderId;

    @Column(length = 150)
    private String gatewayPaymentId;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String status = "SUCCESS"; // 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'

    @Column(length = 50)
    private String paymentMethod; // 'UPI', 'CARD', 'NETBANKING', 'CASH', 'TRANSFER'

    @Column(length = 500)
    private String notes;
}
