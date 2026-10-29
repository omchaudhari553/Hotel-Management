package com.hotelmanagement.service;
import com.hotelmanagement.dto.HotelDtos.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service 
public class InvoiceService {
    private final FinancialService core;
    public InvoiceService(FinancialService core) {
        this.core=core;
    }
    public List<Map<String,Object>> list() {
        return list(null);
    }
    public List<Map<String,Object>> list(Long branchId) {
        return core.invoices(branchId);
    }
    public Map<String,Object> get(Long id) {
        return core.invoice(id);
    }
    public Map<String,Object> create(InvoiceRequest r) {
        return core.createInvoice(r);
    }
    public String getNextInvoiceNumber() {
        return core.generateNextInvoiceNumber();
    }
}
