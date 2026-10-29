package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.dto.HotelDtos.MenuItemRequest;
import com.hotelmanagement.service.MenuItemService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/hotel/menu-items")
@Tag(name = "Menu Items", description = "Menu Items APIs")
public class MenuItemController {
    private final MenuItemService service;

    public MenuItemController(MenuItemService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List menu items")
    public ApiResponse<?> list(@RequestParam(required = false) String category) {
        return ApiResponse.ok("Menu items fetched", service.list(category));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get menu item by id")
    public ApiResponse<?> getById(@PathVariable Long id) {
        return ApiResponse.ok("Menu item fetched", service.getById(id));
    }

    @PostMapping
    @Operation(summary = "Create menu item")
    public ApiResponse<?> create(@Valid @RequestBody MenuItemRequest r) {
        return ApiResponse.ok("Menu item created", service.create(r));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update menu item")
    public ApiResponse<?> update(@PathVariable Long id, @Valid @RequestBody MenuItemRequest r) {
        return ApiResponse.ok("Menu item updated", service.update(id, r));
    }

    @PatchMapping("/{id}/availability")
    @Operation(summary = "Update menu item availability")
    public ApiResponse<?> availability(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        boolean available = true;
        if (body != null && body.containsKey("available")) {
            Object val = body.get("available");
            if (val instanceof Boolean b) {
                available = b;
            } else if (val != null) {
                available = Boolean.parseBoolean(val.toString());
            }
        }
        return ApiResponse.ok("Menu item availability updated", service.updateAvailability(id, available));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete menu item")
    public ApiResponse<?> delete(@PathVariable Long id) {
        return ApiResponse.ok("Menu item deleted", service.delete(id));
    }
}
