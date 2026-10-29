package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.entity.*;
import com.hotelmanagement.repository.*;
import com.hotelmanagement.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/search")
@Tag(name = "Search", description = "Global search across modules and records")
public class SearchController {

    private final CurrentUser cu;
    private final HotelTableRepository tableRepo;
    private final HotelOrderRepository orderRepo;
    private final KotRepository kotRepo;
    private final InvoiceRepository invoiceRepo;
    private final PaymentRepository paymentRepo;
    private final PurchaseOrderRepository poRepo;
    private final BranchRepository branchRepo;
    private final StaffRepository staffRepo;

    public SearchController(
            CurrentUser cu,
            HotelTableRepository tableRepo,
            HotelOrderRepository orderRepo,
            KotRepository kotRepo,
            InvoiceRepository invoiceRepo,
            PaymentRepository paymentRepo,
            PurchaseOrderRepository poRepo,
            BranchRepository branchRepo,
            StaffRepository staffRepo
    ) {
        this.cu = cu;
        this.tableRepo = tableRepo;
        this.orderRepo = orderRepo;
        this.kotRepo = kotRepo;
        this.invoiceRepo = invoiceRepo;
        this.paymentRepo = paymentRepo;
        this.poRepo = poRepo;
        this.branchRepo = branchRepo;
        this.staffRepo = staffRepo;
    }

    public record SearchResultItem(
            String id,
            String type,
            String title,
            String subtitle,
            String tag,
            String path
    ) {}

    @GetMapping
    @Operation(summary = "Global search across tables, orders, KOTs, invoices, payments, purchases, deliveries, branches, and staff")
    public ApiResponse<?> search(
            @RequestParam("q") String query,
            @RequestParam(value = "branchId", required = false) Long branchId
    ) {
        if (query == null || query.trim().isEmpty()) {
            return ApiResponse.ok("Empty query", Collections.emptyList());
        }

        String q = query.trim().toLowerCase();
        Long bizId = cu.businessId();
        List<SearchResultItem> results = new ArrayList<>();

        // 1. Tables
        try {
            List<HotelTable> allTables = tableRepo.findAllByBusinessId(bizId);
            for (HotelTable t : allTables) {
                if (branchId != null && t.getBranch() != null && !t.getBranch().getId().equals(branchId)) {
                    continue;
                }
                String name = t.getName() != null ? t.getName().toLowerCase() : "";
                String area = t.getArea() != null ? t.getArea().toLowerCase() : "";
                String status = t.getStatus() != null ? t.getStatus().name().toLowerCase() : "";
                if (name.contains(q) || area.contains(q) || status.contains(q)) {
                    results.add(new SearchResultItem(
                            "table-" + t.getId(),
                            "TABLE",
                            t.getName(),
                            "Area: " + (t.getArea() != null ? t.getArea() : "General") + " • Capacity: " + t.getCapacity(),
                            t.getStatus() != null ? t.getStatus().name() : "AVAILABLE",
                            "/hotel/Tables"
                    ));
                    if (results.size() >= 30) break;
                }
            }
        } catch (Exception ignored) {}

        // 2. Invoices
        try {
            List<Invoice> allInvoices = invoiceRepo.findAllByBusinessId(bizId);
            for (Invoice inv : allInvoices) {
                if (branchId != null && inv.getBranch() != null && !inv.getBranch().getId().equals(branchId)) {
                    continue;
                }
                String invNo = inv.getInvoiceNumber() != null ? inv.getInvoiceNumber().toLowerCase() : "";
                String customerName = inv.getOrder() != null && inv.getOrder().getGuestName() != null ? inv.getOrder().getGuestName() : "";
                String guestName = customerName.toLowerCase();
                String status = inv.getStatus() != null ? inv.getStatus().name().toLowerCase() : "";
                if (invNo.contains(q) || guestName.contains(q) || status.contains(q)) {
                    results.add(new SearchResultItem(
                            "inv-" + inv.getId(),
                            "INVOICE",
                            inv.getInvoiceNumber(),
                            "Total: ₹" + (inv.getGrandTotal() != null ? inv.getGrandTotal() : "0") + (!customerName.isEmpty() ? " • " + customerName : ""),
                            inv.getStatus() != null ? inv.getStatus().name() : "UNPAID",
                            "/hotelbilling?invoiceId=" + inv.getId()
                    ));
                    if (results.size() >= 30) break;
                }
            }
        } catch (Exception ignored) {}

        // 3. Orders & KOTs
        try {
            List<HotelOrder> allOrders = orderRepo.findAllByBusinessId(bizId);
            for (HotelOrder ord : allOrders) {
                if (branchId != null && ord.getBranch() != null && !ord.getBranch().getId().equals(branchId)) {
                    continue;
                }
                String ordNo = ord.getOrderNumber() != null ? ord.getOrderNumber().toLowerCase() : "";
                String guest = ord.getGuestName() != null ? ord.getGuestName().toLowerCase() : "";
                String table = ord.getTable() != null && ord.getTable().getName() != null ? ord.getTable().getName().toLowerCase() : "";
                String status = ord.getStatus() != null ? ord.getStatus().name().toLowerCase() : "";
                if (ordNo.contains(q) || guest.contains(q) || table.contains(q) || status.contains(q)) {
                    results.add(new SearchResultItem(
                            "order-" + ord.getId(),
                            "ORDER",
                            ord.getOrderNumber() != null ? ord.getOrderNumber() : "Order #" + ord.getId(),
                            (ord.getTable() != null ? ord.getTable().getName() + " • " : "") + "Guest: " + (ord.getGuestName() != null ? ord.getGuestName() : "Walk-in") + " • ₹" + (ord.getTotalAmount() != null ? ord.getTotalAmount() : "0"),
                            ord.getStatus() != null ? ord.getStatus().name() : "OPEN",
                            "/hotel/kot?orderId=" + ord.getId()
                    ));
                    if (results.size() >= 30) break;
                }
            }
        } catch (Exception ignored) {}

        try {
            List<Kot> allKots = kotRepo.findAllByBusinessId(bizId);
            for (Kot k : allKots) {
                if (branchId != null && k.getBranch() != null && !k.getBranch().getId().equals(branchId)) {
                    continue;
                }
                String kotNo = k.getKotNumber() != null ? k.getKotNumber().toLowerCase() : "";
                String status = k.getStatus() != null ? k.getStatus().name().toLowerCase() : "";
                String note = k.getInstructions() != null ? k.getInstructions().toLowerCase() : "";
                if (kotNo.contains(q) || status.contains(q) || note.contains(q)) {
                    results.add(new SearchResultItem(
                            "kot-" + k.getId(),
                            "KOT",
                            k.getKotNumber(),
                            "Instructions: " + (k.getInstructions() != null ? k.getInstructions() : "Standard order"),
                            k.getStatus() != null ? k.getStatus().name() : "PENDING",
                            "/hotel/kot?kotNumber=" + k.getKotNumber()
                    ));
                    if (results.size() >= 30) break;
                }
            }
        } catch (Exception ignored) {}

        // 4. Payments
        try {
            List<Payment> allPayments = paymentRepo.findAllByBusinessId(bizId);
            for (Payment p : allPayments) {
                if (branchId != null && p.getBranch() != null && !p.getBranch().getId().equals(branchId)) {
                    continue;
                }
                String ref = p.getTransactionRef() != null ? p.getTransactionRef().toLowerCase() : "";
                String method = p.getPaymentMethod() != null ? p.getPaymentMethod().name().toLowerCase() : "";
                String note = p.getNotes() != null ? p.getNotes().toLowerCase() : "";
                if (ref.contains(q) || method.contains(q) || note.contains(q)) {
                    results.add(new SearchResultItem(
                            "pay-" + p.getId(),
                            "PAYMENT",
                            p.getTransactionRef() != null ? p.getTransactionRef() : "Payment #" + p.getId(),
                            "Amount: ₹" + (p.getAmount() != null ? p.getAmount() : "0") + " • Method: " + (p.getPaymentMethod() != null ? p.getPaymentMethod().name() : "UPI"),
                            p.getStatus() != null ? p.getStatus().name() : "SUCCESS",
                            "/hotelpayment"
                    ));
                    if (results.size() >= 30) break;
                }
            }
        } catch (Exception ignored) {}

        // 5. Purchases
        try {
            List<PurchaseOrder> allPos = poRepo.findAllByBusinessId(bizId);
            for (PurchaseOrder po : allPos) {
                if (branchId != null && po.getBranch() != null && !po.getBranch().getId().equals(branchId)) {
                    continue;
                }
                String poNo = po.getPoNumber() != null ? po.getPoNumber().toLowerCase() : "";
                String supp = po.getSupplier() != null && po.getSupplier().getName() != null ? po.getSupplier().getName().toLowerCase() : "";
                String status = po.getStatus() != null ? po.getStatus().name().toLowerCase() : "";
                if (poNo.contains(q) || supp.contains(q) || status.contains(q)) {
                    results.add(new SearchResultItem(
                            "po-" + po.getId(),
                            "PURCHASE",
                            po.getPoNumber(),
                            "Supplier: " + (po.getSupplier() != null ? po.getSupplier().getName() : "General") + " • ₹" + (po.getTotal() != null ? po.getTotal() : "0"),
                            po.getStatus() != null ? po.getStatus().name() : "ORDERED",
                            "/hotel/purchasedashboard"
                    ));
                    if (results.size() >= 30) break;
                }
            }
        } catch (Exception ignored) {}



        // 7. Branches
        try {
            List<Branch> allBranches = branchRepo.findAllByBusinessId(bizId);
            for (Branch b : allBranches) {
                String bName = b.getName() != null ? b.getName().toLowerCase() : "";
                String code = b.getCode() != null ? b.getCode().toLowerCase() : "";
                String address = b.getAddress() != null ? b.getAddress().toLowerCase() : "";
                if (bName.contains(q) || code.contains(q) || address.contains(q)) {
                    results.add(new SearchResultItem(
                            "branch-" + b.getId(),
                            "BRANCH",
                            b.getName(),
                            "Code: " + (b.getCode() != null ? b.getCode() : "N/A") + (b.getAddress() != null ? " • " + b.getAddress() : ""),
                            b.getStatus() != null ? b.getStatus() : "ACTIVE",
                            "/branches"
                    ));
                    if (results.size() >= 30) break;
                }
            }
        } catch (Exception ignored) {}

        // 8. Staff
        try {
            List<Staff> allStaff = staffRepo.findAllByBusinessId(bizId);
            for (Staff s : allStaff) {
                if (branchId != null && s.getBranch() != null && !s.getBranch().getId().equals(branchId)) {
                    continue;
                }
                String name = s.getName() != null ? s.getName().toLowerCase() : "";
                String phone = s.getPhone() != null ? s.getPhone().toLowerCase() : "";
                String designation = s.getDesignation() != null ? s.getDesignation().toLowerCase() : "";
                if (name.contains(q) || phone.contains(q) || designation.contains(q)) {
                    results.add(new SearchResultItem(
                            "staff-" + s.getId(),
                            "STAFF",
                            s.getName() != null ? s.getName() : "Staff",
                            "Designation: " + (s.getDesignation() != null ? s.getDesignation() : "Staff") + " • " + (s.getPhone() != null ? s.getPhone() : ""),
                            s.isActive() ? "ACTIVE" : "INACTIVE",
                            "/hotel/staff"
                    ));
                    if (results.size() >= 30) break;
                }
            }
        } catch (Exception ignored) {}

        return ApiResponse.ok("Search results", results);
    }
}
