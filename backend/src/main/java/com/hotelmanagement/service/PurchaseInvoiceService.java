package com.hotelmanagement.service;
import com.hotelmanagement.dto.HotelDtos.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service 
public class PurchaseInvoiceService {
    private final FinancialService core;
    public PurchaseInvoiceService(FinancialService core) {
        this.core=core;
    }
    public List<Map<String,Object>> list() {
        return core.purchaseInvoices();
    }
    public Map<String,Object> create(PurchaseInvoiceRequest r) {
        return core.createPurchaseInvoice(r);
    }
}
