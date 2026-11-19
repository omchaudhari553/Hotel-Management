package com.hotelmanagement.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;

public final class PrinterDtos {
    private PrinterDtos() {}

    public record PrinterConfigRequest(
        Long branchId,
        @JsonAlias({"printerName", "name"})
        @NotBlank(message = "Printer name is required")
        String name,

        @NotBlank(message = "Printer type is required")
        String printerType, // 'BLUETOOTH', 'NETWORK', 'USB', 'SYSTEM'

        @JsonAlias({"macAddress", "ipAddress", "usbIdentifier", "connectionString"})
        String connectionString,

        Integer port,
        String paperSize, // '58mm', '80mm', 'A4'
        Boolean isDefault,

        @JsonAlias({"isDefaultKot", "isKotDefault"})
        Boolean isKotDefault,

        @JsonAlias({"isDefaultReceipt", "isReceiptDefault"})
        Boolean isReceiptDefault,

        @JsonAlias({"isDefaultPurchase", "isPurchaseDefault"})
        Boolean isPurchaseDefault,

        String status,
        String characterSet,
        Boolean autoCut,

        @JsonAlias({"openDrawer", "openCashDrawer"})
        Boolean openCashDrawer,

        Integer printDensity
    ) {}

    public record PrinterConfigResponse(
        Long id,
        Long businessId,
        Long branchId,
        String branchName,
        String name,
        String printerType,
        String connectionString,
        Integer port,
        String paperSize,
        Boolean isDefault,
        Boolean isKotDefault,
        Boolean isReceiptDefault,
        Boolean isPurchaseDefault,
        String status,
        String characterSet,
        Boolean autoCut,
        Boolean openCashDrawer,
        Integer printDensity,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {}

    public record PrinterTestRequest(
        Long printerId,
        String printerType,
        String connectionString,
        Integer port,
        String paperSize
    ) {}

    public record NetworkPrintRequest(
        String ip,
        Integer port,
        String base64Data
    ) {}

    public record SetDefaultPrinterRequest(
        String defaultType // 'ALL', 'RECEIPT', 'KOT', 'PURCHASE'
    ) {}
}

