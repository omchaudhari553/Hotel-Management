package com.hotelmanagement.service;

import com.hotelmanagement.entity.Branch;
import com.hotelmanagement.entity.Staff;
import com.hotelmanagement.repository.*;
import com.hotelmanagement.security.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.*;
import java.time.*;
import java.util.*;

@Service 
public class DashboardService {
    private final CurrentUser cu;
    private final HotelTableRepository tables;
    private final StaffRepository staff;
    private final InvoiceRepository invoices;
    private final PaymentRepository payments;
    private final ExpenseRepository expenses;
    private final HotelOrderRepository orders;
    private final BranchRepository branches;

    public DashboardService(
            CurrentUser c,
            HotelTableRepository t,
            StaffRepository s,
            InvoiceRepository i,
            PaymentRepository p,
            ExpenseRepository e,
            HotelOrderRepository o,
            BranchRepository br) {
        cu = c;
        tables = t;
        staff = s;
        invoices = i;
        payments = p;
        expenses = e;
        orders = o;
        branches = br;
    }

    public Set<Long> resolveBranchIds(Long branchId) {
        if (branchId == null) {
            return Collections.emptySet();
        }
        return Set.of(branchId);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> kpis() {
        return kpis(null, null, null);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> kpis(Long branchId) {
        return kpis(branchId, null, null);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> kpis(Long branchId, String startDate, String endDate) {
        Long b = cu.businessId();
        Set<Long> allowed = resolveBranchIds(branchId);

        LocalDate fromDate;
        LocalDate toDate;
        if (startDate != null && !startDate.isBlank()) {
            try {
                fromDate = LocalDate.parse(startDate.trim().split("T")[0]);
            } catch (Exception e) {
                fromDate = LocalDate.now();
            }
        } else {
            fromDate = LocalDate.now();
        }

        if (endDate != null && !endDate.isBlank()) {
            try {
                toDate = LocalDate.parse(endDate.trim().split("T")[0]);
            } catch (Exception e) {
                toDate = fromDate;
            }
        } else {
            toDate = fromDate;
        }

        final LocalDate finalFrom = fromDate;
        final LocalDate finalTo = toDate;

        long totalRooms = 0L;
        long occupied = 0L;
        long todayBookings = 0L;

        var todayInvoices = invoices.findAllByBusinessId(b).stream()
                .filter(x -> allowed.isEmpty() || (x.getBranch() != null && allowed.contains(x.getBranch().getId())))
                .filter(x -> {
                    LocalDate d = x.getInvoiceDate() != null ? x.getInvoiceDate() : (x.getCreatedAt() != null ? x.getCreatedAt().toLocalDate() : null);
                    return d != null && !d.isBefore(finalFrom) && !d.isAfter(finalTo);
                })
                .toList();
        BigDecimal revenue = todayInvoices.stream().map(x -> nz(x.getGrandTotal())).reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal collected = payments.findAllByBusinessId(b).stream()
                .filter(p -> {
                    if (allowed.isEmpty()) return true;
                    Long bId = p.getBranch() != null ? p.getBranch().getId() : (p.getInvoice() != null && p.getInvoice().getBranch() != null ? p.getInvoice().getBranch().getId() : null);
                    return bId != null && allowed.contains(bId);
                })
                .filter(x -> x.getStatus() != null && "SUCCESS".equalsIgnoreCase(x.getStatus().name()))
                .filter(x -> {
                    LocalDate d = x.getPaymentDate() != null ? x.getPaymentDate() : (x.getCreatedAt() != null ? x.getCreatedAt().toLocalDate() : null);
                    return d != null && !d.isBefore(finalFrom) && !d.isAfter(finalTo);
                })
                .map(x -> nz(x.getAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal exp = expenses.findAllByBusinessId(b).stream()
                .filter(x -> allowed.isEmpty() || (x.getBranch() != null && allowed.contains(x.getBranch().getId())))
                .filter(x -> {
                    LocalDate d = x.getExpenseDate() != null ? x.getExpenseDate() : (x.getCreatedAt() != null ? x.getCreatedAt().toLocalDate() : null);
                    return d != null && !d.isBefore(finalFrom) && !d.isAfter(finalTo);
                })
                .map(x -> nz(x.getAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        var todayOrders = orders.findAllByBusinessId(b).stream()
                .filter(x -> allowed.isEmpty() || (x.getBranch() != null && allowed.contains(x.getBranch().getId())))
                .filter(x -> {
                    LocalDate d = x.getCreatedAt() != null ? x.getCreatedAt().toLocalDate() : null;
                    return d != null && !d.isBefore(finalFrom) && !d.isAfter(finalTo);
                })
                .toList();
        long allOrders = todayOrders.size();
        BigDecimal ordersTotal = todayOrders.stream()
                .map(x -> nz(x.getTotalAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long allDeliveries = 0L;
        long activeCustomers = 0L;

        var branchInvoices = invoices.findAllByBusinessId(b).stream()
                .filter(x -> allowed.isEmpty() || (x.getBranch() != null && allowed.contains(x.getBranch().getId())))
                .toList();

        long activeStaff = staff.findAllByBusinessId(b).stream()
                .filter(x -> allowed.isEmpty() || (x.getBranch() != null && allowed.contains(x.getBranch().getId())))
                .filter(Staff::isActive)
                .count();

        var branchTables = tables.findAllByBusinessId(b).stream()
                .filter(x -> allowed.isEmpty() || (x.getBranch() != null && allowed.contains(x.getBranch().getId())))
                .toList();
        long totalTables = branchTables.size();
        long availableTables = branchTables.stream().filter(x -> x.getStatus() != null && "AVAILABLE".equalsIgnoreCase(x.getStatus().name())).count();

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("totalRevenue", revenue);
        m.put("todayRevenue", revenue);
        m.put("todayBills", todayInvoices.size());
        m.put("collectedPayments", collected);
        m.put("totalExpenses", exp);
        m.put("netRevenue", revenue.subtract(exp));
        m.put("totalInvoices", branchInvoices.size());
        m.put("pendingInvoices", branchInvoices.stream().filter(x -> nz(x.getDueAmount()).signum() > 0).count());
        m.put("totalHotelRooms", totalRooms);
        m.put("occupiedHotelRooms", occupied);
        m.put("hotelOccupancyRate", totalRooms == 0 ? 0 : BigDecimal.valueOf(occupied * 100.0 / totalRooms).setScale(2, RoundingMode.HALF_UP));
        m.put("todayHotelBookings", todayBookings);
        m.put("activeStaff", activeStaff);
        m.put("totalTables", totalTables);
        m.put("availableTables", availableTables);
        m.put("todayCafeOrders", allOrders);
        m.put("todayCafeSales", ordersTotal);
        m.put("todayTiffinsDispatched", allDeliveries);
        m.put("todayDeliveries", allDeliveries);
        m.put("activeCustomers", activeCustomers);
        m.put("activeMessSubscribers", activeCustomers);
        m.put("todayMessMealsServed", allDeliveries + allOrders);
        m.put("lowStockProductsCount", 0);
        return m;
    }

    private BigDecimal nz(BigDecimal x) {
        return x == null ? BigDecimal.ZERO : x;
    }
}
