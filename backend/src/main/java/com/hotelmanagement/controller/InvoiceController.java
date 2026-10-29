package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.dto.HotelDtos.*;
import com.hotelmanagement.service.InvoiceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/hotel/invoices")
@Tag(name = "Invoices", description = "Invoices APIs")
public class InvoiceController {
    private final InvoiceService service;

    public InvoiceController(InvoiceService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List invoices")
    public ApiResponse<?> list(@RequestParam(value = "branchId", required = false) Long branchId) {
        return ApiResponse.ok("Invoices fetched", service.list(branchId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get invoice")
    public ApiResponse<?> get(@PathVariable("id") Long id) {
        return ApiResponse.ok("Invoice fetched", service.get(id));
    }

    @PostMapping
    @Operation(summary = "Create invoice")
    public ApiResponse<?> create(@Valid @RequestBody InvoiceRequest r) {
        return ApiResponse.ok("Invoice created", service.create(r));
    }

    @GetMapping("/next-number")
    @Operation(summary = "Get next configured invoice number")
    public ApiResponse<?> nextNumber() {
        return ApiResponse.ok("Next invoice number fetched", Map.of("invoiceNumber", service.getNextInvoiceNumber()));
    }

    @GetMapping("/{id}/print-data")
    @Operation(summary = "Fetch authoritative invoice data formatted for printing")
    public ApiResponse<?> getPrintData(@PathVariable("id") Long id) {
        return ApiResponse.ok("Print data fetched", service.getPrintData(id));
    }

    @PostMapping("/{id}/print-record")
    @Operation(summary = "Record print job metadata (paper size, method) without altering business records")
    public ApiResponse<?> recordPrintJob(@PathVariable("id") Long id, @RequestBody(required = false) Map<String, Object> payload) {
        return ApiResponse.ok("Print job recorded", service.recordPrintJob(id, payload != null ? payload : Map.of()));
    }
}
