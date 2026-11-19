package com.hotelmanagement.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelmanagement.dto.SubscriptionDtos.*;
import com.hotelmanagement.entity.*;
import com.hotelmanagement.enums.IndustryType;
import com.hotelmanagement.enums.SubscriptionStatus;
import com.hotelmanagement.exception.BadRequestException;
import com.hotelmanagement.exception.NotFoundException;
import com.hotelmanagement.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class SuperAdminSubscriptionService {

    private static final Logger log = LoggerFactory.getLogger(SuperAdminSubscriptionService.class);
    private static final BigDecimal GST_RATE = new BigDecimal("0.18");

    private final BusinessRepository businessRepo;
    private final BranchRepository branchRepo;
    private final SubscriptionPlanRepository planRepo;
    private final BusinessSubscriptionRepository subscriptionRepo;
    private final SubscriptionPaymentRepository paymentRepo;
    private final SubscriptionHistoryRepository historyRepo;
    private final SubscriptionNotificationRepository notificationRepo;
    private final ObjectMapper objectMapper;

    public SuperAdminSubscriptionService(BusinessRepository businessRepo,
                                         BranchRepository branchRepo,
                                         SubscriptionPlanRepository planRepo,
                                         BusinessSubscriptionRepository subscriptionRepo,
                                         SubscriptionPaymentRepository paymentRepo,
                                         SubscriptionHistoryRepository historyRepo,
                                         SubscriptionNotificationRepository notificationRepo,
                                         ObjectMapper objectMapper) {
        this.businessRepo = businessRepo;
        this.branchRepo = branchRepo;
        this.planRepo = planRepo;
        this.subscriptionRepo = subscriptionRepo;
        this.paymentRepo = paymentRepo;
        this.historyRepo = historyRepo;
        this.notificationRepo = notificationRepo;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public SuperAdminKpiResponse getDashboardKpis() {
        long totalHotels = businessRepo.count();
        long activeTrials = subscriptionRepo.countTrialByStatus(SubscriptionStatus.TRIAL_ACTIVE);
        long activeSubs = subscriptionRepo.countPaidByStatus(SubscriptionStatus.ACTIVE);
        long expiredTrials = subscriptionRepo.countTrialByStatus(SubscriptionStatus.TRIAL_EXPIRED);
        long expiredSubs = subscriptionRepo.countPaidByStatus(SubscriptionStatus.EXPIRED);
        long cancelled = subscriptionRepo.countByStatus(SubscriptionStatus.CANCELLED);

        BigDecimal revenue = paymentRepo.sumTotalRevenue();
        long pending = paymentRepo.countByStatus("PENDING");
        long failed = paymentRepo.countByStatus("FAILED");

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime soon = now.plusDays(7);
        long expiringSoon = subscriptionRepo.countExpiringSoon(now, soon);

        double totalCompletedTrials = activeSubs + expiredTrials;
        double conversionRate = totalCompletedTrials > 0 ? (activeSubs * 100.0) / totalCompletedTrials : 0.0;
        conversionRate = Math.round(conversionRate * 10.0) / 10.0;

        return SuperAdminKpiResponse.builder()
                .totalHotels(totalHotels)
                .activeTrials(activeTrials)
                .activeSubscriptions(activeSubs)
                .expiredTrials(expiredTrials)
                .expiredSubscriptions(expiredSubs)
                .cancelledSubscriptions(cancelled)
                .totalRevenue(revenue != null ? revenue : BigDecimal.ZERO)
                .pendingPayments(pending)
                .failedPayments(failed)
                .expiringSoon(expiringSoon)
                .trialConversionRate(conversionRate)
                .build();
    }

    @Transactional(readOnly = true)
    public SuperAdminAnalyticsResponse getDashboardAnalytics() {
        LocalDateTime sixMonthsAgo = LocalDateTime.now().minusMonths(6);
        List<SubscriptionPayment> recentSuccess = paymentRepo.findSuccessfulPaymentsSince(sixMonthsAgo);

        Map<String, BigDecimal> monthlyTotals = new TreeMap<>();
        DateTimeFormatter monthFmt = DateTimeFormatter.ofPattern("MMM yyyy");
        for (int i = 5; i >= 0; i--) {
            monthlyTotals.put(LocalDateTime.now().minusMonths(i).format(monthFmt), BigDecimal.ZERO);
        }

        for (SubscriptionPayment p : recentSuccess) {
            if (p.getPaidAt() != null) {
                String m = p.getPaidAt().format(monthFmt);
                monthlyTotals.put(m, monthlyTotals.getOrDefault(m, BigDecimal.ZERO).add(p.getTotalAmount()));
            }
        }

        List<Map<String, Object>> monthlyList = new ArrayList<>();
        for (Map.Entry<String, BigDecimal> e : monthlyTotals.entrySet()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("month", e.getKey());
            row.put("revenue", e.getValue().setScale(2, RoundingMode.HALF_UP));
            monthlyList.add(row);
        }

        Map<String, Long> statusDist = new LinkedHashMap<>();
        statusDist.put("TRIAL_ACTIVE", subscriptionRepo.countTrialByStatus(SubscriptionStatus.TRIAL_ACTIVE));
        statusDist.put("ACTIVE", subscriptionRepo.countPaidByStatus(SubscriptionStatus.ACTIVE));
        statusDist.put("TRIAL_EXPIRED", subscriptionRepo.countTrialByStatus(SubscriptionStatus.TRIAL_EXPIRED));
        statusDist.put("EXPIRED", subscriptionRepo.countPaidByStatus(SubscriptionStatus.EXPIRED));
        statusDist.put("CANCELLED", subscriptionRepo.countByStatus(SubscriptionStatus.CANCELLED));

        Map<String, Long> planDist = new LinkedHashMap<>();
        for (SubscriptionPlan plan : planRepo.findAll()) {
            long count = subscriptionRepo.findAll().stream()
                    .filter(s -> s.getPlan() != null && s.getPlan().getId().equals(plan.getId()))
                    .count();
            planDist.put(plan.getName(), count);
        }

        long activeSubs = statusDist.getOrDefault("ACTIVE", 0L);
        long expiredTrials = statusDist.getOrDefault("TRIAL_EXPIRED", 0L);
        double totalCompletedTrials = activeSubs + expiredTrials;
        double conversionRate = totalCompletedTrials > 0 ? (activeSubs * 100.0) / totalCompletedTrials : 0.0;
        conversionRate = Math.round(conversionRate * 10.0) / 10.0;

        return SuperAdminAnalyticsResponse.builder()
                .monthlyRevenue(monthlyList)
                .statusDistribution(statusDist)
                .planDistribution(planDist)
                .conversionRate(conversionRate)
                .build();
    }

    @Transactional(readOnly = true)
    public List<HotelSubscriptionSummaryDto> getAllHotelSubscriptions() {
        List<Business> businesses = businessRepo.findAll();
        List<HotelSubscriptionSummaryDto> list = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (Business b : businesses) {
            List<BusinessSubscription> subs = subscriptionRepo.findAllByBusinessId(b.getId());
            BusinessSubscription s = subs.isEmpty() ? null : subs.get(0);

            int branchCount = branchRepo.findAllByBusinessId(b.getId()).size();

            BigDecimal totalPaid = paymentRepo.findAllByBusinessId(b.getId()).stream()
                    .filter(p -> "SUCCESS".equalsIgnoreCase(p.getStatus()))
                    .map(SubscriptionPayment::getTotalAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            Optional<SubscriptionPayment> lastPayment = paymentRepo.findAllByBusinessId(b.getId()).stream()
                    .filter(p -> "SUCCESS".equalsIgnoreCase(p.getStatus()) && p.getPaidAt() != null)
                    .max(Comparator.comparing(SubscriptionPayment::getPaidAt));

            long daysRemaining = 0;
            if (s != null && s.getEndDate() != null && s.getEndDate().isAfter(now)) {
                daysRemaining = Duration.between(now, s.getEndDate()).toDays();
            }

            list.add(HotelSubscriptionSummaryDto.builder()
                    .subscriptionId(s != null ? s.getId() : null)
                    .businessId(b.getId())
                    .businessName(b.getName())
                    .businessCode(b.getCode())
                    .ownerName(b.getOwnerName() != null ? b.getOwnerName() : "Hotel Owner")
                    .contactEmail(b.getContactEmail() != null ? b.getContactEmail() : "—")
                    .phone(b.getPhone() != null ? b.getPhone() : "—")
                    .city(b.getCity())
                    .branchCount(branchCount)
                    .planId(s != null && s.getPlan() != null ? s.getPlan().getId() : null)
                    .planName(s != null && s.getPlan() != null ? s.getPlan().getName() : "No Plan")
                    .tier(s != null && s.getPlan() != null ? s.getPlan().getTier() : "None")
                    .status(s != null ? s.getStatus().name() : "INACTIVE")
                    .isTrial(s != null && s.isTrial())
                    .trialStartDate(s != null && s.getTrialStartDate() != null ? s.getTrialStartDate().toString() : null)
                    .trialEndDate(s != null && s.getTrialEndDate() != null ? s.getTrialEndDate().toString() : null)
                    .startDate(s != null && s.getStartDate() != null ? s.getStartDate().toString() : null)
                    .endDate(s != null && s.getEndDate() != null ? s.getEndDate().toString() : null)
                    .daysRemaining(daysRemaining)
                    .autoRenew(s != null && s.isAutoRenew())
                    .totalPaid(totalPaid)
                    .lastPaymentDate(lastPayment.map(p -> p.getPaidAt().toString()).orElse(null))
                    .build());
        }

        return list;
    }

    @Transactional(readOnly = true)
    public List<PlanDto> getAllPlans() {
        return planRepo.findAll().stream().map(this::mapToPlanDto).toList();
    }

    @Transactional
    public PlanDto createPlan(PlanSaveRequest req, String adminUsername) {
        if (req.getPlanCode() == null || req.getPlanCode().isBlank()) {
            throw new BadRequestException("Plan code is required");
        }
        if (planRepo.findByPlanCode(req.getPlanCode().trim().toUpperCase()).isPresent()) {
            throw new BadRequestException("Plan code already exists: " + req.getPlanCode());
        }

        SubscriptionPlan plan = new SubscriptionPlan();
        updatePlanFields(plan, req);
        plan = planRepo.save(plan);

        recordAuditLog(null, null, null, "CREATE", "PLAN", "Created new subscription plan: " + plan.getName(), adminUsername);
        return mapToPlanDto(plan);
    }

    @Transactional
    public PlanDto updatePlan(Long planId, PlanSaveRequest req, String adminUsername) {
        SubscriptionPlan plan = planRepo.findById(planId)
                .orElseThrow(() -> new NotFoundException("Plan not found: " + planId));

        String oldName = plan.getName();
        updatePlanFields(plan, req);
        plan = planRepo.save(plan);

        recordAuditLog(null, null, null, "UPDATE", "PLAN", "Updated subscription plan: " + oldName + " -> " + plan.getName(), adminUsername);
        return mapToPlanDto(plan);
    }

    @Transactional
    public void togglePlanStatus(Long planId, boolean active, String adminUsername) {
        SubscriptionPlan plan = planRepo.findById(planId)
                .orElseThrow(() -> new NotFoundException("Plan not found: " + planId));
        plan.setActive(active);
        planRepo.save(plan);

        recordAuditLog(null, null, null, active ? "ACTIVATE" : "DEACTIVATE", "PLAN",
                (active ? "Activated" : "Deactivated") + " plan: " + plan.getName(), adminUsername);
    }

    @Transactional
    public void deletePlan(Long planId, String adminUsername) {
        SubscriptionPlan plan = planRepo.findById(planId)
                .orElseThrow(() -> new NotFoundException("Plan not found: " + planId));

        long usageCount = subscriptionRepo.findAll().stream()
                .filter(s -> s.getPlan() != null && s.getPlan().getId().equals(planId))
                .count();

        if (usageCount > 0) {
            // Cannot delete in-use plan: archive it instead
            plan.setActive(false);
            planRepo.save(plan);
            recordAuditLog(null, null, null, "ARCHIVE", "PLAN",
                    "Archived plan (cannot delete in-use plan): " + plan.getName(), adminUsername);
        } else {
            planRepo.delete(plan);
            recordAuditLog(null, null, null, "DELETE", "PLAN",
                    "Deleted subscription plan: " + plan.getName(), adminUsername);
        }
    }

    @Transactional
    public SubscriptionStatusResponse activateSubscription(Long subscriptionId, String adminUsername) {
        BusinessSubscription sub = subscriptionRepo.findById(subscriptionId)
                .orElseThrow(() -> new NotFoundException("Subscription not found: " + subscriptionId));

        SubscriptionStatus prev = sub.getStatus();
        sub.setStatus(SubscriptionStatus.ACTIVE);
        sub.setTrial(false);
        if (sub.getEndDate() == null || sub.getEndDate().isBefore(LocalDateTime.now())) {
            sub.setStartDate(LocalDateTime.now());
            sub.setEndDate(LocalDateTime.now().plusDays(30));
        }
        sub = subscriptionRepo.save(sub);

        recordSubscriptionHistory(sub.getBusiness(), sub, prev != null ? prev.name() : null, "ACTIVE",
                "ADMIN_ACTIVATE", "Super Admin manually activated subscription", adminUsername);
        return mapToStatusResponse(sub);
    }

    @Transactional
    public SubscriptionStatusResponse suspendSubscription(Long subscriptionId, String reason, String adminUsername) {
        BusinessSubscription sub = subscriptionRepo.findById(subscriptionId)
                .orElseThrow(() -> new NotFoundException("Subscription not found: " + subscriptionId));

        SubscriptionStatus prev = sub.getStatus();
        sub.setStatus(SubscriptionStatus.SUSPENDED);
        sub = subscriptionRepo.save(sub);

        recordSubscriptionHistory(sub.getBusiness(), sub, prev != null ? prev.name() : null, "SUSPENDED",
                "ADMIN_SUSPEND", "Suspended by Super Admin: " + (reason != null ? reason : "Administrative suspension"), adminUsername);
        return mapToStatusResponse(sub);
    }

    @Transactional
    public SubscriptionStatusResponse resumeSubscription(Long subscriptionId, String adminUsername) {
        BusinessSubscription sub = subscriptionRepo.findById(subscriptionId)
                .orElseThrow(() -> new NotFoundException("Subscription not found: " + subscriptionId));

        SubscriptionStatus prev = sub.getStatus();
        SubscriptionStatus target = sub.isTrial() ? SubscriptionStatus.TRIAL_ACTIVE : SubscriptionStatus.ACTIVE;
        sub.setStatus(target);
        sub = subscriptionRepo.save(sub);

        recordSubscriptionHistory(sub.getBusiness(), sub, prev != null ? prev.name() : null, target.name(),
                "ADMIN_RESUME", "Resumed by Super Admin", adminUsername);
        return mapToStatusResponse(sub);
    }

    @Transactional
    public SubscriptionStatusResponse cancelSubscription(Long subscriptionId, String reason, String adminUsername) {
        BusinessSubscription sub = subscriptionRepo.findById(subscriptionId)
                .orElseThrow(() -> new NotFoundException("Subscription not found: " + subscriptionId));

        SubscriptionStatus prev = sub.getStatus();
        sub.setStatus(SubscriptionStatus.CANCELLED);
        sub = subscriptionRepo.save(sub);

        recordSubscriptionHistory(sub.getBusiness(), sub, prev != null ? prev.name() : null, "CANCELLED",
                "ADMIN_CANCEL", "Cancelled by Super Admin: " + (reason != null ? reason : "Administrative cancellation"), adminUsername);
        return mapToStatusResponse(sub);
    }

    @Transactional
    public SubscriptionStatusResponse extendSubscription(Long subscriptionId, int days, String reason, String adminUsername) {
        if (days <= 0) {
            throw new BadRequestException("Extension days must be greater than zero");
        }

        BusinessSubscription sub = subscriptionRepo.findById(subscriptionId)
                .orElseThrow(() -> new NotFoundException("Subscription not found: " + subscriptionId));

        SubscriptionStatus prev = sub.getStatus();
        LocalDateTime baseDate = sub.getEndDate() != null && sub.getEndDate().isAfter(LocalDateTime.now()) ?
                sub.getEndDate() : LocalDateTime.now();

        sub.setEndDate(baseDate.plusDays(days));
        if (sub.isTrial()) {
            sub.setTrialEndDate(sub.getEndDate());
            sub.setStatus(SubscriptionStatus.TRIAL_ACTIVE);
        } else {
            sub.setStatus(SubscriptionStatus.ACTIVE);
        }

        sub = subscriptionRepo.save(sub);

        recordSubscriptionHistory(sub.getBusiness(), sub, prev != null ? prev.name() : null, sub.getStatus().name(),
                "ADMIN_EXTEND", "Super Admin extended validity by " + days + " days. Reason: " + (reason != null ? reason : "Administrative extension"), adminUsername);
        return mapToStatusResponse(sub);
    }

    @Transactional(readOnly = true)
    public List<SubscriptionHistoryDto> getAllHistory() {
        return historyRepo.findAllOrdered().stream().map(h -> SubscriptionHistoryDto.builder()
                .id(h.getId())
                .businessId(h.getBusiness().getId())
                .businessName(h.getBusiness().getName())
                .subscriptionId(h.getSubscription() != null ? h.getSubscription().getId() : null)
                .previousStatus(h.getPreviousStatus())
                .newStatus(h.getNewStatus())
                .action(h.getAction())
                .description(h.getDescription())
                .performedBy(h.getPerformedBy())
                .createdAt(h.getCreatedAt().toString())
                .build()).toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllPayments() {
        return paymentRepo.findAllOrdered().stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("businessId", p.getBusiness().getId());
            m.put("businessName", p.getBusiness().getName());
            m.put("planId", p.getPlan().getId());
            m.put("planName", p.getPlan().getName());
            m.put("orderId", p.getOrderId());
            m.put("paymentId", p.getPaymentId());
            m.put("currency", p.getCurrency());
            m.put("baseAmount", p.getBaseAmount());
            m.put("taxAmount", p.getTaxAmount());
            m.put("totalAmount", p.getTotalAmount());
            m.put("status", p.getStatus());
            m.put("billingCycle", p.getBillingCycle().name());
            m.put("paymentMethod", p.getPaymentMethod());
            m.put("gatewayName", p.getGatewayName());
            m.put("paidAt", p.getPaidAt() != null ? p.getPaidAt().toString() : null);
            m.put("createdAt", p.getCreatedAt().toString());
            return m;
        }).toList();
    }

    private void updatePlanFields(SubscriptionPlan plan, PlanSaveRequest req) {
        if (req.getPlanCode() != null) plan.setPlanCode(req.getPlanCode().trim().toUpperCase());
        if (req.getName() != null) plan.setName(req.getName().trim());
        if (req.getIndustryCode() != null) plan.setIndustryCode(req.getIndustryCode().trim().toUpperCase());
        if (req.getTier() != null) plan.setTier(req.getTier().trim().toUpperCase());
        if (req.getMonthlyPrice() != null) plan.setMonthlyPrice(req.getMonthlyPrice());
        if (req.getAnnualPricePerMonth() != null) plan.setAnnualPricePerMonth(req.getAnnualPricePerMonth());
        if (req.getTrialDurationDays() != null) plan.setTrialDurationDays(req.getTrialDurationDays());
        if (req.getDescription() != null) plan.setDescription(req.getDescription());
        if (req.getCurrency() != null) plan.setCurrency(req.getCurrency());
        if (req.getBillingInterval() != null) plan.setBillingInterval(req.getBillingInterval());
        if (req.getBillingDuration() != null) plan.setBillingDuration(req.getBillingDuration());
        if (req.getTaxConfiguration() != null) plan.setTaxConfiguration(req.getTaxConfiguration());
        if (req.getMaxRooms() != null) plan.setMaxRooms(req.getMaxRooms());
        if (req.getMaxStaff() != null) plan.setMaxStaff(req.getMaxStaff());
        if (req.getMaxBranches() != null) plan.setMaxBranches(req.getMaxBranches());
        if (req.getMaxUsers() != null) plan.setMaxUsers(req.getMaxUsers());
        if (req.getIsPopular() != null) plan.setPopular(req.getIsPopular());
        if (req.getIsActive() != null) plan.setActive(req.getIsActive());

        if (req.getFeatures() != null) {
            try {
                plan.setFeaturesJson(objectMapper.writeValueAsString(req.getFeatures()));
            } catch (Exception e) {
                plan.setFeaturesJson("[]");
            }
        } else if (plan.getFeaturesJson() == null) {
            plan.setFeaturesJson("[]");
        }
    }

    private void recordSubscriptionHistory(Business business, BusinessSubscription sub,
                                           String prevStatus, String newStatus,
                                           String action, String desc, String performedBy) {
        try {
            SubscriptionHistory h = new SubscriptionHistory();
            h.setBusiness(business);
            h.setSubscription(sub);
            h.setPreviousStatus(prevStatus);
            h.setNewStatus(newStatus);
            h.setAction(action);
            h.setDescription(desc);
            h.setPerformedBy(performedBy != null ? performedBy : "SUPER_ADMIN");
            historyRepo.save(h);
        } catch (Exception e) {
            log.warn("Failed to record subscription history: {}", e.getMessage());
        }
    }

    private void recordAuditLog(Business business, Long subId, String prevVal, String action, String entityType, String newVal, String adminUser) {
        try {
            SubscriptionHistory h = new SubscriptionHistory();
            if (business != null) {
                h.setBusiness(business);
            } else {
                businessRepo.findAll().stream().findFirst().ifPresent(h::setBusiness);
            }
            h.setPreviousStatus(prevVal);
            h.setNewStatus(newVal);
            h.setAction(action);
            h.setDescription(entityType + ": " + newVal);
            h.setPerformedBy(adminUser != null ? adminUser : "SUPER_ADMIN");
            historyRepo.save(h);
        } catch (Exception e) {
            log.warn("Failed to record audit log: {}", e.getMessage());
        }
    }

    private PlanDto mapToPlanDto(SubscriptionPlan plan) {
        BigDecimal monthlyPrice = plan.getMonthlyPrice() != null ? plan.getMonthlyPrice() : BigDecimal.ZERO;
        BigDecimal annualPrice = plan.getAnnualPricePerMonth() != null ? plan.getAnnualPricePerMonth() : BigDecimal.ZERO;

        BigDecimal monthlyTax = monthlyPrice.multiply(GST_RATE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal monthlyTotal = monthlyPrice.add(monthlyTax).setScale(2, RoundingMode.HALF_UP);

        BigDecimal annualBase = annualPrice.multiply(BigDecimal.valueOf(12)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal annualTax = annualBase.multiply(GST_RATE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal annualTotal = annualBase.add(annualTax).setScale(2, RoundingMode.HALF_UP);

        List<String> features = List.of();
        try {
            if (plan.getFeaturesJson() != null) {
                features = objectMapper.readValue(plan.getFeaturesJson(), new TypeReference<List<String>>() {});
            }
        } catch (Exception ignored) {}

        return PlanDto.builder()
                .id(plan.getId())
                .planCode(plan.getPlanCode())
                .name(plan.getName())
                .industryCode(plan.getIndustryCode())
                .tier(plan.getTier())
                .monthlyPrice(monthlyPrice)
                .annualPricePerMonth(annualPrice)
                .trialDurationDays(plan.getTrialDurationDays() != null ? plan.getTrialDurationDays() : 28)
                .features(features)
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

    private SubscriptionStatusResponse mapToStatusResponse(BusinessSubscription sub) {
        LocalDateTime now = LocalDateTime.now();
        Duration duration = Duration.between(now, sub.getEndDate() != null ? sub.getEndDate() : now);
        long diffSeconds = duration.getSeconds();
        long daysRemaining = diffSeconds > 0 ? (diffSeconds + 86399) / 86400 : 0;
        long hoursRemaining = diffSeconds > 0 ? diffSeconds / 3600 : 0;
        long secondsRemaining = Math.max(0, diffSeconds);

        return SubscriptionStatusResponse.builder()
                .id(sub.getId())
                .businessId(sub.getBusiness().getId())
                .planId(sub.getPlan() != null ? sub.getPlan().getId() : null)
                .planCode(sub.getPlan() != null ? sub.getPlan().getPlanCode() : null)
                .planName(sub.getPlan() != null ? sub.getPlan().getName() : null)
                .industryCode(sub.getPlan() != null ? sub.getPlan().getIndustryCode() : "HOTEL")
                .tier(sub.getPlan() != null ? sub.getPlan().getTier() : null)
                .billingCycle(sub.getBillingCycle().name())
                .status(sub.getStatus().name())
                .isTrial(sub.isTrial())
                .trialStartDate(sub.getTrialStartDate() != null ? sub.getTrialStartDate().toString() : null)
                .trialEndDate(sub.getTrialEndDate() != null ? sub.getTrialEndDate().toString() : null)
                .startDate(sub.getStartDate() != null ? sub.getStartDate().toString() : null)
                .endDate(sub.getEndDate() != null ? sub.getEndDate().toString() : null)
                .daysRemaining(daysRemaining)
                .hoursRemaining(hoursRemaining)
                .secondsRemaining(secondsRemaining)
                .serverTimestamp(now.toString())
                .displayStatus(sub.getStatus().name())
                .canOperate(sub.getStatus() == SubscriptionStatus.ACTIVE || sub.getStatus() == SubscriptionStatus.TRIAL_ACTIVE)
                .autoRenew(sub.isAutoRenew())
                .build();
    }
}

