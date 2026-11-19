package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.dto.HotelDtos.*;
import com.hotelmanagement.service.AttendanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/hotel/staff/attendance")
@Tag(name = "Staff Attendance", description = "Staff Attendance APIs")

public class AttendanceController {
    private final AttendanceService service;

    public AttendanceController(AttendanceService service) {
        this.service = service;
    }
    @GetMapping
    @Operation(summary="List attendance")
    public ApiResponse<?> list(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate date,
            @RequestParam(required = false) Long staffId,
            @RequestParam(required = false) String status) {
        return ApiResponse.ok("Attendance fetched", service.list(date, staffId, status));
    }

    @GetMapping("/summary")
    @Operation(summary="Daily attendance summary")
    public ApiResponse<?> summary(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate date) {
        return ApiResponse.ok("Attendance summary fetched", service.summary(date));
    }

    @PostMapping
    @Operation(summary="Save attendance")
    public ApiResponse<?> save(@Valid @RequestBody AttendanceRequest r) {
        return ApiResponse.ok("Attendance saved", service.save(r));
    }
}
