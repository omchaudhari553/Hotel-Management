package com.hotelmanagement.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class SuperAdminDtos {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class DashboardKpis {
        private long totalBusinesses;
        private long totalHotelBusinesses;
        private long totalMessBusinesses;
        private long totalCafeBusinesses;
        private long totalBranches;
        private long activeBusinesses;
        private long inactiveBusinesses;
        private long suspendedBusinesses;
        private long activeSubscriptions;
        private long trialSubscriptions;
        private long expiredSubscriptions;
        private long lifetimeSubscriptions;
        private BigDecimal totalRevenue;
        private BigDecimal monthlyRevenue;
        private BigDecimal yearlyRevenue;
        private long pendingPayments;
        private long failedPayments;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RevenueChartPoint {
        private String month;
        private BigDecimal hotelRevenue;
        private BigDecimal messRevenue;
        private BigDecimal cafeRevenue;
        private BigDecimal totalRevenue;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ProductDistributionPoint {
        private String product;
        private long count;
        private BigDecimal revenue;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class BusinessSummaryDto {
        private Long id;
        private String name;
        private String code;
        private String ownerName;
        private String email;
        private String phone;
        private String city;
        private String state;
        private String businessType;
        private String accountType; // 'SINGLE' or 'MULTI_BRANCH'
        private List<String> products;
        private int branchCount;
        private String status; // 'ACTIVE', 'INACTIVE', 'SUSPENDED'
        private LocalDateTime createdAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class BusinessDetailDto {
        private Long id;
        private String name;
        private String code;
        private String ownerName;
        private String email;
        private String phone;
        private String address;
        private String city;
        private String state;
        private String country;
        private String pinCode;
        private String gstin;
        private String businessType;
        private String accountType; // 'SINGLE' or 'MULTI_BRANCH'
        private String status;
        private LocalDateTime createdAt;
        private List<BranchSummaryDto> branches;
        private List<SubscriptionItemDto> subscriptions;
        private List<PaymentItemDto> payments;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class BusinessSaveRequest {
        private String name;
        private String ownerName;
        private String email;
        private String phone;
        private String address;
        private String city;
        private String state;
        private String country;
        private String pinCode;
        private String gstin;
        private String businessType; // 'HOTEL', 'MESS', 'CAFE', 'HOTEL_MESS', 'HOTEL_CAFE', 'ALL'
        private String accountType; // 'SINGLE' or 'MULTI_BRANCH'
        private List<String> products;
        private String username;
        private String password;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class BranchSummaryDto {
        private Long id;
        private Long businessId;
        private String businessName;
        private String name;
        private String code;
        private String managerName;
        private String contactPhone;
        private String email;
        private String city;
        private String state;
        private String status;
        private LocalDateTime createdAt;
        private BigDecimal totalSales;
        private int totalInvoices;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class BranchSaveRequest {
        private Long businessId;
        private String name;
        private String code;
        private String managerName;
        private String contactPhone;
        private String email;
        private String address;
        private String city;
        private String state;
        private String status;
        private String username;
        private String password;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ProductItemDto {
        private Long id;
        private String code;
        private String name;
        private String description;
        private String icon;
        private boolean active;
        private int moduleCount;
        private int planCount;
        private long activeSubscribers;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ProductModuleDto {
        private Long id;
        private Long productId;
        private String productCode;
        private String code;
        private String name;
        private String description;
        private boolean isCore;
        private boolean active;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SubscriptionPlanDto {
        private Long id;
        private Long productId;
        private String productCode;
        private String productName;
        private String code;
        private String name;
        private String planType; // 'TRIAL', 'YEARLY', 'THREE_YEAR', 'LIFETIME'
        private int billingIntervalMonths;
        private BigDecimal basePrice;
        private BigDecimal gstRate;
        private BigDecimal discountAmount;
        private BigDecimal finalPrice;
        private int maxBranches;
        private int maxUsers;
        private String description;
        private boolean active;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SubscriptionItemDto {
        private Long id;
        private Long businessId;
        private String businessName;
        private Long branchId;
        private String branchName;
        private Long productId;
        private String productCode;
        private String productName;
        private Long planId;
        private String planName;
        private String planType;
        private String status; // 'TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED'
        private LocalDateTime startDate;
        private LocalDateTime endDate;
        private LocalDateTime trialStartAt;
        private LocalDateTime trialEndAt;
        private boolean isLifetime;
        private boolean autoRenew;
        private boolean active;
        private String notes;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SubscriptionSaveRequest {
        private Long businessId;
        private Long branchId;
        private Long productId;
        private Long planId;
        private String status;
        private int durationMonths;
        private boolean isLifetime;
        private String notes;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PaymentItemDto {
        private Long id;
        private Long subscriptionId;
        private Long businessId;
        private String businessName;
        private Long branchId;
        private String branchName;
        private BigDecimal amount;
        private BigDecimal gstAmount;
        private BigDecimal totalAmount;
        private String currency;
        private String paymentGateway;
        private String gatewayPaymentId;
        private String status;
        private String paymentMethod;
        private LocalDateTime createdAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class InvoiceItemDto {
        private Long id;
        private String invoiceNumber;
        private Long businessId;
        private String businessName;
        private Long branchId;
        private String branchName;
        private BigDecimal baseAmount;
        private BigDecimal cgstAmount;
        private BigDecimal sgstAmount;
        private BigDecimal igstAmount;
        private BigDecimal totalAmount;
        private String status;
        private LocalDateTime invoiceDate;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SupportTicketDto {
        private Long id;
        private String ticketNumber;
        private Long businessId;
        private String businessName;
        private String subject;
        private String description;
        private String productCode;
        private String priority;
        private String status;
        private String assignedTo;
        private LocalDateTime createdAt;
        private List<SupportReplyDto> replies;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SupportReplyDto {
        private Long id;
        private String senderType;
        private String senderName;
        private String message;
        private boolean isInternal;
        private LocalDateTime createdAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SupportReplyRequest {
        private String message;
        private boolean isInternal;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PlatformSettingDto {
        private Long id;
        private String settingKey;
        private String settingValue;
        private String category;
        private String description;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class AuditLogDto {
        private Long id;
        private String actorUsername;
        private String role;
        private Long businessId;
        private Long branchId;
        private String action;
        private String module;
        private String description;
        private String ipAddress;
        private LocalDateTime createdAt;
    }
}
