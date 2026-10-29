package com.hotelmanagement.service;
import com.hotelmanagement.dto.HotelDtos.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service 
public class PaymentService {
    private final FinancialService core;
    public PaymentService(FinancialService core) {
        this.core=core;
    }
    public List<Map<String,Object>> list() {
        return list(null);
    }
    public List<Map<String,Object>> list(Long branchId) {
        return core.payments(branchId);
    }
    public Map<String,Object> create(PaymentRequest r) {
        return core.pay(r);
    }
}
