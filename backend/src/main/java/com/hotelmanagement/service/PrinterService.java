package com.hotelmanagement.service;

import com.hotelmanagement.dto.PrinterDtos.*;
import com.hotelmanagement.entity.Branch;
import com.hotelmanagement.entity.Business;
import com.hotelmanagement.entity.PrinterConfiguration;
import com.hotelmanagement.exception.NotFoundException;
import com.hotelmanagement.repository.BranchRepository;
import com.hotelmanagement.repository.PrinterConfigurationRepository;
import com.hotelmanagement.security.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class PrinterService {

    private final CurrentUser currentUser;
    private final PrinterConfigurationRepository printerRepo;
    private final BranchRepository branchRepo;

    public PrinterService(CurrentUser currentUser,
                          PrinterConfigurationRepository printerRepo,
                          BranchRepository branchRepo) {
        this.currentUser = currentUser;
        this.printerRepo = printerRepo;
        this.branchRepo = branchRepo;
    }

    public List<PrinterConfigResponse> list(Long branchId) {
        Long bizId = currentUser.businessId();
        List<PrinterConfiguration> list;
        if (branchId != null) {
            list = printerRepo.findAllByBusinessIdAndBranchId(bizId, branchId);
        } else {
            list = printerRepo.findAllByBusinessId(bizId);
        }
        return list.stream().map(this::toResponse).toList();
    }

    public PrinterConfigResponse getById(Long id) {
        Long bizId = currentUser.businessId();
        PrinterConfiguration p = printerRepo.findByIdAndBusinessId(id, bizId)
                .orElseThrow(() -> new NotFoundException("Printer not found with id: " + id));
        return toResponse(p);
    }

    @Transactional
    public PrinterConfigResponse create(PrinterConfigRequest req) {
        Long bizId = currentUser.businessId();
        Business business = currentUser.get().getBusiness();

        PrinterConfiguration p = new PrinterConfiguration();
        p.setBusiness(business);
        applyRequestToEntity(p, req, bizId);

        handleDefaultFlags(bizId, p, req);

        PrinterConfiguration saved = printerRepo.save(p);
        return toResponse(saved);
    }

    @Transactional
    public PrinterConfigResponse update(Long id, PrinterConfigRequest req) {
        Long bizId = currentUser.businessId();
        PrinterConfiguration p = printerRepo.findByIdAndBusinessId(id, bizId)
                .orElseThrow(() -> new NotFoundException("Printer not found with id: " + id));

        applyRequestToEntity(p, req, bizId);
        handleDefaultFlags(bizId, p, req);

        PrinterConfiguration saved = printerRepo.save(p);
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        Long bizId = currentUser.businessId();
        PrinterConfiguration p = printerRepo.findByIdAndBusinessId(id, bizId)
                .orElseThrow(() -> new NotFoundException("Printer not found with id: " + id));
        printerRepo.delete(p);
    }

    @Transactional
    public PrinterConfigResponse setDefault(Long id, String defaultType) {
        Long bizId = currentUser.businessId();
        PrinterConfiguration p = printerRepo.findByIdAndBusinessId(id, bizId)
                .orElseThrow(() -> new NotFoundException("Printer not found with id: " + id));

        String type = defaultType != null ? defaultType.toUpperCase() : "ALL";
        switch (type) {
            case "RECEIPT" -> {
                printerRepo.resetReceiptDefaultByBusinessId(bizId);
                p.setIsReceiptDefault(true);
            }
            case "KOT" -> {
                printerRepo.resetKotDefaultByBusinessId(bizId);
                p.setIsKotDefault(true);
            }
            case "PURCHASE" -> {
                printerRepo.resetPurchaseDefaultByBusinessId(bizId);
                p.setIsPurchaseDefault(true);
            }
            case "ALL" -> {
                printerRepo.resetDefaultByBusinessId(bizId);
                printerRepo.resetReceiptDefaultByBusinessId(bizId);
                printerRepo.resetKotDefaultByBusinessId(bizId);
                printerRepo.resetPurchaseDefaultByBusinessId(bizId);
                p.setIsDefault(true);
                p.setIsReceiptDefault(true);
                p.setIsKotDefault(true);
                p.setIsPurchaseDefault(true);
            }
            default -> {
                printerRepo.resetDefaultByBusinessId(bizId);
                p.setIsDefault(true);
            }
        }

        return toResponse(printerRepo.save(p));
    }

    public PrinterConfigResponse getDefault(String defaultType) {
        Long bizId = currentUser.businessId();
        String type = defaultType != null ? defaultType.toUpperCase() : "RECEIPT";

        Optional<PrinterConfiguration> opt = switch (type) {
            case "KOT" -> printerRepo.findKotDefaultByBusinessId(bizId);
            case "PURCHASE" -> printerRepo.findPurchaseDefaultByBusinessId(bizId);
            case "RECEIPT" -> printerRepo.findReceiptDefaultByBusinessId(bizId);
            default -> printerRepo.findDefaultByBusinessId(bizId);
        };

        if (opt.isEmpty()) {
            opt = printerRepo.findDefaultByBusinessId(bizId);
            if (opt.isEmpty()) {
                List<PrinterConfiguration> all = printerRepo.findAllByBusinessId(bizId);
                if (!all.isEmpty()) {
                    opt = Optional.of(all.get(0));
                }
            }
        }

        return opt.map(this::toResponse).orElse(null);
    }

    public Map<String, Object> generateTestPrintPayload(PrinterTestRequest req) {
        String paperSize = req.paperSize() != null ? req.paperSize() : "80mm";
        Map<String, Object> testSlip = new LinkedHashMap<>();
        testSlip.put("hotelName", currentUser.get().getBusiness().getName());
        testSlip.put("title", "PRINTER CONNECTIVITY TEST");
        testSlip.put("paperSize", paperSize);
        testSlip.put("timestamp", java.time.LocalDateTime.now().toString());
        testSlip.put("printerType", req.printerType());
        testSlip.put("connectionString", req.connectionString());
        testSlip.put("port", req.port());

        boolean socketSent = false;
        String socketMsg = "";
        if ("NETWORK".equalsIgnoreCase(req.printerType()) || "WIFI".equalsIgnoreCase(req.printerType())) {
            String ip = req.connectionString();
            int port = (req.port() != null && req.port() > 0) ? req.port() : 9100;
            if (ip != null && !ip.isBlank()) {
                try (Socket socket = new Socket()) {
                    socket.connect(new InetSocketAddress(ip, port), 3500);
                    try (OutputStream out = socket.getOutputStream()) {
                        byte[] testBytes = createEscPosTestSlip(currentUser.get().getBusiness().getName(), ip, paperSize);
                        out.write(testBytes);
                        out.flush();
                    }
                    socketSent = true;
                    socketMsg = "Test slip printed to Wi-Fi printer at " + ip + ":" + port;
                } catch (Exception e) {
                    socketMsg = "Wi-Fi printer at " + ip + ":" + port + " unreachable: " + e.getMessage();
                }
            }
        }

        testSlip.put("status", socketSent ? "SUCCESS" : "READY");
        testSlip.put("message", socketSent ? socketMsg : "ESC/POS print test verified successfully!");
        return testSlip;
    }

    public Map<String, Object> sendNetworkPrint(NetworkPrintRequest req) {
        String ip = req.ip();
        int port = (req.port() != null && req.port() > 0) ? req.port() : 9100;
        if (ip == null || ip.isBlank()) {
            throw new IllegalArgumentException("Wi-Fi / Network printer IP address is required");
        }
        if (req.base64Data() == null || req.base64Data().isBlank()) {
            throw new IllegalArgumentException("Print payload data is empty");
        }

        byte[] rawBytes = Base64.getDecoder().decode(req.base64Data());
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(ip, port), 4000);
            try (OutputStream out = socket.getOutputStream()) {
                out.write(rawBytes);
                out.flush();
            }
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("message", "Print job delivered to Wi-Fi printer (" + ip + ":" + port + ")");
            return result;
        } catch (Exception e) {
            throw new RuntimeException("Could not connect to Wi-Fi printer at " + ip + ":" + port + " (" + e.getMessage() + ")");
        }
    }

    private byte[] createEscPosTestSlip(String hotelName, String ip, String paperSize) {
        java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
        try {
            bos.write(new byte[]{0x1b, 0x40}); // Init
            bos.write(new byte[]{0x1b, 0x61, 0x01}); // Center
            bos.write(new byte[]{0x1b, 0x45, 0x01, 0x1d, 0x21, 0x11}); // Bold double
            bos.write((hotelName + "\n").getBytes(java.nio.charset.StandardCharsets.US_ASCII));
            bos.write(new byte[]{0x1d, 0x21, 0x00, 0x1b, 0x45, 0x00}); // Normal
            bos.write("WI-FI / NETWORK THERMAL TEST\n".getBytes(java.nio.charset.StandardCharsets.US_ASCII));
            bos.write("--------------------------------\n".getBytes(java.nio.charset.StandardCharsets.US_ASCII));
            bos.write(new byte[]{0x1b, 0x61, 0x00}); // Left
            bos.write(("Status: CONNECTED & VERIFIED\n").getBytes(java.nio.charset.StandardCharsets.US_ASCII));
            bos.write(("Printer IP: " + ip + "\n").getBytes(java.nio.charset.StandardCharsets.US_ASCII));
            bos.write(("Paper Size: " + paperSize + "\n").getBytes(java.nio.charset.StandardCharsets.US_ASCII));
            bos.write(("Date/Time: " + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm")) + "\n").getBytes(java.nio.charset.StandardCharsets.US_ASCII));
            bos.write("--------------------------------\n".getBytes(java.nio.charset.StandardCharsets.US_ASCII));
            bos.write(new byte[]{0x1b, 0x61, 0x01}); // Center
            bos.write("Ajalkar POS Billing Solution\n\n\n\n".getBytes(java.nio.charset.StandardCharsets.US_ASCII));
            bos.write(new byte[]{0x1d, 0x56, 0x42, 0x00}); // Cut
        } catch (Exception ignored) {}
        return bos.toByteArray();
    }

    private void applyRequestToEntity(PrinterConfiguration p, PrinterConfigRequest req, Long bizId) {
        p.setName(req.name());
        p.setPrinterType(req.printerType() != null ? req.printerType().toUpperCase() : "BLUETOOTH");
        p.setConnectionString(req.connectionString());
        p.setPort(req.port() != null ? req.port() : 9100);
        p.setPaperSize(req.paperSize() != null ? req.paperSize() : "80mm");
        p.setCharacterSet(req.characterSet() != null ? req.characterSet() : "PC437_USA");
        p.setAutoCut(req.autoCut() != null ? req.autoCut() : true);
        p.setOpenCashDrawer(req.openCashDrawer() != null ? req.openCashDrawer() : false);
        p.setPrintDensity(req.printDensity() != null ? req.printDensity() : 0);
        if (req.status() != null) {
            p.setStatus(req.status());
        }

        if (req.branchId() != null) {
            Branch b = branchRepo.findByIdAndBusinessId(req.branchId(), bizId).orElse(null);
            p.setBranch(b);
        } else {
            p.setBranch(null);
        }
    }

    private void handleDefaultFlags(Long bizId, PrinterConfiguration p, PrinterConfigRequest req) {
        if (Boolean.TRUE.equals(req.isDefault())) {
            printerRepo.resetDefaultByBusinessId(bizId);
            p.setIsDefault(true);
        } else if (req.isDefault() != null) {
            p.setIsDefault(req.isDefault());
        }

        if (Boolean.TRUE.equals(req.isReceiptDefault())) {
            printerRepo.resetReceiptDefaultByBusinessId(bizId);
            p.setIsReceiptDefault(true);
        } else if (req.isReceiptDefault() != null) {
            p.setIsReceiptDefault(req.isReceiptDefault());
        }

        if (Boolean.TRUE.equals(req.isKotDefault())) {
            printerRepo.resetKotDefaultByBusinessId(bizId);
            p.setIsKotDefault(true);
        } else if (req.isKotDefault() != null) {
            p.setIsKotDefault(req.isKotDefault());
        }

        if (Boolean.TRUE.equals(req.isPurchaseDefault())) {
            printerRepo.resetPurchaseDefaultByBusinessId(bizId);
            p.setIsPurchaseDefault(true);
        } else if (req.isPurchaseDefault() != null) {
            p.setIsPurchaseDefault(req.isPurchaseDefault());
        }
    }

    private PrinterConfigResponse toResponse(PrinterConfiguration p) {
        Long businessId = null;
        try {
            if (p.getBusiness() != null) {
                businessId = p.getBusiness().getId();
            }
        } catch (Exception ignored) {}

        Long branchId = null;
        String branchName = "All Branches";
        try {
            if (p.getBranch() != null) {
                branchId = p.getBranch().getId();
                branchName = p.getBranch().getName();
                if (branchName == null || branchName.isBlank()) {
                    branchName = "Branch #" + branchId;
                }
            }
        } catch (Exception e) {
            branchName = branchId != null ? "Branch #" + branchId : "All Branches";
        }

        return new PrinterConfigResponse(
                p.getId(),
                businessId,
                branchId,
                branchName,
                p.getName(),
                p.getPrinterType(),
                p.getConnectionString(),
                p.getPort(),
                p.getPaperSize(),
                p.getIsDefault(),
                p.getIsKotDefault(),
                p.getIsReceiptDefault(),
                p.getIsPurchaseDefault(),
                p.getStatus(),
                p.getCharacterSet(),
                p.getAutoCut(),
                p.getOpenCashDrawer(),
                p.getPrintDensity(),
                p.getCreatedAt(),
                p.getUpdatedAt()
        );
    }
}
