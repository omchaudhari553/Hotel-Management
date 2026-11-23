package com.hotelmanagement.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotelmanagement.dto.ApiResponse;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/v1/industries")
public class IndustryController {

    public record IndustryDto(Long id, String code, String name, String description, String icon, boolean active) {}

    public record ModuleDto(Long id, Long productId, String productCode, String code, String name, String description, boolean isCore, boolean active) {}

    private static final List<IndustryDto> INDUSTRIES = List.of(
            new IndustryDto(1L, "HOTEL", "Hotel & Restaurant", "Hotel and restaurant dining management", "hotel", true),
            new IndustryDto(2L, "MESS", "Mess", "Mess and meal management", "utensils", true),
            new IndustryDto(3L, "CAFE", "Cafe", "Cafe and table-order management", "coffee", true)
    );

    private static final File STATUS_FILE = new File("platform_modules_status.json");
    private static final Map<String, Boolean> MODULE_STATUS_MAP = new ConcurrentHashMap<>();
    private static final ObjectMapper MAPPER = new ObjectMapper();

    static {
        // Initialize defaults: all modules active
        initDefaultStatuses();
        loadStatusFromFile();
    }

    private static void initDefaultStatuses() {
        MODULE_STATUS_MAP.put("HOTEL_OVERVIEW", true);
        MODULE_STATUS_MAP.put("HOTEL_DASHBOARD", true);
        MODULE_STATUS_MAP.put("HOTEL_KOT", true);
        MODULE_STATUS_MAP.put("KOT", true);
        MODULE_STATUS_MAP.put("HOTEL_BILLING", true);
        MODULE_STATUS_MAP.put("POS_BILLING", true);
        MODULE_STATUS_MAP.put("HOTEL_TABLES", true);
        MODULE_STATUS_MAP.put("TABLE_MGMT", true);
        MODULE_STATUS_MAP.put("HOTEL_PAYMENTS", true);
        MODULE_STATUS_MAP.put("HOTEL_PURCHASE", true);
        MODULE_STATUS_MAP.put("PURCHASE", true);
        MODULE_STATUS_MAP.put("INVENTORY", true);
        MODULE_STATUS_MAP.put("HOTEL_STAFF", true);
        MODULE_STATUS_MAP.put("STAFF_PAYROLL", true);
        MODULE_STATUS_MAP.put("HOTEL_SETTINGS", true);
        MODULE_STATUS_MAP.put("HOTEL_REPORTS", true);
        MODULE_STATUS_MAP.put("REPORTS", true);
    }

    private static synchronized void loadStatusFromFile() {
        if (STATUS_FILE.exists()) {
            try {
                Map<String, Boolean> loaded = MAPPER.readValue(STATUS_FILE, new TypeReference<Map<String, Boolean>>() {});
                if (loaded != null) {
                    MODULE_STATUS_MAP.putAll(loaded);
                }
            } catch (Exception e) {
                System.err.println("Failed to read platform_modules_status.json: " + e.getMessage());
            }
        }
    }

    private static synchronized void saveStatusToFile() {
        try {
            MAPPER.writerWithDefaultPrettyPrinter().writeValue(STATUS_FILE, MODULE_STATUS_MAP);
        } catch (IOException e) {
            System.err.println("Failed to write platform_modules_status.json: " + e.getMessage());
        }
    }

    @GetMapping
    public ApiResponse<List<IndustryDto>> getIndustries() {
        return ApiResponse.ok("Industries fetched successfully", INDUSTRIES);
    }

    @GetMapping("/{code}")
    public ApiResponse<IndustryDto> getIndustryByCode(@PathVariable String code) {
        return INDUSTRIES.stream()
                .filter(i -> i.code().equalsIgnoreCase(code))
                .findFirst()
                .map(i -> ApiResponse.ok("Industry fetched", i))
                .orElseGet(() -> ApiResponse.ok("Industry fetched", INDUSTRIES.get(0)));
    }

    @PostMapping("/select")
    public ApiResponse<Map<String, Object>> selectIndustry(@RequestBody(required = false) Map<String, Object> body) {
        String code = (body != null && body.get("industry") != null) ? body.get("industry").toString().toUpperCase() : "HOTEL";
        IndustryDto selected = INDUSTRIES.stream()
                .filter(i -> i.code().equalsIgnoreCase(code))
                .findFirst()
                .orElse(INDUSTRIES.get(0));

        Map<String, Object> res = new HashMap<>();
        res.put("selectedIndustry", selected);
        res.put("dashboardRoute", "/" + selected.code().toLowerCase() + "/dashboard");
        res.put("message", "Switched to " + selected.name());
        return ApiResponse.ok("Industry selected", res);
    }

    @GetMapping("/modules/status")
    public ApiResponse<Map<String, Boolean>> getModulesStatus() {
        return ApiResponse.ok("Module statuses fetched", new HashMap<>(MODULE_STATUS_MAP));
    }

    @PostMapping("/modules/status")
    public ApiResponse<Map<String, Boolean>> updateModuleStatus(@RequestBody Map<String, Object> body) {
        if (body != null) {
            if (body.containsKey("moduleCode") && body.containsKey("active")) {
                String code = String.valueOf(body.get("moduleCode")).toUpperCase();
                boolean active = Boolean.parseBoolean(String.valueOf(body.get("active")));
                applyStatusUpdate(code, active);
            } else if (body.containsKey("modules") && body.get("modules") instanceof Map<?, ?> m) {
                m.forEach((k, v) -> {
                    String code = String.valueOf(k).toUpperCase();
                    boolean active = Boolean.parseBoolean(String.valueOf(v));
                    applyStatusUpdate(code, active);
                });
            } else {
                body.forEach((k, v) -> {
                    String code = String.valueOf(k).toUpperCase();
                    if (!"MODULECODE".equals(code) && !"ACTIVE".equals(code)) {
                        boolean active = Boolean.parseBoolean(String.valueOf(v));
                        applyStatusUpdate(code, active);
                    }
                });
            }
            saveStatusToFile();
        }
        return ApiResponse.ok("Module statuses updated", new HashMap<>(MODULE_STATUS_MAP));
    }

    private void applyStatusUpdate(String code, boolean active) {
        MODULE_STATUS_MAP.put(code, active);
        if (code.equals("HOTEL_OVERVIEW") || code.equals("HOTEL_DASHBOARD")) {
            MODULE_STATUS_MAP.put("HOTEL_OVERVIEW", active);
            MODULE_STATUS_MAP.put("HOTEL_DASHBOARD", active);
        } else if (code.equals("HOTEL_KOT") || code.equals("KOT")) {
            MODULE_STATUS_MAP.put("HOTEL_KOT", active);
            MODULE_STATUS_MAP.put("KOT", active);
        } else if (code.equals("HOTEL_BILLING") || code.equals("POS_BILLING")) {
            MODULE_STATUS_MAP.put("HOTEL_BILLING", active);
            MODULE_STATUS_MAP.put("POS_BILLING", active);
        } else if (code.equals("HOTEL_TABLES") || code.equals("TABLE_MGMT")) {
            MODULE_STATUS_MAP.put("HOTEL_TABLES", active);
            MODULE_STATUS_MAP.put("TABLE_MGMT", active);
        } else if (code.equals("HOTEL_PAYMENTS")) {
            MODULE_STATUS_MAP.put("HOTEL_PAYMENTS", active);
        } else if (code.equals("HOTEL_PURCHASE") || code.equals("PURCHASE") || code.equals("INVENTORY")) {
            MODULE_STATUS_MAP.put("HOTEL_PURCHASE", active);
            MODULE_STATUS_MAP.put("PURCHASE", active);
            MODULE_STATUS_MAP.put("INVENTORY", active);
        } else if (code.equals("HOTEL_STAFF") || code.equals("STAFF_PAYROLL")) {
            MODULE_STATUS_MAP.put("HOTEL_STAFF", active);
            MODULE_STATUS_MAP.put("STAFF_PAYROLL", active);
        } else if (code.equals("HOTEL_SETTINGS") || code.equals("HOTEL_REPORTS") || code.equals("REPORTS")) {
            MODULE_STATUS_MAP.put("HOTEL_SETTINGS", active);
            MODULE_STATUS_MAP.put("HOTEL_REPORTS", active);
            MODULE_STATUS_MAP.put("REPORTS", active);
        }
    }

    @GetMapping("/modules")
    public ApiResponse<List<ModuleDto>> getProductModules(@RequestParam(required = false, defaultValue = "1") Long productId) {
        List<ModuleDto> list = new ArrayList<>();
        list.add(new ModuleDto(100L, 1L, "HOTEL", "HOTEL_OVERVIEW", "Hotel Overview", "Real-time sales, order velocity, table status & daily analytics", true, MODULE_STATUS_MAP.getOrDefault("HOTEL_OVERVIEW", true)));
        list.add(new ModuleDto(101L, 1L, "HOTEL", "HOTEL_KOT", "KOT", "Kitchen Order Tickets live firing, routing and chef dispatch", true, MODULE_STATUS_MAP.getOrDefault("HOTEL_KOT", true)));
        list.add(new ModuleDto(102L, 1L, "HOTEL", "HOTEL_BILLING", "Billing / Invoices", "Thermal bill generation, table settlement, split bills & discount management", true, MODULE_STATUS_MAP.getOrDefault("HOTEL_BILLING", true)));
        list.add(new ModuleDto(103L, 1L, "HOTEL", "HOTEL_TABLES", "Tables", "Floor sections, visual table layout, dine-in status & occupancy tracker", true, MODULE_STATUS_MAP.getOrDefault("HOTEL_TABLES", true)));
        list.add(new ModuleDto(104L, 1L, "HOTEL", "HOTEL_PAYMENTS", "Payments", "Cash, UPI, Card and multi-tender daily payment reconciliation", true, MODULE_STATUS_MAP.getOrDefault("HOTEL_PAYMENTS", true)));
        list.add(new ModuleDto(105L, 1L, "HOTEL", "HOTEL_PURCHASE", "Purchase", "Supplier purchase orders, inventory stocking & vendor expense tracking", true, MODULE_STATUS_MAP.getOrDefault("HOTEL_PURCHASE", true)));
        list.add(new ModuleDto(106L, 1L, "HOTEL", "HOTEL_STAFF", "Staff", "Staff directory, role permissions, waiter commissions & shifts", false, MODULE_STATUS_MAP.getOrDefault("HOTEL_STAFF", true)));
        list.add(new ModuleDto(107L, 1L, "HOTEL", "HOTEL_SETTINGS", "Settings", "System configuration, tax/GST settings, print setup & audit reports", false, MODULE_STATUS_MAP.getOrDefault("HOTEL_SETTINGS", true)));
        return ApiResponse.ok("Modules fetched", list);
    }
}
