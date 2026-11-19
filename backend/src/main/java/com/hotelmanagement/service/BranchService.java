package com.hotelmanagement.service;
import com.hotelmanagement.dto.HotelDtos.*;
import java.util.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import com.hotelmanagement.entity.*;
import com.hotelmanagement.repository.*;
import com.hotelmanagement.security.CurrentUser;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service 
public class BranchService {
    private final HotelService core;
    private final CurrentUser currentUser;
    private final BranchRepository branches;
    private final InvoiceRepository invoices;
    private final HotelOrderRepository orders;
    private final StaffRepository staff;
    private final JdbcTemplate jdbcTemplate;

    public BranchService(HotelService core, CurrentUser currentUser, BranchRepository branches,
                         InvoiceRepository invoices,
                         HotelOrderRepository orders, StaffRepository staff,
                         JdbcTemplate jdbcTemplate) {
        this.core=core;
        this.currentUser=currentUser;
        this.branches=branches;
        this.invoices=invoices;
        this.orders=orders;
        this.staff=staff;
        this.jdbcTemplate=jdbcTemplate;
    }
    @Transactional(readOnly = true)
    public List<Map<String,Object>> list() {
        return core.branches();
    }
    public Map<String,Object> create(Map<String,Object> r) {
        return core.createBranch(r);
    }

    @Transactional
    public Map<String,Object> update(Long id, Map<String,Object> r) {
        Branch b = branches.findByIdAndBusinessId(id, currentUser.businessId())
                .orElseThrow(() -> new com.hotelmanagement.exception.NotFoundException("Branch not found"));
        if (r.containsKey("name")) b.setName(String.valueOf(r.get("name")));
        if (r.containsKey("code")) b.setCode(String.valueOf(r.get("code")));
        if (r.containsKey("managerName")) b.setManagerName(String.valueOf(r.get("managerName")));
        if (r.containsKey("contactPhone")) {
            String cp = String.valueOf(r.get("contactPhone")).replaceAll("\\D", "");
            if (!cp.isBlank()) {
                if (!cp.matches("^[6-9][0-9]{9}$")) {
                    throw new com.hotelmanagement.exception.ConflictException("Contact phone must be exactly 10 digits and start with 6, 7, 8, or 9");
                }
                b.setContactPhone(cp);
            } else {
                b.setContactPhone("");
            }
        }
        if (r.containsKey("email")) b.setEmail(String.valueOf(r.get("email")));
        if (r.containsKey("operatingHours")) b.setOperatingHours(String.valueOf(r.get("operatingHours")));
        if (r.containsKey("address")) b.setAddress(String.valueOf(r.get("address")));
        if (r.containsKey("status")) {
            String newStatus = String.valueOf(r.get("status")).trim().toUpperCase();
            b.setStatus(newStatus);
            boolean isActive = !"INACTIVE".equalsIgnoreCase(newStatus);
            jdbcTemplate.update("UPDATE users SET active = ? WHERE branch_id = ?", isActive, b.getId());
            if (!isActive) {
                jdbcTemplate.update("DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE branch_id = ?)", b.getId());
            }
        }
        return core.branchMap(branches.save(b));
    }

    @Transactional
    public Map<String,Object> delete(Long id) {
        Long bId = currentUser.businessId();
        Branch b = branches.findByIdAndBusinessId(id, bId)
                .orElseThrow(() -> new com.hotelmanagement.exception.NotFoundException("Branch not found"));

        if (branches.countByBusinessId(bId) <= 1) {
            throw new com.hotelmanagement.exception.ConflictException("Cannot delete the only branch of your hotel. At least one branch must remain.");
        }

        // 1. Peripheral configs & records
        jdbcTemplate.update("DELETE FROM printer_configurations WHERE branch_id = ?", id);
        jdbcTemplate.update("DELETE FROM hotel_settings WHERE branch_id = ?", id);
        jdbcTemplate.update("DELETE FROM notifications WHERE branch_id = ?", id);
        jdbcTemplate.update("DELETE FROM expenses WHERE branch_id = ?", id);
        jdbcTemplate.update("UPDATE suppliers SET branch_id = NULL WHERE branch_id = ?", id);

        // 2. Purchases & Receipts
        jdbcTemplate.update("DELETE FROM purchase_return_items WHERE purchase_return_id IN (SELECT id FROM purchase_returns WHERE branch_id = ?)", id);
        jdbcTemplate.update("DELETE FROM purchase_returns WHERE branch_id = ?", id);
        jdbcTemplate.update("DELETE FROM purchase_invoice_items WHERE purchase_invoice_id IN (SELECT id FROM purchase_invoices WHERE branch_id = ?)", id);
        jdbcTemplate.update("DELETE FROM purchase_invoices WHERE branch_id = ?", id);
        jdbcTemplate.update("DELETE FROM goods_receipt_items WHERE goods_receipt_id IN (SELECT id FROM goods_receipts WHERE branch_id = ?)", id);
        jdbcTemplate.update("DELETE FROM goods_receipts WHERE branch_id = ?", id);
        jdbcTemplate.update("DELETE FROM purchase_order_items WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE branch_id = ?)", id);
        jdbcTemplate.update("DELETE FROM purchase_orders WHERE branch_id = ?", id);

        // 3. Invoices, Payments, KOTs, Orders & Tables
        jdbcTemplate.update("DELETE FROM payments WHERE branch_id = ? OR invoice_id IN (SELECT id FROM invoices WHERE branch_id = ?)", id, id);
        jdbcTemplate.update("DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE branch_id = ?)", id);
        jdbcTemplate.update("DELETE FROM invoices WHERE branch_id = ? OR order_id IN (SELECT id FROM hotel_orders WHERE branch_id = ?)", id, id);
        jdbcTemplate.update("DELETE FROM kots WHERE branch_id = ? OR order_id IN (SELECT id FROM hotel_orders WHERE branch_id = ?)", id, id);
        jdbcTemplate.update("DELETE FROM hotel_order_items WHERE order_id IN (SELECT id FROM hotel_orders WHERE branch_id = ?)", id);
        jdbcTemplate.update("DELETE FROM hotel_orders WHERE branch_id = ?", id);
        jdbcTemplate.update("DELETE FROM hotel_tables WHERE branch_id = ?", id);

        // 4. Staff
        jdbcTemplate.update("DELETE FROM staff WHERE branch_id = ?", id);

        // 5. Branch Users & Tokens
        jdbcTemplate.update("DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE branch_id = ?)", id);
        jdbcTemplate.update("UPDATE audit_logs SET user_id = NULL WHERE user_id IN (SELECT id FROM users WHERE branch_id = ?)", id);
        jdbcTemplate.update("DELETE FROM users WHERE branch_id = ?", id);

        // 6. Delete the branch itself
        jdbcTemplate.update("DELETE FROM branches WHERE id = ? AND business_id = ?", id, bId);

        return Map.of("id", id, "deleted", true, "message", "Branch deleted successfully.");
    }

    @Transactional(readOnly = true)
    public Map<String,Object> analytics(Long branchId) {
        Branch branch = branches.findByIdAndBusinessId(branchId, currentUser.businessId())
                .orElseThrow(() -> new com.hotelmanagement.exception.NotFoundException("Branch not found"));
        LocalDate today = LocalDate.now();
        var branchInvoices = invoices.findAllByBusinessId(currentUser.businessId()).stream()
                .filter(x -> x.getBranch() != null && branchId.equals(x.getBranch().getId())).toList();
        var branchOrders = orders.findAllByBusinessId(currentUser.businessId()).stream()
                .filter(x -> x.getBranch() != null && branchId.equals(x.getBranch().getId())).toList();
        BigDecimal revenue = branchInvoices.stream().map(x -> x.getGrandTotal() == null ? BigDecimal.ZERO : x.getGrandTotal()).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal todayRevenue = branchInvoices.stream()
                .filter(x -> today.equals(x.getInvoiceDate()) || (x.getCreatedAt() != null && today.equals(x.getCreatedAt().toLocalDate())))
                .map(x -> x.getGrandTotal() == null ? BigDecimal.ZERO : x.getGrandTotal()).reduce(BigDecimal.ZERO, BigDecimal::add);
        long todayOrders = branchOrders.stream()
                .filter(x -> x.getCreatedAt() != null && today.equals(x.getCreatedAt().toLocalDate())).count();
        long meals = branchOrders.stream().mapToLong(x -> x.getItems() == null ? 0 : x.getItems().stream().mapToLong(i -> i.getQuantity() == null ? 0 : i.getQuantity()).sum()).sum();
        long activeStaff = staff.findAllByBusinessId(currentUser.businessId()).stream().filter(x -> x.getBranch() != null && branchId.equals(x.getBranch().getId())).count();
        long activeMembers = 0L;
        List<Map<String,Object>> daily = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            BigDecimal amount = branchInvoices.stream()
                    .filter(x -> d.equals(x.getInvoiceDate()) || (x.getCreatedAt() != null && d.equals(x.getCreatedAt().toLocalDate())))
                    .map(x -> x.getGrandTotal() == null ? BigDecimal.ZERO : x.getGrandTotal()).reduce(BigDecimal.ZERO, BigDecimal::add);
            daily.add(Map.of("date", d, "revenue", amount));
        }
        Map<String,Object> result = new LinkedHashMap<>();
        result.put("branchId", branch.getId());
        result.put("branchName", branch.getName());
        result.put("totalRevenue", revenue);
        result.put("todayRevenue", todayRevenue);
        result.put("totalOrders", branchOrders.size());
        result.put("todayOrders", todayOrders);
        result.put("mealsServed", meals);
        result.put("activeStaff", activeStaff);
        result.put("activeMembers", activeMembers);
        result.put("totalOutlets", 0);
        result.put("dailyRevenue", daily);
        return result;
    }
}
