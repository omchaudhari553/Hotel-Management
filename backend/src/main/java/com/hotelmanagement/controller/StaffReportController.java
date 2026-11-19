package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.service.StaffReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/hotel/reports/staff")
@Tag(name="Staff Reports",description="Staff Reports APIs")

public class StaffReportController {
    private final StaffReportService service;

    public StaffReportController(StaffReportService service) {
        this.service=service;
    }
    @GetMapping
    @Operation(summary="Get Staff Reports")
    public ApiResponse<?> get() {
        return ApiResponse.ok("Staff Reports fetched",service.get());
    }
}
