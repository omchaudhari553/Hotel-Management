package com.hotelmanagement.service;
import com.hotelmanagement.dto.HotelDtos.*;
import com.hotelmanagement.entity.*;
import com.hotelmanagement.enums.*;
import com.hotelmanagement.exception.*;
import com.hotelmanagement.repository.*;
import com.hotelmanagement.security.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.*;
import java.time.*;
import java.util.*;

@Service@Transactional(readOnly = true)
public class FinancialService {
    private final CurrentUser cu;
    private final InvoiceRepository invoices;
    private final InvoiceItemRepository items;
    private final PaymentRepository payments;
    private final HotelOrderRepository orders;
    private final HotelTableRepository tables;
    private final BranchRepository branches;
    private final SupplierRepository suppliers;
    private final PurchaseOrderRepository purchaseOrders;
    private final PurchaseInvoiceRepository purchaseInvoices;
    private final SupplierPaymentRepository supplierPayments;
    private final GoodsReceiptRepository goodsReceipts;
    private final PurchaseReturnRepository purchaseReturns;
    private final KotRepository kots;
    private final NotificationRepository notifications;
    private final InventoryService inventoryService;
    private final HotelSettingRepository hotelSettings;
    public FinancialService(CurrentUser c,InvoiceRepository i,InvoiceItemRepository it,PaymentRepository p,HotelOrderRepository o,HotelTableRepository t,BranchRepository br,SupplierRepository s,PurchaseOrderRepository po,PurchaseInvoiceRepository pi,SupplierPaymentRepository sp,GoodsReceiptRepository gr,PurchaseReturnRepository pr,KotRepository kt,NotificationRepository n,InventoryService inv,HotelSettingRepository hs) {
        cu=c;
        invoices=i;
        items=it;
        payments=p;
        orders=o;
        tables=t;
        branches=br;
        suppliers=s;
        purchaseOrders=po;
        purchaseInvoices=pi;
        supplierPayments=sp;
        goodsReceipts=gr;
        purchaseReturns=pr;
        kots=kt;
        notifications=n;
        inventoryService=inv;
        hotelSettings=hs;
    }
    public Set<Long> resolveBranchIds(Long branchId) {
        if (branchId == null) {
            return Collections.emptySet();
        }
        return Set.of(branchId);
    }
    private Branch branch(Long id) {
        if (id != null) {
            Optional<Branch> ob = branches.findByIdAndBusinessId(id, cu.businessId());
            if (ob.isPresent()) return ob.get();
        }
        List<Branch> list = branches.findAllByBusinessId(cu.businessId());
        if (!list.isEmpty()) {
            return list.get(0);
        }
        Branch def = new Branch();
        def.setBusiness(cu.get().getBusiness());
        def.setName("Main Branch");
        def.setCode("MB-" + cu.businessId());
        def.setManagerName("General Manager");
        def.setContactPhone(cu.get().getPhone() != null ? cu.get().getPhone() : "9876543210");
        def.setEmail(cu.get().getEmail() != null ? cu.get().getEmail() : "branch@hotel.com");
        def.setOperatingHours("24x7");
        def.setAddress("Hotel Premises");
        def.setEstablishedOn(java.time.LocalDate.now());
        def.setStatus("ACTIVE");
        return branches.save(def);
    }
    private void pushNotification(Business biz, Branch branch, String type, String title, String message) {
        try {
            if (biz != null && notifications != null) {
                Notification notif = new Notification();
                notif.setBusiness(biz);
                notif.setBranch(branch);
                notif.setType(type);
                notif.setTitle(title);
                notif.setMessage(message);
                notif.setRead(false);
                notifications.save(notif);
            }
        } catch (Exception ignored) {}
    }
    public synchronized String generateNextInvoiceNumber() {
        return generateNextInvoiceNumber(cu.businessId());
    }

    public synchronized String generateNextInvoiceNumber(Long businessId) {
        if (businessId == null) {
            businessId = cu.businessId();
        }
        String prefix = "INV";
        long startNum = 1001L;
        try {
            Optional<HotelSetting> settingOpt = hotelSettings.findByBusinessIdAndCategoryAndSettingKey(businessId, "billing", "config");
            if (settingOpt.isEmpty()) {
                settingOpt = hotelSettings.findByBusinessIdAndCategoryAndSettingKey(businessId, "BILLING", "config");
            }
            if (settingOpt.isPresent() && settingOpt.get().getSettingValue() != null) {
                com.fasterxml.jackson.databind.JsonNode root = new com.fasterxml.jackson.databind.ObjectMapper().readTree(settingOpt.get().getSettingValue());
                if (root.has("invoicePrefix") && !root.get("invoicePrefix").asText().isBlank()) {
                    prefix = root.get("invoicePrefix").asText().trim();
                }
                if (root.has("invoiceStart")) {
                    String startStr = root.get("invoiceStart").asText().replaceAll("[^0-9]", "");
                    if (!startStr.isBlank()) {
                        startNum = Long.parseLong(startStr);
                    }
                }
            }
        } catch (Exception ignored) {}

        List<Invoice> allInvoices = invoices.findAllByBusinessId(businessId);
        long highest = startNum - 1;
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("(?i)^" + java.util.regex.Pattern.quote(prefix) + "[-_]?(\\d+)$");

        for (Invoice inv : allInvoices) {
            String invNum = inv.getInvoiceNumber();
            if (invNum != null) {
                java.util.regex.Matcher m = pattern.matcher(invNum.trim());
                if (m.matches()) {
                    try {
                        long num = Long.parseLong(m.group(1));
                        if (num > highest) {
                            highest = num;
                        }
                    } catch (Exception ignored) {}
                }
            }
        }

        long next = highest + 1;
        if (next < startNum) {
            next = startNum;
        }

        String candidate = prefix + "-" + next;
        Set<String> existingNumbers = new HashSet<>();
        for (Invoice inv : allInvoices) {
            if (inv.getInvoiceNumber() != null) {
                existingNumbers.add(inv.getInvoiceNumber().trim().toUpperCase());
            }
        }
        while (existingNumbers.contains(candidate.toUpperCase())) {
            next++;
            candidate = prefix + "-" + next;
        }

        return candidate;
    }

    @Transactional public Map<String,Object> createInvoice(InvoiceRequest q) {
        Invoice x;
        Optional<Invoice> existingInv = Optional.empty();
        if (q.orderId() != null) {
            existingInv = invoices.findFirstByOrderIdAndBusinessId(q.orderId(), cu.businessId());
            if (existingInv.isEmpty()) {
                existingInv = invoices.findFirstByOrderId(q.orderId());
            }
        }
        if (existingInv.isPresent()) {
            x = existingInv.get();
            if (x.getStatus() == InvoiceStatus.PAID) {
                return invoiceMap(x);
            }
            if (x.getInvoiceNumber() == null || x.getInvoiceNumber().isBlank() || x.getInvoiceNumber().matches("(?i)^INV-\\d{13,}$")) {
                x.setInvoiceNumber(generateNextInvoiceNumber(cu.businessId()));
            } else if (q.invoiceNumber() != null && !q.invoiceNumber().isBlank() && !q.invoiceNumber().matches("(?i)^INV-\\d{13,}$")) {
                x.setInvoiceNumber(q.invoiceNumber().trim());
            }
            x.getItems().clear();
        } else {
            x = new Invoice();
            x.setBusiness(cu.get().getBusiness());
            if (q.invoiceNumber() != null && !q.invoiceNumber().isBlank() && !q.invoiceNumber().matches("(?i)^INV-\\d{13,}$")) {
                x.setInvoiceNumber(q.invoiceNumber().trim());
            } else {
                x.setInvoiceNumber(generateNextInvoiceNumber(cu.businessId()));
            }
            x.setInvoiceDate(LocalDate.now());
        }
        x.setBranch(branch(q.branchId() != null ? q.branchId() : (x.getOrder() != null && x.getOrder().getBranch() != null ? x.getOrder().getBranch().getId() : null)));
        if(q.bookingId()!=null) x.setBookingId(q.bookingId());
        if(q.orderId()!=null) {
            HotelOrder o = orders.findByIdAndBusinessId(q.orderId(),cu.businessId()).orElseThrow(()->new NotFoundException("Order not found"));
            x.setOrder(o);
            o.setStatus(OrderStatus.BILL_REQUESTED);
            orders.save(o);
            if(o.getTable() != null) {
                HotelTable tbl = o.getTable();
                // Table MUST remain OCCUPIED while an active order or unpaid bill exists
                tbl.setStatus(TableStatus.OCCUPIED);
                tables.save(tbl);
            }
            kots.findAllByOrderId(o.getId()).forEach(k -> {
                if (k.getStatus() != KotStatus.COMPLETED && k.getStatus() != KotStatus.CANCELLED) {
                    k.setStatus(KotStatus.BILLED);
                    kots.save(k);
                }
            });
        }
        if(q.guestId()!=null) x.setGuestId(q.guestId());
        x.setDueDate(q.dueDate()==null?LocalDate.now():q.dueDate());
        x.setDiscountAmount(nz(q.discountAmount()));
        x.setCgst(BigDecimal.ZERO);
        x.setSgst(BigDecimal.ZERO);
        x.setIgst(BigDecimal.ZERO);
        BigDecimal subtotal = BigDecimal.ZERO;
        if (q.items() != null && !q.items().isEmpty()) {
            for (InvoiceItemRequest r : q.items()) {
                InvoiceItem i = new InvoiceItem();
                i.setInvoice(x);
                i.setProductId(r.productId());
                i.setDescription(r.description());
                i.setQuantity(r.quantity());
                i.setUnitPrice(r.unitPrice());
                i.setTaxRate(nz(r.taxRate()));
                i.setTotalPrice(FinancialCalculator.lineTotal(r.quantity(), r.unitPrice()));
                x.getItems().add(i);
                subtotal = subtotal.add(i.getTotalPrice());
            }
        } else if (x.getOrder() != null && x.getOrder().getItems() != null && !x.getOrder().getItems().isEmpty()) {
            for (HotelOrderItem oi : x.getOrder().getItems()) {
                InvoiceItem i = new InvoiceItem();
                i.setInvoice(x);
                i.setProductId(oi.getMenuItemId());
                i.setDescription(oi.getName());
                i.setQuantity(BigDecimal.valueOf(oi.getQuantity()));
                i.setUnitPrice(oi.getUnitPrice());
                i.setTaxRate(BigDecimal.ZERO);
                i.setTotalPrice(oi.getTotalPrice());
                x.getItems().add(i);
                subtotal = subtotal.add(i.getTotalPrice());
            }
        }
        if (subtotal.compareTo(BigDecimal.ZERO) == 0 && x.getOrder() != null && x.getOrder().getTotalAmount() != null) {
            subtotal = x.getOrder().getTotalAmount();
        }
        x.setSubtotal(subtotal);
        x.setTaxableAmount(subtotal.subtract(x.getDiscountAmount()).max(BigDecimal.ZERO));

        BigDecimal cg = q.cgstRate(), sg = q.sgstRate(), ig = q.igstRate();
        if ((cg == null || cg.compareTo(BigDecimal.ZERO) == 0) &&
            (sg == null || sg.compareTo(BigDecimal.ZERO) == 0) &&
            (ig == null || ig.compareTo(BigDecimal.ZERO) == 0)) {
            // Default GST 5% (2.5% CGST + 2.5% SGST) for food services
            cg = BigDecimal.valueOf(2.5);
            sg = BigDecimal.valueOf(2.5);
            ig = BigDecimal.ZERO;
        } else {
            cg = rate(cg);
            sg = rate(sg);
            ig = rate(ig);
        }
        // Enforce mutually exclusive supply rule: Intra-state (CGST+SGST) vs Inter-state (IGST)
        if (ig.compareTo(BigDecimal.ZERO) > 0) {
            cg = BigDecimal.ZERO;
            sg = BigDecimal.ZERO;
        } else if (cg.compareTo(BigDecimal.ZERO) > 0 || sg.compareTo(BigDecimal.ZERO) > 0) {
            ig = BigDecimal.ZERO;
        }
        x.setCgst(FinancialCalculator.tax(x.getTaxableAmount(), cg));
        x.setSgst(FinancialCalculator.tax(x.getTaxableAmount(), sg));
        x.setIgst(FinancialCalculator.tax(x.getTaxableAmount(), ig));
        x.setGrandTotal(x.getTaxableAmount().add(x.getCgst()).add(x.getSgst()).add(x.getIgst()));
        if (x.getPaidAmount() == null) x.setPaidAmount(BigDecimal.ZERO);
        x.setDueAmount(x.getGrandTotal().subtract(x.getPaidAmount()));
        if (x.getStatus() != InvoiceStatus.PAID) {
            x.setStatus(x.getDueAmount().signum() <= 0 ? InvoiceStatus.PAID : InvoiceStatus.UNPAID);
        }
        if (q.notes() != null) x.setNotes(q.notes());
        Invoice savedInv = invoices.save(x);
        String tblInfo = (savedInv.getOrder() != null && savedInv.getOrder().getTable() != null) ? " for Table " + savedInv.getOrder().getTable().getName() : "";
        pushNotification(savedInv.getBusiness(), savedInv.getBranch(), "BILL", "New Bill Generated",
                "Bill #" + savedInv.getInvoiceNumber() + tblInfo + " generated for amount ₹" + savedInv.getGrandTotal() + ".");
        return invoiceMap(savedInv);
    }
    private BigDecimal nz(BigDecimal b) {
        return b==null?BigDecimal.ZERO:b;
    }
    private BigDecimal rate(BigDecimal b) {
        return nz(b).max(BigDecimal.ZERO);
    }
    public List<Map<String,Object>> invoices() {
        return invoices(null);
    }
    public List<Map<String,Object>> invoices(Long branchId) {
        Set<Long> allowed = resolveBranchIds(branchId);
        List<Invoice> raw = invoices.findAllByBusinessId(cu.businessId()).stream()
                .filter(x -> allowed.isEmpty() || (x.getBranch() != null && allowed.contains(x.getBranch().getId())))
                .toList();

        Map<Long, Invoice> latestByOrder = new LinkedHashMap<>();
        List<Invoice> nonOrderInvoices = new ArrayList<>();

        for (Invoice inv : raw) {
            if (inv.getOrder() != null && inv.getOrder().getId() != null) {
                Long oId = inv.getOrder().getId();
                Invoice cur = latestByOrder.get(oId);
                if (cur == null) {
                    latestByOrder.put(oId, inv);
                } else {
                    if (inv.getStatus() == InvoiceStatus.PAID && cur.getStatus() != InvoiceStatus.PAID) {
                        latestByOrder.put(oId, inv);
                    } else if (inv.getStatus() == cur.getStatus() && inv.getId() > cur.getId()) {
                        latestByOrder.put(oId, inv);
                    }
                }
            } else {
                nonOrderInvoices.add(inv);
            }
        }

        List<Invoice> deduplicated = new ArrayList<>(nonOrderInvoices);
        deduplicated.addAll(latestByOrder.values());
        deduplicated.sort((a, b) -> b.getId().compareTo(a.getId()));

        return deduplicated.stream()
                .map(this::invoiceMap)
                .toList();
    }
    public Map<String,Object> invoice(Long id) {
        return invoiceMap(invoices.findByIdAndBusinessId(id,cu.businessId()).orElseThrow(()->new NotFoundException("Invoice not found")));
    }
    private Map<String,Object> invoiceMap(Invoice x) {
        Map<String,Object> m=new LinkedHashMap<>();
        m.put("id",x.getId());
        m.put("businessId",cu.businessId());
        m.put("branchId", x.getBranch() == null ? null : x.getBranch().getId());
        m.put("branchName", x.getBranch() == null ? "" : x.getBranch().getName());
        m.put("branchCode", x.getBranch() == null ? "" : x.getBranch().getCode());
        m.put("invoiceNumber",x.getInvoiceNumber());
        m.put("orderId",x.getOrder()==null?null:x.getOrder().getId());
        m.put("orderNumber",x.getOrder()==null?null:x.getOrder().getOrderNumber());
        m.put("tableId",(x.getOrder()!=null && x.getOrder().getTable()!=null)?x.getOrder().getTable().getId():null);
        m.put("tableNumber",(x.getOrder()!=null && x.getOrder().getTable()!=null)?x.getOrder().getTable().getName():"");
        String kotNum = null;
        if (x.getOrder() != null) {
            List<Kot> ordKots = kots.findAllByOrderId(x.getOrder().getId());
            if (!ordKots.isEmpty()) {
                kotNum = ordKots.get(0).getKotNumber();
            }
        }
        m.put("kotNumber", kotNum);
        m.put("customerId",x.getGuestId());
        String custName = "";
        if(x.getOrder()!=null && x.getOrder().getGuestName()!=null) {
            custName = x.getOrder().getGuestName();
        }
        m.put("customerName",custName);
        m.put("guestName",custName);
        m.put("subtotal",x.getSubtotal());
        m.put("discountAmount",x.getDiscountAmount());
        m.put("taxableAmount",x.getTaxableAmount() != null ? x.getTaxableAmount() : (x.getSubtotal() != null ? x.getSubtotal().subtract(nz(x.getDiscountAmount())).max(BigDecimal.ZERO) : BigDecimal.ZERO));
        m.put("cgst",nz(x.getCgst()));
        m.put("sgst",nz(x.getSgst()));
        m.put("igst",nz(x.getIgst()));
        m.put("taxAmount",nz(x.getCgst()).add(nz(x.getSgst())).add(nz(x.getIgst())));
        m.put("grandTotal",x.getGrandTotal());
        m.put("totalAmount",x.getGrandTotal());
        m.put("total",x.getGrandTotal());
        m.put("paidAmount",x.getPaidAmount());
        m.put("dueAmount",x.getDueAmount());
        m.put("status",x.getStatus());
        m.put("paymentMethod",x.getPaymentMethod());
        m.put("dueDate",x.getDueDate());
        m.put("invoiceDate",x.getInvoiceDate());
        m.put("notes",x.getNotes());
        m.put("items",x.getItems().stream().map(i-> {
            Map<String,Object> z = new LinkedHashMap<>();
            z.put("id",i.getId());
            z.put("description",i.getDescription());
            z.put("itemName",i.getDescription());
            z.put("name",i.getDescription());
            z.put("quantity",i.getQuantity());
            z.put("qty",i.getQuantity());
            z.put("unitPrice",i.getUnitPrice());
            z.put("price",i.getUnitPrice());
            z.put("taxRate",i.getTaxRate());
            z.put("totalPrice",i.getTotalPrice());
            return z;
        }).toList());
        m.put("createdAt",x.getCreatedAt());
        return m;
    }
    @Transactional public Map<String,Object> pay(PaymentRequest q) {
        Invoice x=invoices.findByIdAndBusinessId(q.invoiceId(),cu.businessId()).orElseThrow(()->new NotFoundException("Invoice not found"));
        if(x.getStatus()==InvoiceStatus.CANCELLED)throw new ConflictException("Cancelled invoice cannot be paid");

        // 1. Fetch all existing successful payments for this invoice
        List<Payment> existingPayments = payments.findAllByInvoiceId(x.getId()).stream()
                .filter(p -> p.getStatus() == PaymentStatus.SUCCESS)
                .toList();

        BigDecimal sumPaid = existingPayments.stream()
                .map(Payment::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 2. If invoice is already PAID or existing payments already cover the grand total
        if (x.getStatus() == InvoiceStatus.PAID || 
            (x.getGrandTotal() != null && sumPaid.compareTo(x.getGrandTotal()) >= 0) ||
            (x.getDueAmount() != null && x.getDueAmount().compareTo(BigDecimal.ZERO) <= 0 && sumPaid.compareTo(BigDecimal.ZERO) > 0)) {
            if (x.getStatus() != InvoiceStatus.PAID) {
                x.setStatus(InvoiceStatus.PAID);
                x.setPaidAmount(x.getGrandTotal());
                x.setDueAmount(BigDecimal.ZERO);
                invoices.save(x);
            }
            return invoiceMap(x);
        }

        // 3. Deterministic transaction reference for idempotency
        String transactionRef = q.transactionRef() == null ? null : q.transactionRef().trim();
        if (transactionRef == null || transactionRef.isBlank() || transactionRef.startsWith("TXN-" + (System.currentTimeMillis() / 100000))) {
            transactionRef = "TXN-INV-" + x.getId();
        }

        if (payments.existsByTransactionRef(transactionRef)) {
            if (x.getStatus() == InvoiceStatus.PAID || sumPaid.compareTo(x.getGrandTotal()) >= 0) {
                if (x.getStatus() != InvoiceStatus.PAID) {
                    x.setStatus(InvoiceStatus.PAID);
                    x.setPaidAmount(x.getGrandTotal());
                    x.setDueAmount(BigDecimal.ZERO);
                    invoices.save(x);
                }
                return invoiceMap(x);
            }
            // For a subsequent installment with a repeated default ref, make it unique
            transactionRef = transactionRef + "-" + System.currentTimeMillis();
        }

        // 4. Check if an existing payment already covers this exact transaction
        BigDecimal reqAmount = q.amount() != null ? q.amount() : BigDecimal.ZERO;
        boolean alreadyHasSamePayment = existingPayments.stream()
                .anyMatch(p -> p.getAmount() != null && p.getAmount().compareTo(reqAmount) == 0);
        if (alreadyHasSamePayment && (reqAmount.compareTo(x.getGrandTotal()) == 0 || reqAmount.compareTo(nz(x.getDueAmount())) >= 0)) {
            x.setStatus(InvoiceStatus.PAID);
            x.setPaidAmount(x.getGrandTotal());
            x.setDueAmount(BigDecimal.ZERO);
            invoices.save(x);
            settleOrderAndTableOnPayment(x);
            return invoiceMap(x);
        }

        BigDecimal due = x.getGrandTotal().subtract(nz(x.getPaidAmount()));
        if (due.signum() <= 0) {
            x.setStatus(InvoiceStatus.PAID);
            x.setDueAmount(BigDecimal.ZERO);
            invoices.save(x);
            settleOrderAndTableOnPayment(x);
            return invoiceMap(x);
        }

        // Gracefully cap amountToPay to outstanding due so counter settlement never fails
        BigDecimal amountToPay = q.amount();
        if (amountToPay == null || amountToPay.compareTo(BigDecimal.ZERO) <= 0 || amountToPay.compareTo(due) >= 0) {
            amountToPay = due;
        }

        Payment p = new Payment();
        p.setBusiness(cu.get().getBusiness());
        p.setBranch(x.getBranch());
        p.setInvoice(x);
        p.setAmount(amountToPay);
        String normalizedPaymentMethod = q.paymentMethod() == null ? "" :
                q.paymentMethod().trim().toUpperCase()
                        .replace("-", "_")
                        .replace(" ", "_");
        if ("BANK".equals(normalizedPaymentMethod) || "BANK_TRANSFER".equals(normalizedPaymentMethod) || "NET_BANKING".equals(normalizedPaymentMethod)) {
            throw new ConflictException("Net Banking is not supported for guest billing. Allowed payment methods: UPI, CASH, CARD");
        }
        if ("CREDIT_CARD".equals(normalizedPaymentMethod) || "DEBIT_CARD".equals(normalizedPaymentMethod)) normalizedPaymentMethod = "CARD";
        if ("ONLINE".equals(normalizedPaymentMethod)) normalizedPaymentMethod = "UPI";
        if (!"CASH".equals(normalizedPaymentMethod) && !"UPI".equals(normalizedPaymentMethod) && !"CARD".equals(normalizedPaymentMethod)) {
            throw new ConflictException("Invalid payment method. Allowed payment methods: UPI, CASH, CARD");
        }
        p.setPaymentMethod(PaymentMethod.valueOf(normalizedPaymentMethod));
        p.setTransactionRef(transactionRef);
        p.setPaymentDate(q.paymentDate() != null ? q.paymentDate() : LocalDate.now());
        p.setStatus(PaymentStatus.SUCCESS);
        p.setNotes(q.notes());
        p.setCreatedBy(cu.get());

        try {
            payments.saveAndFlush(p);
        } catch (org.springframework.dao.DataIntegrityViolationException dive) {
            // Unique constraint on transaction_ref prevented concurrent duplicate payment
            settleOrderAndTableOnPayment(x);
            return invoiceMap(x);
        }

        BigDecimal updatedPaidAmount = nz(x.getPaidAmount()).add(amountToPay);
        x.setPaidAmount(updatedPaidAmount);
        x.setDueAmount(x.getGrandTotal().subtract(updatedPaidAmount).max(BigDecimal.ZERO));
        boolean isFullyPaid = x.getDueAmount().signum() <= 0;
        x.setStatus(isFullyPaid ? InvoiceStatus.PAID : InvoiceStatus.PARTIAL);
        x.setPaymentMethod(normalizedPaymentMethod);
        invoices.save(x);

        pushNotification(x.getBusiness(), x.getBranch(), "PAYMENT", "Payment Received",
                "Bill #" + x.getInvoiceNumber() + " settled for ₹" + amountToPay + " via " + p.getPaymentMethod() + " (Ref: " + p.getTransactionRef() + ").");

        if (isFullyPaid) {
            settleOrderAndTableOnPayment(x);
        }
        return invoiceMap(x);
    }

    private void settleOrderAndTableOnPayment(Invoice x) {
        HotelOrder ord = x.getOrder();
        if (ord == null) {
            List<HotelOrder> businessOrders = orders.findAllByBusinessId(cu.businessId());
            for (HotelOrder bo : businessOrders) {
                if (bo.getOrderNumber() != null && bo.getOrderNumber().equalsIgnoreCase(x.getInvoiceNumber())) {
                    ord = bo;
                    break;
                }
            }
        }
        if (ord != null) {
            ord.setStatus(OrderStatus.COMPLETED);
            orders.saveAndFlush(ord);
            if (ord.getTable() != null) {
                Long tableId = ord.getTable().getId();
                tables.findById(tableId).ifPresent(tbl -> {
                    tbl.setStatus(TableStatus.CLEANING);
                    tbl.setUpdatedAt(java.time.LocalDateTime.now());
                    tbl.setGuest(null);
                    tbl.setGuestCount(null);
                    tbl.setNote(null);
                    tables.saveAndFlush(tbl);
                });
            }
            List<Kot> associatedKots = kots.findAllByOrderId(ord.getId());
            for (Kot kItem : associatedKots) {
                kItem.setStatus(KotStatus.COMPLETED);
                kots.saveAndFlush(kItem);
            }
        }
    }
    @Transactional(readOnly = true) public List<Map<String,Object>> payments() {
        return payments(null);
    }
    @Transactional(readOnly = true) public List<Map<String,Object>> payments(Long branchId) {
        Set<Long> allowed = resolveBranchIds(branchId);
        List<Payment> raw = payments.findAllByBusinessId(cu.businessId()).stream()
                .filter(p -> {
                    if (allowed.isEmpty()) return true;
                    Long bId = p.getBranch() != null ? p.getBranch().getId() : (p.getInvoice() != null && p.getInvoice().getBranch() != null ? p.getInvoice().getBranch().getId() : null);
                    return bId != null && allowed.contains(bId);
                })
                .toList();

        Map<String, Payment> uniquePayments = new LinkedHashMap<>();
        for (Payment p : raw) {
            String key;
            if (p.getInvoice() != null && p.getInvoice().getId() != null) {
                key = "INV_" + p.getInvoice().getId();
            } else if (p.getTransactionRef() != null && !p.getTransactionRef().isBlank()) {
                key = "TXN_" + p.getTransactionRef().trim().toUpperCase();
            } else {
                key = "PAY_" + p.getId();
            }
            Payment existing = uniquePayments.get(key);
            if (existing == null) {
                uniquePayments.put(key, p);
            } else {
                if (p.getAmount() != null && (existing.getAmount() == null || p.getAmount().compareTo(existing.getAmount()) > 0)) {
                    uniquePayments.put(key, p);
                }
            }
        }

        return uniquePayments.values().stream()
                .sorted((a, b) -> b.getId().compareTo(a.getId()))
                .map(p-> {
            Map<String,Object> m=new LinkedHashMap<>();
            m.put("id",p.getId());
            m.put("invoiceId",p.getInvoice()==null?null:p.getInvoice().getId());
            m.put("invoiceNumber",p.getInvoice()==null?null:p.getInvoice().getInvoiceNumber());
            Long bId = p.getBranch() != null ? p.getBranch().getId() : (p.getInvoice() != null && p.getInvoice().getBranch() != null ? p.getInvoice().getBranch().getId() : null);
            String bName = p.getBranch() != null ? p.getBranch().getName() : (p.getInvoice() != null && p.getInvoice().getBranch() != null ? p.getInvoice().getBranch().getName() : "");
            String bCode = p.getBranch() != null ? p.getBranch().getCode() : (p.getInvoice() != null && p.getInvoice().getBranch() != null ? p.getInvoice().getBranch().getCode() : "");
            m.put("branchId", bId);
            m.put("branchName", bName);
            m.put("branchCode", bCode);
            m.put("orderId", p.getInvoice() != null && p.getInvoice().getOrder() != null ? p.getInvoice().getOrder().getId() : null);
            m.put("orderNumber", p.getInvoice() != null && p.getInvoice().getOrder() != null ? p.getInvoice().getOrder().getOrderNumber() : "");
            String kotNum = "";
            if (p.getInvoice() != null && p.getInvoice().getOrder() != null) {
                List<Kot> ordKots = kots.findAllByOrderId(p.getInvoice().getOrder().getId());
                if (!ordKots.isEmpty()) {
                    kotNum = ordKots.get(0).getKotNumber();
                }
            }
            m.put("kotNumber", kotNum);
            String cName = "Customer";
            String tblName = "";
            Long tblId = null;
            if(p.getInvoice() != null) {
                if(p.getInvoice().getOrder() != null && p.getInvoice().getOrder().getGuestName() != null) {
                    cName = p.getInvoice().getOrder().getGuestName();
                }
                if(p.getInvoice().getOrder() != null && p.getInvoice().getOrder().getTable() != null) {
                    tblId = p.getInvoice().getOrder().getTable().getId();
                    tblName = p.getInvoice().getOrder().getTable().getName();
                }
            }
            m.put("customerName",cName);
            m.put("tableId",tblId);
            m.put("tableName",tblName);
            m.put("tableNumber",tblName);
            m.put("amount",p.getAmount());
            m.put("paymentMethod",p.getPaymentMethod());
            m.put("transactionRef",p.getTransactionRef());
            m.put("paymentDate",p.getPaymentDate());
            m.put("status",p.getStatus());
            return m;
        }).toList();
    }
    @Transactional public Map<String,Object> createPurchaseOrder(PurchaseOrderRequest q) {
        Supplier s=suppliers.findByIdAndBusinessId(q.supplierId(),cu.businessId()).orElseThrow(()->new NotFoundException("Supplier not found"));
        PurchaseOrder x=new PurchaseOrder();
        x.setBusiness(cu.get().getBusiness());
        x.setBranch(branch(q.branchId()));
        x.setSupplier(s);
        x.setPoNumber("PO-"+System.currentTimeMillis());
        x.setPoDate(q.poDate()==null?LocalDate.now():q.poDate());
        x.setExpectedDeliveryDate(q.expectedDeliveryDate());
        x.setNotes(q.notes());
        BigDecimal total=BigDecimal.ZERO;
        if(q.items()!=null)for(PurchaseOrderItemRequest r:q.items()) {
            PurchaseOrderItem i=new PurchaseOrderItem();
            i.setPurchaseOrder(x);
            i.setItemName(r.itemName());
            i.setUnit(r.unit());
            i.setQuantity(r.quantity());
            i.setUnitPrice(r.unitPrice());
            i.setTaxRate(nz(r.taxRate()));
            BigDecimal base=r.quantity().multiply(r.unitPrice());
            i.setTotal(base.add(base.multiply(i.getTaxRate()).divide(BigDecimal.valueOf(100),2,RoundingMode.HALF_UP)));
            x.getItems().add(i);
            total=total.add(i.getTotal());
        }
        x.setTotal(total);
        PurchaseStatus status = PurchaseStatus.ORDERED;
        if (q.status() != null && !q.status().isBlank()) {
            try {
                status = PurchaseStatus.valueOf(q.status().trim().toUpperCase());
            } catch (Exception ignored) {
                status = PurchaseStatus.ORDERED;
            }
        }
        x.setStatus(status);
        return purchaseOrderMap(purchaseOrders.save(x));
    }
    public List<Map<String,Object>> purchaseOrders() {
        return purchaseOrders(null);
    }
    public List<Map<String,Object>> purchaseOrders(Long branchId) {
        Set<Long> allowed = resolveBranchIds(branchId);
        return purchaseOrders.findAllByBusinessId(cu.businessId()).stream()
                .filter(x -> allowed.isEmpty() || (x.getBranch() != null && allowed.contains(x.getBranch().getId())))
                .map(this::purchaseOrderMap).toList();
    }
    public Map<String,Object> getPurchaseOrder(Long id) {
        return purchaseOrderMap(purchaseOrders.findByIdAndBusinessId(id,cu.businessId()).orElseThrow(()->new NotFoundException("Purchase order not found")));
    }
    @Transactional public Map<String,Object> updatePurchaseOrder(Long id, PurchaseOrderRequest q) {
        PurchaseOrder x = purchaseOrders.findByIdAndBusinessId(id,cu.businessId()).orElseThrow(()->new NotFoundException("Purchase order not found"));
        if (q.supplierId() != null) {
            Supplier s = suppliers.findByIdAndBusinessId(q.supplierId(),cu.businessId()).orElseThrow(()->new NotFoundException("Supplier not found"));
            x.setSupplier(s);
        }
        if (q.poDate() != null) x.setPoDate(q.poDate());
        if (q.expectedDeliveryDate() != null) x.setExpectedDeliveryDate(q.expectedDeliveryDate());
        if (q.notes() != null) x.setNotes(q.notes());
        if (q.status() != null && !q.status().isBlank()) {
            try {
                x.setStatus(PurchaseStatus.valueOf(q.status().trim().toUpperCase()));
            } catch (Exception ignored) {}
        }
        if (q.items() != null) {
            x.getItems().clear();
            BigDecimal total = BigDecimal.ZERO;
            for (PurchaseOrderItemRequest r : q.items()) {
                PurchaseOrderItem i = new PurchaseOrderItem();
                i.setPurchaseOrder(x);
                i.setItemName(r.itemName());
                i.setUnit(r.unit());
                i.setQuantity(r.quantity());
                i.setUnitPrice(r.unitPrice());
                i.setTaxRate(nz(r.taxRate()));
                BigDecimal base = r.quantity().multiply(r.unitPrice());
                i.setTotal(base.add(base.multiply(i.getTaxRate()).divide(BigDecimal.valueOf(100),2,RoundingMode.HALF_UP)));
                x.getItems().add(i);
                total = total.add(i.getTotal());
            }
            x.setTotal(total);
        }
        return purchaseOrderMap(purchaseOrders.save(x));
    }
    @Transactional public Map<String,Object> updatePurchaseOrderStatus(Long id, String status) {
        PurchaseOrder x = purchaseOrders.findByIdAndBusinessId(id,cu.businessId()).orElseThrow(()->new NotFoundException("Purchase order not found"));
        try {
            x.setStatus(PurchaseStatus.valueOf(status.trim().toUpperCase()));
        } catch(Exception e) {
            throw new ConflictException("Invalid purchase status: " + status);
        }
        return purchaseOrderMap(purchaseOrders.save(x));
    }
    @Transactional public Map<String,Object> deletePurchaseOrder(Long id) {
        PurchaseOrder x = purchaseOrders.findByIdAndBusinessId(id,cu.businessId()).orElseThrow(()->new NotFoundException("Purchase order not found"));
        purchaseOrders.delete(x);
        return Map.of("id",id,"deleted",true);
    }
    private Map<String,Object> purchaseOrderMap(PurchaseOrder x) {
        Map<String,Object> m=new LinkedHashMap<>();
        m.put("id",x.getId());
        m.put("branchId", x.getBranch() == null ? null : x.getBranch().getId());
        m.put("branchName", x.getBranch() == null ? "" : x.getBranch().getName());
        m.put("branchCode", x.getBranch() == null ? "" : x.getBranch().getCode());
        m.put("poNumber",x.getPoNumber());
        m.put("supplierId",x.getSupplier()==null?null:x.getSupplier().getId());
        m.put("supplierName",x.getSupplier()==null?null:x.getSupplier().getName());
        m.put("poDate",x.getPoDate());
        m.put("expectedDeliveryDate",x.getExpectedDeliveryDate());
        m.put("status",x.getStatus());
        m.put("total",x.getTotal());
        m.put("totalAmount",x.getTotal());
        m.put("notes",x.getNotes());
        m.put("items",x.getItems().stream().map(i-> {
            Map<String,Object> z=new LinkedHashMap<>();
            z.put("id",i.getId());
            z.put("itemName",i.getItemName());
            z.put("unit",i.getUnit());
            z.put("quantity",i.getQuantity());
            z.put("unitPrice",i.getUnitPrice());
            z.put("taxRate",i.getTaxRate());
            z.put("total",i.getTotal());
            return z;
        }).toList());
        return m;
    }
    @Transactional public Map<String,Object> createPurchaseInvoice(PurchaseInvoiceRequest q) {
        Supplier s=suppliers.findByIdAndBusinessId(q.supplierId(),cu.businessId()).orElseThrow(()->new NotFoundException("Supplier not found"));
        if (q.invoiceNumber() != null && !q.invoiceNumber().isBlank()) {
            boolean dupInv = purchaseInvoices.findAllByBusinessId(cu.businessId()).stream()
                .anyMatch(inv -> inv.getSupplier() != null && inv.getSupplier().getId().equals(s.getId())
                        && q.invoiceNumber().trim().equalsIgnoreCase(inv.getInvoiceNumber().trim()));
            if (dupInv) {
                throw new ConflictException("Purchase invoice with number '" + q.invoiceNumber() + "' already exists for supplier " + s.getName());
            }
        }
        if (q.goodsReceiptId() != null) {
            boolean grnAlreadyInvoiced = purchaseInvoices.findAllByBusinessId(cu.businessId()).stream()
                .anyMatch(inv -> inv.getGoodsReceipt() != null && inv.getGoodsReceipt().getId().equals(q.goodsReceiptId()));
            if (grnAlreadyInvoiced) {
                throw new ConflictException("A purchase invoice has already been generated for this Goods Receipt Note.");
            }
        }
        PurchaseInvoice x=new PurchaseInvoice();
        x.setBusiness(cu.get().getBusiness());
        x.setSupplier(s);
        x.setPurchaseOrder(q.purchaseOrderId()==null?null:purchaseOrders.findByIdAndBusinessId(q.purchaseOrderId(),cu.businessId()).orElse(null));
        if (q.goodsReceiptId() != null) {
            x.setGoodsReceipt(goodsReceipts.findByIdAndBusinessId(q.goodsReceiptId(), cu.businessId()).orElse(null));
        }
        x.setInvoiceNumber(q.invoiceNumber());
        x.setInvoiceDate(q.invoiceDate()==null?LocalDate.now():q.invoiceDate());
        x.setDueDate(q.dueDate());
        x.setTotal(q.total());
        x.setSubtotal(q.subtotal() != null ? q.subtotal() : q.total());
        x.setTaxAmount(q.taxAmount() != null ? q.taxAmount() : BigDecimal.ZERO);
        x.setDiscountAmount(q.discountAmount() != null ? q.discountAmount() : BigDecimal.ZERO);
        x.setNotes(q.notes());
        x.setPaymentMethod(q.paymentMethod());
        x.setPaidAmount(BigDecimal.ZERO);
        x.setDueAmount(q.total());
        x.setPaymentStatus("DUE");
        x.setStatus("ACTIVE");

        if (q.items() != null && !q.items().isEmpty()) {
            for (PurchaseInvoiceItemRequest it : q.items()) {
                PurchaseInvoiceItem item = new PurchaseInvoiceItem();
                item.setPurchaseInvoice(x);
                item.setItemName(it.itemName());
                item.setQuantity(it.quantity() != null ? it.quantity() : BigDecimal.ONE);
                item.setUnitPrice(it.unitPrice() != null ? it.unitPrice() : BigDecimal.ZERO);
                item.setDiscountPercent(it.discountPercent() != null ? it.discountPercent() : BigDecimal.ZERO);
                item.setTaxRate(it.taxRate() != null ? it.taxRate() : BigDecimal.ZERO);
                item.setTotal(it.total() != null ? it.total() : item.getQuantity().multiply(item.getUnitPrice()));
                x.getItems().add(item);
            }
        }
        return purchaseInvoiceMap(purchaseInvoices.save(x));
    }
    public List<Map<String,Object>> purchaseInvoices() {
        return purchaseInvoices.findAllByBusinessId(cu.businessId()).stream().map(this::purchaseInvoiceMap).toList();
    }
    private Map<String,Object> purchaseInvoiceMap(PurchaseInvoice x) {
        Map<String,Object> m=new LinkedHashMap<>();
        m.put("id",x.getId());
        m.put("supplierId",x.getSupplier()==null?null:x.getSupplier().getId());
        m.put("supplierName",x.getSupplier()==null?null:x.getSupplier().getName());
        m.put("purchaseOrderId",x.getPurchaseOrder()==null?null:x.getPurchaseOrder().getId());
        m.put("poNumber",x.getPurchaseOrder()==null?null:x.getPurchaseOrder().getPoNumber());
        m.put("goodsReceiptId",x.getGoodsReceipt()==null?null:x.getGoodsReceipt().getId());
        m.put("grnNumber",x.getGoodsReceipt()==null?null:x.getGoodsReceipt().getGrnNumber());
        m.put("invoiceNumber",x.getInvoiceNumber());
        m.put("invoiceDate",x.getInvoiceDate());
        m.put("dueDate",x.getDueDate());
        m.put("subtotal",x.getSubtotal() != null ? x.getSubtotal() : x.getTotal());
        m.put("taxAmount",x.getTaxAmount() != null ? x.getTaxAmount() : BigDecimal.ZERO);
        m.put("discountAmount",x.getDiscountAmount() != null ? x.getDiscountAmount() : BigDecimal.ZERO);
        m.put("total",x.getTotal());
        m.put("paidAmount",x.getPaidAmount());
        m.put("dueAmount",x.getDueAmount());
        m.put("paymentStatus",x.getPaymentStatus());
        m.put("status",x.getStatus());
        m.put("notes",x.getNotes());
        m.put("paymentMethod",x.getPaymentMethod());
        m.put("items",x.getItems().stream().map(i->Map.of(
            "id",i.getId(),
            "name",i.getItemName(),
            "itemName",i.getItemName(),
            "qty",i.getQuantity(),
            "quantity",i.getQuantity(),
            "rate",i.getUnitPrice(),
            "unitPrice",i.getUnitPrice(),
            "discount",i.getDiscountPercent() != null ? i.getDiscountPercent() : BigDecimal.ZERO,
            "gst",i.getTaxRate() != null ? i.getTaxRate() : BigDecimal.ZERO,
            "total",i.getTotal()
        )).toList());
        return m;
    }

    // GOODS RECEIPT METHODS
    @Transactional public Map<String,Object> createGoodsReceipt(GoodsReceiptRequest q) {
        Supplier s = suppliers.findByIdAndBusinessId(q.supplierId(), cu.businessId()).orElseThrow(() -> new NotFoundException("Supplier not found"));
        if (q.grnNumber() != null && !q.grnNumber().isBlank()) {
            boolean dupGrn = goodsReceipts.findAllByBusinessId(cu.businessId()).stream()
                .anyMatch(g -> q.grnNumber().trim().equalsIgnoreCase(g.getGrnNumber().trim()));
            if (dupGrn) {
                throw new ConflictException("Goods Receipt Note with number '" + q.grnNumber() + "' already exists.");
            }
        }
        GoodsReceipt gr = new GoodsReceipt();
        gr.setBusiness(cu.get().getBusiness());
        gr.setBranch(branch(q.branchId()));
        gr.setSupplier(s);
        PurchaseOrder po = q.purchaseOrderId() == null ? null : purchaseOrders.findByIdAndBusinessId(q.purchaseOrderId(), cu.businessId()).orElse(null);
        gr.setPurchaseOrder(po);
        String grnNum = (q.grnNumber() != null && !q.grnNumber().isBlank()) ? q.grnNumber() : "GRN-" + System.currentTimeMillis();
        gr.setGrnNumber(grnNum);
        gr.setGrnDate(q.grnDate() == null ? LocalDate.now() : q.grnDate());
        gr.setReceivedBy(q.receivedBy() != null ? q.receivedBy() : "");
        gr.setStatus(q.status() != null ? q.status() : "RECEIVED");
        gr.setNotes(q.notes());

        BigDecimal ordQty = BigDecimal.ZERO;
        BigDecimal recQty = BigDecimal.ZERO;
        BigDecimal accQty = BigDecimal.ZERO;
        BigDecimal rejQty = BigDecimal.ZERO;

        if (q.items() != null && !q.items().isEmpty()) {
            for (GoodsReceiptItemRequest it : q.items()) {
                GoodsReceiptItem item = new GoodsReceiptItem();
                item.setGoodsReceipt(gr);
                item.setItemName(it.itemName());
                item.setUnit(it.unit() != null ? it.unit() : "PCS");
                item.setOrderedQty(it.orderedQty() != null ? it.orderedQty() : BigDecimal.ZERO);
                item.setReceivedQty(it.receivedQty() != null ? it.receivedQty() : BigDecimal.ZERO);
                item.setAcceptedQty(it.acceptedQty() != null ? it.acceptedQty() : item.getReceivedQty());
                item.setRejectedQty(it.rejectedQty() != null ? it.rejectedQty() : item.getReceivedQty().subtract(item.getAcceptedQty()).max(BigDecimal.ZERO));
                item.setBatchNo(it.batchNo());
                item.setExpiryDate(it.expiryDate());
                gr.getItems().add(item);

                ordQty = ordQty.add(item.getOrderedQty());
                recQty = recQty.add(item.getReceivedQty());
                accQty = accQty.add(item.getAcceptedQty());
                rejQty = rejQty.add(item.getRejectedQty());

                // Update inventory stock ONLY for valid accepted quantities
                if (item.getAcceptedQty() != null && item.getAcceptedQty().compareTo(BigDecimal.ZERO) > 0) {
                    try {
                        inventoryService.recordStockInwardByName(
                            item.getItemName(),
                            item.getUnit(),
                            item.getAcceptedQty().intValue(),
                            grnNum,
                            "Goods Receipt " + grnNum + " accepted from " + s.getName()
                        );
                    } catch (Exception e) {
                        // Keep transaction alive even if product setting write encounters an issue
                    }
                }
            }
        }
        gr.setTotalOrderedQty(ordQty);
        gr.setTotalReceivedQty(recQty);
        gr.setTotalAcceptedQty(accQty);
        gr.setTotalRejectedQty(rejQty);

        if (po != null) {
            BigDecimal poOrderedQty = po.getItems().stream()
                .map(PurchaseOrderItem::getQuantity)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal priorAccepted = goodsReceipts.findAllByBusinessId(cu.businessId()).stream()
                .filter(g -> g.getPurchaseOrder() != null && g.getPurchaseOrder().getId().equals(po.getId()))
                .flatMap(g -> g.getItems().stream())
                .map(GoodsReceiptItem::getAcceptedQty)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalAccepted = priorAccepted.add(accQty);
            if (poOrderedQty.compareTo(BigDecimal.ZERO) > 0 && totalAccepted.compareTo(poOrderedQty) >= 0) {
                po.setStatus(PurchaseStatus.RECEIVED);
            } else if (totalAccepted.compareTo(BigDecimal.ZERO) > 0) {
                po.setStatus(PurchaseStatus.PARTIALLY_RECEIVED);
            }
            purchaseOrders.save(po);
        }

        return goodsReceiptMap(goodsReceipts.save(gr));
    }

    public List<Map<String,Object>> goodsReceipts() {
        return goodsReceipts.findAllByBusinessId(cu.businessId()).stream().map(this::goodsReceiptMap).toList();
    }

    private Map<String,Object> goodsReceiptMap(GoodsReceipt x) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", x.getId());
        m.put("supplierId", x.getSupplier() == null ? null : x.getSupplier().getId());
        m.put("supplierName", x.getSupplier() == null ? null : x.getSupplier().getName());
        m.put("purchaseOrderId", x.getPurchaseOrder() == null ? null : x.getPurchaseOrder().getId());
        m.put("poNumber", x.getPurchaseOrder() == null ? null : x.getPurchaseOrder().getPoNumber());
        m.put("grnNumber", x.getGrnNumber());
        m.put("grnDate", x.getGrnDate());
        m.put("receivedBy", x.getReceivedBy());
        m.put("status", x.getStatus());
        m.put("totalOrderedQty", x.getTotalOrderedQty());
        m.put("totalReceivedQty", x.getTotalReceivedQty());
        m.put("totalAcceptedQty", x.getTotalAcceptedQty());
        m.put("totalRejectedQty", x.getTotalRejectedQty());
        m.put("notes", x.getNotes());
        m.put("items", x.getItems().stream().map(i -> {
            Map<String,Object> itm = new LinkedHashMap<>();
            itm.put("id", i.getId());
            itm.put("name", i.getItemName());
            itm.put("itemName", i.getItemName());
            itm.put("unit", i.getUnit());
            itm.put("orderedQty", i.getOrderedQty());
            itm.put("receivedQty", i.getReceivedQty());
            itm.put("acceptedQty", i.getAcceptedQty());
            itm.put("rejectedQty", i.getRejectedQty());
            itm.put("batchNo", i.getBatchNo());
            itm.put("expiryDate", i.getExpiryDate());
            return itm;
        }).toList());
        return m;
    }

    // PURCHASE RETURN METHODS
    @Transactional public Map<String,Object> createPurchaseReturn(PurchaseReturnRequest q) {
        Supplier s = suppliers.findByIdAndBusinessId(q.supplierId(), cu.businessId()).orElseThrow(() -> new NotFoundException("Supplier not found"));
        PurchaseReturn pr = new PurchaseReturn();
        pr.setBusiness(cu.get().getBusiness());
        PurchaseInvoice inv = q.purchaseInvoiceId() == null ? null :
                purchaseInvoices.findByIdAndBusinessId(q.purchaseInvoiceId(), cu.businessId())
                        .orElseThrow(() -> new NotFoundException("Purchase invoice not found"));
        PurchaseOrder po = q.purchaseOrderId() == null ? (inv != null ? inv.getPurchaseOrder() : null) :
                purchaseOrders.findByIdAndBusinessId(q.purchaseOrderId(), cu.businessId())
                        .orElseThrow(() -> new NotFoundException("Purchase order not found"));
        Long requestedBranchId = q.branchId();
        if (requestedBranchId == null && po != null && po.getBranch() != null) requestedBranchId = po.getBranch().getId();
        pr.setBranch(branch(requestedBranchId));
        pr.setSupplier(s);
        pr.setPurchaseInvoice(inv);
        pr.setPurchaseOrder(po);
        String retNum = (q.returnNumber() != null && !q.returnNumber().isBlank()) ? q.returnNumber() : "PR-" + System.currentTimeMillis();
        pr.setReturnNumber(retNum);
        pr.setReturnDate(q.returnDate() == null ? LocalDate.now() : q.returnDate());
        pr.setStatus(q.status() != null ? q.status() : "COMPLETED");
        pr.setReason(q.reason());

        BigDecimal totalAmt = BigDecimal.ZERO;
        if (q.items() != null && !q.items().isEmpty()) {
            for (PurchaseReturnItemRequest it : q.items()) {
                PurchaseReturnItem item = new PurchaseReturnItem();
                item.setPurchaseReturn(pr);
                item.setItemName(it.itemName());
                item.setUnit(it.unit() != null ? it.unit() : "PCS");
                item.setQuantity(it.quantity() != null ? it.quantity() : BigDecimal.ZERO);
                item.setUnitPrice(it.unitPrice() != null ? it.unitPrice() : BigDecimal.ZERO);
                item.setTotalPrice(it.totalPrice() != null ? it.totalPrice() : item.getQuantity().multiply(item.getUnitPrice()));
                item.setLegacyTotal(item.getTotalPrice());
                item.setReason(it.reason() != null ? it.reason() : q.reason());
                pr.getItems().add(item);
                totalAmt = totalAmt.add(item.getTotalPrice());
            }
        } else if (q.totalAmount() != null) {
            totalAmt = q.totalAmount();
        }
        pr.setTotalAmount(totalAmt);
        pr.setLegacyTotal(totalAmt);
        pr.setTaxAmount(q.taxAmount() != null ? q.taxAmount() : BigDecimal.ZERO);

        PurchaseReturn savedPr;
        try {
            savedPr = purchaseReturns.saveAndFlush(pr);
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            throw new ConflictException("Purchase return could not be saved. Check supplier, invoice, return number, and return items.");
        }

        // Deduct inventory stock for returned items
        for (PurchaseReturnItem item : savedPr.getItems()) {
            if (item.getQuantity() != null && item.getQuantity().compareTo(BigDecimal.ZERO) > 0) {
                try {
                    inventoryService.recordStockOutwardByName(
                        item.getItemName(),
                        item.getQuantity().intValue(),
                        savedPr.getReturnNumber(),
                        "Purchase Return " + savedPr.getReturnNumber() + " to " + s.getName() + " - Reason: " + (item.getReason() != null ? item.getReason() : q.reason())
                    );
                } catch (Exception e) {
                    // Log / keep return intact
                }
            }
        }

        return purchaseReturnMap(savedPr);
    }

    public List<Map<String,Object>> purchaseReturns() {
        return purchaseReturns.findAllByBusinessId(cu.businessId()).stream().map(this::purchaseReturnMap).toList();
    }

    private Map<String,Object> purchaseReturnMap(PurchaseReturn x) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", x.getId());
        m.put("supplierId", x.getSupplier() == null ? null : x.getSupplier().getId());
        m.put("supplierName", x.getSupplier() == null ? null : x.getSupplier().getName());
        m.put("purchaseInvoiceId", x.getPurchaseInvoice() == null ? null : x.getPurchaseInvoice().getId());
        m.put("invoiceNumber", x.getPurchaseInvoice() == null ? null : x.getPurchaseInvoice().getInvoiceNumber());
        m.put("purchaseOrderId", x.getPurchaseOrder() == null ? null : x.getPurchaseOrder().getId());
        m.put("poNumber", x.getPurchaseOrder() == null ? null : x.getPurchaseOrder().getPoNumber());
        m.put("returnNumber", x.getReturnNumber());
        m.put("returnDate", x.getReturnDate());
        m.put("status", x.getStatus());
        m.put("totalAmount", x.getTotalAmount());
        m.put("taxAmount", x.getTaxAmount());
        m.put("reason", x.getReason());
        m.put("items", x.getItems().stream().map(i -> {
            Map<String,Object> itm = new LinkedHashMap<>();
            itm.put("id", i.getId());
            itm.put("name", i.getItemName());
            itm.put("itemName", i.getItemName());
            itm.put("unit", i.getUnit());
            itm.put("qty", i.getQuantity());
            itm.put("quantity", i.getQuantity());
            itm.put("rate", i.getUnitPrice());
            itm.put("unitPrice", i.getUnitPrice());
            itm.put("total", i.getTotalPrice());
            itm.put("totalPrice", i.getTotalPrice());
            itm.put("reason", i.getReason());
            return itm;
        }).toList());
        return m;
    }
    @Transactional public Map<String,Object> supplierPayment(SupplierPaymentRequest q) {
        PurchaseInvoice i=purchaseInvoices.findByIdAndBusinessId(q.purchaseInvoiceId(),cu.businessId()).orElseThrow(()->new NotFoundException("Purchase invoice not found"));
        if(q.amount().compareTo(i.getDueAmount())>0)throw new ConflictException("Payment exceeds supplier invoice balance");
        Supplier s=suppliers.findByIdAndBusinessId(q.supplierId(),cu.businessId()).orElseThrow(()->new NotFoundException("Supplier not found"));
        SupplierPayment p=new SupplierPayment();
        p.setBusiness(cu.get().getBusiness());
        p.setSupplier(s);
        p.setPurchaseInvoice(i);
        p.setAmount(q.amount());
        String normalizedPaymentMethod = q.paymentMethod() == null ? "" :
                q.paymentMethod().trim().toUpperCase()
                        .replace("-", "_")
                        .replace(" ", "_");
        if ("BANK".equals(normalizedPaymentMethod) || "BANKTRANSFER".equals(normalizedPaymentMethod)) {
            normalizedPaymentMethod = "BANK_TRANSFER";
        }
        if ("CREDIT_CARD".equals(normalizedPaymentMethod) || "DEBIT_CARD".equals(normalizedPaymentMethod)) {
            normalizedPaymentMethod = "CARD";
        }
        if ("ONLINE".equals(normalizedPaymentMethod)) {
            normalizedPaymentMethod = "UPI";
        }
        if ("CHEQUE".equals(normalizedPaymentMethod) || "CHECK".equals(normalizedPaymentMethod)) {
            normalizedPaymentMethod = "BANK_TRANSFER";
        }
        try {
            p.setPaymentMethod(PaymentMethod.valueOf(normalizedPaymentMethod));
        }
        catch(Exception e) {
            throw new ConflictException("Invalid payment method. Allowed: CASH, UPI, CARD, BANK_TRANSFER");
        }
        p.setTransactionReference(q.transactionReference());
        p.setPaymentDate(q.paymentDate());
        supplierPayments.save(p);
        i.setPaidAmount(i.getPaidAmount().add(q.amount()));
        i.setDueAmount(i.getTotal().subtract(i.getPaidAmount()));
        i.setPaymentStatus(i.getDueAmount().signum()==0?"PAID":"PARTIAL");
        purchaseInvoices.save(i);
        return purchaseInvoiceMap(i);
    }
    @Transactional(readOnly = true) public List<Map<String,Object>> supplierPayments() {
        return supplierPayments.findAllByBusinessId(cu.businessId()).stream().map(p-> {
            Map<String,Object> m=new LinkedHashMap<>();m.put("id",p.getId());m.put("supplierId",p.getSupplier()==null?null:p.getSupplier().getId());m.put("purchaseInvoiceId",p.getPurchaseInvoice()==null?null:p.getPurchaseInvoice().getId());m.put("amount",p.getAmount());m.put("paymentMethod",p.getPaymentMethod());m.put("transactionReference",p.getTransactionReference());m.put("paymentDate",p.getPaymentDate());return m;
        }
        ).toList();
    }
}
