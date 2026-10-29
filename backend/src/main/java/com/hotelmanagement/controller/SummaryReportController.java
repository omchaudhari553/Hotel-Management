package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.service.SummaryReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/hotel/reports/summary")
@Tag(name = "Report Summary", description = "Report Summary APIs")
public class SummaryReportController {
    private final SummaryReportService service;

    public SummaryReportController(SummaryReportService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Get Report Summary")
    public ApiResponse<?> get(
            @RequestParam(value = "startDate", required = false) String startDate,
            @RequestParam(value = "endDate", required = false) String endDate,
            @RequestParam(value = "period", required = false) String period,
            @RequestParam(value = "branchId", required = false) Long branchId) {
        return ApiResponse.ok("Report Summary fetched", service.get(startDate, endDate, period, branchId));
    }
}
