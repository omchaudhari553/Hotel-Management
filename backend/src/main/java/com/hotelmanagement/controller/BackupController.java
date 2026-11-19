package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.security.CurrentUser;
import com.hotelmanagement.service.DailyBackupEmailService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/hotel/backup")
@Tag(name = "Hotel Backup", description = "Hotel daily automated backup APIs")
public class BackupController {

    private final DailyBackupEmailService backupService;
    private final CurrentUser currentUser;

    public BackupController(DailyBackupEmailService backupService, CurrentUser currentUser) {
        this.backupService = backupService;
        this.currentUser = currentUser;
    }

    @PostMapping("/send-email")
    @Operation(summary = "Send daily business data backup email now")
    public ApiResponse<?> sendEmailNow(
            @RequestParam(required = false) String customEmail,
            @RequestParam(required = false) String senderEmail,
            @RequestParam(required = false) String appPassword) {
        Long bizId = currentUser.businessId();
        Map<String, Object> result = backupService.sendBackupEmailForBusiness(bizId, customEmail, appPassword, senderEmail);
        return ApiResponse.ok("Daily business data backup processed", result);
    }

    @PostMapping("/settings")
    @Operation(summary = "Save SMTP sender and app password settings")
    public ApiResponse<?> saveSettings(
            @RequestParam(required = false) String senderEmail,
            @RequestParam(required = false) String appPassword) {
        Long bizId = currentUser.businessId();
        backupService.saveSmtpSettings(bizId, senderEmail, appPassword);
        return ApiResponse.ok("SMTP backup settings saved successfully", backupService.getBackupStatusForBusiness(bizId));
    }

    @GetMapping("/status")
    @Operation(summary = "Get daily backup status and schedule")
    public ApiResponse<?> getStatus() {
        Long bizId = currentUser.businessId();
        Map<String, Object> status = backupService.getBackupStatusForBusiness(bizId);
        return ApiResponse.ok("Backup status fetched", status);
    }

    @GetMapping("/download")
    @Operation(summary = "Download current daily JSON backup directly")
    public ResponseEntity<byte[]> downloadBackup() {
        Long bizId = currentUser.businessId();
        byte[] json = backupService.generateBackupJson(bizId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"hotel_daily_backup.json\"")
                .contentType(MediaType.APPLICATION_JSON)
                .body(json);
    }

    @GetMapping("/download-pdf")
    @Operation(summary = "Download current daily PDF summary report directly")
    public ResponseEntity<byte[]> downloadBackupPdf() {
        Long bizId = currentUser.businessId();
        byte[] pdf = backupService.generateBackupPdf(bizId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"hotel_daily_backup_summary.pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
