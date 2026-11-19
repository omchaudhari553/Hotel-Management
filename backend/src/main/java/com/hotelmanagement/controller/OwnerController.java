package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.dto.OwnerDtos.*;
import com.hotelmanagement.service.OwnerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/owner")
@Tag(name = "Owner Admin", description = "Multi-Branch Owner Admin Panel Management APIs")
public class OwnerController {

    private final OwnerService service;

    public OwnerController(OwnerService service) {
        this.service = service;
    }

    // MODULE 1: OWNER DASHBOARD
    @GetMapping("/dashboard")
    @Operation(summary = "Get multi-branch consolidated owner dashboard")
    public ApiResponse<OwnerDashboardResponse> dashboard() {
        return ApiResponse.ok("Owner dashboard fetched", service.getDashboard());
    }

    // MODULE 2: BRANCH MANAGEMENT
    @GetMapping("/branches")
    @Operation(summary = "List all branches with details and login user information")
    public ApiResponse<List<Map<String, Object>>> listBranches() {
        return ApiResponse.ok("Branches fetched", service.getAllBranches());
    }

    @PostMapping("/branches")
    @Operation(summary = "Create branch and generate unique branch login credentials transactionally")
    public ApiResponse<Map<String, Object>> createBranch(@Valid @RequestBody CreateBranchRequest req) {
        return ApiResponse.ok("Branch and credentials created successfully", service.createBranch(req));
    }

    @GetMapping("/branches/{id}")
    @Operation(summary = "Get branch details by ID")
    public ApiResponse<Map<String, Object>> getBranch(@PathVariable("id") Long id) {
        return ApiResponse.ok("Branch details fetched", service.getBranchById(id));
    }

    @PutMapping("/branches/{id}")
    @Operation(summary = "Update branch details, credentials or status")
    public ApiResponse<Map<String, Object>> updateBranch(@PathVariable("id") Long id, @Valid @RequestBody UpdateBranchRequest req) {
        return ApiResponse.ok("Branch updated successfully", service.updateBranch(id, req));
    }

    @PatchMapping("/branches/{id}/status")
    @Operation(summary = "Activate or deactivate a branch")
    public ApiResponse<Map<String, Object>> updateBranchStatus(@PathVariable("id") Long id, @Valid @RequestBody UpdateBranchStatusRequest req) {
        return ApiResponse.ok("Branch status updated", service.updateBranchStatus(id, req.status()));
    }

    @DeleteMapping("/branches/{id}")
    @Operation(summary = "Delete branch")
    public ApiResponse<Map<String, Object>> deleteBranch(@PathVariable("id") Long id) {
        return ApiResponse.ok("Branch deleted successfully", service.deleteBranch(id));
    }

    // MODULE 3: BRANCH-WISE SALES
    @GetMapping("/sales")
    @Operation(summary = "Get branch-wise sales breakdown and daily timeline")
    public ApiResponse<OwnerSalesResponse> sales(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {
        return ApiResponse.ok("Sales data fetched", service.getSales(branchId, startDate, endDate, month, year));
    }

    // MODULE 4: PROFIT ANALYSIS
    @GetMapping("/profit-analysis")
    @Operation(summary = "Get branch-wise profit analysis using actual billing and purchase records")
    public ApiResponse<OwnerProfitAnalysisResponse> profitAnalysis(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        return ApiResponse.ok("Profit analysis fetched", service.getProfitAnalysis(branchId, startDate, endDate));
    }

    // MODULE 5: STAFF MANAGEMENT
    @GetMapping("/staff")
    @Operation(summary = "Get staff branch-wise with manager information")
    public ApiResponse<List<Map<String, Object>>> staff(@RequestParam(required = false) Long branchId) {
        return ApiResponse.ok("Staff information fetched", service.getStaff(branchId));
    }

    // MODULE 6: BRANCH REPORTS
    @GetMapping("/reports")
    @Operation(summary = "Get consolidated and branch-level reports (Hotel & GST Reports)")
    public ApiResponse<Map<String, Object>> reports(
            @RequestParam(required = false, defaultValue = "HOTEL_REPORTS") String type,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String period) {
        return ApiResponse.ok("Reports fetched", service.getReports(type, branchId, startDate, endDate, period));
    }

    // MODULE 7: BILLING PERFORMANCE
    @GetMapping("/billing-performance")
    @Operation(summary = "Get consolidated billing performance and KOT efficiency")
    public ApiResponse<OwnerBillingPerformanceResponse> billingPerformance(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        return ApiResponse.ok("Billing performance fetched", service.getBillingPerformance(branchId, startDate, endDate));
    }

    // MODULE 8: OWNER SETTINGS
    @GetMapping("/settings")
    @Operation(summary = "Get owner-level business settings and multi-branch configuration")
    public ApiResponse<Map<String, Object>> getSettings() {
        return ApiResponse.ok("Owner settings fetched", service.getSettings());
    }

    @PostMapping("/settings")
    @Operation(summary = "Update owner-level business settings")
    public ApiResponse<Map<String, Object>> updateSettings(@RequestBody OwnerSettingsRequest req) {
        return ApiResponse.ok("Owner settings updated", service.updateSettings(req));
    }
}

