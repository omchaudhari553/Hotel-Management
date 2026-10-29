package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/hotel/dashboard")
@Tag(name="Dashboard",description="Dashboard APIs")

public class DashboardController {
    private final DashboardService service;

    public DashboardController(DashboardService s) {
        service=s;
    }
    @GetMapping
    @Operation(summary="Get dashboard")
    public ApiResponse<?> dashboard(
            @RequestParam(value = "branchId", required = false) Long branchId,
            @RequestParam(value = "startDate", required = false) String startDate,
            @RequestParam(value = "endDate", required = false) String endDate) {
        return ApiResponse.ok("Dashboard fetched", service.kpis(branchId, startDate, endDate));
    }
    @GetMapping("/kpis")
    @Operation(summary="Get dashboard KPIs")
    public ApiResponse<?> kpis(
            @RequestParam(value = "branchId", required = false) Long branchId,
            @RequestParam(value = "startDate", required = false) String startDate,
            @RequestParam(value = "endDate", required = false) String endDate) {
        return ApiResponse.ok("Dashboard KPIs fetched", service.kpis(branchId, startDate, endDate));
    }
}
