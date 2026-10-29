package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.dto.HotelDtos.BusinessProfileRequest;
import com.hotelmanagement.service.HotelProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/hotel/profile")
@Tag(name="Hotel Profile",description="Hotel profile APIs")

public class HotelProfileController {
    private final HotelProfileService service;

    public HotelProfileController(HotelProfileService s) {
        service=s;
    }
    @GetMapping
    @Operation(summary="Get hotel profile")
    public ApiResponse<?> get() {
        return ApiResponse.ok("Profile fetched",service.get());
    }
    @PutMapping
    @Operation(summary="Update hotel profile")
    public ApiResponse<?> update(@Valid @RequestBody BusinessProfileRequest r) {
        return ApiResponse.ok("Profile updated",service.update(r));
    }
}
