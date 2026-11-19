package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.service.RevenueReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/hotel/reports/revenue")
@Tag(name="Revenue Reports",description="Revenue Reports APIs")

public class RevenueReportController {
    private final RevenueReportService service;

    public RevenueReportController(RevenueReportService service) {
        this.service=service;
    }
    @GetMapping
    @Operation(summary="Get Revenue Reports")
    public ApiResponse<?> get() {
        return ApiResponse.ok("Revenue Reports fetched",service.get());
    }
}
