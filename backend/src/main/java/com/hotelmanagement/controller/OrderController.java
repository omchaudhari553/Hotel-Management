package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.dto.HotelDtos.*;
import com.hotelmanagement.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/hotel/orders")
@Tag(name = "Orders", description = "Orders APIs")

public class OrderController {
    private final OrderService service;

    public OrderController(OrderService service) {
        this.service = service;
    }
    @GetMapping
    @Operation(summary="List orders")
    public ApiResponse<?> list(@RequestParam(value = "branchId", required = false) Long branchId) {
        return ApiResponse.ok("Orders fetched",service.list(branchId));
    }
    @PostMapping
    @Operation(summary="Create order")
    public ApiResponse<?> create(@Valid @RequestBody OrderRequest r) {
        return ApiResponse.ok("Order created",service.create(r));
    }
    @GetMapping("/{id}")
    @Operation(summary="Get order by id")
    public ApiResponse<?> getById(@PathVariable("id") Long id) {
        return ApiResponse.ok("Order fetched",service.getById(id));
    }
    @PutMapping("/{id}")
    @Operation(summary="Update order")
    public ApiResponse<?> update(@PathVariable("id") Long id,@Valid @RequestBody OrderRequest r) {
        return ApiResponse.ok("Order updated",service.update(id,r));
    }
    @PatchMapping("/{id}/status")
    @Operation(summary="Update order status")
    public ApiResponse<?> status(@PathVariable("id") Long id,@Valid @RequestBody StatusRequest r) {
        return ApiResponse.ok("Order status updated",service.status(id,r.status()));
    }
}
