package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.dto.PrinterDtos.*;
import com.hotelmanagement.service.PrinterService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/hotel/printers")
@Tag(name = "Printers", description = "Hotel Printer Management APIs")
public class PrinterController {

    private final PrinterService service;

    public PrinterController(PrinterService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List all configured printers for business or branch")
    public ApiResponse<?> list(@RequestParam(value = "branchId", required = false) Long branchId) {
        return ApiResponse.ok("Printers fetched", service.list(branchId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get printer by ID")
    public ApiResponse<?> getById(@PathVariable("id") Long id) {
        return ApiResponse.ok("Printer details fetched", service.getById(id));
    }

    @PostMapping
    @Operation(summary = "Create a new printer configuration")
    public ApiResponse<?> create(@Valid @RequestBody PrinterConfigRequest request) {
        return ApiResponse.ok("Printer configured successfully", service.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing printer configuration")
    public ApiResponse<?> update(@PathVariable("id") Long id, @Valid @RequestBody PrinterConfigRequest request) {
        return ApiResponse.ok("Printer updated successfully", service.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a printer configuration")
    public ApiResponse<?> delete(@PathVariable("id") Long id) {
        service.delete(id);
        return ApiResponse.ok("Printer configuration removed successfully", null);
    }

    @PostMapping("/{id}/default")
    @Operation(summary = "Set printer as default (ALL, RECEIPT, KOT, PURCHASE)")
    public ApiResponse<?> setDefault(@PathVariable("id") Long id,
                                     @RequestParam(value = "type", required = false, defaultValue = "ALL") String type) {
        return ApiResponse.ok("Default printer updated", service.setDefault(id, type));
    }

    @GetMapping("/default")
    @Operation(summary = "Get current default printer (RECEIPT, KOT, PURCHASE)")
    public ApiResponse<?> getDefault(@RequestParam(value = "type", required = false, defaultValue = "RECEIPT") String type) {
        return ApiResponse.ok("Default printer fetched", service.getDefault(type));
    }

    @PostMapping("/test")
    @Operation(summary = "Generate test print payload for verification")
    public ApiResponse<?> testPrint(@RequestBody PrinterTestRequest request) {
        return ApiResponse.ok("Test print payload ready", service.generateTestPrintPayload(request));
    }

    @PostMapping("/network-print")
    @Operation(summary = "Send raw ESC/POS payload to network printer via TCP socket")
    public ApiResponse<?> networkPrint(@RequestBody NetworkPrintRequest request) {
        return ApiResponse.ok("Network print executed", service.sendNetworkPrint(request));
    }
}

