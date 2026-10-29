package com.hotelmanagement.service;
import com.hotelmanagement.dto.HotelDtos.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service 
public class PurchaseOrderService {
    private final FinancialService core;
    public PurchaseOrderService(FinancialService core) {
        this.core=core;
    }
    public List<Map<String,Object>> list() {
        return core.purchaseOrders(null);
    }
    public List<Map<String,Object>> list(Long branchId) {
        return core.purchaseOrders(branchId);
    }
    public Map<String,Object> create(PurchaseOrderRequest r) {
        return core.createPurchaseOrder(r);
    }
    public Map<String,Object> getById(Long id) {
        return core.getPurchaseOrder(id);
    }
    public Map<String,Object> update(Long id, PurchaseOrderRequest r) {
        return core.updatePurchaseOrder(id, r);
    }
    public Map<String,Object> updateStatus(Long id, String status) {
        return core.updatePurchaseOrderStatus(id, status);
    }
    public Map<String,Object> delete(Long id) {
        return core.deletePurchaseOrder(id);
    }
}
