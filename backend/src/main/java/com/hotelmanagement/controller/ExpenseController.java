package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.dto.HotelDtos.*;
import com.hotelmanagement.service.ExpenseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/hotel/expenses")
@Tag(name = "Expenses", description = "Expenses APIs")

public class ExpenseController {
    private final ExpenseService service;

    public ExpenseController(ExpenseService service) {
        this.service = service;
    }
    @GetMapping
    @Operation(summary="List expenses")
    public ApiResponse<?> list(@RequestParam(value = "branchId", required = false) Long branchId) {
        return ApiResponse.ok("Expenses fetched",service.list(branchId));
    }
    @PostMapping
    @Operation(summary="Create expense")
    public ApiResponse<?> create(@Valid @RequestBody ExpenseRequest r) {
        return ApiResponse.ok("Expense created",service.create(r));
    }
    @GetMapping("/{id}")
    @Operation(summary="Get expense by id")
    public ApiResponse<?> getById(@PathVariable Long id) {
        return ApiResponse.ok("Expense fetched",service.getById(id));
    }
    @PutMapping("/{id}")
    @Operation(summary="Update expense")
    public ApiResponse<?> update(@PathVariable Long id,@Valid @RequestBody ExpenseRequest r) {
        return ApiResponse.ok("Expense updated",service.update(id,r));
    }
    @DeleteMapping("/{id}")
    @Operation(summary="Delete expense")
    public ApiResponse<?> delete(@PathVariable Long id) {
        return ApiResponse.ok("Expense deleted",service.delete(id));
    }
}
