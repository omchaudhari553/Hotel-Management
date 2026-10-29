package com.hotelmanagement.service;
import com.hotelmanagement.dto.HotelDtos.*;
import java.util.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import com.hotelmanagement.entity.*;
import com.hotelmanagement.repository.*;
import com.hotelmanagement.security.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service 
public class BranchService {
    private final HotelService core;
    private final CurrentUser currentUser;
    private final BranchRepository branches;
    private final OutletRepository outlets;
    private final InvoiceRepository invoices;
    private final HotelOrderRepository orders;
    private final StaffRepository staff;

    public BranchService(HotelService core, CurrentUser currentUser, BranchRepository branches,
                         OutletRepository outlets, InvoiceRepository invoices,
                         HotelOrderRepository orders, StaffRepository staff) {
        this.core=core;
        this.currentUser=currentUser;
        this.branches=branches;
        this.outlets=outlets;
        this.invoices=invoices;
        this.orders=orders;
        this.staff=staff;
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
        if (r.containsKey("status")) b.setStatus(String.valueOf(r.get("status")).toUpperCase());
        if (r.containsKey("parentBranchId")) {
            Object pid = r.get("parentBranchId");
            if (pid != null && !String.valueOf(pid).isBlank()) {
                Long parentId = Long.valueOf(String.valueOf(pid));
                b.setParentBranch(branches.findByIdAndBusinessId(parentId, currentUser.businessId()).orElse(null));
            } else {
                b.setParentBranch(null);
            }
        }
        return core.branchMap(branches.save(b));
    }

    @Transactional
    public Map<String,Object> delete(Long id) {
        Branch b = branches.findByIdAndBusinessId(id, currentUser.businessId())
                .orElseThrow(() -> new com.hotelmanagement.exception.NotFoundException("Branch not found"));
        branches.delete(b);
        return Map.of("id", id, "deleted", true);
    }

    @Transactional(readOnly = true)
    public List<Map<String,Object>> outlets() {
        return outlets.findAllByBranchBusinessId(currentUser.businessId()).stream().map(this::outletMap).toList();
    }

    @Transactional
    public Map<String,Object> createOutlet(Long branchId, Map<String,Object> r) {
        Branch branch = branches.findByIdAndBusinessId(branchId, currentUser.businessId())
                .orElseThrow(() -> new com.hotelmanagement.exception.NotFoundException("Branch not found"));
        Outlet o = new Outlet();
        o.setBranch(branch);
        o.setName(String.valueOf(r.getOrDefault("name", "")));
        o.setCode(String.valueOf(r.getOrDefault("code", "OUT-" + System.currentTimeMillis())));
        o.setType(String.valueOf(r.getOrDefault("type", "Restaurant")));
        String cp = String.valueOf(r.getOrDefault("contactPhone", "")).replaceAll("\\D", "");
        if (!cp.isBlank()) {
            if (!cp.matches("^[6-9][0-9]{9}$")) {
                throw new com.hotelmanagement.exception.ConflictException("Contact phone must be exactly 10 digits and start with 6, 7, 8, or 9");
            }
            o.setContactPhone(cp);
        } else {
            o.setContactPhone("");
        }
        o.setStatus(String.valueOf(r.getOrDefault("status", "ACTIVE")).toUpperCase());
        return outletMap(outlets.save(o));
    }

    @Transactional
    public Map<String,Object> updateOutlet(Long id, Map<String,Object> r) {
        Outlet o = outlets.findByIdAndBranchBusinessId(id, currentUser.businessId())
                .orElseThrow(() -> new com.hotelmanagement.exception.NotFoundException("Outlet not found"));
        if (r.containsKey("name")) o.setName(String.valueOf(r.get("name")));
        if (r.containsKey("code")) o.setCode(String.valueOf(r.get("code")));
        if (r.containsKey("type")) o.setType(String.valueOf(r.get("type")));
        if (r.containsKey("contactPhone")) {
            String cp = String.valueOf(r.get("contactPhone")).replaceAll("\\D", "");
            if (!cp.isBlank()) {
                if (!cp.matches("^[6-9][0-9]{9}$")) {
                    throw new com.hotelmanagement.exception.ConflictException("Contact phone must be exactly 10 digits and start with 6, 7, 8, or 9");
                }
                o.setContactPhone(cp);
            } else {
                o.setContactPhone("");
            }
        }
        if (r.containsKey("status")) o.setStatus(String.valueOf(r.get("status")).toUpperCase());
        return outletMap(outlets.save(o));
    }

    @Transactional
    public Map<String,Object> deleteOutlet(Long id) {
        Outlet o = outlets.findByIdAndBranchBusinessId(id, currentUser.businessId())
                .orElseThrow(() -> new com.hotelmanagement.exception.NotFoundException("Outlet not found"));
        outlets.delete(o);
        return Map.of("id", id, "deleted", true);
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
        result.put("totalOutlets", outlets.findAllByBranchBusinessId(currentUser.businessId()).stream().filter(x -> x.getBranch() != null && branchId.equals(x.getBranch().getId())).count());
        result.put("dailyRevenue", daily);
        return result;
    }

    private Map<String,Object> outletMap(Outlet o) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", o.getId());
        m.put("branchId", o.getBranch() == null ? null : o.getBranch().getId());
        m.put("branchName", o.getBranch() == null ? "" : o.getBranch().getName());
        m.put("name", o.getName());
        m.put("code", o.getCode());
        m.put("type", o.getType());
        m.put("contact", o.getContactPhone());
        m.put("contactPhone", o.getContactPhone());
        m.put("status", o.getStatus());
        m.put("staffCount", staff.findAllByBusinessId(currentUser.businessId()).stream().filter(x -> x.getOutlet() != null && o.getId().equals(x.getOutlet().getId())).count());
        return m;
    }
}
