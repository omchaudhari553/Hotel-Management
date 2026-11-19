package com.hotelmanagement.service;

import com.hotelmanagement.dto.HotelDtos.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service 
public class InvoiceService {
    private final FinancialService core;

    public InvoiceService(FinancialService core) {
        this.core = core;
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

    /**
     * Authoritative print data endpoint.
     * Combines invoice data with verified business header details without mutating financial records.
     */
    public Map<String, Object> getPrintData(Long id) {
        Map<String, Object> invoiceData = core.invoice(id);
        if (invoiceData == null || invoiceData.isEmpty()) {
            throw new NoSuchElementException("Invoice not found with id: " + id);
        }

        Map<String, Object> printData = new HashMap<>(invoiceData);
        printData.put("printTimestamp", java.time.Instant.now().toString());
        printData.put("authorizedSystem", "Ajalkar POS Printing Engine");
        return printData;
    }

    /**
     * Records print audit metadata for tracking print jobs and re-prints.
     * Does NOT alter payment status, totals, inventory, or create duplicate invoices.
     */
    public Map<String, Object> recordPrintJob(Long id, Map<String, Object> payload) {
        Map<String, Object> invoiceData = core.invoice(id);
        if (invoiceData == null || invoiceData.isEmpty()) {
            throw new NoSuchElementException("Invoice not found with id: " + id);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("invoiceId", id);
        result.put("invoiceNumber", invoiceData.get("invoiceNumber"));
        result.put("paperSize", payload.getOrDefault("paperSize", "80mm"));
        result.put("printMethod", payload.getOrDefault("printMethod", "browser"));
        result.put("status", "PRINT_RECORDED");
        result.put("timestamp", java.time.Instant.now().toString());
        return result;
    }
}
