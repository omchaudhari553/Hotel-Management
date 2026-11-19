package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.dto.HotelDtos.*;
import com.hotelmanagement.service.SupplierService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/hotel/suppliers")
@Tag(name = "Suppliers", description = "Suppliers APIs")

public class SupplierController {
    private final SupplierService service;

    public SupplierController(SupplierService service) {
        this.service = service;
    }
    @GetMapping
    @Operation(summary="List suppliers")
    public ApiResponse<?> list() {
        return ApiResponse.ok("Suppliers fetched",service.list());
    }
    @PostMapping
    @Operation(summary="Create supplier")
    public ApiResponse<?> create(@Valid @RequestBody SupplierRequest r) {
        return ApiResponse.ok("Supplier created",service.create(r));
    }
    @GetMapping("/{id}")
    @Operation(summary="Get supplier by id")
    public ApiResponse<?> getById(@PathVariable Long id) {
        return ApiResponse.ok("Supplier fetched",service.getById(id));
    }
    @PutMapping("/{id}")
    @Operation(summary="Update supplier")
    public ApiResponse<?> update(@PathVariable Long id,@Valid @RequestBody SupplierRequest r) {
        return ApiResponse.ok("Supplier updated",service.update(id,r));
    }
    @DeleteMapping("/{id}")
    @Operation(summary="Delete supplier")
    public ApiResponse<?> delete(@PathVariable Long id) {
        return ApiResponse.ok("Supplier deleted",service.delete(id));
    }
}
