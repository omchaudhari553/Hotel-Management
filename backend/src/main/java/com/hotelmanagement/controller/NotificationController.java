package com.hotelmanagement.controller;

import com.hotelmanagement.dto.ApiResponse;
import com.hotelmanagement.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/hotel/notifications")
@Tag(name = "Notifications", description = "Hotel Notifications APIs")
public class NotificationController {

    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List all notifications, optionally filtered by date (YYYY-MM-DD)")
    public ApiResponse<?> list(@RequestParam(required = false) String date) {
        return ApiResponse.ok("Notifications fetched", service.list(date));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Get unread notifications count")
    public ApiResponse<?> unreadCount() {
        return ApiResponse.ok("Unread count fetched", service.unreadCount());
    }

    @PatchMapping("/{id}/read")
    @Operation(summary = "Mark notification as read")
    public ApiResponse<?> markAsRead(@PathVariable Long id) {
        return ApiResponse.ok("Notification marked as read", service.markAsRead(id));
    }

    @PatchMapping("/read-all")
    @Operation(summary = "Mark all notifications as read")
    public ApiResponse<?> markAllAsRead() {
        return ApiResponse.ok("All notifications marked as read", service.markAllAsRead());
    }

    @PostMapping
    @Operation(summary = "Create notification")
    public ApiResponse<?> create(@RequestBody Map<String, Object> req) {
        return ApiResponse.ok("Notification created", service.create(req));
    }
}
