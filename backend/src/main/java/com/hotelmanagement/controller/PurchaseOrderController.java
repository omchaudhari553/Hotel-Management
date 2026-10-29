package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.dto.HotelDtos.*;
import com.hotelmanagement.service.PurchaseOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/hotel/purchase-orders")
@Tag(name = "Purchase Orders", description = "Purchase Orders APIs")

public class PurchaseOrderController {
    private final PurchaseOrderService service;

    public PurchaseOrderController(PurchaseOrderService service) {
        this.service = service;
    }
    @GetMapping
    @Operation(summary="List purchase orders")
    public ApiResponse<?> list(@RequestParam(value = "branchId", required = false) Long branchId) {
        return ApiResponse.ok("Purchase orders fetched",service.list(branchId));
    }
    @PostMapping
    @Operation(summary="Create purchase order")
    public ApiResponse<?> create(@Valid @RequestBody PurchaseOrderRequest r) {
        return ApiResponse.ok("Purchase order created",service.create(r));
    }
    @GetMapping("/{id}")
    @Operation(summary="Get purchase order by id")
    public ApiResponse<?> getById(@PathVariable Long id) {
        return ApiResponse.ok("Purchase order fetched",service.getById(id));
    }
    @PutMapping("/{id}")
    @Operation(summary="Update purchase order")
    public ApiResponse<?> update(@PathVariable Long id, @Valid @RequestBody PurchaseOrderRequest r) {
        return ApiResponse.ok("Purchase order updated", service.update(id, r));
    }
    @PatchMapping("/{id}/status")
    @Operation(summary="Update purchase order status")
    public ApiResponse<?> status(@PathVariable Long id,@Valid @RequestBody StatusRequest r) {
        return ApiResponse.ok("Purchase order status updated",service.updateStatus(id,r.status()));
    }
    @DeleteMapping("/{id}")
    @Operation(summary="Delete purchase order")
    public ApiResponse<?> delete(@PathVariable Long id) {
        return ApiResponse.ok("Purchase order deleted",service.delete(id));
    }
}
