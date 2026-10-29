package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.service.ExpenseReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/hotel/reports/expenses")
@Tag(name="Expense Reports",description="Expense Reports APIs")

public class ExpenseReportController {
    private final ExpenseReportService service;

    public ExpenseReportController(ExpenseReportService service) {
        this.service=service;
    }
    @GetMapping
    @Operation(summary="Get Expense Reports")
    public ApiResponse<?> get(@RequestParam(value = "branchId", required = false) Long branchId) {
        return ApiResponse.ok("Expense Reports fetched",service.get(branchId));
    }
}
