package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.dto.HotelDtos.*;
import com.hotelmanagement.service.KotService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/hotel/kot")
@Tag(name = "KOT", description = "KOT APIs")

public class KotController {
    private final KotService service;

    public KotController(KotService service) {
        this.service = service;
    }
    @GetMapping
    @Operation(summary="List KOTs")
    public ApiResponse<?> list(
        @RequestParam(value = "branchId", required = false) Long branchId,
        @RequestParam(value = "startDate", required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate startDate,
        @RequestParam(value = "endDate", required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate endDate
    ) {
        return ApiResponse.ok("KOTs fetched", service.list(branchId, startDate, endDate));
    }
    @PostMapping
    @Operation(summary="Create KOT")
    public ApiResponse<?> create(@Valid @RequestBody KotRequest r) {
        return ApiResponse.ok("KOT created",service.create(r));
    }
    @GetMapping("/{id}")
    @Operation(summary="Get KOT by id")
    public ApiResponse<?> getById(@PathVariable("id") Long id) {
        return ApiResponse.ok("KOT fetched",service.getById(id));
    }
    @PatchMapping("/{id}/status")
    @Operation(summary="Update KOT status")
    public ApiResponse<?> status(@PathVariable("id") Long id,@Valid @RequestBody StatusRequest r) {
        return ApiResponse.ok("KOT status updated",service.status(id,r.status()));
    }
    @DeleteMapping("/{id}")
    @Operation(summary="Cancel KOT")
    public ApiResponse<?> delete(@PathVariable("id") Long id) {
        return ApiResponse.ok("KOT cancelled",service.status(id,"CANCELLED"));
    }
}
