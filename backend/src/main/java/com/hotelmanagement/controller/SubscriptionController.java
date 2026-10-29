package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.dto.SubscriptionDtos.*;
import com.hotelmanagement.entity.SubscriptionPayment;
import com.hotelmanagement.repository.SubscriptionPaymentRepository;
import com.hotelmanagement.security.CurrentUser;
import com.hotelmanagement.service.SubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/subscriptions")
@Tag(name = "Subscriptions", description = "Subscription & License Management APIs")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;
    private final SubscriptionPaymentRepository paymentRepo;
    private final CurrentUser currentUser;

    public SubscriptionController(SubscriptionService subscriptionService,
                                  SubscriptionPaymentRepository paymentRepo,
                                  CurrentUser currentUser) {
        this.subscriptionService = subscriptionService;
        this.paymentRepo = paymentRepo;
        this.currentUser = currentUser;
    }

    @GetMapping("/current")
    @Operation(summary = "Get current subscription & trial validity status")
    public ApiResponse<SubscriptionStatusResponse> getCurrentSubscription() {
        return ApiResponse.ok("Subscription status fetched", subscriptionService.getCurrentSubscription());
    }

    @GetMapping("/plans")
    @Operation(summary = "Get configured subscription plans (Hotel plans by default)")
    public ApiResponse<List<PlanDto>> getAllPlans(@RequestParam(required = false, defaultValue = "HOTEL") String industry) {
        return ApiResponse.ok("Plans fetched", subscriptionService.getPlansForIndustry(industry));
    }

    @PostMapping("/trial/start")
    @Operation(summary = "Start 28-day free trial")
    public ApiResponse<SubscriptionStatusResponse> startFreeTrial() {
        return ApiResponse.ok("28-day free trial activated", subscriptionService.startFreeTrial());
    }

    @PostMapping("/create-order")
    @Operation(summary = "Create payment order for subscription upgrade or renewal")
    public ApiResponse<OrderResponse> createPaymentOrder(@RequestBody CreateOrderRequest req) {
        return ApiResponse.ok("Payment order created", subscriptionService.createPaymentOrder(req));
    }

    @PostMapping("/verify-payment")
    @Operation(summary = "Verify payment and activate renewed / upgraded subscription")
    public ApiResponse<VerifyPaymentResponse> verifyPayment(@RequestBody VerifyPaymentRequest req) {
        return ApiResponse.ok("Payment verified and subscription activated", subscriptionService.verifyPayment(req));
    }

    @GetMapping("/payments/history")
    @Operation(summary = "Get subscription payment history")
    public ApiResponse<List<SubscriptionPayment>> getPaymentHistory() {
        Long businessId = currentUser.businessId();
        return ApiResponse.ok("Payment history fetched", paymentRepo.findAllByBusinessId(businessId));
    }
}
