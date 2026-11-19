package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.dto.HotelDtos.*;
import com.hotelmanagement.service.SupplierPaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/hotel/supplier-payments")
@Tag(name = "Supplier Payments", description = "Supplier Payments APIs")

public class SupplierPaymentController {
    private final SupplierPaymentService service;

    public SupplierPaymentController(SupplierPaymentService service) {
        this.service = service;
    }
    @GetMapping
    @Operation(summary="List supplier payments")
    public ApiResponse<?> list() {
        return ApiResponse.ok("Supplier payments fetched",service.list());
    }
    @PostMapping
    @Operation(summary="Record supplier payment")
    public ApiResponse<?> create(@Valid @RequestBody SupplierPaymentRequest r) {
        return ApiResponse.ok("Supplier payment recorded",service.create(r));
    }
}
