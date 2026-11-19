package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.dto.HotelDtos.*;
import com.hotelmanagement.service.TableService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/hotel/tables")
@Tag(name = "Tables", description = "Tables APIs")

public class TableController {
    private final TableService service;

    public TableController(TableService service) {
        this.service = service;
    }
    @GetMapping
    @Operation(summary="List tables")
    public ApiResponse<?> list(@RequestParam(value = "branchId", required = false) Long branchId) {
        return ApiResponse.ok("Tables fetched",service.list(branchId));
    }
    @PostMapping
    @Operation(summary="Create table")
    public ApiResponse<?> create(@Valid @RequestBody TableRequest r) {
        return ApiResponse.ok("Table created",service.create(r));
    }
    @PatchMapping("/{id}/status")
    @Operation(summary="Update table status")
    public ApiResponse<?> status(@PathVariable("id") Long id,@Valid @RequestBody StatusRequest r) {
        return ApiResponse.ok("Table status updated",service.status(id,r.status()));
    }
    @GetMapping("/{id}")
    @Operation(summary="Get table by id")
    public ApiResponse<?> getById(@PathVariable("id") Long id) {
        return ApiResponse.ok("Table fetched",service.getById(id));
    }
    @PutMapping("/{id}")
    @Operation(summary="Update table")
    public ApiResponse<?> update(@PathVariable("id") Long id,@Valid @RequestBody TableRequest r) {
        return ApiResponse.ok("Table updated",service.update(id,r));
    }
    @DeleteMapping("/{id}")
    @Operation(summary="Delete table")
    public ApiResponse<?> delete(@PathVariable("id") Long id) {
        return ApiResponse.ok("Table deleted",service.delete(id));
    }
}
