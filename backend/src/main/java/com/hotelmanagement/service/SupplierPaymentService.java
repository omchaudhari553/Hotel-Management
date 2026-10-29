package com.hotelmanagement.service;
import com.hotelmanagement.dto.HotelDtos.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service 
public class SupplierPaymentService {
    private final FinancialService core;
    public SupplierPaymentService(FinancialService core) {
        this.core=core;
    }
    public List<Map<String,Object>> list() {
        return core.supplierPayments();
    }
    public Map<String,Object> create(SupplierPaymentRequest r) {
        return core.supplierPayment(r);
    }
}
