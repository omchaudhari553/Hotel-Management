package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.dto.HotelDtos.ProductRequest;
import com.hotelmanagement.dto.HotelDtos.StockAdjustmentRequest;
import com.hotelmanagement.service.InventoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/hotel/inventory")
@Tag(name = "Inventory", description = "Inventory and Stock Management APIs")
public class InventoryController {
    private final InventoryService service;

    public InventoryController(InventoryService service) {
        this.service = service;
    }

    @GetMapping("/products")
    @Operation(summary = "List inventory products")
    public ApiResponse<?> getProducts(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Boolean lowStockOnly) {
        return ApiResponse.ok("Products fetched", service.getProducts(category, lowStockOnly));
    }

    @PostMapping("/products")
    @Operation(summary = "Create inventory product")
    public ApiResponse<?> createProduct(@Valid @RequestBody ProductRequest r) {
        return ApiResponse.ok("Product created", service.createProduct(r));
    }

    @PostMapping("/adjust")
    @Operation(summary = "Adjust inventory stock")
    public ApiResponse<?> adjustStock(@Valid @RequestBody StockAdjustmentRequest r) {
        return ApiResponse.ok("Stock adjusted", service.adjustStock(r));
    }

    @GetMapping("/movements")
    @Operation(summary = "List inventory stock movements")
    public ApiResponse<?> getMovements() {
        return ApiResponse.ok("Stock movements fetched", service.getMovements());
    }
}
