package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.dto.SubscriptionDtos.*;
import com.hotelmanagement.security.CurrentUser;
import com.hotelmanagement.service.SuperAdminSubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@Tag(name = "Super Admin Subscriptions", description = "Central Super Admin & Platform Owner Subscription APIs")
public class SuperAdminSubscriptionController {

    private final SuperAdminSubscriptionService service;
    private final CurrentUser currentUser;

    public SuperAdminSubscriptionController(SuperAdminSubscriptionService service, CurrentUser currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    private String getAdminUsername() {
        currentUser.requireOwner();
        try {
            return currentUser.get().getUsername();
        } catch (Exception e) {
            return "SUPER_ADMIN";
        }
    }

    // 1. DASHBOARD KPIS & ANALYTICS
    @GetMapping("/dashboard/subscription-kpis")
    @Operation(summary = "Get Super Admin subscription KPI metrics")
    public ApiResponse<SuperAdminKpiResponse> getDashboardKpis() {
        currentUser.requireOwner();
        return ApiResponse.ok("Subscription KPIs fetched", service.getDashboardKpis());
    }

    @GetMapping("/dashboard/subscription-analytics")
    @Operation(summary = "Get monthly revenue trend, conversion rate and plan distribution")
    public ApiResponse<SuperAdminAnalyticsResponse> getDashboardAnalytics() {
        currentUser.requireOwner();
        return ApiResponse.ok("Subscription analytics fetched", service.getDashboardAnalytics());
    }

    // 2. HOTEL BUSINESSES
    @GetMapping("/hotels")
    @Operation(summary = "List all registered hotel businesses with subscription status")
    public ApiResponse<List<HotelSubscriptionSummaryDto>> getAllHotels() {
        currentUser.requireOwner();
        return ApiResponse.ok("Hotels with subscriptions fetched", service.getAllHotelSubscriptions());
    }

    // 3. SUBSCRIPTION PLANS
    @GetMapping("/subscription-plans")
    @Operation(summary = "List all subscription plans (active & inactive)")
    public ApiResponse<List<PlanDto>> getAllPlans() {
        currentUser.requireOwner();
        return ApiResponse.ok("Plans fetched", service.getAllPlans());
    }

    @PostMapping("/subscription-plans")
    @Operation(summary = "Create a new subscription plan with feature limits")
    public ApiResponse<PlanDto> createPlan(@RequestBody PlanSaveRequest req) {
        String admin = getAdminUsername();
        return ApiResponse.ok("Subscription plan created successfully", service.createPlan(req, admin));
    }

    @PutMapping("/subscription-plans/{id}")
    @Operation(summary = "Update an existing subscription plan")
    public ApiResponse<PlanDto> updatePlan(@PathVariable("id") Long id, @RequestBody PlanSaveRequest req) {
        String admin = getAdminUsername();
        return ApiResponse.ok("Subscription plan updated successfully", service.updatePlan(id, req, admin));
    }

    @PatchMapping("/subscription-plans/{id}/status")
    @Operation(summary = "Activate or deactivate a subscription plan")
    public ApiResponse<String> togglePlanStatus(@PathVariable("id") Long id, @RequestParam("active") boolean active) {
        String admin = getAdminUsername();
        service.togglePlanStatus(id, active, admin);
        return ApiResponse.ok(active ? "Plan activated" : "Plan deactivated", null);
    }

    @DeleteMapping("/subscription-plans/{id}")
    @Operation(summary = "Delete or archive a subscription plan")
    public ApiResponse<String> deletePlan(@PathVariable("id") Long id) {
        String admin = getAdminUsername();
        service.deletePlan(id, admin);
        return ApiResponse.ok("Plan removed or archived successfully", null);
    }

    // 4. SUBSCRIPTION MANAGEMENT & ACTIONS
    @GetMapping("/subscriptions")
    @Operation(summary = "Get all hotel subscriptions with filters")
    public ApiResponse<List<HotelSubscriptionSummaryDto>> getAllSubscriptions() {
        currentUser.requireOwner();
        return ApiResponse.ok("Subscriptions fetched", service.getAllHotelSubscriptions());
    }

    @PatchMapping("/subscriptions/{id}/activate")
    @Operation(summary = "Manually activate a hotel subscription")
    public ApiResponse<SubscriptionStatusResponse> activateSubscription(@PathVariable("id") Long id) {
        String admin = getAdminUsername();
        return ApiResponse.ok("Subscription activated", service.activateSubscription(id, admin));
    }

    @PatchMapping("/subscriptions/{id}/suspend")
    @Operation(summary = "Suspend a hotel subscription")
    public ApiResponse<SubscriptionStatusResponse> suspendSubscription(@PathVariable("id") Long id,
                                                                       @RequestParam(value = "reason", required = false) String reason) {
        String admin = getAdminUsername();
        return ApiResponse.ok("Subscription suspended", service.suspendSubscription(id, reason, admin));
    }

    @PatchMapping("/subscriptions/{id}/resume")
    @Operation(summary = "Resume a suspended subscription")
    public ApiResponse<SubscriptionStatusResponse> resumeSubscription(@PathVariable("id") Long id) {
        String admin = getAdminUsername();
        return ApiResponse.ok("Subscription resumed", service.resumeSubscription(id, admin));
    }

    @PatchMapping("/subscriptions/{id}/cancel")
    @Operation(summary = "Cancel a hotel subscription")
    public ApiResponse<SubscriptionStatusResponse> cancelSubscription(@PathVariable("id") Long id,
                                                                      @RequestParam(value = "reason", required = false) String reason) {
        String admin = getAdminUsername();
        return ApiResponse.ok("Subscription cancelled", service.cancelSubscription(id, reason, admin));
    }

    @PostMapping("/subscriptions/{id}/extend")
    @Operation(summary = "Extend subscription validity by N days")
    public ApiResponse<SubscriptionStatusResponse> extendSubscription(@PathVariable("id") Long id,
                                                                      @RequestBody SubscriptionExtendRequest req) {
        String admin = getAdminUsername();
        return ApiResponse.ok("Subscription extended", service.extendSubscription(id, req.getDays(), req.getReason(), admin));
    }

    // 5. FREE TRIALS
    @GetMapping("/subscriptions/trials")
    @Operation(summary = "Get all hotels on free trial")
    public ApiResponse<List<HotelSubscriptionSummaryDto>> getTrials() {
        currentUser.requireOwner();
        List<HotelSubscriptionSummaryDto> trials = service.getAllHotelSubscriptions().stream()
                .filter(HotelSubscriptionSummaryDto::isTrial)
                .toList();
        return ApiResponse.ok("Free trials fetched", trials);
    }

    // 6. PAYMENTS & TRANSACTIONS
    @GetMapping("/subscription-payments")
    @Operation(summary = "Get all subscription payment transactions")
    public ApiResponse<List<Map<String, Object>>> getAllPayments() {
        currentUser.requireOwner();
        return ApiResponse.ok("Payments fetched", service.getAllPayments());
    }

    // 7. SUBSCRIPTION HISTORY & AUDIT LOGS
    @GetMapping("/subscription-history")
    @Operation(summary = "Get all subscription activity history")
    public ApiResponse<List<SubscriptionHistoryDto>> getSubscriptionHistory() {
        currentUser.requireOwner();
        return ApiResponse.ok("Subscription history fetched", service.getAllHistory());
    }
}

