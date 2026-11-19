package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.dto.SubscriptionDtos.*;
import com.hotelmanagement.entity.SubscriptionHistory;
import com.hotelmanagement.entity.SubscriptionPayment;
import com.hotelmanagement.repository.SubscriptionHistoryRepository;
import com.hotelmanagement.repository.SubscriptionPaymentRepository;
import com.hotelmanagement.security.CurrentUser;
import com.hotelmanagement.service.SubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/hotel/subscription")
@Tag(name = "Hotel Subscription", description = "Hotel Owner / Admin Subscription & Trial APIs")
public class HotelSubscriptionController {

    private final SubscriptionService subscriptionService;
    private final SubscriptionPaymentRepository paymentRepo;
    private final SubscriptionHistoryRepository historyRepo;
    private final CurrentUser currentUser;

    public HotelSubscriptionController(SubscriptionService subscriptionService,
                                       SubscriptionPaymentRepository paymentRepo,
                                       SubscriptionHistoryRepository historyRepo,
                                       CurrentUser currentUser) {
        this.subscriptionService = subscriptionService;
        this.paymentRepo = paymentRepo;
        this.historyRepo = historyRepo;
        this.currentUser = currentUser;
    }

    @GetMapping
    @Operation(summary = "Get hotel's current subscription & trial validity")
    public ApiResponse<SubscriptionStatusResponse> getSubscription() {
        return ApiResponse.ok("Subscription status fetched", subscriptionService.getCurrentSubscription());
    }

    @GetMapping("/trial-status")
    @Operation(summary = "Get live trial countdown timestamp and days remaining")
    public ApiResponse<SubscriptionStatusResponse> getTrialStatus() {
        return ApiResponse.ok("Trial status fetched", subscriptionService.getCurrentSubscription());
    }

    @GetMapping("/plans")
    @Operation(summary = "Get available Hotel subscription plans")
    public ApiResponse<List<PlanDto>> getPlans() {
        return ApiResponse.ok("Hotel plans fetched", subscriptionService.getPlansForIndustry("HOTEL"));
    }

    @PostMapping("/checkout")
    @Operation(summary = "Create payment order for plan upgrade or renewal")
    public ApiResponse<OrderResponse> checkout(@RequestBody CreateOrderRequest req) {
        return ApiResponse.ok("Payment order created", subscriptionService.createPaymentOrder(req));
    }

    @PostMapping("/renew")
    @Operation(summary = "Renew existing plan with payment order creation")
    public ApiResponse<OrderResponse> renew(@RequestBody CreateOrderRequest req) {
        return ApiResponse.ok("Renewal order created", subscriptionService.createPaymentOrder(req));
    }

    @PostMapping("/payment/verify")
    @Operation(summary = "Verify payment signature and activate subscription")
    public ApiResponse<VerifyPaymentResponse> verifyPayment(@RequestBody VerifyPaymentRequest req) {
        return ApiResponse.ok("Payment verified", subscriptionService.verifyPayment(req));
    }

    @PostMapping("/submit-verification")
    @Operation(summary = "Submit manual UPI / QR payment verification (UTR + Screenshot)")
    public ApiResponse<SubmitVerificationResponse> submitVerification(@RequestBody SubmitVerificationRequest req) {
        return ApiResponse.ok("Payment verification submitted successfully", subscriptionService.submitPaymentVerification(req));
    }

    @GetMapping("/payments")
    @Operation(summary = "Get hotel's subscription payment transactions")
    public ApiResponse<List<SubscriptionPayment>> getPayments() {
        Long businessId = currentUser.businessId();
        return ApiResponse.ok("Payments fetched", paymentRepo.findAllByBusinessId(businessId));
    }

    @GetMapping("/history")
    @Operation(summary = "Get hotel's subscription transition history")
    public ApiResponse<List<SubscriptionHistory>> getHistory() {
        Long businessId = currentUser.businessId();
        return ApiResponse.ok("Subscription history fetched", historyRepo.findAllByBusinessId(businessId));
    }
}

