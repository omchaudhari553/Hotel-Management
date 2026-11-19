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
        private long secondsRemaining;
        private String serverTimestamp;
        private String displayStatus;
        private String licenseStatus;
        private boolean canOperate;
        private boolean autoRenew;
        private Long lastPaymentId;
        private List<String> features;
        private BigDecimal monthlyPrice;
        private BigDecimal annualPricePerMonth;
        private Integer maxRooms;
        private Integer maxStaff;
        private Integer maxBranches;
        private Integer maxUsers;
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
        private String currency;
        private String billingInterval;
        private Integer billingDuration;
        private String taxConfiguration;
        private Integer maxRooms;
        private Integer maxStaff;
        private Integer maxBranches;
        private Integer maxUsers;
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
        private String billingCycle; // MONTHLY, ANNUAL, 1_YEAR, 3_YEARS, LIFETIME
        private String paymentMethod; // RAZORPAY, UPI, CARD, NETBANKING, QR
        private String orderRef;
        private String platform; // MOBILE_ONLY, DESKTOP_ONLY, MOBILE_DESKTOP
        private String planType; // SOFTWARE_ONLY, SOFTWARE_PRINTER
        private String durationType; // 1_YEAR, 3_YEARS, LIFETIME
        private String hardwareIncluded;
        private BigDecimal customBaseAmount;
        private BigDecimal customTaxAmount;
        private BigDecimal customTotalAmount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderResponse {
        private String orderId;
        private String orderRef;
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
        private String platform;
        private String planType;
        private String durationType;
        private String hardwareIncluded;
        private String proposedValidity;
        private String merchantUpiId;
        private String merchantName;
        private String upiPaymentUri;
        private String supportPhone;
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

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubmitVerificationRequest {
        private String orderId;
        private String orderRef;
        private String utrNumber;
        private String screenshotData;
        private String paymentMethod;
        private String notes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubmitVerificationResponse {
        private boolean success;
        private String message;
        private String orderRef;
        private String verificationStatus;
        private SubscriptionStatusResponse subscription;
        private Map<String, Object> payment;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SuperAdminKpiResponse {
        private long totalHotels;
        private long activeTrials;
        private long activeSubscriptions;
        private long expiredTrials;
        private long expiredSubscriptions;
        private long cancelledSubscriptions;
        private BigDecimal totalRevenue;
        private long pendingPayments;
        private long failedPayments;
        private long expiringSoon;
        private double trialConversionRate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SuperAdminAnalyticsResponse {
        private List<Map<String, Object>> monthlyRevenue;
        private Map<String, Long> statusDistribution;
        private Map<String, Long> planDistribution;
        private double conversionRate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HotelSubscriptionSummaryDto {
        private Long subscriptionId;
        private Long businessId;
        private String businessName;
        private String businessCode;
        private String ownerName;
        private String contactEmail;
        private String phone;
        private String city;
        private int branchCount;
        private Long planId;
        private String planName;
        private String tier;
        private String status;
        private boolean isTrial;
        private String trialStartDate;
        private String trialEndDate;
        private String startDate;
        private String endDate;
        private long daysRemaining;
        private boolean autoRenew;
        private BigDecimal totalPaid;
        private String lastPaymentDate;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PlanSaveRequest {
        private String planCode;
        private String name;
        private String industryCode;
        private String tier;
        private BigDecimal monthlyPrice;
        private BigDecimal annualPricePerMonth;
        private Integer trialDurationDays;
        private List<String> features;
        private String description;
        private Boolean isPopular;
        private Boolean isActive;
        private String currency;
        private String billingInterval;
        private Integer billingDuration;
        private String taxConfiguration;
        private Integer maxRooms;
        private Integer maxStaff;
        private Integer maxBranches;
        private Integer maxUsers;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubscriptionExtendRequest {
        private int days;
        private String reason;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubscriptionHistoryDto {
        private Long id;
        private Long businessId;
        private String businessName;
        private Long subscriptionId;
        private String previousStatus;
        private String newStatus;
        private String action;
        private String description;
        private String performedBy;
        private String createdAt;
    }
}
