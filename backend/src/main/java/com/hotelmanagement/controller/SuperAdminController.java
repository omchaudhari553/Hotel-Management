package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.dto.SuperAdminDtos.*;
import com.hotelmanagement.security.CurrentUser;
import com.hotelmanagement.service.SuperAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/superadmin")
@Tag(name = "Central Super Admin", description = "Centralized Super Admin Platform Management APIs for Hotel, Mess, and Cafe")
public class SuperAdminController {

    private final SuperAdminService service;
    private final CurrentUser currentUser;

    public SuperAdminController(SuperAdminService service, CurrentUser currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    private String getAdminUsername() {
        try {
            return currentUser.get().getUsername();
        } catch (Exception e) {
            return "SUPER_ADMIN";
        }
    }

    // ==========================================
    // 1. DASHBOARD
    // ==========================================
    @GetMapping("/dashboard/kpis")
    @Operation(summary = "Get platform-wide dashboard KPIs across all products")
    public ApiResponse<DashboardKpis> getKpis() {
        return ApiResponse.ok("Dashboard KPIs retrieved", service.getDashboardKpis());
    }

    @GetMapping("/dashboard/revenue-chart")
    @Operation(summary = "Get 6-month monthly revenue chart points")
    public ApiResponse<List<RevenueChartPoint>> getRevenueChart() {
        return ApiResponse.ok("Revenue chart retrieved", service.getRevenueChart());
    }

    @GetMapping("/dashboard/product-distribution")
    @Operation(summary = "Get Hotel vs Mess vs Cafe subscriber and revenue distribution")
    public ApiResponse<List<ProductDistributionPoint>> getProductDistribution() {
        return ApiResponse.ok("Product distribution retrieved", service.getProductDistribution());
    }

    // ==========================================
    // 2. BUSINESS MANAGEMENT
    // ==========================================
    @GetMapping("/businesses")
    @Operation(summary = "List all registered businesses with filtering")
    public ApiResponse<List<BusinessSummaryDto>> getBusinesses(
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "status", required = false) String status) {
        return ApiResponse.ok("Businesses retrieved", service.getAllBusinesses(search, status));
    }

    @GetMapping("/businesses/{id}")
    @Operation(summary = "Get business details, branches, products, subscriptions, and payments")
    public ApiResponse<BusinessDetailDto> getBusinessById(@PathVariable("id") Long id) {
        return ApiResponse.ok("Business details retrieved", service.getBusinessById(id));
    }

    @PostMapping("/businesses")
    @Operation(summary = "Register a new business with product entitlements and owner account")
    public ApiResponse<BusinessDetailDto> createBusiness(@RequestBody BusinessSaveRequest req) {
        return ApiResponse.ok("Business created successfully", service.createBusiness(req, getAdminUsername()));
    }

    @PatchMapping("/businesses/{id}/status")
    @Operation(summary = "Activate, suspend, or deactivate a business")
    public ApiResponse<Void> toggleBusinessStatus(@PathVariable("id") Long id, @RequestParam("status") String status) {
        service.toggleBusinessStatus(id, status, getAdminUsername());
        return ApiResponse.ok("Business status updated", null);
    }

    @PutMapping("/businesses/{id}")
    @Operation(summary = "Update an existing business details")
    public ApiResponse<BusinessDetailDto> updateBusiness(@PathVariable("id") Long id, @RequestBody BusinessSaveRequest req) {
        return ApiResponse.ok("Business updated successfully", service.updateBusiness(id, req, getAdminUsername()));
    }

    @DeleteMapping("/businesses/{id}")
    @Operation(summary = "Deactivate or archive a business")
    public ApiResponse<Void> deleteBusiness(@PathVariable("id") Long id) {
        service.deleteBusiness(id, getAdminUsername());
        return ApiResponse.ok("Business deleted/deactivated successfully", null);
    }

    // ==========================================
    // 3. BRANCH MANAGEMENT
    // ==========================================
    @GetMapping("/branches")
    @Operation(summary = "List all branches across all businesses or filtered by business")
    public ApiResponse<List<BranchSummaryDto>> getBranches(@RequestParam(name = "businessId", required = false) Long businessId) {
        return ApiResponse.ok("Branches retrieved", service.getAllBranches(businessId));
    }

    @PostMapping("/branches")
    @Operation(summary = "Create a new branch under a business")
    public ApiResponse<BranchSummaryDto> createBranch(@RequestBody BranchSaveRequest req) {
        return ApiResponse.ok("Branch created successfully", service.createBranch(req, getAdminUsername()));
    }

    @PatchMapping("/branches/{id}/status")
    @Operation(summary = "Activate or suspend a branch")
    public ApiResponse<Void> toggleBranchStatus(@PathVariable("id") Long id, @RequestParam("status") String status) {
        service.toggleBranchStatus(id, status, getAdminUsername());
        return ApiResponse.ok("Branch status updated", null);
    }

    @PutMapping("/branches/{id}")
    @Operation(summary = "Update branch details")
    public ApiResponse<BranchSummaryDto> updateBranch(@PathVariable("id") Long id, @RequestBody BranchSaveRequest req) {
        return ApiResponse.ok("Branch updated successfully", service.updateBranch(id, req, getAdminUsername()));
    }

    @DeleteMapping("/branches/{id}")
    @Operation(summary = "Deactivate a branch")
    public ApiResponse<Void> deleteBranch(@PathVariable("id") Long id) {
        service.deleteBranch(id, getAdminUsername());
        return ApiResponse.ok("Branch deleted/deactivated successfully", null);
    }

    // ==========================================
    // 4. PRODUCTS & MODULES
    // ==========================================
    @GetMapping("/products")
    @Operation(summary = "List all SaaS products (Hotel, Mess, Cafe)")
    public ApiResponse<List<ProductItemDto>> getProducts() {
        return ApiResponse.ok("Products retrieved", service.getAllProducts());
    }

    @GetMapping("/products/{id}/modules")
    @Operation(summary = "List modules for a specific product")
    public ApiResponse<List<ProductModuleDto>> getModules(@PathVariable("id") Long id) {
        return ApiResponse.ok("Product modules retrieved", service.getModulesByProduct(id));
    }

    @PostMapping("/products/{id}/modules")
    @Operation(summary = "Add a new module to a product")
    public ApiResponse<ProductModuleDto> createModule(@PathVariable("id") Long id, @RequestBody ProductModuleDto dto) {
        return ApiResponse.ok("Module created successfully", service.createModule(id, dto, getAdminUsername()));
    }

    @PatchMapping("/modules/{id}/status")
    @Operation(summary = "Enable or disable a product module")
    public ApiResponse<Void> toggleModuleStatus(@PathVariable("id") Long id, @RequestParam("active") boolean active) {
        service.toggleModuleStatus(id, active, getAdminUsername());
        return ApiResponse.ok("Module status updated", null);
    }

    // ==========================================
    // 5. SUBSCRIPTION PLANS
    // ==========================================
    @GetMapping("/plans")
    @Operation(summary = "List subscription plans (Trial, Yearly, 3-Year, Lifetime)")
    public ApiResponse<List<SubscriptionPlanDto>> getPlans(@RequestParam(name = "productCode", required = false) String productCode) {
        return ApiResponse.ok("Plans retrieved", service.getAllPlans(productCode));
    }

    @PostMapping("/plans")
    @Operation(summary = "Create or update a subscription plan")
    public ApiResponse<SubscriptionPlanDto> savePlan(@RequestBody SubscriptionPlanDto plan) {
        return ApiResponse.ok("Subscription plan saved", service.savePlan(plan, getAdminUsername()));
    }

    @DeleteMapping("/plans/{id}")
    @Operation(summary = "Deactivate a subscription plan")
    public ApiResponse<Void> deletePlan(@PathVariable("id") Long id) {
        service.deletePlan(id, getAdminUsername());
        return ApiResponse.ok("Plan deactivated successfully", null);
    }

    // ==========================================
    // 6. SUBSCRIPTIONS
    // ==========================================
    @GetMapping("/subscriptions")
    @Operation(summary = "List all branch-wise and product-wise subscriptions")
    public ApiResponse<List<SubscriptionItemDto>> getSubscriptions(
            @RequestParam(name = "productCode", required = false) String productCode,
            @RequestParam(name = "status", required = false) String status) {
        return ApiResponse.ok("Subscriptions retrieved", service.getAllSubscriptions(productCode, status));
    }

    @PostMapping("/subscriptions")
    @Operation(summary = "Manually assign or activate a subscription for a business branch")
    public ApiResponse<SubscriptionItemDto> assignSubscription(@RequestBody SubscriptionSaveRequest req) {
        return ApiResponse.ok("Subscription assigned successfully", service.assignSubscription(req, getAdminUsername()));
    }

    @PostMapping("/subscriptions/{id}/renew")
    @Operation(summary = "Renew an existing subscription")
    public ApiResponse<Void> renewSubscription(@PathVariable("id") Long id, @RequestParam(name = "months", defaultValue = "12") int months) {
        service.renewSubscription(id, months, getAdminUsername());
        return ApiResponse.ok("Subscription renewed successfully", null);
    }

    @PatchMapping("/subscriptions/{id}/status")
    @Operation(summary = "Change subscription status (ACTIVE, SUSPENDED, EXPIRED)")
    public ApiResponse<Void> toggleSubscriptionStatus(@PathVariable("id") Long id, @RequestParam("status") String status) {
        service.toggleSubscriptionStatus(id, status, getAdminUsername());
        return ApiResponse.ok("Subscription status updated", null);
    }

    @PostMapping("/trials/{id}/extend")
    @Operation(summary = "Extend trial subscription by days")
    public ApiResponse<Void> extendTrial(@PathVariable("id") Long id, @RequestParam(name = "days", defaultValue = "14") int days) {
        service.extendTrial(id, days, getAdminUsername());
        return ApiResponse.ok("Trial extended successfully", null);
    }

    // ==========================================
    // 7. PAYMENTS & INVOICES
    // ==========================================
    @GetMapping("/payments")
    @Operation(summary = "List all platform subscription payments and transactions")
    public ApiResponse<List<PaymentItemDto>> getPayments() {
        return ApiResponse.ok("Payments retrieved", service.getAllPayments());
    }

    @GetMapping("/invoices")
    @Operation(summary = "List generated platform tax invoices")
    public ApiResponse<List<InvoiceItemDto>> getInvoices() {
        return ApiResponse.ok("Invoices retrieved", service.getAllInvoices());
    }

    // ==========================================
    // 8. SUPPORT TICKETS
    // ==========================================
    @GetMapping("/support/tickets")
    @Operation(summary = "List support tickets with status filter")
    public ApiResponse<List<SupportTicketDto>> getTickets(@RequestParam(name = "status", required = false) String status) {
        return ApiResponse.ok("Support tickets retrieved", service.getAllTickets(status));
    }

    @GetMapping("/support/tickets/{id}")
    @Operation(summary = "Get ticket details with conversation thread")
    public ApiResponse<SupportTicketDto> getTicketById(@PathVariable("id") Long id) {
        return ApiResponse.ok("Ticket details retrieved", service.getTicketById(id));
    }

    @PostMapping("/support/tickets/{id}/reply")
    @Operation(summary = "Add an administrator reply to a support ticket")
    public ApiResponse<Void> replyTicket(@PathVariable("id") Long id, @RequestBody SupportReplyRequest req) {
        service.replyTicket(id, req, getAdminUsername());
        return ApiResponse.ok("Reply sent successfully", null);
    }

    @PatchMapping("/support/tickets/{id}/status")
    @Operation(summary = "Update ticket resolution status")
    public ApiResponse<Void> updateTicketStatus(@PathVariable("id") Long id, @RequestParam("status") String status) {
        service.updateTicketStatus(id, status, getAdminUsername());
        return ApiResponse.ok("Ticket status updated", null);
    }

    // ==========================================
    // 9. SETTINGS
    // ==========================================
    @GetMapping("/settings")
    @Operation(summary = "Get platform settings")
    public ApiResponse<List<PlatformSettingDto>> getSettings() {
        return ApiResponse.ok("Settings retrieved", service.getAllSettings());
    }

    @PutMapping("/settings")
    @Operation(summary = "Update a platform setting")
    public ApiResponse<Void> updateSetting(@RequestBody Map<String, String> body) {
        service.updateSetting(body.get("key"), body.get("value"), getAdminUsername());
        return ApiResponse.ok("Setting updated successfully", null);
    }

    // ==========================================
    // 10. AUDIT LOGS
    // ==========================================
    @GetMapping("/audit-logs")
    @Operation(summary = "Get platform audit history")
    public ApiResponse<List<AuditLogDto>> getAuditLogs() {
        return ApiResponse.ok("Audit logs retrieved", service.getAuditLogs());
    }
}
