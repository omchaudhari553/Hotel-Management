package com.hotelmanagement.dto;
import jakarta.validation.constraints.*;
import java.math.*;
import java.time.*;
import java.util.*;


public final class HotelDtos {
    private HotelDtos() {
    }
    
public record RoomRequest(Long branchId,@NotBlank String roomNumber,@NotBlank String roomType,@NotBlank String floor,@NotNull @Positive BigDecimal basePricePerNight,@NotNull @Positive Integer maxOccupancy,String amenities) {
    }
    
public record GuestRequest(@NotBlank String fullName,@NotBlank @Pattern(regexp="^[6-9][0-9]{9}$", message="Phone number must be 10 digits and start with 6, 7, 8 or 9") String phone,String email,String idProofType,String idProofNumber,String address,Long branchId) {
    }
    
public record BookingRequest(Long branchId,@NotNull Long roomId,Long guestId,@NotBlank String guestName,@NotBlank @Pattern(regexp="^[6-9][0-9]{9}$", message="Phone number must be 10 digits and start with 6, 7, 8 or 9") String guestPhone,String guestEmail,@NotNull LocalDate checkInDate,@NotNull LocalDate checkOutDate,String notes) {
    }
    
public record ServiceRequest(@NotBlank String serviceName,@NotNull @Positive Integer quantity,@NotNull @Positive BigDecimal unitPrice,LocalDateTime serviceTime,String status) {
    }
    
public record TableRequest(Long branchId,@NotBlank String name,@NotNull @Positive Integer capacity,@NotBlank String area,String note) {
    }
    
public record OrderItemRequest(Long menuItemId,@NotBlank String name,@NotNull @Positive Integer quantity,@NotNull BigDecimal unitPrice,String customization) {
    }
    
public record OrderRequest(Long branchId,Long tableId,Long bookingId,String guestName,Integer guestCount,List<OrderItemRequest> items,BigDecimal discount,BigDecimal taxRate) {
    }
    
public record KotRequest(Long branchId,Long orderId,String instructions) {
    }
    
public record StatusRequest(@NotBlank String status) {
    }
    
public record StaffRequest(@NotBlank String name,@NotBlank @Pattern(regexp="^[6-9][0-9]{9}$", message="Phone number must be 10 digits and start with 6, 7, 8 or 9") String phone,@NotBlank String address,@NotBlank String designation,@com.fasterxml.jackson.annotation.JsonFormat(pattern = "yyyy-MM-dd") LocalDate joiningDate,String idProofType,String idProofNumber,@NotNull BigDecimal basicSalary,@NotBlank String salaryFrequency,BigDecimal allowance,BigDecimal deduction,Long branchId,Long outletId,Boolean active) {
    }
    
public record AttendanceRequest(@NotNull Long staffId, @NotNull LocalDate date, @NotBlank String status, String checkInTime, String checkOutTime, BigDecimal workingHours, String remarks) {
    }
    
public record InvoiceItemRequest(Long productId,@NotBlank String description,@NotNull @Positive BigDecimal quantity,@NotNull BigDecimal unitPrice,BigDecimal taxRate) {
    }
    
public record InvoiceRequest(Long branchId,Long bookingId,Long orderId,Long guestId,LocalDate dueDate,BigDecimal discountAmount,BigDecimal cgstRate,BigDecimal sgstRate,BigDecimal igstRate,List<InvoiceItemRequest> items,String notes,String invoiceNumber) {
    public InvoiceRequest(Long branchId,Long bookingId,Long orderId,Long guestId,LocalDate dueDate,BigDecimal discountAmount,BigDecimal cgstRate,BigDecimal sgstRate,BigDecimal igstRate,List<InvoiceItemRequest> items,String notes) {
        this(branchId, bookingId, orderId, guestId, dueDate, discountAmount, cgstRate, sgstRate, igstRate, items, notes, null);
    }
}
    
public record PaymentRequest(@NotNull Long invoiceId,@NotNull @Positive BigDecimal amount,@NotBlank String paymentMethod,String transactionRef,@NotNull LocalDate paymentDate,String notes) {
    }
    
public record SupplierRequest(@NotBlank String name,@NotBlank String company,@NotBlank @Pattern(regexp="^[6-9][0-9]{9}$", message="Phone number must be 10 digits and start with 6, 7, 8 or 9") String phone,String email,String address,String gstNumber,String status,Long branchId) {
    }
    
public record PurchaseOrderItemRequest(@NotBlank String itemName,@NotBlank String unit,@NotNull @Positive BigDecimal quantity,@NotNull @Positive BigDecimal unitPrice,BigDecimal taxRate) {
    }
    
public record PurchaseOrderRequest(Long branchId,@NotNull Long supplierId,LocalDate poDate,LocalDate expectedDeliveryDate,List<PurchaseOrderItemRequest> items,String notes,String status) {
    }
    
public record PurchaseInvoiceItemRequest(String itemName, BigDecimal quantity, BigDecimal unitPrice, BigDecimal discountPercent, BigDecimal taxRate, BigDecimal total) {
    }

public record PurchaseInvoiceRequest(@NotNull Long supplierId,Long purchaseOrderId,Long goodsReceiptId,@NotBlank String invoiceNumber,LocalDate invoiceDate,LocalDate dueDate,@NotNull @Positive BigDecimal total,BigDecimal subtotal,BigDecimal taxAmount,BigDecimal discountAmount,String notes,String paymentMethod,List<PurchaseInvoiceItemRequest> items) {
    }

public record GoodsReceiptItemRequest(@NotBlank String itemName,@NotBlank String unit,BigDecimal orderedQty,BigDecimal receivedQty,BigDecimal acceptedQty,BigDecimal rejectedQty,String batchNo,LocalDate expiryDate) {
    }

public record GoodsReceiptRequest(Long branchId,@NotNull Long supplierId,Long purchaseOrderId,String grnNumber,LocalDate grnDate,String receivedBy,String status,String notes,List<GoodsReceiptItemRequest> items) {
    }

public record PurchaseReturnItemRequest(@NotBlank String itemName,String unit,@NotNull @Positive BigDecimal quantity,@NotNull @Positive BigDecimal unitPrice,BigDecimal totalPrice,String reason) {
    }

public record PurchaseReturnRequest(Long branchId,@NotNull Long supplierId,Long purchaseInvoiceId,Long purchaseOrderId,String returnNumber,LocalDate returnDate,String status,BigDecimal totalAmount,BigDecimal taxAmount,String reason,List<PurchaseReturnItemRequest> items) {
    }

public record SupplierPaymentRequest(@NotNull Long supplierId,@NotNull Long purchaseInvoiceId,@NotNull @Positive BigDecimal amount,@NotBlank String paymentMethod,String transactionReference,@NotNull LocalDate paymentDate) {
    }
    
public record DeliveryRequest(Long branchId,Long orderId,Long staffId,@NotBlank String customerName,@NotBlank @Pattern(regexp="^[6-9][0-9]{9}$", message="Phone number must be 10 digits and start with 6, 7, 8 or 9") String customerPhone,@NotBlank String address,String instructions,BigDecimal deliveryCharge,String paymentStatus) {
    }
    
public record SettingRequest(@NotBlank String category,@NotBlank String settingKey,String settingValue) {
    }
    
public record BusinessProfileRequest(@NotBlank String name,String ownerName,String contactEmail,@Pattern(regexp="^[6-9][0-9]{9}$", message="Phone number must be 10 digits and start with 6, 7, 8 or 9") String phone,String address,String city,String state,String currency,String taxNumber) {
    }
    
public record ExpenseRequest(Long branchId,@NotBlank String name,@NotBlank String category,@NotNull @Positive BigDecimal amount,@NotNull LocalDate date,String paymentMode,String description,String branchCode) {
    }

public record MenuItemRequest(@NotBlank String name, String category, @NotNull @Positive BigDecimal price, String description, Boolean active) {
    }

public record ProductRequest(String category, @NotBlank String name, @NotBlank String sku, String unit, BigDecimal purchasePrice, BigDecimal sellingPrice, Integer stockQuantity, Integer minStockAlert, Boolean active) {
    }

public record StockAdjustmentRequest(@NotNull Long productId, @NotBlank String movementType, @NotNull Integer quantity, String referenceId, String notes) {
    }

public record MessPlanRequest(@NotBlank String planName, String planType, String mealsIncluded, @NotNull BigDecimal price, Integer validityDays, Integer totalMealsCount, String description) {
    }

public record MessSubscriptionRequest(Long planId, @NotBlank String fullName, @NotBlank @Pattern(regexp="^[6-9][0-9]{9}$", message="Phone number must be 10 digits and start with 6, 7, 8 or 9") String phone, String email, Boolean tiffinEnabled, String deliveryAddress, String startDate) {
    }

public record MessAttendanceRequest(@NotNull Long customerId, @NotBlank String mealTime, String attendanceDate, String status) {
    }

public record MessMenuRequest(String dayOfWeek, String mealTime, String itemsDescription, Boolean special) {
    }
}
