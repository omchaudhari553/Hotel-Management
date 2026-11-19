package com.hotelmanagement.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelmanagement.dto.SubscriptionDtos.*;
import com.hotelmanagement.entity.*;
import com.hotelmanagement.enums.BillingCycle;
import com.hotelmanagement.enums.SubscriptionStatus;
import com.hotelmanagement.exception.BadRequestException;
import com.hotelmanagement.exception.NotFoundException;
import com.hotelmanagement.repository.*;
import com.hotelmanagement.security.CurrentUser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class SubscriptionService {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionService.class);
    private static final int TRIAL_DAYS = 28;
    private static final BigDecimal GST_RATE = new BigDecimal("0.18");

    private final SubscriptionPlanRepository planRepo;
    private final BusinessSubscriptionRepository subscriptionRepo;
    private final SubscriptionPaymentRepository paymentRepo;
    private final SubscriptionHistoryRepository historyRepo;
    private final HotelSettingRepository settingRepo;
    private final NotificationRepository notificationRepo;
    private final BusinessRepository businessRepo;
    private final CurrentUser currentUser;
    private final ObjectMapper objectMapper;

    @Value("${app.razorpay.key-id:}")
    private String razorpayKeyId;

    @Value("${app.razorpay.key-secret:}")
    private String razorpayKeySecret;

    public SubscriptionService(SubscriptionPlanRepository planRepo,
                               BusinessSubscriptionRepository subscriptionRepo,
                               SubscriptionPaymentRepository paymentRepo,
                               SubscriptionHistoryRepository historyRepo,
                               HotelSettingRepository settingRepo,
                               NotificationRepository notificationRepo,
                               BusinessRepository businessRepo,
                               CurrentUser currentUser,
                               ObjectMapper objectMapper) {
        this.planRepo = planRepo;
        this.subscriptionRepo = subscriptionRepo;
        this.paymentRepo = paymentRepo;
        this.historyRepo = historyRepo;
        this.settingRepo = settingRepo;
        this.notificationRepo = notificationRepo;
        this.businessRepo = businessRepo;
        this.currentUser = currentUser;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public SubscriptionStatusResponse getCurrentSubscription() {
        Long businessId = currentUser.businessId();
        return getSubscriptionForBusiness(businessId);
    }

    @Transactional
    public SubscriptionStatusResponse getSubscriptionForBusiness(Long businessId) {
        Business business = businessRepo.findById(businessId)
                .orElseThrow(() -> new NotFoundException("Business not found"));

        List<BusinessSubscription> subscriptions = subscriptionRepo.findAllByBusinessId(businessId);
        BusinessSubscription current;

        if (subscriptions.isEmpty()) {
            current = initializeDefaultTrial(business);
        } else {
            current = subscriptions.get(0);
        }

        LocalDateTime now = LocalDateTime.now();

        // Self-heal: If an existing trial subscription had duration > TRIAL_DAYS (28 days), fix it to 28 days
        if (current.isTrial() && (current.getStatus() == SubscriptionStatus.TRIAL_ACTIVE || current.getStatus() == null)) {
            LocalDateTime maxEnd = current.getStartDate().plusDays(TRIAL_DAYS);
            if (current.getEndDate() != null && current.getEndDate().isAfter(maxEnd)) {
                current.setEndDate(maxEnd);
                current.setTrialEndDate(maxEnd);
                current = subscriptionRepo.save(current);
                syncToHotelSettings(business, current);
            }
        }

        // Check if subscription has expired
        if (now.isAfter(current.getEndDate()) && 
            (current.getStatus() == SubscriptionStatus.TRIAL_ACTIVE || current.getStatus() == SubscriptionStatus.ACTIVE)) {
            
            SubscriptionStatus expiredStatus = current.isTrial() ? 
                    SubscriptionStatus.TRIAL_EXPIRED : SubscriptionStatus.EXPIRED;
            current.setStatus(expiredStatus);
            current = subscriptionRepo.save(current);
            syncToHotelSettings(business, current);

            if (current.isTrial()) {
                sendNotificationIfNotExists(business, "SUBSCRIPTION", 
                        "Free Trial Expired", 
                        "Your free trial has expired. Renew your subscription to continue using the protected features.");
            } else {
                sendNotificationIfNotExists(business, "SUBSCRIPTION", 
                        "Subscription Expired", 
                        "Your subscription has expired. Please renew your plan.");
            }
        }

        // Check proactive reminders
        checkAndSendExpiryReminders(business, current, now);

        return mapToStatusResponse(current, now);
    }

    @Transactional
    public SubscriptionStatusResponse startFreeTrial() {
        Long businessId = currentUser.businessId();
        Business business = businessRepo.findById(businessId)
                .orElseThrow(() -> new NotFoundException("Business not found"));

        List<BusinessSubscription> existing = subscriptionRepo.findAllByBusinessId(businessId);
        boolean hasExistingTrial = existing.stream().anyMatch(s -> s.isTrial() || s.getTrialStartDate() != null);

        if (hasExistingTrial) {
            throw new BadRequestException("A 28-day free trial has already been activated for this account. Unlimited free trials are not permitted.");
        }

        BusinessSubscription trial = initializeDefaultTrial(business);
        sendNotificationIfNotExists(business, "SUBSCRIPTION",
                "28-Day Free Trial Activated",
                "Your 28-day free trial has started. Enjoy full access to all features!");

        return mapToStatusResponse(trial, LocalDateTime.now());
    }

    @Transactional(readOnly = true)
    public List<PlanDto> getAllPlans() {
        return getPlansForIndustry("HOTEL");
    }

    @Transactional(readOnly = true)
    public List<PlanDto> getPlansForCurrentIndustry() {
        return getPlansForIndustry("HOTEL");
    }

    @Transactional(readOnly = true)
    public List<PlanDto> getPlansForIndustry(String industry) {
        String code = (industry == null || industry.isBlank()) ? "HOTEL" : industry.trim().toUpperCase();
        List<SubscriptionPlan> plans = planRepo.findAllByIndustryCodeAndIsActiveTrue(code);
        if (plans.isEmpty()) {
            plans = planRepo.findAllByIndustryCodeAndIsActiveTrue("HOTEL");
        }
        return plans.stream().map(this::mapToPlanDto).toList();
    }

    @Transactional
    public OrderResponse createPaymentOrder(CreateOrderRequest req) {
        Long businessId = currentUser.businessId();
        Business business = currentUser.get().getBusiness();

        SubscriptionPlan plan;
        if (req.getPlanId() != null) {
            plan = planRepo.findById(req.getPlanId())
                    .orElse(null);
        } else if (req.getPlanCode() != null && !req.getPlanCode().isBlank()) {
            plan = planRepo.findByPlanCode(req.getPlanCode())
                    .orElse(null);
        } else {
            plan = planRepo.findAll().stream().findFirst().orElse(null);
        }

        if (plan == null) {
            plan = planRepo.findAll().stream().findFirst().orElseThrow(() -> new NotFoundException("No subscription plan available"));
        }

        String platform = req.getPlatform() != null && !req.getPlatform().isBlank()
                ? req.getPlatform().trim()
                : "Mobile + Desktop";
        String planType = req.getPlanType() != null && !req.getPlanType().isBlank()
                ? req.getPlanType().trim()
                : "Software Only";
        String durationType = req.getDurationType() != null && !req.getDurationType().isBlank()
                ? req.getDurationType().trim()
                : ("ANNUAL".equalsIgnoreCase(req.getBillingCycle()) ? "1 Year" : "1 Year");

        String hardwareIncluded = "None";
        if (planType.toLowerCase().contains("printer")) {
            hardwareIncluded = "Thermal Receipt Printer";
        }

        BillingCycle cycle = "ANNUAL".equalsIgnoreCase(req.getBillingCycle()) || durationType.contains("Year") || durationType.contains("Lifetime")
                ? BillingCycle.ANNUAL : BillingCycle.MONTHLY;

        BigDecimal baseAmount;
        if (req.getCustomBaseAmount() != null && req.getCustomBaseAmount().compareTo(BigDecimal.ZERO) > 0) {
            baseAmount = req.getCustomBaseAmount();
        } else {
            // Price matrix matching AjalkarBill screenshot UI
            if (platform.toLowerCase().contains("mobile only")) {
                if (durationType.toLowerCase().contains("3 year")) baseAmount = BigDecimal.valueOf(2400.00);
                else if (durationType.toLowerCase().contains("lifetime")) baseAmount = BigDecimal.valueOf(9999.00);
                else baseAmount = BigDecimal.valueOf(1000.00);
            } else if (platform.toLowerCase().contains("desktop only")) {
                if (durationType.toLowerCase().contains("3 year")) baseAmount = BigDecimal.valueOf(4500.00);
                else if (durationType.toLowerCase().contains("lifetime")) baseAmount = BigDecimal.valueOf(16999.00);
                else baseAmount = BigDecimal.valueOf(1999.00);
            } else { // Mobile + Desktop
                if (durationType.toLowerCase().contains("3 year")) baseAmount = BigDecimal.valueOf(6999.00);
                else if (durationType.toLowerCase().contains("lifetime")) baseAmount = BigDecimal.valueOf(24999.00);
                else baseAmount = BigDecimal.valueOf(2999.00);
            }

            if (hardwareIncluded.contains("Printer")) {
                baseAmount = baseAmount.add(BigDecimal.valueOf(4000.00));
            }
        }

        BigDecimal taxAmount = baseAmount.multiply(GST_RATE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalAmount = baseAmount.add(taxAmount).setScale(2, RoundingMode.HALF_UP);

        String orderId = "order_sub_" + System.currentTimeMillis() + "_" + (1000 + new Random().nextInt(9000));
        String orderRef = req.getOrderRef() != null && !req.getOrderRef().isBlank()
                ? req.getOrderRef().trim()
                : "#" + (10000 + new Random().nextInt(90000));

        // Early Renewal Guarantee - Calculate Proposed Validity
        List<BusinessSubscription> existingSubs = subscriptionRepo.findAllByBusinessId(businessId);
        BusinessSubscription current = existingSubs.isEmpty() ? null : existingSubs.get(0);
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime baseExpiry = (current != null && current.getEndDate() != null && current.getEndDate().isAfter(now))
                ? current.getEndDate()
                : now;

        int daysToAdd = 365;
        if (durationType.toLowerCase().contains("3 year")) {
            daysToAdd = 1095;
        } else if (durationType.toLowerCase().contains("lifetime")) {
            daysToAdd = 36500;
        }

        LocalDateTime proposedEndDate = baseExpiry.plusDays(daysToAdd);
        String proposedValidity = durationType.toLowerCase().contains("lifetime")
                ? "Unlimited Validity (Never expires)"
                : proposedEndDate.format(DateTimeFormatter.ofPattern("dd MMM yyyy"));

        String merchantUpiId = "ajalkarkalyani90-1@oksbi";
        String merchantName = "Ajalkar InfoTech";
        String upiPaymentUri = String.format(
                "upi://pay?pa=%s&pn=%s&am=%s&cu=INR&tn=%s",
                merchantUpiId,
                "Ajalkar%20InfoTech",
                totalAmount.toPlainString(),
                "Order%20" + orderRef.replace("#", "")
        );

        SubscriptionPayment payment = new SubscriptionPayment();
        payment.setBusiness(business);
        payment.setPlan(plan);
        payment.setOrderId(orderId);
        payment.setOrderRef(orderRef);
        payment.setPlatform(platform);
        payment.setPlanType(planType);
        payment.setDurationType(durationType);
        payment.setHardwareIncluded(hardwareIncluded);
        payment.setBillingCycle(cycle);
        payment.setCurrency("INR");
        payment.setBaseAmount(baseAmount);
        payment.setTaxAmount(taxAmount);
        payment.setTotalAmount(totalAmount);
        payment.setStatus("PENDING");
        payment.setVerificationStatus("PENDING");
        payment.setGatewayName("UPI_QR");
        payment.setPaymentMethod(req.getPaymentMethod() != null ? req.getPaymentMethod() : "QR");
        payment.setNotes("Plan: " + platform + " - " + planType + " (" + durationType + ") Ref: " + orderRef);

        payment = paymentRepo.save(payment);

        boolean isTestMode = (razorpayKeyId == null || razorpayKeyId.isBlank());

        return OrderResponse.builder()
                .orderId(orderId)
                .orderRef(orderRef)
                .planId(plan.getId())
                .planName(plan.getName())
                .platform(platform)
                .planType(planType)
                .durationType(durationType)
                .hardwareIncluded(hardwareIncluded)
                .proposedValidity(proposedValidity)
                .merchantUpiId(merchantUpiId)
                .merchantName(merchantName)
                .upiPaymentUri(upiPaymentUri)
                .supportPhone("+91 8825818177")
                .billingCycle(cycle.name())
                .currency("INR")
                .baseAmount(baseAmount)
                .taxAmount(taxAmount)
                .totalAmount(totalAmount)
                .keyId(isTestMode ? "rzp_test_placeholder" : razorpayKeyId)
                .businessName(business.getName())
                .businessEmail(business.getContactEmail() != null ? business.getContactEmail() : "admin@hotel.local")
                .businessPhone(business.getPhone() != null ? business.getPhone() : "9999999999")
                .isTestMode(isTestMode)
                .build();
    }

    @Transactional
    public SubmitVerificationResponse submitPaymentVerification(SubmitVerificationRequest req) {
        Long businessId = currentUser.businessId();
        Business business = currentUser.get().getBusiness();

        if ((req.getOrderId() == null || req.getOrderId().isBlank()) &&
            (req.getOrderRef() == null || req.getOrderRef().isBlank())) {
            throw new BadRequestException("Order ID or Order Reference is required");
        }

        if (req.getUtrNumber() == null || req.getUtrNumber().trim().length() < 6) {
            throw new BadRequestException("Valid Transaction / UTR number (min 6 characters) is required");
        }

        SubscriptionPayment payment = null;
        if (req.getOrderId() != null && !req.getOrderId().isBlank()) {
            payment = paymentRepo.findByOrderId(req.getOrderId()).orElse(null);
        }
        if (payment == null && req.getOrderRef() != null && !req.getOrderRef().isBlank()) {
            payment = paymentRepo.findByOrderRef(req.getOrderRef().trim()).orElse(null);
        }

        if (payment == null) {
            // Self-create fallback payment record if frontend generated order directly
            SubscriptionPlan fallbackPlan = planRepo.findAll().stream().findFirst().orElse(null);
            payment = new SubscriptionPayment();
            payment.setBusiness(business);
            payment.setPlan(fallbackPlan);
            payment.setOrderId("order_sub_" + System.currentTimeMillis());
            payment.setOrderRef(req.getOrderRef() != null ? req.getOrderRef().trim() : "#" + (10000 + new Random().nextInt(90000)));
            payment.setBillingCycle(BillingCycle.ANNUAL);
            payment.setCurrency("INR");
            payment.setBaseAmount(BigDecimal.valueOf(2999.00));
            payment.setTaxAmount(BigDecimal.valueOf(539.82));
            payment.setTotalAmount(BigDecimal.valueOf(3538.82));
            payment.setPlatform("Mobile + Desktop");
            payment.setPlanType("Software Only");
            payment.setDurationType("1 Year");
            payment.setHardwareIncluded("None");
        }

        if (!payment.getBusiness().getId().equals(businessId)) {
            throw new BadRequestException("Payment order does not belong to this business");
        }

        payment.setUtrNumber(req.getUtrNumber().trim());
        if (req.getScreenshotData() != null && !req.getScreenshotData().isBlank()) {
            payment.setScreenshotUrl(req.getScreenshotData());
        }
        payment.setPaymentMethod(req.getPaymentMethod() != null ? req.getPaymentMethod() : "QR");
        payment.setStatus("PENDING_VERIFICATION");
        payment.setVerificationStatus("PENDING_VERIFICATION");
        payment.setPaidAt(LocalDateTime.now());
        if (req.getNotes() != null) {
            payment.setNotes(req.getNotes());
        }
        payment = paymentRepo.save(payment);

        // Early Renewal Guarantee: Automatically extend validity upon submission
        SubscriptionPlan plan = payment.getPlan();
        if (plan == null) {
            plan = planRepo.findAll().stream().findFirst().orElse(null);
        }
        List<BusinessSubscription> existingSubs = subscriptionRepo.findAllByBusinessId(businessId);
        BusinessSubscription current = existingSubs.isEmpty() ? null : existingSubs.get(0);

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startDate = (current != null && current.getEndDate() != null && current.getEndDate().isAfter(now))
                ? current.getStartDate()
                : now;

        int daysToAdd = 365;
        String dur = payment.getDurationType() != null ? payment.getDurationType().toLowerCase() : "";
        if (dur.contains("3 year")) {
            daysToAdd = 1095;
        } else if (dur.contains("lifetime")) {
            daysToAdd = 36500;
        }

        LocalDateTime baseExpiry = (current != null && current.getEndDate() != null && current.getEndDate().isAfter(now))
                ? current.getEndDate()
                : now;
        LocalDateTime endDate = baseExpiry.plusDays(daysToAdd);

        BusinessSubscription targetSub = (current != null) ? current : new BusinessSubscription();
        targetSub.setBusiness(business);
        targetSub.setPlan(plan);
        targetSub.setStatus(SubscriptionStatus.ACTIVE);
        targetSub.setTrial(false);
        targetSub.setStartDate(startDate);
        targetSub.setEndDate(endDate);
        if (payment.getPlatform() != null) targetSub.setPlatform(payment.getPlatform());
        if (payment.getPlanType() != null) targetSub.setPlanType(payment.getPlanType());
        if (payment.getDurationType() != null) targetSub.setDurationType(payment.getDurationType());
        if (payment.getHardwareIncluded() != null) targetSub.setHardwareIncluded(payment.getHardwareIncluded());
        targetSub.setLastPaymentId(payment.getId());

        targetSub = subscriptionRepo.save(targetSub);
        payment.setSubscription(targetSub);
        paymentRepo.save(payment);

        syncToHotelSettings(business, targetSub);

        try {
            SubscriptionHistory h = new SubscriptionHistory();
            h.setBusiness(business);
            h.setSubscription(targetSub);
            h.setPreviousStatus(current != null ? current.getStatus().name() : null);
            h.setNewStatus("ACTIVE");
            h.setAction("RENEWAL_VERIFICATION_SUBMITTED");
            h.setDescription("Renewal proof submitted for Order " + payment.getOrderRef() + " (UTR: " + payment.getUtrNumber() + ")");
            h.setPerformedBy(currentUser.get().getUsername());
            historyRepo.save(h);
        } catch (Exception ignored) {}

        sendNotificationIfNotExists(business, "SUBSCRIPTION",
                "Renewal Submitted",
                "Payment verification submitted with UTR: " + payment.getUtrNumber() +
                ". Your subscription is renewed until " + endDate.format(DateTimeFormatter.ofPattern("dd MMM yyyy")) + ".");

        SubscriptionStatusResponse statusResponse = mapToStatusResponse(targetSub, now);

        return SubmitVerificationResponse.builder()
                .success(true)
                .message("Payment verification submitted successfully. Subscription renewed with Early Renewal Guarantee.")
                .orderRef(payment.getOrderRef())
                .verificationStatus("PENDING_VERIFICATION")
                .subscription(statusResponse)
                .payment(mapPaymentToMap(payment))
                .build();
    }

    @Transactional
    public VerifyPaymentResponse verifyPayment(VerifyPaymentRequest req) {
        Long businessId = currentUser.businessId();
        Business business = currentUser.get().getBusiness();

        if (req.getOrderId() == null || req.getOrderId().isBlank()) {
            throw new BadRequestException("Order ID is required");
        }

        SubscriptionPayment payment = paymentRepo.findByOrderId(req.getOrderId())
                .orElseThrow(() -> new NotFoundException("Payment order not found: " + req.getOrderId()));

        if (!payment.getBusiness().getId().equals(businessId)) {
            throw new BadRequestException("Payment order does not belong to this business");
        }

        // Idempotency check: if already verified as SUCCESS, return current status
        if ("SUCCESS".equalsIgnoreCase(payment.getStatus())) {
            SubscriptionStatusResponse currentStatus = getCurrentSubscription();
            return VerifyPaymentResponse.builder()
                    .success(true)
                    .message("Payment already verified and subscription is active.")
                    .subscription(currentStatus)
                    .payment(mapPaymentToMap(payment))
                    .build();
        }

        // Verify Signature if Razorpay secret is configured
        boolean signatureVerified = false;
        if (razorpayKeySecret != null && !razorpayKeySecret.isBlank()) {
            if (req.getSignature() == null || req.getPaymentId() == null) {
                recordPaymentFailure(payment, "Missing payment signature or payment ID");
                throw new BadRequestException("Payment signature verification failed: missing parameters");
            }
            signatureVerified = verifyRazorpaySignature(req.getOrderId(), req.getPaymentId(), req.getSignature(), razorpayKeySecret);
            if (!signatureVerified) {
                recordPaymentFailure(payment, "Signature mismatch");
                throw new BadRequestException("Payment signature verification failed: invalid signature");
            }
        } else {
            // Test Mode: verify valid paymentId is submitted
            if (req.getPaymentId() == null || req.getPaymentId().isBlank()) {
                recordPaymentFailure(payment, "No payment ID provided in test mode");
                throw new BadRequestException("Payment verification failed: valid Payment ID is required");
            }
            signatureVerified = true;
        }

        // Mark payment as SUCCESS
        payment.setStatus("SUCCESS");
        payment.setPaymentId(req.getPaymentId());
        payment.setSignature(req.getSignature());
        payment.setPaidAt(LocalDateTime.now());
        if (req.getPaymentMethod() != null && !req.getPaymentMethod().isBlank()) {
            payment.setPaymentMethod(req.getPaymentMethod());
        }
        payment = paymentRepo.save(payment);

        // Renew / Upgrade Subscription
        SubscriptionPlan plan = payment.getPlan();
        BillingCycle cycle = payment.getBillingCycle();

        List<BusinessSubscription> existingSubs = subscriptionRepo.findAllByBusinessId(businessId);
        BusinessSubscription current = existingSubs.isEmpty() ? null : existingSubs.get(0);

        LocalDateTime startDate = LocalDateTime.now();
        LocalDateTime endDate;

        // If currently active and non-trial, extend from previous end date to prevent loss of paid days
        if (current != null && current.getStatus() == SubscriptionStatus.ACTIVE && !current.isTrial() 
                && current.getEndDate().isAfter(LocalDateTime.now())) {
            startDate = current.getStartDate();
            endDate = cycle == BillingCycle.ANNUAL ? current.getEndDate().plusDays(365) : current.getEndDate().plusDays(30);
        } else {
            endDate = cycle == BillingCycle.ANNUAL ? startDate.plusDays(365) : startDate.plusDays(30);
        }

        BusinessSubscription newSub = new BusinessSubscription();
        newSub.setBusiness(business);
        newSub.setPlan(plan);
        newSub.setBillingCycle(cycle);
        newSub.setStatus(SubscriptionStatus.ACTIVE);
        newSub.setTrial(false);
        newSub.setTrialStartDate(current != null ? current.getTrialStartDate() : null);
        newSub.setTrialEndDate(current != null ? current.getTrialEndDate() : null);
        newSub.setStartDate(startDate);
        newSub.setEndDate(endDate);
        newSub.setAutoRenew(false);
        newSub.setLastPaymentId(payment.getId());

        newSub = subscriptionRepo.save(newSub);
        payment.setSubscription(newSub);
        paymentRepo.save(payment);

        syncToHotelSettings(business, newSub);

        try {
            SubscriptionHistory h = new SubscriptionHistory();
            h.setBusiness(business);
            h.setSubscription(newSub);
            h.setPreviousStatus(current != null ? current.getStatus().name() : null);
            h.setNewStatus("ACTIVE");
            h.setAction("PAYMENT_SUCCESS_ACTIVATE");
            h.setDescription("Subscription activated via payment order: " + payment.getOrderId() + " (" + plan.getName() + " - " + cycle.name() + ")");
            h.setPerformedBy(currentUser.get().getUsername());
            historyRepo.save(h);
        } catch (Exception ignored) {}

        // Send notifications
        sendNotificationIfNotExists(business, "PAYMENT",
                "Payment Successful",
                "Your payment of ₹" + payment.getTotalAmount() + " was successful and your " + plan.getName() + " subscription is now active.");

        sendNotificationIfNotExists(business, "SUBSCRIPTION",
                "Subscription Upgraded / Renewed",
                "Your subscription has been successfully updated to " + plan.getName() + " (" + cycle.name() + "). Validity until " + 
                        endDate.format(DateTimeFormatter.ofPattern("dd MMM yyyy")) + ".");

        SubscriptionStatusResponse statusResponse = mapToStatusResponse(newSub, LocalDateTime.now());

        return VerifyPaymentResponse.builder()
                .success(true)
                .message("Payment verified successfully and subscription activated.")
                .subscription(statusResponse)
                .payment(mapPaymentToMap(payment))
                .build();
    }

    private void recordPaymentFailure(SubscriptionPayment payment, String reason) {
        payment.setStatus("FAILED");
        payment.setNotes(payment.getNotes() + " | Failed: " + reason);
        paymentRepo.save(payment);

        sendNotificationIfNotExists(payment.getBusiness(), "PAYMENT",
                "Payment Failed",
                "Your payment could not be completed: " + reason + ". Please try again.");
    }

    private boolean verifyRazorpaySignature(String orderId, String paymentId, String signature, String secret) {
        try {
            String payload = orderId + "|" + paymentId;
            Mac sha256 = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256.init(secretKey);
            byte[] hash = sha256.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return MessageDigest.isEqual(hexString.toString().getBytes(StandardCharsets.UTF_8), signature.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.error("Signature verification error: {}", e.getMessage());
            return false;
        }
    }

    private BusinessSubscription initializeDefaultTrial(Business business) {
        String industry = business.getIndustryType() != null ? business.getIndustryType().name() : "HOTEL";
        SubscriptionPlan plan = planRepo.findAllByIndustryCodeAndIsActiveTrue(industry).stream()
                .filter(p -> "ENTERPRISE".equalsIgnoreCase(p.getTier()) || p.isPopular())
                .findFirst()
                .orElseGet(() -> planRepo.findAllByIsActiveTrue().get(0));

        LocalDateTime start = LocalDateTime.now();
        LocalDateTime end = start.plusDays(TRIAL_DAYS);

        BusinessSubscription sub = new BusinessSubscription();
        sub.setBusiness(business);
        sub.setPlan(plan);
        sub.setBillingCycle(BillingCycle.TRIAL);
        sub.setStatus(SubscriptionStatus.TRIAL_ACTIVE);
        sub.setTrial(true);
        sub.setTrialStartDate(start);
        sub.setTrialEndDate(end);
        sub.setStartDate(start);
        sub.setEndDate(end);
        sub.setAutoRenew(false);

        sub = subscriptionRepo.save(sub);
        syncToHotelSettings(business, sub);

        try {
            SubscriptionHistory h = new SubscriptionHistory();
            h.setBusiness(business);
            h.setSubscription(sub);
            h.setPreviousStatus(null);
            h.setNewStatus("TRIAL_ACTIVE");
            h.setAction("TRIAL_INITIALIZED");
            h.setDescription("Automatic 28-day free trial initialized upon registration");
            h.setPerformedBy("SYSTEM");
            historyRepo.save(h);
        } catch (Exception ignored) {}

        return sub;
    }

    private void syncToHotelSettings(Business business, BusinessSubscription sub) {
        try {
            saveOrUpdateSetting(business, "licence", "licence_version", sub.getPlan().getTier());
            saveOrUpdateSetting(business, "licence", "subscription_plan", sub.getPlan().getName());
            saveOrUpdateSetting(business, "licence", "trial_status", sub.isTrial() ? 
                    (sub.getStatus() == SubscriptionStatus.TRIAL_EXPIRED ? "Expired" : "Active") : "Active");
            saveOrUpdateSetting(business, "licence", "trial_duration_days", String.valueOf(TRIAL_DAYS));
            saveOrUpdateSetting(business, "licence", "trial_start_date", sub.getStartDate().toString());
            saveOrUpdateSetting(business, "licence", "trial_end_date", sub.getEndDate().toString());
            saveOrUpdateSetting(business, "licence", "renewal_date", sub.getEndDate().toLocalDate().toString());
            saveOrUpdateSetting(business, "licence", "subscription_status", 
                    sub.getStatus() == SubscriptionStatus.ACTIVE ? "Active & Verified" : 
                    sub.getStatus() == SubscriptionStatus.TRIAL_ACTIVE ? "Active" : "Expired");
        } catch (Exception e) {
            log.warn("Failed to sync subscription to hotel_settings: {}", e.getMessage());
        }
    }

    private void saveOrUpdateSetting(Business business, String category, String key, String value) {
        HotelSetting setting = settingRepo.findByBusinessIdAndCategoryAndSettingKey(business.getId(), category, key)
                .orElseGet(() -> {
                    HotelSetting s = new HotelSetting();
                    s.setBusiness(business);
                    s.setCategory(category);
                    s.setSettingKey(key);
                    return s;
                });
        setting.setSettingValue(value);
        settingRepo.save(setting);
    }

    private void checkAndSendExpiryReminders(Business business, BusinessSubscription sub, LocalDateTime now) {
        if (sub.getStatus() != SubscriptionStatus.TRIAL_ACTIVE && sub.getStatus() != SubscriptionStatus.ACTIVE) {
            return;
        }

        Duration duration = Duration.between(now, sub.getEndDate());
        long hours = duration.toHours();
        long days = (hours + 23) / 24;

        if (days == 7) {
            String title = sub.isTrial() ? "Trial Reminder: 7 Days Remaining" : "Subscription Renewal Reminder: 7 Days Remaining";
            String msg = "Your " + (sub.isTrial() ? "free trial" : "subscription") + " will expire in 7 days. Renew your plan to avoid interruption.";
            sendNotificationIfNotExists(business, "REMINDER", title, msg);
        } else if (days == 3) {
            String title = sub.isTrial() ? "Trial Reminder: 3 Days Remaining" : "Subscription Renewal Reminder: 3 Days Remaining";
            String msg = "Only 3 days left on your " + (sub.isTrial() ? "free trial" : "subscription") + ". Upgrade or renew now.";
            sendNotificationIfNotExists(business, "REMINDER", title, msg);
        } else if (days == 1) {
            String title = sub.isTrial() ? "Trial Reminder: 1 Day Left!" : "Subscription Renewal Reminder: 1 Day Left!";
            String msg = "Your " + (sub.isTrial() ? "free trial" : "subscription") + " expires tomorrow. Complete renewal today.";
            sendNotificationIfNotExists(business, "REMINDER", title, msg);
        }
    }

    private void sendNotificationIfNotExists(Business business, String type, String title, String message) {
        try {
            boolean exists = notificationRepo.existsByBusinessIdAndTypeAndTitle(business.getId(), type, title);
            if (!exists) {
                Notification n = new Notification();
                n.setBusiness(business);
                n.setType(type);
                n.setTitle(title);
                n.setMessage(message);
                n.setRead(false);
                notificationRepo.save(n);
            }
        } catch (Exception e) {
            log.warn("Could not record notification [{}]: {}", title, e.getMessage());
        }
    }

    private SubscriptionStatusResponse mapToStatusResponse(BusinessSubscription sub, LocalDateTime now) {
        Duration duration = Duration.between(now, sub.getEndDate());
        long diffSeconds = duration.getSeconds();
        long daysRemaining = 0;
        long hoursRemaining = 0;

        if (diffSeconds > 0) {
            daysRemaining = (diffSeconds + 86399) / 86400; // ceiling
            hoursRemaining = diffSeconds / 3600;
        }

        if (sub.isTrial() && daysRemaining > TRIAL_DAYS) {
            daysRemaining = TRIAL_DAYS;
        }

        boolean isExpired = (diffSeconds <= 0) || 
                            (sub.getStatus() == SubscriptionStatus.TRIAL_EXPIRED) || 
                            (sub.getStatus() == SubscriptionStatus.EXPIRED);

        String displayStatus;
        if (sub.isTrial()) {
            if (isExpired) {
                displayStatus = "Trial Expired";
            } else if (daysRemaining == 28) {
                displayStatus = "28 Days Free Trial";
            } else {
                displayStatus = "Trial: " + daysRemaining + " Days Left";
            }
        } else {
            if (isExpired) {
                displayStatus = "Subscription Expired";
            } else {
                displayStatus = "Subscription Active";
            }
        }

        List<String> features = parseFeatures(sub.getPlan().getFeaturesJson());

        return SubscriptionStatusResponse.builder()
                .id(sub.getId())
                .businessId(sub.getBusiness().getId())
                .planId(sub.getPlan().getId())
                .planCode(sub.getPlan().getPlanCode())
                .planName(sub.getPlan().getName())
                .industryCode(sub.getPlan().getIndustryCode())
                .tier(sub.getPlan().getTier())
                .billingCycle(sub.getBillingCycle().name())
                .status(sub.getStatus().name())
                .isTrial(sub.isTrial())
                .isEligibleForTrial(false)
                .trialStartDate(sub.getTrialStartDate() != null ? sub.getTrialStartDate().toString() : null)
                .trialEndDate(sub.getTrialEndDate() != null ? sub.getTrialEndDate().toString() : null)
                .startDate(sub.getStartDate().toString())
                .endDate(sub.getEndDate().toString())
                .daysRemaining(daysRemaining)
                .hoursRemaining(hoursRemaining)
                .secondsRemaining(Math.max(0, diffSeconds))
                .serverTimestamp(now.toString())
                .displayStatus(displayStatus)
                .licenseStatus(isExpired ? "Expired" : "Active")
                .canOperate(!isExpired)
                .autoRenew(sub.isAutoRenew())
                .lastPaymentId(sub.getLastPaymentId())
                .features(features)
                .monthlyPrice(sub.getPlan().getMonthlyPrice())
                .annualPricePerMonth(sub.getPlan().getAnnualPricePerMonth())
                .maxRooms(sub.getPlan().getMaxRooms())
                .maxStaff(sub.getPlan().getMaxStaff())
                .maxBranches(sub.getPlan().getMaxBranches())
                .maxUsers(sub.getPlan().getMaxUsers())
                .build();
    }

    private PlanDto mapToPlanDto(SubscriptionPlan plan) {
        BigDecimal monthlyPrice = plan.getMonthlyPrice();
        BigDecimal annualPrice = plan.getAnnualPricePerMonth();

        BigDecimal monthlyTax = monthlyPrice.multiply(GST_RATE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal monthlyTotal = monthlyPrice.add(monthlyTax).setScale(2, RoundingMode.HALF_UP);

        BigDecimal annualBase = annualPrice.multiply(BigDecimal.valueOf(12)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal annualTax = annualBase.multiply(GST_RATE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal annualTotal = annualBase.add(annualTax).setScale(2, RoundingMode.HALF_UP);

        return PlanDto.builder()
                .id(plan.getId())
                .planCode(plan.getPlanCode())
                .name(plan.getName())
                .industryCode(plan.getIndustryCode())
                .tier(plan.getTier())
                .monthlyPrice(monthlyPrice)
                .annualPricePerMonth(annualPrice)
                .trialDurationDays(plan.getTrialDurationDays())
                .features(parseFeatures(plan.getFeaturesJson()))
                .description(plan.getDescription())
                .isPopular(plan.isPopular())
                .isActive(plan.isActive())
                .currency(plan.getCurrency())
                .billingInterval(plan.getBillingInterval())
                .billingDuration(plan.getBillingDuration())
                .taxConfiguration(plan.getTaxConfiguration())
                .maxRooms(plan.getMaxRooms())
                .maxStaff(plan.getMaxStaff())
                .maxBranches(plan.getMaxBranches())
                .maxUsers(plan.getMaxUsers())
                .taxRatePercent(new BigDecimal("18.0"))
                .monthlyTax(monthlyTax)
                .monthlyTotal(monthlyTotal)
                .annualBase(annualBase)
                .annualTax(annualTax)
                .annualTotal(annualTotal)
                .build();
    }

    private List<String> parseFeatures(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private Map<String, Object> mapPaymentToMap(SubscriptionPayment p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("orderId", p.getOrderId());
        m.put("paymentId", p.getPaymentId());
        m.put("status", p.getStatus());
        m.put("billingCycle", p.getBillingCycle().name());
        m.put("baseAmount", p.getBaseAmount());
        m.put("taxAmount", p.getTaxAmount());
        m.put("totalAmount", p.getTotalAmount());
        m.put("paymentMethod", p.getPaymentMethod());
        m.put("paidAt", p.getPaidAt() != null ? p.getPaidAt().toString() : null);
        return m;
    }
}
