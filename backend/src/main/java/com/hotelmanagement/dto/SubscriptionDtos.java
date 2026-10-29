package com.hotelmanagement.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public class SubscriptionDtos {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubscriptionStatusResponse {
        private Long id;
        private Long businessId;
        private Long planId;
        private String planCode;
        private String planName;
        private String industryCode;
        private String tier;
        private String billingCycle;
        private String status;
        private boolean isTrial;
        private boolean isEligibleForTrial;
        private String trialStartDate;
        private String trialEndDate;
        private String startDate;
        private String endDate;
        private long daysRemaining;
        private long hoursRemaining;
        private String displayStatus;
        private String licenseStatus;
        private boolean canOperate;
        private boolean autoRenew;
        private Long lastPaymentId;
        private List<String> features;
        private BigDecimal monthlyPrice;
        private BigDecimal annualPricePerMonth;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PlanDto {
        private Long id;
        private String planCode;
        private String name;
        private String industryCode;
        private String tier;
        private BigDecimal monthlyPrice;
        private BigDecimal annualPricePerMonth;
        private int trialDurationDays;
        private List<String> features;
        private String description;
        private boolean isPopular;
        private boolean isActive;
        private BigDecimal taxRatePercent;
        private BigDecimal monthlyTax;
        private BigDecimal monthlyTotal;
        private BigDecimal annualBase;
        private BigDecimal annualTax;
        private BigDecimal annualTotal;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateOrderRequest {
        private Long planId;
        private String planCode;
        private String billingCycle; // MONTHLY, ANNUAL
        private String paymentMethod; // RAZORPAY, UPI, CARD, NETBANKING
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderResponse {
        private String orderId;
        private Long planId;
        private String planName;
        private String billingCycle;
        private String currency;
        private BigDecimal baseAmount;
        private BigDecimal taxAmount;
        private BigDecimal totalAmount;
        private String keyId;
        private String businessName;
        private String businessEmail;
        private String businessPhone;
        private boolean isTestMode;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VerifyPaymentRequest {
        private String orderId;
        private String paymentId;
        private String signature;
        private String paymentMethod;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VerifyPaymentResponse {
        private boolean success;
        private String message;
        private SubscriptionStatusResponse subscription;
        private Map<String, Object> payment;
    }
}
