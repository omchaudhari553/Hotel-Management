package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.dto.HotelDtos.PaymentRequest;
import com.hotelmanagement.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/hotel")
@Tag(name="Payments",description="Payment APIs")

public class PaymentController {
    private final PaymentService service;

    public PaymentController(PaymentService service) {
        this.service=service;
    }
    @GetMapping("/payments")
    @Operation(summary="List payments")
    public ApiResponse<?> list(@RequestParam(value = "branchId", required = false) Long branchId) {
        return ApiResponse.ok("Payments fetched",service.list(branchId));
    }
    @PostMapping("/payments")
    @Operation(summary="Record payment")
    public ApiResponse<?> create(@Valid @RequestBody PaymentRequest r) {
        return ApiResponse.ok("Payment recorded",service.create(r));
    }
    @PostMapping("/invoices/{id}/payments")
    @Operation(summary="Record payment against invoice")
    public ApiResponse<?> paymentForInvoice(@PathVariable("id") Long id,@Valid @RequestBody PaymentRequest r) {
        return ApiResponse.ok("Payment recorded",service.create(new PaymentRequest(id,r.amount(),r.paymentMethod(),r.transactionRef(),r.paymentDate(),r.notes())));
    }
}
