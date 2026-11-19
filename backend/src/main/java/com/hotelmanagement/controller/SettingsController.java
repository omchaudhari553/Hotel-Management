package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.dto.HotelDtos.SettingRequest;
import com.hotelmanagement.service.SettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/hotel/settings")
@Tag(name="Settings",description="Hotel settings APIs")

public class SettingsController {
    private final SettingsService service;

    public SettingsController(SettingsService s) {
        service=s;
    }
    @GetMapping
    @Operation(summary="List settings")
    public ApiResponse<?> list() {
        return ApiResponse.ok("Settings fetched",service.list());
    }
    @PutMapping
    @Operation(summary="Save setting")
    public ApiResponse<?> save(@Valid @RequestBody SettingRequest r) {
        return ApiResponse.ok("Setting saved",service.save(r));
    }
}
