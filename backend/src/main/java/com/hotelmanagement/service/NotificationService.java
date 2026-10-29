package com.hotelmanagement.service;

import com.hotelmanagement.entity.Notification;
import com.hotelmanagement.exception.NotFoundException;
import com.hotelmanagement.repository.BranchRepository;
import com.hotelmanagement.repository.NotificationRepository;
import com.hotelmanagement.security.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class NotificationService {

    private final NotificationRepository notifications;
    private final BranchRepository branches;
    private final CurrentUser currentUser;

    public NotificationService(NotificationRepository notifications,
                               BranchRepository branches,
                               CurrentUser currentUser) {
        this.notifications = notifications;
        this.branches = branches;
        this.currentUser = currentUser;
    }

    @Transactional
    public List<Map<String, Object>> list() {
        return list(null);
    }

    @Transactional
    public List<Map<String, Object>> list(String date) {
        Long businessId = currentUser.businessId();
        List<Notification> list = notifications.findAllByBusinessIdOrderByCreatedAtDesc(businessId);
        if (list.isEmpty()) {
            seedDefaultNotifications(businessId);
            list = notifications.findAllByBusinessIdOrderByCreatedAtDesc(businessId);
        }
        if (date != null && !date.isBlank() && !date.equalsIgnoreCase("all")) {
            String datePrefix = date.trim();
            return list.stream()
                    .filter(n -> n.getCreatedAt() != null && n.getCreatedAt().toString().startsWith(datePrefix))
                    .map(this::toMap)
                    .toList();
        }
        return list.stream().map(this::toMap).toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> unreadCount() {
        Long businessId = currentUser.businessId();
        long count = notifications.countByBusinessIdAndReadFalse(businessId);
        return Map.of("count", count);
    }

    @Transactional
    public Map<String, Object> markAsRead(Long id) {
        Notification n = notifications.findByIdAndBusinessId(id, currentUser.businessId())
                .orElseThrow(() -> new NotFoundException("Notification not found"));
        n.setRead(true);
        return toMap(notifications.save(n));
    }

    @Transactional
    public Map<String, Object> markAllAsRead() {
        List<Notification> list = notifications.findAllByBusinessIdOrderByCreatedAtDesc(currentUser.businessId());
        for (Notification n : list) {
            n.setRead(true);
        }
        notifications.saveAll(list);
        return Map.of("success", true, "markedCount", list.size());
    }

    @Transactional
    public Map<String, Object> create(Map<String, Object> req) {
        Notification n = new Notification();
        n.setBusiness(currentUser.get().getBusiness());
        if (req.containsKey("branchId") && req.get("branchId") != null) {
            try {
                Long branchId = Long.valueOf(String.valueOf(req.get("branchId")));
                branches.findByIdAndBusinessId(branchId, currentUser.businessId()).ifPresent(n::setBranch);
            } catch (Exception ignored) {}
        }
        n.setType(String.valueOf(req.getOrDefault("type", "SYSTEM")));
        n.setTitle(String.valueOf(req.getOrDefault("title", "New Notification")));
        n.setMessage(String.valueOf(req.getOrDefault("message", "")));
        n.setRead(false);
        return toMap(notifications.save(n));
    }

    private void seedDefaultNotifications(Long businessId) {
        var biz = currentUser.get().getBusiness();
        var branchList = branches.findAllByBusinessId(businessId);
        var mainBranch = branchList.isEmpty() ? null : branchList.get(0);

        List<Notification> defaults = List.of(
                createNotification(biz, mainBranch, "ORDER", "New Dine-In Order Placed", "Table 4 created order #ORD-104 with 3 items."),
                createNotification(biz, mainBranch, "KOT", "New Kitchen Order (KOT)", "KOT #14 sent to Kitchen for Table 2."),
                createNotification(biz, mainBranch, "BILLING", "Bill Generated", "Bill #INV-2026-089 generated for Table 6. Total ₹1,850."),
                createNotification(biz, mainBranch, "PAYMENT", "Payment Received", "Bill #INV-2024-001 settled via UPI for ₹1,450."),
                createNotification(biz, mainBranch, "INVENTORY", "Low Stock Alert", "Coffee Beans (Arabica) stock reached minimum threshold."),
                createNotification(biz, mainBranch, "STAFF", "Staff Attendance", "Monthly staff attendance report is updated for this month."),
                createNotification(biz, mainBranch, "DELIVERY", "Delivery Order Dispatched", "Delivery order #DEL-ZOM-882 handed over to rider.")
        );
        notifications.saveAll(defaults);
    }

    private Notification createNotification(com.hotelmanagement.entity.Business biz,
                                            com.hotelmanagement.entity.Branch branch,
                                            String type, String title, String message) {
        Notification n = new Notification();
        n.setBusiness(biz);
        n.setBranch(branch);
        n.setType(type);
        n.setTitle(title);
        n.setMessage(message);
        n.setRead(false);
        return n;
    }

    private Map<String, Object> toMap(Notification n) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", n.getId());
        m.put("type", n.getType());
        m.put("title", n.getTitle());
        m.put("message", n.getMessage());
        m.put("read", n.isRead());
        m.put("branchId", n.getBranch() != null ? n.getBranch().getId() : null);
        m.put("branchName", n.getBranch() != null ? n.getBranch().getName() : null);
        m.put("createdAt", n.getCreatedAt() != null ? n.getCreatedAt().toString() : "");
        return m;
    }
}
