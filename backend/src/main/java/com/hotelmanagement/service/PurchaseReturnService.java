package com.hotelmanagement.service;

import com.hotelmanagement.dto.HotelDtos.PurchaseReturnRequest;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;

@Service
public class PurchaseReturnService {
    private final FinancialService core;

    public PurchaseReturnService(FinancialService core) {
        this.core = core;
    }

    public List<Map<String, Object>> list() {
        return core.purchaseReturns();
    }

    public Map<String, Object> create(PurchaseReturnRequest r) {
        return core.createPurchaseReturn(r);
    }
}
