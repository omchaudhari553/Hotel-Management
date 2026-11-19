package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.dto.HotelDtos.*;
import com.hotelmanagement.service.StaffService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/hotel/staff")
@Tag(name = "Staff", description = "Staff APIs")

public class StaffController {
    private final StaffService service;

    public StaffController(StaffService service) {
        this.service = service;
    }
    @GetMapping
    @Operation(summary="List staff")
    public ApiResponse<?> list(@RequestParam(value = "branchId", required = false) Long branchId) {
        return ApiResponse.ok("Staff fetched",service.list(branchId));
    }
    @PostMapping
    @Operation(summary="Create staff")
    public ApiResponse<?> create(@Valid @RequestBody StaffRequest r) {
        return ApiResponse.ok("Staff created",service.create(r));
    }
    @GetMapping("/{id}")
    @Operation(summary="Get staff by id")
    public ApiResponse<?> getById(@PathVariable Long id) {
        return ApiResponse.ok("Staff fetched",service.getById(id));
    }
    @PutMapping("/{id}")
    @Operation(summary="Update staff")
    public ApiResponse<?> update(@PathVariable Long id,@Valid @RequestBody StaffRequest r) {
        return ApiResponse.ok("Staff updated",service.update(id,r));
    }
    @DeleteMapping("/{id}")
    @Operation(summary="Delete staff")
    public ApiResponse<?> delete(@PathVariable Long id) {
        return ApiResponse.ok("Staff deleted",service.delete(id));
    }
}
