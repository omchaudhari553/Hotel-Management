package com.hotelmanagement.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public final class OwnerDtos {
    private OwnerDtos() {}

    public record CreateBranchRequest(
            @NotBlank(message = "Branch name is required")
            String branchName,

            @NotBlank(message = "Contact number is required")
            @Pattern(regexp = "^[6-9][0-9]{9}$", message = "Contact number must be exactly 10 digits and start with 6, 7, 8, or 9")
            String contactNumber,

            String branchAddress,
            String city,
            String state,

            @NotBlank(message = "Branch manager name is required")
            String branchManagerName,

            @NotBlank(message = "Username is required")
            @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
            String username,

            @NotBlank(message = "Password is required")
            @Size(min = 6, message = "Password must be at least 6 characters")
            String password,

            String status // ACTIVE or INACTIVE
    ) {}

    public record UpdateBranchRequest(
            String branchName,
            @Pattern(regexp = "^[6-9][0-9]{9}$", message = "Contact number must be exactly 10 digits and start with 6, 7, 8, or 9")
            String contactNumber,
            String branchAddress,
            String city,
            String state,
            String branchManagerName,
            String password, // Optional: if provided, updates branch login password
            String status // ACTIVE or INACTIVE
    ) {}

    public record UpdateBranchStatusRequest(
            @NotBlank(message = "Status is required")
            String status // ACTIVE or INACTIVE
    ) {}

    public record OwnerDashboardResponse(
            long totalBranches,
            long activeBranches,
            long inactiveBranches,
            BigDecimal todaySales,
            BigDecimal monthlySales,
            BigDecimal totalBillingAmount,
            BigDecimal totalPayments,
            BigDecimal totalPurchaseAmount,
            List<Map<String, Object>> branchSalesOverview,
            List<Map<String, Object>> branchPerformanceComparison,
            Map<String, Object> branchStatus
    ) {}

    public record OwnerSalesResponse(
            List<Map<String, Object>> branches,
            Map<String, Object> consolidated,
            List<Map<String, Object>> dailyBreakdown,
            Map<String, BigDecimal> salesByPaymentMethod
    ) {}

    public record OwnerProfitAnalysisResponse(
            BigDecimal totalBillingAmount,
            BigDecimal totalPaymentsReceived,
            BigDecimal totalPurchaseAmount,
            BigDecimal estimatedBusinessProfit,
            BigDecimal profitMarginPercent,
            List<Map<String, Object>> branchBreakdown
    ) {}

    public record OwnerBillingPerformanceResponse(
            long totalInvoices,
            long paidInvoices,
            long unpaidInvoices,
            BigDecimal totalBilled,
            BigDecimal totalCollected,
            BigDecimal collectionEfficiencyPercent,
            BigDecimal averageTicketSize,
            long totalKots,
            long completedKots,
            long totalPurchases,
            BigDecimal totalPurchaseAmount,
            List<Map<String, Object>> branchComparison
    ) {}

    public record OwnerSettingsRequest(
            String businessName,
            String ownerName,
            String contactEmail,
            String phone,
            String address,
            String city,
            String state,
            String currency,
            String taxNumber
    ) {}
}

