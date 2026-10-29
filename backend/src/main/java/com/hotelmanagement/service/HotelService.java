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
import java.util.stream.*;
import java.util.Arrays;

@Service@Transactional(readOnly = true)
public class HotelService {
    private final CurrentUser cu;
    private final BranchRepository branches;
    private final HotelTableRepository tables;
    private final MenuItemRepository menu;
    private final HotelOrderRepository orders;
    private final KotRepository kots;
    private final StaffRepository staff;
    private final OutletRepository outlets;
    private final StaffAttendanceRepository attendance;
    private final SupplierRepository suppliers;
    private final ExpenseRepository expenses;
    private final InvoiceRepository invoices;
    public HotelService(CurrentUser c,BranchRepository br,HotelTableRepository t,MenuItemRepository m,HotelOrderRepository o,KotRepository k,StaffRepository st,OutletRepository out,StaffAttendanceRepository a,SupplierRepository sp,ExpenseRepository ex,InvoiceRepository inv) {
        cu=c;
        branches=br;
        tables=t;
        menu=m;
        orders=o;
        kots=k;
        staff=st;
        outlets=out;
        attendance=a;
        suppliers=sp;
        expenses=ex;
        invoices=inv;
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
    public Set<Long> resolveBranchIds(Long branchId) {
        if (branchId == null) {
            return Collections.emptySet();
        }
        return Set.of(branchId);
    }
    public List<Map<String,Object>> branches() {
        return branches.findAllByBusinessId(cu.businessId()).stream().map(this::branchMap).toList();
    }
    public Map<String,Object> branchMap(Branch b) {
        Map<String,Object> m=new LinkedHashMap<>();
        m.put("id",b.getId());
        m.put("name",b.getName());
        m.put("code",b.getCode());
        m.put("managerName",b.getManagerName());
        m.put("contactPhone",b.getContactPhone());
        m.put("email",b.getEmail());
        m.put("operatingHours",b.getOperatingHours());
        m.put("address",b.getAddress());
        m.put("establishedOn",b.getEstablishedOn());
        m.put("status",b.getStatus());
        m.put("parentBranchId", b.getParentBranch() != null ? b.getParentBranch().getId() : null);
        m.put("parentBranchName", b.getParentBranch() != null ? b.getParentBranch().getName() : null);
        long members = staff.countByBusinessIdAndBranchId(cu.businessId(), b.getId());
        m.put("members", members);
        m.put("memberCount", members);
        return m;
    }
    @Transactional public Map<String,Object> createBranch(Map<String,Object> m) {
        Branch b=new Branch();
        b.setBusiness(cu.get().getBusiness());
        b.setName((String)m.get("name"));
        b.setCode((String)m.get("code"));
        b.setManagerName((String)m.getOrDefault("managerName",""));
        String phone = String.valueOf(m.getOrDefault("contactPhone","")).replaceAll("\\D", "");
        if (!phone.isBlank()) {
            if (!phone.matches("^[6-9][0-9]{9}$")) {
                throw new ConflictException("Contact phone must be exactly 10 digits and start with 6, 7, 8, or 9");
            }
            b.setContactPhone(phone);
        } else {
            b.setContactPhone("");
        }
        b.setEmail((String)m.getOrDefault("email",""));
        b.setOperatingHours((String)m.getOrDefault("operatingHours",""));
        b.setAddress((String)m.getOrDefault("address",""));
        Object parentIdObj = m.get("parentBranchId");
        if (parentIdObj != null && !String.valueOf(parentIdObj).isBlank()) {
            try {
                Long parentId = Long.valueOf(String.valueOf(parentIdObj));
                branches.findByIdAndBusinessId(parentId, cu.businessId()).ifPresent(b::setParentBranch);
            } catch (Exception ignored) {}
        }
        Object established = m.get("establishedOn");
        if (established != null && !String.valueOf(established).isBlank()) {
            try { b.setEstablishedOn(java.time.LocalDate.parse(String.valueOf(established))); } catch (Exception ignored) {}
        } else {
            b.setEstablishedOn(java.time.LocalDate.now());
        }
        b.setStatus(String.valueOf(m.getOrDefault("status","ACTIVE")).toUpperCase());
        try {
            return branchMap(branches.save(b));
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            throw new ConflictException("Branch code already exists for this business");
        }
    }
    private String validatePhone(String phone, boolean required) {
        if (phone == null || phone.trim().isEmpty()) {
            if (required) {
                throw new ConflictException("Phone number is required");
            }
            return "";
        }
        String clean = phone.replaceAll("\\D", "");
        if (!clean.matches("^[6-9][0-9]{9}$")) {
            throw new ConflictException("Phone number must be exactly 10 digits and start with 6, 7, 8, or 9");
        }
        return clean;
    }
    @Transactional public Map<String,Object> createTable(TableRequest q) {
        Branch b = branch(q.branchId());
        String requestedName = q.name() == null ? "" : q.name().trim();
        if (requestedName.isBlank()) {
            throw new ConflictException("Table name is required");
        }

        // The existing Tables UI generates names such as "Table 01".
        // When the database already contains that name, choose the next
        // available table number instead of allowing SQL Server's unique
        // (branch_id, name) constraint to surface as a 500 error.
        String finalName = requestedName;
        if (tables.existsByBranchIdAndName(b.getId(), finalName)) {
            java.util.regex.Matcher matcher = java.util.regex.Pattern
                    .compile("(?i)^Table\\s+(\\d+)$")
                    .matcher(requestedName);
            if (matcher.matches()) {
                int number = Integer.parseInt(matcher.group(1));
                do {
                    number++;
                    finalName = "Table " + String.format("%02d", number);
                } while (tables.existsByBranchIdAndName(b.getId(), finalName));
            } else {
                throw new ConflictException("Table name already exists in this branch");
            }
        }

        HotelTable t=new HotelTable();
        t.setBusiness(cu.get().getBusiness());
        t.setBranch(b);
        t.setName(finalName);
        t.setCapacity(q.capacity());
        t.setArea(q.area());
        t.setNote(q.note());
        try {
            return tableMap(tables.saveAndFlush(t));
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            throw new ConflictException("Table could not be saved because the table name or branch data conflicts with an existing database record");
        }
    }
    public List<Map<String,Object>> tables() {
        return tables(null);
    }
    public List<Map<String,Object>> tables(Long branchId) {
        Set<Long> allowed = resolveBranchIds(branchId);
        List<HotelTable> all = tables.findAllByBusinessId(cu.businessId());
        java.time.LocalDateTime fiveMinsAgo = java.time.LocalDateTime.now().minusMinutes(5);
        for (HotelTable t : all) {
            if (t.getStatus() == TableStatus.CLEANING) {
                if (t.getUpdatedAt() != null && t.getUpdatedAt().isBefore(fiveMinsAgo)) {
                    t.setStatus(TableStatus.AVAILABLE);
                    t.setGuest(null);
                    t.setGuestCount(null);
                    t.setNote(null);
                    tables.save(t);
                }
            } else if (t.getStatus() == TableStatus.OCCUPIED || t.getStatus() == TableStatus.BILLING) {
                List<HotelOrder> activeOrds = orders.findByTableIdAndStatusIn(t.getId(), Arrays.asList(OrderStatus.OPEN, OrderStatus.BILL_REQUESTED));
                boolean reallyHasActive = false;
                for (HotelOrder ord : activeOrds) {
                    Optional<Invoice> inv = invoices.findFirstByOrderIdAndBusinessId(ord.getId(), cu.businessId());
                    if (inv.isPresent() && inv.get().getStatus() == InvoiceStatus.PAID) {
                        ord.setStatus(OrderStatus.COMPLETED);
                        orders.save(ord);
                        List<Kot> associatedKots = kots.findAllByOrderId(ord.getId());
                        for (Kot kItem : associatedKots) {
                            kItem.setStatus(KotStatus.COMPLETED);
                            kots.save(kItem);
                        }
                    } else {
                        reallyHasActive = true;
                    }
                }
                if (!reallyHasActive) {
                    if (t.getUpdatedAt() != null && t.getUpdatedAt().isBefore(fiveMinsAgo)) {
                        t.setStatus(TableStatus.AVAILABLE);
                    } else {
                        t.setStatus(TableStatus.CLEANING);
                        if (t.getUpdatedAt() == null) {
                            t.setUpdatedAt(java.time.LocalDateTime.now());
                        }
                    }
                    t.setGuest(null);
                    t.setGuestCount(null);
                    t.setNote(null);
                    tables.save(t);
                }
            }
        }
        return all.stream()
                .filter(t -> allowed.isEmpty() || t.getBranch() == null || allowed.contains(t.getBranch().getId()))
                .map(this::tableMap)
                .toList();
    }
    private Map<String,Object> tableMap(HotelTable t) {
        Map<String,Object> m=new LinkedHashMap<>();
        m.put("id",t.getId());
        m.put("name",t.getName());
        m.put("capacity",t.getCapacity());
        m.put("area",t.getArea());
        m.put("status",t.getStatus());
        m.put("updatedAt", t.getUpdatedAt());
        m.put("branchId", t.getBranch() == null ? null : t.getBranch().getId());
        m.put("branchName", t.getBranch() == null ? "" : t.getBranch().getName());
        m.put("guest",t.getGuest()==null?"":String.valueOf(t.getGuest()));
        m.put("guestCount",t.getGuestCount()==null?0:t.getGuestCount());
        m.put("note",t.getNote()==null?"":t.getNote());
        orders.findFirstByTableIdAndStatusInOrderByIdDesc(t.getId(), Arrays.asList(OrderStatus.OPEN, OrderStatus.BILL_REQUESTED))
            .ifPresentOrElse(actOrd -> {
                m.put("orderId", actOrd.getId());
                m.put("orderNumber", actOrd.getOrderNumber());
                m.put("bill", actOrd.getTotalAmount());
                if (t.getGuest() == null || t.getGuest().isBlank()) {
                    m.put("guest", actOrd.getGuestName());
                    m.put("guestCount", actOrd.getGuestCount() == null ? 0 : actOrd.getGuestCount());
                }
                if (t.getStatus() == TableStatus.AVAILABLE) {
                    t.setStatus(TableStatus.OCCUPIED);
                    tables.save(t);
                    m.put("status", TableStatus.OCCUPIED);
                }
            }, () -> {
                if (t.getStatus() == TableStatus.OCCUPIED) {
                    t.setStatus(TableStatus.AVAILABLE);
                    t.setGuest(null);
                    t.setGuestCount(null);
                    t.setNote(null);
                    tables.save(t);
                    m.put("status", TableStatus.AVAILABLE);
                    m.put("guest", "");
                    m.put("guestCount", 0);
                    m.put("bill", 0);
                    m.put("orderId", null);
                }
            });
        return m;
    }
    @Transactional public Map<String,Object> tableStatus(Long id,String status) {
        HotelTable t=tables.findByIdAndBusinessId(id,cu.businessId()).orElseThrow(()->new NotFoundException("Table not found"));
        try {
            TableStatus newStatus = TableStatus.valueOf(status);
            if (newStatus == TableStatus.AVAILABLE || newStatus == TableStatus.CLEANING) {
                t.setGuest(null);
                t.setGuestCount(null);
                t.setNote(null);
            }
            t.setStatus(newStatus);
            t.setUpdatedAt(java.time.LocalDateTime.now());
        }
        catch(Exception e) {
            throw new ConflictException("Invalid table status");
        }
        return tableMap(tables.save(t));
    }
    public Map<String,Object> getTableById(Long id) {
        HotelTable t = tables.findByIdAndBusinessId(id,cu.businessId()).orElseThrow(()->new NotFoundException("Table not found"));
        if (t.getStatus() == TableStatus.CLEANING && t.getUpdatedAt() != null && t.getUpdatedAt().isBefore(java.time.LocalDateTime.now().minusMinutes(5))) {
            t.setStatus(TableStatus.AVAILABLE);
            t.setGuest(null);
            t.setGuestCount(null);
            t.setNote(null);
            tables.save(t);
        }
        return tableMap(t);
    }
    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 15000)
    @Transactional
    public void autoReleaseCleaningTables() {
        try {
            releaseCleaningTablesForCurrentDatabase();
        } catch (Exception ignored) {}
    }

    @Transactional
    public void releaseCleaningTablesForCurrentDatabase() {
        java.time.LocalDateTime fiveMinsAgo = java.time.LocalDateTime.now().minusMinutes(5);
        List<HotelTable> allCleaning = tables.findAll().stream()
            .filter(t -> t.getStatus() == TableStatus.CLEANING && t.getUpdatedAt() != null && t.getUpdatedAt().isBefore(fiveMinsAgo))
            .toList();
        for (HotelTable t : allCleaning) {
            t.setStatus(TableStatus.AVAILABLE);
            t.setGuest(null);
            t.setGuestCount(null);
            t.setNote(null);
            tables.save(t);
        }
    }
    @Transactional public Map<String,Object> updateTable(Long id,TableRequest r) {
        HotelTable t=tables.findByIdAndBusinessId(id,cu.businessId()).orElseThrow(()->new NotFoundException("Table not found"));
        Branch b=branch(r.branchId());
        if(!t.getBranch().getId().equals(b.getId()))throw new ConflictException("Cannot change table branch");
        if(!t.getName().equals(r.name()) && tables.existsByBranchIdAndName(b.getId(),r.name()))throw new ConflictException("Table name already exists in this branch");
        t.setName(r.name());
        t.setCapacity(r.capacity());
        t.setArea(r.area());
        t.setNote(r.note());
        return tableMap(tables.save(t));
    }
    @Transactional public Map<String,Object> deleteTable(Long id) {
        HotelTable t=tables.findByIdAndBusinessId(id,cu.businessId()).orElseThrow(()->new NotFoundException("Table not found"));
        if(orders.existsByTableIdAndStatusIn(t.getId(), Arrays.asList(OrderStatus.OPEN,OrderStatus.BILL_REQUESTED)))throw new ConflictException("Cannot delete table with active orders");
        tables.delete(t);
        return Map.of("id",id,"deleted",true);
    }
    @Transactional public Map<String,Object> createOrder(OrderRequest q) {
        HotelOrder o=new HotelOrder();
        o.setBusiness(cu.get().getBusiness());
        o.setBranch(branch(q.branchId()));
        if(q.tableId()!=null) {
            HotelTable tbl = tables.findByIdAndBusinessId(q.tableId(),cu.businessId()).orElseThrow(()->new NotFoundException("Table not found"));
            o.setTable(tbl);
            tbl.setStatus(TableStatus.OCCUPIED);
            String gName = (q.guestName() != null && !q.guestName().isBlank()) ? q.guestName().trim() : "Guest";
            tbl.setGuest(gName);
            tbl.setGuestCount(q.guestCount());
            tables.save(tbl);
        }
        if(q.bookingId()!=null) o.setBookingId(q.bookingId());
        o.setOrderNumber("ORD-"+System.currentTimeMillis());
        o.setGuestName((q.guestName() != null && !q.guestName().isBlank()) ? q.guestName().trim() : "Guest");
        o.setGuestCount(q.guestCount());
        o.setDiscount(q.discount()==null?BigDecimal.ZERO:q.discount());
        o.setTaxRate(q.taxRate()==null?BigDecimal.ZERO:q.taxRate());
        BigDecimal subtotal=BigDecimal.ZERO;
        if(q.items()!=null)for(OrderItemRequest i:q.items()) {
            HotelOrderItem x=new HotelOrderItem();
            x.setOrder(o);
            x.setMenuItemId(i.menuItemId());
            x.setName(i.name());
            x.setQuantity(i.quantity());
            x.setUnitPrice(i.unitPrice());
            x.setTotalPrice(i.unitPrice().multiply(BigDecimal.valueOf(i.quantity())));
            x.setCustomization(i.customization());
            o.getItems().add(x);
            subtotal=subtotal.add(x.getTotalPrice());
        }
        o.setTotalAmount(subtotal.subtract(o.getDiscount()).max(BigDecimal.ZERO).multiply(BigDecimal.ONE.add(o.getTaxRate().divide(BigDecimal.valueOf(100),4,RoundingMode.HALF_UP))).setScale(2,RoundingMode.HALF_UP));
        o.setSentToKitchen(true);
        HotelOrder savedOrder = orders.save(o);

        Kot k = new Kot();
        k.setBusiness(cu.get().getBusiness());
        k.setBranch(savedOrder.getBranch());
        k.setOrder(savedOrder);
        k.setKotNumber("KOT-" + System.currentTimeMillis());
        k.setInstructions("Order " + savedOrder.getOrderNumber() + " for " + savedOrder.getGuestName());
        kots.save(k);

        return orderMap(savedOrder);
    }
    public List<Map<String,Object>> orders() {
        return orders(null);
    }
    public List<Map<String,Object>> orders(Long branchId) {
        Set<Long> allowed = resolveBranchIds(branchId);
        return orders.findAllByBusinessId(cu.businessId()).stream()
                .filter(o -> allowed.isEmpty() || o.getBranch() == null || allowed.contains(o.getBranch().getId()))
                .peek(o -> {
                    if (o.getStatus() == OrderStatus.OPEN || o.getStatus() == OrderStatus.BILL_REQUESTED) {
                        invoices.findFirstByOrderIdAndBusinessId(o.getId(), cu.businessId()).ifPresent(inv -> {
                            if (inv.getStatus() == InvoiceStatus.PAID) {
                                o.setStatus(OrderStatus.COMPLETED);
                                orders.save(o);
                            }
                        });
                    }
                })
                .map(this::orderMap)
                .toList();
    }
    private Map<String,Object> orderMap(HotelOrder o) {
        Map<String,Object> m=new LinkedHashMap<>();
        m.put("id",o.getId());
        m.put("orderNumber",o.getOrderNumber());
        m.put("branchId",o.getBranch()==null?null:o.getBranch().getId());
        m.put("branchCode",o.getBranch()==null?"":o.getBranch().getCode());
        m.put("branchName",o.getBranch()==null?"":o.getBranch().getName());
        m.put("orderSource",o.getOrderSource()==null?"INTERNAL":o.getOrderSource());
        m.put("externalPlatform",o.getExternalPlatform());
        m.put("externalOrderId",o.getExternalOrderId());
        m.put("externalOrderNumber",o.getExternalOrderNumber());
        m.put("externalOutletId",o.getExternalOutletId());
        m.put("externalPaymentStatus",o.getExternalPaymentStatus());
        m.put("externalStatus",o.getExternalStatus());
        m.put("tableId",o.getTable()==null?null:o.getTable().getId());
        m.put("tableName",o.getTable()==null?"":o.getTable().getName());
        m.put("tableNumber",o.getTable()==null?"":o.getTable().getName());
        m.put("guestName",o.getGuestName());
        m.put("guestCount",o.getGuestCount());
        m.put("status",o.getStatus());
        m.put("discount",o.getDiscount());
        m.put("taxRate",o.getTaxRate());
        m.put("totalAmount",o.getTotalAmount());
        m.put("sentToKitchen",o.isSentToKitchen());
        m.put("items",o.getItems().stream().map(i-> {
            Map<String,Object> itemMap = new LinkedHashMap<>();
            itemMap.put("id",i.getId());
            itemMap.put("name",i.getName());
            itemMap.put("itemName",i.getName());
            itemMap.put("qty",i.getQuantity());
            itemMap.put("quantity",i.getQuantity());
            itemMap.put("price",i.getUnitPrice());
            itemMap.put("unitPrice",i.getUnitPrice());
            itemMap.put("totalPrice",i.getTotalPrice());
            itemMap.put("customization",i.getCustomization()==null?"":i.getCustomization());
            return itemMap;
        }).toList());
        m.put("createdAt",o.getCreatedAt());
        return m;
    }
    @Transactional public Map<String,Object> orderStatus(Long id,String status) {
        HotelOrder o=orders.findByIdAndBusinessId(id,cu.businessId()).orElseThrow(()->new NotFoundException("Order not found"));
        try {
            OrderStatus newStatus = OrderStatus.valueOf(status.trim().toUpperCase());
            o.setStatus(newStatus);
            if(newStatus == OrderStatus.CANCELLED || newStatus == OrderStatus.PAID || newStatus == OrderStatus.COMPLETED) {
                if(o.getTable() != null) {
                    HotelTable tbl = o.getTable();
                    tbl.setStatus(TableStatus.AVAILABLE);
                    tbl.setGuest(null);
                    tbl.setGuestCount(null);
                    tbl.setNote(null);
                    tables.save(tbl);
                }
                if (newStatus == OrderStatus.COMPLETED || newStatus == OrderStatus.PAID) {
                    kots.findAllByOrderId(o.getId()).forEach(k -> {
                        k.setStatus(KotStatus.COMPLETED);
                        kots.save(k);
                    });
                } else if (newStatus == OrderStatus.CANCELLED) {
                    kots.findAllByOrderId(o.getId()).forEach(k -> {
                        k.setStatus(KotStatus.CANCELLED);
                        kots.save(k);
                    });
                }
            } else if (newStatus == OrderStatus.BILL_REQUESTED) {
                if(o.getTable() != null) {
                    HotelTable tbl = o.getTable();
                    tbl.setStatus(TableStatus.OCCUPIED);
                    tables.save(tbl);
                }
                kots.findAllByOrderId(o.getId()).forEach(k -> {
                    if (k.getStatus() != KotStatus.COMPLETED && k.getStatus() != KotStatus.CANCELLED) {
                        k.setStatus(KotStatus.BILL_REQUESTED);
                        kots.save(k);
                    }
                });
            }
        }
        catch(Exception e) {
            throw new ConflictException("Invalid order status: " + status);
        }
        return orderMap(orders.save(o));
    }
    public Map<String,Object> getOrderById(Long id) {
        return orderMap(orders.findByIdAndBusinessId(id,cu.businessId()).orElseThrow(()->new NotFoundException("Order not found")));
    }
    @Transactional public Map<String,Object> updateOrder(Long id,OrderRequest q) {
        HotelOrder o=orders.findByIdAndBusinessId(id,cu.businessId()).orElseThrow(()->new NotFoundException("Order not found"));
        if(o.getStatus() == OrderStatus.COMPLETED || o.getStatus() == OrderStatus.CANCELLED) {
            throw new ConflictException("Cannot modify completed or cancelled orders");
        }
        if(q.tableId()!=null && (o.getTable()==null || !o.getTable().getId().equals(q.tableId()))){
            HotelTable newTbl = tables.findByIdAndBusinessId(q.tableId(),cu.businessId()).orElseThrow(()->new NotFoundException("Table not found"));
            o.setTable(newTbl);
            newTbl.setStatus(TableStatus.OCCUPIED);
            newTbl.setGuest(o.getGuestName());
            newTbl.setGuestCount(o.getGuestCount());
            tables.save(newTbl);
        } else if (o.getTable() != null) {
            o.getTable().setStatus(TableStatus.OCCUPIED);
            if (q.guestName() != null) o.getTable().setGuest(q.guestName());
            if (q.guestCount() != null) o.getTable().setGuestCount(q.guestCount());
            tables.save(o.getTable());
        }
        if(q.guestName()!=null)o.setGuestName(q.guestName());
        if(q.guestCount()!=null)o.setGuestCount(q.guestCount());
        if(q.discount()!=null)o.setDiscount(q.discount());
        if(q.taxRate()!=null)o.setTaxRate(q.taxRate());
        if(q.items()!=null && !q.items().isEmpty()){
            o.getItems().clear();
            BigDecimal subtotal=BigDecimal.ZERO;
            for(OrderItemRequest i:q.items()){
                HotelOrderItem x=new HotelOrderItem();
                x.setOrder(o);
                x.setMenuItemId(i.menuItemId());
                x.setName(i.name());
                x.setQuantity(i.quantity());
                x.setUnitPrice(i.unitPrice());
                x.setTotalPrice(i.unitPrice().multiply(BigDecimal.valueOf(i.quantity())));
                x.setCustomization(i.customization());
                o.getItems().add(x);
                subtotal=subtotal.add(x.getTotalPrice());
            }
            o.setTotalAmount(subtotal.subtract(o.getDiscount()).max(BigDecimal.ZERO).multiply(BigDecimal.ONE.add(o.getTaxRate().divide(BigDecimal.valueOf(100),4,RoundingMode.HALF_UP))).setScale(2,RoundingMode.HALF_UP));
        }
        o.setSentToKitchen(true);
        HotelOrder savedOrder = orders.save(o);
        List<Kot> existingKots = kots.findAllByOrderId(savedOrder.getId());
        if (existingKots.isEmpty()) {
            Kot k = new Kot();
            k.setBusiness(cu.get().getBusiness());
            k.setBranch(savedOrder.getBranch());
            k.setOrder(savedOrder);
            k.setKotNumber("KOT-" + System.currentTimeMillis());
            k.setStatus(KotStatus.SENT_TO_KITCHEN);
            k.setInstructions("Order " + savedOrder.getOrderNumber() + " for " + savedOrder.getGuestName());
            kots.save(k);
        } else {
            existingKots.forEach(k -> {
                if (k.getStatus() == KotStatus.COMPLETED) {
                    k.setStatus(KotStatus.SENT_TO_KITCHEN);
                    kots.save(k);
                }
            });
        }

        invoices.findFirstByOrderIdAndBusinessId(savedOrder.getId(), cu.businessId()).ifPresent(inv -> {
            inv.getItems().clear();
            BigDecimal invSubtotal = BigDecimal.ZERO;
            for (HotelOrderItem oi : savedOrder.getItems()) {
                InvoiceItem ii = new InvoiceItem();
                ii.setInvoice(inv);
                ii.setProductId(oi.getMenuItemId());
                ii.setDescription(oi.getName());
                ii.setQuantity(BigDecimal.valueOf(oi.getQuantity()));
                ii.setUnitPrice(oi.getUnitPrice());
                ii.setTaxRate(savedOrder.getTaxRate() == null ? BigDecimal.ZERO : savedOrder.getTaxRate());
                ii.setTotalPrice(oi.getTotalPrice());
                inv.getItems().add(ii);
                invSubtotal = invSubtotal.add(ii.getTotalPrice());
            }
            inv.setSubtotal(invSubtotal);
            inv.setDiscountAmount(savedOrder.getDiscount() == null ? BigDecimal.ZERO : savedOrder.getDiscount());
            inv.setTaxableAmount(invSubtotal.subtract(inv.getDiscountAmount()).max(BigDecimal.ZERO));
            BigDecimal taxRate = savedOrder.getTaxRate() == null ? BigDecimal.ZERO : savedOrder.getTaxRate();
            BigDecimal halfTax = taxRate.divide(BigDecimal.valueOf(2), 4, RoundingMode.HALF_UP);
            BigDecimal cgst = inv.getTaxableAmount().multiply(halfTax.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP)).setScale(2, RoundingMode.HALF_UP);
            BigDecimal sgst = cgst;
            inv.setCgst(cgst);
            inv.setSgst(sgst);
            inv.setIgst(BigDecimal.ZERO);
            inv.setGrandTotal(inv.getTaxableAmount().add(cgst).add(sgst));
            if (inv.getPaidAmount() == null) inv.setPaidAmount(BigDecimal.ZERO);
            inv.setDueAmount(inv.getGrandTotal().subtract(inv.getPaidAmount()));
            invoices.save(inv);
        });

        return orderMap(savedOrder);
    }
    @Transactional public Map<String,Object> createKot(KotRequest q) {
        if(q.orderId()!=null) {
            HotelOrder ord = orders.findByIdAndBusinessId(q.orderId(),cu.businessId()).orElseThrow(()->new NotFoundException("Order not found"));
            List<Kot> existing = kots.findAllByOrderId(ord.getId());
            Optional<Kot> active = existing.stream().filter(k -> k.getStatus() != KotStatus.CANCELLED && k.getStatus() != KotStatus.COMPLETED).findFirst();
            if (active.isPresent()) {
                Kot k = active.get();
                if (q.instructions() != null && !q.instructions().isBlank()) {
                    k.setInstructions(q.instructions());
                    kots.save(k);
                }
                return kotMap(k);
            }
            Kot k = new Kot();
            k.setBusiness(cu.get().getBusiness());
            k.setBranch(ord.getBranch() != null ? ord.getBranch() : branch(q.branchId()));
            k.setOrder(ord);
            ord.setSentToKitchen(true);
            orders.save(ord);
            if(ord.getTable() != null) {
                ord.getTable().setStatus(TableStatus.OCCUPIED);
                tables.save(ord.getTable());
            }
            k.setKotNumber("KOT-" + System.currentTimeMillis());
            k.setStatus(KotStatus.SENT_TO_KITCHEN);
            k.setInstructions(q.instructions() != null ? q.instructions() : ("Order " + ord.getOrderNumber() + " for " + ord.getGuestName()));
            return kotMap(kots.save(k));
        }
        Kot k=new Kot();
        k.setBusiness(cu.get().getBusiness());
        k.setBranch(branch(q.branchId()));
        k.setKotNumber("KOT-"+System.currentTimeMillis());
        k.setStatus(KotStatus.SENT_TO_KITCHEN);
        k.setInstructions(q.instructions());
        return kotMap(kots.save(k));
    }
    public List<Map<String,Object>> kots() {
        return kots(null);
    }
    public List<Map<String,Object>> kots(Long branchId) {
        return kots(branchId, null, null);
    }
    public List<Map<String,Object>> kots(Long branchId, LocalDate startDate, LocalDate endDate) {
        Set<Long> allowed = resolveBranchIds(branchId);
        return kots.findAllByBusinessIdOrderByCreatedAtDesc(cu.businessId()).stream()
                .filter(k -> allowed.isEmpty() || k.getBranch() == null || allowed.contains(k.getBranch().getId()))
                .filter(k -> {
                    if (k.getCreatedAt() == null) return true;
                    LocalDate dt = k.getCreatedAt().toLocalDate();
                    if (startDate != null && dt.isBefore(startDate)) return false;
                    if (endDate != null && dt.isAfter(endDate)) return false;
                    return true;
                })
                .map(this::kotMap)
                .toList();
    }
    private Map<String,Object> kotMap(Kot k) {
        Map<String,Object> m=new LinkedHashMap<>();
        m.put("id",k.getId());
        m.put("kotNumber",k.getKotNumber());
        m.put("status",k.getStatus());
        m.put("instructions",k.getInstructions()==null?"":k.getInstructions());
        m.put("createdAt",k.getCreatedAt());
        m.put("updatedAt",k.getUpdatedAt());
        m.put("businessId",cu.businessId());
        m.put("branchId",k.getBranch()==null?null:k.getBranch().getId());
        m.put("branchCode",k.getBranch()==null?"":k.getBranch().getCode());
        m.put("branchName",k.getBranch()==null?"":k.getBranch().getName());

        HotelOrder o = k.getOrder();
        if(o != null) {
            m.put("orderId", o.getId());
            m.put("orderNumber", o.getOrderNumber());
            m.put("orderStatus", o.getStatus());
            m.put("guestName", o.getGuestName() == null ? "Guest" : o.getGuestName());
            m.put("customerName", o.getGuestName() == null ? "Guest" : o.getGuestName());
            m.put("guestCount", o.getGuestCount() == null ? 1 : o.getGuestCount());
            m.put("tableId", o.getTable() == null ? null : o.getTable().getId());
            m.put("tableName", o.getTable() == null ? "" : o.getTable().getName());
            m.put("tableNumber", o.getTable() == null ? "" : o.getTable().getName());
            m.put("totalAmount", o.getTotalAmount() == null ? BigDecimal.ZERO : o.getTotalAmount());
            m.put("discount", o.getDiscount() == null ? BigDecimal.ZERO : o.getDiscount());
            m.put("taxRate", o.getTaxRate() == null ? BigDecimal.ZERO : o.getTaxRate());
            m.put("items", o.getItems() == null ? List.of() : o.getItems().stream().map(i -> {
                Map<String,Object> itemMap = new LinkedHashMap<>();
                itemMap.put("id", i.getId());
                itemMap.put("name", i.getName());
                itemMap.put("itemName", i.getName());
                itemMap.put("quantity", i.getQuantity());
                itemMap.put("qty", i.getQuantity());
                itemMap.put("unitPrice", i.getUnitPrice());
                itemMap.put("price", i.getUnitPrice());
                itemMap.put("totalPrice", i.getTotalPrice());
                itemMap.put("customization", i.getCustomization() == null ? "" : i.getCustomization());
                return itemMap;
            }).toList());
        } else {
            m.put("orderId", null);
            m.put("orderNumber", null);
            m.put("orderStatus", null);
            m.put("guestName", "Guest");
            m.put("customerName", "Guest");
            m.put("guestCount", 1);
            m.put("tableId", null);
            m.put("tableName", "");
            m.put("tableNumber", "");
            m.put("totalAmount", BigDecimal.ZERO);
            m.put("discount", BigDecimal.ZERO);
            m.put("taxRate", BigDecimal.ZERO);
            m.put("items", List.of());
        }
        return m;
    }
    public Map<String,Object> getKotById(Long id) {
        return kotMap(kots.findByIdAndBusinessId(id,cu.businessId()).orElseThrow(()->new NotFoundException("KOT not found")));
    }
    @Transactional public Map<String,Object> kotStatus(Long id,String status) {
        Kot k=kots.findByIdAndBusinessId(id,cu.businessId()).orElseThrow(()->new NotFoundException("KOT not found"));
        try {
            KotStatus newStatus = KotStatus.valueOf(status.trim().toUpperCase());
            k.setStatus(newStatus);
            HotelOrder order = k.getOrder();
            if (order != null) {
                if (newStatus == KotStatus.PREPARING || newStatus == KotStatus.READY || newStatus == KotStatus.SERVED || newStatus == KotStatus.ACCEPTED || newStatus == KotStatus.SENT_TO_KITCHEN || newStatus == KotStatus.PENDING) {
                    if (order.getTable() != null) {
                        order.getTable().setStatus(TableStatus.OCCUPIED);
                        tables.save(order.getTable());
                    }
                } else if (newStatus == KotStatus.BILL_REQUESTED) {
                    order.setStatus(OrderStatus.BILL_REQUESTED);
                    orders.save(order);
                    if (order.getTable() != null) {
                        order.getTable().setStatus(TableStatus.OCCUPIED);
                        tables.save(order.getTable());
                    }
                } else if (newStatus == KotStatus.BILLED) {
                    if (order.getStatus() == OrderStatus.OPEN) {
                        order.setStatus(OrderStatus.BILL_REQUESTED);
                        orders.save(order);
                    }
                    if (order.getTable() != null) {
                        order.getTable().setStatus(TableStatus.OCCUPIED);
                        tables.save(order.getTable());
                    }
                } else if (newStatus == KotStatus.COMPLETED) {
                    if (order.getStatus() == OrderStatus.PAID || order.getStatus() == OrderStatus.COMPLETED) {
                        if (order.getTable() != null) {
                            order.getTable().setStatus(TableStatus.AVAILABLE);
                            order.getTable().setGuest(null);
                            order.getTable().setGuestCount(null);
                            order.getTable().setNote(null);
                            tables.save(order.getTable());
                        }
                    }
                } else if (newStatus == KotStatus.CANCELLED) {
                    List<Kot> otherActive = kots.findAllByOrderId(order.getId()).stream()
                            .filter(other -> !other.getId().equals(k.getId()) && other.getStatus() != KotStatus.CANCELLED && other.getStatus() != KotStatus.COMPLETED)
                            .toList();
                    if (otherActive.isEmpty()) {
                        order.setStatus(OrderStatus.CANCELLED);
                        orders.save(order);
                        if (order.getTable() != null) {
                            order.getTable().setStatus(TableStatus.AVAILABLE);
                            order.getTable().setGuest(null);
                            order.getTable().setGuestCount(null);
                            order.getTable().setNote(null);
                            tables.save(order.getTable());
                        }
                    }
                }
            }
        }
        catch(Exception e) {
            throw new ConflictException("Invalid KOT status: " + status);
        }
        return kotMap(kots.save(k));
    }
    @Transactional public Map<String,Object> createStaff(StaffRequest q) {
        Staff s=new Staff();
        s.setBusiness(cu.get().getBusiness());
        Branch selectedBranch = q.branchId()==null ? null : branch(q.branchId());
        s.setBranch(selectedBranch);
        if (q.outletId()!=null) {
            Outlet selectedOutlet = outlets.findByIdAndBranchBusinessId(q.outletId(), cu.businessId())
                    .orElseThrow(() -> new NotFoundException("Outlet not found"));
            if (selectedBranch != null && selectedOutlet.getBranch() != null && !selectedBranch.getId().equals(selectedOutlet.getBranch().getId())) {
                throw new ConflictException("Selected outlet does not belong to the selected branch");
            }
            s.setOutlet(selectedOutlet);
        }
        s.setName(q.name());
        s.setStaffCode("ST-"+System.currentTimeMillis());
        s.setPhone(q.phone());
        s.setAddress(q.address());
        s.setDesignation(q.designation());
        s.setJoiningDate(q.joiningDate());
        s.setIdProofType(q.idProofType());
        s.setIdProofNumber(q.idProofNumber());
        s.setBasicSalary(q.basicSalary());
        s.setSalaryFrequency(q.salaryFrequency());
        s.setAllowance(q.allowance()==null?BigDecimal.ZERO:q.allowance());
        s.setDeduction(q.deduction()==null?BigDecimal.ZERO:q.deduction());
        if (q.active()!=null) s.setActive(q.active());
        return staffMap(staff.save(s));
    }
    public List<Map<String,Object>> staff() {
        return staff(null);
    }
    public List<Map<String,Object>> staff(Long branchId) {
        Set<Long> allowed = resolveBranchIds(branchId);
        return staff.findAllByBusinessId(cu.businessId()).stream()
                .filter(s -> allowed.isEmpty() || (s.getBranch() != null && allowed.contains(s.getBranch().getId())))
                .map(this::staffMap)
                .toList();
    }
    private Map<String,Object> staffMap(Staff s) {
        Map<String,Object> m=new LinkedHashMap<>();
        m.put("id",s.getId());
        m.put("name",s.getName());
        m.put("staffCode",s.getStaffCode());
        m.put("phone",s.getPhone());
        m.put("address",s.getAddress());
        m.put("designation",s.getDesignation());
        m.put("role",s.getDesignation());
        m.put("branchId",s.getBranch()==null?null:s.getBranch().getId());
        m.put("branch",s.getBranch()==null?"":s.getBranch().getName());
        m.put("outletId",s.getOutlet()==null?null:s.getOutlet().getId());
        m.put("outlet",s.getOutlet()==null?"":s.getOutlet().getName());
        m.put("outletCode",s.getOutlet()==null?"":s.getOutlet().getCode());
        m.put("joiningDate",s.getJoiningDate());
        m.put("idProofType",s.getIdProofType());
        m.put("idProofNumber",s.getIdProofNumber());
        m.put("basicSalary",s.getBasicSalary());
        m.put("salaryFrequency",s.getSalaryFrequency());
        m.put("allowance",s.getAllowance());
        m.put("deduction",s.getDeduction());
        m.put("active",s.isActive());
        return m;
    }
    public Map<String,Object> getStaffById(Long id) {
        return staffMap(staff.findByIdAndBusinessId(id,cu.businessId()).orElseThrow(()->new NotFoundException("Staff not found")));
    }
    @Transactional public Map<String,Object> updateStaff(Long id,StaffRequest q) {
        Staff s=staff.findByIdAndBusinessId(id,cu.businessId()).orElseThrow(()->new NotFoundException("Staff not found"));
        if(q.branchId()!=null)s.setBranch(branch(q.branchId()));
        if(q.outletId()!=null) {
            Outlet selectedOutlet = outlets.findByIdAndBranchBusinessId(q.outletId(), cu.businessId())
                    .orElseThrow(() -> new NotFoundException("Outlet not found"));
            if (s.getBranch()!=null && selectedOutlet.getBranch()!=null && !s.getBranch().getId().equals(selectedOutlet.getBranch().getId())) {
                throw new ConflictException("Selected outlet does not belong to the selected branch");
            }
            s.setOutlet(selectedOutlet);
        } else {
            s.setOutlet(null);
        }
        s.setName(q.name());
        s.setPhone(q.phone());
        s.setAddress(q.address());
        s.setDesignation(q.designation());
        s.setJoiningDate(q.joiningDate());
        s.setIdProofType(q.idProofType());
        s.setIdProofNumber(q.idProofNumber());
        s.setBasicSalary(q.basicSalary());
        s.setSalaryFrequency(q.salaryFrequency());
        s.setAllowance(q.allowance());
        s.setDeduction(q.deduction());
        if (q.active()!=null) s.setActive(q.active());
        return staffMap(staff.save(s));
    }
    @Transactional public Map<String,Object> deleteStaff(Long id) {
        Staff s=staff.findByIdAndBusinessId(id,cu.businessId()).orElseThrow(()->new NotFoundException("Staff not found"));
        s.setActive(false);
        return staffMap(staff.save(s));
    }
    @Transactional public Map<String,Object> attendance(AttendanceRequest q) {
        Staff s=staff.findByIdAndBusinessId(q.staffId(),cu.businessId()).orElseThrow(()->new NotFoundException("Staff not found"));
        StaffAttendance a=attendance.findByStaffIdAndAttendanceDate(s.getId(),q.date()).orElseGet(StaffAttendance::new);
        a.setStaff(s);
        a.setAttendanceDate(q.date());
        try {
            a.setStatus(AttendanceStatus.valueOf(q.status().replace(' ','_').toUpperCase()));
        }
        catch(Exception e) {
            throw new ConflictException("Invalid attendance status");
        }
        if (q.checkInTime() != null) a.setCheckInTime(q.checkInTime());
        if (q.checkOutTime() != null) a.setCheckOutTime(q.checkOutTime());
        if (q.workingHours() != null) {
            a.setWorkingHours(q.workingHours());
        } else if (a.getCheckInTime() != null && a.getCheckOutTime() != null && !a.getCheckInTime().isBlank() && !a.getCheckOutTime().isBlank()) {
            try {
                java.time.LocalTime cin = java.time.LocalTime.parse(a.getCheckInTime());
                java.time.LocalTime cout = java.time.LocalTime.parse(a.getCheckOutTime());
                long minutes = java.time.Duration.between(cin, cout).toMinutes();
                if (minutes > 0) {
                    a.setWorkingHours(BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP));
                }
            } catch (Exception ignored) {}
        }
        if (q.remarks() != null) a.setRemarks(q.remarks());
        return attendanceMap(attendance.save(a));
    }

    public List<Map<String,Object>> attendance() {
        return attendance(null, null, null);
    }

    public List<Map<String,Object>> attendance(LocalDate date, Long staffId, String status) {
        return attendance.findAllByStaffBusinessId(cu.businessId()).stream()
                .filter(a -> date == null || date.equals(a.getAttendanceDate()))
                .filter(a -> staffId == null || (a.getStaff() != null && staffId.equals(a.getStaff().getId())))
                .filter(a -> status == null || status.isBlank() || (a.getStatus() != null && a.getStatus().name().equalsIgnoreCase(status.trim())))
                .sorted(Comparator.comparing(StaffAttendance::getAttendanceDate, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::attendanceMap)
                .toList();
    }

    public Map<String, Object> attendanceSummary(LocalDate date) {
        LocalDate targetDate = date != null ? date : LocalDate.now();
        List<Staff> allStaff = staff.findAllByBusinessId(cu.businessId()).stream().filter(Staff::isActive).toList();
        List<StaffAttendance> dayAttendance = attendance.findAllByStaffBusinessId(cu.businessId()).stream()
                .filter(a -> targetDate.equals(a.getAttendanceDate()))
                .toList();
        long present = dayAttendance.stream().filter(a -> a.getStatus() == AttendanceStatus.PRESENT).count();
        long halfDay = dayAttendance.stream().filter(a -> a.getStatus() == AttendanceStatus.HALF_DAY).count();
        long absent = dayAttendance.stream().filter(a -> a.getStatus() == AttendanceStatus.ABSENT).count();
        long onLeave = dayAttendance.stream().filter(a -> a.getStatus() == AttendanceStatus.LEAVE).count();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("date", targetDate);
        m.put("totalStaff", allStaff.size());
        m.put("present", present);
        m.put("halfDay", halfDay);
        m.put("absent", absent);
        m.put("onLeave", onLeave);
        m.put("unmarked", Math.max(0, allStaff.size() - dayAttendance.size()));
        return m;
    }

    private Map<String, Object> attendanceMap(StaffAttendance a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.getId());
        m.put("staffId", a.getStaff() != null ? a.getStaff().getId() : null);
        m.put("staffName", a.getStaff() != null ? a.getStaff().getName() : "");
        m.put("staffCode", a.getStaff() != null ? a.getStaff().getStaffCode() : "");
        m.put("designation", a.getStaff() != null ? a.getStaff().getDesignation() : "");
        m.put("date", a.getAttendanceDate());
        m.put("status", a.getStatus() != null ? a.getStatus().name() : "PRESENT");
        m.put("checkInTime", a.getCheckInTime() != null ? a.getCheckInTime() : "");
        m.put("checkOutTime", a.getCheckOutTime() != null ? a.getCheckOutTime() : "");
        m.put("workingHours", a.getWorkingHours());
        m.put("remarks", a.getRemarks() != null ? a.getRemarks() : "");
        return m;
    }
    @Transactional public Map<String,Object> createSupplier(SupplierRequest q) {
        Supplier s=new Supplier();
        s.setBusiness(cu.get().getBusiness());
        s.setBranch(q.branchId()==null?null:branch(q.branchId()));
        s.setName(q.name());
        s.setCompany(q.company());
        s.setPhone(validatePhone(q.phone(), false));
        s.setEmail(q.email());
        s.setAddress(q.address());
        s.setGstNumber(q.gstNumber());
        s.setStatus(q.status()==null?"Active":q.status());
        return supplierMap(suppliers.save(s));
    }
    public List<Map<String,Object>> suppliers() {
        return suppliers.findAllByBusinessId(cu.businessId()).stream().map(this::supplierMap).toList();
    }
    private Map<String,Object> supplierMap(Supplier s) {
        return Map.of("id",s.getId(),"name",s.getName(),"company",s.getCompany(),"phone",s.getPhone(),"email",s.getEmail()==null?"":s.getEmail(),"address",s.getAddress()==null?"":s.getAddress(),"gstNumber",s.getGstNumber()==null?"":s.getGstNumber(),"status",s.getStatus());
    }
    public Map<String,Object> getSupplierById(Long id) {
        return supplierMap(suppliers.findByIdAndBusinessId(id,cu.businessId()).orElseThrow(()->new NotFoundException("Supplier not found")));
    }
    @Transactional public Map<String,Object> updateSupplier(Long id,SupplierRequest q) {
        Supplier s=suppliers.findByIdAndBusinessId(id,cu.businessId()).orElseThrow(()->new NotFoundException("Supplier not found"));
        if(q.branchId()!=null)s.setBranch(branch(q.branchId()));
        s.setName(q.name());
        s.setCompany(q.company());
        s.setPhone(validatePhone(q.phone(), false));
        s.setEmail(q.email());
        s.setAddress(q.address());
        s.setGstNumber(q.gstNumber());
        s.setStatus(q.status());
        return supplierMap(suppliers.save(s));
    }
    @Transactional public Map<String,Object> deleteSupplier(Long id) {
        Supplier s=suppliers.findByIdAndBusinessId(id,cu.businessId()).orElseThrow(()->new NotFoundException("Supplier not found"));
        suppliers.delete(s);
        return Map.of("id",id,"deleted",true);
    }
    @Transactional public Map<String,Object> createExpense(ExpenseRequest q) {
        Expense e=new Expense();
        e.setBusiness(cu.get().getBusiness());
        Branch br = null;
        if (q.branchId() != null) {
            br = branch(q.branchId());
        } else if (q.branchCode() != null && !q.branchCode().isBlank()) {
            br = branches.findAllByBusinessId(cu.businessId()).stream()
                    .filter(b -> q.branchCode().equalsIgnoreCase(b.getCode()))
                    .findFirst().orElse(null);
        }
        if (br == null) {
            br = branch(null);
        }
        e.setBranch(br);
        e.setName(q.name());
        e.setCategory(q.category());
        e.setAmount(q.amount());
        e.setExpenseDate(q.date());
        e.setPaymentDate(q.date());
        e.setPaymentMode(q.paymentMode());
        e.setDescription(q.description());
        e.setBranchCode((q.branchCode() != null && !q.branchCode().isBlank()) ? q.branchCode() : (br != null ? br.getCode() : "MB-1"));
        Expense x=expenses.save(e);
        return expenseMap(x);
    }
    private Map<String,Object> expenseMap(Expense x) {
        Map<String,Object> m=new LinkedHashMap<>();
        m.put("id",x.getId());
        m.put("branchId",x.getBranch()!=null?x.getBranch().getId():null);
        m.put("branchName",x.getBranch()!=null?x.getBranch().getName():"");
        m.put("branchCode",x.getBranchCode()!=null?x.getBranchCode():(x.getBranch()!=null?x.getBranch().getCode():""));
        m.put("name",x.getName());
        m.put("category",x.getCategory());
        m.put("amount",x.getAmount());
        m.put("date",x.getExpenseDate());
        m.put("paymentMode",x.getPaymentMode());
        m.put("description",x.getDescription());
        return m;
    }
    public List<Map<String,Object>> expenses() {
        return expenses(null);
    }
    public List<Map<String,Object>> expenses(Long branchId) {
        Set<Long> allowed = resolveBranchIds(branchId);
        return expenses.findAllByBusinessId(cu.businessId()).stream()
                .filter(x -> allowed.isEmpty() || (x.getBranch() != null && allowed.contains(x.getBranch().getId())))
                .map(this::expenseMap).toList();
    }
    public Map<String,Object> getExpenseById(Long id) {
        Expense e=expenses.findByIdAndBusinessId(id,cu.businessId()).orElseThrow(()->new NotFoundException("Expense not found"));
        return expenseMap(e);
    }
    @Transactional public Map<String,Object> updateExpense(Long id,ExpenseRequest q) {
        Expense e=expenses.findByIdAndBusinessId(id,cu.businessId()).orElseThrow(()->new NotFoundException("Expense not found"));
        Branch br = null;
        if(q.branchId()!=null) {
            br = branch(q.branchId());
            e.setBranch(br);
        } else if (q.branchCode() != null && !q.branchCode().isBlank()) {
            br = branches.findAllByBusinessId(cu.businessId()).stream()
                    .filter(b -> q.branchCode().equalsIgnoreCase(b.getCode()))
                    .findFirst().orElse(null);
            if (br != null) e.setBranch(br);
        }
        e.setName(q.name());
        e.setCategory(q.category());
        e.setAmount(q.amount());
        e.setExpenseDate(q.date());
        e.setPaymentDate(q.date());
        e.setPaymentMode(q.paymentMode());
        e.setDescription(q.description());
        if (q.branchCode() != null && !q.branchCode().isBlank()) {
            e.setBranchCode(q.branchCode());
        } else if (e.getBranch() != null) {
            e.setBranchCode(e.getBranch().getCode());
        }
        Expense x=expenses.save(e);
        return expenseMap(x);
    }
    @Transactional public Map<String,Object> deleteExpense(Long id) {
        Expense e=expenses.findByIdAndBusinessId(id,cu.businessId()).orElseThrow(()->new NotFoundException("Expense not found"));
        expenses.delete(e);
        return Map.of("id",id,"deleted",true);
    }
    public List<Map<String,Object>> menuItems(String category) {
        Long b = cu.businessId();
        List<MenuItem> list = menu.findAllByBusinessId(b);
        if (category != null && !category.isBlank() && !category.equalsIgnoreCase("ALL")) {
            list = list.stream().filter(x -> category.equalsIgnoreCase(x.getCategory())).collect(Collectors.toList());
        }
        return list.stream().map(this::menuItemView).collect(Collectors.toList());
    }
    public Map<String,Object> getMenuItemById(Long id) {
        MenuItem m = menu.findByIdAndBusinessId(id, cu.businessId())
            .orElseThrow(() -> new NotFoundException("Menu item not found: " + id));
        return menuItemView(m);
    }
    @Transactional public Map<String,Object> createMenuItem(MenuItemRequest r) {
        MenuItem m = new MenuItem();
        m.setBusiness(cu.get().getBusiness());
        m.setName(r.name());
        m.setCategory(r.category() == null || r.category().isBlank() ? "GENERAL" : r.category().toUpperCase());
        m.setPrice(r.price());
        m.setDescription(r.description());
        m.setActive(r.active() == null || r.active());
        m = menu.save(m);
        return menuItemView(m);
    }
    @Transactional public Map<String,Object> updateMenuItem(Long id, MenuItemRequest r) {
        MenuItem m = menu.findByIdAndBusinessId(id, cu.businessId())
            .orElseThrow(() -> new NotFoundException("Menu item not found: " + id));
        m.setName(r.name());
        if (r.category() != null) m.setCategory(r.category().toUpperCase());
        if (r.price() != null) m.setPrice(r.price());
        m.setDescription(r.description());
        if (r.active() != null) m.setActive(r.active());
        m = menu.save(m);
        return menuItemView(m);
    }
    @Transactional public Map<String,Object> updateMenuItemAvailability(Long id, boolean available) {
        MenuItem m = menu.findByIdAndBusinessId(id, cu.businessId())
            .orElseThrow(() -> new NotFoundException("Menu item not found: " + id));
        m.setActive(available);
        m = menu.save(m);
        return menuItemView(m);
    }
    @Transactional public Map<String,Object> deleteMenuItem(Long id) {
        MenuItem m = menu.findByIdAndBusinessId(id, cu.businessId())
            .orElseThrow(() -> new NotFoundException("Menu item not found: " + id));
        menu.delete(m);
        return Map.of("id", id, "deleted", true);
    }
    private Map<String,Object> menuItemView(MenuItem m) {
        Map<String,Object> map = new LinkedHashMap<>();
        map.put("id", m.getId());
        map.put("businessId", m.getBusiness() != null ? m.getBusiness().getId() : null);
        map.put("name", m.getName());
        map.put("category", m.getCategory());
        map.put("price", m.getPrice());
        map.put("description", m.getDescription());
        map.put("active", m.isActive());
        map.put("available", m.isActive());
        return map;
    }
}
