package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.dto.HotelDtos.GoodsReceiptRequest;
import com.hotelmanagement.service.GoodsReceiptService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/hotel/goods-receipts")
@Tag(name = "Goods Receipts", description = "Goods Receipts (GRN) APIs")
public class GoodsReceiptController {
    private final GoodsReceiptService service;

    public GoodsReceiptController(GoodsReceiptService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List goods receipts")
    public ApiResponse<?> list() {
        return ApiResponse.ok("Goods receipts fetched", service.list());
    }

    @PostMapping
    @Operation(summary = "Create goods receipt")
    public ApiResponse<?> create(@Valid @RequestBody GoodsReceiptRequest r) {
        return ApiResponse.ok("Goods receipt created", service.create(r));
    }
}
