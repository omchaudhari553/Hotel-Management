package com.hotelmanagement.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelmanagement.dto.HotelDtos.ProductRequest;
import com.hotelmanagement.dto.HotelDtos.StockAdjustmentRequest;
import com.hotelmanagement.entity.HotelSetting;
import com.hotelmanagement.exception.NotFoundException;
import com.hotelmanagement.repository.HotelSettingRepository;
import com.hotelmanagement.security.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class InventoryService {
    private static final String CAT_PRODUCT = "INVENTORY_PRODUCT";
    private static final String CAT_MOVEMENT = "INVENTORY_MOVEMENT";

    private final HotelSettingRepository settings;
    private final CurrentUser cu;
    private final ObjectMapper mapper;

    public InventoryService(HotelSettingRepository settings, CurrentUser cu, ObjectMapper mapper) {
        this.settings = settings;
        this.cu = cu;
        this.mapper = mapper;
    }

    public List<Map<String, Object>> getProducts(String category, Boolean lowStockOnly) {
        Long b = cu.businessId();
        List<HotelSetting> rows = settings.findAllByBusinessIdAndCategory(b, CAT_PRODUCT);

        if (rows.isEmpty()) {
            seedDefaultProducts();
            rows = settings.findAllByBusinessIdAndCategory(b, CAT_PRODUCT);
        }

        List<Map<String, Object>> list = new ArrayList<>();
        for (HotelSetting row : rows) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> map = mapper.readValue(row.getSettingValue(), Map.class);
                map.put("id", Long.valueOf(row.getSettingKey()));
                map.put("businessId", b);
                list.add(map);
            } catch (Exception ignored) {}
        }

        if (category != null && !category.isBlank() && !category.equalsIgnoreCase("ALL")) {
            list = list.stream()
                    .filter(p -> category.equalsIgnoreCase(String.valueOf(p.get("category"))))
                    .collect(Collectors.toList());
        }

        if (Boolean.TRUE.equals(lowStockOnly)) {
            list = list.stream()
                    .filter(p -> {
                        int qty = p.get("stockQuantity") instanceof Number n ? n.intValue() : 0;
                        int min = p.get("minStockAlert") instanceof Number n ? n.intValue() : 0;
                        return qty <= min;
                    })
                    .collect(Collectors.toList());
        }

        return list;
    }

    public Map<String, Object> createProduct(ProductRequest r) {
        Long b = cu.businessId();
        long newId = System.currentTimeMillis();

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", newId);
        map.put("businessId", b);
        map.put("category", r.category() == null ? "GENERAL" : r.category().toUpperCase());
        map.put("name", r.name());
        map.put("sku", r.sku());
        map.put("unit", r.unit() == null ? "PCS" : r.unit());
        map.put("purchasePrice", r.purchasePrice() == null ? BigDecimal.ZERO : r.purchasePrice());
        map.put("sellingPrice", r.sellingPrice() == null ? BigDecimal.ZERO : r.sellingPrice());
        map.put("stockQuantity", r.stockQuantity() == null ? 0 : r.stockQuantity());
        map.put("minStockAlert", r.minStockAlert() == null ? 10 : r.minStockAlert());
        map.put("active", r.active() == null || r.active());

        try {
            HotelSetting s = new HotelSetting();
            s.setBusiness(cu.get().getBusiness());
            s.setCategory(CAT_PRODUCT);
            s.setSettingKey(String.valueOf(newId));
            s.setSettingValue(mapper.writeValueAsString(map));
            settings.save(s);
        } catch (Exception e) {
            throw new RuntimeException("Failed to save product", e);
        }

        return map;
    }

    public Map<String, Object> adjustStock(StockAdjustmentRequest r) {
        Long b = cu.businessId();
        HotelSetting prodSetting = settings.findByBusinessIdAndCategoryAndSettingKey(b, CAT_PRODUCT, String.valueOf(r.productId()))
                .orElseThrow(() -> new NotFoundException("Product not found: " + r.productId()));

        Map<String, Object> prodMap;
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> p = mapper.readValue(prodSetting.getSettingValue(), Map.class);
            prodMap = new LinkedHashMap<>(p);
        } catch (Exception e) {
            throw new RuntimeException("Failed to read product data", e);
        }

        int currentQty = prodMap.get("stockQuantity") instanceof Number n ? n.intValue() : 0;
        int delta = r.quantity();
        int newQty = currentQty;

        if ("INWARD".equalsIgnoreCase(r.movementType())) {
            newQty = currentQty + delta;
        } else if ("OUTWARD".equalsIgnoreCase(r.movementType())) {
            newQty = Math.max(0, currentQty - delta);
        } else {
            // DIRECT ADJUSTMENT
            newQty = delta;
        }

        prodMap.put("stockQuantity", newQty);
        try {
            prodSetting.setSettingValue(mapper.writeValueAsString(prodMap));
            settings.save(prodSetting);
        } catch (Exception e) {
            throw new RuntimeException("Failed to update product stock", e);
        }

        // Record stock movement
        long movementId = System.currentTimeMillis();
        Map<String, Object> movement = new LinkedHashMap<>();
        movement.put("id", movementId);
        movement.put("businessId", b);
        movement.put("productId", r.productId());
        movement.put("productName", prodMap.get("name"));
        movement.put("movementType", r.movementType().toUpperCase());
        movement.put("quantity", r.quantity());
        movement.put("referenceId", r.referenceId() == null ? "ADJ-" + movementId : r.referenceId());
        movement.put("notes", r.notes() == null ? "" : r.notes());
        movement.put("createdAt", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));

        try {
            HotelSetting m = new HotelSetting();
            m.setBusiness(cu.get().getBusiness());
            m.setCategory(CAT_MOVEMENT);
            m.setSettingKey(String.valueOf(movementId));
            m.setSettingValue(mapper.writeValueAsString(movement));
            settings.save(m);
        } catch (Exception e) {
            throw new RuntimeException("Failed to record stock movement", e);
        }

        return movement;
    }

    public List<Map<String, Object>> getMovements() {
        Long b = cu.businessId();
        List<HotelSetting> rows = settings.findAllByBusinessIdAndCategory(b, CAT_MOVEMENT);
        List<Map<String, Object>> list = new ArrayList<>();
        for (HotelSetting row : rows) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> map = mapper.readValue(row.getSettingValue(), Map.class);
                map.put("id", Long.valueOf(row.getSettingKey()));
                map.put("businessId", b);
                list.add(map);
            } catch (Exception ignored) {}
        }
        list.sort((o1, o2) -> {
            String t1 = String.valueOf(o1.getOrDefault("createdAt", ""));
            String t2 = String.valueOf(o2.getOrDefault("createdAt", ""));
            return t2.compareTo(t1);
        });
        return list;
    }

    public void recordStockInwardByName(String itemName, String unit, int quantity, String referenceId, String notes) {
        if (quantity <= 0 || itemName == null || itemName.isBlank()) return;
        Long b = cu.businessId();
        List<HotelSetting> rows = settings.findAllByBusinessIdAndCategory(b, CAT_PRODUCT);
        HotelSetting targetSetting = null;
        for (HotelSetting row : rows) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> map = mapper.readValue(row.getSettingValue(), Map.class);
                if (itemName.trim().equalsIgnoreCase(String.valueOf(map.get("name")).trim())) {
                    targetSetting = row;
                    break;
                }
            } catch (Exception ignored) {}
        }
        Long prodId;
        if (targetSetting != null) {
            prodId = Long.valueOf(targetSetting.getSettingKey());
        } else {
            String sku = "PRD-" + Math.abs(itemName.trim().toUpperCase().replaceAll("[^A-Z0-9]", "").hashCode() % 10000);
            ProductRequest pr = new ProductRequest("GENERAL", itemName.trim(), sku, unit != null && !unit.isBlank() ? unit : "PCS", BigDecimal.ZERO, BigDecimal.ZERO, 0, 10, true);
            Map<String, Object> created = createProduct(pr);
            prodId = ((Number) created.get("id")).longValue();
        }
        adjustStock(new StockAdjustmentRequest(prodId, "INWARD", quantity, referenceId, notes));
    }

    public void recordStockOutwardByName(String itemName, int quantity, String referenceId, String notes) {
        if (quantity <= 0 || itemName == null || itemName.isBlank()) return;
        Long b = cu.businessId();
        List<HotelSetting> rows = settings.findAllByBusinessIdAndCategory(b, CAT_PRODUCT);
        HotelSetting targetSetting = null;
        for (HotelSetting row : rows) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> map = mapper.readValue(row.getSettingValue(), Map.class);
                if (itemName.trim().equalsIgnoreCase(String.valueOf(map.get("name")).trim())) {
                    targetSetting = row;
                    break;
                }
            } catch (Exception ignored) {}
        }
        if (targetSetting != null) {
            Long prodId = Long.valueOf(targetSetting.getSettingKey());
            adjustStock(new StockAdjustmentRequest(prodId, "OUTWARD", quantity, referenceId, notes));
        }
    }

    private void seedDefaultProducts() {
        ProductRequest[] defaults = new ProductRequest[] {
            new ProductRequest("BEVERAGES", "Arabica Coffee Beans", "BEV-001", "KG", new BigDecimal("450"), new BigDecimal("650"), 25, 5, true),
            new ProductRequest("DAIRY", "Fresh Milk", "DRY-001", "LTR", new BigDecimal("55"), new BigDecimal("65"), 40, 10, true),
            new ProductRequest("GROCERY", "Basmati Rice 25kg", "GRO-001", "BAG", new BigDecimal("1800"), new BigDecimal("2200"), 8, 3, true),
            new ProductRequest("LINEN", "Bath Towels White", "LIN-001", "PCS", new BigDecimal("280"), new BigDecimal("350"), 50, 15, true)
        };
        for (ProductRequest pr : defaults) {
            createProduct(pr);
        }
    }
}
