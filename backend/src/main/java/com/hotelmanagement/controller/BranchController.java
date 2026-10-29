package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.dto.HotelDtos.*;
import com.hotelmanagement.service.BranchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/hotel/branches")
@Tag(name = "Branches", description = "Branches APIs")

public class BranchController {
    private final BranchService service;

    public BranchController(BranchService service) {
        this.service = service;
    }
    @GetMapping
    @Operation(summary="List branches")
    public ApiResponse<?> list() {
        return ApiResponse.ok("Branches fetched",service.list());
    }
    @PostMapping
    @Operation(summary="Create branch")
    public ApiResponse<?> create(@RequestBody java.util.Map<String,Object> r) {
        return ApiResponse.ok("Branch created",service.create(r));
    }

    @PutMapping("/{id}")
    @Operation(summary="Update branch")
    public ApiResponse<?> update(@PathVariable("id") Long id, @RequestBody java.util.Map<String,Object> r) {
        return ApiResponse.ok("Branch updated", service.update(id, r));
    }

    @DeleteMapping("/{id}")
    @Operation(summary="Delete branch")
    public ApiResponse<?> delete(@PathVariable("id") Long id) {
        return ApiResponse.ok("Branch deleted", service.delete(id));
    }

    @GetMapping("/outlets")
    @Operation(summary="List outlets")
    public ApiResponse<?> outlets() {
        return ApiResponse.ok("Outlets fetched", service.outlets());
    }

    @PostMapping("/{branchId}/outlets")
    @Operation(summary="Create outlet")
    public ApiResponse<?> createOutlet(@PathVariable("branchId") Long branchId, @RequestBody java.util.Map<String,Object> r) {
        return ApiResponse.ok("Outlet created", service.createOutlet(branchId, r));
    }

    @PutMapping("/outlets/{id}")
    @Operation(summary="Update outlet")
    public ApiResponse<?> updateOutlet(@PathVariable("id") Long id, @RequestBody java.util.Map<String,Object> r) {
        return ApiResponse.ok("Outlet updated", service.updateOutlet(id, r));
    }

    @DeleteMapping("/outlets/{id}")
    @Operation(summary="Delete outlet")
    public ApiResponse<?> deleteOutlet(@PathVariable("id") Long id) {
        return ApiResponse.ok("Outlet deleted", service.deleteOutlet(id));
    }

    @GetMapping("/{branchId}/analytics")
    @Operation(summary="Branch analytics")
    public ApiResponse<?> analytics(@PathVariable("branchId") Long branchId) {
        return ApiResponse.ok("Branch analytics fetched", service.analytics(branchId));
    }
}
