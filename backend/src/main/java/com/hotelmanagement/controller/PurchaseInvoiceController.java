package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.dto.HotelDtos.*;
import com.hotelmanagement.service.PurchaseInvoiceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/hotel/purchase-invoices")
@Tag(name = "Purchase Invoices", description = "Purchase Invoices APIs")

public class PurchaseInvoiceController {
    private final PurchaseInvoiceService service;

    public PurchaseInvoiceController(PurchaseInvoiceService service) {
        this.service = service;
    }
    @GetMapping
    @Operation(summary="List purchase invoices")
    public ApiResponse<?> list() {
        return ApiResponse.ok("Purchase invoices fetched",service.list());
    }
    @PostMapping
    @Operation(summary="Create purchase invoice")
    public ApiResponse<?> create(@Valid @RequestBody PurchaseInvoiceRequest r) {
        return ApiResponse.ok("Purchase invoice created",service.create(r));
    }
}
