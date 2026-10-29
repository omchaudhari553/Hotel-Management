package com.hotelmanagement.service;

import org.springframework.stereotype.Service;
import java.util.*;

@Service 
public class SummaryReportService {
    private final ReportService core;

    public SummaryReportService(ReportService core) {
        this.core = core;
    }

    public Map<String, Object> get() {
        return core.summary();
    }

    public Map<String, Object> get(String startDate, String endDate, String period) {
        return core.summaryFiltered(startDate, endDate, period, null);
    }

    public Map<String, Object> get(String startDate, String endDate, String period, Long branchId) {
        return core.summaryFiltered(startDate, endDate, period, branchId);
    }
}
