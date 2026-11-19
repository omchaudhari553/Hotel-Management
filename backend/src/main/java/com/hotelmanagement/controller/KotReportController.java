package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.service.KotReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/hotel/reports/kot")
@Tag(name="KOT Reports",description="KOT Reports APIs")

public class KotReportController {
    private final KotReportService service;

    public KotReportController(KotReportService service) {
        this.service=service;
    }
    @GetMapping
    @Operation(summary="Get KOT Reports")
    public ApiResponse<?> get() {
        return ApiResponse.ok("KOT Reports fetched",service.get());
    }
}
