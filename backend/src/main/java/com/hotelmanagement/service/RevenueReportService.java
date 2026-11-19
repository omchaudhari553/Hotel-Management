package com.hotelmanagement.service;
import org.springframework.stereotype.Service;
import java.util.*;

@Service 
public class RevenueReportService {
    private final ReportService core;
    public RevenueReportService(ReportService core) {
        this.core=core;
    }
    public Map<String,Object> get() {
        return core.revenue();
    }
}
