package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.dto.HotelDtos.PurchaseReturnRequest;
import com.hotelmanagement.service.PurchaseReturnService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/hotel/purchase-returns")
@Tag(name = "Purchase Returns", description = "Purchase Returns APIs")
public class PurchaseReturnController {
    private final PurchaseReturnService service;

    public PurchaseReturnController(PurchaseReturnService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List purchase returns")
    public ApiResponse<?> list() {
        return ApiResponse.ok("Purchase returns fetched", service.list());
    }

    @PostMapping
    @Operation(summary = "Create purchase return")
    public ApiResponse<?> create(@Valid @RequestBody PurchaseReturnRequest r) {
        return ApiResponse.ok("Purchase return created", service.create(r));
    }
}
