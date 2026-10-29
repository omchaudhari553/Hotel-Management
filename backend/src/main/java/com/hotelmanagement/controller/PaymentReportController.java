package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.service.PaymentReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/hotel/reports/payments")
@Tag(name="Payment Reports",description="Payment Reports APIs")

public class PaymentReportController {
    private final PaymentReportService service;

    public PaymentReportController(PaymentReportService service) {
        this.service=service;
    }
    @GetMapping
    @Operation(summary="Get Payment Reports")
    public ApiResponse<?> get() {
        return ApiResponse.ok("Payment Reports fetched",service.get());
    }
}
