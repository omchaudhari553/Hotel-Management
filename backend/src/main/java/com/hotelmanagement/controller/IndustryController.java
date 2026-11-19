package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/industries")
public class IndustryController {

    public record IndustryDto(Long id, String code, String name, String description, String icon, boolean active) {}

    private static final List<IndustryDto> INDUSTRIES = List.of(
            new IndustryDto(1L, "HOTEL", "Hotel & Restaurant", "Hotel and restaurant dining management", "hotel", true),
            new IndustryDto(2L, "MESS", "Mess", "Mess and meal management", "utensils", true),
            new IndustryDto(3L, "CAFE", "Cafe", "Cafe and table-order management", "coffee", true)
    );

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
}
