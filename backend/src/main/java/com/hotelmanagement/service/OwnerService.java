package com.hotelmanagement.service;

import com.hotelmanagement.dto.OwnerDtos.*;
import com.hotelmanagement.entity.*;
import com.hotelmanagement.enums.*;
import com.hotelmanagement.exception.ConflictException;
import com.hotelmanagement.exception.NotFoundException;
import com.hotelmanagement.repository.*;
import com.hotelmanagement.security.CurrentUser;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class OwnerService {

    private final CurrentUser cu;
    private final BranchRepository branchRepo;
    private final UserRepository userRepo;
    private final InvoiceRepository invoiceRepo;
    private final PaymentRepository paymentRepo;
    private final PurchaseInvoiceRepository purchaseRepo;
    private final StaffRepository staffRepo;
    private final HotelOrderRepository orderRepo;
    private final KotRepository kotRepo;
    private final BusinessRepository businessRepo;
    private final PasswordEncoder passwordEncoder;
    private final ReportService reportService;
    private final ExpenseRepository expenseRepo;
    private final JdbcTemplate jdbcTemplate;

    public OwnerService(CurrentUser cu,
                        BranchRepository branchRepo,
                        UserRepository userRepo,
                        InvoiceRepository invoiceRepo,
                        PaymentRepository paymentRepo,
                        PurchaseInvoiceRepository purchaseRepo,
                        StaffRepository staffRepo,
                        HotelOrderRepository orderRepo,
                        KotRepository kotRepo,
                        BusinessRepository businessRepo,
                        PasswordEncoder passwordEncoder,
                        ReportService reportService,
                        ExpenseRepository expenseRepo,
                        JdbcTemplate jdbcTemplate) {
        this.cu = cu;
        this.branchRepo = branchRepo;
        this.userRepo = userRepo;
        this.invoiceRepo = invoiceRepo;
        this.paymentRepo = paymentRepo;
        this.purchaseRepo = purchaseRepo;
        this.staffRepo = staffRepo;
        this.orderRepo = orderRepo;
        this.kotRepo = kotRepo;
        this.businessRepo = businessRepo;
        this.passwordEncoder = passwordEncoder;
        this.reportService = reportService;
        this.expenseRepo = expenseRepo;
        this.jdbcTemplate = jdbcTemplate;
    }

    private void ensureOwnerAccess() {
        cu.requireOwner();
    }

    private BigDecimal nz(BigDecimal val) {
        return val == null ? BigDecimal.ZERO : val;
    }

    private String cleanPhone(String phone) {
        if (phone == null) return "";
        return phone.replaceAll("\\D", "");
    }

    // =========================================================================
    // MODULE 1: OWNER DASHBOARD
    // =========================================================================
    public OwnerDashboardResponse getDashboard() {
        ensureOwnerAccess();
        Long bId = cu.businessId();
        LocalDate today = LocalDate.now();
        LocalDate firstOfMonth = today.withDayOfMonth(1);

        long totalBranches = branchRepo.countByBusinessId(bId);
        long activeBranches = branchRepo.countByBusinessIdAndStatus(bId, "ACTIVE");
        long inactiveBranches = Math.max(0, totalBranches - activeBranches);

        List<Branch> allBranches = branchRepo.findAllByBusinessId(bId);
        List<Branch> activeBranchesList = allBranches.stream()
                .filter(b -> "ACTIVE".equalsIgnoreCase(b.getStatus()))
                .toList();
        Set<Long> activeBranchIds = activeBranchesList.stream()
                .map(Branch::getId)
                .collect(Collectors.toSet());

        // Invoices, payments and purchases must strictly exclude inactive branches from analytics
        List<Invoice> allInvoices = invoiceRepo.findAllByBusinessId(bId).stream()
                .filter(inv -> inv.getStatus() != InvoiceStatus.CANCELLED)
                .filter(inv -> inv.getBranch() != null && activeBranchIds.contains(inv.getBranch().getId()))
                .toList();
        List<Payment> allPayments = paymentRepo.findAllByBusinessId(bId).stream()
                .filter(p -> p.getStatus() == PaymentStatus.SUCCESS)
                .filter(p -> {
                    Long branchId = p.getBranch() != null ? p.getBranch().getId()
                            : (p.getInvoice() != null && p.getInvoice().getBranch() != null ? p.getInvoice().getBranch().getId() : null);
                    return branchId != null && activeBranchIds.contains(branchId);
                })
                .toList();
        List<PurchaseInvoice> allPurchases = purchaseRepo.findAllByBusinessId(bId).stream()
                .filter(pi -> pi.getBranch() != null && activeBranchIds.contains(pi.getBranch().getId()))
                .toList();

        BigDecimal todaySales = allInvoices.stream()
                .filter(inv -> {
                    LocalDate d = inv.getInvoiceDate() != null ? inv.getInvoiceDate()
                            : (inv.getCreatedAt() != null ? inv.getCreatedAt().toLocalDate() : null);
                    return today.equals(d);
                })
                .map(inv -> nz(inv.getGrandTotal()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal monthlySales = allInvoices.stream()
                .filter(inv -> {
                    LocalDate d = inv.getInvoiceDate() != null ? inv.getInvoiceDate()
                            : (inv.getCreatedAt() != null ? inv.getCreatedAt().toLocalDate() : null);
                    return d != null && !d.isBefore(firstOfMonth) && !d.isAfter(today);
                })
                .map(inv -> nz(inv.getGrandTotal()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalBillingAmount = allInvoices.stream()
                .map(inv -> nz(inv.getGrandTotal()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalPayments = allPayments.stream()
                .map(p -> nz(p.getAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalPurchaseAmount = allPurchases.stream()
                .map(pi -> nz(pi.getTotal()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Map<String, Object>> branchSalesOverview = new ArrayList<>();
        List<Map<String, Object>> branchPerformanceComparison = new ArrayList<>();

        for (Branch b : activeBranchesList) {
            List<Invoice> bInvs = allInvoices.stream()
                    .filter(inv -> inv.getBranch() != null && b.getId().equals(inv.getBranch().getId()))
                    .toList();
            List<Payment> bPays = allPayments.stream()
                    .filter(p -> p.getBranch() != null && b.getId().equals(p.getBranch().getId()))
                    .toList();
            List<PurchaseInvoice> bPurchases = allPurchases.stream()
                    .filter(pi -> pi.getBranch() != null && b.getId().equals(pi.getBranch().getId()))
                    .toList();

            BigDecimal bTodaySales = bInvs.stream()
                    .filter(inv -> today.equals(inv.getInvoiceDate()))
                    .map(inv -> nz(inv.getGrandTotal()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal bMonthlySales = bInvs.stream()
                    .filter(inv -> inv.getInvoiceDate() != null && !inv.getInvoiceDate().isBefore(firstOfMonth) && !inv.getInvoiceDate().isAfter(today))
                    .map(inv -> nz(inv.getGrandTotal()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal bTotalSales = bInvs.stream()
                    .map(inv -> nz(inv.getGrandTotal()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal bTotalPayments = bPays.stream()
                    .map(p -> nz(p.getAmount()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal bTotalPurchases = bPurchases.stream()
                    .map(pi -> nz(pi.getTotal()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal bProfit = bTotalPayments.subtract(bTotalPurchases);

            Map<String, Object> overview = new LinkedHashMap<>();
            overview.put("branchId", b.getId());
            overview.put("branchName", b.getName());
            overview.put("code", b.getCode());
            overview.put("city", b.getCity() != null ? b.getCity() : "");
            overview.put("status", b.getStatus());
            overview.put("managerName", b.getManagerName());
            overview.put("contactPhone", b.getContactPhone());
            overview.put("todaySales", bTodaySales);
            overview.put("monthlySales", bMonthlySales);
            overview.put("totalSales", bTotalSales);
            overview.put("invoiceCount", bInvs.size());
            branchSalesOverview.add(overview);

            Map<String, Object> comp = new LinkedHashMap<>();
            comp.put("branchId", b.getId());
            comp.put("branchName", b.getName());
            comp.put("sales", bTotalSales);
            comp.put("payments", bTotalPayments);
            comp.put("purchases", bTotalPurchases);
            comp.put("profit", bProfit);
            branchPerformanceComparison.add(comp);
        }

        Map<String, Object> branchStatus = new LinkedHashMap<>();
        branchStatus.put("ACTIVE", activeBranches);
        branchStatus.put("INACTIVE", inactiveBranches);
        branchStatus.put("TOTAL", totalBranches);

        return new OwnerDashboardResponse(
                totalBranches,
                activeBranches,
                inactiveBranches,
                todaySales,
                monthlySales,
                totalBillingAmount,
                totalPayments,
                totalPurchaseAmount,
                branchSalesOverview,
                branchPerformanceComparison,
                branchStatus
        );
    }

    // =========================================================================
    // MODULE 2: BRANCH MANAGEMENT
    // =========================================================================
    public List<Map<String, Object>> getAllBranches() {
        ensureOwnerAccess();
        Long bId = cu.businessId();
        List<Branch> branches = branchRepo.findAllByBusinessId(bId);

        return branches.stream().map(this::branchDetailsMap).toList();
    }

    public Map<String, Object> getBranchById(Long branchId) {
        ensureOwnerAccess();
        Branch b = branchRepo.findByIdAndBusinessId(branchId, cu.businessId())
                .orElseThrow(() -> new NotFoundException("Branch not found with ID: " + branchId));
        return branchDetailsMap(b);
    }

    private Map<String, Object> branchDetailsMap(Branch b) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", b.getId());
        m.put("name", b.getName());
        m.put("code", b.getCode());
        m.put("managerName", b.getManagerName());
        m.put("contactPhone", b.getContactPhone());
        m.put("email", b.getEmail());
        m.put("operatingHours", b.getOperatingHours());
        m.put("address", b.getAddress());
        m.put("city", b.getCity());
        m.put("state", b.getState());
        m.put("status", b.getStatus());
        m.put("establishedOn", b.getEstablishedOn());
        m.put("createdAt", b.getCreatedAt());

        // Find associated branch user
        Optional<User> branchUser = userRepo.findFirstByBranchId(b.getId());
        if (branchUser.isPresent()) {
            User u = branchUser.get();
            m.put("username", u.getUsername());
            m.put("userActive", u.isActive());
            m.put("userId", u.getId());
        } else {
            m.put("username", null);
            m.put("userActive", null);
            m.put("userId", null);
        }

        long staffCount = staffRepo.countByBusinessIdAndBranchId(cu.businessId(), b.getId());
        m.put("staffCount", staffCount);

        List<Invoice> branchInvoices = invoiceRepo.findAllByBusinessIdAndBranchId(cu.businessId(), b.getId());
        BigDecimal totalSales = branchInvoices.stream()
                .filter(inv -> inv.getStatus() != InvoiceStatus.CANCELLED)
                .map(inv -> nz(inv.getGrandTotal()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        m.put("totalSales", totalSales);
        m.put("invoiceCount", branchInvoices.size());

        return m;
    }

    @Transactional
    public Map<String, Object> createBranch(CreateBranchRequest req) {
        ensureOwnerAccess();
        Business biz = cu.get().getBusiness();
        String cleanPhone = cleanPhone(req.contactNumber());
        if (!cleanPhone.matches("^[6-9][0-9]{9}$")) {
            throw new ConflictException("Contact number must be exactly 10 digits and start with 6, 7, 8, or 9");
        }

        String username = req.username().trim().toLowerCase();
        if (userRepo.existsByUsernameIgnoreCase(username)) {
            throw new ConflictException("Username '" + username + "' is already in use. Please select a unique username.");
        }

        if (branchRepo.existsByBusinessIdAndNameIgnoreCase(biz.getId(), req.branchName().trim())) {
            throw new ConflictException("A branch named '" + req.branchName().trim() + "' already exists in your business.");
        }

        // 1. Create Branch record
        Branch b = new Branch();
        b.setBusiness(biz);
        b.setName(req.branchName().trim());
        String cleanCode = req.branchName().trim().replaceAll("[^a-zA-Z0-9]", "").toUpperCase();
        if (cleanCode.length() > 6) cleanCode = cleanCode.substring(0, 6);
        String code = "BR-" + cleanCode + "-" + (branchRepo.countByBusinessId(biz.getId()) + 1);
        b.setCode(code);
        b.setManagerName(req.branchManagerName().trim());
        b.setContactPhone(cleanPhone);
        b.setAddress(req.branchAddress() != null ? req.branchAddress().trim() : "");
        b.setCity(req.city() != null ? req.city().trim() : "");
        b.setState(req.state() != null ? req.state().trim() : "");
        b.setOperatingHours("24x7");
        b.setEstablishedOn(LocalDate.now());
        String status = req.status() != null && !req.status().isBlank() ? req.status().toUpperCase() : "ACTIVE";
        b.setStatus(status);
        b = branchRepo.save(b);

        // 2. Generate separate branch login credentials transactionally
        User u = new User();
        u.setBusiness(biz);
        u.setBranch(b);
        u.setUsername(username);
        u.setEmail(username + "@" + biz.getCode().toLowerCase() + ".local");
        u.setFullName(req.branchManagerName() != null && !req.branchManagerName().isBlank()
                ? req.branchManagerName().trim()
                : (b.getName() + " Admin"));
        u.setPhone(cleanPhone);
        u.setPasswordHash(passwordEncoder.encode(req.password()));
        u.setRole(UserRole.BRANCH_ADMIN);
        u.setActive(!"INACTIVE".equalsIgnoreCase(status));
        userRepo.save(u);

        Map<String, Object> resp = branchDetailsMap(b);
        resp.put("message", "Branch and branch login account successfully created.");
        return resp;
    }

    @Transactional
    public Map<String, Object> updateBranch(Long branchId, UpdateBranchRequest req) {
        ensureOwnerAccess();
        Branch b = branchRepo.findByIdAndBusinessId(branchId, cu.businessId())
                .orElseThrow(() -> new NotFoundException("Branch not found with ID: " + branchId));

        if (req.branchName() != null && !req.branchName().isBlank()) {
            b.setName(req.branchName().trim());
        }
        if (req.contactNumber() != null && !req.contactNumber().isBlank()) {
            String cp = cleanPhone(req.contactNumber());
            if (!cp.matches("^[6-9][0-9]{9}$")) {
                throw new ConflictException("Contact number must be exactly 10 digits and start with 6, 7, 8, or 9");
            }
            b.setContactPhone(cp);
        }
        if (req.branchAddress() != null) b.setAddress(req.branchAddress().trim());
        if (req.city() != null) b.setCity(req.city().trim());
        if (req.state() != null) b.setState(req.state().trim());
        if (req.branchManagerName() != null && !req.branchManagerName().isBlank()) {
            b.setManagerName(req.branchManagerName().trim());
        }

        if (req.status() != null && !req.status().isBlank()) {
            String newStatus = req.status().toUpperCase();
            b.setStatus(newStatus);

            // Sync user active flag with branch status (TEST 10)
            List<User> branchUsers = userRepo.findAllByBusinessIdAndBranchId(cu.businessId(), b.getId());
            Optional<User> firstUser = userRepo.findFirstByBranchId(b.getId());
            Set<User> allBranchUsers = new LinkedHashSet<>(branchUsers);
            firstUser.ifPresent(allBranchUsers::add);

            boolean isActive = !"INACTIVE".equalsIgnoreCase(newStatus);
            for (User u : allBranchUsers) {
                u.setActive(isActive);
                userRepo.save(u);
            }
            if (!isActive) {
                jdbcTemplate.update("DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE branch_id = ?)", b.getId());
            }
        }

        // Optional password update for branch login
        if (req.password() != null && !req.password().isBlank()) {
            Optional<User> branchUser = userRepo.findFirstByBranchId(b.getId());
            branchUser.ifPresent(u -> {
                u.setPasswordHash(passwordEncoder.encode(req.password()));
                userRepo.save(u);
            });
        }

        b = branchRepo.save(b);
        return branchDetailsMap(b);
    }

    @Transactional
    public Map<String, Object> updateBranchStatus(Long branchId, String status) {
        ensureOwnerAccess();
        Branch b = branchRepo.findByIdAndBusinessId(branchId, cu.businessId())
                .orElseThrow(() -> new NotFoundException("Branch not found with ID: " + branchId));

        String normalizedStatus = status.trim().toUpperCase();
        b.setStatus(normalizedStatus);
        branchRepo.save(b);

        // Deactivating a branch deactivates its login account so it cannot authenticate
        List<User> branchUsers = userRepo.findAllByBusinessIdAndBranchId(cu.businessId(), b.getId());
        Optional<User> firstUser = userRepo.findFirstByBranchId(b.getId());
        Set<User> allBranchUsers = new LinkedHashSet<>(branchUsers);
        firstUser.ifPresent(allBranchUsers::add);

        boolean isActive = !"INACTIVE".equalsIgnoreCase(normalizedStatus);
        for (User u : allBranchUsers) {
            u.setActive(isActive);
            userRepo.save(u);
        }
        if (!isActive) {
            jdbcTemplate.update("DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE branch_id = ?)", b.getId());
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("branchId", b.getId());
        resp.put("branchName", b.getName());
        resp.put("status", normalizedStatus);
        resp.put("accountActive", !"INACTIVE".equalsIgnoreCase(normalizedStatus));
        return resp;
    }

    @Transactional
    public Map<String, Object> deleteBranch(Long branchId) {
        ensureOwnerAccess();
        Long bId = cu.businessId();
        Branch b = branchRepo.findByIdAndBusinessId(branchId, bId)
                .orElseThrow(() -> new NotFoundException("Branch not found with ID: " + branchId));

        if (branchRepo.countByBusinessId(bId) <= 1) {
            throw new ConflictException("Cannot delete the only branch of your hotel. At least one branch must remain.");
        }

        // Complete safe cascade cleanup of branch-specific operational records
        // 1. Peripheral configs & records
        jdbcTemplate.update("DELETE FROM printer_configurations WHERE branch_id = ?", branchId);
        jdbcTemplate.update("DELETE FROM hotel_settings WHERE branch_id = ?", branchId);
        jdbcTemplate.update("DELETE FROM notifications WHERE branch_id = ?", branchId);
        jdbcTemplate.update("DELETE FROM expenses WHERE branch_id = ?", branchId);
        jdbcTemplate.update("UPDATE suppliers SET branch_id = NULL WHERE branch_id = ?", branchId);

        // 2. Purchases & Receipts
        jdbcTemplate.update("DELETE FROM purchase_return_items WHERE purchase_return_id IN (SELECT id FROM purchase_returns WHERE branch_id = ?)", branchId);
        jdbcTemplate.update("DELETE FROM purchase_returns WHERE branch_id = ?", branchId);
        jdbcTemplate.update("DELETE FROM purchase_invoice_items WHERE purchase_invoice_id IN (SELECT id FROM purchase_invoices WHERE branch_id = ?)", branchId);
        jdbcTemplate.update("DELETE FROM purchase_invoices WHERE branch_id = ?", branchId);
        jdbcTemplate.update("DELETE FROM goods_receipt_items WHERE goods_receipt_id IN (SELECT id FROM goods_receipts WHERE branch_id = ?)", branchId);
        jdbcTemplate.update("DELETE FROM goods_receipts WHERE branch_id = ?", branchId);
        jdbcTemplate.update("DELETE FROM purchase_order_items WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE branch_id = ?)", branchId);
        jdbcTemplate.update("DELETE FROM purchase_orders WHERE branch_id = ?", branchId);

        // 3. Invoices, Payments, KOTs, Orders & Tables
        jdbcTemplate.update("DELETE FROM payments WHERE branch_id = ? OR invoice_id IN (SELECT id FROM invoices WHERE branch_id = ?)", branchId, branchId);
        jdbcTemplate.update("DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE branch_id = ?)", branchId);
        jdbcTemplate.update("DELETE FROM invoices WHERE branch_id = ? OR order_id IN (SELECT id FROM hotel_orders WHERE branch_id = ?)", branchId, branchId);
        jdbcTemplate.update("DELETE FROM kots WHERE branch_id = ? OR order_id IN (SELECT id FROM hotel_orders WHERE branch_id = ?)", branchId, branchId);
        jdbcTemplate.update("DELETE FROM hotel_order_items WHERE order_id IN (SELECT id FROM hotel_orders WHERE branch_id = ?)", branchId);
        jdbcTemplate.update("DELETE FROM hotel_orders WHERE branch_id = ?", branchId);
        jdbcTemplate.update("DELETE FROM hotel_tables WHERE branch_id = ?", branchId);

        // 4. Staff
        jdbcTemplate.update("DELETE FROM staff WHERE branch_id = ?", branchId);

        // 5. Branch Users & Tokens
        jdbcTemplate.update("DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE branch_id = ?)", branchId);
        jdbcTemplate.update("UPDATE audit_logs SET user_id = NULL WHERE user_id IN (SELECT id FROM users WHERE branch_id = ?)", branchId);
        jdbcTemplate.update("DELETE FROM users WHERE branch_id = ?", branchId);

        // 7. Delete the branch itself
        jdbcTemplate.update("DELETE FROM branches WHERE id = ? AND business_id = ?", branchId, bId);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id", branchId);
        resp.put("name", b.getName());
        resp.put("deleted", true);
        resp.put("message", "Branch deleted successfully.");
        return resp;
    }

    // =========================================================================
    // MODULE 3: BRANCH-WISE SALES
    // =========================================================================
    public OwnerSalesResponse getSales(Long branchId, String startDate, String endDate, Integer month, Integer year) {
        ensureOwnerAccess();
        Long bId = cu.businessId();
        LocalDate today = LocalDate.now();
        LocalDate weekAgo = today.minusDays(7);
        LocalDate monthStart = today.withDayOfMonth(1);
        LocalDate yearStart = today.withDayOfYear(1);

        LocalDate filterStart = null;
        LocalDate filterEnd = null;
        if (startDate != null && !startDate.isBlank() && endDate != null && !endDate.isBlank()) {
            try {
                filterStart = LocalDate.parse(startDate);
                filterEnd = LocalDate.parse(endDate);
            } catch (Exception ignored) {}
        } else if (year != null) {
            int y = year;
            int m = month != null ? month : 1;
            filterStart = LocalDate.of(y, m, 1);
            filterEnd = month != null ? filterStart.plusMonths(1).minusDays(1) : LocalDate.of(y, 12, 31);
        }

        List<Branch> branches = branchRepo.findAllByBusinessId(bId);
        if (branchId != null) {
            branches = branches.stream().filter(b -> b.getId().equals(branchId)).toList();
        } else {
            // Strictly exclude inactive branches from analytics
            branches = branches.stream().filter(b -> "ACTIVE".equalsIgnoreCase(b.getStatus())).toList();
        }
        Set<Long> targetBranchIds = branches.stream().map(Branch::getId).collect(Collectors.toSet());

        List<Invoice> allInvoices = invoiceRepo.findAllByBusinessId(bId).stream()
                .filter(inv -> inv.getStatus() != InvoiceStatus.CANCELLED)
                .filter(inv -> inv.getBranch() != null && targetBranchIds.contains(inv.getBranch().getId()))
                .toList();

        List<Map<String, Object>> branchSalesList = new ArrayList<>();
        BigDecimal totalTodaySales = BigDecimal.ZERO;
        BigDecimal totalWeeklySales = BigDecimal.ZERO;
        BigDecimal totalMonthlySales = BigDecimal.ZERO;
        BigDecimal totalYearlySales = BigDecimal.ZERO;
        BigDecimal totalAllSales = BigDecimal.ZERO;
        long totalInvoicesCount = 0;

        Map<String, BigDecimal> dailyTotals = new TreeMap<>();
        Map<String, BigDecimal> salesByMethod = new LinkedHashMap<>();
        salesByMethod.put("CASH", BigDecimal.ZERO);
        salesByMethod.put("UPI", BigDecimal.ZERO);
        salesByMethod.put("CARD", BigDecimal.ZERO);

        for (Branch b : branches) {
            List<Invoice> bInvs = allInvoices.stream()
                    .filter(inv -> inv.getBranch() != null && b.getId().equals(inv.getBranch().getId()))
                    .toList();

            BigDecimal todaySales = bInvs.stream()
                    .filter(inv -> today.equals(inv.getInvoiceDate()))
                    .map(inv -> nz(inv.getGrandTotal()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal weeklySales = bInvs.stream()
                    .filter(inv -> inv.getInvoiceDate() != null && !inv.getInvoiceDate().isBefore(weekAgo) && !inv.getInvoiceDate().isAfter(today))
                    .map(inv -> nz(inv.getGrandTotal()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal monthlySales = bInvs.stream()
                    .filter(inv -> inv.getInvoiceDate() != null && !inv.getInvoiceDate().isBefore(monthStart) && !inv.getInvoiceDate().isAfter(today))
                    .map(inv -> nz(inv.getGrandTotal()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal yearlySales = bInvs.stream()
                    .filter(inv -> inv.getInvoiceDate() != null && !inv.getInvoiceDate().isBefore(yearStart) && !inv.getInvoiceDate().isAfter(today))
                    .map(inv -> nz(inv.getGrandTotal()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal allSales = bInvs.stream()
                    .map(inv -> nz(inv.getGrandTotal()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            Map<String, Object> bm = new LinkedHashMap<>();
            bm.put("branchId", b.getId());
            bm.put("branchName", b.getName());
            bm.put("code", b.getCode());
            bm.put("city", b.getCity() != null ? b.getCity() : "");
            bm.put("status", b.getStatus());
            bm.put("todaySales", todaySales);
            bm.put("weeklySales", weeklySales);
            bm.put("monthlySales", monthlySales);
            bm.put("yearlySales", yearlySales);
            bm.put("totalSales", allSales);
            bm.put("invoiceCount", bInvs.size());
            branchSalesList.add(bm);

            totalTodaySales = totalTodaySales.add(todaySales);
            totalWeeklySales = totalWeeklySales.add(weeklySales);
            totalMonthlySales = totalMonthlySales.add(monthlySales);
            totalYearlySales = totalYearlySales.add(yearlySales);
            totalAllSales = totalAllSales.add(allSales);
            totalInvoicesCount += bInvs.size();

            // Accumulate daily breakdown and payment methods for active branches
            final LocalDate fStart = filterStart;
            final LocalDate fEnd = filterEnd;
            for (Invoice inv : bInvs) {
                LocalDate d = inv.getInvoiceDate() != null ? inv.getInvoiceDate()
                        : (inv.getCreatedAt() != null ? inv.getCreatedAt().toLocalDate() : null);
                if (d == null) continue;
                if (fStart != null && fEnd != null && (d.isBefore(fStart) || d.isAfter(fEnd))) continue;

                String dateStr = d.toString();
                dailyTotals.put(dateStr, dailyTotals.getOrDefault(dateStr, BigDecimal.ZERO).add(nz(inv.getGrandTotal())));

                String method = inv.getPaymentMethod() != null ? inv.getPaymentMethod().toUpperCase() : "CASH";
                if (!salesByMethod.containsKey(method)) method = "CASH";
                salesByMethod.put(method, salesByMethod.get(method).add(nz(inv.getGrandTotal())));
            }
        }

        Map<String, Object> consolidated = new LinkedHashMap<>();
        consolidated.put("todaySales", totalTodaySales);
        consolidated.put("weeklySales", totalWeeklySales);
        consolidated.put("monthlySales", totalMonthlySales);
        consolidated.put("yearlySales", totalYearlySales);
        consolidated.put("totalSales", totalAllSales);
        consolidated.put("totalInvoices", totalInvoicesCount);

        List<Map<String, Object>> dailyList = dailyTotals.entrySet().stream()
                .map(e -> Map.<String, Object>of("date", e.getKey(), "sales", e.getValue()))
                .toList();

        return new OwnerSalesResponse(branchSalesList, consolidated, dailyList, salesByMethod);
    }

    // =========================================================================
    // MODULE 4: PROFIT ANALYSIS
    // =========================================================================
    public OwnerProfitAnalysisResponse getProfitAnalysis(Long branchId, String startDate, String endDate) {
        ensureOwnerAccess();
        Long bId = cu.businessId();
        LocalDate start = null;
        LocalDate end = null;
        if (startDate != null && !startDate.isBlank() && endDate != null && !endDate.isBlank()) {
            try {
                start = LocalDate.parse(startDate);
                end = LocalDate.parse(endDate);
            } catch (Exception ignored) {}
        }

        final LocalDate fStart = start;
        final LocalDate fEnd = end;

        List<Branch> branches = branchRepo.findAllByBusinessId(bId);
        if (branchId != null) {
            branches = branches.stream().filter(b -> b.getId().equals(branchId)).toList();
        } else {
            // Strictly exclude inactive branches from analytics
            branches = branches.stream().filter(b -> "ACTIVE".equalsIgnoreCase(b.getStatus())).toList();
        }
        Set<Long> targetBranchIds = branches.stream().map(Branch::getId).collect(Collectors.toSet());

        List<Invoice> allInvoices = invoiceRepo.findAllByBusinessId(bId).stream()
                .filter(inv -> inv.getStatus() != InvoiceStatus.CANCELLED)
                .filter(inv -> inv.getBranch() != null && targetBranchIds.contains(inv.getBranch().getId()))
                .filter(inv -> {
                    if (fStart == null || fEnd == null) return true;
                    LocalDate d = inv.getInvoiceDate();
                    return d != null && !d.isBefore(fStart) && !d.isAfter(fEnd);
                })
                .toList();

        List<Payment> allPayments = paymentRepo.findAllByBusinessId(bId).stream()
                .filter(p -> p.getStatus() == PaymentStatus.SUCCESS)
                .filter(p -> {
                    Long branchIdFromP = p.getBranch() != null ? p.getBranch().getId()
                            : (p.getInvoice() != null && p.getInvoice().getBranch() != null ? p.getInvoice().getBranch().getId() : null);
                    return branchIdFromP != null && targetBranchIds.contains(branchIdFromP);
                })
                .filter(p -> {
                    if (fStart == null || fEnd == null) return true;
                    LocalDate d = p.getPaymentDate();
                    return d != null && !d.isBefore(fStart) && !d.isAfter(fEnd);
                })
                .toList();

        List<PurchaseInvoice> allPurchases = purchaseRepo.findAllByBusinessId(bId).stream()
                .filter(pi -> pi.getBranch() != null && targetBranchIds.contains(pi.getBranch().getId()))
                .filter(pi -> {
                    if (fStart == null || fEnd == null) return true;
                    LocalDate d = pi.getInvoiceDate();
                    return d != null && !d.isBefore(fStart) && !d.isAfter(fEnd);
                })
                .toList();

        BigDecimal grandBilling = BigDecimal.ZERO;
        BigDecimal grandPayments = BigDecimal.ZERO;
        BigDecimal grandPurchases = BigDecimal.ZERO;

        List<Map<String, Object>> branchBreakdown = new ArrayList<>();

        for (Branch b : branches) {
            BigDecimal bBilling = allInvoices.stream()
                    .filter(inv -> inv.getBranch() != null && b.getId().equals(inv.getBranch().getId()))
                    .map(inv -> nz(inv.getGrandTotal()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal bPayments = allPayments.stream()
                    .filter(p -> p.getBranch() != null && b.getId().equals(p.getBranch().getId()))
                    .map(p -> nz(p.getAmount()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal bPurchases = allPurchases.stream()
                    .filter(pi -> pi.getBranch() != null && b.getId().equals(pi.getBranch().getId()))
                    .map(pi -> nz(pi.getTotal()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal bProfit = bPayments.subtract(bPurchases);
            BigDecimal margin = bPayments.compareTo(BigDecimal.ZERO) > 0
                    ? bProfit.multiply(BigDecimal.valueOf(100)).divide(bPayments, 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            Map<String, Object> bm = new LinkedHashMap<>();
            bm.put("branchId", b.getId());
            bm.put("branchName", b.getName());
            bm.put("city", b.getCity() != null ? b.getCity() : "");
            bm.put("totalBillingAmount", bBilling);
            bm.put("totalPaymentsReceived", bPayments);
            bm.put("totalPurchaseAmount", bPurchases);
            bm.put("estimatedBusinessProfit", bProfit);
            bm.put("profitMarginPercent", margin);
            branchBreakdown.add(bm);

            grandBilling = grandBilling.add(bBilling);
            grandPayments = grandPayments.add(bPayments);
            grandPurchases = grandPurchases.add(bPurchases);
        }

        BigDecimal grandProfit = grandPayments.subtract(grandPurchases);
        BigDecimal grandMargin = grandPayments.compareTo(BigDecimal.ZERO) > 0
                ? grandProfit.multiply(BigDecimal.valueOf(100)).divide(grandPayments, 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return new OwnerProfitAnalysisResponse(
                grandBilling,
                grandPayments,
                grandPurchases,
                grandProfit,
                grandMargin,
                branchBreakdown
        );
    }

    // =========================================================================
    // MODULE 5: STAFF MANAGEMENT
    // =========================================================================
    public List<Map<String, Object>> getStaff(Long branchId) {
        ensureOwnerAccess();
        Long bId = cu.businessId();
        List<Staff> staffList;
        if (branchId != null) {
            staffList = staffRepo.findAllByBusinessIdAndBranchId(bId, branchId);
        } else {
            staffList = staffRepo.findAllByBusinessId(bId).stream()
                    .filter(s -> s.getBranch() == null || "ACTIVE".equalsIgnoreCase(s.getBranch().getStatus()))
                    .toList();
        }

        return staffList.stream().map(s -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", s.getId());
            m.put("name", s.getName());
            m.put("staffCode", s.getStaffCode());
            m.put("phone", s.getPhone());
            m.put("designation", s.getDesignation());
            m.put("role", s.getDesignation());
            m.put("branchId", s.getBranch() != null ? s.getBranch().getId() : null);
            m.put("branchName", s.getBranch() != null ? s.getBranch().getName() : "Unassigned");
            m.put("managerName", s.getBranch() != null ? s.getBranch().getManagerName() : "");
            m.put("active", s.isActive());
            m.put("status", s.isActive() ? "ACTIVE" : "INACTIVE");
            m.put("joiningDate", s.getJoiningDate());
            m.put("basicSalary", s.getBasicSalary());
            m.put("salaryFrequency", s.getSalaryFrequency());
            return m;
        }).toList();
    }

    @Transactional
    public void deleteStaff(Long id) {
        ensureOwnerAccess();
        Long bId = cu.businessId();
        staffRepo.findByIdAndBusinessId(id, bId).ifPresent(staffRepo::delete);
    }

    // =========================================================================
    // MODULE 6: BRANCH REPORTS
    // =========================================================================
    public Map<String, Object> getReports(String type, Long branchId, String startDate, String endDate, String period) {
        ensureOwnerAccess();
        Map<String, Object> summary = reportService.summaryFiltered(startDate, endDate, period, branchId);
        summary.put("reportType", type != null ? type.toUpperCase() : "HOTEL_REPORTS");
        summary.put("filterBranchId", branchId);
        if (branchId != null) {
            branchRepo.findByIdAndBusinessId(branchId, cu.businessId())
                    .ifPresent(b -> summary.put("filterBranchName", b.getName()));
        } else {
            summary.put("filterBranchName", "All Branches Consolidated");
        }

        // Date resolution for Expenses List
        LocalDate start = null;
        LocalDate end = null;
        LocalDate today = LocalDate.now();
        if (startDate != null && !startDate.isBlank() && endDate != null && !endDate.isBlank()) {
            try {
                start = LocalDate.parse(startDate);
                end = LocalDate.parse(endDate);
            } catch (Exception ignored) {}
        }
        if (start == null && period != null && !period.isBlank()) {
            switch (period.toLowerCase()) {
                case "today":
                    start = today;
                    end = today;
                    break;
                case "this-week":
                case "week":
                    start = today.with(DayOfWeek.MONDAY);
                    end = today.with(DayOfWeek.SUNDAY);
                    break;
                case "this-month":
                case "month":
                    start = today.withDayOfMonth(1);
                    end = today.withDayOfMonth(today.lengthOfMonth());
                    break;
                case "this-year":
                case "year":
                    start = today.withDayOfYear(1);
                    end = today.withDayOfYear(today.lengthOfYear());
                    break;
                case "all":
                case "all-time":
                case "all-dates":
                    start = null;
                    end = null;
                    break;
                default:
                    break;
            }
        }
        final LocalDate fStart = start;
        final LocalDate fEnd = end;

        Map<Long, Branch> branchMap = branchRepo.findAllByBusinessId(cu.businessId()).stream()
                .collect(Collectors.toMap(Branch::getId, b -> b, (b1, b2) -> b1));

        List<Expense> allExpenses = expenseRepo.findAllByBusinessId(cu.businessId()).stream()
                .filter(x -> branchId == null || 
                        (x.getBranch() != null && branchId.equals(x.getBranch().getId())) ||
                        (x.getBranch() == null && branchMap.containsKey(branchId) && branchMap.get(branchId).getCode() != null && branchMap.get(branchId).getCode().equalsIgnoreCase(x.getBranchCode())))
                .filter(x -> {
                    if (fStart == null || fEnd == null) return true;
                    LocalDate d = x.getExpenseDate() != null ? x.getExpenseDate()
                            : (x.getCreatedAt() != null ? x.getCreatedAt().toLocalDate() : null);
                    return d != null && !d.isBefore(fStart) && !d.isAfter(fEnd);
                })
                .sorted((e1, e2) -> {
                    LocalDate d1 = e1.getExpenseDate() != null ? e1.getExpenseDate() : (e1.getCreatedAt() != null ? e1.getCreatedAt().toLocalDate() : LocalDate.MIN);
                    LocalDate d2 = e2.getExpenseDate() != null ? e2.getExpenseDate() : (e2.getCreatedAt() != null ? e2.getCreatedAt().toLocalDate() : LocalDate.MIN);
                    return d2.compareTo(d1);
                })
                .toList();

        List<Map<String, Object>> expensesList = new ArrayList<>();
        BigDecimal totalExpensesSum = BigDecimal.ZERO;
        Map<String, BigDecimal> categoryTotals = new LinkedHashMap<>();
        Map<Long, Map<String, Object>> branchExpenseMap = new LinkedHashMap<>();

        for (Expense expItem : allExpenses) {
            BigDecimal amt = expItem.getAmount() != null ? expItem.getAmount() : BigDecimal.ZERO;
            totalExpensesSum = totalExpensesSum.add(amt);

            Long bId = expItem.getBranch() != null ? expItem.getBranch().getId() : null;
            if (bId == null && expItem.getBranchCode() != null) {
                for (Branch b : branchMap.values()) {
                    if (expItem.getBranchCode().equalsIgnoreCase(b.getCode())) {
                        bId = b.getId();
                        break;
                    }
                }
            }
            if (bId == null && !branchMap.isEmpty()) {
                bId = branchMap.keySet().iterator().next();
            }

            String bName = bId != null && branchMap.containsKey(bId) ? branchMap.get(bId).getName() : "Main Branch";
            String bCode = bId != null && branchMap.containsKey(bId) ? branchMap.get(bId).getCode() : "";
            String bCity = bId != null && branchMap.containsKey(bId) && branchMap.get(bId).getCity() != null ? branchMap.get(bId).getCity() : "";

            Map<String, Object> em = new LinkedHashMap<>();
            em.put("id", expItem.getId());
            em.put("name", expItem.getName());
            em.put("category", expItem.getCategory() != null ? expItem.getCategory() : "General");
            em.put("amount", amt);
            em.put("date", expItem.getExpenseDate() != null ? expItem.getExpenseDate().toString() : (expItem.getCreatedAt() != null ? expItem.getCreatedAt().toLocalDate().toString() : ""));
            em.put("paymentMode", expItem.getPaymentMode() != null ? expItem.getPaymentMode() : "CASH");
            em.put("description", expItem.getDescription() != null ? expItem.getDescription() : "");
            em.put("branchId", bId);
            em.put("branchName", bName);
            em.put("branchCode", bCode);
            em.put("branchCity", bCity);
            expensesList.add(em);

            String cat = expItem.getCategory() != null ? expItem.getCategory() : "General";
            categoryTotals.put(cat, categoryTotals.getOrDefault(cat, BigDecimal.ZERO).add(amt));

            if (bId != null) {
                Map<String, Object> bm = branchExpenseMap.computeIfAbsent(bId, k -> {
                    Map<String, Object> newBm = new LinkedHashMap<>();
                    newBm.put("branchId", k);
                    newBm.put("branchName", bName);
                    newBm.put("branchCode", bCode);
                    newBm.put("branchCity", bCity);
                    newBm.put("totalAmount", BigDecimal.ZERO);
                    newBm.put("expenseCount", 0);
                    return newBm;
                });
                bm.put("totalAmount", ((BigDecimal) bm.get("totalAmount")).add(amt));
                bm.put("expenseCount", ((Integer) bm.get("expenseCount")) + 1);
            }
        }

        List<Map<String, Object>> branchExpensesSummary = new ArrayList<>(branchExpenseMap.values());
        List<Map<String, Object>> categoryExpensesSummary = categoryTotals.entrySet().stream()
                .map(entry -> {
                    Map<String, Object> cm = new LinkedHashMap<>();
                    cm.put("category", entry.getKey());
                    cm.put("totalAmount", entry.getValue());
                    return cm;
                })
                .sorted((c1, c2) -> ((BigDecimal) c2.get("totalAmount")).compareTo((BigDecimal) c1.get("totalAmount")))
                .toList();

        summary.put("expensesList", expensesList);
        summary.put("totalExpensesAmount", totalExpensesSum);
        summary.put("expensesCount", expensesList.size());
        summary.put("branchExpensesBreakdown", branchExpensesSummary);
        summary.put("categoryExpensesBreakdown", categoryExpensesSummary);
        if (summary.get("totalExpenses") == null || BigDecimal.ZERO.equals(summary.get("totalExpenses"))) {
            summary.put("totalExpenses", totalExpensesSum);
        }

        return summary;
    }

    // =========================================================================
    // MODULE 7: BILLING PERFORMANCE
    // =========================================================================
    public OwnerBillingPerformanceResponse getBillingPerformance(Long branchId, String startDate, String endDate) {
        ensureOwnerAccess();
        Long bId = cu.businessId();
        LocalDate start = null;
        LocalDate end = null;
        if (startDate != null && !startDate.isBlank() && endDate != null && !endDate.isBlank()) {
            try {
                start = LocalDate.parse(startDate);
                end = LocalDate.parse(endDate);
            } catch (Exception ignored) {}
        }

        final LocalDate fStart = start;
        final LocalDate fEnd = end;

        List<Branch> branches = branchRepo.findAllByBusinessId(bId);
        if (branchId != null) {
            branches = branches.stream().filter(b -> b.getId().equals(branchId)).toList();
        } else {
            // Strictly exclude inactive branches from analytics
            branches = branches.stream().filter(b -> "ACTIVE".equalsIgnoreCase(b.getStatus())).toList();
        }
        Set<Long> targetBranchIds = branches.stream().map(Branch::getId).collect(Collectors.toSet());

        List<Invoice> allInvoices = invoiceRepo.findAllByBusinessId(bId).stream()
                .filter(inv -> inv.getStatus() != InvoiceStatus.CANCELLED)
                .filter(inv -> inv.getBranch() != null && targetBranchIds.contains(inv.getBranch().getId()))
                .filter(inv -> {
                    if (fStart == null || fEnd == null) return true;
                    LocalDate d = inv.getInvoiceDate();
                    return d != null && !d.isBefore(fStart) && !d.isAfter(fEnd);
                })
                .toList();

        List<Payment> allPayments = paymentRepo.findAllByBusinessId(bId).stream()
                .filter(p -> p.getStatus() == PaymentStatus.SUCCESS)
                .filter(p -> {
                    Long branchIdFromP = p.getBranch() != null ? p.getBranch().getId()
                            : (p.getInvoice() != null && p.getInvoice().getBranch() != null ? p.getInvoice().getBranch().getId() : null);
                    return branchIdFromP != null && targetBranchIds.contains(branchIdFromP);
                })
                .filter(p -> {
                    if (fStart == null || fEnd == null) return true;
                    LocalDate d = p.getPaymentDate();
                    return d != null && !d.isBefore(fStart) && !d.isAfter(fEnd);
                })
                .toList();

        List<Kot> allKots = kotRepo.findAllByBusinessId(bId).stream()
                .filter(k -> {
                    Long branchIdFromKot = k.getBranch() != null ? k.getBranch().getId()
                            : (k.getOrder() != null && k.getOrder().getBranch() != null ? k.getOrder().getBranch().getId() : null);
                    return branchIdFromKot != null && targetBranchIds.contains(branchIdFromKot);
                })
                .filter(k -> {
                    if (fStart == null || fEnd == null) return true;
                    LocalDate d = k.getCreatedAt() != null ? k.getCreatedAt().toLocalDate() : null;
                    return d != null && !d.isBefore(fStart) && !d.isAfter(fEnd);
                })
                .toList();

        List<PurchaseInvoice> allPurchases = purchaseRepo.findAllByBusinessId(bId).stream()
                .filter(pi -> pi.getBranch() != null && targetBranchIds.contains(pi.getBranch().getId()))
                .filter(pi -> {
                    if (fStart == null || fEnd == null) return true;
                    LocalDate d = pi.getInvoiceDate();
                    return d != null && !d.isBefore(fStart) && !d.isAfter(fEnd);
                })
                .toList();

        long grandTotalInvoices = 0;
        long grandPaidInvoices = 0;
        long grandUnpaidInvoices = 0;
        BigDecimal grandTotalBilled = BigDecimal.ZERO;
        BigDecimal grandTotalCollected = BigDecimal.ZERO;
        long grandTotalKots = 0;
        long grandCompletedKots = 0;
        long grandTotalPurchases = 0;
        BigDecimal grandPurchaseAmount = BigDecimal.ZERO;

        List<Map<String, Object>> branchComparison = new ArrayList<>();

        for (Branch b : branches) {
            List<Invoice> bInvs = allInvoices.stream()
                    .filter(inv -> inv.getBranch() != null && b.getId().equals(inv.getBranch().getId()))
                    .toList();
            List<Payment> bPays = allPayments.stream()
                    .filter(p -> p.getBranch() != null && b.getId().equals(p.getBranch().getId()))
                    .toList();
            List<Kot> bKots = allKots.stream()
                    .filter(k -> k.getBranch() != null && b.getId().equals(k.getBranch().getId()))
                    .toList();
            List<PurchaseInvoice> bPurchases = allPurchases.stream()
                    .filter(pi -> pi.getBranch() != null && b.getId().equals(pi.getBranch().getId()))
                    .toList();

            long totalInvs = bInvs.size();
            long paidInvs = bInvs.stream().filter(inv -> inv.getStatus() == InvoiceStatus.PAID).count();
            long unpaidInvs = totalInvs - paidInvs;
            BigDecimal billed = bInvs.stream().map(inv -> nz(inv.getGrandTotal())).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal collected = bPays.stream().map(p -> nz(p.getAmount())).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal efficiency = billed.compareTo(BigDecimal.ZERO) > 0
                    ? collected.multiply(BigDecimal.valueOf(100)).divide(billed, 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            BigDecimal avgTicket = totalInvs > 0
                    ? billed.divide(BigDecimal.valueOf(totalInvs), 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            long totalK = bKots.size();
            long compK = bKots.stream().filter(k -> k.getStatus() == KotStatus.COMPLETED).count();

            long totalP = bPurchases.size();
            BigDecimal pAmount = bPurchases.stream().map(pi -> nz(pi.getTotal())).reduce(BigDecimal.ZERO, BigDecimal::add);

            Map<String, Object> bm = new LinkedHashMap<>();
            bm.put("branchId", b.getId());
            bm.put("branchName", b.getName());
            bm.put("totalInvoices", totalInvs);
            bm.put("paidInvoices", paidInvs);
            bm.put("unpaidInvoices", unpaidInvs);
            bm.put("totalBilled", billed);
            bm.put("totalCollected", collected);
            bm.put("collectionEfficiencyPercent", efficiency);
            bm.put("averageTicketSize", avgTicket);
            bm.put("totalKots", totalK);
            bm.put("completedKots", compK);
            bm.put("totalPurchases", totalP);
            bm.put("totalPurchaseAmount", pAmount);
            branchComparison.add(bm);

            grandTotalInvoices += totalInvs;
            grandPaidInvoices += paidInvs;
            grandUnpaidInvoices += unpaidInvs;
            grandTotalBilled = grandTotalBilled.add(billed);
            grandTotalCollected = grandTotalCollected.add(collected);
            grandTotalKots += totalK;
            grandCompletedKots += compK;
            grandTotalPurchases += totalP;
            grandPurchaseAmount = grandPurchaseAmount.add(pAmount);
        }

        BigDecimal grandEfficiency = grandTotalBilled.compareTo(BigDecimal.ZERO) > 0
                ? grandTotalCollected.multiply(BigDecimal.valueOf(100)).divide(grandTotalBilled, 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        BigDecimal grandAvgTicket = grandTotalInvoices > 0
                ? grandTotalBilled.divide(BigDecimal.valueOf(grandTotalInvoices), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return new OwnerBillingPerformanceResponse(
                grandTotalInvoices,
                grandPaidInvoices,
                grandUnpaidInvoices,
                grandTotalBilled,
                grandTotalCollected,
                grandEfficiency,
                grandAvgTicket,
                grandTotalKots,
                grandCompletedKots,
                grandTotalPurchases,
                grandPurchaseAmount,
                branchComparison
        );
    }

    // =========================================================================
    // MODULE 8: OWNER SETTINGS
    // =========================================================================
    public Map<String, Object> getSettings() {
        ensureOwnerAccess();
        Business b = cu.get().getBusiness();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("businessId", b.getId());
        m.put("businessName", b.getName());
        m.put("code", b.getCode());
        m.put("ownerName", b.getOwnerName());
        m.put("contactEmail", b.getContactEmail());
        m.put("phone", b.getPhone());
        m.put("address", b.getAddress());
        m.put("city", b.getCity());
        m.put("state", b.getState());
        m.put("currency", b.getCurrency());
        m.put("taxNumber", b.getTaxNumber());
        m.put("active", b.isActive());
        m.put("totalBranches", branchRepo.countByBusinessId(b.getId()));
        return m;
    }

    @Transactional
    public Map<String, Object> updateSettings(OwnerSettingsRequest req) {
        ensureOwnerAccess();
        Business b = businessRepo.findById(cu.businessId())
                .orElseThrow(() -> new NotFoundException("Business not found"));

        if (req.businessName() != null && !req.businessName().isBlank()) b.setName(req.businessName().trim());
        if (req.ownerName() != null && !req.ownerName().isBlank()) b.setOwnerName(req.ownerName().trim());
        if (req.contactEmail() != null && !req.contactEmail().isBlank()) b.setContactEmail(req.contactEmail().trim());
        if (req.phone() != null && !req.phone().isBlank()) b.setPhone(cleanPhone(req.phone()));
        if (req.address() != null) b.setAddress(req.address().trim());
        if (req.city() != null) b.setCity(req.city().trim());
        if (req.state() != null) b.setState(req.state().trim());
        if (req.currency() != null && !req.currency().isBlank()) b.setCurrency(req.currency().trim());
        if (req.taxNumber() != null) b.setTaxNumber(req.taxNumber().trim());

        businessRepo.save(b);
        return getSettings();
    }
}

