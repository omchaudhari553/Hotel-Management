package com.hotelmanagement.service;

import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class ExpenseReportService {
    private final ReportService core;

    public ExpenseReportService(ReportService core) {
        this.core = core;
    }

    public java.util.List<java.util.Map<String, Object>> get() {
        return core.expenses(null);
    }

    public java.util.List<java.util.Map<String, Object>> get(Long branchId) {
        return core.expenses(branchId);
    }
}
