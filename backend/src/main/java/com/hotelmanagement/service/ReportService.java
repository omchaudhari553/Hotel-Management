package com.hotelmanagement.service;
import com.hotelmanagement.repository.InvoiceRepository;
import com.hotelmanagement.repository.PaymentRepository;
import com.hotelmanagement.repository.ExpenseRepository;
import com.hotelmanagement.repository.StaffAttendanceRepository;
import com.hotelmanagement.repository.KotRepository;
import com.hotelmanagement.repository.PurchaseOrderRepository;
import com.hotelmanagement.repository.PurchaseInvoiceRepository;
import com.hotelmanagement.repository.PurchaseReturnRepository;
import com.hotelmanagement.repository.HotelOrderRepository;
import com.hotelmanagement.repository.BranchRepository;
import com.hotelmanagement.security.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.*;
import java.time.LocalDate;
import java.util.*;

@Service 
public class ReportService {
    private final CurrentUser cu;
    private final InvoiceRepository invoices;
    private final PaymentRepository payments;
    private final ExpenseRepository expenses;
    private final StaffAttendanceRepository attendance;
    private final KotRepository kots;
    private final PurchaseOrderRepository purchaseOrders;
    private final PurchaseInvoiceRepository purchaseInvoices;
    private final PurchaseReturnRepository purchaseReturns;
    private final HotelOrderRepository hotelOrders;
    private final BranchRepository branches;

    public ReportService(CurrentUser c,InvoiceRepository i,PaymentRepository p,ExpenseRepository e,StaffAttendanceRepository a,KotRepository k,PurchaseOrderRepository po,PurchaseInvoiceRepository pi,PurchaseReturnRepository pr,HotelOrderRepository ho,BranchRepository br) {
        cu=c;
        invoices=i;
        payments=p;
        expenses=e;
        attendance=a;
        kots=k;
        purchaseOrders=po;
        purchaseInvoices=pi;
        purchaseReturns=pr;
        hotelOrders=ho;
        branches=br;
    }

    public Set<Long> resolveBranchIds(Long branchId) {
        if (branchId == null) {
            return Collections.emptySet();
        }
        return Set.of(branchId);
    }

    @Transactional(readOnly=true) public Map<String,Object> summary() {
        return summaryFiltered(null, null, null, null);
    }

    @Transactional(readOnly=true) public Map<String,Object> summaryFiltered(String startDate, String endDate, String period) {
        return summaryFiltered(startDate, endDate, period, null);
    }

    @Transactional(readOnly=true) public Map<String,Object> summaryFiltered(String startDate, String endDate, String period, Long branchId) {
        Long b = cu.businessId();
        Set<Long> allowed = resolveBranchIds(branchId);
        LocalDate today = LocalDate.now();
        LocalDate start = null;
        LocalDate end = null;

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
                    start = today.with(java.time.DayOfWeek.MONDAY);
                    end = today;
                    break;
                case "this-month":
                case "month":
                    start = today.withDayOfMonth(1);
                    end = today;
                    break;
                case "this-year":
                case "year":
                    start = today.withDayOfYear(1);
                    end = today;
                    break;
                default:
                    break;
            }
        }

        final LocalDate finalStart = start;
        final LocalDate finalEnd = end;

        var allInvs = invoices.findAllByBusinessId(b).stream().filter(x -> {
            if (!allowed.isEmpty() && (x.getBranch() == null || !allowed.contains(x.getBranch().getId()))) return false;
            if (finalStart == null || finalEnd == null) return true;
            LocalDate d = x.getInvoiceDate() != null ? x.getInvoiceDate() : (x.getCreatedAt() != null ? x.getCreatedAt().toLocalDate() : null);
            return d == null || (!d.isBefore(finalStart) && !d.isAfter(finalEnd));
        }).toList();

        BigDecimal rev = allInvs.stream().map(x -> nz(x.getGrandTotal())).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal taxableSales = allInvs.stream().map(x -> nz(x.getTaxableAmount())).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal cgst = allInvs.stream().map(x -> nz(x.getCgst())).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal sgst = allInvs.stream().map(x -> nz(x.getSgst())).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal igst = allInvs.stream().map(x -> nz(x.getIgst())).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal salesGst = cgst.add(sgst).add(igst);

        var allPays = payments.findAllByBusinessId(b).stream().filter(x -> {
            if (!allowed.isEmpty()) {
                Long bId = x.getBranch() != null ? x.getBranch().getId() : (x.getInvoice() != null && x.getInvoice().getBranch() != null ? x.getInvoice().getBranch().getId() : null);
                if (bId == null || !allowed.contains(bId)) return false;
            }
            if (finalStart == null || finalEnd == null) return true;
            LocalDate d = x.getPaymentDate() != null ? x.getPaymentDate() : (x.getCreatedAt() != null ? x.getCreatedAt().toLocalDate() : null);
            return d == null || (!d.isBefore(finalStart) && !d.isAfter(finalEnd));
        }).toList();
        BigDecimal pay = allPays.stream().filter(x -> x.getStatus() != null && x.getStatus().name().equals("SUCCESS")).map(x -> nz(x.getAmount())).reduce(BigDecimal.ZERO, BigDecimal::add);

        var allExps = expenses.findAllByBusinessId(b).stream().filter(x -> {
            if (!allowed.isEmpty() && (x.getBranch() == null || !allowed.contains(x.getBranch().getId()))) return false;
            if (finalStart == null || finalEnd == null) return true;
            LocalDate d = x.getExpenseDate() != null ? x.getExpenseDate() : (x.getCreatedAt() != null ? x.getCreatedAt().toLocalDate() : null);
            return d == null || (!d.isBefore(finalStart) && !d.isAfter(finalEnd));
        }).toList();
        BigDecimal exp = allExps.stream().map(x -> nz(x.getAmount())).reduce(BigDecimal.ZERO, BigDecimal::add);

        var allOrders = hotelOrders.findAllByBusinessId(b).stream().filter(x -> {
            if (!allowed.isEmpty() && (x.getBranch() == null || !allowed.contains(x.getBranch().getId()))) return false;
            if (finalStart == null || finalEnd == null) return true;
            LocalDate d = x.getCreatedAt() != null ? x.getCreatedAt().toLocalDate() : null;
            return d != null && !d.isBefore(finalStart) && !d.isAfter(finalEnd);
        }).toList();

        var allPIs = purchaseInvoices.findAllByBusinessId(b).stream().filter(x -> {
            if (!allowed.isEmpty()) {
                Long bId = x.getPurchaseOrder() != null && x.getPurchaseOrder().getBranch() != null ? x.getPurchaseOrder().getBranch().getId() : null;
                if (bId != null && !allowed.contains(bId)) return false;
            }
            if (finalStart == null || finalEnd == null) return true;
            LocalDate d = x.getInvoiceDate() != null ? x.getInvoiceDate() : (x.getCreatedAt() != null ? x.getCreatedAt().toLocalDate() : null);
            return d == null || (!d.isBefore(finalStart) && !d.isAfter(finalEnd));
        }).toList();
        BigDecimal piTotal = allPIs.stream().map(x -> nz(x.getTotal())).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal piTax = allPIs.stream().map(x -> nz(x.getTaxAmount())).reduce(BigDecimal.ZERO, BigDecimal::add);

        if (allPIs.isEmpty()) {
            var allPOs = purchaseOrders.findAllByBusinessId(b).stream().filter(x -> {
                if (!allowed.isEmpty() && (x.getBranch() == null || !allowed.contains(x.getBranch().getId()))) return false;
                if (finalStart == null || finalEnd == null) return true;
                LocalDate d = x.getPoDate() != null ? x.getPoDate() : (x.getCreatedAt() != null ? x.getCreatedAt().toLocalDate() : null);
                return d == null || (!d.isBefore(finalStart) && !d.isAfter(finalEnd));
            }).toList();
            piTotal = allPOs.stream().map(x -> nz(x.getTotal())).reduce(BigDecimal.ZERO, BigDecimal::add);
            piTax = piTotal.multiply(BigDecimal.valueOf(0.05)).setScale(2, RoundingMode.HALF_UP);
        }

        var allPRs = purchaseReturns.findAllByBusinessId(b).stream().filter(x -> {
            if (!allowed.isEmpty()) {
                Long bId = x.getPurchaseOrder() != null && x.getPurchaseOrder().getBranch() != null ? x.getPurchaseOrder().getBranch().getId() : null;
                if (bId != null && !allowed.contains(bId)) return false;
            }
            if (finalStart == null || finalEnd == null) return true;
            LocalDate d = x.getReturnDate() != null ? x.getReturnDate() : (x.getCreatedAt() != null ? x.getCreatedAt().toLocalDate() : null);
            return d == null || (!d.isBefore(finalStart) && !d.isAfter(finalEnd));
        }).toList();
        BigDecimal prTotal = allPRs.stream().map(x -> nz(x.getTotalAmount())).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal prTax = allPRs.stream().map(x -> nz(x.getTaxAmount())).reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal netPurchases = piTotal.subtract(prTotal).max(BigDecimal.ZERO);
        BigDecimal netPurchaseGst = piTax.subtract(prTax).max(BigDecimal.ZERO);
        BigDecimal purchaseTaxable = netPurchases.subtract(netPurchaseGst).max(BigDecimal.ZERO);

        BigDecimal netProfit = rev.subtract(netPurchases).subtract(exp);
        BigDecimal profitAmount = netProfit.max(BigDecimal.ZERO);
        BigDecimal lossAmount = netProfit.min(BigDecimal.ZERO).negate();
        BigDecimal netGstPayable = salesGst.subtract(netPurchaseGst);

        Map<String,Object> m=new LinkedHashMap<>();
        m.put("grossRevenue", rev);
        m.put("totalSales", rev);
        m.put("collectedPayments", pay);
        m.put("totalExpenses", exp);
        m.put("totalPurchases", piTotal);
        m.put("totalPurchaseReturns", prTotal);
        m.put("netPurchases", netPurchases);
        m.put("netProfit", netProfit);
        m.put("profitAmount", profitAmount);
        m.put("lossAmount", lossAmount);
        m.put("outstanding", rev.subtract(pay));
        m.put("totalBookings", 0L);
        m.put("totalRooms", 0L);
        m.put("totalKots", kots.findAllByBusinessId(b).stream().filter(x -> {
            if (!allowed.isEmpty() && (x.getBranch() == null || !allowed.contains(x.getBranch().getId()))) return false;
            if (finalStart == null || finalEnd == null) return true;
            LocalDate d = x.getCreatedAt() != null ? x.getCreatedAt().toLocalDate() : null;
            return d != null && !d.isBefore(finalStart) && !d.isAfter(finalEnd);
        }).count());
        m.put("totalOrders", allOrders.size());
        m.put("totalInvoices", allInvs.size());

        m.put("taxableSales", taxableSales);
        m.put("salesCgst", cgst);
        m.put("salesSgst", sgst);
        m.put("salesIgst", igst);
        m.put("salesGst", salesGst);
        m.put("taxablePurchases", purchaseTaxable);
        m.put("purchaseGst", netPurchaseGst);
        m.put("netGstPayable", netGstPayable);
        m.put("totalGst", salesGst);

        return m;
    }
    @Transactional(readOnly=true) public List<Map<String,Object>> payments() {
        return payments(null);
    }
    @Transactional(readOnly=true) public List<Map<String,Object>> payments(Long branchId) {
        Set<Long> allowed = resolveBranchIds(branchId);
        return payments.findAllByBusinessId(cu.businessId()).stream()
                .filter(p -> {
                    if (allowed.isEmpty()) return true;
                    Long bId = p.getBranch() != null ? p.getBranch().getId() : (p.getInvoice() != null && p.getInvoice().getBranch() != null ? p.getInvoice().getBranch().getId() : null);
                    return bId != null && allowed.contains(bId);
                })
                .map(p-> {
            Map<String,Object> m=new LinkedHashMap<>();m.put("id",p.getId());m.put("invoiceId",p.getInvoice()==null?null:p.getInvoice().getId());m.put("invoiceNumber",p.getInvoice()==null?null:p.getInvoice().getInvoiceNumber());m.put("amount",p.getAmount());m.put("paymentMethod",p.getPaymentMethod());m.put("transactionRef",p.getTransactionRef());m.put("paymentDate",p.getPaymentDate());m.put("status",p.getStatus());return m;
        }
        ).toList();
    }
    @Transactional(readOnly=true) public List<Map<String,Object>> expenses() {
        return expenses(null);
    }
    @Transactional(readOnly=true) public List<Map<String,Object>> expenses(Long branchId) {
        Set<Long> allowed = resolveBranchIds(branchId);
        return expenses.findAllByBusinessId(cu.businessId()).stream()
                .filter(x -> allowed.isEmpty() || (x.getBranch() != null && allowed.contains(x.getBranch().getId())))
                .map(x-> {
            Map<String,Object> m=new LinkedHashMap<>();m.put("id",x.getId());m.put("branchId",x.getBranch()!=null?x.getBranch().getId():null);m.put("name",x.getName());m.put("category",x.getCategory());m.put("amount",x.getAmount());m.put("date",x.getExpenseDate());m.put("paymentMode",x.getPaymentMode());m.put("description",x.getDescription());m.put("branchCode",x.getBranchCode()!=null?x.getBranchCode():(x.getBranch()!=null?x.getBranch().getCode():""));return m;
        }
        ).toList();
    }
    @Transactional(readOnly=true) public List<Map<String,Object>> bookings() {
        return Collections.emptyList();
    }
    @Transactional(readOnly=true) public Map<String,Object> occupancy() {
        return Map.of("totalRooms", 0, "occupiedRooms", 0, "occupancyRate", 0.0);
    }
    @Transactional(readOnly=true) public List<Map<String,Object>> staff() {
        return attendance.findAllByStaffBusinessId(cu.businessId()).stream().map(x-> {
            Map<String,Object> m=new LinkedHashMap<>();m.put("id",x.getId());m.put("staffId",x.getStaff()==null?null:x.getStaff().getId());m.put("staffName",x.getStaff()==null?null:x.getStaff().getName());m.put("date",x.getAttendanceDate());m.put("status",x.getStatus());return m;
        }
        ).toList();
    }
    @Transactional(readOnly=true) public List<Map<String,Object>> kot() {
        return kots.findAllByBusinessId(cu.businessId()).stream().map(x-> {
            Map<String,Object> m=new LinkedHashMap<>();m.put("id",x.getId());m.put("kotNumber",x.getKotNumber());m.put("orderId",x.getOrder()==null?null:x.getOrder().getId());m.put("status",x.getStatus());m.put("instructions",x.getInstructions());m.put("createdAt",x.getCreatedAt());return m;
        }
        ).toList();
    }
    @Transactional(readOnly=true) public Map<String,Object> revenue() {
        return summary();
    }
    private BigDecimal nz(BigDecimal x) {
        return x==null?BigDecimal.ZERO:x;
    }
}
