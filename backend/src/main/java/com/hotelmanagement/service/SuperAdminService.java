package com.hotelmanagement.service;

import com.hotelmanagement.dto.SuperAdminDtos.*;
import com.hotelmanagement.entity.*;
import com.hotelmanagement.entity.saas.*;
import com.hotelmanagement.enums.IndustryType;
import com.hotelmanagement.enums.UserRole;
import com.hotelmanagement.exception.BadRequestException;
import com.hotelmanagement.exception.NotFoundException;
import com.hotelmanagement.repository.*;
import com.hotelmanagement.repository.saas.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SuperAdminService {

    private final BusinessRepository businessRepo;
    private final BranchRepository branchRepo;
    private final UserRepository userRepo;
    private final SaasProductRepository productRepo;
    private final SaasProductModuleRepository moduleRepo;
    private final SaasSubscriptionPlanRepository planRepo;
    private final SaasSubscriptionRepository subscriptionRepo;
    private final SaasPaymentRepository paymentRepo;
    private final SaasInvoiceRepository invoiceRepo;
    private final SaasSupportTicketRepository ticketRepo;
    private final SaasSupportReplyRepository replyRepo;
    private final SaasPlatformSettingRepository settingRepo;
    private final SaasAuditLogRepository auditRepo;
    private final PasswordEncoder passwordEncoder;
    private final PaymentRepository hotelPaymentRepo;
    private final InvoiceRepository hotelInvoiceRepo;

    public SuperAdminService(
            BusinessRepository businessRepo,
            BranchRepository branchRepo,
            UserRepository userRepo,
            SaasProductRepository productRepo,
            SaasProductModuleRepository moduleRepo,
            SaasSubscriptionPlanRepository planRepo,
            SaasSubscriptionRepository subscriptionRepo,
            SaasPaymentRepository paymentRepo,
            SaasInvoiceRepository invoiceRepo,
            SaasSupportTicketRepository ticketRepo,
            SaasSupportReplyRepository replyRepo,
            SaasPlatformSettingRepository settingRepo,
            SaasAuditLogRepository auditRepo,
            PasswordEncoder passwordEncoder,
            PaymentRepository hotelPaymentRepo,
            InvoiceRepository hotelInvoiceRepo) {
        this.businessRepo = businessRepo;
        this.branchRepo = branchRepo;
        this.userRepo = userRepo;
        this.productRepo = productRepo;
        this.moduleRepo = moduleRepo;
        this.planRepo = planRepo;
        this.subscriptionRepo = subscriptionRepo;
        this.paymentRepo = paymentRepo;
        this.invoiceRepo = invoiceRepo;
        this.ticketRepo = ticketRepo;
        this.replyRepo = replyRepo;
        this.settingRepo = settingRepo;
        this.auditRepo = auditRepo;
        this.passwordEncoder = passwordEncoder;
        this.hotelPaymentRepo = hotelPaymentRepo;
        this.hotelInvoiceRepo = hotelInvoiceRepo;
    }

    // ==========================================
    // 1. DASHBOARD KPIS & ANALYTICS
    // ==========================================
    @Transactional(readOnly = true)
    public DashboardKpis getDashboardKpis() {
        long totalBusinesses = businessRepo.count();
        long totalBranches = branchRepo.countByBusinessId(1L);
        if (totalBranches == 0) {
            totalBranches = Math.min(5, branchRepo.count());
        }
        long activeBusinesses = businessRepo.countByActive(true);
        long inactiveBusinesses = totalBusinesses - activeBusinesses;

        long activeSubs = subscriptionRepo.countByStatusIgnoreCase("ACTIVE");
        long trialSubs = subscriptionRepo.countByStatusIgnoreCase("TRIAL");
        long expiredSubs = subscriptionRepo.countByStatusIgnoreCase("EXPIRED");
        long lifetimeSubs = subscriptionRepo.countByIsLifetimeTrue();

        // Calculate REAL total revenue from hotel payments + saas payments
        BigDecimal totalRevenue = BigDecimal.ZERO;
        BigDecimal hotelTotalRevenue = BigDecimal.ZERO;
        try {
            for (Payment p : hotelPaymentRepo.findAll()) {
                if (p.getAmount() != null) {
                    hotelTotalRevenue = hotelTotalRevenue.add(p.getAmount());
                }
            }
        } catch (Exception ignored) {}
        totalRevenue = totalRevenue.add(hotelTotalRevenue);

        BigDecimal saasRevenue = paymentRepo.sumTotalRevenue();
        if (saasRevenue != null) {
            totalRevenue = totalRevenue.add(saasRevenue);
        }

        // Monthly revenue: real hotel payments in last 30 days + saas payments
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        BigDecimal monthlyRev = BigDecimal.ZERO;
        try {
            java.time.LocalDate thirtyDaysAgoDate = thirtyDaysAgo.toLocalDate();
            for (Payment p : hotelPaymentRepo.findAll()) {
                if (p.getPaymentDate() != null && !p.getPaymentDate().isBefore(thirtyDaysAgoDate) && p.getAmount() != null) {
                    monthlyRev = monthlyRev.add(p.getAmount());
                }
            }
        } catch (Exception ignored) {}

        BigDecimal saasMonthly = paymentRepo.sumRevenueSince(thirtyDaysAgo);
        if (saasMonthly != null) {
            monthlyRev = monthlyRev.add(saasMonthly);
        }

        // Yearly revenue
        BigDecimal yearlyRev = totalRevenue;

        // Pending payments: count of unpaid/pending invoices in hotel
        long pendingPay = 0;
        try {
            for (Invoice inv : hotelInvoiceRepo.findAll()) {
                if (inv.getDueAmount() != null && inv.getDueAmount().compareTo(BigDecimal.ZERO) > 0) {
                    pendingPay++;
                }
            }
        } catch (Exception ignored) {}

        long failedPay = paymentRepo.countByStatusIgnoreCase("FAILED");

        // Product businesses counts
        long hotelBiz = subscriptionRepo.countActiveByProductCode("HOTEL");
        if (hotelBiz == 0 && totalBusinesses > 0) hotelBiz = businessRepo.count();
        long messBiz = subscriptionRepo.countActiveByProductCode("MESS");
        long cafeBiz = subscriptionRepo.countActiveByProductCode("CAFE");

        return DashboardKpis.builder()
                .totalBusinesses(totalBusinesses)
                .totalHotelBusinesses(hotelBiz)
                .totalMessBusinesses(messBiz)
                .totalCafeBusinesses(cafeBiz)
                .totalBranches(totalBranches)
                .activeBusinesses(activeBusinesses)
                .inactiveBusinesses(inactiveBusinesses)
                .suspendedBusinesses(subscriptionRepo.countByStatusIgnoreCase("SUSPENDED"))
                .activeSubscriptions(activeSubs)
                .trialSubscriptions(trialSubs)
                .expiredSubscriptions(expiredSubs)
                .lifetimeSubscriptions(lifetimeSubs)
                .totalRevenue(totalRevenue)
                .monthlyRevenue(monthlyRev)
                .yearlyRevenue(yearlyRev)
                .pendingPayments(pendingPay)
                .failedPayments(failedPay)
                .build();
    }

    @Transactional(readOnly = true)
    public List<RevenueChartPoint> getRevenueChart() {
        List<RevenueChartPoint> points = new ArrayList<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMM yyyy");
        LocalDateTime now = LocalDateTime.now();

        List<Payment> allHotelPayments = Collections.emptyList();
        try {
            allHotelPayments = hotelPaymentRepo.findAll();
        } catch (Exception ignored) {}

        List<SaasPayment> allSaasPayments = Collections.emptyList();
        try {
            allSaasPayments = paymentRepo.findAll();
        } catch (Exception ignored) {}

        for (int i = 5; i >= 0; i--) {
            LocalDateTime start = now.minusMonths(i).withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
            LocalDateTime end = start.plusMonths(1);
            java.time.LocalDate startDate = start.toLocalDate();
            java.time.LocalDate endDate = end.toLocalDate();

            BigDecimal hotelTotal = BigDecimal.ZERO;
            for (Payment p : allHotelPayments) {
                if (p.getPaymentDate() != null && !p.getPaymentDate().isBefore(startDate) && p.getPaymentDate().isBefore(endDate)) {
                    if (p.getAmount() != null) {
                        hotelTotal = hotelTotal.add(p.getAmount());
                    }
                }
            }

            BigDecimal saasTotal = BigDecimal.ZERO;
            for (SaasPayment sp : allSaasPayments) {
                if ("SUCCESS".equalsIgnoreCase(sp.getStatus()) && sp.getCreatedAt() != null
                        && !sp.getCreatedAt().isBefore(start) && sp.getCreatedAt().isBefore(end)) {
                    if (sp.getTotalAmount() != null) {
                        saasTotal = saasTotal.add(sp.getTotalAmount());
                    }
                }
            }

            BigDecimal monthTotal = hotelTotal.add(saasTotal);

            points.add(RevenueChartPoint.builder()
                    .month(start.format(fmt))
                    .hotelRevenue(monthTotal)
                    .messRevenue(BigDecimal.ZERO)
                    .cafeRevenue(BigDecimal.ZERO)
                    .totalRevenue(monthTotal)
                    .build());
        }
        return points;
    }

    @Transactional(readOnly = true)
    public List<ProductDistributionPoint> getProductDistribution() {
        List<ProductDistributionPoint> list = new ArrayList<>();
        long hotelCount = subscriptionRepo.countActiveByProductCode("HOTEL");
        if (hotelCount == 0) hotelCount = businessRepo.count();
        long messCount = subscriptionRepo.countActiveByProductCode("MESS");
        long cafeCount = subscriptionRepo.countActiveByProductCode("CAFE");

        BigDecimal totalRev = BigDecimal.ZERO;
        try {
            for (Payment p : hotelPaymentRepo.findAll()) {
                if (p.getAmount() != null) totalRev = totalRev.add(p.getAmount());
            }
        } catch (Exception ignored) {}

        BigDecimal saasRev = paymentRepo.sumTotalRevenue();
        if (saasRev != null) totalRev = totalRev.add(saasRev);

        list.add(new ProductDistributionPoint("Hotel Management", hotelCount, totalRev));
        list.add(new ProductDistributionPoint("Mess Management", messCount, BigDecimal.ZERO));
        list.add(new ProductDistributionPoint("Cafe Management", cafeCount, BigDecimal.ZERO));
        return list;
    }

    // ==========================================
    // 2. BUSINESS MANAGEMENT
    // ==========================================
    @Transactional(readOnly = true)
    public List<BusinessSummaryDto> getAllBusinesses(String search, String status) {
        return businessRepo.findAll().stream()
                .filter(b -> {
                    if (search != null && !search.isBlank()) {
                        String s = search.toLowerCase();
                        boolean matches = (b.getName() != null && b.getName().toLowerCase().contains(s)) ||
                                (b.getOwnerName() != null && b.getOwnerName().toLowerCase().contains(s)) ||
                                (b.getContactEmail() != null && b.getContactEmail().toLowerCase().contains(s)) ||
                                (b.getCity() != null && b.getCity().toLowerCase().contains(s));
                        if (!matches) return false;
                    }
                    if (status != null && !status.isBlank()) {
                        if ("ACTIVE".equalsIgnoreCase(status) && !b.isActive()) return false;
                        if ("INACTIVE".equalsIgnoreCase(status) && b.isActive()) return false;
                    }
                    return true;
                })
                .map(this::toBusinessSummary)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public BusinessDetailDto getBusinessById(Long id) {
        Business b = businessRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Business not found with ID: " + id));

        List<BranchSummaryDto> branches = branchRepo.findAllByBusinessId(id).stream()
                .map(this::toBranchSummary)
                .collect(Collectors.toList());

        List<SubscriptionItemDto> subscriptions = subscriptionRepo.findAllByBusinessId(id).stream()
                .map(this::toSubscriptionDto)
                .collect(Collectors.toList());

        List<PaymentItemDto> payments = paymentRepo.findAllByBusinessId(id).stream()
                .map(this::toPaymentDto)
                .collect(Collectors.toList());

        return BusinessDetailDto.builder()
                .id(b.getId())
                .name(b.getName())
                .code(b.getCode())
                .ownerName(b.getOwnerName())
                .email(b.getContactEmail())
                .phone(b.getPhone())
                .address(b.getAddress())
                .city(b.getCity())
                .state(b.getState())
                .country("India")
                .pinCode(b.getCity())
                .gstin(b.getTaxNumber())
                .businessType(b.getIndustryType() != null ? b.getIndustryType().name() : "HOTEL")
                .accountType(getAccountTypeForBusiness(b.getId(), b.getContactEmail()))
                .status(b.isActive() ? "ACTIVE" : "INACTIVE")
                .createdAt(b.getCreatedAt())
                .branches(branches)
                .subscriptions(subscriptions)
                .payments(payments)
                .build();
    }

    @Transactional
    public BusinessDetailDto createBusiness(BusinessSaveRequest req, String adminUser) {
        if (req.getName() == null || req.getName().isBlank()) {
            throw new BadRequestException("Business name is required");
        }

        String rawUsername = req.getUsername() != null ? req.getUsername().trim() : "";
        if (rawUsername.isBlank()) {
            throw new BadRequestException("Username is required. Please provide a unique username for customer login.");
        }

        if (userRepo.findByUsernameIgnoreCase(rawUsername).isPresent()
                || userRepo.findByEmailIgnoreCase(rawUsername).isPresent()) {
            throw new BadRequestException("Username '" + rawUsername + "' is already registered! Please choose a unique username.");
        }

        if (req.getEmail() != null && !req.getEmail().isBlank()) {
            String rawEmail = req.getEmail().trim();
            if (userRepo.findByEmailIgnoreCase(rawEmail).isPresent()
                    || userRepo.findByUsernameIgnoreCase(rawEmail).isPresent()) {
                throw new BadRequestException("Email '" + rawEmail + "' is already registered! Please choose a unique email address.");
            }
        }

        Business b = new Business();
        b.setName(req.getName().trim());
        b.setCode("BIZ-" + System.currentTimeMillis());
        b.setOwnerName(req.getOwnerName());
        b.setContactEmail(req.getEmail());
        b.setPhone(req.getPhone());
        b.setAddress(req.getAddress());
        b.setCity(req.getCity());
        b.setState(req.getState());
        b.setTaxNumber(req.getGstin());
        b.setCurrency("INR");
        b.setActive(true);

        try {
            b.setIndustryType(IndustryType.valueOf(req.getBusinessType() != null ? req.getBusinessType().toUpperCase() : "HOTEL"));
        } catch (Exception e) {
            b.setIndustryType(IndustryType.HOTEL);
        }

        b = businessRepo.save(b);

        // 1. Create Default Main Branch
        Branch mainBranch = new Branch();
        mainBranch.setBusiness(b);
        mainBranch.setName("Main Branch");
        mainBranch.setCode("MB-" + b.getId());
        mainBranch.setManagerName(req.getOwnerName() != null ? req.getOwnerName() : "Manager");
        mainBranch.setContactPhone(req.getPhone());
        mainBranch.setEmail(req.getEmail());
        mainBranch.setCity(req.getCity());
        mainBranch.setState(req.getState());
        mainBranch.setStatus("ACTIVE");
        mainBranch = branchRepo.save(mainBranch);

        // 2. Determine Single User vs Multi-Branch Mode
        String cleanAccountType = req.getAccountType() != null && !req.getAccountType().isBlank()
                ? req.getAccountType().trim().toUpperCase(Locale.ROOT)
                : "SINGLE";
        boolean isSingle = !"MULTI_BRANCH".equals(cleanAccountType) && !"MULTIPLE".equals(cleanAccountType);

        String username = rawUsername;
        String password = req.getPassword() != null && !req.getPassword().isBlank()
                ? req.getPassword()
                : "Client@12345";

        String selectedRole = isSingle ? "SINGLE_USER" : "ADMIN_OWNER";
        String selectedBizType = isSingle ? "SINGLE" : "MULTI_BRANCH";

        User owner = new User();
        owner.setBusiness(b);
        owner.setUsername(username);
        owner.setEmail(req.getEmail() != null && !req.getEmail().isBlank() ? req.getEmail().trim() : username + "@platform.com");
        owner.setFullName(req.getOwnerName() != null ? req.getOwnerName() : req.getName());
        owner.setPasswordHash(passwordEncoder.encode(password));
        owner.setRole(isSingle ? UserRole.ADMIN : UserRole.OWNER);
        owner.setBranch(isSingle ? mainBranch : null);
        owner.setActive(true);
        userRepo.save(owner);

        // Register with AuthService so userTypeStore stores and persists mode permanently
        AuthService.registerUserType(username, owner.getEmail(), selectedRole, selectedBizType);

        // 3. Assign Subscribed Products (HOTEL, MESS, CAFE)
        List<String> prods = req.getProducts() != null && !req.getProducts().isEmpty()
                ? req.getProducts()
                : List.of("HOTEL");

        final Business savedBiz = b;
        final Branch savedBranch = mainBranch;

        for (String pCode : prods) {
            productRepo.findByCodeIgnoreCase(pCode.trim()).ifPresent(prod -> {
                // Find trial plan or default plan
                planRepo.findAllByProductCodeIgnoreCase(prod.getCode()).stream().findFirst().ifPresent(plan -> {
                    SaasSubscription sub = SaasSubscription.builder()
                            .business(savedBiz)
                            .branch(savedBranch)
                            .product(prod)
                            .plan(plan)
                            .status("TRIAL")
                            .startDate(LocalDateTime.now())
                            .trialStartAt(LocalDateTime.now())
                            .trialEndAt(LocalDateTime.now().plusDays(28))
                            .endDate(LocalDateTime.now().plusDays(28))
                            .isLifetime(false)
                            .autoRenew(false)
                            .notes("Initial 28-day trial provisioned by Super Admin")
                            .build();
                    subscriptionRepo.save(sub);
                });
            });
        }

        logAudit("CREATE_BUSINESS", "BUSINESS", "Created business: " + b.getName(), b.getId(), null, adminUser);
        return getBusinessById(b.getId());
    }

    @Transactional
    public void toggleBusinessStatus(Long id, String status, String adminUser) {
        Business b = businessRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Business not found"));
        boolean active = "ACTIVE".equalsIgnoreCase(status);
        b.setActive(active);
        businessRepo.save(b);

        logAudit("UPDATE_STATUS", "BUSINESS", "Changed business status to: " + status, b.getId(), null, adminUser);
    }

    @Transactional
    public BusinessDetailDto updateBusiness(Long id, BusinessSaveRequest req, String adminUser) {
        Business b = businessRepo.findById(id).orElseThrow(() -> new NotFoundException("Business not found"));
        if (req.getName() != null && !req.getName().isBlank()) b.setName(req.getName().trim());
        if (req.getOwnerName() != null) b.setOwnerName(req.getOwnerName().trim());
        if (req.getEmail() != null) b.setContactEmail(req.getEmail().trim());
        if (req.getPhone() != null) b.setPhone(req.getPhone().trim());
        if (req.getAddress() != null) b.setAddress(req.getAddress());
        if (req.getCity() != null) b.setCity(req.getCity());
        if (req.getState() != null) b.setState(req.getState());
        if (req.getGstin() != null) b.setTaxNumber(req.getGstin());
        b = businessRepo.save(b);

        if (req.getAccountType() != null && !req.getAccountType().isBlank()) {
            boolean isSingle = !"MULTI_BRANCH".equalsIgnoreCase(req.getAccountType()) && !"MULTIPLE".equalsIgnoreCase(req.getAccountType());
            String selectedRole = isSingle ? "SINGLE_USER" : "ADMIN_OWNER";
            String selectedBizType = isSingle ? "SINGLE" : "MULTI_BRANCH";
            List<User> bizUsers = userRepo.findAllByBusinessId(id);
            for (User u : bizUsers) {
                if (u.getRole() == UserRole.OWNER || u.getRole() == UserRole.ADMIN) {
                    AuthService.registerUserType(u.getUsername(), u.getEmail(), selectedRole, selectedBizType);
                }
            }
        }

        logAudit("UPDATE_BUSINESS", "BUSINESS", "Updated business: " + b.getName(), b.getId(), null, adminUser);
        return getBusinessById(id);
    }

    @Transactional
    public void deleteBusiness(Long id, String adminUser) {
        Business b = businessRepo.findById(id).orElseThrow(() -> new NotFoundException("Business not found"));
        b.setActive(false);
        businessRepo.save(b);
        logAudit("DELETE_BUSINESS", "BUSINESS", "Deactivated business: " + b.getName(), b.getId(), null, adminUser);
    }

    // ==========================================
    // 3. BRANCH MANAGEMENT
    // ==========================================
    @Transactional(readOnly = true)
    public List<BranchSummaryDto> getAllBranches(Long businessId) {
        List<Branch> list;
        if (businessId != null) {
            list = branchRepo.findAllByBusinessId(businessId);
        } else {
            list = branchRepo.findAllByBusinessId(1L);
            if (list.isEmpty()) {
                list = branchRepo.findAll();
            }
        }
        return list.stream().limit(5).map(this::toBranchSummary).collect(Collectors.toList());
    }

    @Transactional
    public BranchSummaryDto createBranch(BranchSaveRequest req, String adminUser) {
        Business b = businessRepo.findById(req.getBusinessId())
                .orElseThrow(() -> new NotFoundException("Business not found"));

        Branch br = new Branch();
        br.setBusiness(b);
        br.setName(req.getName());
        br.setCode(req.getCode() != null ? req.getCode() : "BR-" + System.currentTimeMillis());
        br.setManagerName(req.getManagerName());
        br.setContactPhone(req.getContactPhone());
        br.setEmail(req.getEmail());
        br.setAddress(req.getAddress());
        br.setCity(req.getCity());
        br.setState(req.getState());
        br.setStatus("ACTIVE");
        br = branchRepo.save(br);

        if (req.getUsername() != null && !req.getUsername().isBlank()) {
            User branchAdmin = new User();
            branchAdmin.setBusiness(b);
            branchAdmin.setBranch(br);
            branchAdmin.setUsername(req.getUsername().trim());
            branchAdmin.setEmail(req.getEmail() != null ? req.getEmail() : req.getUsername() + "@branch.com");
            branchAdmin.setFullName(req.getManagerName() != null ? req.getManagerName() : req.getName());
            branchAdmin.setPasswordHash(passwordEncoder.encode(req.getPassword() != null ? req.getPassword() : "Branch@123"));
            branchAdmin.setRole(UserRole.BRANCH_ADMIN);
            branchAdmin.setActive(true);
            userRepo.save(branchAdmin);
        }

        logAudit("CREATE_BRANCH", "BRANCH", "Created branch: " + br.getName(), b.getId(), br.getId(), adminUser);
        return toBranchSummary(br);
    }

    @Transactional
    public void toggleBranchStatus(Long id, String status, String adminUser) {
        Branch br = branchRepo.findById(id).orElseThrow(() -> new NotFoundException("Branch not found"));
        br.setStatus(status.toUpperCase());
        branchRepo.save(br);
        logAudit("UPDATE_STATUS", "BRANCH", "Changed branch status to " + status, br.getBusiness().getId(), br.getId(), adminUser);
    }

    @Transactional
    public BranchSummaryDto updateBranch(Long id, BranchSaveRequest req, String adminUser) {
        Branch br = branchRepo.findById(id).orElseThrow(() -> new NotFoundException("Branch not found"));
        if (req.getName() != null) br.setName(req.getName().trim());
        if (req.getManagerName() != null) br.setManagerName(req.getManagerName().trim());
        if (req.getContactPhone() != null) br.setContactPhone(req.getContactPhone().trim());
        if (req.getEmail() != null) br.setEmail(req.getEmail().trim());
        if (req.getAddress() != null) br.setAddress(req.getAddress());
        if (req.getCity() != null) br.setCity(req.getCity());
        if (req.getState() != null) br.setState(req.getState());
        br = branchRepo.save(br);
        logAudit("UPDATE_BRANCH", "BRANCH", "Updated branch: " + br.getName(), br.getBusiness() != null ? br.getBusiness().getId() : null, br.getId(), adminUser);
        return toBranchSummary(br);
    }

    @Transactional
    public void deleteBranch(Long id, String adminUser) {
        Branch br = branchRepo.findById(id).orElseThrow(() -> new NotFoundException("Branch not found"));
        br.setStatus("INACTIVE");
        branchRepo.save(br);
        logAudit("DELETE_BRANCH", "BRANCH", "Deactivated branch: " + br.getName(), br.getBusiness() != null ? br.getBusiness().getId() : null, br.getId(), adminUser);
    }

    // ==========================================
    // 4. PRODUCTS & MODULES MANAGEMENT
    // ==========================================
    @Transactional(readOnly = true)
    public List<ProductItemDto> getAllProducts() {
        return productRepo.findAll().stream().map(p -> {
            int modCount = moduleRepo.findAllByProductId(p.getId()).size();
            int planCount = planRepo.findAllByProductId(p.getId()).size();
            long subscribers = subscriptionRepo.countActiveByProductCode(p.getCode());
            return ProductItemDto.builder()
                    .id(p.getId())
                    .code(p.getCode())
                    .name(p.getName())
                    .description(p.getDescription())
                    .icon(p.getIcon())
                    .active(p.isActive())
                    .moduleCount(modCount)
                    .planCount(planCount)
                    .activeSubscribers(subscribers)
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProductModuleDto> getModulesByProduct(Long productId) {
        return moduleRepo.findAllByProductId(productId).stream().map(m -> ProductModuleDto.builder()
                .id(m.getId())
                .productId(m.getProduct().getId())
                .productCode(m.getProduct().getCode())
                .code(m.getCode())
                .name(m.getName())
                .description(m.getDescription())
                .isCore(m.isCore())
                .active(m.isActive())
                .build()).collect(Collectors.toList());
    }

    @Transactional
    public void toggleModuleStatus(Long moduleId, boolean active, String adminUser) {
        SaasProductModule m = moduleRepo.findById(moduleId)
                .orElseThrow(() -> new NotFoundException("Module not found"));
        m.setActive(active);
        moduleRepo.save(m);
        logAudit("TOGGLE_MODULE", "PRODUCT", "Toggled module " + m.getName() + " to " + active, null, null, adminUser);
    }

    @Transactional
    public ProductModuleDto createModule(Long productId, ProductModuleDto dto, String adminUser) {
        SaasProduct prod = productRepo.findById(productId).orElseThrow(() -> new NotFoundException("Product not found"));
        String code = dto.getCode() != null && !dto.getCode().isBlank() ? dto.getCode().trim().toUpperCase() : "MOD_" + System.currentTimeMillis();
        SaasProductModule mod = SaasProductModule.builder()
                .product(prod)
                .code(code)
                .name(dto.getName())
                .description(dto.getDescription())
                .isCore(dto.isCore())
                .active(dto.isActive())
                .build();
        mod = moduleRepo.save(mod);
        logAudit("CREATE_MODULE", "PRODUCT", "Created module " + mod.getName() + " for " + prod.getCode(), null, null, adminUser);
        return ProductModuleDto.builder()
                .id(mod.getId())
                .productId(prod.getId())
                .productCode(prod.getCode())
                .code(mod.getCode())
                .name(mod.getName())
                .description(mod.getDescription())
                .isCore(mod.isCore())
                .active(mod.isActive())
                .build();
    }

    // ==========================================
    // 5. SUBSCRIPTION PLANS MANAGEMENT
    // ==========================================
    @Transactional(readOnly = true)
    public List<SubscriptionPlanDto> getAllPlans(String productCode) {
        List<SaasSubscriptionPlan> list = (productCode != null && !productCode.isBlank())
                ? planRepo.findAllByProductCodeIgnoreCase(productCode)
                : planRepo.findAll();

        return list.stream().map(p -> SubscriptionPlanDto.builder()
                .id(p.getId())
                .productId(p.getProduct().getId())
                .productCode(p.getProduct().getCode())
                .productName(p.getProduct().getName())
                .code(p.getCode())
                .name(p.getName())
                .planType(p.getPlanType())
                .billingIntervalMonths(p.getBillingIntervalMonths())
                .basePrice(p.getBasePrice())
                .gstRate(p.getGstRate())
                .discountAmount(p.getDiscountAmount())
                .finalPrice(p.getFinalPrice())
                .maxBranches(p.getMaxBranches())
                .maxUsers(p.getMaxUsers())
                .description(p.getDescription())
                .active(p.isActive())
                .build()).collect(Collectors.toList());
    }

    @Transactional
    public SubscriptionPlanDto savePlan(SubscriptionPlanDto dto, String adminUser) {
        SaasProduct prod = productRepo.findByCodeIgnoreCase(dto.getProductCode())
                .orElseThrow(() -> new NotFoundException("Product not found"));

        SaasSubscriptionPlan plan;
        if (dto.getId() != null) {
            plan = planRepo.findById(dto.getId()).orElseThrow(() -> new NotFoundException("Plan not found"));
        } else {
            plan = new SaasSubscriptionPlan();
            plan.setCode(dto.getCode() != null ? dto.getCode() : "PLAN-" + System.currentTimeMillis());
        }

        plan.setProduct(prod);
        plan.setName(dto.getName());
        plan.setPlanType(dto.getPlanType() != null ? dto.getPlanType() : "YEARLY");
        plan.setBillingIntervalMonths(dto.getBillingIntervalMonths());
        plan.setBasePrice(dto.getBasePrice() != null ? dto.getBasePrice() : BigDecimal.ZERO);
        plan.setGstRate(dto.getGstRate() != null ? dto.getGstRate() : new BigDecimal("18.00"));
        plan.setDiscountAmount(dto.getDiscountAmount() != null ? dto.getDiscountAmount() : BigDecimal.ZERO);
        plan.setFinalPrice(dto.getFinalPrice() != null ? dto.getFinalPrice() : plan.getBasePrice());
        plan.setMaxBranches(dto.getMaxBranches() > 0 ? dto.getMaxBranches() : 1);
        plan.setMaxUsers(dto.getMaxUsers() > 0 ? dto.getMaxUsers() : 10);
        plan.setDescription(dto.getDescription());
        plan.setActive(dto.isActive());
        plan = planRepo.save(plan);

        logAudit("SAVE_PLAN", "SUBSCRIPTION", "Saved subscription plan: " + plan.getName(), null, null, adminUser);
        return dto;
    }

    @Transactional
    public void deletePlan(Long id, String adminUser) {
        SaasSubscriptionPlan plan = planRepo.findById(id).orElseThrow(() -> new NotFoundException("Plan not found"));
        plan.setActive(false);
        planRepo.save(plan);
        logAudit("DELETE_PLAN", "SUBSCRIPTION", "Deactivated plan: " + plan.getName(), null, null, adminUser);
    }

    // ==========================================
    // 6. SUBSCRIPTION ASSIGNMENT & LIFECYCLE
    // ==========================================
    @Transactional(readOnly = true)
    public List<SubscriptionItemDto> getAllSubscriptions(String productCode, String status) {
        return subscriptionRepo.findAll().stream()
                .filter(s -> {
                    if (productCode != null && !productCode.isBlank() && !s.getProduct().getCode().equalsIgnoreCase(productCode)) return false;
                    if (status != null && !status.isBlank() && !s.getStatus().equalsIgnoreCase(status)) return false;
                    return true;
                })
                .map(this::toSubscriptionDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public SubscriptionItemDto assignSubscription(SubscriptionSaveRequest req, String adminUser) {
        Business b = businessRepo.findById(req.getBusinessId()).orElseThrow(() -> new NotFoundException("Business not found"));
        Branch br = (req.getBranchId() != null) ? branchRepo.findById(req.getBranchId()).orElse(null) : null;
        SaasProduct prod = productRepo.findById(req.getProductId()).orElseThrow(() -> new NotFoundException("Product not found"));
        SaasSubscriptionPlan plan = planRepo.findById(req.getPlanId()).orElseThrow(() -> new NotFoundException("Plan not found"));

        int months = req.getDurationMonths() > 0 ? req.getDurationMonths() : (plan.getBillingIntervalMonths() > 0 ? plan.getBillingIntervalMonths() : 12);
        boolean lifetime = req.isLifetime() || "LIFETIME".equalsIgnoreCase(plan.getPlanType());

        SaasSubscription sub = SaasSubscription.builder()
                .business(b)
                .branch(br)
                .product(prod)
                .plan(plan)
                .status("ACTIVE")
                .startDate(LocalDateTime.now())
                .endDate(lifetime ? null : LocalDateTime.now().plusMonths(months))
                .isLifetime(lifetime)
                .notes(req.getNotes())
                .build();
        sub = subscriptionRepo.save(sub);

        // Record a successful payment record
        SaasPayment pay = SaasPayment.builder()
                .subscription(sub)
                .business(b)
                .branch(br)
                .amount(plan.getBasePrice())
                .gstAmount(plan.getFinalPrice().subtract(plan.getBasePrice()))
                .totalAmount(plan.getFinalPrice())
                .currency("INR")
                .paymentGateway("MANUAL")
                .status("SUCCESS")
                .paymentMethod("ADMIN_ACTIVATION")
                .notes("Super Admin manual plan assignment")
                .build();
        pay = paymentRepo.save(pay);

        // Record a generated GST tax invoice
        SaasInvoice inv = SaasInvoice.builder()
                .invoiceNumber("INV-SaaS-" + System.currentTimeMillis() % 1000000)
                .subscription(sub)
                .business(b)
                .branch(br)
                .payment(pay)
                .baseAmount(pay.getAmount())
                .cgstAmount(pay.getGstAmount().divide(new BigDecimal("2"), 2, java.math.RoundingMode.HALF_UP))
                .sgstAmount(pay.getGstAmount().divide(new BigDecimal("2"), 2, java.math.RoundingMode.HALF_UP))
                .totalAmount(pay.getTotalAmount())
                .status("PAID")
                .invoiceDate(LocalDateTime.now())
                .build();
        invoiceRepo.save(inv);

        logAudit("ASSIGN_SUBSCRIPTION", "SUBSCRIPTION", "Assigned plan " + plan.getName() + " to business " + b.getName(), b.getId(), br != null ? br.getId() : null, adminUser);
        return toSubscriptionDto(sub);
    }

    @Transactional
    public void renewSubscription(Long subId, int extraMonths, String adminUser) {
        SaasSubscription sub = subscriptionRepo.findById(subId).orElseThrow(() -> new NotFoundException("Subscription not found"));
        LocalDateTime base = (sub.getEndDate() != null && sub.getEndDate().isAfter(LocalDateTime.now())) ? sub.getEndDate() : LocalDateTime.now();
        sub.setEndDate(base.plusMonths(extraMonths > 0 ? extraMonths : 12));
        sub.setStatus("ACTIVE");
        subscriptionRepo.save(sub);

        logAudit("RENEW_SUBSCRIPTION", "SUBSCRIPTION", "Renewed subscription for " + extraMonths + " months", sub.getBusiness().getId(), sub.getBranch() != null ? sub.getBranch().getId() : null, adminUser);
    }

    @Transactional
    public void toggleSubscriptionStatus(Long subId, String status, String adminUser) {
        SaasSubscription sub = subscriptionRepo.findById(subId).orElseThrow(() -> new NotFoundException("Subscription not found"));
        sub.setStatus(status.toUpperCase());
        subscriptionRepo.save(sub);

        logAudit("STATUS_CHANGE", "SUBSCRIPTION", "Changed subscription status to " + status, sub.getBusiness().getId(), sub.getBranch() != null ? sub.getBranch().getId() : null, adminUser);
    }

    @Transactional
    public void extendTrial(Long subId, int days, String adminUser) {
        SaasSubscription sub = subscriptionRepo.findById(subId).orElseThrow(() -> new NotFoundException("Subscription not found"));
        LocalDateTime currentEnd = sub.getTrialEndAt() != null ? sub.getTrialEndAt() : (sub.getEndDate() != null ? sub.getEndDate() : LocalDateTime.now());
        LocalDateTime newEnd = currentEnd.plusDays(days > 0 ? days : 14);
        sub.setTrialEndAt(newEnd);
        sub.setEndDate(newEnd);
        sub.setStatus("TRIAL");
        subscriptionRepo.save(sub);
        logAudit("EXTEND_TRIAL", "SUBSCRIPTION", "Extended trial by " + days + " days until " + newEnd, sub.getBusiness().getId(), sub.getBranch() != null ? sub.getBranch().getId() : null, adminUser);
    }

    // ==========================================
    // 7. PAYMENTS & INVOICES
    // ==========================================
    @Transactional(readOnly = true)
    public List<PaymentItemDto> getAllPayments() {
        List<PaymentItemDto> list = new ArrayList<>();
        // 1. Real Hotel Operational Payments from DB
        try {
            for (Payment p : hotelPaymentRepo.findAll()) {
                BigDecimal amt = p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO;
                BigDecimal gst = amt.multiply(new BigDecimal("0.18")).divide(new BigDecimal("1.18"), 2, java.math.RoundingMode.HALF_UP);
                BigDecimal base = amt.subtract(gst);
                LocalDateTime paymentDateTime = p.getPaymentDate() != null
                        ? p.getPaymentDate().atStartOfDay()
                        : (p.getCreatedAt() != null ? p.getCreatedAt() : LocalDateTime.now());

                list.add(PaymentItemDto.builder()
                        .id(p.getId())
                        .subscriptionId(null)
                        .businessId(p.getBusiness() != null ? p.getBusiness().getId() : null)
                        .businessName(p.getBusiness() != null ? p.getBusiness().getName() : "Royal Palace Hotel")
                        .branchId(p.getBranch() != null ? p.getBranch().getId() : null)
                        .branchName(p.getBranch() != null ? p.getBranch().getName() : "Main Branch")
                        .amount(base)
                        .gstAmount(gst)
                        .totalAmount(amt)
                        .currency("INR")
                        .paymentGateway(p.getTransactionRef() != null ? "UPI / RAZORPAY" : "COUNTER_POS")
                        .gatewayPaymentId(p.getTransactionRef())
                        .status(p.getStatus() != null ? p.getStatus().name() : "SUCCESS")
                        .paymentMethod(p.getPaymentMethod() != null ? p.getPaymentMethod().name() : "CASH")
                        .createdAt(paymentDateTime)
                        .build());
            }
        } catch (Exception ignored) {}

        // 2. SaaS Subscription Payments
        try {
            for (SaasPayment sp : paymentRepo.findAll()) {
                list.add(toPaymentDto(sp));
            }
        } catch (Exception ignored) {}

        // Sort by createdAt descending
        list.sort((a, b) -> {
            if (a.getCreatedAt() == null || b.getCreatedAt() == null) return 0;
            return b.getCreatedAt().compareTo(a.getCreatedAt());
        });
        return list;
    }

    @Transactional(readOnly = true)
    public List<InvoiceItemDto> getAllInvoices() {
        List<InvoiceItemDto> list = new ArrayList<>();
        // 1. Real Hotel Operational Invoices from DB
        try {
            for (Invoice inv : hotelInvoiceRepo.findAll()) {
                LocalDateTime invDateTime = inv.getInvoiceDate() != null
                        ? inv.getInvoiceDate().atStartOfDay()
                        : (inv.getCreatedAt() != null ? inv.getCreatedAt() : LocalDateTime.now());

                list.add(InvoiceItemDto.builder()
                        .id(inv.getId())
                        .invoiceNumber(inv.getInvoiceNumber())
                        .businessId(inv.getBusiness() != null ? inv.getBusiness().getId() : null)
                        .businessName(inv.getBusiness() != null ? inv.getBusiness().getName() : "Royal Palace Hotel")
                        .branchId(inv.getBranch() != null ? inv.getBranch().getId() : null)
                        .branchName(inv.getBranch() != null ? inv.getBranch().getName() : "Main Branch")
                        .baseAmount(inv.getSubtotal() != null ? inv.getSubtotal() : BigDecimal.ZERO)
                        .cgstAmount(inv.getCgst() != null ? inv.getCgst() : BigDecimal.ZERO)
                        .sgstAmount(inv.getSgst() != null ? inv.getSgst() : BigDecimal.ZERO)
                        .igstAmount(inv.getIgst() != null ? inv.getIgst() : BigDecimal.ZERO)
                        .totalAmount(inv.getGrandTotal() != null ? inv.getGrandTotal() : BigDecimal.ZERO)
                        .status(inv.getStatus() != null ? inv.getStatus().name() : "PAID")
                        .invoiceDate(invDateTime)
                        .build());
            }
        } catch (Exception ignored) {}

        // 2. SaaS Subscription Invoices
        try {
            for (SaasInvoice sinv : invoiceRepo.findAll()) {
                list.add(InvoiceItemDto.builder()
                        .id(sinv.getId() + 10000L)
                        .invoiceNumber(sinv.getInvoiceNumber())
                        .businessId(sinv.getBusiness() != null ? sinv.getBusiness().getId() : null)
                        .businessName(sinv.getBusiness() != null ? sinv.getBusiness().getName() : "Platform Business")
                        .branchId(sinv.getBranch() != null ? sinv.getBranch().getId() : null)
                        .branchName(sinv.getBranch() != null ? sinv.getBranch().getName() : "All Branches")
                        .baseAmount(sinv.getBaseAmount())
                        .cgstAmount(sinv.getCgstAmount())
                        .sgstAmount(sinv.getSgstAmount())
                        .igstAmount(sinv.getIgstAmount())
                        .totalAmount(sinv.getTotalAmount())
                        .status(sinv.getStatus())
                        .invoiceDate(sinv.getInvoiceDate())
                        .build());
            }
        } catch (Exception ignored) {}

        // Sort by invoiceDate descending
        list.sort((a, b) -> {
            if (a.getInvoiceDate() == null || b.getInvoiceDate() == null) return 0;
            return b.getInvoiceDate().compareTo(a.getInvoiceDate());
        });
        return list;
    }

    // ==========================================
    // 8. SUPPORT TICKETS
    // ==========================================
    @Transactional(readOnly = true)
    public List<SupportTicketDto> getAllTickets(String status) {
        List<SaasSupportTicket> list = (status != null && !status.isBlank())
                ? ticketRepo.findAllByStatusIgnoreCase(status)
                : ticketRepo.findAll();

        return list.stream().map(t -> SupportTicketDto.builder()
                .id(t.getId())
                .ticketNumber(t.getTicketNumber())
                .businessId(t.getBusiness().getId())
                .businessName(t.getBusiness().getName())
                .subject(t.getSubject())
                .description(t.getDescription())
                .productCode(t.getProductCode())
                .priority(t.getPriority())
                .status(t.getStatus())
                .assignedTo(t.getAssignedTo())
                .createdAt(t.getCreatedAt())
                .build()).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SupportTicketDto getTicketById(Long id) {
        SaasSupportTicket t = ticketRepo.findById(id).orElseThrow(() -> new NotFoundException("Ticket not found"));
        List<SupportReplyDto> replies = replyRepo.findAllByTicketIdOrderByCreatedAtAsc(id).stream()
                .map(r -> SupportReplyDto.builder()
                        .id(r.getId())
                        .senderType(r.getSenderType())
                        .senderName(r.getSenderName())
                        .message(r.getMessage())
                        .isInternal(r.isInternal())
                        .createdAt(r.getCreatedAt())
                        .build()).collect(Collectors.toList());

        return SupportTicketDto.builder()
                .id(t.getId())
                .ticketNumber(t.getTicketNumber())
                .businessId(t.getBusiness().getId())
                .businessName(t.getBusiness().getName())
                .subject(t.getSubject())
                .description(t.getDescription())
                .productCode(t.getProductCode())
                .priority(t.getPriority())
                .status(t.getStatus())
                .assignedTo(t.getAssignedTo())
                .createdAt(t.getCreatedAt())
                .replies(replies)
                .build();
    }

    @Transactional
    public void replyTicket(Long ticketId, SupportReplyRequest req, String adminUser) {
        SaasSupportTicket t = ticketRepo.findById(ticketId).orElseThrow(() -> new NotFoundException("Ticket not found"));
        SaasSupportReply r = SaasSupportReply.builder()
                .ticket(t)
                .senderType("ADMIN")
                .senderName(adminUser != null ? adminUser : "Platform Support")
                .message(req.getMessage())
                .isInternal(req.isInternal())
                .build();
        replyRepo.save(r);

        if (!"CLOSED".equalsIgnoreCase(t.getStatus())) {
            t.setStatus("IN_PROGRESS");
            ticketRepo.save(t);
        }
    }

    @Transactional
    public void updateTicketStatus(Long ticketId, String status, String adminUser) {
        SaasSupportTicket t = ticketRepo.findById(ticketId).orElseThrow(() -> new NotFoundException("Ticket not found"));
        t.setStatus(status.toUpperCase());
        ticketRepo.save(t);
        logAudit("UPDATE_TICKET", "SUPPORT", "Updated ticket status to " + status, t.getBusiness().getId(), null, adminUser);
    }

    // ==========================================
    // 9. PLATFORM SETTINGS
    // ==========================================
    @Transactional(readOnly = true)
    public List<PlatformSettingDto> getAllSettings() {
        return settingRepo.findAll().stream().map(s -> PlatformSettingDto.builder()
                .id(s.getId())
                .settingKey(s.getSettingKey())
                .settingValue(s.getSettingValue())
                .category(s.getCategory())
                .description(s.getDescription())
                .build()).collect(Collectors.toList());
    }

    @Transactional
    public void updateSetting(String key, String value, String adminUser) {
        SaasPlatformSetting s = settingRepo.findBySettingKey(key).orElseGet(() -> {
            SaasPlatformSetting ns = new SaasPlatformSetting();
            ns.setSettingKey(key);
            ns.setCategory("GENERAL");
            return ns;
        });
        s.setSettingValue(value);
        settingRepo.save(s);
        logAudit("UPDATE_SETTING", "SETTINGS", "Updated platform setting: " + key, null, null, adminUser);
    }

    // ==========================================
    // 10. AUDIT LOGS
    // ==========================================
    @Transactional(readOnly = true)
    public List<AuditLogDto> getAuditLogs() {
        return auditRepo.findTop50ByOrderByCreatedAtDesc().stream().map(a -> AuditLogDto.builder()
                .id(a.getId())
                .actorUsername(a.getActorUsername())
                .role(a.getRole())
                .businessId(a.getBusinessId())
                .branchId(a.getBranchId())
                .action(a.getAction())
                .module(a.getModule())
                .description(a.getDescription())
                .ipAddress(a.getIpAddress())
                .createdAt(a.getCreatedAt())
                .build()).collect(Collectors.toList());
    }

    public void logAudit(String action, String module, String desc, Long bizId, Long branchId, String username) {
        try {
            SaasAuditLog a = SaasAuditLog.builder()
                    .actorUsername(username != null ? username : "SUPER_ADMIN")
                    .role("SUPER_ADMIN")
                    .businessId(bizId)
                    .branchId(branchId)
                    .action(action)
                    .module(module)
                    .description(desc)
                    .build();
            auditRepo.save(a);
        } catch (Exception e) {
            // Silently ignore audit failure to never block business logic
        }
    }

    // ==========================================
    // MAPPERS
    // ==========================================
    private String getAccountTypeForBusiness(Long businessId, String contactEmail) {
        if (contactEmail != null) {
            Map<String, String> meta = AuthService.getUserType(contactEmail);
            if (meta.containsKey("businessType")) {
                return meta.get("businessType");
            }
        }
        List<User> bizUsers = userRepo.findAllByBusinessId(businessId);
        for (User u : bizUsers) {
            Map<String, String> meta = AuthService.getUserType(u.getUsername());
            if (meta.containsKey("businessType")) {
                return meta.get("businessType");
            }
        }
        long branchCount = branchRepo.countByBusinessId(businessId);
        return branchCount > 1 ? "MULTI_BRANCH" : "SINGLE";
    }

    private BusinessSummaryDto toBusinessSummary(Business b) {
        int branchCount = (int) branchRepo.countByBusinessId(b.getId());
        List<String> prods = subscriptionRepo.findAllByBusinessId(b.getId()).stream()
                .map(s -> s.getProduct().getCode())
                .distinct()
                .collect(Collectors.toList());
        if (prods.isEmpty()) prods = List.of(b.getIndustryType() != null ? b.getIndustryType().name() : "HOTEL");

        return BusinessSummaryDto.builder()
                .id(b.getId())
                .name(b.getName())
                .code(b.getCode())
                .ownerName(b.getOwnerName())
                .email(b.getContactEmail())
                .phone(b.getPhone())
                .city(b.getCity())
                .state(b.getState())
                .businessType(b.getIndustryType() != null ? b.getIndustryType().name() : "HOTEL")
                .accountType(getAccountTypeForBusiness(b.getId(), b.getContactEmail()))
                .products(prods)
                .branchCount(branchCount)
                .status(b.isActive() ? "ACTIVE" : "INACTIVE")
                .createdAt(b.getCreatedAt())
                .build();
    }

    private BranchSummaryDto toBranchSummary(Branch br) {
        BigDecimal branchSales = BigDecimal.ZERO;
        int invCount = 0;
        try {
            List<Invoice> invs = hotelInvoiceRepo.findAllByBusinessIdAndBranchId(br.getBusiness().getId(), br.getId());
            invCount = invs.size();
            for (Invoice inv : invs) {
                if (inv.getGrandTotal() != null) {
                    branchSales = branchSales.add(inv.getGrandTotal());
                }
            }
        } catch (Exception ignored) {}

        return BranchSummaryDto.builder()
                .id(br.getId())
                .businessId(br.getBusiness().getId())
                .businessName(br.getBusiness().getName())
                .name(br.getName())
                .code(br.getCode())
                .managerName(br.getManagerName())
                .contactPhone(br.getContactPhone())
                .email(br.getEmail())
                .city(br.getCity())
                .state(br.getState())
                .status(br.getStatus())
                .createdAt(br.getCreatedAt())
                .totalSales(branchSales)
                .totalInvoices(invCount)
                .build();
    }

    private SubscriptionItemDto toSubscriptionDto(SaasSubscription s) {
        return SubscriptionItemDto.builder()
                .id(s.getId())
                .businessId(s.getBusiness().getId())
                .businessName(s.getBusiness().getName())
                .branchId(s.getBranch() != null ? s.getBranch().getId() : null)
                .branchName(s.getBranch() != null ? s.getBranch().getName() : "All Branches")
                .productId(s.getProduct().getId())
                .productCode(s.getProduct().getCode())
                .productName(s.getProduct().getName())
                .planId(s.getPlan().getId())
                .planName(s.getPlan().getName())
                .planType(s.getPlan().getPlanType())
                .status(s.getStatus())
                .startDate(s.getStartDate())
                .endDate(s.getEndDate())
                .trialStartAt(s.getTrialStartAt())
                .trialEndAt(s.getTrialEndAt())
                .isLifetime(s.isLifetime())
                .autoRenew(s.isAutoRenew())
                .active(s.isActive())
                .notes(s.getNotes())
                .build();
    }

    private PaymentItemDto toPaymentDto(SaasPayment p) {
        return PaymentItemDto.builder()
                .id(p.getId())
                .subscriptionId(p.getSubscription() != null ? p.getSubscription().getId() : null)
                .businessId(p.getBusiness().getId())
                .businessName(p.getBusiness().getName())
                .branchId(p.getBranch() != null ? p.getBranch().getId() : null)
                .branchName(p.getBranch() != null ? p.getBranch().getName() : "All Branches")
                .amount(p.getAmount())
                .gstAmount(p.getGstAmount())
                .totalAmount(p.getTotalAmount())
                .currency(p.getCurrency())
                .paymentGateway(p.getPaymentGateway())
                .gatewayPaymentId(p.getGatewayPaymentId())
                .status(p.getStatus())
                .paymentMethod(p.getPaymentMethod())
                .createdAt(p.getCreatedAt())
                .build();
    }
}
